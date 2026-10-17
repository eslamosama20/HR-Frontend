import {Component, Input, OnChanges, signal, SimpleChanges} from '@angular/core';
import {CommonModule} from "@angular/common";
import {BranchDetailsModel} from "../../../../models/inventory/branchDetails.model";
import {BranchDetailsService} from "../../../../services/inventory/branch-details.service";
import {FormConfig} from "../../../../shared-components/entity-manager/common/form-config";
import {Validators} from '@angular/forms';
import {TableActions} from "../../../../shared-components/entity-manager/common/table-action";
import {BranchStatusService} from "../../../../services/inventory/branch-status.service";
import {BranchStatusModel} from "../../../../models/inventory/branchStatus.model";
import {Column} from "../../../../shared-components/entity-manager/common/columns-config";
import {formatDateToUTCString} from "../../../../utils/dateUtils";
import {CompanyDetailsModel} from "../../../../models/inventory/companyDetails.model";
import {CompanyDetailsService} from "../../../../services/inventory/company-details.service";
import {PageInfoService} from "../../../../_metronic/layout";
import {TranslateService} from "@ngx-translate/core";
import {EntityManagerModule} from "../../../../shared-components/entity-manager/entity-manager.module";
import {TranslationService} from "../../../../modules/i18n";
import {MessageService} from "primeng/api";

@Component({
  selector: 'app-branch-details',
  standalone: true,
  imports: [EntityManagerModule, CommonModule],
  providers: [MessageService],
  templateUrl: './branch-details.component.html',
  styleUrl: './branch-details.component.scss',

})
export class BranchDetailsComponent implements OnChanges {
  @Input({required: true}) companyDetails: CompanyDetailsModel;
  @Input() loadCompanyDetails: (id: string) => void;

  columns: Column<BranchDetailsModel>[]
  entityName = "BranchDetailsModel"
  formConfig: FormConfig
  actions: TableActions = {
    edit: {
      name: 'Edit',

    },
    delete: {
      name: 'Delete',

      onClick: (item: BranchDetailsModel) => this.handleDelete(item.id)
    },
  }

  private branchStatusSignal = signal<BranchStatusModel[]>([])
  private activeLanguage: string = 'en'
  constructor(
    public branchDetailsService: BranchDetailsService,
    public branchStatusService: BranchStatusService,
    private pageInfo: PageInfoService,
    private companyDetailsService: CompanyDetailsService,
    private translate: TranslateService,
    private translationService: TranslationService,
    private messageService: MessageService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.columns = [
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'arabicName', label: this.translate.instant('DATA.ARABIC_NAME'), sortable: true},
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'englishName', label: this.translate.instant('DATA.ENGLISH_NAME'), sortable: true},
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'email', label: this.translate.instant('DATA.EMAIL'), sortable: true
      },
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'phone',
        label: this.translate.instant('DATA.PHONE'),
        sortable: true,
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
        label: this.translate.instant('DATA.BANK_ACCOUNT_NUMBER'),
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
        type: 'text',
        field: 'address.street',
        label: this.translate.instant('DATA.STREET'),
        sortable: true,
        filter: true,
        filterType: 'text',
        accessorFunction: value => {
          if (value) {
            if (typeof value.address !== 'string') {
              return value.address?.street ?? ''
            }
          } else {
            return ''
          }
        }
      },
      {
        type: 'text',
        field: 'address.city',
        label: this.translate.instant('DATA.CITY'),
        sortable: true,
        filter: true,
        filterType: 'text',
        accessorFunction: value => {
          if (value) {
            if (typeof value.address !== 'string') {
              return value.address?.city ?? ''
            }
          } else {
            return ''
          }
        }
      },
      {
        type: 'text',
        field: 'address.country',
        label: this.translate.instant('DATA.COUNTRY'),
        sortable: true,
        filter: true,
        filterType: 'text',
        accessorFunction: value => {
          if (value) {
            if (typeof value.address !== 'string') {
              return value.address?.country ?? ''
            }
          } else {
            return ''
          }
        }
      },
      {
        type: 'text',
        field: 'address.zipCode',
        label: this.translate.instant('DATA.ZIP_CODE'),
        sortable: true,
        filter: true,
        filterType: 'text',
        accessorFunction: value => {
          if (value) {
            if (typeof value.address !== 'string') {
              return value.address?.zipCode ?? ''
            }
          } else {
            return ''
          }
        }
      },
      {
        filter: true,
        filterType: 'date',
        type: 'date',
        field: 'createdAt',
        label: this.translate.instant('DATA.CREATED_AT'),
        sortable: true,
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
        field: this.activeLanguage === 'en' ? 'branchStatus.englishName' : 'branchStatus.arabicName',
        label: this.translate.instant('DATA.BRANCH_STATUS'),
        filter: true,
        filterType: 'text',
        accessorFunction: value => value ?
            this.activeLanguage === 'en' ? value.branchStatus?.englishName ?? '' : value.branchStatus?.arabicName ?? ''
          : '',
        sortable: true,
      }
    ];

    this.formConfig = {
      title: this.translate.instant('DATA.BRANCH_DETAILS'),
      cancelLabel: this.translate.instant('DATA.CANCEL_LABEL'),
      submitLabel: this.translate.instant('DATA.SUBMIT_LABEL'),
      onSubmit: (formData: any) => this.handleOnSubmit(formData),
      fields: [
        {
          field: 'arabicName',
          label: this.translate.instant('DATA.ARABIC_NAME'),
          type: 'text',
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
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_GREATER_THAN_N_CHARACTERS', {n: 3})
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(20),
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', {n: 20})
            },
            // custom validator
            //{validator: this.forbiddenNameValidator(/bob/i) , message: 'Arabic Name cannot contain space'}
          ]
        },
        {
          field: 'englishName',
          label: this.translate.instant('DATA.ENGLISH_NAME'),
          type: 'text',
          required: true,
          validations: [
            {
              field: 'required',
              validator: Validators.required,
              message: this.translate.instant('DATA.ENGLISH_NAME_IS_REQUIRED')
            },
            {
              field: 'minlength',
              validator: Validators.minLength(3),
              message: 'English Name must be at least 3 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.ENGLISH_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', {n: 200})
            },
            // custom validator
            //{validator: this.forbiddenNameValidator(/bob/i) , message: 'Arabic Name cannot contain space'}
          ]
        },
        {
          field: 'street',
          label: this.translate.instant('DATA.STREET'),
          type: 'text',
        },
        {
          field: 'city',
          label: this.translate.instant('DATA.CITY'),
          type: 'text',

        },
        {
          field: 'country',
          label: this.translate.instant('DATA.COUNTRY'),
          type: 'text',

        },
        {
          field: 'zipCode',
          label: this.translate.instant('DATA.ZIP_CODE'),
          type: 'text',

        },

        {
          field: 'email', label: this.translate.instant('DATA.EMAIL'), type: 'text'
          , validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(8),
              message: 'Email must be at least 8 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Email must be less than 200 characters long'
            },
            {
              field: 'email',
              validator: Validators.email,
              message: 'Email must be a valid email address'
            }
            // custom validator
            //{validator: this.forbiddenNameValidator(/bob/i) , message: 'Arabic Name cannot contain space'}
          ]
        },
        {
          field: 'phone',
          label: this.translate.instant('DATA.PHONE'),
          type: 'text',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(5),
              message: 'Phone must be at least 5 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'Phone must be less than 100 characters long'
            },
          ]
        },
        {
          field: 'bankName',
          label: this.translate.instant('DATA.BANK_NAME'),
          type: 'text',
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
            },
          ]
        },
        {
          field: 'bankAccountNumber',
          label: this.translate.instant('DATA.BANK_ACCOUNT_NUMBER'),
          type: 'text',
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
            },
          ]
        },
        {
          field: 'iban',
          label: this.translate.instant('DATA.IBAN'),
          type: 'text',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: 'IBAN must be at least 2 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'IBAN must be less than 100 characters long'
            },
          ]
        },
        {
          field: 'taxNumber',
          label: this.translate.instant('DATA.TAX_NUMBER'),
          type: 'text',
          validations: [
            {
              field: 'minlength',
              validator: Validators.minLength(2),
              message: 'Tax Number must be at least 2 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'Tax Number must be less than 100 characters long'
            },
          ]
        },
        {
          field: 'branchStatusId',
          label: this.translate.instant('DATA.BRANCH_STATUS'),
          type: 'select',
          options: () => this.branchStatusOptions,
        },

      ]
    }

    this.branchStatusService.getAll().subscribe(elements => {
      this.branchStatusSignal.set(elements)
    })
  }

  data: BranchDetailsModel[] = [];

  loadBranchData(): void {
    this.data = (this.companyDetails?.branchDetails ?? []).map(bd => {
      //@ts-ignore
      bd.street = bd.address?.street ?? ''
      //@ts-ignore
      bd.city = bd.address?.city ?? ''
      //@ts-ignore
      bd.country = bd.address?.country ?? ''
      //@ts-ignore
      bd.zipCode = bd.address?.zipCode ?? ''
      return bd
    });
  }

  get branchStatusOptions(): Array<{ label: string, value: string }> {
    return this.branchStatusSignal().map(x => ({
      label: `${x.englishName}  | ${x.arabicName}`,
      value: x.id
    }))
  }


  handleOnSubmit(formData: any) {
    try {
      if (formData.id) {
        const elementToUpdate = this.data.find((x: any) => x.id === formData.id)
        const updatedElement = new BranchDetailsModel({
          ...elementToUpdate,
          ...formData,
          address: `${formData.street ?? ''}, ${formData.city ?? ''}, ${formData.country ?? ''}, ${formData.zipCode ?? ''}`,
          companyDetailsId: this.companyDetails.id
        })
        this.branchDetailsService.update(updatedElement).subscribe(element => {
          this.loadBranchData()
          this.loadCompanyDetails(this.companyDetails.id)
        })
      } else {

        const newEntity = new BranchDetailsModel({...formData, address: `${formData.street || ''}, ${formData.city|| ''}, ${formData.country|| ''}, ${formData.zipCode|| ''}`, companyDetailsId: this.companyDetails.id})

        if (newEntity.validate()) {
          this.branchDetailsService.create(newEntity).subscribe({
            next: element => {
              this.loadBranchData();
              this.loadCompanyDetails(this.companyDetails.id);
            },
            error: (err: any) => {
              const detailMsg = err?.error?.message || err?.error?.Message || (typeof err?.error === 'string' ? err.error : null) || 'حدث خطأ أثناء إضافة الفرع';
              this.messageService.add({ severity: 'error', summary: 'خطأ', detail: detailMsg });
            }
          });
        }
      }
    } catch (ex: any) {
      console.log(ex)
    }
  }


  handleDelete(id: string) {
    this.branchDetailsService.delete(id).subscribe(element => {
      this.loadBranchData()
      this.loadCompanyDetails(this.companyDetails.id)
    })
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes.companyDetails) {
      this.loadBranchData();
    }
  }

}
