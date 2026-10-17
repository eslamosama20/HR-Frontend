import { Component, LOCALE_ID, OnInit, signal } from '@angular/core';
import { CustomerProfileModel } from "../../../../models/accounting/customerProfile.model";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { MessageService, PrimeNGConfig } from "primeng/api";
import { Router } from '@angular/router';
import { CustomerProfileService } from "../../../../services/accounting/customer-profile.service";
import primengArTranslations from "../../../../utils/primengArTranslations";
import { DetailAccountService } from "../../../../services/accounting/detail-account.service";
import { DetailAccountModel } from "../../../../models/accounting/detailAccount.model";
import { TranslationService } from "../../../../modules/i18n";

@Component({
  selector: 'app-add-customer-profile',
  templateUrl: './add-customer-profile.component.html',
  styleUrl: './add-customer-profile.component.scss',
  providers: [MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class AddCustomerProfileComponent implements OnInit {
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

  customerProfileFormGroup: FormGroup;
  departmentsList: any[] = [];
  newDepartmentNameAr: string = '';
  newDepartmentNameEn: string = '';
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
    private translateService: TranslateService,
    public translationService: TranslationService,
    public customerProfileService: CustomerProfileService,
    public detailAccountService: DetailAccountService,
    private router: Router,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');

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
  }

  ngOnInit(): void {
    this.loadAccounts()
  }

  loadAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: (res) => {
        console.log(res)
        this.detailAccounts = res
      },
      error: () =>
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.DE') })
    })
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

  saveCustomerProfile() {
    console.log('customer profile', this.customerProfileFormGroup.value)
    if (this.customerProfileFormGroup.invalid) {
      return;
    }
    const customerProfileValues = this.customerProfileFormGroup.value;
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
    customerProfile.departments = this.departmentsList;

    this.customerProfileService.create(customerProfile).subscribe({
      next: res => {
        console.log('Customer Profile Saved', res);
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILE_CREATED') });
        this.router.navigate(['/accounting/customer-profile']);
      },
      error: error => {
        console.log('Error Saving Customer Profile', error);
        const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('FINANCE.CUSTOMER_PROFILES_SAVING_ERROR');
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
      }
    });
  }

  cancel() {
    this.router.navigate(['/accounting/customer-profile']);
  }
}
