import {
  Component,
  LOCALE_ID,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService, PrimeNGConfig } from 'primeng/api';
import { PermissionService } from '../../../services/authorization/permission.service';
import { RoleService } from '../../../services/authorization/role.service';
import { TranslationService } from '../../../modules/i18n';
import primengArTranslations from '../../../utils/primengArTranslations';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { RoleModel } from '../../../models/auth/role.model';
import { CustomValidators } from '../../../utils/CustomValidators';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PermissionOption {
  label: string;
  value: string | number;
}

interface GroupedCategory {
  id: string;
  name: string;
  options: PermissionOption[];
}

@Component({
  selector: 'app-view-role',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    InputSwitchModule,
    TooltipModule,
  ],
  templateUrl: './view-role.component.html',
  styleUrl: './view-role.component.scss',
  providers: [MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],
})
export class ViewRoleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  roleFormGroup: FormGroup;
  permissionOptions: PermissionOption[] = [];
  groupedCategories: GroupedCategory[] = [];
  activeLanguage: string;
  private allPermissions: any[] = [];
  roleId: string | null = null;
  loading = false;
  saving = false;
  isCreateMode = false;
  showFrontal = false;
  private existingRoles: string[] = [];
  searchQuery = '';

  onSearchQueryChange(): void {
    this.groupPermissionOptions();
  }

  getActiveOptionsList(): PermissionOption[] {
    const query = (this.searchQuery || '').trim().toLowerCase();
    return this.permissionOptions.filter(opt => {
      if (!query) return true;
      const label = (opt.label || '').toLowerCase();
      const val = (opt.value || '').toString().toLowerCase();

      const originalPermission = this.allPermissions.find(p => p.id === opt.value);
      const name = originalPermission ? (originalPermission.name || '').toLowerCase() : '';
      const arName = originalPermission ? (originalPermission.arabicName || '').toLowerCase() : '';

      return label.includes(query) || val.includes(query) || name.includes(query) || arName.includes(query);
    });
  }

  readonly dependencyMap: { [permissionName: string]: string[] } = {
    // Sales dependency
    'SalesInvoice.Create': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesInvoice.Update': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesInvoice.Read': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'FrontalSalesInvoice.Read': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesQuotation.Create': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesQuotation.Read': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesCreditNote.Create': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],
    'SalesCreditNote.Read': ['Product.Read', 'CustomerProfile.Read', 'MeasurementUnit.Read'],

    // POS dependency
    'Cashier.POS': ['Product.Read', 'Treasury.Read'],
    'Cashier.Session.Manage': ['Treasury.Read'],
    'Cashier.Session.CloseAny': ['Cashier.Session.ViewAll'],

    // Purchases dependency
    'PurchaseInvoice.Create': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],
    'PurchaseInvoice.Read': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],
    'FrontalPurchaseInvoice.Read': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],
    'PurchaseReturn.Create': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],
    'PurchaseReturn.Read': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],
    'DebitNote.Create': ['Product.Read', 'SupplierDetails.Read', 'MeasurementUnit.Read'],

    // Reservations dependency
    'Reservation.Create': ['Hotels.Read', 'RoomType.Read', 'CustomerProfile.Read'],
    'Reservation.Read': ['Hotels.Read', 'RoomType.Read', 'CustomerProfile.Read'],
    'FrontalReservation.Read': ['Hotels.Read', 'RoomType.Read', 'CustomerProfile.Read'],

    // Inventory dependency
    'InventoryPermit.Create': ['Product.Read', 'StoreDetails.Read'],
    'InventoryPermit.Read': ['Product.Read', 'StoreDetails.Read'],
    'InventoryStocktaking.Create': ['Product.Read', 'StoreDetails.Read'],
    'InventoryStocktaking.Read': ['Product.Read', 'StoreDetails.Read']
  };

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService,
    private primengConfig: PrimeNGConfig,
    private messageService: MessageService,
    private permissionService: PermissionService,
    private roleService: RoleService,
    private translationService: TranslationService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();

    this.roleFormGroup = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.maxLength(100), CustomValidators.noWhitespaceOnly(), CustomValidators.uniqueRoleName([], null)]],
      rolePermissions: [
        [],
        [Validators.required, this.atLeastOnePermissionValidator],
      ], // مصفوفة IDs
      maxUsersCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxCompaniesCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxBranchesCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxStoresCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxBanksCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxTreasuriesCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxSuppliersCount: [{ value: null, disabled: true }, [Validators.min(1)]],
      maxCustomersCount: [{ value: null, disabled: true }, [Validators.min(1)]],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
  }

  ngOnInit(): void {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isCreateMode = this.router.url.includes('/create');

    this.roleFormGroup.controls['rolePermissions'].valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateQuotaControlsState();
      });

    this.initPageData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initPageData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    const requests: {
      permissions: any;
      existingRoles: any;
      role?: any;
    } = {
      permissions: this.permissionService.getAll(),
      existingRoles: this.roleService.getAll(),
    };

    if (this.roleId && !this.isCreateMode) {
      requests.role = this.roleService.getById(this.roleId);
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            // 1. All permissions
            this.allPermissions = (res.permissions || []).filter((p: any) => {
              const n = (p?.name || '').toLowerCase();
              return (
                n !== 'cashier.invoice.shiftinvoicecounter' &&
                !n.includes('shiftinvoicecounter')
              );
            });

            // 2. Existing roles for duplicate validation
            this.existingRoles = (res.existingRoles || [])
              .filter((x: any) => x.name !== 'System.Admin')
              .map((x: any) => x.name);

            // 3. Patch role data if in edit mode
            if (res.role) {
              const role = res.role;
              this.roleFormGroup.patchValue({
                id: role.id,
                name: role.name,
                rolePermissions: (role.rolePermissions || []).map(
                  (rp: any) => rp.permissionId
                ),
                maxUsersCount: role.maxUsersCount,
                maxCompaniesCount: role.maxCompaniesCount,
                maxBranchesCount: role.maxBranchesCount,
                maxStoresCount: role.maxStoresCount,
                maxBanksCount: role.maxBanksCount,
                maxTreasuriesCount: role.maxTreasuriesCount,
                maxSuppliersCount: role.maxSuppliersCount,
                maxCustomersCount: role.maxCustomersCount,
              });
            }

            // 4. Now with permissions & role form populated, determine switch & filter options
            this.determineAndSetSwitchFromSelection();
            this.applyFrontalFilter(
              this.showFrontal,
              /*performCleanup*/ false,
              /*showToast*/ false
            );
            this.updateQuotaControlsState();
            this.updateRoleNameValidator();

            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading role page data:', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail:
              this.translate.instant('FINANCE.ROLES_LOADING_ERROR') ||
              'خطأ في تحميل بيانات الدور والصلاحيات',
          });
          this.cdr.detectChanges();
        },
      });
  }

  // Custom validator للتأكد من اختيار صلاحية واحدة على الأقل
  atLeastOnePermissionValidator(control: any) {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { atLeastOnePermission: true };
    }
    return null;
  }

  /** هل الصلاحية Frontal؟ (يفحص العربي والإنجليزي – غير حساس لحالة الأحرف) */
  private isFrontalPermission(p: any): boolean {
    const name = (p?.name ?? '').toLowerCase();
    const ar = (p?.arabicName ?? '').toLowerCase();
    return name.includes('frontal') || ar.includes('frontal');
  }

  /** تحويل قائمة صلاحيات إلى خيارات العرض (label/value) مع لغة الواجهة الحالية */
  private mapToOptions(list: any[]): PermissionOption[] {
    return (list || []).map((x) => ({
      label: this.activeLanguage === 'ar' ? x.arabicName ?? x.name : x.name,
      value: x.id,
    }));
  }

  /** تجميع الصلاحيات المفلترة في تصنيفات واضحة مثل شريط التنقل الجانبي */
  groupPermissionOptions(): void {
    const user = this.authService.currentUserValue;
    const isDev = user?.userName === 'developer' || user?.userRoles?.some(ur => ur.role?.name === 'System.Developer');

    let categoriesConfig = [
      { id: 'sales', nameAr: 'المبيعات', nameEn: 'Sales', prefixes: ['SalesInvoice', 'SalesQuotation', 'SalesCreditNote', 'SalesInvoiceReport', 'MainSalesClass', 'FrontalSalesInvoice', 'SalesReturn', 'SalesRepresentative', 'FrontalSalesRepresentative'] },
      { id: 'pos_general', nameAr: 'الإعدادات العامة للكاشير والورديات', nameEn: 'General Cashier & Sessions', prefixes: ['Cashier.Session.', 'Cashier.Invoice.', 'Cashier.Reports.'] },
      { id: 'pos_supermarket', nameAr: 'كاشير السوبرماركت والتجزئة', nameEn: 'Supermarket & Retail POS', prefixes: ['Cashier.POS', 'Cashier.Pricing.', 'Cashier.Inventory.'] },
      { id: 'pos_restaurant', nameAr: 'كاشير ونقاط بيع المطاعم', nameEn: 'Restaurant POS', prefixes: ['Cashier.Restaurant', 'RestaurantTable', 'RestaurantFloor', 'Restaurant.', 'Cashier.DineIn', 'Cashier.AssignTable'] },
      { id: 'pos_pharmacy', nameAr: 'كاشير ونقاط بيع الصيدليات', nameEn: 'Pharmacy POS & Operations', prefixes: ['Cashier.Pharmacy', 'Pharmacy.', 'Pharmacy'] },
      {
        id: 'reservations', nameAr: 'الحجوزات', nameEn: 'Reservations', prefixes: [
          'Reservation', 'FrontalReservation', 'RoomAvailability', 'HotelAllotment',
          'Hotels', 'FrontalHotel', 'RoomType', 'FrontalRoomType',
          'ReservationMeal', 'FrontalReservationMeal', 'ReservationSupplier', 'FrontalReservationSupplier',
          'ReservationService', 'FrontalReservationService', 'ReservationCompany', 'FrontalReservationCompany',
          'ReservationView', 'FrontalReservationView', 'ReservationSeason', 'FrontalReservationSeason',
          'ReservationInvoice', 'ReservationPurchases', 'ReservationAdvancedSearch'
        ]
      },
      { id: 'smartBooking', nameAr: 'الموقع الإلكتروني / حجز ذكي', nameEn: 'Smart Booking Website', prefixes: ['SmartBooking'] },
      { id: 'purchases', nameAr: 'المشتريات', nameEn: 'Purchases', prefixes: ['PurchaseInvoice', 'FrontalPurchaseInvoice', 'DebitNote', 'PurchaseReturn', 'PurchasableReport', 'MainPurchaseClass'] },
      { id: 'restaurants', nameAr: 'المطاعم والمطابخ', nameEn: 'Restaurants & Kitchens', prefixes: ['Recipe', 'MealReservation', 'Cashier.DineIn', 'Cashier.AssignTable'] },
      { id: 'inventory', nameAr: 'المخازن والمخزون', nameEn: 'Inventory', prefixes: ['Inventory', 'StoreDetails', 'Product', 'MeasurementUnit', 'PurchasableCardReport'] },
      { id: 'contacts', nameAr: 'العملاء والموردين', nameEn: 'Customers & Suppliers', prefixes: ['CustomerProfile', 'FrontalCustomerProfile', 'SupplierDetails', 'FrontalSupplierDetails', 'SupplierReport'] },
      { id: 'accounting', nameAr: 'الحسابات العامة والمالية', nameEn: 'Accounting & Finance', prefixes: ['Account.', 'Transaction', 'FrontalTransaction', 'ExpensesCenter', 'FinancePeriods', 'Treasury', 'FrontalTreasury', 'PaymentReceipt', 'PaycheckReceipt', 'FrontalPaymentReceipt', 'FrontalPaycheckReceipt', 'ReviewBalance', 'ProfitLossAccount', 'BudgetAssessment', 'AccountStatement', 'FrontalAccountStatement'] },
      { id: 'projects', nameAr: 'إدارة المشاريع', nameEn: 'Projects', prefixes: ['Projects'] },
      { id: 'dashboard', nameAr: 'لوحة التحكم والداشبورد', nameEn: 'Dashboard Settings', prefixes: ['Dashboard'] },
      { id: 'settings', nameAr: 'الإعدادات العامة للنظام', nameEn: 'Settings', prefixes: ['UserManagement', 'FrontalUserManagement', 'RoleManagement', 'FrontalRoleManagement', 'CompanyDetails', 'LicenseManagement', 'SystemSetting', 'SystemNotification', 'PdfTemplateConfigurator', 'System.Read', 'System.Delete', 'System.Create', 'System.Update'] },
      { id: 'branches', nameAr: 'إدارة الفروع', nameEn: 'Branches', prefixes: ['Branch', 'FrontalBranch'] },
      { id: 'developer', nameAr: 'صلاحيات المطور', nameEn: 'Developer Permissions', prefixes: ['System.DevOnly.'] }
    ];

    if (!isDev) {
      categoriesConfig = categoriesConfig.filter(c => c.id !== 'developer');
    }

    const grouped: { [key: string]: PermissionOption[] } = {};
    categoriesConfig.forEach(c => grouped[c.id] = []);
    const otherOptions: PermissionOption[] = [];

    const permMap = new Map((this.allPermissions || []).map(p => [p.id, p]));

    this.getActiveOptionsList().forEach(opt => {
      const pObj = permMap.get(opt.value);
      const name = pObj ? pObj.name : '';
      const nameLower = name.toLowerCase();

      // If not dev, completely skip developer permissions
      if (!isDev && nameLower.startsWith('system.devonly.')) {
        return;
      }

      if (nameLower.includes('shiftinvoicecounter')) {
        return;
      }

      let matched = false;
      for (const cat of categoriesConfig) {
        if (cat.prefixes.some(prefix => nameLower.startsWith(prefix.toLowerCase()))) {
          grouped[cat.id].push(opt);
          matched = true;
          break;
        }
      }
      if (!matched) {
        otherOptions.push(opt);
      }
    });

    this.groupedCategories = categoriesConfig.map(cat => ({
      id: cat.id,
      name: this.activeLanguage === 'ar' ? cat.nameAr : cat.nameEn,
      options: grouped[cat.id]
    })).filter(g => g.options.length > 0);

    if (otherOptions.length > 0) {
      this.groupedCategories.push({
        id: 'other',
        name: this.activeLanguage === 'ar' ? 'أخرى' : 'Other',
        options: otherOptions
      });
    }
  }

  /** يحدد السويتش تلقائياً (Frontal/Non-Frontal) بناءً على الاختيارات الحالية */
  private determineAndSetSwitchFromSelection(): void {
    const selected: (string | number)[] =
      this.roleFormGroup.controls['rolePermissions']?.value || [];

    if (!selected.length || !this.allPermissions?.length) {
      return;
    }

    const selectedPermissions = this.allPermissions.filter((p) =>
      selected.includes(p.id)
    );
    const hasFrontal = selectedPermissions.some((p) =>
      this.isFrontalPermission(p)
    );
    const hasNonFrontal = selectedPermissions.some(
      (p) => !this.isFrontalPermission(p)
    );

    if (hasFrontal && hasNonFrontal) {
      // Mixed: الوضع الابتدائي = Non-Frontal دون تنظيف
      this.showFrontal = false;
      return;
    }

    // مجموعة واحدة فقط
    this.showFrontal = hasFrontal;
  }

  applyFrontalFilter(
    showFrontal: boolean,
    performCleanup: boolean = false,
    showToast: boolean = false
  ): void {
    const src = this.allPermissions || [];

    const filtered = showFrontal
      ? src.filter((p) => this.isFrontalPermission(p))
      : src.filter((p) => !this.isFrontalPermission(p));

    this.permissionOptions = this.mapToOptions(filtered);
    this.groupPermissionOptions();

    if (performCleanup) {
      // نظّف الاختيارات من المجموعة العكسية
      const ctrl = this.roleFormGroup.controls['rolePermissions'];
      const selected: (string | number)[] = (ctrl.value || []).slice();
      const allowedIds = new Set(filtered.map((p) => p.id));
      const cleaned = selected.filter((id) => allowedIds.has(id));
      const removedCount = selected.length - cleaned.length;

      if (removedCount > 0) {
        ctrl.setValue(cleaned);
        ctrl.markAsDirty();
        ctrl.markAsTouched();
        this.roleFormGroup.updateValueAndValidity({ emitEvent: false });
      }

      if (showToast) {
        let detailMsg: string;
        if (removedCount > 0) {
          detailMsg = showFrontal
            ? (this.activeLanguage === 'ar'
                ? `تم تحويل الدور إلى فرونتال لعرض شاشات الفرونتال بالسايدبار (تم استبعاد ${removedCount} صلاحية سابقة).`
                : `Switched to Frontal role for sidebar items (${removedCount} previous permission(s) removed).`)
            : (this.activeLanguage === 'ar'
                ? `تم تحويل الدور إلى دور عادي لعرض القوائم الأساسية بالسايدبار (تم استبعاد ${removedCount} صلاحية سابقة).`
                : `Switched to Standard role for main sidebar menus (${removedCount} previous permission(s) removed).`);
        } else {
          detailMsg = showFrontal
            ? (this.activeLanguage === 'ar'
                ? 'تم تحويل الدور إلى فرونتال لعرض عناصر الفرونتال في السايدبار.'
                : 'Switched to Frontal role to display Frontal sidebar items.')
            : (this.activeLanguage === 'ar'
                ? 'تم تحويل الدور إلى دور عادي لعرض عناصر السايدبار الأساسية.'
                : 'Switched to Standard role to display standard sidebar menus.');
        }

        this.messageService.clear();
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.INFO') || (this.activeLanguage === 'ar' ? 'معلومة' : 'Information'),
          detail: detailMsg,
          life: 4500,
        });
      }
    }

    this.updateQuotaControlsState();
    this.cdr.detectChanges();
  }



  // helpers لاختيار/إلغاء اختيار عنصر في الشبكة
  isSelected(id: string | number): boolean {
    const arr: (string | number)[] =
      this.roleFormGroup.controls['rolePermissions'].value || [];
    return arr.includes(id);
  }

  togglePermission(id: string | number, event: any): void {
    const checked = event.target.checked;
    const ctrl = this.roleFormGroup.controls['rolePermissions'];
    const current: (string | number)[] = (ctrl.value || []).slice();

    const idx = current.indexOf(id);
    if (checked && idx === -1) {
      current.push(id);

      // منطق الاعتمادية للربط التلقائي للصلاحيات
      const permissionObj = this.allPermissions.find(p => p.id === id);
      if (permissionObj) {
        const deps = this.dependencyMap[permissionObj.name];
        if (deps && deps.length > 0) {
          const activatedDeps: string[] = [];
          deps.forEach(depName => {
            const depPermissionObj = this.allPermissions.find(p => p.name === depName);
            if (depPermissionObj && !current.includes(depPermissionObj.id)) {
              current.push(depPermissionObj.id);
              activatedDeps.push(this.activeLanguage === 'ar' ? depPermissionObj.arabicName || depPermissionObj.name : depPermissionObj.name);
            }
          });
          if (activatedDeps.length > 0) {
            const permLabel = this.activeLanguage === 'ar' ? permissionObj.arabicName || permissionObj.name : permissionObj.name;
            const message = this.activeLanguage === 'ar'
              ? `صلاحية "${permLabel}" معتمدة على: ${activatedDeps.join('، ')} (تم اختيارها تلقائياً)`
              : `Permission "${permLabel}" depends on: ${activatedDeps.join(', ')} (selected automatically)`;
            this.messageService.clear();
            this.messageService.add({
              severity: 'info',
              summary: this.activeLanguage === 'ar' ? 'ربط تلقائي للصلاحيات' : 'Automatic Permission Association',
              detail: message,
              life: 5000
            });
          }
        }
      }

    } else if (!checked && idx > -1) {
      current.splice(idx, 1);

      const permissionObj = this.allPermissions.find(p => p.id === id);
      if (permissionObj) {
        // منطق إلغاء التحديد المتتالي الذكي (Smart Deselect Cascade)
        const deps = this.dependencyMap[permissionObj.name];
        if (deps && deps.length > 0) {
          const removedDeps: string[] = [];

          deps.forEach(depName => {
            const depPermissionObj = this.allPermissions.find(p => p.name === depName);
            if (depPermissionObj) {
              // التحقق مما إذا كانت هناك أي صلاحية أخرى نشطة متبقية تحتاج لهذه التابع
              const isStillNeeded = current.some(selectedId => {
                const selectedObj = this.allPermissions.find(p => p.id === selectedId);
                if (selectedObj) {
                  const selectedDeps = this.dependencyMap[selectedObj.name];
                  return selectedDeps && selectedDeps.includes(depName);
                }
                return false;
              });

              // إذا لم تعد مطلوبة من أي صلاحية نشطة أخرى، نلغيها تلقائياً
              if (!isStillNeeded) {
                const depIdx = current.indexOf(depPermissionObj.id);
                if (depIdx > -1) {
                  current.splice(depIdx, 1);
                  removedDeps.push(this.activeLanguage === 'ar' ? depPermissionObj.arabicName || depPermissionObj.name : depPermissionObj.name);
                }
              }
            }
          });

          if (removedDeps.length > 0) {
            const permLabel = this.activeLanguage === 'ar' ? permissionObj.arabicName || permissionObj.name : permissionObj.name;
            const message = this.activeLanguage === 'ar'
              ? `بسبب إلغاء "${permLabel}"، تم تلقائياً إلغاء الصلاحيات المعتمدة غير المستخدمة: [${removedDeps.join('، ')}]`
              : `Due to unchecking "${permLabel}", unused dependent permissions were unchecked: [${removedDeps.join(', ')}]`;
            this.messageService.clear();
            this.messageService.add({
              severity: 'info',
              summary: this.activeLanguage === 'ar' ? 'إلغاء تلقائي للصلاحيات' : 'Automatic Permission Deassociation',
              detail: message,
              life: 5000
            });
          }
        }

        // تنبيه احترازي إضافي للمدير في حال أنه ألغى يدوياً صلاحية معتمدة عليها صلاحيات أخرى نشطة
        const dependentOnThis: string[] = [];
        current.forEach(selectedId => {
          const selectedObj = this.allPermissions.find(p => p.id === selectedId);
          if (selectedObj) {
            const deps = this.dependencyMap[selectedObj.name];
            if (deps && deps.includes(permissionObj.name)) {
              dependentOnThis.push(this.activeLanguage === 'ar' ? selectedObj.arabicName || selectedObj.name : selectedObj.name);
            }
          }
        });
        if (dependentOnThis.length > 0) {
          const permLabel = this.activeLanguage === 'ar' ? permissionObj.arabicName || permissionObj.name : permissionObj.name;
          const message = this.activeLanguage === 'ar'
            ? `تنبيه: تم إلغاء تحديد "${permLabel}" بالرغم من أن الصلاحيات التالية معتمدة عليها: ${dependentOnThis.join('، ')}`
            : `Warning: Deselected "${permLabel}" even though the following permissions depend on it: ${dependentOnThis.join(', ')}`;
          this.messageService.add({
            severity: 'warn',
            summary: this.activeLanguage === 'ar' ? 'تنبيه الاعتماديات' : 'Dependency Warning',
            detail: message,
            life: 6000
          });
        }
      }
    }

    ctrl.setValue(current);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    this.updateQuotaControlsState();
    this.roleFormGroup.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
  }

  // يستدعى عند تغيير السويتش من الواجهة
  public onSwitchChange(eventOrChecked: any): void {
    if (typeof eventOrChecked === 'boolean') {
      this.showFrontal = eventOrChecked;
    } else if (eventOrChecked && typeof eventOrChecked.checked === 'boolean') {
      this.showFrontal = eventOrChecked.checked;
    }
    this.applyFrontalFilter(this.showFrontal, true, true);
    this.cdr.detectChanges();
  }

  validateDependencies(): boolean {
    const selectedIds: (string | number)[] = this.roleFormGroup.controls['rolePermissions'].value || [];
    const missingDeps: { parent: string; child: string }[] = [];

    selectedIds.forEach(id => {
      const permissionObj = this.allPermissions.find(p => p.id === id);
      if (permissionObj) {
        const deps = this.dependencyMap[permissionObj.name];
        if (deps && deps.length > 0) {
          deps.forEach(depName => {
            const depPermissionObj = this.allPermissions.find(p => p.name === depName);
            if (depPermissionObj && !selectedIds.includes(depPermissionObj.id)) {
              missingDeps.push({
                parent: this.activeLanguage === 'ar' ? permissionObj.arabicName || permissionObj.name : permissionObj.name,
                child: this.activeLanguage === 'ar' ? depPermissionObj.arabicName || depPermissionObj.name : depPermissionObj.name
              });
            }
          });
        }
      }
    });

    if (missingDeps.length > 0) {
      // Group by parent for clean message formatting
      const groupedMessages = missingDeps.reduce((acc, current) => {
        if (!acc[current.parent]) {
          acc[current.parent] = [];
        }
        acc[current.parent].push(current.child);
        return acc;
      }, {} as { [key: string]: string[] });

      const details = Object.keys(groupedMessages).map(parent => {
        const children = groupedMessages[parent].join('، ');
        return this.activeLanguage === 'ar'
          ? `صلاحية "${parent}" تتطلب تفعيل: [${children}]`
          : `Permission "${parent}" requires: [${children}]`;
      }).join(' | ');

      const summary = this.activeLanguage === 'ar' ? 'خطأ في اعتمادات الصلاحيات' : 'Permission Dependency Error';
      const detail = this.activeLanguage === 'ar'
        ? `يرجى تفعيل الصلاحيات المطلوبة قبل الحفظ: ${details}`
        : `Please activate the required permissions before saving: ${details}`;

      this.messageService.add({
        severity: 'error',
        summary: summary,
        detail: detail,
        life: 8000
      });

      return false;
    }

    return true;
  }

  saveRole(): void {
    console.log('saveRole called, isCreateMode:', this.isCreateMode);
    console.log('Form valid:', this.roleFormGroup.valid);
    console.log('Form value:', this.roleFormGroup.value);

    if (this.roleFormGroup.invalid) {
      this.roleFormGroup.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail:
          this.translate.instant('FINANCE.AT_LEAST_ONE_PERMISSION_REQUIRED') ||
          'يرجى اختيار صلاحية واحدة على الأقل وكتابة اسم الدور قبل الحفظ.',
      });
      return;
    }

    // التحقق من اعتمادات الصلاحيات بشكل صارم قبل الحفظ
    if (!this.validateDependencies()) {
      return;
    }

    const values = this.roleFormGroup.getRawValue();

    // Trim the role name before saving
    if (values.name) {
      values.name = values.name.trim();
    }

    // طبّع (Normalize) الاختيارات قبل الحفظ: احتفظ فقط بالمجموعة الحالية حسب السويتش
    const allSelected: (string | number)[] = values.rolePermissions || [];
    const allowedIdsForCurrentMode = new Set(
      (this.allPermissions || [])
        .filter((p) =>
          this.showFrontal
            ? this.isFrontalPermission(p)
            : !this.isFrontalPermission(p)
        )
        .map((p) => p.id)
    );
    const normalized = allSelected.filter((id) =>
      allowedIdsForCurrentMode.has(id)
    );

    // لو النتيجة فاضية، اعتبره خطأ (لازم صلاحية واحدة على الأقل)
    if (normalized.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail:
          this.translate.instant('FINANCE.AT_LEAST_ONE_PERMISSION_REQUIRED') ||
          'يجب اختيار صلاحية واحدة على الأقل.',
      });
      this.roleFormGroup.controls['rolePermissions'].markAsTouched();
      return;
    }

    // استخدم الـ normalized في الـ payload
    values.rolePermissions = normalized;

    if (values.name === 'System.Admin') {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail:
          this.translate.instant('FINANCE.SYSTEM_ROLE_UPDATE_ERROR') ||
          'لا يمكن تعديل الدور System.Admin',
      });
      return;
    }

    const payload: any = {
      id: values.id,
      name: values.name,
      rolePermissions: (values.rolePermissions || []).map(
        (pid: string | number) => ({
          roleId: this.isCreateMode ? null : values.id,
          permissionId: pid,
        })
      ),
      maxUsersCount: values.maxUsersCount ? Number(values.maxUsersCount) : null,
      maxCompaniesCount: values.maxCompaniesCount ? Number(values.maxCompaniesCount) : null,
      maxBranchesCount: values.maxBranchesCount ? Number(values.maxBranchesCount) : null,
      maxStoresCount: values.maxStoresCount ? Number(values.maxStoresCount) : null,
      maxBanksCount: values.maxBanksCount ? Number(values.maxBanksCount) : null,
      maxTreasuriesCount: values.maxTreasuriesCount ? Number(values.maxTreasuriesCount) : null,
      maxSuppliersCount: values.maxSuppliersCount ? Number(values.maxSuppliersCount) : null,
      maxCustomersCount: values.maxCustomersCount ? Number(values.maxCustomersCount) : null,
    };

    this.saving = true;

    const done = () => {
      this.saving = false;
      this.router.navigate(['/roles-management']);
    };

    // تحديد نوع العملية حسب الوضع
    if (this.isCreateMode) {
      // وضع الإنشاء - إنشاء RoleModel object
      const role = new RoleModel();
      role.name = payload.name;
      role.rolePermissions = payload.rolePermissions;
      (role as any).maxUsersCount = payload.maxUsersCount;
      (role as any).maxCompaniesCount = payload.maxCompaniesCount;
      (role as any).maxBranchesCount = payload.maxBranchesCount;
      (role as any).maxStoresCount = payload.maxStoresCount;
      (role as any).maxBanksCount = payload.maxBanksCount;
      (role as any).maxTreasuriesCount = payload.maxTreasuriesCount;
      (role as any).maxSuppliersCount = payload.maxSuppliersCount;
      (role as any).maxCustomersCount = payload.maxCustomersCount;

      console.log('Calling create with role:', role);
      this.roleService.create(role).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('FINANCE.ROLE_CREATED_SUCCESSFULLY'),
          });
          done();
        },
        error: (error) => {
          console.error('Error creating role:', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.ROLE_CREATION_ERROR'),
          });
          this.saving = false;
        },
      });
    } else if (payload.id) {
      // وضع التحديث - إنشاء RoleModel object
      const role = new RoleModel();
      role.id = payload.id;
      role.name = payload.name;
      role.rolePermissions = payload.rolePermissions;
      role.maxUsersCount = payload.maxUsersCount;
      role.maxCompaniesCount = payload.maxCompaniesCount;
      role.maxBranchesCount = payload.maxBranchesCount;
      role.maxStoresCount = payload.maxStoresCount;
      role.maxBanksCount = payload.maxBanksCount;
      role.maxTreasuriesCount = payload.maxTreasuriesCount;
      role.maxSuppliersCount = payload.maxSuppliersCount;
      role.maxCustomersCount = payload.maxCustomersCount;

      console.log('Calling update with role:', role);
      this.roleService.update(role).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail:
              this.translate.instant('FINANCE.ROLE_UPDATED') ||
              'تم تحديث الدور',
          });
          done();
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail:
              this.translate.instant('FINANCE.ROLES_SAVING_ERROR') ||
              'خطأ في حفظ الدور',
          });
        },
      });
    }
  }

  closeRoleDialog(): void {
    this.router.navigate(['/roles-management']);
  }

  // Get remaining characters for name field
  getRemainingCharacters(): number {
    const currentLength = this.roleFormGroup.get('name')?.value?.length || 0;
    return 100 - currentLength;
  }

  // Check if name field is at max limit
  isAtMaxLimit(): boolean {
    return this.getRemainingCharacters() <= 0;
  }



  // Update role name validator with current roles
  private updateRoleNameValidator(): void {
    const nameControl = this.roleFormGroup.get('name');
    if (nameControl) {
      const currentRoleId = this.roleFormGroup.get('id')?.value;
      const rolesToCheck = this.isCreateMode
        ? this.existingRoles
        : this.existingRoles.filter((_, index) => this.existingRoles[index] !== this.roleFormGroup.get('name')?.value);

      nameControl.setValidators([
        Validators.required,
        Validators.maxLength(100),
        CustomValidators.noWhitespaceOnly(),
        CustomValidators.uniqueRoleName(rolesToCheck, currentRoleId)
      ]);
      nameControl.updateValueAndValidity();
    }
  }

  isCategoryAllSelected(cat: GroupedCategory): boolean {
    if (!cat.options.length) return false;
    return cat.options.every(opt => this.isSelected(opt.value));
  }

  toggleCategoryAll(cat: GroupedCategory): void {
    const ctrl = this.roleFormGroup.controls['rolePermissions'];
    const current: (string | number)[] = (ctrl.value || []).slice();
    const allSelected = this.isCategoryAllSelected(cat);

    if (allSelected) {
      // إلغاء تحديد الكل في هذا المجموعه
      cat.options.forEach(opt => {
        const idx = current.indexOf(opt.value);
        if (idx > -1) {
          current.splice(idx, 1);
        }
      });

      // إشعار بسيط
      this.messageService.clear();
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'تعديل الصلاحيات' : 'Permissions Update',
        detail: this.activeLanguage === 'ar' ? `تم إلغاء تحديد صلاحيات قسم: ${cat.name}` : `Unchecked all in category: ${cat.name}`,
        life: 3000
      });
    } else {
      // تحديد الكل في هذا المجموعه مع تفعيل اعتماداتهم تلقائياً
      cat.options.forEach(opt => {
        if (!current.includes(opt.value)) {
          current.push(opt.value);

          // الاعتمادية التلقائية
          const permissionObj = this.allPermissions.find(p => p.id === opt.value);
          if (permissionObj) {
            const deps = this.dependencyMap[permissionObj.name];
            if (deps && deps.length > 0) {
              deps.forEach(depName => {
                const depPermissionObj = this.allPermissions.find(p => p.name === depName);
                if (depPermissionObj && !current.includes(depPermissionObj.id)) {
                  current.push(depPermissionObj.id);
                }
              });
            }
          }
        }
      });

      this.messageService.clear();
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'تعديل الصلاحيات' : 'Permissions Update',
        detail: this.activeLanguage === 'ar' ? `تم تحديد جميع صلاحيات قسم: ${cat.name}` : `Checked all in category: ${cat.name}`,
        life: 3000
      });
    }

    ctrl.setValue(current);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    this.updateQuotaControlsState();
    this.roleFormGroup.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
  }

  isAllSelected(): boolean {
    const list = this.getActiveOptionsList();
    if (!list.length) return false;
    return list.every(opt => this.isSelected(opt.value));
  }

  toggleAllPermissions(): void {
    const ctrl = this.roleFormGroup.controls['rolePermissions'];
    let current: (string | number)[] = (ctrl.value || []).slice();
    const allSelected = this.isAllSelected();
    const list = this.getActiveOptionsList();

    if (!allSelected) {
      // تحديد كل الصلاحيات المعروضة وتفعيل اعتماداتهم
      list.forEach(opt => {
        if (!current.includes(opt.value)) {
          current.push(opt.value);

          const permissionObj = this.allPermissions.find(p => p.id === opt.value);
          if (permissionObj) {
            const deps = this.dependencyMap[permissionObj.name];
            if (deps && deps.length > 0) {
              deps.forEach(depName => {
                const depPermissionObj = this.allPermissions.find(p => p.name === depName);
                if (depPermissionObj && !current.includes(depPermissionObj.id)) {
                  current.push(depPermissionObj.id);
                }
              });
            }
          }
        }
      });

      this.messageService.clear();
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'تحديد الكل' : 'Select All',
        detail: this.activeLanguage === 'ar' ? 'تم تحديد جميع الصلاحيات المعروضة تلقائياً' : 'All displayed permissions selected',
        life: 3000
      });
    } else {
      // إلغاء تحديد جميع الصلاحيات المعروضة
      list.forEach(opt => {
        const idx = current.indexOf(opt.value);
        if (idx > -1) {
          current.splice(idx, 1);
        }
      });

      this.messageService.clear();
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All',
        detail: this.activeLanguage === 'ar' ? 'تم إلغاء تحديد جميع الصلاحيات المعروضة' : 'All displayed permissions deselected',
        life: 3000
      });
    }

    ctrl.setValue(current);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    this.updateQuotaControlsState();
    this.roleFormGroup.updateValueAndValidity({ emitEvent: false });
    this.cdr.detectChanges();
  }

  updateQuotaControlsState(): void {
    if (!this.roleFormGroup || !this.allPermissions) return;

    const toggleControl = (controlName: string, enabled: boolean) => {
      const ctrl = this.roleFormGroup.get(controlName);
      if (ctrl) {
        if (enabled) {
          if (ctrl.disabled) {
            ctrl.enable({ emitEvent: false });
          }
        } else {
          if (ctrl.enabled) {
            ctrl.disable({ emitEvent: false });
          }
        }
      }
    };

    toggleControl('maxUsersCount', this.isUsersQuotaEnabled());
    toggleControl('maxCompaniesCount', this.isCompaniesQuotaEnabled());
    toggleControl('maxBranchesCount', this.isBranchesQuotaEnabled());
    toggleControl('maxStoresCount', this.isStoresQuotaEnabled());
    toggleControl('maxBanksCount', this.isBanksQuotaEnabled());
    toggleControl('maxTreasuriesCount', this.isTreasuriesQuotaEnabled());
    toggleControl('maxSuppliersCount', this.isSuppliersQuotaEnabled());
    toggleControl('maxCustomersCount', this.isCustomersQuotaEnabled());
    this.cdr.detectChanges();
  }

  hasPermissionByName(permissionName: string): boolean {
    const selectedIds: (string | number)[] = this.roleFormGroup?.controls['rolePermissions']?.value || [];
    if (!selectedIds || !selectedIds.length || !this.allPermissions?.length) {
      return false;
    }
    const permObj = this.allPermissions.find(p =>
      p.name === permissionName ||
      (p.name && p.name.toLowerCase() === permissionName.toLowerCase())
    );
    if (!permObj) return false;
    return selectedIds.some(id => String(id) === String(permObj.id));
  }

  isUsersQuotaEnabled(): boolean {
    return this.hasPermissionByName('UserManagement.Create') ||
      this.hasPermissionByName('UserManagement.Read') ||
      this.hasPermissionByName('FrontalUserManagement.Read');
  }

  isCompaniesQuotaEnabled(): boolean {
    return this.hasPermissionByName('CompanyDetails.Create') ||
      this.hasPermissionByName('ReservationCompany.Create') ||
      this.hasPermissionByName('FrontalReservationCompany.Create');
  }

  isBranchesQuotaEnabled(): boolean {
    return this.hasPermissionByName('Branch.Create') ||
      this.hasPermissionByName('Branch.Read');
  }

  isStoresQuotaEnabled(): boolean {
    return this.hasPermissionByName('StoreDetails.Create') ||
      this.hasPermissionByName('InventoryManagement.Create');
  }

  isBanksQuotaEnabled(): boolean {
    return this.hasPermissionByName('BankAccounts.Create') ||
      this.hasPermissionByName('Account.Create') ||
      this.hasPermissionByName('Dashboard.BankAccounts');
  }

  isTreasuriesQuotaEnabled(): boolean {
    return this.hasPermissionByName('Treasury.Create') ||
      this.hasPermissionByName('FrontalTreasury.Create');
  }

  isSuppliersQuotaEnabled(): boolean {
    return this.hasPermissionByName('SupplierDetails.Create') ||
      this.hasPermissionByName('FrontalSupplierDetails.Create') ||
      this.hasPermissionByName('ReservationSupplier.Create');
  }

  isCustomersQuotaEnabled(): boolean {
    return this.hasPermissionByName('CustomerProfile.Create') ||
      this.hasPermissionByName('FrontalCustomerProfile.Create');
  }
}
