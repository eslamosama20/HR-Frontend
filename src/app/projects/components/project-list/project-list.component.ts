import { Component, OnInit, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { CompanyDetailsService } from '../../../services/inventory/company-details.service';
import { AuthService } from '../../../modules/auth';
import { PERMISSIONS } from '../../../config/permissions';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit, AfterViewInit {
  projects: Project[] = [];
  loading: boolean = false;
  selectedStatuses: string[] = [];
  includeInactive: boolean = false;
  financialSolvencyFilter: string = ''; // all, yes, no
  selectedCompanyId: string = '';
  selectedCountry: string = '';
  selectedDepartment: string = '';
  selectedSupervisingEntity: string = '';
  selectedExecutingCompany: string = '';
  statuses: string[] = [];
  companies: any[] = [];
  departments: string[] = [];
  supervisingEntities: string[] = [];
  executingCompanies: string[] = [];
  countries: string[] = [
    'المملكة العربية السعودية', 'جمهورية مصر العربية', 'السودان', 'اليمن', 'الأردن', 'سوريا', 'لبنان', 'فلسطين',
    'العراق', 'الكويت', 'الإمارات العربية المتحدة', 'قطر', 'البحرين', 'سلطنة عمان', 'ليبيا', 'تونس',
    'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جيبوتي', 'جزر القمر',
    'ماليزيا', 'إندونيسيا', 'كوسوفو', 'تركيا', 'باكستان', 'بنجلاديش', 'الهند',
    'أفغانستان', 'ألبانيا', 'البوسنة والهرسك', 'تنزانيا', 'نيجيريا', 'السنغال', 'كينيا',
    'أوغندا', 'غانا', 'تشاد', 'مالي', 'النيجر', 'أفريقيا'
  ];
  totalRecords: number = 0;
  
  // ViewChild للوصول إلى الـ table
  @ViewChild('dt') dt: any;
  
  // Cache
  private cache = new Map<string, { data: Project[], timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  isArchivedView: boolean = false;

  searchValue: string = '';

  get hasActiveFilters(): boolean {
    return !!(
      (!this.isArchivedView && this.selectedStatuses && this.selectedStatuses.length > 0) ||
      this.selectedCompanyId ||
      this.selectedCountry ||
      this.selectedDepartment ||
      this.selectedSupervisingEntity ||
      this.selectedExecutingCompany ||
      this.financialSolvencyFilter ||
      this.searchValue
    );
  }

  constructor(
    private projectService: ProjectService,
    private companyDetailsService: CompanyDetailsService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private authService: AuthService
  ) {}

  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  ngOnInit(): void {
    this.isArchivedView = this.route.snapshot.data['isArchivedView'] || false;
    if (this.isArchivedView) {
      this.selectedStatuses = ['مؤرشف'];
      this.statuses = ['مؤرشف'];
    } else {
      this.projectService.getStatuses().subscribe(statuses => {
        this.statuses = statuses.filter(s => s !== 'مؤرشف' && s !== 'DATA.PROJECT_STATUS_ARCHIVED');
        this.cdr.detectChanges();
      });
    }
    this.loadCompanies();
    // تحميل البيانات بعد تهيئة الـ component
    setTimeout(() => {
      this.loadProjects();
    }, 0);
  }

  ngAfterViewInit(): void {
    // Column resize handled by RtlColumnResizeDirective
  }

  loadCompanies(): void {
    this.companyDetailsService.getAll().subscribe({
      next: (res) => {
        this.companies = res || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading companies:', err);
      }
    });
  }

  loadProjects(): void {
    const statusesKey = this.selectedStatuses ? this.selectedStatuses.join(',') : '';
    console.log('🔄 Loading projects...', { 
      selectedStatuses: this.selectedStatuses, 
      includeInactive: this.includeInactive, 
      financialSolvencyFilter: this.financialSolvencyFilter, 
      selectedCompanyId: this.selectedCompanyId, 
      selectedCountry: this.selectedCountry,
      selectedDepartment: this.selectedDepartment,
      selectedSupervisingEntity: this.selectedSupervisingEntity,
      selectedExecutingCompany: this.selectedExecutingCompany
    });
    this.loading = true;
    
    // بناء cache key
    const cacheKey = `${this.isArchivedView}-${statusesKey}-${this.includeInactive}-${this.financialSolvencyFilter}-${this.selectedCompanyId}-${this.selectedCountry}-${this.selectedDepartment}-${this.selectedSupervisingEntity}-${this.selectedExecutingCompany}`;
    
    // التحقق من الـ cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('✅ Loading from cache');
      this.projects = cached.data;
      this.totalRecords = cached.data.length;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }
    
    console.log('🌐 Loading from API...');
    // تحميل من الـ API
    this.projectService.getAll(this.includeInactive).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          let data = response.data;

          // في قائمة المشاريع العادية: استبعاد المشاريع المؤرشفة من القائمة
          if (!this.isArchivedView) {
            data = data.filter((p: Project) => p.status !== 'مؤرشف');
          } else {
            data = data.filter((p: Project) => p.status === 'مؤرشف');
          }

          // فلترة حسب الحالات المحددة (إذا تم اختيار حقول من الـ checkboxes)
          if (!this.isArchivedView && this.selectedStatuses && this.selectedStatuses.length > 0) {
            data = data.filter((p: Project) => this.selectedStatuses.includes(p.status));
          }
          
          // Extract unique values for dynamic filters from raw data
          this.departments = Array.from(new Set(data.map((p: Project) => p.departmentName).filter(Boolean))) as string[];
          this.supervisingEntities = Array.from(new Set(data.map((p: Project) => p.supervisingEntityName).filter(Boolean))) as string[];
          this.executingCompanies = Array.from(new Set(data.map((p: Project) => p.executingCompanyName).filter(Boolean))) as string[];

          console.log('📊 Raw Projects loaded:', data.length);
          data.forEach((p: any) => {
            console.log(`Project: "${p.projectName}", CompanyId: "${p.companyDetailsId}", Country: "${p.country}", Dept: "${p.departmentName}", Supervising: "${p.supervisingEntityName}", Executing: "${p.executingCompanyName}"`);
          });

          // فلترة الملاءة المالية
          if (this.financialSolvencyFilter === 'yes') {
            data = data.filter((p: Project) => p.isFinancialSolvency === true);
          } else if (this.financialSolvencyFilter === 'no') {
            data = data.filter((p: Project) => p.isFinancialSolvency !== true);
          }

          // فلترة الشركة التابع لها المشروع
          if (this.selectedCompanyId) {
            data = data.filter((p: Project) => p.companyDetailsId === this.selectedCompanyId);
          }

          // فلترة دولة التنفيذ
          if (this.selectedCountry) {
            data = data.filter((p: Project) => {
              if (!p.country) return false;
              const pCountry = p.country.trim();
              const selCountry = this.selectedCountry.trim();
              if (pCountry === selCountry) return true;
              if (pCountry.includes(selCountry) || selCountry.includes(pCountry)) return true;

              const isEgyptP = pCountry.includes('مصر') || pCountry.includes('Egypt');
              const isEgyptSel = selCountry.includes('مصر') || selCountry.includes('Egypt');
              if (isEgyptP && isEgyptSel) return true;

              const isSaudiP = pCountry.includes('سعود') || pCountry.includes('KSA') || pCountry.includes('Saudi');
              const isSaudiSel = selCountry.includes('سعود') || selCountry.includes('KSA') || selCountry.includes('Saudi');
              if (isSaudiP && isSaudiSel) return true;

              const isUaeP = pCountry.includes('إمارات') || pCountry.includes('امارات') || pCountry.includes('UAE');
              const isUaeSel = selCountry.includes('إمارات') || selCountry.includes('امارات') || selCountry.includes('UAE');
              if (isUaeP && isUaeSel) return true;

              return false;
            });
          }

          // فلترة الإدارة
          if (this.selectedDepartment) {
            data = data.filter((p: Project) => p.departmentName === this.selectedDepartment);
          }

          // فلترة الجهة المشرفة
          if (this.selectedSupervisingEntity) {
            data = data.filter((p: Project) => p.supervisingEntityName === this.selectedSupervisingEntity);
          }

          // فلترة الشركة المنفذة
          if (this.selectedExecutingCompany) {
            console.log('🔍 Filtering by Executing Company:', this.selectedExecutingCompany);
            data = data.filter((p: Project) => p.executingCompanyName === this.selectedExecutingCompany);
            console.log('🔍 Filtered data length:', data.length);
          }
          
          // تجهيز صيغ التاريخ، تكست الملاءة، ومبلغ الشركة (إجمالي المشروع - قيمة التنفيذ)
          data = data.map((p: any) => {
            let formattedDate = '-';
            if (p.createdAt) {
              const d = new Date(p.createdAt);
              if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                formattedDate = `${day}/${month}/${year}`;
              }
            }
            const total = p.totalAmount || 0;
            const exec = p.executionAmount || 0;
            const compAmount = (p.totalAmount !== undefined && p.totalAmount !== null) || (p.executionAmount !== undefined && p.executionAmount !== null)
              ? (total - exec)
              : null;

            return {
              ...p,
              companyAmount: compAmount,
              formattedCreatedAt: formattedDate,
              solvencyText: p.isFinancialSolvency ? 'نعم' : 'لا'
            };
          });

          // حفظ في الـ cache
          this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
          });
          
          this.projects = [...data]; // Create new array reference
          this.totalRecords = data.length;
          this.cdr.detectChanges();
        } else {
          console.error('❌ Invalid API response:', response);
          this.projects = [];
          this.totalRecords = 0;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('DATA.ERROR'),
            detail: response?.message || this.translate.instant('DATA.ERROR_LOADING_PROJECTS')
          });
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ HTTP Error:', error);
        this.projects = [];
        this.totalRecords = 0;
        this.loading = false;
        
        let errorMessage = this.translate.instant('DATA.ERROR_LOADING_PROJECTS');
        if (error?.status === 401) {
          errorMessage = this.translate.instant('DATA.AUTHENTICATION_ERROR');
        } else if (error?.status === 403) {
          errorMessage = this.translate.instant('DATA.NO_PERMISSION_ACCESS');
        } else if (error?.status === 0) {
          errorMessage = this.translate.instant('DATA.CANNOT_CONNECT_SERVER');
        }
        
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('DATA.ERROR'),
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }

  onStatusChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onIncludeInactiveChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onFinancialSolvencyChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onCompanyChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onCountryChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onDepartmentChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onSupervisingEntityChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  onExecutingCompanyChange(): void {
    this.cache.clear();
    this.loadProjects();
  }

  clearFilters(searchInput?: HTMLInputElement): void {
    if (!this.isArchivedView) {
      this.selectedStatuses = [];
    }
    this.selectedCompanyId = '';
    this.selectedCountry = '';
    this.selectedDepartment = '';
    this.selectedSupervisingEntity = '';
    this.selectedExecutingCompany = '';
    this.financialSolvencyFilter = '';
    this.searchValue = '';

    if (searchInput) {
      searchInput.value = '';
    }

    if (this.dt) {
      this.dt.reset();
    }
    this.cache.clear();
    this.loadProjects();
  }

  onGlobalFilter(value: string): void {
    this.searchValue = value.trim();
    if (this.dt) {
      this.dt.filterGlobal(this.searchValue, 'contains');
    }
  }

  addNew(): void {
    this.router.navigate(['/projects/new']);
  }

  viewDetails(project: Project): void {
    this.router.navigate(['/projects', project.id]);
  }

  edit(project: Project): void {
    this.router.navigate(['/projects', project.id, 'edit']);
  }

  delete(project: Project): void {
    this.confirmationService.confirm({
      message: this.translate.instant('DATA.CONFIRM_DELETE_PROJECT', { projectName: project.projectName }),
      header: this.translate.instant('DATA.CONFIRM_DELETE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      accept: () => {
        this.projectService.delete(project.id).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('DATA.SUCCESS'),
                detail: this.translate.instant('DATA.PROJECT_DELETED_SUCCESSFULLY')
              });
              // Clear cache before reloading
              this.cache.clear();
              this.loadProjects();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('DATA.ERROR'),
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('DATA.ERROR'),
              detail: this.translate.instant('DATA.ERROR_DELETING_PROJECT')
            });
          }
        });
      }
    });
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'جديد': 'status-new',
      'قيد الإسناد': 'status-assigning',
      'مسند': 'status-assigned',
      'قيد التنفيذ': 'status-executing',
      'مكتمل': 'status-completed',
      'معلق': 'status-pending',
      'ملغي': 'status-cancelled',
      'مؤرشف': 'status-archived'
    };
    return statusMap[status] || 'status-default';
  }

  translateStatus(status: string): string {
    const statusTranslationMap: { [key: string]: string } = {
      'جديد': 'DATA.PROJECT_STATUS_NEW',
      'قيد الإسناد': 'DATA.PROJECT_STATUS_ASSIGNING',
      'مسند': 'DATA.PROJECT_STATUS_ASSIGNED',
      'قيد التنفيذ': 'DATA.PROJECT_STATUS_EXECUTING',
      'مكتمل': 'DATA.PROJECT_STATUS_COMPLETED',
      'معلق': 'DATA.PROJECT_STATUS_PENDING',
      'ملغي': 'DATA.PROJECT_STATUS_CANCELLED',
      'مؤرشف': 'DATA.PROJECT_STATUS_ARCHIVED'
    };
    const translationKey = statusTranslationMap[status];
    return translationKey ? this.translate.instant(translationKey) : status;
  }

  formatCurrency(amount: number | undefined | null): string {
    if (amount === null || amount === undefined) {
      return '-';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' SAR';
  }

  getProfitClass(profitPercentage: number | undefined | null): string {
    if (profitPercentage === null || profitPercentage === undefined) {
      return '';
    }
    if (profitPercentage >= 10) {
      return 'profit-high';
    } else if (profitPercentage >= 5) {
      return 'profit-medium';
    } else if (profitPercentage > 0) {
      return 'profit-low';
    } else if (profitPercentage === 0) {
      return 'profit-zero';
    } else {
      return 'profit-negative';
    }
  }

}
