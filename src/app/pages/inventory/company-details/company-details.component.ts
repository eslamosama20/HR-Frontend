import {Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {CommonModule} from "@angular/common";
import {CompanyDetailsModel} from "../../../models/inventory/companyDetails.model";
import {CompanyPhoneModel} from "../../../models/inventory/companyPhone.model";
import {BankAccountModel} from "../../../models/inventory/bankAccount.model";
import {CompanyPolicyModel} from "../../../models/inventory/companyPolicy.model";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {FormConfig} from "../../../shared-components/entity-manager/common/form-config";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, FormArray} from '@angular/forms';
import {TableActions} from "../../../shared-components/entity-manager/common/table-action";
import {CompanyStatusService} from "../../../services/inventory/company-status.service";
import {CompanyStatusModel} from "../../../models/inventory/companyStatus.model";
import {formatDateToUTCString} from "../../../utils/dateUtils";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {InputSwitchChangeEvent, InputSwitchModule} from "primeng/inputswitch";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {ToastModule} from "primeng/toast";
import {InputNumberModule} from "primeng/inputnumber";
import {Button} from "primeng/button";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {DropdownChangeEvent, DropdownModule} from "primeng/dropdown";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import {OverlayPanelModule} from "primeng/overlaypanel";
import {Table, TableModule} from "primeng/table";
import {PermissionModel} from "../../../models/auth/permission.model";
import {AuthService} from "../../../modules/auth";
import {DetailAccountService} from "../../../services/accounting/detail-account.service";
import {MainAccountService} from "../../../services/accounting/main-account.service";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {MainAccountModel} from "../../../models/accounting/mainAccount.model";
import * as FileSaver from 'file-saver';
import {FileUpload, FileUploadModule} from "primeng/fileupload";
import {CheckboxModule} from "primeng/checkbox";
import { OverlayPanel } from 'primeng/overlaypanel';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [CommonModule, InputSwitchModule, FormsModule, ToastModule, Button, DialogModule, InputTextModule, InputNumberModule, DropdownModule, ConfirmDialogModule, CustomDatePipe, OverlayPanelModule, ReactiveFormsModule, TableModule, TranslateModule, FileUploadModule, CheckboxModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  // فتح شاشة عرض/تعديل الشركة عند الضغط على الصف (مع تجاهل الضغط على زر الإعدادات)
  onRowClick(event: MouseEvent, entry: any) {
    const target = event.target as HTMLElement;
    if (target.closest('p-button') || target.closest('.pi-cog')) {
      return;
    }
    this.showAddCustomerProfileDialog(entry);
  }
  @ViewChild('fileUploader') fileUploader!: FileUpload;
  @ViewChild('stampFileUploader') stampFileUploader!: FileUpload;

  zatcaIntegratedSignal = signal(false);
  get zatcaIntegrated() {
    return this.zatcaIntegratedSignal();
  }
  set zatcaIntegrated(value: boolean) {
    this.zatcaIntegratedSignal.set(value);
  }


  toggleIntegrateZatca(event: InputSwitchChangeEvent) {
    this.zatcaIntegrated = event.checked;
    this.companyDetailFormGroup.controls.isZatcaIntegrated.setValue(event.checked);
    const id = this.companyDetails[0]?.id;

    this.companyDetailsService.toggleZatcaIntegration(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: event.checked ? 'تم تفعيل الربط مع هيئة Zatca' : 'تم الغاء تفعيل الربط مع هيئة Zatca'
        })
      },
      error: () => {
        this.zatcaIntegrated = !event.checked;
        this.companyDetailFormGroup.controls.isZatcaIntegrated.setValue(this.zatcaIntegrated);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ اثناء تفعيل الربط مع Zatca'
        });
      }
    });
  }

  get companyDetailsOptions(): Array<{ label: string, value: string }> {
    return this.companyDetails.map(x => ({
      label: this.activeLanguage === 'en' ? `${x.englishName}` : `${x.arabicName}`,
      value: x.id
    }))
  }

  companyDetailsSignal = signal<any[]>([]);
  get companyDetails() {
    return this.companyDetailsSignal();
  }
  set companyDetails(value) {
    this.companyDetailsSignal.set(value);
  }
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  searchSubject = new Subject<string>();
  searchSub?: Subscription;
  totalRecords = 0;
  pageSize = 10;
  private destroy$ = new Subject<void>();
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  companyDetailDialogVisibleSignal = signal(false);
  get companyDetailDialogVisible() {
    return this.companyDetailDialogVisibleSignal();
  }
  set companyDetailDialogVisible(value) {
    this.companyDetailDialogVisibleSignal.set(value);
  }

  mainAccountOptionsSignal = signal(null);
  get mainAccountOptions() {
    return this.mainAccountOptionsSignal();
  }
  set mainAccountOptions(value) {
    this.mainAccountOptionsSignal.set(value);
  }
  companyDetailFormGroup: FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public companyDetailsService: CompanyDetailsService,
    public detailAccountService: DetailAccountService,
    public mainAccountService: MainAccountService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.companyDetailFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      street: [''],
      city: [''],
      country: [''],
      zipCode: ['', [Validators.pattern(/^[0-9]+$/)]], // Only numbers allowed
      arabicStreet: [''],
      arabicCity: [''],
      arabicCountry: [''],
      arabicZipCode: [''],
      shortAddress: [''],
      buildingNumber: [''],
      subNumber: [''],
      district: [''],
      englishDistrict: [''],
      email: ['', this.emailValidator],
      isZatcaIntegrated: [false],
      phones: this.fb.array([]),
      bankAccounts: this.fb.array([]),
      policies: this.fb.array([]),
      taxNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]], // Required and only numbers allowed
      gaztNumber: ['', [Validators.pattern(/^[0-9]+$/)]], // Only numbers allowed
      businessCategory: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]+$/)]],
      isOnBoarded: [false],
      logo: [''],
      stamp: [''],
      website: [''],
      unifiedNumber: [''],
      registrationNumber: [''],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'logo', header: this.translate.instant('FINANCE.LOGO')},
      { field: 'isOnBoarded', header: "تم الربط", filter: true, filterType: 'boolean' },
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'email', header: this.translate.instant('FINANCE.EMAIL'), filter: true, filterType: 'text' },
      { field: 'phones', header: this.translate.instant('FINANCE.PHONES'), filter: false },
      { field: 'bankAccounts', header: this.translate.instant('FINANCE.BANK_ACCOUNTS'), filter: false },
      { field: 'taxNumber', header: this.translate.instant('FINANCE.TAX_NUMBER'), filter: true, filterType: 'text' },
      { field: 'businessCategory', header: this.translate.instant('FINANCE.BUSINESS_CATEGORY'), filter: true, filterType: 'text' },
      { field: 'street', header: this.translate.instant('FINANCE.STREET'), filter: true, filterType: 'text' },
      { field: 'city', header: this.translate.instant('FINANCE.CITY'), filter: true, filterType: 'text' },
      { field: 'country', header: this.translate.instant('FINANCE.COUNTRY'), filter: true, filterType: 'text' },
      { field: 'zipCode', header: this.translate.instant('FINANCE.ZIP_CODE'), filter: true, filterType: 'text' },
      { field: 'website', header: this.translate.instant('FINANCE.WEBSITE'), filter: true, filterType: 'text' },
      { field: 'unifiedNumber', header: this.translate.instant('FINANCE.UNIFIED_NUMBER'), filter: true, filterType: 'text' },
      { field: 'registrationNumber', header: this.translate.instant('FINANCE.REGISTRATION_NUMBER'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' },
      { field: 'stamp', header: this.translate.instant('FINANCE.STAMP')}
    ];
  }

  ngOnInit(): void {
    this.loadCompanyDetails();

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.loadCompanyDetailsLazy({ first: 0, rows: this.pageSize, filters: { global: { value: query } } });
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
  emailValidator(control: any) {
    if (!control.value || control.value.trim() === '') {
      return null; // No validation error if empty
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(control.value) ? null : { email: true };
  }

  get phonesFormArray(): FormArray {
    return this.companyDetailFormGroup.get('phones') as FormArray;
  }

  get bankAccountsFormArray(): FormArray {
    return this.companyDetailFormGroup.get('bankAccounts') as FormArray;
  }

  get policiesFormArray(): FormArray {
    return this.companyDetailFormGroup.get('policies') as FormArray;
  }

  createPhoneFormGroup(phone?: CompanyPhoneModel): FormGroup {
    return this.fb.group({
      id: [phone?.id || null],
      phoneNumber: [phone?.phoneNumber || '', [
        Validators.pattern(/^[0-9]+$/) // Only numbers allowed
      ]],
      isPrimary: [phone?.isPrimary || false]
    });
  }

  createBankAccountFormGroup(account?: BankAccountModel): FormGroup {
    return this.fb.group({
      id: [account?.id || null],
      bankName: [account?.bankName || ''],
      bankAccountNumber: [account?.bankAccountNumber || '', [
        Validators.pattern(/^[0-9]+$/) // Only numbers allowed
      ]],
      accountName: [account?.accountName || ''],
      bankBranchName: [account?.bankBranchName || ''],
      swiftCode: [account?.swiftCode || ''],
      iban: [account?.iban || ''],
      isPrimary: [account?.isPrimary || false]
    });
  }

  createPolicyFormGroup(policy?: CompanyPolicyModel): FormGroup {
    return this.fb.group({
      id: [policy?.id || null],
      policyParagraph: [policy?.policyParagraph || ''],
      isPrimary: [policy?.isPrimary || false]
    });
  }

  addPhone(): void {
    this.phonesFormArray.push(this.createPhoneFormGroup());
  }

  removePhone(index: number): void {
    this.phonesFormArray.removeAt(index);
  }

  addBankAccount(): void {
    this.bankAccountsFormArray.push(this.createBankAccountFormGroup());
  }

  removeBankAccount(index: number): void {
    this.bankAccountsFormArray.removeAt(index);
  }

  addPolicy(): void {
    this.policiesFormArray.push(this.createPolicyFormGroup());
  }

  removePolicy(index: number): void {
    this.policiesFormArray.removeAt(index);
  }

  onPhonePrimaryChange(index: number): void {
    // Ensure only one primary phone
    if (this.phonesFormArray.at(index).get('isPrimary')?.value) {
      for (let i = 0; i < this.phonesFormArray.length; i++) {
        if (i !== index) {
          this.phonesFormArray.at(i).get('isPrimary')?.setValue(false);
        }
      }
    }
  }

  onBankAccountPrimaryChange(index: number): void {
    // Ensure only one primary bank account
    if (this.bankAccountsFormArray.at(index).get('isPrimary')?.value) {
      for (let i = 0; i < this.bankAccountsFormArray.length; i++) {
        if (i !== index) {
          this.bankAccountsFormArray.at(i).get('isPrimary')?.setValue(false);
        }
      }
    }
  }

  onPolicyPrimaryChange(index: number): void {
    // Ensure only one primary policy
    if (this.policiesFormArray.at(index).get('isPrimary')?.value) {
      for (let i = 0; i < this.policiesFormArray.length; i++) {
        if (i !== index) {
          this.policiesFormArray.at(i).get('isPrimary')?.setValue(false);
        }
      }
    }
  }

  loadCompanyDetailsLazy(event: any) {
    this.loading = true;
    const pageNumber = Math.floor((event?.first ?? 0) / (event?.rows ?? this.pageSize)) + 1;
    const pageSize = event?.rows ?? this.pageSize;
    this.pageSize = pageSize;

    const globalFilter = event?.filters?.['global']?.value || this.searchValue;

    this.companyDetailsService.searchPaged(globalFilter, pageNumber, pageSize).subscribe({
      next: res => {
        this.companyDetails = res.data.map(x => ({
          ...x,
          createdAt: new Date(x.createdAt),
        })).map(x => new CompanyDetailsModel(x));
        this.totalRecords = res.totalCount;
        this.zatcaIntegrated = this.companyDetails[0]?.isZatcaIntegrated;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.COMPANY_DETAILS_LOADING_ERROR')
        });
      }
    });
  }

  loadCompanyDetails() {
    this.loadCompanyDetailsLazy({ first: 0, rows: this.pageSize });
  }

  showAddCustomerProfileDialog(companyDetail: CompanyDetailsModel = null) {
    this.companyDetailFormGroup.reset();

    // Clear form arrays
    while (this.phonesFormArray.length !== 0) {
      this.phonesFormArray.removeAt(0);
    }
    while (this.bankAccountsFormArray.length !== 0) {
      this.bankAccountsFormArray.removeAt(0);
    }
    while (this.policiesFormArray.length !== 0) {
      this.policiesFormArray.removeAt(0);
    }

    const applyCompanyDetails = (details: CompanyDetailsModel) => {
      this.companyDetailFormGroup.controls.id.setValue(details.id);
      this.companyDetailFormGroup.controls.arabicName.setValue(details.arabicName);
      this.companyDetailFormGroup.controls.englishName.setValue(details.englishName);
      this.companyDetailFormGroup.controls.street.setValue(details.address?.street);
      this.companyDetailFormGroup.controls.city.setValue(details.address?.city);
      this.companyDetailFormGroup.controls.country.setValue(details.address?.country);
      this.companyDetailFormGroup.controls.zipCode.setValue(details.address?.zipCode);
      this.companyDetailFormGroup.controls.arabicStreet.setValue(details.arabicAddress?.street);
      this.companyDetailFormGroup.controls.arabicCity.setValue(details.arabicAddress?.city);
      this.companyDetailFormGroup.controls.arabicCountry.setValue(details.arabicAddress?.country);
      this.companyDetailFormGroup.controls.arabicZipCode.setValue(details.arabicAddress?.zipCode);
      this.companyDetailFormGroup.controls.shortAddress.setValue(details.shortAddress);
      this.companyDetailFormGroup.controls.buildingNumber.setValue(details.buildingNumber);
      this.companyDetailFormGroup.controls.subNumber.setValue(details.subNumber);
      this.companyDetailFormGroup.controls.district.setValue(details.district);
      this.companyDetailFormGroup.controls.englishDistrict.setValue(details.englishDistrict);
      this.companyDetailFormGroup.controls.email.setValue(details.email);
      this.companyDetailFormGroup.controls.isZatcaIntegrated.setValue(details.isZatcaIntegrated);
      this.companyDetailFormGroup.controls.taxNumber.setValue(details.taxNumber);
      this.companyDetailFormGroup.controls.gaztNumber.setValue(details.gaztNumber);
      this.companyDetailFormGroup.controls.businessCategory.setValue(details.businessCategory);
      this.companyDetailFormGroup.controls.isOnBoarded.setValue(details.isOnBoarded);
      this.companyDetailFormGroup.controls.logo.setValue(details.logoUrl || '');
      this.companyDetailFormGroup.controls.stamp.setValue(details.stampUrl || '');
      this.companyDetailFormGroup.controls.website.setValue(details.website);
      this.companyDetailFormGroup.controls.unifiedNumber.setValue(details.unifiedNumber);
      this.companyDetailFormGroup.controls.registrationNumber.setValue(details.registrationNumber);

      // Populate phones
      if (details.phones && details.phones.length > 0) {
        details.phones.forEach(phone => {
          this.phonesFormArray.push(this.createPhoneFormGroup(phone));
        });
      }

      // Populate bank accounts
      if (details.bankAccounts && details.bankAccounts.length > 0) {
        details.bankAccounts.forEach(account => {
          this.bankAccountsFormArray.push(this.createBankAccountFormGroup(account));
        });
      }

      // Populate policies
      if (details.policies && details.policies.length > 0) {
        details.policies.forEach(policy => {
          this.policiesFormArray.push(this.createPolicyFormGroup(policy));
        });
      }

      if (this.phonesFormArray.length === 0) {
        this.addPhone();
      }
      if (this.bankAccountsFormArray.length === 0) {
        this.addBankAccount();
      }
      if (this.policiesFormArray.length === 0) {
        this.addPolicy();
      }
    };

    if (companyDetail?.id) {
      this.companyDetailDialogVisible = true;
      this.companyDetailsService.getById(companyDetail.id).subscribe({
        next: fullCompanyDetails => applyCompanyDetails(fullCompanyDetails ?? companyDetail),
        error: () => applyCompanyDetails(companyDetail),
      });
      return;
    }

    // Add at least one empty form for each type if none exist
    if (this.phonesFormArray.length === 0) {
      this.addPhone();
    }
    if (this.bankAccountsFormArray.length === 0) {
      this.addBankAccount();
    }
    if (this.policiesFormArray.length === 0) {
      this.addPolicy();
    }

    this.companyDetailDialogVisible = true;
  }

  closeCompanyDetailsDialog() {
    this.companyDetailDialogVisible = false;
    this.companyDetailFormGroup.reset();

    // Clear form arrays
    while (this.phonesFormArray.length !== 0) {
      this.phonesFormArray.removeAt(0);
    }
    while (this.bankAccountsFormArray.length !== 0) {
      this.bankAccountsFormArray.removeAt(0);
    }
    while (this.policiesFormArray.length !== 0) {
      this.policiesFormArray.removeAt(0);
    }

    this.isFileUploading = false;
    this.isStampFileUploading = false;
    this.fileUploader.clear();
    this.stampFileUploader?.clear();
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    this.searchValue = trimmedValue;
    this.searchSubject.next(trimmedValue);
  }

  saveExpesnseCenter() {
    if (this.companyDetailFormGroup.invalid) {
      this.companyDetailFormGroup.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'يرجى إكمال جميع الحقول الإلزامية المطلوبة' });
      return;
    }

    // Optional validation removed - all fields are now optional except the main company fields
    const companyDetailValues = this.companyDetailFormGroup.value;
    if (companyDetailValues.id) {
      const companyDetail = new CompanyDetailsModel();
      companyDetail.id = companyDetailValues.id;
      companyDetail.arabicName = companyDetailValues.arabicName;
      companyDetail.englishName = companyDetailValues.englishName;
      companyDetail.street = companyDetailValues.street;
      companyDetail.city = companyDetailValues.city;
      companyDetail.country = companyDetailValues.country;
      companyDetail.zipCode = companyDetailValues.zipCode;
      companyDetail.address = `${companyDetailValues.street || ''}, ${companyDetailValues.city || ''}, ${companyDetailValues.country || ''}, ${companyDetailValues.zipCode || ''}`;
      companyDetail.arabicAddress = `${companyDetailValues.arabicStreet || ''}, ${companyDetailValues.arabicCity || ''}, ${companyDetailValues.arabicCountry || ''}, ${companyDetailValues.zipCode || ''}`;
      companyDetail.shortAddress = companyDetailValues.shortAddress;
      companyDetail.buildingNumber = companyDetailValues.buildingNumber;
      companyDetail.subNumber = companyDetailValues.subNumber;
      companyDetail.district = companyDetailValues.district;
      companyDetail.englishDistrict = companyDetailValues.englishDistrict;
      companyDetail.email = companyDetailValues.email;
      companyDetail.isZatcaIntegrated = companyDetailValues.isZatcaIntegrated;
      companyDetail.taxNumber = companyDetailValues.taxNumber;
      companyDetail.gaztNumber = companyDetailValues.gaztNumber;
      companyDetail.businessCategory = companyDetailValues.businessCategory;
      companyDetail.isOnBoarded = companyDetailValues.isOnBoarded;
      companyDetail.logoUrl = companyDetailValues.logo || null;
      companyDetail.stampUrl = companyDetailValues.stamp || null;
      companyDetail.website = companyDetailValues.website;
      companyDetail.unifiedNumber = companyDetailValues.unifiedNumber;
      companyDetail.registrationNumber = companyDetailValues.registrationNumber;

      // Map arrays
      companyDetail.phones = companyDetailValues.phones?.map((phone: any) => new CompanyPhoneModel(phone)) || [];
      companyDetail.bankAccounts = companyDetailValues.bankAccounts?.map((account: any) => new BankAccountModel(account)) || [];
      companyDetail.policies = companyDetailValues.policies?.map((policy: any) => new CompanyPolicyModel(policy)) || [];

      this.companyDetailsService.update(companyDetail).subscribe({
        next: res => {
          this.closeCompanyDetailsDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.COMPANY_DETAILS_UPDATED') });
          this.loadCompanyDetails();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.COMPANY_DETAILS_SAVING_ERROR') });
          this.closeCompanyDetailsDialog();
        }
      });
    } else {
      const companyDetail = new CompanyDetailsModel();
      companyDetail.arabicName = companyDetailValues.arabicName;
      companyDetail.englishName = companyDetailValues.englishName;
      companyDetail.street = companyDetailValues.street;
      companyDetail.city = companyDetailValues.city;
      companyDetail.country = companyDetailValues.country;
      companyDetail.zipCode = companyDetailValues.zipCode;
      companyDetail.address = `${companyDetailValues.street || ''}, ${companyDetailValues.city || ''}, ${companyDetailValues.country || ''}, ${companyDetailValues.zipCode || ''}`;
      companyDetail.arabicAddress = `${companyDetailValues.arabicStreet || ''}, ${companyDetailValues.arabicCity || ''}, ${companyDetailValues.arabicCountry || ''}, ${companyDetailValues.zipCode || ''}`;
      companyDetail.shortAddress = companyDetailValues.shortAddress;
      companyDetail.buildingNumber = companyDetailValues.buildingNumber;
      companyDetail.subNumber = companyDetailValues.subNumber;
      companyDetail.district = companyDetailValues.district;
      companyDetail.englishDistrict = companyDetailValues.englishDistrict;
      companyDetail.email = companyDetailValues.email;
      companyDetail.isZatcaIntegrated = companyDetailValues.isZatcaIntegrated;
      companyDetail.taxNumber = companyDetailValues.taxNumber;
      companyDetail.gaztNumber = companyDetailValues.gaztNumber;
      companyDetail.businessCategory = companyDetailValues.businessCategory;
      companyDetail.isOnBoarded = companyDetailValues.isOnBoarded;
      companyDetail.logoUrl = companyDetailValues.logo || null;
      companyDetail.stampUrl = companyDetailValues.stamp || null;
      companyDetail.website = companyDetailValues.website;
      companyDetail.unifiedNumber = companyDetailValues.unifiedNumber;
      companyDetail.registrationNumber = companyDetailValues.registrationNumber;

      // Map arrays
      companyDetail.phones = companyDetailValues.phones?.map((phone: any) => new CompanyPhoneModel(phone)) || [];
      companyDetail.bankAccounts = companyDetailValues.bankAccounts?.map((account: any) => new BankAccountModel(account)) || [];
      companyDetail.policies = companyDetailValues.policies?.map((policy: any) => new CompanyPolicyModel(policy)) || [];

      this.companyDetailsService.create(companyDetail).subscribe({
        next: res => {
          this.closeCompanyDetailsDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.COMPANY_DETAILS_CREATED') });
          this.loadCompanyDetails();
        },
        error: error => {
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('FINANCE.COMPANY_DETAILS_SAVING_ERROR');
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
        }
      });
    }
  }

  deleteCompanyDetails(companyDetail: CompanyDetailsModel) {
    this.companyDetailsService.delete(companyDetail.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.COMPANY_DETAILS_DELETED') });
        this.loadCompanyDetails();
      },
      error: error => {
        console.log('Error Deleting CompanyDetails', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.COMPANY_DETAILS_DELETING_ERROR') });
      }
    });
  }

  confirmCompanyDetailsDeletion(event: Event, companyDetail: CompanyDetailsModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_COMPANY_DETAILS_DELETE', { companyDetailsName: companyDetail.arabicName }),
      header: this.translate.instant('FINANCE.COMPANY_DETAILS_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteCompanyDetails(companyDetail);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.companyDetails.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.filterType === 'date') {
            // @ts-ignore
            row[x.detail] = new Date(y[x.field]).toLocaleString(
              'ar-SA-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else {
            // @ts-ignore
            row[x.detail] = y[x.field];
          }
        });
        return row;
      });
      console.log(data);
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'FinancePeriods');
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







  selectedCompanyDetailsIdSignal = signal<string>(null);
  get selectedCompanyDetailsId() {
    return this.selectedCompanyDetailsIdSignal();
  }
  set selectedCompanyDetailsId(value) {
    this.selectedCompanyDetailsIdSignal.set(value);
  }

  otpSignal = signal<string>(null);
  get otp() {
    return this.otpSignal();
  }
  set otp(value) {
    this.otpSignal.set(value);
  }

  zatcaIntegrationDialogVisibleSignal = signal(false);
  get zatcaIntegrationDialogVisible() {
    return this.zatcaIntegrationDialogVisibleSignal();
  }
  set zatcaIntegrationDialogVisible(value) {
    this.zatcaIntegrationDialogVisibleSignal.set(value);
  }
  showZatcaIntegrationDialog() {
    this.selectedCompanyDetailsId = null;
    this.otp = null;
    this.zatcaIntegrationDialogVisible = true;
  }

  closeZatcaIntegrationDialog() {
    this.zatcaIntegrationDialogVisible = false;
    this.selectedCompanyDetailsId = null;
    this.otp = null;
  }
  loadingSignal = signal(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value) {
    this.loadingSignal.set(value);
  }
  integrateZatca() {
    this.loading = true;
    const companyDetailsId = this.selectedCompanyDetailsId;
    console.log(companyDetailsId)
    const otp = this.otp;
    this.companyDetailsService.integrateZatca(companyDetailsId, otp).subscribe({
      next: element => {
        this.loadCompanyDetails();
        this.loading = false;

        this.closeZatcaIntegrationDialog();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'تم تفعيل الربط مع هيئة Zatca'
        })
      },
      error: error => {
        console.log('Error Integrating Zatca', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ اثتاء التفعيل'
        })
      }
    })
  }

  isFileUploadingSignal = signal(false);
  get isFileUploading() {
    return this.isFileUploadingSignal();
  }
  set isFileUploading(value) {
    this.isFileUploadingSignal.set(value);
  }

  isStampFileUploadingSignal = signal(false);
  get isStampFileUploading() {
    return this.isStampFileUploadingSignal();
  }
  set isStampFileUploading(value) {
    this.isStampFileUploadingSignal.set(value);
  }

  onFileSelected(event: any) {
    this.isFileUploading = true;
    const file = event.files?.[0];

    if (!file) {
      this.isFileUploading = false;
      return;
    }

    // Only image files allowed (jpeg, png)
    if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم، الرجاء اختيار صورة',
      });
      this.isFileUploading = false;
      return;
    }

    const companyDetailsId = this.companyDetailFormGroup.controls.id.value;
    const uploadRequest = companyDetailsId
      ? this.companyDetailsService.uploadLogo(companyDetailsId, file)
      : this.companyDetailsService.uploadLogoTemp(file);

    uploadRequest.subscribe({
      next: ({ url }) => {
        this.companyDetailFormGroup.controls.logo.setValue(url);
        this.isFileUploading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'تم تحميل الصورة بنجاح',
        });
        this.fileUploader.clear();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء رفع الملف',
        });
        this.isFileUploading = false;
      }
    });
  }

  onStampFileSelected(event: any) {
    this.isStampFileUploading = true;
    const file = event.files?.[0];

    if (!file) {
      this.isStampFileUploading = false;
      return;
    }

    // Only image files allowed (jpeg, png)
    if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم، الرجاء اختيار صورة',
      });
      this.isStampFileUploading = false;
      return;
    }

    const companyDetailsId = this.companyDetailFormGroup.controls.id.value;
    const uploadRequest = companyDetailsId
      ? this.companyDetailsService.uploadStamp(companyDetailsId, file)
      : this.companyDetailsService.uploadStampTemp(file);

    uploadRequest.subscribe({
      next: ({ url }) => {
        this.companyDetailFormGroup.controls.stamp.setValue(url);
        this.isStampFileUploading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'تم تحميل صورة الختم بنجاح',
        });
        this.stampFileUploader.clear();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء رفع الملف',
        });
        this.isStampFileUploading = false;
      }
    });
  }
  selectedCompanyDetail: any | null = null;

@ViewChild('opCustomerProfile') opCustomerProfile!: OverlayPanel;

showCompanyOverlay(event: MouseEvent, company: any) {
  event.preventDefault();  // تمنع القائمة الافتراضية للمتصفح
  
  event.stopPropagation();
  this.selectedCompanyDetail = company;

  // إنشاء عنصر وهمي لتحديد موقع OverlayPanel
  const fakeTarget = document.createElement('span');
  fakeTarget.style.position = 'absolute';
  fakeTarget.style.left = event.pageX + 10 + 'px';
  fakeTarget.style.top = event.pageY + 10 + 'px';
  document.body.appendChild(fakeTarget);

  if (this.opCustomerProfile.overlayVisible) {
    this.opCustomerProfile.hide();
    setTimeout(() => {
      this.opCustomerProfile.show(event, fakeTarget);
    }, 0);
  } else {
    this.opCustomerProfile.show(event, fakeTarget);
  }

  setTimeout(() => document.body.removeChild(fakeTarget), 0);
}

}
