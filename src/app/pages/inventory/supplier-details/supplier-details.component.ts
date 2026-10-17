import { Component, LOCALE_ID, OnInit, AfterViewInit, signal, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { EntityManagerModule } from "../../../shared-components/entity-manager/entity-manager.module";
import { CommonModule, DatePipe, registerLocaleData } from "@angular/common";
import { SupplierDetailsModel, parseSupplierAddress } from "../../../models/inventory/supplierDetails.model";
import { SupplierDetailsService } from "../../../services/inventory/supplier-details.service";
import { FormConfig } from "../../../shared-components/entity-manager/common/form-config";
import { Validators } from '@angular/forms';
import { TableActions } from "../../../shared-components/entity-manager/common/table-action";
import { SupplierStatusService } from "../../../services/inventory/supplier-status.service";
import { SupplierStatusModel } from "../../../models/inventory/supplierStatus.model";
import { Column } from "../../../shared-components/entity-manager/common/columns-config";
import { formatDateToUTCString, formatDateOnlyToString } from "../../../utils/dateUtils";
import { TranslateModule, TranslateService } from "@ngx-translate/core";

import localeArSa from '@angular/common/locales/ar-SA';
import { TranslationService } from "../../../modules/i18n";
import { MainAccountModel } from "../../../models/accounting/mainAccount.model";
import { MainAccountService } from "../../../services/accounting/main-account.service";
import { DetailAccountService } from "../../../services/accounting/detail-account.service";
import { DetailAccountModel } from "../../../models/accounting/detailAccount.model";
import { Route, Router } from "@angular/router";
import { ToastModule } from "primeng/toast";
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from "primeng/dialog";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { MessageService } from "primeng/api";
import { SupplierDetailsImportFailure, SupplierDetailsImportResult } from '../../../services/inventory/supplier-details.service';
import { formatImportErrorMessage } from '../../../shared/utils/import-error-message';
import * as FileSaver from 'file-saver';
import { EntityManagerComponent } from "../../../shared-components/entity-manager/entity-manager.component";
import { AuthService } from '../../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../../config/permissions';

registerLocaleData(localeArSa, 'ar-SA');

interface SupplierImportRow {
  arabicName: string;
  englishName: string;
  taxNumber?: string;
  contactNumber?: string;
  email?: string;
  bankName?: string;
  bankAccountNumber?: string;
  iban?: string;
  street?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  mainAccountId?: string;
  supplierStatusId?: string;
  supplierStatusName?: string;
}

@Component({
  selector: 'app-supplier-details',
  standalone: true,
  imports: [EntityManagerModule, CommonModule, ToastModule, DialogModule, TableModule, ButtonModule, ProgressSpinnerModule, TranslateModule],
  providers: [DatePipe, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],
  templateUrl: './supplier-details.component.html',
  styleUrl: './supplier-details.component.scss',
})
export class SupplierDetailsComponent implements OnInit {
  @ViewChild(EntityManagerComponent) entityManager!: EntityManagerComponent<any>;

  countries: string[] = [
    'المملكة العربية السعودية', 'جمهورية مصر العربية', 'السودان', 'اليمن', 'الأردن', 'سوريا', 'لبنان', 'فلسطين',
    'العراق', 'الكويت', 'الإمارات العربية المتحدة', 'قطر', 'البحرين', 'سلطنة عمان', 'ليبيا', 'تونس',
    'الجزائر', 'المغرب', 'موريتانيا', 'الصومال', 'جيبوتي', 'جزر القمر',
    'ماليزيا', 'إندونيسيا', 'كوسوفو', 'تركيا', 'باكستان', 'بنجلاديش', 'الهند',
    'أفغانستان', 'ألبانيا', 'البوسنة والهرسك', 'تنزانيا', 'نيجيريا', 'السنغال', 'كينيا',
    'أوغندا', 'غانا', 'تشاد', 'مالي', 'النيجر', 'أفريقيا'
  ];

  countryOptions = this.countries.map(c => ({
    label: c,
    value: c
  }));

  columns: Column<SupplierDetailsModel>[]
  entityName = "SupplierDetailsModel"
  formConfig: FormConfig
  actions: TableActions
  importConfig: {
    label?: string;
    accept?: string;
    onSelect: (file: File) => void;
    disabled?: boolean;
    downloadTemplate?: () => void;
    downloadTemplateLabel?: string;
    instructions?: {
      title?: string;
      description?: string;
      headers: string[];
      notes?: string[];
    };
  };
  get mainAccount() {
    return this.mainAccountSignal()
  }
  set mainAccount(mainAccount: MainAccountModel[]) {
    this.mainAccountSignal.set(mainAccount)
  }
  get mainAccountOptions() {
    // Follows the customer-profile pattern: MainAccounts come from the selected
    // DetailAccount's nested list — mainAccount.getAll() is paginated at 50 rows
    // and misses most groups' accounts, so the nested list is the reliable source.
    const detailAccountId = this.entityManager?.formGroup?.controls?.['detailAccountId']?.value;
    if (!detailAccountId) return [];
    const detailAccount = this.detailAccounts.find(da => da.id === detailAccountId);
    if (!detailAccount) return [];
    return (detailAccount.mainAccounts || []).map(m => ({
      label: this.activeLanguage == "en" ? m.englishName : m.arabicName,
      value: m.id
    }))
  }

  get detailAccountOptions() {
    return this.detailAccounts.map(da => ({
      label: this.activeLanguage == "en" ? da.englishName : da.arabicName,
      value: da.id
    }))
  }

  private supplierStatusSignal = signal<SupplierStatusModel[]>([])
  private mainAccountSignal = signal<MainAccountModel[]>([])
  private detailAccountsSignal = signal<DetailAccountModel[]>([])
  get detailAccounts() {
    return this.detailAccountsSignal()
  }
  set detailAccounts(detailAccounts: DetailAccountModel[]) {
    this.detailAccountsSignal.set(detailAccounts)
  }
  public activeLanguage: string = 'en'
  private importInProgress = false;
  private readonly importFieldSet = new Set([
    'arabicName',
    'englishName',
    'taxNumber',
    'contactNumber',
    'email',
    'bankName',
    'bankAccountNumber',
    'iban',
    'street',
    'city',
    'country',
    'zipCode',
    'mainAccountId',
    'supplierStatusId',
    'supplierStatusName',
  ]);
  private readonly importHeaderAliases: Record<string, string> = {
    'arabicname': 'arabicName',
    'arabic name': 'arabicName',
    'arabic_name': 'arabicName',
    'الاسم العربي': 'arabicName',
    'اسم عربي': 'arabicName',
    'englishname': 'englishName',
    'english name': 'englishName',
    'english_name': 'englishName',
    'الاسم الانجليزي': 'englishName',
    'الاسم الإنجليزي': 'englishName',
    'اسم انجليزي': 'englishName',
    'taxnumber': 'taxNumber',
    'tax number': 'taxNumber',
    'tax_number': 'taxNumber',
    'الرقم الضريبي': 'taxNumber',
    'الرقم الضريبى': 'taxNumber',
    'contactnumber': 'contactNumber',
    'contact number': 'contactNumber',
    'contact_number': 'contactNumber',
    'رقم التواصل': 'contactNumber',
    'رقم الهاتف': 'contactNumber',
    'رقم الجوال': 'contactNumber',
    'email': 'email',
    'البريد الالكتروني': 'email',
    'البريد الإلكتروني': 'email',
    'bankname': 'bankName',
    'bank name': 'bankName',
    'bank_name': 'bankName',
    'اسم البنك': 'bankName',
    'bankaccountnumber': 'bankAccountNumber',
    'bank account number': 'bankAccountNumber',
    'bank_account_number': 'bankAccountNumber',
    'رقم الحساب البنكي': 'bankAccountNumber',
    'رقم الحساب': 'bankAccountNumber',
    'iban': 'iban',
    'ايبان': 'iban',
    'street': 'street',
    'الشارع': 'street',
    'city': 'city',
    'المدينة': 'city',
    'country': 'country',
    'الدولة': 'country',
    'zipcode': 'zipCode',
    'zip code': 'zipCode',
    'zip_code': 'zipCode',
    'الرمز البريدي': 'zipCode',
    'mainaccountid': 'mainAccountId',
    'main account id': 'mainAccountId',
    'main_account_id': 'mainAccountId',
    'معرف الحساب الرئيسي': 'mainAccountId',
    'supplierstatus': 'supplierStatusName',
    'supplier status': 'supplierStatusName',
    'حالة المورد': 'supplierStatusName',
  };

  isFrontalSignal = signal<boolean>(false)
  get isFrontal(): boolean {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  // Import state
  isImporting = false;
  importFailures: SupplierDetailsImportFailure[] = [];
  showImportFailuresDialog = false;

  constructor(
    public supplierDetailsService: SupplierDetailsService,
    public supplierStatusService: SupplierStatusService,
    public translate: TranslateService,
    private datePipe: DatePipe,
    private translationService: TranslationService,
    private mainAccountService: MainAccountService,
    private detailAccountService: DetailAccountService,
    private router: Router,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    const canCreate = this.authService.hasPermission(PERMISSIONS.SupplierDetails.Create);
    const canEdit = this.authService.hasPermission(PERMISSIONS.SupplierDetails.Update);
    const canDelete = this.authService.hasPermission(PERMISSIONS.SupplierDetails.Delete);

    this.importConfig = {
      label: this.translate.instant('FINANCE.IMPORT_EXCEL'),
      accept: '.xlsx,.xls',
      onSelect: (file: File) => this.onImportFileSelected(file),
      disabled: !canCreate,
      downloadTemplate: () => this.downloadTemplate(),
      downloadTemplateLabel: this.translate.instant('FINANCE.DOWNLOAD_TEMPLATE'),
      instructions: {
        title: this.activeLanguage === 'ar' ? 'تعليمات استيراد الموردين' : 'Supplier Import Instructions',
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
          this.activeLanguage === 'ar' ? 'المدينة (city)' : 'City (city)',
          this.activeLanguage === 'ar' ? 'الدولة (country)' : 'Country (country)',
          this.activeLanguage === 'ar' ? 'الرمز البريدي (zipCode)' : 'Zip Code (zipCode)',
          this.activeLanguage === 'ar' ? 'معرف الحساب الرئيسي (mainAccountId)' : 'Main Account ID (mainAccountId)',
          this.activeLanguage === 'ar' ? 'حالة المورد (supplierStatus)' : 'Supplier Status (supplierStatus)',
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
            ? 'سيتم تحديث الموردين الموجودين بناءً على الرقم الضريبي أو الاسم'
            : 'Existing suppliers will be updated based on tax number or name',
          this.activeLanguage === 'ar'
            ? 'تأكد من أن الملف بتنسيق .xlsx أو .xls'
            : 'Ensure the file is in .xlsx or .xls format',
        ],
      },
    };

    this.isFrontal = this.router.url.includes('frontal');
    this.actions = {
      add: {
        name: 'Add',
        visible: canCreate,
      },
      view: {
        name: 'View',
        visible: true,
      },
      edit: {
        name: 'Edit',
        visible: canEdit,
      },
      delete: {
        name: 'Delete',
        visible: canDelete,
        onClick: (item: SupplierDetailsModel) => this.handleDelete(item.id)
      },
      bulkDelete: {
        name: 'Bulk Delete',
        visible: canDelete,
        onClick: (ids: string[]) => this.handleBulkDelete(ids)
      },
      customActions: [
        {
          name: "Send to Frontal",
          visible: canEdit,
          visibleCondition: (item: SupplierDetailsModel) => {
            if (!item) return false;
            console.log(item.isFrontal, this.isFrontal)
            return !item.isFrontal && !this.isFrontal;
          },
          onClick: (item: SupplierDetailsModel) => {
            this.sendToFrontal(item);
          }
        },
        {
          name: ` ${this.getFrontalText()}`,
          visible: true,
          visibleCondition: (item: SupplierDetailsModel) => {
            if (!item) return false;
            return item.isFrontal && !this.isFrontal;
          },
          onClick: () => {
          },
          disabled: true
        }
      ]
    }
    this.columns = [
      //{field: 'id', label: 'ID'},
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'arabicName', label: this.translate.instant('DATA.ARABIC_NAME'), sortable: true
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'englishName', label: this.translate.instant('DATA.ENGLISH_NAME'), sortable: true,
      },
      {
        filter: false,
        filterType: 'boolean',
        type: 'boolean',
        field: 'mainAccountId', label: this.translate.instant('FINANCE.HAS_MAIN_ACCOUNT'), sortable: true,
        accessorFunction: (item: SupplierDetailsModel) => {
          if (item.mainAccountId !== null) return true
          return false
        },
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'mainAccount', label: this.translate.instant('FINANCE.MAIN_ACCOUNT'), sortable: true,
        accessorFunction: (item: SupplierDetailsModel) => this.getLinkedAccountName(item),
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'contactNumber',
        label: this.translate.instant('DATA.CONTACT_NUMBER'),
        sortable: true,
        sortFunction: (a, b) => Number(a) - Number(b)
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'bankName',
        label: this.translate.instant('DATA.BANK_NAME'),
        sortable: true,
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'bankAccountNumber',
        label: this.translate.instant('FINANCE.BANK_ACCOUNT_NUMBER'),
        sortable: true,
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'iban',
        label: this.translate.instant('DATA.IBAN'),
        sortable: true,
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'taxNumber',
        label: this.translate.instant('DATA.TAX_NUMBER'),
        sortable: true,
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'otherId',
        label: 'معرف اخر',
        sortable: true,
      },
      {
        type: 'text',
        field: 'street',
        label: this.translate.instant('DATA.STREET'),
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (!value) return '';
          return value.street || parseSupplierAddress(value.address).street;
        }
      },
      {
        type: 'text',
        field: 'city',
        label: this.translate.instant('DATA.CITY'),
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (!value) return '';
          return value.city || parseSupplierAddress(value.address).city;
        }
      },
      {
        type: 'text',
        field: 'country',
        label: this.translate.instant('DATA.COUNTRY'),
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (!value) return '';
          return value.country || parseSupplierAddress(value.address).country;
        }
      },
      {
        type: 'text',
        field: 'zipCode',
        label: this.translate.instant('DATA.ZIP_CODE'),
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (!value) return '';
          return value.zipCode || value.postalCode || parseSupplierAddress(value.address).zipCode;
        }
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'email', label: this.translate.instant('DATA.EMAIL'), sortable: true
      },
      {
        filter: true,
        filterType: 'date',
        type: 'date',
        field: 'createdAt',
        label: this.translate.instant('DATA.CREATED_AT'),
        sortable: true,
        accessorFunction: (value) => {
          return this.formatDateForFilter(value.createdAt);
        },
        sortFunction: (a, b) => {
          if (a && b && typeof a === 'string' && typeof b === 'string') {
            let aDate = new Date(a)
            let bDate = new Date(b)
            return aDate.getTime() - bDate.getTime()
          } else {
            return 0
          }
        }
      },
      {

        type: 'text',
        field: this.activeLanguage === 'en' ? 'supplierStatus.englishName' : 'supplierStatus.arabicName',
        label: this.translate.instant('DATA.SUPPLIER_STATUS'),
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (value) {
            return this.activeLanguage === 'en' ? value.supplierStatus?.englishName || '' : value.supplierStatus?.arabicName || ''
          } else {
            return ''
          }
        },
      }
    ];

    this.formConfig = {
      title: this.translate.instant('DATA.SUPPLIER_DETAILS'),
      cancelLabel: this.translate.instant('DATA.CANCEL_LABEL'),
      submitLabel: this.translate.instant('DATA.SUBMIT_LABEL'),
      onSubmit: (formData: any) => this.handleOnSubmit(formData),
      gridCols: 3,
      fields: [
        {
          field: 'arabicName',
          label: this.translate.instant('DATA.ARABIC_NAME'),
          type: 'text',
          placeholder: '',
          required: true,
          validations: [
            {
              field: 'required',
              validator: Validators.required,
              message: this.translate.instant('DATA.ARABIC_NAME_IS_REQUIRED')
            },
            {
              field: 'minlength',
              validator: Validators.minLength(3),
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_GREATER_THAN_N_CHARACTERS', { n: 3 })
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'englishName',
          label: this.translate.instant('DATA.ENGLISH_NAME'),
          type: 'text',
          placeholder: '',
          required: false,
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(3),
              message: 'English Name must be at least 3 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.ENGLISH_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'contactNumber',
          label: this.translate.instant('DATA.CONTACT_NUMBER'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'pattern',
              validator: Validators.pattern(/^[0-9]*$/),
              message: 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
            }
          ]
        },
        {
          field: 'email',
          label: this.translate.instant('DATA.EMAIL'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(8),
              message: 'Email must be at least 8 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(30),
              message: 'Email must be less than 30 characters long'
            },
            {
              field: 'email',
              validator: Validators.email,
              message: 'Email must be a valid email address'
            }
          ]
        },
        {
          field: 'bankName',
          label: this.translate.instant('DATA.BANK_NAME'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: 'Bank Name must be at least 2 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Bank Name must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'bankAccountNumber',
          label: this.translate.instant('FINANCE.BANK_ACCOUNT_NUMBER'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(4),
              message: 'Bank Account Number must be at least 4 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Bank Account Number must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'iban',
          label: this.translate.instant('DATA.IBAN'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: 'IBAN must be at least 2 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'IBAN must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'taxNumber',
          label: this.translate.instant('DATA.TAX_NUMBER'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: 'Tax Number must be at least 2 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Tax Number must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'street',
          label: this.translate.instant('DATA.STREET'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: this.translate.instant('DATA.STREET_MUST_BE_GREATER_THAN_N_CHARACTERS', { n: 1 })
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.STREET_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'district',
          label: this.translate.instant('DATA.DISTRICT'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.STREET_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'city',
          label: this.translate.instant('DATA.CITY'),
          type: 'text',
          placeholder: '',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: this.translate.instant('DATA.CITY_MUST_BE_GREATER_THAN_N_CHARACTERS', { n: 1 })
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.CITY_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'country',
          label: this.translate.instant('DATA.COUNTRY'),
          type: 'multiselect',
          placeholder: '',
          options: () => this.countryOptions
        },
        {
          field: 'shortAddress',
          label: this.translate.instant('DATA.SHORT_ADDRESS'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.STREET_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'buildingNumber',
          label: this.translate.instant('DATA.BUILDING_NUMBER'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.STREET_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'additionalContactNumber',
          label: this.translate.instant('DATA.ADDITIONAL_CONTACT_NUMBER'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Additional Contact Number must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'postalCode',
          label: this.translate.instant('DATA.POSTAL_CODE'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.ZIP_CODE_MUST_BE_LESS_THAN_N_CHARACTERS', { n: 200 })
            }
          ]
        },
        {
          field: 'fax',
          label: this.translate.instant('DATA.FAX'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Fax must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'website',
          label: this.translate.instant('DATA.WEBSITE'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Website must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'instructions',
          label: this.translate.instant('DATA.INSTRUCTIONS'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Instructions must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'otherId',
          label: 'معرف اخر',
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'Max length 100'
            },
          ]
        },
        {
          field: 'gaztNumber',
          label: this.translate.instant('DATA.GAZT_NUMBER'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'GAZT Number must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'otherId',
          label: this.translate.instant('FINANCE.OTHER_ID'),
          type: 'text',
          validations: [
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Other ID must be less than 200 characters long'
            }
          ]
        },
        {
          field: 'detailAccountId',
          label: this.translate.instant('FINANCE.CHOOSE_SUPPLIER_PARENT_DETAIL_ACCOUNT'),
          type: 'select',
          options: () => this.detailAccountOptions,
          accessorFunction: (item: SupplierDetailsModel) => item?.mainAccount?.detailAccountId ?? this.findMainAccountById(item?.mainAccountId)?.detailAccountId ?? null
        },
        {
          field: 'mainAccountId',
          label: this.translate.instant('FINANCE.MAIN_ACCOUNT'),
          type: 'select',
          options: () => this.mainAccountOptions
        },
        {
          field: 'supplierStatusId',
          label: this.translate.instant('DATA.SUPPLIER_STATUS'),
          type: 'select',
          options: () => this.supplierStatusOptions
        }
      ]
    }
  }

  public loadData = {
    load: (page: number, size: number, searchQuery: string = '', sortField: string = 'createdAt', sortOrder: number = -1) => {
      if (this.isFrontal) {
        return new Observable<{ data: SupplierDetailsModel[], totalCount: number }>(observer => {
          this.supplierDetailsService.getAllFrontal().subscribe({
            next: elements => {
              const mapped = elements.map(sd => {
                sd.createdAt = new Date(sd.createdAt);
                const parsed = parseSupplierAddress(sd.address);
                sd.street = parsed.street || sd.street || '';
                sd.city = parsed.city || sd.city || '';
                sd.country = parsed.country || sd.country || '';
                sd.zipCode = parsed.zipCode || sd.zipCode || '';
                sd.postalCode = sd.postalCode || sd.zipCode || '';
                return sd;
              });
              observer.next({ data: mapped, totalCount: mapped.length });
              observer.complete();
            },
            error: err => observer.error(err)
          });
        });
      } else {
        return new Observable<{ data: SupplierDetailsModel[], totalCount: number }>(observer => {
          this.supplierDetailsService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
            next: (res) => {
              const mapped = (res.data || []).map(sd => {
                sd.createdAt = new Date(sd.createdAt);
                const parsed = parseSupplierAddress(sd.address);
                sd.street = parsed.street || sd.street || '';
                sd.city = parsed.city || sd.city || '';
                sd.country = parsed.country || sd.country || '';
                sd.zipCode = parsed.zipCode || sd.zipCode || '';
                sd.postalCode = sd.postalCode || sd.zipCode || '';
                return sd;
              });
              observer.next({ data: mapped, totalCount: res.totalCount });
              observer.complete();
            },
            error: (err) => observer.error(err)
          });
        });
      }
    }
  };

  get supplierStatusOptions(): Array<{ label: string, value: string }> {
    return this.supplierStatusSignal().map(x => ({
      label: `${x.englishName}  | ${x.arabicName}`,
      value: x.id
    }))
  }


  handleOnSubmit(formData: any) {
    try {
      console.log('--- handleOnSubmit formData ---', formData);
      let countryVal = formData.country;
      if (Array.isArray(countryVal)) {
        countryVal = countryVal.length > 0 ? countryVal.join(' - ') : '';
      } else if (!countryVal) {
        countryVal = '';
      }

      const effectiveZipCode = formData.postalCode || formData.zipCode || '';
      const addressStr = `${formData.street || ''}, ${formData.city || ''}, ${countryVal || ''}, ${effectiveZipCode}`;

      const entityData = {
        ...formData,
        country: countryVal,
        zipCode: effectiveZipCode,
        address: addressStr
      };

      if (formData.id) {
        const updatedElement = new SupplierDetailsModel(entityData);
        console.log('--- updatedElement ---', updatedElement);
        console.log('--- updatedElement.toJSON() ---', updatedElement.toJSON());

        if (this.isFrontal) {
          updatedElement.isFrontal = true;
        }
        this.supplierDetailsService.update(updatedElement).subscribe({
          next: element => {
            // Refresh account lists so the modal shows newly linked / auto-created accounts
            this.loadMainAccounts();
            this.loadDetailAccounts();
            this.entityManager?.reload();
            this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_SUCCESS') });
          },
          error: (err) => {
            console.log(err);
            this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR') });
          }
        })
      } else {

        const newEntity = new SupplierDetailsModel(entityData);
        if (this.isFrontal) {
          newEntity.isFrontal = true;
        }
        if (newEntity.validate()) {
          this.supplierDetailsService.create(newEntity).subscribe({
            next: element => {
              // Refresh account lists so the modal shows the auto-created account (e.g. under «دائنون»)
              this.loadMainAccounts();
              this.loadDetailAccounts();
              this.entityManager?.reload();
              this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_SUCCESS') });
            },
            error: (err) => {
              console.log(err);
              const detailMsg = err?.error?.message || err?.error?.Message || (typeof err?.error === 'string' ? err.error : null) || this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR');
              this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: detailMsg });
            }
          })
        }
      }
    } catch (ex: any) {
      console.log(ex)
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR') });
    }
  }


  handleDelete(id: string) {
    this.supplierDetailsService.delete(id).subscribe({
      next: element => {
        this.entityManager?.reload();
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('DATA.CONFIRM_ENTITY_DELETE_SUCCESS', { entityName: this.translate.instant('DATA.SUPPLIER_DETAILS') }) });
      },
      error: (err) => {
        console.log(err);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.SUPPLIER_DETAILS_ERROR') });
      }
    })
  }

  handleBulkDelete(ids: string[]) {
    this.supplierDetailsService.deleteMultiple(ids).subscribe({
      next: () => {
        this.entityManager?.reload();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('COMMON.BULK_DELETE_SUCCESS', { count: ids.length })
        });
      },
      error: (err) => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.BULK_DELETE_ERROR')
        });
      }
    })
  }


  ngOnInit(): void {
    this.loadSupplierStatus()
    this.loadMainAccounts()
    this.loadDetailAccounts()
  }

  ngAfterViewInit(): void {
    // Keep the modal's DetailAccount dropdown in sync with the MainAccount selection
    // (customer-profile pattern: picking a MainAccount resolves its parent group).
    this.entityManager?.formGroup?.valueChanges?.subscribe(() => this.onModalAccountChanged());
  }

  loadDetailAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: data => {
        this.detailAccounts = data;
        // If the modal is already open (patched before accounts arrived), resolve its fields now
        this.onModalAccountChanged();
      },
      error: () => {
        console.log('Error loading detail accounts')
      }
    })
  }

  // Modal cascade sync: picking a MainAccount resolves its parent group; changing the
  // group clears a MainAccount that no longer belongs to it (never forces the group back).
  private previousMainAccountId: string | null = null;
  private onModalAccountChanged(): void {
    const fg = this.entityManager?.formGroup;
    if (!fg) return;
    const detailAccountId = fg.controls['detailAccountId']?.value;
    const mainAccountId = fg.controls['mainAccountId']?.value;
    const mainAccountChanged = (mainAccountId ?? null) !== (this.previousMainAccountId ?? null);
    this.previousMainAccountId = mainAccountId ?? null;

    if (mainAccountChanged && mainAccountId) {
      // MainAccount pick → resolve its parent group (account's group wins)
      const account = this.findMainAccountById(mainAccountId);
      if (account?.detailAccountId && account.detailAccountId !== detailAccountId) {
        fg.controls['detailAccountId'].setValue(account.detailAccountId, { emitEvent: false });
      }
    } else if (detailAccountId) {
      // The group was changed by the user → clear a main account that no longer belongs
      const currentMain = fg.controls['mainAccountId']?.value;
      if (currentMain) {
        const detailAccount = this.detailAccounts.find(da => da.id === detailAccountId);
        const belongs = (detailAccount?.mainAccounts || []).some(ma => ma.id === currentMain);
        if (!belongs) {
          fg.controls['mainAccountId'].setValue(null, { emitEvent: false });
        }
      }
    }
  }

  getLinkedAccountName(item: SupplierDetailsModel): string {
    const account = item?.mainAccount ?? this.findMainAccountById(item?.mainAccountId);
    if (!account) return this.translate.instant('FINANCE.NOT_LINKED');
    return this.activeLanguage === 'en' ? (account.englishName || account.arabicName) : (account.arabicName || account.englishName);
  }

  findMainAccountById(mainAccountId?: string): MainAccountModel | null {
    if (!mainAccountId) return null;
    // Search the groups' nested mainAccounts first (full data); the paginated
    // mainAccount.getAll() list only holds the first 50 rows.
    for (const da of this.detailAccounts) {
      const account = (da.mainAccounts || []).find(ma => ma.id === mainAccountId);
      if (account) return account;
    }
    if (!this.mainAccount?.length) return null;
    return this.mainAccount.find(ma => ma.id === mainAccountId) ?? null;
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: data => {
        this.mainAccount = data;
        // If the modal is already open (patched before accounts arrived), resolve its fields now
        this.onModalAccountChanged();
      },
      error: () => {
        alert('Error loading main accounts')
      }
    })
  }
  loadSupplierStatus() {
    this.supplierStatusService.getAll().subscribe(elements => {
      this.supplierStatusSignal.set(elements)
    })
  }

  sendToFrontal(supplier) {
    this.supplierDetailsService.makeFrontal(supplier.id).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم إرسال ملف المورد إلى الجهة الأمامية بنجاح" });
        this.entityManager?.reload();
      },
      error: (error) => {
        console.error('Error making Supplier frontal:', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء إرسال ملف المورد إلى الجهة الأمامية" });
      }
    });
  }

  downloadTemplate(): void {
    this.supplierDetailsService.downloadTemplate().subscribe({
      next: (blob) => FileSaver.saveAs(blob, 'supplier-details_import.xlsx'),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
        });
      },
    });
  }

  getFrontalText(): string {
    if (this.activeLanguage === 'ar') {
      return 'في الواجهة الأمامية';
    } else {
      return 'In Frontal';
    }
  }

  formatDateForFilter(date: any): string | null {
    if (!date) return null;

    try {
      return formatDateOnlyToString(date);
    } catch (error) {
      console.warn('Error formatting date for filter:', error);
      return null;
    }
  }

  onImportFileSelected(file: File): void {
    if (this.isImporting || !file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      return;
    }

    this.isImporting = true;
    this.importConfig = { ...this.importConfig, disabled: true };

    this.supplierDetailsService.importFromExcel(file).subscribe({
      next: (res: SupplierDetailsImportResult) => {
        this.isImporting = false;
        this.importConfig = { ...this.importConfig, disabled: false };

        const detail = `${this.translate.instant('COMMON.IMPORTED')}: ${res.imported} | ${this.translate.instant('COMMON.UPDATED')}: ${res.updated} | ${this.translate.instant('COMMON.FAILED')}: ${res.failed?.length ?? 0}`;
        this.messageService.add({
          severity: res.failed?.length ? 'warn' : 'success',
          summary: this.translate.instant(res.failed?.length ? 'FINANCE.WARNING' : 'FINANCE.SUCCESS'),
          detail,
          life: 8000,
          styleClass: `import-toast import-toast--${res.failed?.length ? 'warn' : 'success'}`,
        });

        if (res.failed?.length) {
          this.importFailures = res.failed;
          this.showImportFailuresDialog = true;
        }

        this.entityManager?.reload();
      },
      error: (err) => {
        this.isImporting = false;
        this.importConfig = { ...this.importConfig, disabled: false };
        console.error('Import error:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
          life: 8000,
          styleClass: 'import-toast import-toast--error',
        });
      },
    });
  }

  getImportFailureReason(failure: SupplierDetailsImportFailure): string {
    return formatImportErrorMessage(this.translate, failure);
  }

  getImportFailureReasonPreview(failure: SupplierDetailsImportFailure, maxLength = 120): string {
    const reason = this.getImportFailureReason(failure);
    if (reason.length <= maxLength) return reason;
    return `${reason.substring(0, maxLength - 3)}...`;
  }

  isImportFailureReasonTruncated(failure: SupplierDetailsImportFailure, maxLength = 120): boolean {
    return this.getImportFailureReason(failure).length > maxLength;
  }

  getImportFailureVisualState(failure: SupplierDetailsImportFailure): { icon: string; chipClass: string } {
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

  // ── Old import methods removed — import is now fully server-side ─────────
  private _REMOVED_processImportRows(rows: any[][]) {
    const headerRow =
      rows.find(
        (r) =>
          (r || []).filter(
            (c) => c !== undefined && c !== null && String(c).trim() !== ''
          ).length > 0
      ) || [];
    if (!headerRow.length) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      return;
    }

    const headerIndex = rows.indexOf(headerRow);
    const fieldIndex = new Map<string, number>();
    const dynamicAliases: Record<string, string> = {};
    (this.columns || []).forEach((col) => {
      const normalized = this.normalizeImportHeader(col.label);
      const mapped = this.mapColumnFieldToImportField(col);
      if (normalized && mapped && this.importFieldSet.has(mapped)) {
        dynamicAliases[normalized] = mapped;
      }
    });
    headerRow.forEach((cell, idx) => {
      const normalized = this.normalizeImportHeader(cell);
      const field =
        this.importHeaderAliases[normalized] || dynamicAliases[normalized];
      if (field && !fieldIndex.has(field)) {
        fieldIndex.set(field, idx);
      }
    });

    const requiredFields = ['arabicName']; // Only Arabic name is required now
    const missingRequired = requiredFields.filter((f) => !fieldIndex.has(f));
    if (missingRequired.length) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      return;
    }

    const existingByTax = new Map<string, SupplierDetailsModel>();
    const existingByName = new Map<string, SupplierDetailsModel>();
    [].forEach((sd) => {
      const taxKey = this.normalizeTaxNumber(sd.taxNumber);
      if (taxKey && !existingByTax.has(taxKey)) {
        existingByTax.set(taxKey, sd);
      }
      const nameKey = this.buildNameKey(sd.arabicName, sd.englishName);
      if (nameKey && !existingByName.has(nameKey)) {
        existingByName.set(nameKey, sd);
      }
    });

    const seenKeys = new Set<string>();
    const ignored: { row: number; reason: string }[] = [];
    const operations: { item: SupplierDetailsModel; mode: 'create' | 'update' }[] = [];
    const suppliersWithMissing: Array<{
      arabicName: string;
      rowNumber: number;
      missingFields: string[];
    }> = [];

    const dataRows = rows
      .slice(headerIndex + 1)
      .filter((r) =>
        (r || []).some(
          (c) => c !== undefined && c !== null && String(c).trim() !== ''
        )
      );

    dataRows.forEach((row, i) => {
      const rowNumber = headerIndex + 2 + i;
      const rowData: SupplierImportRow = {
        arabicName: this.normalizeImportCell(row[fieldIndex.get('arabicName')]),
        englishName: this.normalizeImportCell(row[fieldIndex.get('englishName')]),
        taxNumber: this.normalizeImportCell(row[fieldIndex.get('taxNumber')]),
        contactNumber: this.normalizeImportCell(row[fieldIndex.get('contactNumber')]),
        email: this.normalizeImportCell(row[fieldIndex.get('email')]),
        bankName: this.normalizeImportCell(row[fieldIndex.get('bankName')]),
        bankAccountNumber: this.normalizeImportCell(row[fieldIndex.get('bankAccountNumber')]),
        iban: this.normalizeImportCell(row[fieldIndex.get('iban')]),
        street: this.normalizeImportCell(row[fieldIndex.get('street')]),
        city: this.normalizeImportCell(row[fieldIndex.get('city')]),
        country: this.normalizeImportCell(row[fieldIndex.get('country')]),
        zipCode: this.normalizeImportCell(row[fieldIndex.get('zipCode')]),
        mainAccountId: this.normalizeOptionalId(
          this.normalizeMainAccountId(
            this.normalizeImportCell(row[fieldIndex.get('mainAccountId')])
          )
        ),
        supplierStatusId: this.normalizeImportCell(row[fieldIndex.get('supplierStatusId')]),
        supplierStatusName: this.normalizeImportCell(row[fieldIndex.get('supplierStatusName')]),
      };

      // Check for missing Arabic name (required)
      if (!rowData.arabicName) {
        ignored.push({ row: rowNumber, reason: 'Missing required field: Arabic Name' });
        return;
      }

      // Check for missing optional but important fields
      const missingFields: string[] = [];

      // Tax Number is the most important - check first
      if (!rowData.taxNumber || rowData.taxNumber.trim() === '') {
        missingFields.push(this.translate.instant('COMMON.TAX_NUMBER_MISSING'));
      }

      // English Name
      if (!rowData.englishName || rowData.englishName.trim() === '') {
        missingFields.push(this.translate.instant('COMMON.ENGLISH_NAME_MISSING'));
      }

      // Other optional fields
      if (!rowData.contactNumber || rowData.contactNumber.trim() === '') {
        missingFields.push(this.translate.instant('DATA.CONTACT_NUMBER'));
      }
      if (!rowData.email || rowData.email.trim() === '') {
        missingFields.push(this.translate.instant('DATA.EMAIL'));
      }
      if (!rowData.bankName || rowData.bankName.trim() === '') {
        missingFields.push(this.translate.instant('DATA.BANK_NAME'));
      }
      if (!rowData.bankAccountNumber || rowData.bankAccountNumber.trim() === '') {
        missingFields.push(this.translate.instant('FINANCE.BANK_ACCOUNT_NUMBER'));
      }
      if (!rowData.iban || rowData.iban.trim() === '') {
        missingFields.push(this.translate.instant('DATA.IBAN'));
      }
      if (!rowData.street || rowData.street.trim() === '') {
        missingFields.push(this.translate.instant('DATA.STREET'));
      }
      if (!rowData.city || rowData.city.trim() === '') {
        missingFields.push(this.translate.instant('DATA.CITY'));
      }
      if (!rowData.country || rowData.country.trim() === '') {
        missingFields.push(this.translate.instant('DATA.COUNTRY'));
      }

      if (missingFields.length > 0) {
        suppliersWithMissing.push({
          arabicName: rowData.arabicName,
          rowNumber: rowNumber,
          missingFields
        });
      }

      const taxKey = this.normalizeTaxNumber(rowData.taxNumber);
      const nameKey = this.buildNameKey(rowData.arabicName, rowData.englishName);
      const primaryKey = taxKey || nameKey;
      if (!primaryKey) {
        ignored.push({ row: rowNumber, reason: 'Missing key fields' });
        return;
      }
      if (seenKeys.has(primaryKey)) {
        ignored.push({ row: rowNumber, reason: 'Duplicate in file' });
        return;
      }
      seenKeys.add(primaryKey);

      const resolvedStatusId = this.resolveSupplierStatusId(
        rowData.supplierStatusId,
        rowData.supplierStatusName
      );
      if (rowData.supplierStatusName && !resolvedStatusId) {
        ignored.push({ row: rowNumber, reason: 'Unknown supplier status' });
        return;
      }
      rowData.supplierStatusId = this.normalizeOptionalId(
        resolvedStatusId || rowData.supplierStatusId
      );

      const existing = taxKey ? existingByTax.get(taxKey) : existingByName.get(nameKey);
      if (existing) {
        const updated = this.mergeImportWithExisting(existing, rowData);
        operations.push({ item: updated, mode: 'update' });
      } else {
        const created = this.buildSupplierDetailsFromRow(rowData);
        operations.push({ item: created, mode: 'create' });
      }
    });

    if (!operations.length) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No valid rows to import.',
      });
      return;
    }

    // (missing fields dialog removed — import is now server-side)

    this.importInProgress = true;
    this.importConfig = {
      ...this.importConfig,
      disabled: true,
    };
    this.saveImportedSupplierDetails(operations, 0, {
      created: 0,
      updated: 0,
      failed: 0,
      ignored: ignored.length,
    });
  }

  private saveImportedSupplierDetails(
    operations: { item: SupplierDetailsModel; mode: 'create' | 'update' }[],
    index: number,
    results: { created: number; updated: number; failed: number; ignored: number }
  ) {
    if (index >= operations.length) {
      this.importInProgress = false;
      this.importConfig = {
        ...this.importConfig,
        disabled: false,
      };
      this.entityManager?.reload();
      const detailParts = [
        `Imported ${results.created}`,
        `Updated ${results.updated}`,
        `Failed ${results.failed}`,
      ];
      if (results.ignored) {
        detailParts.push(`Ignored ${results.ignored}`);
      }
      this.messageService.add({
        severity: results.failed ? 'warn' : 'success',
        summary: results.failed
          ? this.translate.instant('FINANCE.ERROR')
          : this.translate.instant('FINANCE.SUCCESS'),
        detail: detailParts.join(' - '),
      });
      return;
    }

    const operation = operations[index];
    const request =
      operation.mode === 'update'
        ? this.supplierDetailsService.update(operation.item)
        : this.supplierDetailsService.create(operation.item);
    request.subscribe({
      next: () => {
        if (operation.mode === 'update') {
          results.updated += 1;
        } else {
          results.created += 1;
        }
      },
      error: (error) => {
        console.error('Error importing supplier', error);
        results.failed += 1;
        this.saveImportedSupplierDetails(operations, index + 1, results);
      },
      complete: () => {
        this.saveImportedSupplierDetails(operations, index + 1, results);
      },
    });
  }

  private normalizeImportHeader(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).trim().toLowerCase();
  }

  private normalizeImportCell(value: any): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
        .toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 })
        .trim();
    }
    return String(value).trim();
  }

  private normalizeTaxNumber(value: any): string {
    const normalized = this.normalizeImportCell(value);
    return normalized.replace(/\s+/g, '').toLowerCase();
  }

  private buildNameKey(arabicName: string, englishName: string): string {
    return `${arabicName || ''}|${englishName || ''}`.toLowerCase().trim();
  }

  private mapColumnFieldToImportField(col: Column<SupplierDetailsModel>): string | null {
    if (col.field === 'mainAccountId' && col.type === 'boolean') {
      return null;
    }
    switch (col.field) {
      case 'arabicName':
        return 'arabicName';
      case 'englishName':
        return 'englishName';
      case 'contactNumber':
        return 'contactNumber';
      case 'email':
        return 'email';
      case 'bankName':
        return 'bankName';
      case 'bankAccountNumber':
        return 'bankAccountNumber';
      case 'iban':
        return 'iban';
      case 'taxNumber':
        return 'taxNumber';
      case 'address.street':
        return 'street';
      case 'address.city':
        return 'city';
      case 'address.country':
        return 'country';
      case 'address.zipCode':
        return 'zipCode';
      case 'supplierStatus.englishName':
      case 'supplierStatus.arabicName':
        return 'supplierStatusName';
      default:
        return null;
    }
  }

  private buildSupplierDetailsFromRow(row: SupplierImportRow): SupplierDetailsModel {
    const supplier = new SupplierDetailsModel();
    supplier.arabicName = row.arabicName;
    supplier.englishName = row.englishName;
    supplier.taxNumber = row.taxNumber || '';
    supplier.contactNumber = row.contactNumber || '';
    supplier.email = row.email || '';
    supplier.bankName = row.bankName || '';
    supplier.bankAccountNumber = row.bankAccountNumber || '';
    supplier.iban = row.iban || '';
    supplier.street = row.street || '';
    supplier.city = row.city || '';
    supplier.country = row.country || '';
    supplier.zipCode = row.zipCode || '';
    supplier.address = this.buildAddressString(supplier);
    supplier.mainAccountId = row.mainAccountId ?? null;
    supplier.supplierStatusId = row.supplierStatusId ?? null;
    supplier.isFrontal = this.isFrontal;
    return supplier;
  }

  private mergeImportWithExisting(
    existing: SupplierDetailsModel,
    row: SupplierImportRow
  ): SupplierDetailsModel {
    const supplier = new SupplierDetailsModel();
    supplier.id = existing.id;
    supplier.arabicName = row.arabicName || existing.arabicName;
    supplier.englishName = row.englishName || existing.englishName;
    supplier.taxNumber = row.taxNumber || existing.taxNumber;
    supplier.contactNumber = row.contactNumber || existing.contactNumber;
    supplier.email = row.email || existing.email;
    supplier.bankName = row.bankName || existing.bankName;
    supplier.bankAccountNumber = row.bankAccountNumber || existing.bankAccountNumber;
    supplier.iban = row.iban || existing.iban;
    supplier.street = row.street || existing.street || '';
    supplier.city = row.city || existing.city || '';
    supplier.country = row.country || existing.country || '';
    supplier.zipCode = row.zipCode || existing.zipCode || '';
    supplier.address = this.buildAddressString(supplier) || this.normalizeAddressValue(existing.address) || '';
    supplier.mainAccountId = row.mainAccountId ?? existing.mainAccountId;
    supplier.supplierStatusId = row.supplierStatusId ?? existing.supplierStatusId;
    supplier.isFrontal = existing.isFrontal;
    return supplier;
  }

  private buildAddressString(row: {
    street?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  }): string {
    const parts = [
      row.street || '',
      row.city || '',
      row.country || '',
      row.zipCode || '',
    ].map((p) => String(p).trim()).filter((p) => p !== '');
    return parts.join(', ');
  }

  private normalizeAddressValue(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') return address.trim();
    if (typeof address === 'object') {
      const street = address.street || '';
      const city = address.city || '';
      const country = address.country || '';
      const zipCode = address.zipCode || '';
      return this.buildAddressString({ street, city, country, zipCode });
    }
    return String(address).trim();
  }

  private resolveSupplierStatusId(
    statusId?: string,
    statusName?: string
  ): string {
    if (statusId) return statusId;
    if (!statusName) return null;
    const normalized = statusName.trim().toLowerCase();
    const match = this.supplierStatusOptions.find((opt) => {
      const label = (opt.label || '').toLowerCase();
      return label.includes(normalized);
    });
    if (match) return match.value;
    const byModel = this.supplierStatusSignal().find((s) => {
      return (
        (s.englishName || '').toLowerCase() === normalized ||
        (s.arabicName || '').toLowerCase() === normalized
      );
    });
    return byModel?.id || null;
  }

  private normalizeMainAccountId(value: string): string {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    if (
      normalized === 'true' ||
      normalized === 'false' ||
      normalized === 'yes' ||
      normalized === 'no' ||
      normalized === '1' ||
      normalized === '0'
    ) {
      return '';
    }
    return value;
  }

  private normalizeOptionalId(value: string): string | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (
      normalized === 'null' ||
      normalized === 'undefined' ||
      normalized === 'true' ||
      normalized === 'false' ||
      normalized === 'yes' ||
      normalized === 'no' ||
      normalized === '1' ||
      normalized === '0'
    ) {
      return null;
    }
    return value;
  }

}
