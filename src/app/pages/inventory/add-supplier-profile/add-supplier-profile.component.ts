import { Component, LOCALE_ID, OnInit, signal } from '@angular/core';
import { SupplierDetailsModel } from "../../../models/inventory/supplierDetails.model";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { MessageService, PrimeNGConfig } from "primeng/api";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { SupplierDetailsService } from "../../../services/inventory/supplier-details.service";
import primengArTranslations from "../../../utils/primengArTranslations";
import { MainAccountService } from "../../../services/accounting/main-account.service";
import { MainAccountModel } from "../../../models/accounting/mainAccount.model";
import { DetailAccountService } from "../../../services/accounting/detail-account.service";
import { DetailAccountModel } from "../../../models/accounting/detailAccount.model";
import { TranslationService } from "../../../modules/i18n";
import { SupplierStatusService } from "../../../services/inventory/supplier-status.service";
import { SupplierStatusModel } from "../../../models/inventory/supplierStatus.model";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { PanelModule } from 'primeng/panel';
import { ToastModule } from 'primeng/toast';
import { TranslateModule } from '@ngx-translate/core';
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../../config/permissions';

@Component({
  selector: 'app-add-supplier-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    MultiSelectModule,
    PanelModule,
    ToastModule,
    TranslateModule,
    BackButtonComponent
  ],
  providers: [MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],
  templateUrl: './add-supplier-profile.component.html',
  styleUrl: './add-supplier-profile.component.scss',
})
export class AddSupplierProfileComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  mainAccountsSignal = signal<MainAccountModel[]>([])
  get mainAccounts(): MainAccountModel[] {
    return this.mainAccountsSignal()
  }
  set mainAccounts(value: MainAccountModel[]) {
    this.mainAccountsSignal.set(value)
  }

  detailAccountsSignal = signal<DetailAccountModel[]>([])
  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal()
  }
  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value)
  }

  selectedDetailAccountIdSignal = signal<string>(null)
  get selectedDetailAccountId(): string {
    return this.selectedDetailAccountIdSignal()
  }
  set selectedDetailAccountId(value: string) {
    const current = this.selectedDetailAccountIdSignal();
    this.selectedDetailAccountIdSignal.set(value);
    // When the parent group changes, clear an account that no longer belongs to it
    if (current !== value && this.supplierProfileFormGroup) {
      const mainAccountId = this.supplierProfileFormGroup.controls.mainAccountId.value;
      if (mainAccountId && !this.accountBelongsToGroup(mainAccountId, value)) {
        this.supplierProfileFormGroup.controls.mainAccountId.setValue(null);
      }
    }
  }

  // An account belongs to a group if it is in that group's nested mainAccounts list
  // (mainAccount.getAll() is paginated at 50 rows, so the nested list is the reliable source).
  private accountBelongsToGroup(mainAccountId: string, detailAccountId: string): boolean {
    const detailAccount = this.detailAccounts.find(da => da.id === detailAccountId);
    if (!detailAccount) return false;
    return (detailAccount.mainAccounts || []).some(ma => ma.id === mainAccountId);
  }

  supplierStatusSignal = signal<SupplierStatusModel[]>([])
  get supplierStatus(): SupplierStatusModel[] {
    return this.supplierStatusSignal()
  }
  set supplierStatus(value: SupplierStatusModel[]) {
    this.supplierStatusSignal.set(value)
  }

  countries: string[] = [
    'المملكة العربية السعودية', 'جمهورية مصر العربية', 'السودان', 'اليمن', 'الأردن', 'سوريا', 'لبنان', 'فلسطين',
    'العراق', 'الكويت', 'الإمارات العربية المتحدة', 'قطر', 'البحرين', 'سلطنة عمان', 'ليبيا', 'تونس',
    'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جيبوتي', 'جزر القمر',
    'ماليزيا', 'إندونيسيا', 'كوسوفو', 'تركيا', 'باكستان', 'بنجلاديش', 'الهند',
    'أفغانستان', 'ألبانيا', 'البوسنة والهرسك', 'تنزانيا', 'نيجيريا', 'السنغال', 'كينيا',
    'أوغندا', 'غانا', 'تشاد', 'مالي', 'النيجر', 'أفريقيا'
  ];

  get countryOptions() {
    return this.countries.map(c => ({
      label: c,
      value: c
    }));
  }

  get mainAccountOptions() {
    if (!this.selectedDetailAccountId) return [];
    // Resolve the selected group's FULL nested account list (customer-profile pattern) —
    // mainAccount.getAll() is paginated at 50 rows and misses most groups' accounts.
    const detailAccount = this.detailAccounts.find(da => da.id === this.selectedDetailAccountId);
    if (!detailAccount) return [];
    return (detailAccount.mainAccounts || []).map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == "en" ? ma.englishName : ma.arabicName
    }))
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == "en" ? da.englishName : da.arabicName
    }))
  }

  get supplierStatusOptions() {
    return this.supplierStatus.map((ss) => ({
      value: ss.id,
      label: `${ss.englishName}  | ${ss.arabicName}`
    }))
  }

  supplierProfileFormGroup: FormGroup;
  supplierId: string | null = null;
  public activeLanguage: string = 'en';
  public translate: TranslateService;
  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private messageService: MessageService,
    translateService: TranslateService,
    public translationService: TranslationService,
    public supplierDetailsService: SupplierDetailsService,
    public mainAccountService: MainAccountService,
    public detailAccountService: DetailAccountService,
    public supplierStatusService: SupplierStatusService,
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');

    this.supplierProfileFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: [''],
      contactNumber: ['', [Validators.pattern(/^[0-9]*$/)]],
      email: ['', Validators.email],
      bankName: [''],
      bankAccountNumber: [''],
      iban: [''],
      taxNumber: [''],
      street: [''],
      district: [''],
      city: [''],
      country: [''],
      countriesList: [[]],
      shortAddress: [''],
      buildingNumber: [''],
      additionalContactNumber: [''],
      zipCode: [''],
      fax: [''],
      website: [''],
      instructions: [''],
      gaztNumber: [''],
      otherId: [''],
      mainAccountId: [null],
      supplierStatusId: [null],
      isFrontal: [this.isFrontal],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
  }

  ngOnInit(): void {
    this.loadMainAccounts();
    this.loadSupplierStatus();

    const supplierId = this.route.snapshot.paramMap.get('id');
    if (supplierId) {
      this.loadSupplierForEdit(supplierId);
    }

    this.loadDetailAccounts();
  }

  loadDetailAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: (res) => {
        this.detailAccounts = res;
        // Re-sync the parent group once groups are loaded (edit mode depends on this)
        this.syncSelectedDetailAccount();
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ERROR') })
    })
  }

  loadSupplierForEdit(id: string) {
    this.supplierId = id;
    this.supplierDetailsService.getById(id).subscribe({
      next: (supplier) => {
        const values: any = {};
        ['arabicName','englishName','contactNumber','email','bankName','bankAccountNumber','iban','taxNumber','street','district','city','country','shortAddress','buildingNumber','additionalContactNumber','zipCode','fax','website','instructions','gaztNumber','otherId','supplierStatusId','mainAccountId','isFrontal'].forEach(field => {
          if (supplier[field] !== undefined && this.supplierProfileFormGroup.controls[field]) {
            values[field] = supplier[field];
          }
        });
        values.id = supplier.id;
        this.supplierProfileFormGroup.patchValue(values);
        this.syncSelectedDetailAccount();
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ERROR') })
    })
  }

  // Resolves the parent group: from the saved account (edit mode) or «دائنون» (new supplier)
  private syncSelectedDetailAccount() {
    const mainAccountId = this.supplierProfileFormGroup?.controls?.mainAccountId?.value;
    if (mainAccountId) {
      const account = this.findAccountById(mainAccountId);
      if (account?.detailAccountId) {
        this.selectedDetailAccountIdSignal.set(account.detailAccountId);
        return;
      }
    }
    if (this.supplierId) {
      // Edit mode without a linked account (legacy supplier): no group default
      return;
    }
    if (!this.selectedDetailAccountId) {
      // New supplier only: default the parent group to «دائنون» (backend auto-create fallback group)
      const creditors = this.detailAccounts.find(da => da.arabicName === 'دائنون');
      if (creditors) {
        this.selectedDetailAccountIdSignal.set(creditors.id);
      }
    }
  }

  // Finds an account across the groups' nested mainAccounts first (full data), then the
  // paginated mainAccount.getAll() list as a fallback.
  private findAccountById(mainAccountId: string): MainAccountModel | null {
    for (const da of this.detailAccounts) {
      const account = (da.mainAccounts || []).find(ma => ma.id === mainAccountId);
      if (account) return account;
    }
    return this.mainAccounts.find(ma => ma.id === mainAccountId) ?? null;
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: (res) => {
        this.mainAccounts = res;
        // Re-sync the parent group once accounts are loaded so edit mode always
        // pre-selects the saved account (avoids the async race with getById)
        this.syncSelectedDetailAccount();
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ERROR') })
    })
  }

  loadSupplierStatus() {
    this.supplierStatusService.getAll().subscribe({
      next: (res) => {
        this.supplierStatus = res
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ERROR') })
    })
  }

  saveSupplierProfile() {
    if (this.supplierProfileFormGroup.invalid) {
      return;
    }
    const supplierProfileValues = this.supplierProfileFormGroup.value;
    const selectedCountries: string[] = supplierProfileValues.countriesList || [];
    
    // Check if selected all countries or explicit "جميع الدول"
    if (selectedCountries.includes('جميع الدول') || selectedCountries.length === this.countries.length) {
      supplierProfileValues.country = 'جميع الدول';
    } else if (selectedCountries.length > 0) {
      supplierProfileValues.country = selectedCountries.filter(c => c !== 'جميع الدول').join(' - ');
    } else {
      supplierProfileValues.country = supplierProfileValues.country || '';
    }

    const supplierDetails = new SupplierDetailsModel();
    Object.assign(supplierDetails, supplierProfileValues);
    const countryStr = supplierProfileValues.country || '';
    const streetStr = supplierProfileValues.street || '';
    const cityStr = supplierProfileValues.city || '';
    const zipStr = supplierProfileValues.zipCode || '';
    
    supplierDetails.address = `${streetStr}, ${cityStr}, ${countryStr}, ${zipStr}`;
    supplierDetails.country = countryStr;
    supplierDetails.isFrontal = this.isFrontal;

    if (!supplierDetails.validate()) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ERROR') });
      return;
    }

    if (supplierDetails.id) {
      // Edit mode: update (legacy suppliers keep mainAccountId null unless the user selects an account)
      this.supplierDetailsService.update(supplierDetails).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_SUCCESS') });
          this.router.navigate(['/inventory/supplier-details']);
        },
        error: error => {
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR');
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
        }
      });
    } else {
      this.supplierDetailsService.create(supplierDetails).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_SUCCESS') });
          this.router.navigate(['/inventory/supplier-details']);
        },
        error: error => {
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR');
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/inventory/supplier-details']);
  }
}
