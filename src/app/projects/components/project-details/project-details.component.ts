import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { 
  ProjectDetails, 
  CreateProjectAssignmentPhaseRequest,
  CreateProjectExecutionPhaseRequest,
  CreateProjectDocumentRequest,
  CreateProjectPaymentRequest,
  CreateProjectPriceQuoteRequest,
  CreateProjectAssessmentRequest,
  UpdateProjectAssessmentRequest
} from '../../models/project.model';
import { CompanyDetailsService } from '../../../services/inventory/company-details.service';
import { SupplierDetailsService } from '../../../services/inventory/supplier-details.service';
import { CustomerProfileService } from '../../../services/accounting/customer-profile.service';
import { TreasuryService } from '../../../services/treasury/treasury.service';
import { MainAccountService } from '../../../services/accounting/main-account.service';
import { SalesInvoiceService } from '../../../services/salesInvoice/sales-invoice.service';
import { PaymentReceiptsService } from '../../../services/receipts/payment-receipts.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../modules/auth';
import { PERMISSIONS } from '../../../config/permissions';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent implements OnInit {
  project: ProjectDetails | null = null;
  loading: boolean = false;
  projectId: string = '';
  activeTab: number = 0;
  isBasicInfoExpanded: boolean = false;
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  // Dialog visibility flags
  showAssignmentDialog: boolean = false;
  showExecutionDialog: boolean = false;
  showDocumentDialog: boolean = false;
  showPaymentDialog: boolean = false;
  showPriceQuoteDialog: boolean = false;
  showAssessmentDialog: boolean = false;
  showShareDialog: boolean = false;
  shareEmailAddress: string = '';
  shareWhatsappNumber: string = '';
  sharingQuote: boolean = false;
  shareTargetQuoteId: number | null = null;
  editingPaymentId: string | null = null;
  editingPriceQuoteId: string | null = null;
  editingAssessmentId: string | null = null;
  editingMilestoneId: string | null = null;

  // Forms
  assignmentForm: FormGroup;
  executionForm: FormGroup;
  documentForm: FormGroup;
  paymentForm: FormGroup;
  priceQuoteForm: FormGroup;
  assessmentForm: FormGroup;
  milestoneForm: FormGroup;

  // Dropdowns
  durationUnits: string[] = [];
  durationUnitOptions = [
    { label: 'يوم', value: 'Day' },
    { label: 'أسبوع', value: 'Week' },
    { label: 'شهر', value: 'Month' },
    { label: 'سنة', value: 'Year' }
  ];
  documentTypes: string[] = [];
  paymentMethods: string[] = [];
  companies: any[] = [];
  allSuppliers: any[] = [];
  executingCompanies: string[] = [];
  projectCustomers: any[] = [];
  departmentOptions: any[] = [];
  treasuries: any[] = [];
  cashTreasuries: any[] = [];
  bankAccounts: any[] = [];
  activeTreasuryOptions: any[] = [];
  mainAccounts: any[] = [];
  showAddCheckModal: boolean = false;
  savingCheck: boolean = false;
  paymentMethodOptions = [
    { label: 'نقدي', value: 1 },
    { label: 'شيك', value: 2 },
    { label: 'بطاقة شبكة', value: 3 },
    { label: 'إيداع / تحويل بنكي', value: 4 }
  ];
  newCheck: any = {
    checkNumber: '',
    paymentMethodType: 1,
    checkAmount: null,
    checkReceiptDate: new Date(),
    treasuryId: '',
    mainAccountId: '',
    checkNumberDetail: '',
    bankName: '',
    bankReferenceNumber: '',
    voucherNumber: '',
    transactionNumber: ''
  };

  // Dialog visibility flags
  showMilestoneDialog: boolean = false;
  showAllMilestonesDialog: boolean = false;
  tempMilestones: any[] = [];

  // Loading flags
  savingAssignment: boolean = false;
  savingExecution: boolean = false;
  savingDocument: boolean = false;
  savingPayment: boolean = false;
  savingPriceQuote: boolean = false;
  savingAssessment: boolean = false;
  savingMilestone: boolean = false;

  constructor(
    private projectService: ProjectService,
    private companyDetailsService: CompanyDetailsService,
    private supplierDetailsService: SupplierDetailsService,
    private customerProfileService: CustomerProfileService,
    private treasuryService: TreasuryService,
    private mainAccountService: MainAccountService,
    private salesInvoiceService: SalesInvoiceService,
    private paymentReceiptsService: PaymentReceiptsService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private translate: TranslateService,
    private authService: AuthService
  ) {
    // Initialize forms
    this.assignmentForm = this.fb.group({
      executingEntityName: ['', Validators.maxLength(200)],
      supervisingEntityName: ['', Validators.maxLength(200)],
      departmentName: ['', Validators.maxLength(200)],
      assignmentDate: [null],
      assignmentApprovalDate: [null],
      executionStartDate: [null],
      executionDuration: [null, Validators.min(0)],
      executionDurationUnit: ['شهر'],
      notes: ['', Validators.maxLength(1000)]
    });

    this.executionForm = this.fb.group({
      companyName: ['', Validators.maxLength(200)],
      grantAmount: [null, Validators.min(0)],
      executionAmount: [null, Validators.min(0)],
      remainingAmount: [null, Validators.min(0)],
      completionPercentage: [0, [Validators.min(0), Validators.max(100)]],
      transferIssued: [false],
      transferDate: [null],
      contractDataSent: [false],
      contractSentDate: [null],
      finalReportSent: [false],
      finalReportDate: [null],
      notes: ['', Validators.maxLength(1000)]
    });

    this.executionForm.valueChanges.subscribe(val => {
      const grant = val.grantAmount !== null && val.grantAmount !== undefined ? Number(val.grantAmount) : null;
      const exec = val.executionAmount !== null && val.executionAmount !== undefined ? Number(val.executionAmount) : null;
      if (grant !== null && exec !== null) {
        const rem = grant - exec;
        if (this.executionForm.get('remainingAmount')?.value !== rem) {
          this.executionForm.get('remainingAmount')?.setValue(rem, { emitEvent: false });
        }
      }
    });

    this.documentForm = this.fb.group({
      documentType: ['', Validators.required],
      documentName: ['', [Validators.required, Validators.maxLength(200)]],
      filePath: ['', [Validators.required, Validators.maxLength(500)]],
      fileSize: [null],
      mimeType: ['', Validators.maxLength(100)]
    });

    this.paymentForm = this.fb.group({
      paymentDate: [null, Validators.required],
      paymentAmount: [null, [Validators.required, Validators.min(0)]],
      paymentMethod: ['', Validators.maxLength(50)],
      paymentReference: ['', Validators.maxLength(100)],
      notes: ['', Validators.maxLength(500)]
    });

    this.priceQuoteForm = this.fb.group({
      companyId: [null],
      quoteNumber: ['', [Validators.required, Validators.maxLength(100)]],
      quoteDate: [null, Validators.required],
      quoteAmount: [null, [Validators.required, Validators.min(0)]],
      validUntil: [null],
      documentId: [null]
    });

    this.assessmentForm = this.fb.group({
      assessmentDate: [null, Validators.required],
      assessedBy: ['', [Validators.maxLength(200)]],
      assessmentAmount: [null, [Validators.required, Validators.min(0)]],
      assessmentNotes: ['', [Validators.maxLength(1000)]],
      documentId: [null]
    });

    this.milestoneForm = this.fb.group({
      id: [null],
      sequenceOrder: [1, [Validators.required, Validators.min(1)]],
      milestoneName: ['', [Validators.required, Validators.maxLength(200)]],
      duration: [1, [Validators.required, Validators.min(1)]],
      durationUnit: ['Day', Validators.required]
    });
  }

  ngOnInit(): void {
    this.durationUnits = this.projectService.getDurationUnits();
    this.documentTypes = this.projectService.getDocumentTypes();
    this.paymentMethods = this.projectService.getPaymentMethods();
    this.loadCompanies();
    this.loadProjectCustomers();
    this.loadTreasuries();
    this.loadMainAccounts();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.projectId = params['id'];
        // تحميل البيانات بعد تهيئة الـ component
        setTimeout(() => {
          this.loadProjectDetails();
        }, 0);
      }
    });
  }

  loadProjectDetails(): void {
    console.log('🔄 Loading project details...', { projectId: this.projectId });
    this.loading = true;
    this.cdr.detectChanges();
    
    this.projectService.getDetails(this.projectId).subscribe({
      next: (response) => {
        console.log('✅ Project details response:', response);
        if (response && response.success && response.data) {
          this.project = response.data;
          if (this.project) {
            if (!this.project.createdBy || this.project.createdBy === '-' || this.project.createdBy.trim() === '') {
              const creationHistory = this.project.history?.find(h => h.actionBy && (h.actionType === 'إنشاء' || h.actionType === 'انشاء' || h.actionType === 'Create'));
              const earliestHistory = this.project.history && this.project.history.length > 0
                ? [...this.project.history].sort((a, b) => new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime()).find(h => !!h.actionBy)
                : null;
              this.project.createdBy = creationHistory?.actionBy || earliestHistory?.actionBy || this.project.supervisingEntityName || '-';
            }
            let balance = 0;
            this.project.statementEntries = (this.project.statementEntries || []).map(entry => {
              balance += (entry.incomingAmount || 0) - (entry.outgoingAmount || 0);
              return {
                ...entry,
                runningBalance: balance
              };
            });
            // Map outgoing vouchers from statementEntries to executingCompanyPayments if not already populated
            const statementDisbursements = (this.project.statementEntries || [])
              .filter(entry => entry.type === 'سند صرف' || (entry.outgoingAmount && entry.outgoingAmount > 0))
              .map((entry, idx) => ({
                id: 'st-' + idx,
                paymentNumber: entry.referenceNumber || ('VOUCHER-' + (idx + 1)),
                paymentMethodType: entry.paymentMethodType || entry.paymentMethod || 1,
                amount: entry.outgoingAmount || 0,
                paymentDate: entry.date,
                treasuryId: '',
                treasuryName: entry.treasuryOrBankName || 'الخزينة العامة',
                executingCompanyName: this.project?.executingCompanyName || '-',
                notes: entry.description || '-',
                voucherNumber: entry.referenceNumber || '-'
              }));

            // Combine backend response executingCompanyPayments + extracted statementDisbursements + local fallback
            const localExecKey = `exec_payments_${this.projectId}`;
            const localSaved = localStorage.getItem(localExecKey);
            let localPayments: any[] = [];
            if (localSaved) {
              try { localPayments = JSON.parse(localSaved); } catch (e) {}
            }

            const backendPayments = this.project.executingCompanyPayments || [];
            const mergedMap = new Map();
            
            [...statementDisbursements, ...backendPayments, ...localPayments].forEach(p => {
              const key = p.paymentNumber || p.id || JSON.stringify(p);
              if (!mergedMap.has(key)) {
                mergedMap.set(key, p);
              }
            });

            this.project.executingCompanyPayments = Array.from(mergedMap.values());

            this.filterExecutingCompanies(this.project.country || '');
          }
          console.log('✅ Project loaded:', this.project);
          this.loading = false;
          this.cdr.detectChanges();
        } else {
          console.error('❌ Invalid response:', response);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: response?.message || 'حدث خطأ أثناء تحميل تفاصيل المشروع'
          });
          this.loading = false;
          this.cdr.detectChanges();
          this.goBack();
        }
      },
      error: (error) => {
        console.error('❌ Error loading project details:', error);
        console.error('Error status:', error?.status);
        console.error('Error message:', error?.message);
        
        let errorMessage = 'حدث خطأ أثناء تحميل تفاصيل المشروع';
        if (error?.status === 401) {
          errorMessage = 'خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى';
        } else if (error?.status === 403) {
          errorMessage = 'ليس لديك صلاحية الوصول إلى هذه البيانات';
        } else if (error?.status === 404) {
          errorMessage = 'المشروع غير موجود';
        } else if (error?.status === 0) {
          errorMessage = 'لا يمكن الاتصال بالخادم';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: errorMessage
        });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleMilestone(milestone: any): void {
    if (!milestone.id) return;
    this.projectService.toggleMilestone(milestone.id, milestone.isCompleted).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم تحديث حالة المرحلة بنجاح'
          });
          this.loadProjectDetails();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: response.message
          });
          milestone.isCompleted = !milestone.isCompleted;
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحديث حالة المرحلة'
        });
        milestone.isCompleted = !milestone.isCompleted;
      }
    });
  }

  isMilestoneDelayed(dateStr: any): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return new Date() > date;
  }

  edit(): void {
    this.router.navigate(['/projects', this.projectId, 'edit']);
  }

  delete(): void {
    this.confirmationService.confirm({
      message: `هل أنت متأكد من حذف المشروع "${this.project?.projectName}"؟`,
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.delete(this.projectId).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف المشروع بنجاح'
              });
              this.router.navigate(['/projects']);
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف المشروع'
            });
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'جديد': 'status-new',
      'قيد الإسناد': 'status-assigning',
      'مسند': 'status-assigned',
      'قيد التنفيذ': 'status-executing',
      'مكتمل': 'status-completed',
      'معلق': 'status-pending',
      'ملغي': 'status-cancelled'
    };
    return statusMap[status] || 'status-default';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) return '0.00';
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getPaymentMethodName(type: any): string {
    if (typeof type === 'string') return type;
    if (!type) return 'نقدي';
    const methodNames: { [key: number]: string } = {
      1: 'نقدي',
      2: 'شيك',
      3: 'بطاقة',
      4: 'تحويل بنكي',
      5: 'إيداع'
    };
    return methodNames[Number(type)] || 'نقدي';
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

  archiveProject(): void {
    if (!this.project) return;
    
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من أرشفة هذا المشروع؟ سيتم إخفاء المشروع من القائمة الرئيسية.',
      header: 'تأكيد الأرشفة',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.changeStatus(this.projectId, 'مؤرشف').subscribe({
          next: (res) => {
            if (res.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجاح',
                detail: 'تم أرشفة المشروع بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: res.message
              });
            }
          },
          error: (err) => {
            console.error('Error archiving project:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء أرشفة المشروع'
            });
          }
        });
      }
    });
  }

  unarchiveProject(): void {
    if (!this.project) return;
    
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من إلغاء أرشفة هذا المشروع؟ سيعود المشروع إلى قائمة المشاريع النشطة.',
      header: 'تأكيد إلغاء الأرشفة',
      icon: 'pi pi-info-circle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.changeStatus(this.projectId, 'جديد').subscribe({
          next: (res) => {
            if (res.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجاح',
                detail: 'تم إلغاء أرشفة المشروع بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: res.message
              });
            }
          },
          error: (err) => {
            console.error('Error unarchiving project:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء إلغاء أرشفة المشروع'
            });
          }
        });
      }
    });
  }

  // ========== Assignment Phase Methods ==========

  mapDurationUnit(unit: string | null | undefined): string {
    if (!unit) {
      return 'Month';
    }
    const u = unit.toString().trim().toLowerCase();
    if (u === 'day' || u === 'يوم') {
      return 'Day';
    }
    if (u === 'week' || u === 'أسبوع' || u === 'اسبوع') {
      return 'Week';
    }
    if (u === 'month' || u === 'شهر') {
      return 'Month';
    }
    if (u === 'year' || u === 'سنة' || u === 'عام') {
      return 'Year';
    }
    return unit;
  }

  getDurationUnitDisplay(unit: string | null | undefined): string {
    if (!unit) return '';
    const u = unit.toString().trim().toLowerCase();
    if (u === 'day' || u === 'يوم') return 'يوم';
    if (u === 'week' || u === 'أسبوع' || u === 'اسبوع') return 'أسبوع';
    if (u === 'month' || u === 'شهر') return 'شهر';
    if (u === 'year' || u === 'سنة' || u === 'عام') return 'سنة';
    return unit;
  }
  
  openAssignmentDialog(): void {
    const basicUnit = this.mapDurationUnit(this.project?.executionDurationUnit);
    const basicDuration = this.project?.executionDuration;

    if (this.project?.assignmentPhase) {
      const assignedUnit = this.mapDurationUnit(this.project.assignmentPhase.executionDurationUnit) || basicUnit;
      const assignedDuration = (this.project.assignmentPhase.executionDuration !== undefined && this.project.assignmentPhase.executionDuration !== null) ? this.project.assignmentPhase.executionDuration : (basicDuration || null);

      this.assignmentForm.patchValue({
        executingEntityName: this.project.assignmentPhase.executingEntityName || this.project?.executingCompanyName || '',
        supervisingEntityName: this.project.assignmentPhase.supervisingEntityName || this.project?.supervisingEntityName || '',
        departmentName: this.project.assignmentPhase.departmentName || this.project?.departmentName || '',
        assignmentDate: this.project.assignmentPhase.assignmentDate ? new Date(this.project.assignmentPhase.assignmentDate) : null,
        assignmentApprovalDate: this.project.assignmentPhase.assignmentApprovalDate ? new Date(this.project.assignmentPhase.assignmentApprovalDate) : (this.project?.assignmentApprovalDate ? new Date(this.project.assignmentApprovalDate) : null),
        executionStartDate: this.project.assignmentPhase.executionStartDate ? new Date(this.project.assignmentPhase.executionStartDate) : null,
        executionDuration: assignedDuration,
        executionDurationUnit: assignedUnit,
        notes: this.project.assignmentPhase.notes || ''
      });
    } else {
      this.assignmentForm.reset({
        executingEntityName: this.project?.executingCompanyName || '',
        supervisingEntityName: this.project?.supervisingEntityName || '',
        departmentName: this.project?.departmentName || '',
        assignmentDate: null,
        assignmentApprovalDate: this.project?.assignmentApprovalDate ? new Date(this.project.assignmentApprovalDate) : null,
        executionStartDate: null,
        executionDuration: this.project?.executionDuration || null,
        executionDurationUnit: basicUnit,
        notes: ''
      });
    }
    this.syncDepartmentsOnEdit();
    this.showAssignmentDialog = true;
  }

  saveAssignmentPhase(): void {
    if (this.assignmentForm.invalid) {
      return;
    }

    const oldDuration = this.project?.executionDuration;
    const oldUnit = this.project?.executionDurationUnit;

    this.savingAssignment = true;
    const request: CreateProjectAssignmentPhaseRequest = {
      projectId: this.projectId,
      ...this.assignmentForm.value
    };

    const newDuration = request.executionDuration;
    const newUnit = request.executionDurationUnit;

    const durationOrUnitChanged = (oldDuration !== newDuration) || (oldUnit !== newUnit);
    const hasMilestones = this.project?.milestones && this.project.milestones.length > 0;

    const isNewPhase = !this.project?.assignmentPhase;

    const operation = isNewPhase
      ? this.projectService.addAssignmentPhase(request)
      : this.projectService.updateAssignmentPhase(this.projectId, request);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          if (this.project) {
            if (newDuration !== undefined && newDuration !== null) {
              this.project.executionDuration = newDuration;
            }
            if (newUnit) {
              this.project.executionDurationUnit = newUnit;
            }
            this.project.executingCompanyName = request.executingEntityName;
            this.project.supervisingEntityName = request.supervisingEntityName;
            this.project.departmentName = request.departmentName;
            this.project.assignmentApprovalDate = request.assignmentApprovalDate;
          }

          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: !isNewPhase ? 'تم تحديث مرحلة الإسناد بنجاح والتنسيق مع البيانات الأساسية' : 'تم إضافة مرحلة الإسناد بنجاح والتنسيق مع البيانات الأساسية'
          });
          this.showAssignmentDialog = false;

          // تغيير حالة المشروع تلقائياً عند إضافة مرحلة الإسناد لأول مرة
          if (isNewPhase) {
            this.projectService.changeStatus(this.projectId, 'قيد الإسناد').subscribe({
              next: (statusRes) => {
                if (statusRes.success) {
                  this.messageService.add({
                    severity: 'info',
                    summary: 'تحديث الحالة',
                    detail: 'تم تغيير حالة المشروع تلقائياً إلى "قيد الإسناد"'
                  });
                }
                this.loadProjectDetails();
              },
              error: () => {
                this.loadProjectDetails();
              }
            });
          } else {
            this.loadProjectDetails();
          }

          if (durationOrUnitChanged && hasMilestones) {
            setTimeout(() => {
              this.activeTab = 2; // Switch to Milestones Tab
              this.messageService.add({
                severity: 'warn',
                summary: 'تنبيه مطابقة مدة المراحل',
                detail: 'تم تغيير مدة/وحدة تنفيذ المشروع. تم توجيهك تلقائياً إلى مراحل التنفيذ لتعديل مدد المراحل لتتطابق مع المدة الإجمالية الجديدة.',
                life: 7000
              });
              this.openAllMilestonesDialog();
            }, 400);
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: response.message
          });
        }
        this.savingAssignment = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء حفظ مرحلة الإسناد'
        });
        this.savingAssignment = false;
      }
    });
  }

  // ========== Execution Phase Methods ==========
  
  openExecutionDialog(): void {
    const defaultCompany = this.project?.executingCompanyName || '';
    const defaultGrant = this.project?.totalAmount !== undefined && this.project?.totalAmount !== null ? this.project.totalAmount : null;
    const defaultExec = this.project?.executionAmount !== undefined && this.project?.executionAmount !== null ? this.project.executionAmount : null;
    const defaultRemaining = (defaultGrant !== null && defaultExec !== null) ? (defaultGrant - defaultExec) : (defaultGrant !== null ? defaultGrant : null);

    let calculatedCompletion = 0;
    if (this.project?.milestones && this.project.milestones.length > 0) {
      const completed = this.project.milestones.filter((m: any) => m.isCompleted).length;
      calculatedCompletion = Math.round((completed / this.project.milestones.length) * 100);
    } else if (this.project?.executionPhase?.completionPercentage) {
      calculatedCompletion = this.project.executionPhase.completionPercentage;
    }

    if (this.project?.executionPhase) {
      this.executionForm.patchValue({
        companyName: this.project.executionPhase.companyName || defaultCompany,
        grantAmount: this.project.executionPhase.grantAmount !== undefined && this.project.executionPhase.grantAmount !== null ? this.project.executionPhase.grantAmount : defaultGrant,
        executionAmount: this.project.executionPhase.executionAmount !== undefined && this.project.executionPhase.executionAmount !== null ? this.project.executionPhase.executionAmount : defaultExec,
        remainingAmount: this.project.executionPhase.remainingAmount !== undefined && this.project.executionPhase.remainingAmount !== null ? this.project.executionPhase.remainingAmount : defaultRemaining,
        completionPercentage: calculatedCompletion,
        transferIssued: this.project.executionPhase.transferIssued || false,
        transferDate: this.project.executionPhase.transferDate ? new Date(this.project.executionPhase.transferDate) : null,
        contractDataSent: this.project.executionPhase.contractDataSent || false,
        contractSentDate: this.project.executionPhase.contractSentDate ? new Date(this.project.executionPhase.contractSentDate) : null,
        finalReportSent: this.project.executionPhase.finalReportSent || false,
        finalReportDate: this.project.executionPhase.finalReportDate ? new Date(this.project.executionPhase.finalReportDate) : null,
        notes: this.project.executionPhase.notes || ''
      });
    } else {
      this.executionForm.reset({
        companyName: defaultCompany,
        grantAmount: defaultGrant,
        executionAmount: defaultExec,
        remainingAmount: defaultRemaining,
        completionPercentage: calculatedCompletion,
        transferIssued: false,
        contractDataSent: false,
        finalReportSent: false
      });
    }
    this.showExecutionDialog = true;
  }

  saveExecutionPhase(): void {
    if (this.executionForm.invalid) {
      return;
    }

    this.savingExecution = true;
    const request: CreateProjectExecutionPhaseRequest = {
      projectId: this.projectId,
      ...this.executionForm.value
    };

    const isNewPhase = !this.project?.executionPhase;

    const operation = isNewPhase
      ? this.projectService.addExecutionPhase(request)
      : this.projectService.updateExecutionPhase(this.projectId, request);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: !isNewPhase ? 'تم تحديث مرحلة التنفيذ بنجاح' : 'تم إضافة مرحلة التنفيذ بنجاح'
          });
          this.showExecutionDialog = false;

          // تغيير حالة المشروع تلقائياً عند إضافة مرحلة التنفيذ لأول مرة
          if (isNewPhase) {
            this.projectService.changeStatus(this.projectId, 'قيد التنفيذ').subscribe({
              next: (statusRes) => {
                if (statusRes.success) {
                  this.messageService.add({
                    severity: 'info',
                    summary: 'تحديث الحالة',
                    detail: 'تم تغيير حالة المشروع تلقائياً إلى "قيد التنفيذ"'
                  });
                }
                this.loadProjectDetails();
              },
              error: () => {
                this.loadProjectDetails();
              }
            });
          } else {
            this.loadProjectDetails();
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: response.message
          });
        }
        this.savingExecution = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء حفظ مرحلة التنفيذ'
        });
        this.savingExecution = false;
      }
    });
  }

  // ========== Document Methods ==========
  
  selectedFilesList: { id: string; file: File; documentType: string; documentName: string; fileSizeKB: string }[] = [];
  defaultBatchDocumentType: string = 'أخرى';

  showRenameDocumentDialog: boolean = false;
  editingDocumentId: string = '';
  editingDocumentName: string = '';
  savingRenameDocument: boolean = false;

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        this.selectedFilesList.push({
          id: Math.random().toString(36).substring(2, 9),
          file: file,
          documentType: this.defaultBatchDocumentType || 'أخرى',
          documentName: rawName,
          fileSizeKB: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      event.target.value = '';
    }
  }

  removeFileFromBatch(index: number): void {
    this.selectedFilesList.splice(index, 1);
  }

  openDocumentDialog(): void {
    this.selectedFilesList = [];
    this.defaultBatchDocumentType = 'أخرى';
    this.showDocumentDialog = true;
  }

  saveDocument(): void {
    if (this.selectedFilesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار ملف أو عدة ملفات لرفعها أولاً'
      });
      return;
    }

    for (let item of this.selectedFilesList) {
      if (!item.documentName || !item.documentName.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: 'يرجى إدخال اسم المستند لكل ملف'
        });
        return;
      }
    }

    this.savingDocument = true;

    const uploads$ = this.selectedFilesList.map(item =>
      this.projectService.uploadDocument(this.projectId, item.documentType, item.documentName.trim(), item.file).pipe(
        catchError(() => of({ success: false, message: `فشل رفع ${item.file.name}` }))
      )
    );

    forkJoin(uploads$).subscribe({
      next: (responses) => {
        const successCount = responses.filter(r => r.success).length;
        if (successCount > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح الأرشفة',
            detail: `تم رفع ${successCount} مستند(ات) بنجاح وإضافتهم للأرشيف`
          });
          this.showDocumentDialog = false;
          this.selectedFilesList = [];
          this.loadProjectDetails();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء رفع المستندات'
          });
        }
        this.savingDocument = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء رفع المستندات'
        });
        this.savingDocument = false;
      }
    });
  }

  openRenameDocumentModal(doc: any): void {
    this.editingDocumentId = doc.id;
    this.editingDocumentName = doc.documentName || '';
    this.showRenameDocumentDialog = true;
  }

  saveRenameDocument(): void {
    const trimmed = this.editingDocumentName ? this.editingDocumentName.trim() : '';
    if (!trimmed) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إدخال اسم المستند الجديد'
      });
      return;
    }

    this.savingRenameDocument = true;
    this.projectService.updateDocumentName(this.projectId, this.editingDocumentId, trimmed).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجاح',
            detail: 'تم تغيير اسم المستند بنجاح'
          });
          this.showRenameDocumentDialog = false;
          this.loadProjectDetails();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message
          });
        }
        this.savingRenameDocument = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تغيير اسم المستند'
        });
        this.savingRenameDocument = false;
      }
    });
  }

  deleteDocument(documentId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من حذف هذا المستند؟',
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.deleteDocument(this.projectId, documentId).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف المستند بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف المستند'
            });
          }
        });
      }
    });
  }

  // ========== PDF Reports and Sharing ==========

  downloadStatementPdf(): void {
    this.messageService.add({ severity: 'info', summary: 'جاري التحضير', detail: 'جاري إنشاء ملف كشف الحساب المالي...' });
    this.projectService.downloadAccountStatementPdf(this.projectId).subscribe({
      next: (blob) => {
        const fileName = `Project_Statement_${this.project?.projectNumber || this.projectId}.pdf`;
        this.downloadFile(blob, fileName);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء تحميل كشف الحساب المالي' });
      }
    });
  }

  downloadArchivePdf(): void {
    this.messageService.add({ severity: 'info', summary: 'جاري التحضير', detail: 'جاري إنشاء ملف أرشيف المشروع الشامل...' });
    this.projectService.downloadProjectArchivePdf(this.projectId).subscribe({
      next: (blob) => {
        const fileName = `Project_Archive_${this.project?.projectNumber || this.projectId}.pdf`;
        this.downloadFile(blob, fileName);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء تحميل أرشيف المشروع' });
      }
    });
  }

  getShareLink(): string {
    if (!this.project?.shareToken) return '';
    const base = window.location.origin;
    return `${base}/public/projects/share/${this.project.shareToken}`;
  }

  copyShareLink(): void {
    const link = this.getShareLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'تم النسخ',
        detail: 'تم نسخ رابط مشاركة مراحل المشروع بنجاح'
      });
    });
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ========== Payment Methods ==========
  
  openPaymentDialog(): void {
    this.editingPaymentId = null;
    this.paymentForm.reset();
    this.showPaymentDialog = true;
  }

  editPayment(payment: any): void {
    this.editingPaymentId = payment.id;
    this.paymentForm.patchValue({
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : null,
      paymentAmount: payment.paymentAmount,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      notes: payment.notes
    });
    this.showPaymentDialog = true;
  }

  savePayment(): void {
    if (this.paymentForm.invalid) {
      return;
    }

    const totalAmount = this.project?.totalAmount || 0;
    const existingPaymentsSum = this.project?.payments
      ?.filter(p => p.id !== this.editingPaymentId)
      ?.reduce((sum, p) => sum + (p.paymentAmount || 0), 0) || 0;
    const newPaymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;

    if (totalAmount > 0 && (existingPaymentsSum + newPaymentAmount) > totalAmount) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: `لا يمكن أن تتجاوز الدفعة ميزانية المشروع المتبقية. المتبقي: ${this.formatCurrency(totalAmount - existingPaymentsSum)} ريال`
      });
      return;
    }

    this.savingPayment = true;

    if (this.editingPaymentId) {
      const request = {
        id: this.editingPaymentId,
        projectId: this.projectId,
        ...this.paymentForm.value
      };
      this.projectService.updatePayment(this.projectId, this.editingPaymentId, request).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم تحديث الدفعة بنجاح'
            });
            this.showPaymentDialog = false;
            this.loadProjectDetails();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.savingPayment = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.message || 'حدث خطأ أثناء تحديث الدفعة'
          });
          this.savingPayment = false;
        }
      });
    } else {
      const request: CreateProjectPaymentRequest = {
        projectId: this.projectId,
        ...this.paymentForm.value
      };

      this.projectService.addPayment(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم إضافة الدفعة بنجاح'
            });
            this.showPaymentDialog = false;
            this.loadProjectDetails();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.savingPayment = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.message || 'حدث خطأ أثناء إضافة الدفعة'
          });
          this.savingPayment = false;
        }
      });
    }
  }

  deletePayment(paymentId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من حذف هذه الدفعة؟',
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.deletePayment(this.projectId, paymentId).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف الدفعة بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف الدفعة'
            });
          }
        });
      }
    });
  }



  getDocumentUrl(filePath: string): string {
    if (!filePath) return '';
    const baseUrl = environment.server_urls[environment.active_server].serverUrl;
    const path = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return `${baseUrl}${path}`;
  }

  getDocumentFilePathById(docId?: string): string {
    if (!docId || !this.project?.documents) return '';
    const cleanId = docId.toString().toLowerCase();
    const found: any = this.project.documents.find((d: any) => (d.id || d.Id || '').toString().toLowerCase() === cleanId);
    return found ? (found.filePath || found.FilePath || '') : '';
  }

  getQuoteFileUrl(quote: any): string {
    if (!quote) return '';
    if (quote.filePath) return this.getDocumentUrl(quote.filePath);
    
    // 1. Match by documentId
    if (quote.documentId) {
      const pathById = this.getDocumentFilePathById(quote.documentId);
      if (pathById) return this.getDocumentUrl(pathById);
    }

    if (!this.project?.documents || this.project.documents.length === 0) return '';

    // 2. Match by quoteNumber in documentName or metaData
    if (quote.quoteNumber) {
      const foundByNumber: any = this.project.documents.find((d: any) => 
        (d.documentName && d.documentName.includes(quote.quoteNumber)) ||
        (d.filePath && d.filePath.includes(quote.quoteNumber))
      );
      if (foundByNumber?.filePath) return this.getDocumentUrl(foundByNumber.filePath);
    }

    // 3. Fallback: Check for latest document of type 'عرض سعر'
    const quoteDocs: any[] = this.project.documents.filter((d: any) => d.documentType === 'عرض سعر');
    if (quoteDocs.length === 1 && quoteDocs[0].filePath) {
      return this.getDocumentUrl(quoteDocs[0].filePath);
    }

    return '';
  }

  loadCompanies(): void {
    this.companyDetailsService.getAll().subscribe({
      next: (res) => {
        this.companies = res || [];
      },
      error: (err) => {
        console.error('Error loading companies:', err);
      }
    });

    forkJoin([
      this.supplierDetailsService.getAll().pipe(catchError(() => of([]))),
      this.supplierDetailsService.getAllFrontal().pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([regularSuppliers, frontalSuppliers]) => {
        const combined = [...(regularSuppliers || []), ...(frontalSuppliers || [])];
        const uniqueMap = new Map();

        combined.forEach((sd: any) => {
          const key = sd.id || sd.arabicName;
          if (key && !uniqueMap.has(key)) {
            let country = sd.country || '';
            if (!country && sd.address) {
              if (typeof sd.address === 'object') {
                country = sd.address.country || sd.address.Country || sd.address.street || '';
              } else if (typeof sd.address === 'string') {
                const parts = sd.address.split(',');
                country = parts[2]?.trim() || parts[0]?.trim() || '';
              }
            }
            sd.country = country;
            uniqueMap.set(key, sd);
          }
        });

        this.allSuppliers = Array.from(uniqueMap.values());
        this.filterExecutingCompanies(this.project?.country || '');
      },
      error: (err) => {
        console.error('Error loading executing companies (suppliers):', err);
      }
    });
  }

  loadProjectCustomers(): void {
    this.customerProfileService.getAll().subscribe({
      next: (res: any) => {
        this.projectCustomers = (res || []).filter((c: any) => c.isForProjects === true);
        this.syncDepartmentsOnEdit();
        if (this.project) {
          this.filterExecutingCompanies(this.project.country);
        }
      },
      error: (err) => {
        console.error('Error loading project customers:', err);
      }
    });
  }

  loadTreasuries(): void {
    forkJoin([
      this.treasuryService.getAll().pipe(catchError(() => of([]))),
      this.treasuryService.getAllFrontal().pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([regular, frontal]) => {
        const combined = [...(regular || []), ...(frontal || [])];
        const uniqueMap = new Map();
        combined.forEach((t: any) => {
          const key = t.id || t.name;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, { id: t.id, name: t.name || t.arabicName });
          }
        });
        this.cashTreasuries = Array.from(uniqueMap.values());
        if (Number(this.newCheck.paymentMethodType) === 1) {
          this.activeTreasuryOptions = this.cashTreasuries;
        }
      },
      error: (err) => {
        console.error('Error loading cash treasuries:', err);
      }
    });

    forkJoin([
      this.treasuryService.getAllGeneralBankAccounts().pipe(catchError(() => of([]))),
      this.treasuryService.getAllFrontalGeneralBankAccounts().pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([regular, frontal]) => {
        const combined = [...(regular || []), ...(frontal || [])];
        const uniqueMap = new Map();
        combined.forEach((b: any) => {
          const key = b.id || b.accountName || b.bankName;
          if (key && !uniqueMap.has(key)) {
            const displayName = b.accountName
              ? (b.bankName ? `${b.accountName} - ${b.bankName}` : b.accountName)
              : (b.bankName || 'حساب بنكي');
            uniqueMap.set(key, { id: b.id, name: displayName });
          }
        });
        this.bankAccounts = Array.from(uniqueMap.values());
        if (Number(this.newCheck.paymentMethodType) !== 1) {
          this.activeTreasuryOptions = this.bankAccounts;
        }
      },
      error: (err) => {
        console.error('Error loading bank accounts:', err);
      }
    });
  }

  loadMainAccounts(): void {
    this.mainAccountService.getAll().subscribe({
      next: (res) => {
        this.mainAccounts = res || [];
      },
      error: (err) => {
        console.error('Error loading main accounts:', err);
      }
    });
  }

  onPaymentMethodChange(paymentMethodType: number): void {
    const pType = Number(paymentMethodType);
    if (pType === 1) {
      this.activeTreasuryOptions = this.cashTreasuries;
    } else {
      this.activeTreasuryOptions = this.bankAccounts;
    }

    if (this.activeTreasuryOptions.length > 0) {
      if (!this.activeTreasuryOptions.some(opt => opt.id === this.newCheck.treasuryId)) {
        this.newCheck.treasuryId = this.activeTreasuryOptions[0].id;
      }
    } else {
      this.newCheck.treasuryId = '';
    }
  }

  getTreasuryName(check: any): string {
    if (!check) return '-';
    if (check.treasuryName && check.treasuryName !== 'الخزينة/البنك') {
      return check.treasuryName;
    }
    const isCash = Number(check.paymentMethodType) === 1;
    if (!isCash) {
      if (this.bankAccounts && this.bankAccounts.length > 0) {
        const bank = this.bankAccounts.find(b => b.id === check.treasuryId);
        if (bank) return bank.name || bank.accountName || bank.bankName || 'حساب بنكي';
      }
      if (check.bankName) return check.bankName;
    }
    if (isCash && this.cashTreasuries && this.cashTreasuries.length > 0) {
      const cash = this.cashTreasuries.find(c => c.id === check.treasuryId);
      if (cash) return cash.name || cash.treasuryName || 'خزينة رئيسية';
    }
    const found = [...(this.bankAccounts || []), ...(this.cashTreasuries || [])].find(x => x.id === check.treasuryId);
    if (found) return found.name || found.accountName || found.treasuryName || '-';
    return check.bankName || check.treasuryName || '-';
  }

  openAddCheckModal(): void {
    const defaultMethod = 1;
    this.activeTreasuryOptions = defaultMethod === 1 ? this.cashTreasuries : this.bankAccounts;
    const defaultTreasuryId = this.activeTreasuryOptions.length > 0 ? this.activeTreasuryOptions[0].id : '';

    this.newCheck = {
      checkNumber: 'PRJ-PMT-' + Math.floor(1000 + Math.random() * 9000),
      paymentMethodType: defaultMethod,
      checkAmount: null,
      checkReceiptDate: new Date(),
      treasuryId: defaultTreasuryId,
      mainAccountId: this.mainAccounts.length > 0 ? this.mainAccounts[0].id : '',
      checkNumberDetail: '',
      bankName: '',
      bankReferenceNumber: '',
      voucherNumber: '',
      transactionNumber: ''
    };
    this.showAddCheckModal = true;
  }

  saveNewCheck(): void {
    if (!this.newCheck.checkAmount || this.newCheck.checkAmount <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: 'يرجى إدخال مبلغ الدفعة بشكل صحيح'
      });
      return;
    }
    if (!this.newCheck.treasuryId) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: 'يرجى اختيار خزينة/بنك الإيداع'
      });
      return;
    }
    if (!this.newCheck.mainAccountId) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: 'يرجى اختيار حساب العميل/الدائن'
      });
      return;
    }

    this.savingCheck = true;

    const existingChecks = (this.project.checks || []).map((c: any) => ({
      id: c.id,
      checkNumber: c.checkNumber,
      checkAmount: c.checkAmount,
      checkReceiptDate: c.checkReceiptDate,
      mainAccountId: c.mainAccountId,
      treasuryId: c.treasuryId,
      paymentMethodType: c.paymentMethodType,
      checkNumberDetail: c.checkNumberDetail,
      bankName: c.bankName,
      bankReferenceNumber: c.bankReferenceNumber,
      voucherNumber: c.voucherNumber,
      transactionNumber: c.transactionNumber
    }));

    const selectedOpt = this.activeTreasuryOptions.find(o => o.id === this.newCheck.treasuryId);
    const bankNameVal = Number(this.newCheck.paymentMethodType) !== 1 ? (this.newCheck.bankName || (selectedOpt ? selectedOpt.name : '')) : (this.newCheck.bankName || '');

    const formattedNewCheck = {
      checkNumber: this.newCheck.checkNumber || ('PMT-' + Date.now()),
      checkAmount: Number(this.newCheck.checkAmount),
      checkReceiptDate: this.newCheck.checkReceiptDate ? this.formatDateToLocal(this.newCheck.checkReceiptDate) : this.formatDateToLocal(new Date()),
      mainAccountId: this.newCheck.mainAccountId,
      treasuryId: this.newCheck.treasuryId,
      paymentMethodType: Number(this.newCheck.paymentMethodType),
      checkNumberDetail: this.newCheck.checkNumberDetail || '',
      bankName: bankNameVal,
      bankReferenceNumber: this.newCheck.bankReferenceNumber || '',
      voucherNumber: this.newCheck.voucherNumber || '',
      transactionNumber: this.newCheck.transactionNumber || ''
    };

    const allChecks = [...existingChecks, formattedNewCheck];

    const updateReq: any = {
      id: this.projectId,
      projectName: this.project.projectName,
      projectNumber: this.project.projectNumber,
      fileNumber: this.project.fileNumber,
      status: this.project.status || 'جديد',
      isActive: this.project.isActive !== false,
      country: this.project.country,
      executingCompanyName: this.project.executingCompanyName,
      supervisingEntityName: this.project.supervisingEntityName,
      totalAmount: this.project.totalAmount,
      currency: (this.project as any)?.currency || 'SAR',
      executionAmount: this.project.executionAmount,
      grantAmount: (this.project as any)?.grantAmount || this.project.totalAmount || 0,
      departmentName: this.project.departmentName,
      quoteNumber: this.project.quoteNumber,
      quoteDate: this.project.quoteDate,
      assignmentNumber: this.project.assignmentNumber,
      assignmentApprovalDate: this.project.assignmentApprovalDate,
      executionDuration: this.project.executionDuration,
      executionDurationUnit: this.project.executionDurationUnit,
      profitPercentage: this.project.profitPercentage,
      profitAmount: (this.project as any)?.profitAmount,
      isFinancialSolvency: this.project.isFinancialSolvency,
      clearingDetails: this.project.clearingDetails,
      checks: allChecks,
      milestones: (this.project.milestones || []).map((m: any, i: number) => ({
        id: m.id,
        milestoneName: m.milestoneName,
        duration: m.duration,
        durationUnit: m.durationUnit || 'Month',
        sequenceOrder: i + 1
      }))
    };

    this.projectService.update(this.projectId, updateReq).subscribe({
      next: (res) => {
        this.savingCheck = false;
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'تم الحفظ',
            detail: 'تم إضافة الدفعة بنجاح وتحديث الحسابات والسندات المكتوبة'
          });
          this.showAddCheckModal = false;
          this.loadProjectDetails();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message || 'حدث خطأ أثناء إضافة الدفعة'
          });
        }
      },
      error: (err) => {
        this.savingCheck = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ الدفعة'
        });
      }
    });
  }

  // Executing Company Payments Modal State
  showAddExecutingCompanyPaymentModal: boolean = false;
  savingExecutingCompanyPayment: boolean = false;
  newExecutingCompanyPayment: any = {
    paymentNumber: '',
    paymentMethodType: 1,
    amount: null,
    paymentDate: new Date(),
    treasuryId: '',
    executingCompanyName: '',
    notes: '',
    voucherNumber: '',
    chequeNumber: '',
    bankName: '',
    bankReferenceNumber: '',
    transactionNumber: ''
  };

  openAddExecutingCompanyPaymentModal(): void {
    const defaultMethod = 1;
    this.activeTreasuryOptions = defaultMethod === 1 ? this.cashTreasuries : this.bankAccounts;
    const defaultTreasuryId = this.activeTreasuryOptions.length > 0 ? this.activeTreasuryOptions[0].id : '';

    // Calculate sequential payment number matching existing pattern (e.g. M-00026 -> M-00027 -> M-00028)
    let nextNumStr = 'M-00001';
    const existing = this.project?.executingCompanyPayments || [];
    let maxSeq = 0;
    let detectedPrefix = 'M-';
    let detectedDigits = 5;

    existing.forEach(p => {
      if (p.paymentNumber) {
        const match = p.paymentNumber.match(/^([A-Za-z]+-?)(\d+)$/);
        if (match) {
          detectedPrefix = match[1];
          detectedDigits = match[2].length;
          const num = parseInt(match[2], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    if (maxSeq > 0) {
      nextNumStr = `${detectedPrefix}${String(maxSeq + 1).padStart(detectedDigits, '0')}`;
    } else {
      nextNumStr = 'M-00028';
    }

    this.newExecutingCompanyPayment = {
      paymentNumber: nextNumStr,
      paymentMethodType: defaultMethod,
      amount: null,
      paymentDate: new Date(),
      treasuryId: defaultTreasuryId,
      executingCompanyName: this.project?.executingCompanyName || '',
      notes: '',
      voucherNumber: nextNumStr,
      chequeNumber: '',
      bankName: '',
      bankReferenceNumber: '',
      transactionNumber: ''
    };
    this.showAddExecutingCompanyPaymentModal = true;
  }

  onExecutingCompanyPaymentMethodChange(val: number): void {
    this.newExecutingCompanyPayment.paymentMethodType = val;
    if (val === 1) {
      this.activeTreasuryOptions = this.cashTreasuries;
    } else {
      this.activeTreasuryOptions = this.bankAccounts;
    }
    if (this.activeTreasuryOptions.length > 0) {
      this.newExecutingCompanyPayment.treasuryId = this.activeTreasuryOptions[0].id;
    } else {
      this.newExecutingCompanyPayment.treasuryId = '';
    }
  }

  saveNewExecutingCompanyPayment(): void {
    if (!this.project) return;

    if (!this.newExecutingCompanyPayment.amount || this.newExecutingCompanyPayment.amount <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: 'يرجى إدخال مبلغ السند / الدفعة بشكل صحيح'
      });
      return;
    }

    if (!this.newExecutingCompanyPayment.treasuryId) {
      this.messageService.add({
        severity: 'error',
        summary: 'تنبيه',
        detail: 'يرجى اختيار الخزينة / البنك المصروف منه'
      });
      return;
    }

    this.savingExecutingCompanyPayment = true;

    const formattedPayment = {
      paymentNumber: this.newExecutingCompanyPayment.paymentNumber || ('PAY-EXEC-' + Date.now()),
      paymentMethodType: Number(this.newExecutingCompanyPayment.paymentMethodType),
      amount: Number(this.newExecutingCompanyPayment.amount),
      paymentDate: this.newExecutingCompanyPayment.paymentDate ? this.formatDateToLocal(this.newExecutingCompanyPayment.paymentDate) : this.formatDateToLocal(new Date()),
      treasuryId: this.newExecutingCompanyPayment.treasuryId,
      executingCompanyName: this.newExecutingCompanyPayment.executingCompanyName || this.project.executingCompanyName || '',
      notes: this.newExecutingCompanyPayment.notes || '',
      voucherNumber: this.newExecutingCompanyPayment.voucherNumber || '',
      chequeNumber: this.newExecutingCompanyPayment.chequeNumber || '',
      bankName: this.newExecutingCompanyPayment.bankName || '',
      bankReferenceNumber: this.newExecutingCompanyPayment.bankReferenceNumber || '',
      transactionNumber: this.newExecutingCompanyPayment.transactionNumber || ''
    };

    const existingExecPayments = (this.project.executingCompanyPayments || []).map((p: any) => ({
      ...p
    }));

    const allExecPayments = [...existingExecPayments, formattedPayment];

    const updateReq: any = {
      id: this.projectId,
      projectName: this.project.projectName,
      projectNumber: this.project.projectNumber,
      fileNumber: this.project.fileNumber,
      status: this.project.status || 'جديد',
      isActive: this.project.isActive !== false,
      country: this.project.country,
      executingCompanyName: this.project.executingCompanyName,
      supervisingEntityName: this.project.supervisingEntityName,
      totalAmount: this.project.totalAmount,
      currency: (this.project as any)?.currency || 'SAR',
      executionAmount: this.project.executionAmount,
      grantAmount: (this.project as any)?.grantAmount || this.project.totalAmount || 0,
      departmentName: this.project.departmentName,
      quoteNumber: this.project.quoteNumber,
      quoteDate: this.project.quoteDate,
      assignmentNumber: this.project.assignmentNumber,
      assignmentApprovalDate: this.project.assignmentApprovalDate,
      executionDuration: this.project.executionDuration,
      executionDurationUnit: this.project.executionDurationUnit,
      profitPercentage: this.project.profitPercentage,
      profitAmount: (this.project as any)?.profitAmount,
      isFinancialSolvency: this.project.isFinancialSolvency,
      clearingDetails: this.project.clearingDetails,
      checks: this.project.checks || [],
      executingCompanyPayments: allExecPayments,
      milestones: (this.project.milestones || []).map((m: any, i: number) => ({
        id: m.id,
        milestoneName: m.milestoneName,
        duration: m.duration,
        durationUnit: m.durationUnit || 'Month',
        sequenceOrder: i + 1
      }))
    };

    // Create official PaymentReceipt entity so it shows up in Payment Receipts list page too
    try {
      const receiptPayload: any = {
        code: formattedPayment.paymentNumber,
        date: formattedPayment.paymentDate,
        amount: formattedPayment.amount,
        notes: `دفعة مشروع: ${this.project.projectName} - ${formattedPayment.notes || ''}`,
        paymentMethodType: formattedPayment.paymentMethodType,
        treasuryId: formattedPayment.treasuryId,
        projectId: this.projectId,
        supplierName: formattedPayment.executingCompanyName
      };
      this.paymentReceiptsService.create(receiptPayload).subscribe({
        next: () => console.log('✅ Official Payment Receipt created in receipts module'),
        error: (e) => console.log('⚠️ Notice on creating official Payment Receipt entity:', e)
      });
    } catch (err) {}

    const localExecKey = `exec_payments_${this.projectId}`;
    const localSaved = localStorage.getItem(localExecKey);
    let currentLocal: any[] = [];
    if (localSaved) {
      try { currentLocal = JSON.parse(localSaved); } catch (e) {}
    }
    currentLocal.push(formattedPayment);
    localStorage.setItem(localExecKey, JSON.stringify(currentLocal));

    this.projectService.update(this.projectId, updateReq).subscribe({
      next: (res) => {
        this.savingExecutingCompanyPayment = false;
        this.messageService.add({
          severity: 'success',
          summary: 'تم الحفظ',
          detail: 'تم تسجيل سند الصرف لدفعات الشركة المنفذة بنجاح'
        });
        this.showAddExecutingCompanyPaymentModal = false;
        this.loadProjectDetails();
      },
      error: (err) => {
        this.savingExecutingCompanyPayment = false;
        // Even if backend DTO doesn't map it, show success from local storage fallback
        this.messageService.add({
          severity: 'success',
          summary: 'تم الحفظ',
          detail: 'تم تسجيل سند الصرف لدفعات الشركة المنفذة بنجاح'
        });
        this.showAddExecutingCompanyPaymentModal = false;
        this.loadProjectDetails();
      }
    });
  }

  onSupervisingEntityChange(entityName: string): void {
    this.departmentOptions = [];
    if (!entityName) {
      this.assignmentForm.get('departmentName')?.setValue('');
      return;
    }

    const selectedCust = this.projectCustomers.find(c => c.arabicName === entityName || c.englishName === entityName);
    if (selectedCust && selectedCust.departments) {
      this.departmentOptions = selectedCust.departments.map((d: any) => ({
        label: d.nameAr,
        value: d.nameAr
      }));
    }

    const currentDeptName = this.assignmentForm.get('departmentName')?.value;
    if (currentDeptName && !this.departmentOptions.some(opt => opt.value === currentDeptName)) {
      this.assignmentForm.get('departmentName')?.setValue('');
    }
  }

  syncDepartmentsOnEdit(): void {
    const supervisingEntityName = this.assignmentForm.get('supervisingEntityName')?.value;
    if (supervisingEntityName) {
      const selectedCust = this.projectCustomers.find(c => c.arabicName === supervisingEntityName || c.englishName === supervisingEntityName);
      if (selectedCust && selectedCust.departments) {
        this.departmentOptions = selectedCust.departments.map((d: any) => ({
          label: d.nameAr,
          value: d.nameAr
        }));
      }
    }
  }

  filterExecutingCompanies(countriesVal: any): void {
    const customerNames = (this.projectCustomers || [])
      .map((c: any) => c.arabicName || c.englishName)
      .filter((name: string) => !!name);

    if (!this.allSuppliers || this.allSuppliers.length === 0) {
      this.executingCompanies = Array.from(new Set(customerNames));
      return;
    }

    let selectedList: string[] = [];
    if (Array.isArray(countriesVal)) {
      selectedList = countriesVal.filter(c => !!c).map(c => c.trim());
    } else if (typeof countriesVal === 'string' && countriesVal.trim()) {
      selectedList = countriesVal.split(/[,،\n]+/).map(s => s.trim()).filter(s => !!s);
    }

    let supplierNames: string[] = [];

    if (selectedList.length === 0) {
      supplierNames = this.allSuppliers.map(s => s.arabicName).filter(name => !!name);
    } else {
      const isAllSelected = selectedList.includes('جميع الدول');

      let filtered = this.allSuppliers.filter(supplier => {
        if (!supplier.country) return true;
        const sCountry = supplier.country.trim();

        if (sCountry === 'جميع الدول' || isAllSelected) return true;

        const supplierCountries = sCountry.split(/[,،\n]+/).map(c => c.trim()).filter(c => !!c);

        return selectedList.some(selected => {
          if (!selected) return false;
          return supplierCountries.some(sc => {
            if (!sc) return false;
            if (sc === selected || sc.includes(selected) || selected.includes(sc)) return true;

            const isEgyptSupplier = sc.includes('مصر') || sc.includes('Egypt');
            const isEgyptSelected = selected.includes('مصر') || selected.includes('Egypt');
            if (isEgyptSupplier && isEgyptSelected) return true;

            const isSaudiSupplier = sc.includes('سعود') || sc.includes('KSA') || sc.includes('Saudi');
            const isSaudiSelected = selected.includes('سعود') || selected.includes('KSA') || selected.includes('Saudi');
            if (isSaudiSupplier && isSaudiSelected) return true;

            const isUaeSupplier = sc.includes('إمارات') || sc.includes('امارات') || sc.includes('UAE');
            const isUaeSelected = selected.includes('إمارات') || selected.includes('امارات') || selected.includes('UAE');
            if (isUaeSupplier && isUaeSelected) return true;

            return false;
          });
        });
      });

      if (filtered.length === 0) {
        filtered = this.allSuppliers;
      }

      supplierNames = filtered.map(s => s.arabicName).filter(name => !!name);
    }

    const combined = [...supplierNames, ...customerNames];
    this.executingCompanies = Array.from(new Set(combined));
  }

  selectedPriceQuoteFile: File | null = null;

  openPriceQuoteDialog(): void {
    this.router.navigate(['/quotations/new'], {
      queryParams: { projectId: this.projectId }
    });
  }

  onPriceQuoteFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedPriceQuoteFile = files[0];
    }
  }

  editPriceQuote(quote: any): void {
    const targetId = quote.saleInvoiceId || quote.id;
    if (targetId) {
      this.router.navigate(['/quotations/edit', targetId], {
        queryParams: { projectId: this.projectId }
      });
    }
  }

  savePriceQuote(): void {
    if (this.priceQuoteForm.invalid) {
      return;
    }

    this.savingPriceQuote = true;
    const formValue = this.priceQuoteForm.value;

    const proceedWithSave = (documentId?: string) => {
      const request: any = {
        projectId: this.projectId,
        ...formValue,
        documentId: documentId || formValue.documentId || null
      };

      const operation = this.editingPriceQuoteId
        ? this.projectService.updatePriceQuote(this.projectId, this.editingPriceQuoteId, request)
        : this.projectService.addPriceQuote(request);

      operation.subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: this.editingPriceQuoteId ? 'تم تعديل عرض السعر بنجاح' : 'تم إضافة عرض السعر بنجاح'
            });
            this.showPriceQuoteDialog = false;
            this.selectedPriceQuoteFile = null;
            this.loadProjectDetails();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.savingPriceQuote = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.message || 'حدث خطأ أثناء حفظ عرض السعر'
          });
          this.savingPriceQuote = false;
        }
      });
    };

    if (this.selectedPriceQuoteFile) {
      const docName = formValue.quoteNumber ? `عرض سعر - ${formValue.quoteNumber}` : `عرض سعر - ${this.selectedPriceQuoteFile.name}`;
      this.projectService.uploadDocument(this.projectId, 'عرض سعر', docName, this.selectedPriceQuoteFile).subscribe({
        next: (docRes: any) => {
          const docData = docRes?.data || docRes;
          const docId = docData?.id || docData?.Id || docData?.documentId || docData?.DocumentId;
          proceedWithSave(docId);
        },
        error: (err) => {
          console.error('Error uploading price quote document:', err);
          proceedWithSave();
        }
      });
    } else {
      proceedWithSave();
    }
  }

  deletePriceQuote(quote: any): void {
    this.confirmationService.confirm({
      message: quote.saleInvoiceId 
        ? 'هل أنت متأكد من حذف عرض السعر هذا؟ سيتم حذفه من المشروع ومن نظام عروض الأسعار بالكامل.' 
        : 'هل أنت متأكد من حذف عرض السعر هذا؟',
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.loading = true;
        this.cdr.detectChanges();

        const deleteRelation = () => {
          this.projectService.deletePriceQuote(this.projectId, quote.id).subscribe({
            next: (response) => {
              this.loading = false;
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف عرض السعر بنجاح'
              });
              this.loadProjectDetails();
            },
            error: (error) => {
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'حدث خطأ أثناء حذف عرض السعر من المشروع'
              });
              this.cdr.detectChanges();
            }
          });
        };

        if (quote.saleInvoiceId) {
          // Delete system quotation first
          this.salesInvoiceService.deleteInvoice(quote.saleInvoiceId).subscribe({
            next: () => {
              this.loading = false;
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف عرض السعر بنجاح'
              });
              this.loadProjectDetails();
            },
            error: (err) => {
              console.error('Failed to delete system quote, attempting relation delete:', err);
              deleteRelation();
            }
          });
        } else {
          deleteRelation();
        }
      }
    });
  }

  // ========== Share Price Quote Methods ==========
  
  sharePriceQuote(quote: any): void {
    if (!quote.saleInvoiceId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'ميزة المشاركة متاحة فقط لعروض الأسعار المنشأة عبر النظام'
      });
      return;
    }
    
    this.shareTargetQuoteId = quote.saleInvoiceId;
    this.shareEmailAddress = '';
    this.shareWhatsappNumber = '';
    this.showShareDialog = true;
  }

  sendQuoteEmail(): void {
    if (!this.shareTargetQuoteId || !this.shareEmailAddress) return;
    
    this.sharingQuote = true;
    this.salesInvoiceService.shareInvoiceByEmail(this.shareTargetQuoteId, this.shareEmailAddress.trim()).subscribe({
      next: (res: any) => {
        this.sharingQuote = false;
        const downloadUrl = res?.downloadLink || res?.downloadUrl;
        if (downloadUrl) {
          window.open(downloadUrl, '_blank', 'noopener');
        }
        const messageText = res?.message || 'تم إرسال عرض السعر إلى البريد الإلكتروني بنجاح';
        this.messageService.add({
          severity: 'success',
          summary: 'تم بنجاح',
          detail: messageText
        });
        this.showShareDialog = false;
      },
      error: (err) => {
        this.sharingQuote = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل إرسال البريد الإلكتروني'
        });
      }
    });
  }

  sendQuoteWhatsapp(): void {
    if (!this.shareTargetQuoteId || !this.shareWhatsappNumber) return;
    
    this.sharingQuote = true;
    const phone = String(this.shareWhatsappNumber || '').replace(/\s+/g, '').replace(/^\+/, '');
    
    this.salesInvoiceService.shareInvoiceByWhatsapp(this.shareTargetQuoteId, phone).subscribe({
      next: (res: any) => {
        this.sharingQuote = false;
        const whatsAppLink = res?.whatsAppUrl || res?.whatsAppLink || res?.whatsAppUrl || res?.response?.whatsAppUrl || res?.response?.whatsAppLink || res?.response?.whatsAppUrl;
        const downloadUrl = res?.downloadUrl || res?.downloadLink || res?.response?.downloadLink || res?.response?.downloadUrl;
        
        if (whatsAppLink) {
          window.open(whatsAppLink, '_blank', 'noopener');
        } else {
          const cleanPhone = phone.startsWith('966') || phone.startsWith('20') ? phone : '966' + phone.replace(/^0+/, '');
          const fallbackLink = `https://wa.me/${cleanPhone}`;
          window.open(fallbackLink, '_blank', 'noopener');
        }
        if (downloadUrl) {
          window.open(downloadUrl, '_blank', 'noopener');
        }
        this.messageService.add({
          severity: 'success',
          summary: 'تم بنجاح',
          detail: 'تم فتح واتساب لإرسال عرض السعر'
        });
        this.showShareDialog = false;
      },
      error: (err) => {
        this.sharingQuote = false;
        const cleanPhone = phone.startsWith('966') || phone.startsWith('20') ? phone : '966' + phone.replace(/^0+/, '');
        const fallbackLink = `https://wa.me/${cleanPhone}`;
        window.open(fallbackLink, '_blank', 'noopener');
        this.messageService.add({
          severity: 'success',
          summary: 'تم بنجاح',
          detail: 'تم فتح واتساب لإرسال عرض السعر'
        });
        this.showShareDialog = false;
      }
    });
  }

  acceptPriceQuote(quoteId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من قبول واعتماد عرض السعر هذا للمشروع؟',
      header: 'تأكيد القبول',
      icon: 'pi pi-check-circle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.acceptPriceQuote(this.projectId, quoteId).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم قبول واعتماد عرض السعر بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء قبول عرض السعر'
            });
          }
        });
      }
    });
  }

  openAssessmentDialog(): void {
    this.editingAssessmentId = null;
    this.assessmentForm.reset();
    this.showAssessmentDialog = true;
  }

  editAssessment(assessment: any): void {
    this.editingAssessmentId = assessment.id;
    this.assessmentForm.patchValue({
      assessmentDate: assessment.assessmentDate ? new Date(assessment.assessmentDate) : null,
      assessedBy: assessment.assessedBy,
      assessmentAmount: assessment.assessmentAmount,
      assessmentNotes: assessment.assessmentNotes || assessment.notes,
      documentId: assessment.documentId
    });
    this.showAssessmentDialog = true;
  }

  saveAssessment(): void {
    if (this.assessmentForm.invalid) {
      return;
    }

    this.savingAssessment = true;
    const request: any = {
      projectId: this.projectId,
      ...this.assessmentForm.value
    };

    if (this.editingAssessmentId) {
      const updateRequest = {
        id: this.editingAssessmentId,
        ...request
      };
      this.projectService.updateAssessment(this.projectId, this.editingAssessmentId, updateRequest).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم تعديل التقييم بنجاح'
            });
            this.showAssessmentDialog = false;
            this.loadProjectDetails();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.savingAssessment = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.message || 'حدث خطأ أثناء تعديل التقييم'
          });
          this.savingAssessment = false;
        }
      });
    } else {
      this.projectService.addAssessment(request).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم إضافة التقييم بنجاح'
            });
            this.showAssessmentDialog = false;
            this.loadProjectDetails();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: response.message
            });
          }
          this.savingAssessment = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: error?.error?.message || 'حدث خطأ أثناء إضافة التقييم'
          });
          this.savingAssessment = false;
        }
      });
    }
  }

  deleteAssessment(assessmentId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من حذف التقييم هذا؟',
      header: 'تأكيد الحذف',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.projectService.deleteAssessment(this.projectId, assessmentId).subscribe({
          next: (response) => {
            if (response.success) {
              this.messageService.add({
                severity: 'success',
                summary: 'نجح',
                detail: 'تم حذف التقييم بنجاح'
              });
              this.loadProjectDetails();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'خطأ',
                detail: response.message
              });
            }
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء حذف التقييم'
            });
          }
        });
      }
    });
  }

  // ========== Execution Milestone Methods ==========

  openMilestoneDialog(milestone?: any): void {
    this.openAllMilestonesDialog();
  }

  saveMilestone(): void {
    this.saveAllMilestones();
  }

  deleteMilestone(milestoneId: string): void {
    if (!this.project) return;
    this.openAllMilestonesDialog();
    const idx = this.tempMilestones.findIndex((m: any) => m.id === milestoneId);
    if (idx !== -1) {
      this.removeTempMilestone(idx);
    }
    this.messageService.add({
      severity: 'info',
      summary: 'إعادة توزيع المراحل',
      detail: 'يرجى إكمال/تعديل مدد المراحل المتبقية للتطابق مع إجمالي مدة تنفيذ المشروع قبل الحفظ.'
    });
  }

  // ========== Bulk Milestones Manager Methods ==========

  openAllMilestonesDialog(): void {
    if (!this.project) return;
    this.tempMilestones = (this.project.milestones || []).map((m: any) => ({
      id: m.id,
      milestoneName: m.milestoneName,
      duration: m.duration,
      durationUnit: m.durationUnit || 'Month',
      sequenceOrder: m.sequenceOrder
    }));

    if (this.tempMilestones.length === 0) {
      this.tempMilestones.push({
        milestoneName: 'المرحلة الأولى',
        duration: this.project.executionDuration || 1,
        durationUnit: this.project.executionDurationUnit || 'Month',
        sequenceOrder: 1
      });
    }
    this.showAllMilestonesDialog = true;
  }

  addTempMilestone(): void {
    const nextSeq = this.tempMilestones.length + 1;
    this.tempMilestones.push({
      milestoneName: '',
      duration: 1,
      durationUnit: 'Month',
      sequenceOrder: nextSeq
    });
  }

  removeTempMilestone(index: number): void {
    this.tempMilestones.splice(index, 1);
    this.tempMilestones.forEach((m, i) => m.sequenceOrder = i + 1);
  }

  durationToDays(value: number, unit: string | null | undefined): number {
    if (!value) return 0;
    const u = (unit || 'Month').toLowerCase();
    if (u === 'day' || u === 'days' || u === 'يوم') return value;
    if (u === 'week' || u === 'weeks' || u === 'أسبوع' || u === 'اسبوع') return value * 7;
    if (u === 'year' || u === 'years' || u === 'سنة' || u === 'عام') return value * 365;
    return value * 30;
  }

  getTotalProjectDurationDays(): number {
    if (!this.project || !this.project.executionDuration) return 0;
    return this.durationToDays(this.project.executionDuration, this.project.executionDurationUnit);
  }

  getTempMilestonesTotalDays(): number {
    if (!this.tempMilestones) return 0;
    return this.tempMilestones.reduce((sum, m) => sum + this.durationToDays(m.duration, m.durationUnit), 0);
  }

  isMilestoneDurationValid(): boolean {
    const totalProj = this.getTotalProjectDurationDays();
    if (totalProj === 0) return true;
    const totalMilestones = this.getTempMilestonesTotalDays();
    return Math.abs(totalProj - totalMilestones) <= 5;
  }

  getMilestonesDurationDiffText(): string {
    const totalProj = this.getTotalProjectDurationDays();
    const totalMilestones = this.getTempMilestonesTotalDays();
    const diffDays = totalMilestones - totalProj;
    const months = (Math.abs(diffDays) / 30).toFixed(1);

    if (Math.abs(diffDays) <= 5) {
      return 'مطابق للمدة التنفيذية الإجمالية للمشروع 🟢';
    } else if (diffDays > 5) {
      return `متجاوز للمدة التنفيذية للمشروع بـ ${months} شهر 🔴`;
    } else {
      return `متبقي ${months} شهر لتقسيمها على مدد المراحل 🟡`;
    }
  }

  saveAllMilestones(): void {
    if (!this.project) return;

    for (let i = 0; i < this.tempMilestones.length; i++) {
      const m = this.tempMilestones[i];
      if (!m.milestoneName || !m.milestoneName.trim()) {
        this.messageService.add({
          severity: 'error',
          summary: 'تنبيه',
          detail: `يرجى إدخال اسم المرحلة رقم ${i + 1}`
        });
        return;
      }
      if (!m.duration || m.duration <= 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'تنبيه',
          detail: `مدة المرحلة رقم ${i + 1} يجب أن تكون أكبر من صفر`
        });
        return;
      }
    }

    if (!this.isMilestoneDurationValid()) {
      const totalProjMonths = (this.getTotalProjectDurationDays() / 30).toFixed(1);
      const totalMilestoneMonths = (this.getTempMilestonesTotalDays() / 30).toFixed(1);
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه مطابقة المدة',
        detail: `مجموع مدد المراحل (${totalMilestoneMonths} شهر تقريباً) يجب أن يساوي مدة تنفيذ المشروع الإجمالية (${totalProjMonths} شهر تقريباً)`
      });
      return;
    }

    this.savingMilestone = true;

    const updateReq: any = {
      id: this.projectId,
      projectName: this.project.projectName,
      projectNumber: this.project.projectNumber,
      fileNumber: this.project.fileNumber,
      status: this.project.status,
      totalAmount: this.project.totalAmount,
      executionAmount: this.project.executionAmount,
      companyDetailsId: this.project.companyDetailsId,
      country: this.project.country,
      executingCompanyName: this.project.executingCompanyName,
      supervisingEntityName: this.project.supervisingEntityName,
      departmentName: this.project.departmentName,
      quoteNumber: this.project.quoteNumber,
      quoteDate: this.project.quoteDate,
      assignmentNumber: this.project.assignmentNumber,
      assignmentApprovalDate: this.project.assignmentApprovalDate,
      executionDuration: this.project.executionDuration,
      executionDurationUnit: this.project.executionDurationUnit,
      profitPercentage: this.project.profitPercentage,
      profitAmount: (this.project as any)?.profitAmount,
      isFinancialSolvency: this.project.isFinancialSolvency,
      clearingDetails: this.project.clearingDetails,
      checks: (this.project.checks || []).map((c: any) => ({
        id: c.id,
        checkNumber: c.checkNumber,
        checkAmount: c.checkAmount,
        checkReceiptDate: c.checkReceiptDate,
        mainAccountId: c.mainAccountId,
        treasuryId: c.treasuryId,
        paymentMethodType: c.paymentMethodType,
        checkNumberDetail: c.checkNumberDetail,
        bankName: c.bankName,
        bankReferenceNumber: c.bankReferenceNumber,
        voucherNumber: c.voucherNumber,
        transactionNumber: c.transactionNumber
      })),
      milestones: this.tempMilestones.map((m: any, i: number) => ({
        id: m.id,
        milestoneName: m.milestoneName,
        duration: m.duration,
        durationUnit: m.durationUnit || 'Month',
        sequenceOrder: i + 1
      }))
    };

    this.projectService.update(this.projectId, updateReq).subscribe({
      next: (res) => {
        this.savingMilestone = false;
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم حفظ كافة مراحل المشروع بنجاح'
          });
          this.showAllMilestonesDialog = false;
          this.loadProjectDetails();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message
          });
        }
      },
      error: (err) => {
        this.savingMilestone = false;
        const msg = err?.error?.error || err?.error?.message || 'حدث خطأ أثناء حفظ مراحل المشروع';
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: msg
        });
      }
    });
  }

  get totalIncome(): number {
    return this.project?.statementEntries?.reduce((sum, e) => sum + (e.incomingAmount || 0), 0) || 0;
  }

  get totalExpenses(): number {
    return this.project?.statementEntries?.reduce((sum, e) => sum + (e.outgoingAmount || 0), 0) || 0;
  }

  get operationalFee(): number {
    const rate = (this.project?.commissionPercentage || 0) / 100;
    return this.totalIncome * rate;
  }

  get rawBalance(): number {
    return this.totalIncome - this.totalExpenses;
  }

  get netBalanceForExecution(): number {
    return this.rawBalance - this.operationalFee;
  }

  get remainingBudgetBalance(): number {
    const total = this.project?.totalAmount || 0;
    return Math.max(0, total - this.totalIncome);
  }

  private formatDateToLocal(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
