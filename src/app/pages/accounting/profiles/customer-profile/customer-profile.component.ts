import { Component, LOCALE_ID, OnInit, OnDestroy, signal, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CustomerProfileModel } from "../../../../models/accounting/customerProfile.model";
import { PermissionModel } from "../../../../models/auth/permission.model";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { ConfirmationService, MessageService, PrimeNGConfig } from "primeng/api";
import { AuthService } from "../../../../modules/auth";
import { TranslationService } from "../../../../modules/i18n";
import { UserAccountModel } from "../../../../models/auth/userAccount.model";
import { CustomerProfileService } from "../../../../services/accounting/customer-profile.service";
import primengArTranslations from "../../../../utils/primengArTranslations";
import { Table } from "primeng/table";
import * as FileSaver from 'file-saver';
import { DetailAccountService } from "../../../../services/accounting/detail-account.service";
import { DetailAccountModel } from "../../../../models/accounting/detailAccount.model";
import { MainAccountModel } from "../../../../models/accounting/mainAccount.model";
import {ActivatedRoute, Router} from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { Subject, from, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, mergeMap, catchError } from 'rxjs/operators';
import { CustomerProfileImportFailure } from '../../../../services/accounting/customer-profile.service';
import { formatImportErrorMessage } from '../../../../shared/utils/import-error-message';
import { PERMISSIONS } from '../../../../config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class CustomerProfileComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  // ...existing code...
  @ViewChild('fileUpload') fileUpload!: ElementRef;
  
  showImportInstructionsSignal = signal(false);
  get showImportInstructions() {
    return this.showImportInstructionsSignal();
  }
  set showImportInstructions(value) {
    this.showImportInstructionsSignal.set(value);
  }
  
  importInstructions = {
    title: '',
    description: '',
    headers: [] as string[],
    notes: [] as string[]
  };
  
  // (old missing-fields state removed — import is now fully server-side)
  
  handleRowClick(entry: CustomerProfileModel) {
    if (entry.isReservationCompany) {
      this.messageService.add({
        severity: 'warn', 
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه', 
        detail: 'لا يمكن تعديل شركات الحجز من شاشة العملاء. يرجى التعديل من شاشة شركات الحجز.'
      });
      return;
    }
    this.showAddCustomerProfileDialog(entry);
  }
  selectedDetailAccountIdSignal = signal<string>(null)
  get selectedDetailAccountId(): string {
    return this.selectedDetailAccountIdSignal()
  }
  set selectedDetailAccountId(value: string) {
    this.selectedDetailAccountIdSignal.set(value)
  }
  detailAccountsSignal = signal<DetailAccountModel[]>([])
  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal()
  }
  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value)
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == "en" ? da.englishName : da.arabicName
    }))
  }

  get mainAccountOptions() {
    const detailAccount = this.detailAccounts.find((ha) => ha.id === this.selectedDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == "en" ? ma.englishName : ma.arabicName
    }))
  }

  customerProfileSignal = signal<CustomerProfileModel[]>([]);
  get customerProfiles() {
    return this.customerProfileSignal();
  }
  set customerProfiles(value) {
    this.customerProfileSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  selectedCustomers: CustomerProfileModel[] = [];
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  customerProfileDialogVisibleSignal = signal(false);
  get customerProfileDialogVisible() {
    return this.customerProfileDialogVisibleSignal();
  }
  set customerProfileDialogVisible(value) {
    this.customerProfileDialogVisibleSignal.set(value);
  }
  customerProfileFormGroup: FormGroup;
  departmentsList: any[] = [];
  newDepartmentNameAr: string = '';
  newDepartmentNameEn: string = '';
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];
  private importDestroy$ = new Subject<void>();

  // Import progress tracking
  importProgressSignal = signal<{ current: number; total: number; isImporting: boolean }>({
    current: 0, total: 0, isImporting: false
  });
  get importProgress() { return this.importProgressSignal(); }
  get importProgressPercent(): number {
    const p = this.importProgress;
    return p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
  }
  customerId: string | null = null;
  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  totalRecords: number = 0;
  pageSize: number = 10;
  lastLazyEvent: any = null;
  searchSubject = new Subject<string>();
  useServerSearch = true;
  private searchSub: any;

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public customerProfileService: CustomerProfileService,
    public detailAccountService: DetailAccountService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');

    // Option 1: Using snapshot (for static route parameters)
    this.customerId = this.route.snapshot.paramMap.get('id');

    if (this.customerId) {
      this.customerProfileService.getById(this.customerId).subscribe(res => {
        console.log(res);
        this.showAddCustomerProfileDialog(res);

      })
    }

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
          
          this.isSystemAdmin = res.userName === 'developer' || res.userRoles?.some(ur => 
            ur.role?.name === 'System.Developer'
          );
        }
      }
    );

    this.customerProfileFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: [''], // Made optional
      taxNumber: [''], // Made optional
      contactNumber: ['', [Validators.pattern(/^[+]?[0-9]{8,15}$/)]],
      email: ['', Validators.email],
      bankName: [''],
      bankAccountNumber: [''],
      iban: [''],
      street: [''],
      englishStreet: [''],
      district: [''],
      englishDistrict: [''],
      shortAddress: [''],
      buildingNumber: [''],
      subNumber: [''],
      postalCode: [''],
      city: [''],
      englishCity: [''],
      country: [''],
      englishCountry: [''],
      additionalContactNumber: [''],
      fax: [''],
      website: [''],
      instructions: [''],
      gaztNumber: [''],
      otherId: [''],
      mainAccountId: [null],
      isFrontal: [this.isFrontal],
      isForProjects: [false],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
    
    // Initialize import instructions
    this.importInstructions = {
      title: this.activeLanguage === 'ar' ? 'تعليمات استيراد العملاء' : 'Customer Import Instructions',
      description: this.activeLanguage === 'ar' 
        ? 'يرجى التأكد من أن ملف Excel الخاص بك يحتوي على الأعمدة التالية. الحقول المطلوبة موضحة بعلامة نجمة (*).'
        : 'Please ensure your Excel file contains the following columns. Required fields are marked with an asterisk (*).',
      headers: [
        this.activeLanguage === 'ar' ? '* الاسم العربي (arabicName)' : '* Arabic Name (arabicName)',
        this.activeLanguage === 'ar' ? 'الاسم الإنجليزي (englishName)' : 'English Name (englishName)',
        this.activeLanguage === 'ar' ? 'الرقم الضريبي (taxNumber)' : 'Tax Number (taxNumber)',
        this.activeLanguage === 'ar' ? 'رقم التواصل (contactNumber)' : 'Contact Number (contactNumber)',
        this.activeLanguage === 'ar' ? 'البريد الإلكتروني (email)' : 'Email (email)',
        this.activeLanguage === 'ar' ? 'اسم البنك (bankName)' : 'Bank Name (bankName)',
        this.activeLanguage === 'ar' ? 'رقم الحساب البنكي (bankAccountNumber)' : 'Bank Account Number (bankAccountNumber)',
        this.activeLanguage === 'ar' ? 'آيبان (iban)' : 'IBAN (iban)',
        this.activeLanguage === 'ar' ? 'الشارع (street)' : 'Street (street)',
        this.activeLanguage === 'ar' ? 'الحي (district)' : 'District (district)',
        this.activeLanguage === 'ar' ? 'العنوان المختصر (shortAddress)' : 'Short Address (shortAddress)',
        this.activeLanguage === 'ar' ? 'رقم المبني (buildingNumber)' : 'Building Number (buildingNumber)',
        this.activeLanguage === 'ar' ? 'الرمز البريدي (postalCode)' : 'Postal Code (postalCode)',
        this.activeLanguage === 'ar' ? 'المدينة (city)' : 'City (city)',
        this.activeLanguage === 'ar' ? 'الدولة (country)' : 'Country (country)',
        this.activeLanguage === 'ar' ? 'الرقم الفرعي (additionalContactNumber)' : 'Sub Number (additionalContactNumber)',
        this.activeLanguage === 'ar' ? 'فاكس (fax)' : 'Fax (fax)',
        this.activeLanguage === 'ar' ? 'الموقع الالكتروني (website)' : 'Website (website)',
        this.activeLanguage === 'ar' ? 'تعليمات (instructions)' : 'Instructions (instructions)',
        this.activeLanguage === 'ar' ? 'GAZT no. (gaztNumber)' : 'GAZT Number (gaztNumber)',
        this.activeLanguage === 'ar' ? 'معرف الحساب الرئيسي (mainAccountId)' : 'Main Account ID (mainAccountId)',
      ],
      notes: [
        this.activeLanguage === 'ar' 
          ? 'يمكن استخدام أسماء الأعمدة بالعربية أو الإنجليزية'
          : 'Column names can be in Arabic or English',
        this.activeLanguage === 'ar'
          ? 'الحقل المطلوب الوحيد هو: الاسم العربي'
          : 'The only required field is: Arabic Name',
        this.activeLanguage === 'ar'
          ? 'الاسم الإنجليزي والرقم الضريبي اختياريين ولكن يُنصح بإدخالهما'
          : 'English Name and Tax Number are optional but recommended',
        this.activeLanguage === 'ar'
          ? 'سيتم تحديث العملاء الموجودين بناءً على الرقم الضريبي (إذا كان موجوداً)'
          : 'Existing customers will be updated based on tax number (if provided)',
        this.activeLanguage === 'ar'
          ? 'تأكد من أن الملف بتنسيق .xlsx أو .xls'
          : 'Ensure the file is in .xlsx or .xls format',
      ],
    };

    this.columns = [
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'mainAccountId', header: this.translate.instant('FINANCE.HAS_MAIN_ACCOUNT'), filter: true, filterType: 'boolean' },
      { field: 'contactNumber', header: this.translate.instant('FINANCE.CONTACT_NUMBER'), filter: true, filterType: 'text' },
      { field: 'email', header: this.translate.instant('FINANCE.EMAIL'), filter: true, filterType: 'text' },
      { field: 'bankName', header: this.translate.instant('FINANCE.BANK_NAME'), filter: true, filterType: 'text' },
      { field: 'bankAccountNumber', header: this.translate.instant('FINANCE.BANK_ACCOUNT_NUMBER'), filter: true, filterType: 'text' },
      { field: 'iban', header: this.translate.instant('FINANCE.IBAN'), filter: true, filterType: 'text' },
      { field: 'taxNumber', header: this.translate.instant('FINANCE.TAX_NUMBER'), filter: true, filterType: 'text' },
      { field: 'district', header: this.translate.instant('FINANCE.DISTRICT'), filter: true, filterType: 'text' },
      { field: 'shortAddress', header: this.translate.instant('FINANCE.SHORT_ADDRESS'), filter: true, filterType: 'text' },
      { field: 'buildingNumber', header: this.translate.instant('FINANCE.BUILDING_NUMBER'), filter: true, filterType: 'text' },
      { field: 'postalCode', header: this.translate.instant('FINANCE.POSTAL_CODE'), filter: true, filterType: 'text' },
      { field: 'additionalContactNumber', header: this.translate.instant('FINANCE.ADDITIONAL_CONTACT_NUMBER'), filter: true, filterType: 'text' },
      { field: 'fax', header: this.translate.instant('FINANCE.FAX'), filter: true, filterType: 'text' },
      { field: 'website', header: this.translate.instant('FINANCE.WEBSITE'), filter: true, filterType: 'text' },
      { field: 'instructions', header: this.translate.instant('FINANCE.INSTRUCTIONS'), filter: true, filterType: 'text' },
      { field: 'gaztNumber', header: this.translate.instant('FINANCE.GAZT_NUMBER'), filter: true, filterType: 'text' },
      { field: 'otherId', header: this.translate.instant('FINANCE.OTHER_ID'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    if (this.useServerSearch && !this.isFrontal) {
      this.loadCustomerProfilesLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadCustomerProfiles();
    }
    this.loadAccounts();

    // Wire up debounced server-side search
    if (this.useServerSearch) {
      this.searchSub = this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          this.searchValue = query;
          this.loading = true;
          const page = 1;
          const size = this.pageSize;
          const sortField = 'createdAt';
          const sortOrder = -1;
          const isReservationCompany = this.showReservationCompanies ? true : false;
          return this.customerProfileService.searchPagedWithCompanyFilter(query, page, size, sortField, sortOrder, isReservationCompany);
        })
      ).subscribe({
        next: response => {
          this.customerProfiles = (response.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_LOADING_ERROR')
          });
        }
      });
    }
  }

  isSystemAdmin = false;
  showReservationCompanies = false;

  loadCustomerProfiles() {
    this.loadCustomerProfilesLazy(this.lastLazyEvent || { first: 0, rows: this.pageSize });
  }

  loadCustomerProfilesLazy(event: any) {
    if (this.useServerSearch && !this.isFrontal) {
      this.loading = true;
      const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
      const size = event.rows || this.pageSize;
      this.pageSize = size;
      this.lastLazyEvent = event;
      const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
      const sortField = event.sortField || 'createdAt';
      const sortOrder = event.sortOrder ?? -1;

      const isReservationCompany = this.showReservationCompanies ? true : false;
      this.customerProfileService.searchPagedWithCompanyFilter(searchQuery, page, size, sortField, sortOrder, isReservationCompany).subscribe({
        next: response => {
          this.customerProfiles = (response.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_LOADING_ERROR')
          });
        }
      });
      return;
    }

    // Legacy path: non-server-search or frontal
    this.loading = true;
    const pageNumber = Math.floor((event?.first ?? 0) / (event?.rows ?? this.pageSize)) + 1;
    const pageSize = event?.rows ?? this.pageSize;
    this.pageSize = pageSize;
    this.lastLazyEvent = event;
    
    const globalFilter = event?.filters?.['global']?.value || this.searchValue;

    if (this.isFrontal) {
      // Frontal endpoint currently returns all data without pagination support on backend
      this.customerProfileService.getAllFrontal().subscribe({
        next: customerProfiles => {
          this.customerProfiles = customerProfiles.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = this.customerProfiles.length;
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Customer Profiles', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_LOADING_ERROR')
          });
          this.loading = false;
        }
      });
    } else {
      const isReservationCompany = this.showReservationCompanies ? true : false;
      const sortField = 'createdAt';
      const sortOrder = -1;
      this.customerProfileService.searchPagedWithCompanyFilter(globalFilter, pageNumber, pageSize, sortField, sortOrder, isReservationCompany).subscribe({
        next: res => {
          this.customerProfiles = (res.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = res.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Customer Profiles', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_LOADING_ERROR')
          });
          this.loading = false;
        }
      });
    }
  }

  toggleReservationCompanies() {
    this.showReservationCompanies = !this.showReservationCompanies;
    this.loadCustomerProfiles();
  }

  showAddCustomerProfileDialog(customerProfile: CustomerProfileModel = null) {
    if (customerProfile && customerProfile.isReservationCompany) {
      return;
    }
    this.customerProfileFormGroup.reset();
    this.selectedDetailAccountId = null;
    this.departmentsList = [];
    this.newDepartmentNameAr = '';
    this.newDepartmentNameEn = '';
    if (customerProfile) {
      this.customerProfileFormGroup.controls.id.setValue(customerProfile.id);
      this.customerProfileFormGroup.controls.arabicName.setValue(customerProfile.arabicName);
      this.customerProfileFormGroup.controls.englishName.setValue(customerProfile.englishName);
      this.customerProfileFormGroup.controls.contactNumber.setValue(customerProfile.contactNumber);
      this.customerProfileFormGroup.controls.email.setValue(customerProfile.email);
      this.customerProfileFormGroup.controls.bankName.setValue(customerProfile.bankName);
      this.customerProfileFormGroup.controls.bankAccountNumber.setValue(customerProfile.bankAccountNumber);
      this.customerProfileFormGroup.controls.iban.setValue(customerProfile.iban);
      this.customerProfileFormGroup.controls.taxNumber.setValue(customerProfile.taxNumber);
      this.customerProfileFormGroup.controls.street.setValue(customerProfile.street);
      this.customerProfileFormGroup.controls.englishStreet.setValue(customerProfile.englishStreet);
      this.customerProfileFormGroup.controls.district.setValue(customerProfile.district);
      this.customerProfileFormGroup.controls.englishDistrict.setValue(customerProfile.englishDistrict);
      this.customerProfileFormGroup.controls.shortAddress.setValue(customerProfile.shortAddress);
      this.customerProfileFormGroup.controls.buildingNumber.setValue(customerProfile.buildingNumber);
      this.customerProfileFormGroup.controls.subNumber.setValue(customerProfile.subNumber);
      this.customerProfileFormGroup.controls.postalCode.setValue(customerProfile.postalCode);
      this.customerProfileFormGroup.controls.city.setValue(customerProfile.city);
      this.customerProfileFormGroup.controls.englishCity.setValue(customerProfile.englishCity);
      this.customerProfileFormGroup.controls.country.setValue(customerProfile.country);
      this.customerProfileFormGroup.controls.englishCountry.setValue(customerProfile.englishCountry);
      this.customerProfileFormGroup.controls.additionalContactNumber.setValue(customerProfile.additionalContactNumber);
      this.customerProfileFormGroup.controls.fax.setValue(customerProfile.fax);
      this.customerProfileFormGroup.controls.website.setValue(customerProfile.website);
      this.customerProfileFormGroup.controls.instructions.setValue(customerProfile.instructions);
      this.customerProfileFormGroup.controls.gaztNumber.setValue(customerProfile.gaztNumber);
      this.customerProfileFormGroup.controls.otherId.setValue(customerProfile.otherId);
      this.customerProfileFormGroup.controls.mainAccountId.setValue(customerProfile.mainAccountId);
      this.customerProfileFormGroup.controls.isFrontal.setValue(customerProfile.isFrontal);
      this.customerProfileFormGroup.controls.isForProjects.setValue(customerProfile.isForProjects || false);
      
      this.departmentsList = customerProfile.departments ? customerProfile.departments.map(d => ({ ...d })) : [];

      // Keep MainAccount dropdown populated in edit mode by resolving its parent DetailAccount.
      this.syncSelectedDetailAccountFromMainAccount(customerProfile.mainAccountId, customerProfile.mainAccount?.detailAccountId);
    } else {
      this.customerProfileFormGroup.controls.isForProjects.setValue(false);
    }
    this.customerProfileDialogVisible = true;
  }

  closeCustomerProfileDialog() {
    this.customerProfileDialogVisible = false;
    this.selectedDetailAccountId = null;
    this.departmentsList = [];
    this.newDepartmentNameAr = '';
    this.newDepartmentNameEn = '';
    this.customerProfileFormGroup.reset();
  }

  addDepartment() {
    if (!this.newDepartmentNameAr.trim()) return;
    this.departmentsList.push({
      nameAr: this.newDepartmentNameAr.trim(),
      nameEn: this.newDepartmentNameEn.trim() || null
    });
    this.newDepartmentNameAr = '';
    this.newDepartmentNameEn = '';
  }

  removeDepartment(index: number) {
    this.departmentsList.splice(index, 1);
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadCustomerProfilesLazy({ first: 0, rows: this.pageSize });
    }
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    if (this.useServerSearch) {
      this.searchSubject.next(target.value.trim());
    } else {
      dt1.filterGlobal(target.value, 'contains');
    }
  }

  saveCustomerProfile() {
    console.log('customer profile', this.customerProfileFormGroup.value)
    if (this.customerProfileFormGroup.invalid) {
      return;
    }
    const customerProfileValues = this.customerProfileFormGroup.value;
    if (customerProfileValues.id) {
      console.log('updating customer profile', customerProfileValues)
      const customerProfile = new CustomerProfileModel();
      customerProfile.id = customerProfileValues.id;
      customerProfile.arabicName = customerProfileValues.arabicName;
      customerProfile.englishName = customerProfileValues.englishName;
      customerProfile.contactNumber = customerProfileValues.contactNumber;
      customerProfile.email = customerProfileValues.email;
      customerProfile.bankName = customerProfileValues.bankName;
      customerProfile.bankAccountNumber = customerProfileValues.bankAccountNumber;
      customerProfile.iban = customerProfileValues.iban;
      customerProfile.taxNumber = customerProfileValues.taxNumber;
      customerProfile.street = customerProfileValues.street;
      customerProfile.englishStreet = customerProfileValues.englishStreet;
      customerProfile.district = customerProfileValues.district;
      customerProfile.englishDistrict = customerProfileValues.englishDistrict;
      customerProfile.shortAddress = customerProfileValues.shortAddress;
      customerProfile.buildingNumber = customerProfileValues.buildingNumber;
      customerProfile.subNumber = customerProfileValues.subNumber;
      customerProfile.postalCode = customerProfileValues.postalCode;
      customerProfile.city = customerProfileValues.city;
      customerProfile.englishCity = customerProfileValues.englishCity;
      customerProfile.country = customerProfileValues.country;
      customerProfile.englishCountry = customerProfileValues.englishCountry;
      customerProfile.additionalContactNumber = customerProfileValues.additionalContactNumber;
      customerProfile.fax = customerProfileValues.fax;
      customerProfile.website = customerProfileValues.website;
      customerProfile.instructions = customerProfileValues.instructions;
      customerProfile.gaztNumber = customerProfileValues.gaztNumber;
      customerProfile.otherId = customerProfileValues.otherId;
      customerProfile.mainAccountId = customerProfileValues.mainAccountId
      customerProfile.isFrontal = customerProfileValues.isFrontal;
      customerProfile.isForProjects = customerProfileValues.isForProjects;
      customerProfile.departments = this.departmentsList;
      this.customerProfileService.update(customerProfile).subscribe({
        next: res => {
          this.closeCustomerProfileDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILE_UPDATED') });
          this.loadCustomerProfiles();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_SAVING_ERROR') });
          this.closeCustomerProfileDialog();
        }
      });
    } else {
      const customerProfile = new CustomerProfileModel();
      customerProfile.arabicName = customerProfileValues.arabicName;
      customerProfile.englishName = customerProfileValues.englishName;
      customerProfile.contactNumber = customerProfileValues.contactNumber;
      customerProfile.email = customerProfileValues.email;
      customerProfile.bankName = customerProfileValues.bankName;
      customerProfile.bankAccountNumber = customerProfileValues.bankAccountNumber;
      customerProfile.iban = customerProfileValues.iban;
      customerProfile.taxNumber = customerProfileValues.taxNumber;
      customerProfile.street = customerProfileValues.street;
      customerProfile.englishStreet = customerProfileValues.englishStreet;
      customerProfile.district = customerProfileValues.district;
      customerProfile.englishDistrict = customerProfileValues.englishDistrict;
      customerProfile.shortAddress = customerProfileValues.shortAddress;
      customerProfile.buildingNumber = customerProfileValues.buildingNumber;
      customerProfile.subNumber = customerProfileValues.subNumber;
      customerProfile.postalCode = customerProfileValues.postalCode;
      customerProfile.city = customerProfileValues.city;
      customerProfile.englishCity = customerProfileValues.englishCity;
      customerProfile.country = customerProfileValues.country;
      customerProfile.englishCountry = customerProfileValues.englishCountry;
      customerProfile.additionalContactNumber = customerProfileValues.additionalContactNumber;
      customerProfile.fax = customerProfileValues.fax;
      customerProfile.website = customerProfileValues.website;
      customerProfile.instructions = customerProfileValues.instructions;
      customerProfile.gaztNumber = customerProfileValues.gaztNumber;
      customerProfile.otherId = customerProfileValues.otherId;
      customerProfile.mainAccountId = customerProfileValues.mainAccountId

      customerProfile.isFrontal = this.isFrontal;
      customerProfile.isForProjects = customerProfileValues.isForProjects;
      customerProfile.isReservationCompany = this.showReservationCompanies;
      customerProfile.departments = this.departmentsList;

      this.customerProfileService.create(customerProfile).subscribe({
        next: res => {
          console.log('Customer Profile Saved', res);
          this.closeCustomerProfileDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILE_CREATED') });
          this.loadCustomerProfiles();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('FINANCE.CUSTOMER_PROFILES_SAVING_ERROR');
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
        }
      });
    }
  }

  deleteCustomerProfile(customerProfile: CustomerProfileModel) {
    this.customerProfileService.delete(customerProfile.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILE_DELETED') });
        this.loadCustomerProfiles();
      },
      error: error => {
        console.log('Error Deleting Customer Profile', error);
        const raw: string = typeof error?.error === 'string' ? error.error.trim() : '';
        let detail: string;

        // Detect "linked to Journal Entries" server error and translate it
        const linkedMatch = raw.match(/Cannot delete customer '(.+?)'\./);
        if (linkedMatch && raw.includes('Journal Entries')) {
          detail = this.translate.instant('FINANCE.CUSTOMER_PROFILE_LINKED_TO_JOURNAL', { name: linkedMatch[1] });
        } else if (raw) {
          detail = raw;
        } else {
          detail = this.translate.instant('FINANCE.CUSTOMER_PROFILES_DELETING_ERROR');
        }

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail,
          life: 8000,
        });
      }
    });
  }

  confirmCustomerProfileDeletion(event: Event, customerProfile: CustomerProfileModel) {
    if (customerProfile.isReservationCompany) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'لا يمكن حذف شركات الحجز من شاشة العملاء. يرجى الحذف من شاشة شركات الحجز.'
      });
      return;
    }
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_CUSTOMER_PROFILE_DELETE', { customerProfileName: customerProfile.arabicName }),
      header: this.translate.instant('FINANCE.CUSTOMER_PROFILE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteCustomerProfile(customerProfile);
      },
    });
  }

  exportExcel() {
    import("xlsx").then((xlsx) => {
      const exportColumns = this.columns;
      const headerRow = exportColumns.map((c) => c.header);
      const dataRows = (this.customerProfiles || []).map((row) => {
        return exportColumns.map((col) => {
          if (col.filterType === 'date') {
            const value = row[col.field];
            if (!value) return '';
            return new Date(value).toLocaleString('ar-SA-u-ca-gregory', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          return row[col.field] ?? '';
        });
      });
      const worksheet = xlsx.utils.aoa_to_sheet([headerRow, ...dataRows]);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'CustomerProfiles');
    });
  }
  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION);
  }

  // ─── Excel Import (server-side) ────────────────────────────────────────────
  // The file is sent directly to POST /api/accounting/customerProfile/import.
  // The server parses Excel, performs a bulk upsert in one transaction, and
  // returns { imported, updated, failed[] }. No client-side parsing needed.

  onImportFileSelect(event: any): void {
    const file: File = event?.files?.[0] || event?.target?.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      if (this.fileUpload?.nativeElement) this.fileUpload.nativeElement.value = '';
      return;
    }

    this.importProgressSignal.set({ current: 0, total: 1, isImporting: true });

    this.customerProfileService.importFromExcel(file).pipe(
      takeUntil(this.importDestroy$)
    ).subscribe({
      next: (result) => {
        this.importProgressSignal.set({ current: 0, total: 0, isImporting: false });
        if (this.fileUpload?.nativeElement) this.fileUpload.nativeElement.value = '';

        // Show summary toast
        const failCount = result.failed?.length ?? 0;
        const severity  = failCount > 0 && result.imported === 0 && result.updated === 0
          ? 'error' : failCount > 0 ? 'warn' : 'success';

        const summary = this.activeLanguage === 'ar'
          ? `مستورد: ${result.imported} — محدّث: ${result.updated} — فشل: ${failCount}`
          : `Imported: ${result.imported} — Updated: ${result.updated} — Failed: ${failCount}`;

        this.messageService.add({
          severity,
          summary: this.translate.instant(severity === 'success' ? 'FINANCE.SUCCESS' : 'FINANCE.WARNING'),
          detail: summary,
          life: 8000,
          styleClass: `import-toast import-toast--${severity}`,
        });

        // Show failure details dialog if any rows failed
        if (failCount > 0) {
          this.importFailures = result.failed;
          this.showImportFailuresDialog = true;
        }

        this.loadCustomerProfiles();
      },
      error: (err) => {
        this.importProgressSignal.set({ current: 0, total: 0, isImporting: false });
        if (this.fileUpload?.nativeElement) this.fileUpload.nativeElement.value = '';
        console.error('Import error', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
          styleClass: 'import-toast import-toast--error',
        });
      }
    });
  }

  // ── NEW state for import failures dialog ─────────────────────────────────
  importFailures: CustomerProfileImportFailure[] = [];
  showImportFailuresDialog = false;

  getImportFailureReason(failure: CustomerProfileImportFailure): string {
    return formatImportErrorMessage(this.translate, failure);
  }

  getImportFailureReasonPreview(failure: CustomerProfileImportFailure, maxLength = 120): string {
    const reason = this.getImportFailureReason(failure);
    if (reason.length <= maxLength) {
      return reason;
    }

    return `${reason.substring(0, maxLength - 3)}...`;
  }

  isImportFailureReasonTruncated(failure: CustomerProfileImportFailure, maxLength = 120): boolean {
    return this.getImportFailureReason(failure).length > maxLength;
  }

  getImportFailureVisualState(failure: CustomerProfileImportFailure): { icon: string; chipClass: string } {
    const normalizedCode = (failure.errorCode ?? '')
      .replace(/^IMPORT_ERROR_/i, '')
      .toUpperCase();

    switch (normalizedCode) {
      case 'DUPLICATE_NAME':
        return { icon: 'pi pi-copy', chipClass: 'failure-chip failure-chip--warning' };
      case 'MISSING_REQUIRED_FIELD':
        return { icon: 'pi pi-exclamation-circle', chipClass: 'failure-chip failure-chip--warning' };
      case 'INVALID_FORMAT':
        return { icon: 'pi pi-ban', chipClass: 'failure-chip failure-chip--danger' };
      case 'DATABASE_CONSTRAINT':
        return { icon: 'pi pi-database', chipClass: 'failure-chip failure-chip--danger' };
      case 'TRANSACTION_FAILED':
        return { icon: 'pi pi-times-circle', chipClass: 'failure-chip failure-chip--danger' };
      default:
        return { icon: 'pi pi-info-circle', chipClass: 'failure-chip failure-chip--neutral' };
    }
  }

  // ── Import instructions dialog ────────────────────────────────────────────
  showImportInstructionsDialog() {
    this.showImportInstructions = true;
  }

  confirmImportInstructions() {
    this.showImportInstructions = false;
    if (this.fileUpload?.nativeElement) this.fileUpload.nativeElement.click();
  }

  downloadTemplate() {
    this.customerProfileService.downloadTemplate().subscribe({
      next: (blob) => FileSaver.saveAs(blob, 'customers_import_template.xlsx'),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
        });
      },
    });
  }

  cancelImportInstructions() {
    this.showImportInstructions = false;
  }

  // Bulk delete handlers
  confirmBulkDeletion(event: Event) {
    if (!this.selectedCustomers.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: this.translate.instant('COMMON.NO_ITEMS_SELECTED'),
      });
      return;
    }

    const hasReservationCompany = this.selectedCustomers.some(c => c.isReservationCompany);
    if (hasReservationCompany) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'تحتوي التحديدات على عملاء حجز. لا يمكن حذف عملاء الحجز من هنا.'
      });
      return;
    }

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('COMMON.CONFIRM_BULK_DELETE', { count: this.selectedCustomers.length }),
      header: this.translate.instant('COMMON.BULK_DELETE_CONFIRMATION'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.handleBulkDelete();
      },
    });
  }

  ngOnDestroy(): void {
    this.importDestroy$.next();
    this.importDestroy$.complete();
    this.searchSub?.unsubscribe();
  }

  loadAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: (res) => {
        this.detailAccounts = res;
        // If dialog is open with an existing MainAccountId, resolve its parent detail account
        // after accounts are loaded so dropdown options can render selected label.
        const currentMainAccountId = this.customerProfileFormGroup?.controls?.mainAccountId?.value;
        this.syncSelectedDetailAccountFromMainAccount(currentMainAccountId);
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DE')
        })
    });
  }

  getMainAccountName(id: string) {
    const customer = this.customerProfiles.find(o => o.id === id);
    if (!customer) return 'لم يتم الربط';

    const linkedMainAccount =
      customer.mainAccount ??
      this.findMainAccountById(customer.mainAccountId);

    if (!linkedMainAccount) return 'لم يتم الربط';

    return this.activeLanguage === 'en'
      ? linkedMainAccount.englishName
      : linkedMainAccount.arabicName;
  }

  private syncSelectedDetailAccountFromMainAccount(mainAccountId?: string, fallbackDetailAccountId?: string): void {
    if (!mainAccountId) {
      return;
    }

    if (fallbackDetailAccountId) {
      this.selectedDetailAccountId = fallbackDetailAccountId;
      return;
    }

    const linkedMainAccount = this.findMainAccountById(mainAccountId);
    if (linkedMainAccount?.detailAccountId) {
      this.selectedDetailAccountId = linkedMainAccount.detailAccountId;
    }
  }

  private findMainAccountById(mainAccountId?: string): MainAccountModel | null {
    if (!mainAccountId || !this.detailAccounts?.length) {
      return null;
    }

    for (const detailAccount of this.detailAccounts) {
      const account = detailAccount.mainAccounts?.find(ma => ma.id === mainAccountId);
      if (account) {
        return account;
      }
    }

    return null;
  }

  sendToFrontal(customer: CustomerProfileModel) {
    if (customer.isReservationCompany) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'لا يمكن إرسال شركات الحجز إلى الفرونتال.'
      });
      return;
    }
    this.customerProfileService.makeFrontal(customer.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: 'تم إرسال ملف العميل إلى الجهة الأمامية بنجاح'
        });
        this.loadCustomerProfiles();
      },
      error: (error) => {
        console.error('Error making customer profile frontal:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: 'حدث خطأ أثناء إرسال ملف العميل إلى الجهة الأمامية'
        });
      }
    });
  }

  selectedCustomerForOverlay: CustomerProfileModel = null;

  @ViewChild('opCustomerProfile') opCustomerProfile!: OverlayPanel;
  @ViewChild('overlayAnchor') overlayAnchor!: ElementRef;

  showOverlay(event: MouseEvent, entry: CustomerProfileModel) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedCustomerForOverlay = entry;

    const anchorEl = this.overlayAnchor.nativeElement as HTMLElement;
    anchorEl.style.left = `${event.clientX}px`;
    anchorEl.style.top = `${event.clientY}px`;
    anchorEl.style.position = 'fixed';

    if (this.opCustomerProfile.overlayVisible) {
      this.opCustomerProfile.hide();
      setTimeout(() => this.opCustomerProfile.show(event, anchorEl), 0);
    } else {
      this.opCustomerProfile.show(event, anchorEl);
    }
  }

  onCogClick(event: MouseEvent, entry: CustomerProfileModel) {
    event.stopPropagation();
    this.showOverlay(event, entry);
  }

  handleBulkDelete() {
    const toDelete = [...this.selectedCustomers];
    const results = { deleted: 0, failed: 0 };

    from(toDelete).pipe(
      mergeMap((customer) =>
        this.customerProfileService.delete(customer.id).pipe(
          catchError((error) => {
            console.error(`Error deleting customer ${customer.arabicName}:`, error);
            results.failed += 1;
            return of(null); // continue with the rest
          })
        ),
        5 // process 5 deletions concurrently
      )
    ).subscribe({
      next: (res) => {
        if (res !== null) {
          results.deleted += 1;
        }
      },
      complete: () => {
        this.selectedCustomers = [];
        this.loadCustomerProfiles();

        if (results.failed === 0) {
          // All deleted successfully
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('COMMON.BULK_DELETE_SUCCESS', { count: results.deleted }),
          });
        } else if (results.deleted === 0) {
          // All failed
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('COMMON.BULK_DELETE_ERROR'),
          });
        } else {
          // Partial success
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING'),
            detail: `${this.translate.instant('COMMON.BULK_DELETE_SUCCESS', { count: results.deleted })} - ${this.translate.instant('COMMON.BULK_DELETE_PARTIAL_FAIL', { count: results.failed })}`,
            life: 6000,
          });
        }
      },
      error: (err) => {
        console.error('Bulk delete pipeline error:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.BULK_DELETE_ERROR'),
        });
      }
    });
  }
}
