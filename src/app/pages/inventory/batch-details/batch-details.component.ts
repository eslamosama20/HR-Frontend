import {Component, ViewChild, signal} from '@angular/core';
import {FormConfig} from "../../../shared-components/entity-manager/common/form-config";
import {Validators} from "@angular/forms";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule} from "@angular/common";
import {BatchDetailsModel} from "../../../models/inventory/batchDetails.model";
import {BatchDetailsService} from "../../../services/inventory/batch-details.service";
import {TableActions} from "../../../shared-components/entity-manager/common/table-action";
import {Column} from "../../../shared-components/entity-manager/common/columns-config";
import {formatDateToUTCString} from "../../../utils/dateUtils";
import {BatchStatusService} from "../../../services/inventory/batch-status.service";
import {BatchStatusModel} from "../../../models/inventory/batchStatus.model";
import {StoreDetailsModel} from "../../../models/inventory/storeDetails.model";
import {StoreDetailsService} from "../../../services/inventory/store-details.service";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import { EntityManagerComponent } from "../../../shared-components/entity-manager/entity-manager.component";

@Component({
  selector: 'app-batch-details',
  standalone: true,
  imports: [EntityManagerModule, CommonModule],
  templateUrl: './batch-details.component.html',
  styleUrl: './batch-details.component.scss'
})
export class BatchDetailsComponent {
  @ViewChild(EntityManagerComponent) entityManager!: EntityManagerComponent<any>;
  columns: Column<BatchDetailsModel>[]
  entityName = "ProductBatchDetailsModel"
  formConfig: FormConfig
  actions: TableActions = {
    edit: {
      name: 'Edit',
    },
    delete: {
      name: 'Delete',

      onClick: (item: BatchDetailsModel) => this.handleDelete(item.id)
    },
    view: {
      name: 'View',

    },
  }
  private batchStatusSignal = signal<BatchStatusModel[]>([])
  private storeDetailsSignal = signal<StoreDetailsModel[]>([])
  private activeLanguage: string = 'en'
  constructor(
    public batchDetailsService: BatchDetailsService,
    private batchStatusService: BatchStatusService,
    private storeDetailsService: StoreDetailsService,
    public translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.columns = [
      //{field: 'id', label: 'ID'},
      {
        type: 'date',
        filter: true,
        filterType: 'date',
        field: 'expiryDate', label: this.translate.instant('DATA.EXPIRY_DATE'),
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
        type: 'date',
        filter: true,
        filterType: 'date',
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
        filter: true,
        filterType: 'text',
        field: this.activeLanguage === 'en' ? 'batchStatus.englishName' : 'batchStatus.arabicName',
        label: this.translate.instant('DATA.BATCH_STATUS'),
        accessorFunction: (value : BatchDetailsModel) => {
          if (value) {
            return this.activeLanguage === 'en' ? value.batchStatus.englishName : value.batchStatus.arabicName
          } else {
            return ''
          }
        },
      },
      {
        type: 'text',
        filter: false,
        filterType: 'text',
        field: 'storeDetailsId',
        label: this.translate.instant('DATA.STORE_DETAILS'),
        accessorFunction: (value: BatchDetailsModel) => {
          if (value) {
            let v = this.storeDetailsValue.find(x => x.id === value.storeDetailsId)?.value
            if (v) {
              return v
            }
          } else {
            return ''
          }
        },
      }

    ];

    this.formConfig = {
      title: this.translate.instant('DATA.BATCH_DETAILS'),
      cancelLabel: this.translate.instant('DATA.CANCEL_LABEL'),
      submitLabel: this.translate.instant('DATA.SUBMIT_LABEL'),
      onSubmit: (formData: any) => this.handleOnSubmit(formData),
      fields: [
        {
          field: 'expiryDate',
          label: this.translate.instant('DATA.EXPIRY_DATE'),
          type: 'text',
          required: true,
          validations: [
            {field: 'required', validator: Validators.required, message: 'Expiry Date is required'},
            {
              field: 'minlength',
              validator: Validators.minLength(5),
              message: 'Expiry Date must be at least 5 characters long'
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: 'Expiry Date must be less than 200 characters long'
            },
            {
              field: 'pattern',
              validator: Validators.pattern('^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
              message: 'Expiry Date must be in the format YYYY-MM-DD'
            }
          ],
          placeholder: 'YYYY-MM-DD'
        },
        {
          field: 'batchStatusId',
          label: this.translate.instant('DATA.BATCH_STATUS'),
          type: 'select',
          required: true,
          validations: [
            {field: 'required', validator: Validators.required, message: 'Product Unit Status is required'},
          ],
          options: () => this.batchStatusOptions,
        },
        {
          field: 'storeDetailsId',
          label: this.translate.instant('DATA.STORE_DETAILS'),
          type: 'select',
          required: true,
          validations: [
            {field: 'required', validator: Validators.required, message: 'Store Details is required'},
          ],
          options: () => this.storeDetailsOptions,
        }

      ]
    }

    this.loadBatchStatus()
    this.loadStoreDetails()
  }

  public loadData = {
    load: (page: number, size: number, searchQuery: string = '', sortField: string = 'createdAt', sortOrder: number = -1) =>
      this.batchDetailsService.searchPaged(searchQuery, page, size, sortField, sortOrder)
  };

  get batchStatusOptions(): Array<{ label: string, value: string }> {
    return this.batchStatusSignal().map(x => ({
      label: `${x.englishName}  | ${x.arabicName}`,
      value: x.id
    }))
  }

  get storeDetailsValue(): Array<{ id: string, value: string }> {
    return this.storeDetailsSignal().map(x => ({
      id: x.id,
      value: `${x.englishName}  | ${x.arabicName}`
    }))
  }

  get storeDetailsOptions(): Array<{ label: string, value: string }> {
    return this.storeDetailsSignal().map(x => ({
      label: `${x.englishName}  | ${x.arabicName}`,
      value: x.id
    }))
  }


  handleOnSubmit(formData: any) {
    try {
      if (formData.id) {
        const updatedElement = new BatchDetailsModel(formData)
        this.batchDetailsService.update(updatedElement).subscribe(() => {
          this.entityManager?.reload()
        })
      } else {
        const newEntity = new BatchDetailsModel(formData)

        if (newEntity.validate()) {
          this.batchDetailsService.create(newEntity).subscribe(() => {
            this.entityManager?.reload()
          })
        }
      }
    } catch (ex: any) {
      console.log(ex)
    }
  }

  handleDelete(id: string) {
    this.batchDetailsService.delete(id).subscribe(() => {
      this.entityManager?.reload()
    })
  }

  loadBatchStatus() {
    this.batchStatusService.getAll().subscribe(elements => {
      this.batchStatusSignal.set(elements)
    })
  }

  loadStoreDetails() {
    this.storeDetailsService.getAll().subscribe(elements => {
      this.storeDetailsSignal.set(elements)
    })
  }
}
