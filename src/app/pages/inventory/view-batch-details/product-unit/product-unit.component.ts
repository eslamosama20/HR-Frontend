import {Component, Input, OnChanges, OnInit, signal} from '@angular/core';
import {Column} from "../../../../shared-components/entity-manager/common/columns-config";
import {ProductUnitModel} from "../../../../models/inventory/productUnit.model";
import {formatDateToUTCString} from "../../../../utils/dateUtils";
import {TableActions} from "../../../../shared-components/entity-manager/common/table-action";
import {StoreDetailsModel} from "../../../../models/inventory/storeDetails.model";
import {ProductUnitStatusService} from "../../../../services/inventory/product-unit-status.service";
import {BatchDetailsService} from "../../../../services/inventory/batch-details.service";
import {Validators} from "@angular/forms";
import {FormConfig} from "../../../../shared-components/entity-manager/common/form-config";
import {BatchDetailsModel} from "../../../../models/inventory/batchDetails.model";
import {BatchUnitStatusService} from "../../../../services/inventory/batch-unit-status.service";
import {BatchUnitStatusModel} from "../../../../models/inventory/batchUnitStatus.model";
import {ProductBatchToUnitAssignments} from "../../../../models/inventory/productBatchToUnitAssignments.model";
import {TranslateService} from "@ngx-translate/core";
import {EntityManagerModule} from "../../../../shared-components/entity-manager/entity-manager.module";
import {TranslationService} from "../../../../modules/i18n";

@Component({
  selector: 'app-batch-product-unit',
  standalone: true,
  imports: [
    EntityManagerModule
  ],
  templateUrl: './product-unit.component.html',
  styleUrl: './product-unit.component.scss'
})
export class BatchProductUnitComponent implements OnInit, OnChanges {
  @Input({required: true}) batchDetails: BatchDetailsModel;
  @Input() loadBatchDetails: (id: string) => void;

  columns: Column<ProductUnitModel>[]
  entityName = "ProductUnitModel"
  formConfig: FormConfig


  actions: TableActions = {

    delete: {
      name: 'Delete',

      onClick: (item: StoreDetailsModel) => this.handleDelete(item.id)
    },
  }


  private dataSignal = signal<ProductUnitModel[]>([])
  private batchUnitStatusSignal = signal<BatchUnitStatusModel[]>([])
  private productUnitSignal = signal<Array<{
    ProductDetailsName: { englishName: string, arabicName: string },
    expiryDate: string | Date,
    productUnitId: string
  }>>([])
  private activeLanguage: string = 'en'
  constructor(
    public batchDetailsService: BatchDetailsService,
    public productUnitStatusService: ProductUnitStatusService,
    public batchUnitStatusService: BatchUnitStatusService,
    private translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.columns = [
      {
        filter: true,
        filterType: 'date',
        type: 'date',
        field: "expiryDate", label: this.translate.instant('DATA.EXPIRY_DATE'),
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
        field: this.activeLanguage === 'en' ? 'productUnitStatus.englishName' : 'productUnitStatus.arabicName',
        label: this.translate.instant('DATA.PRODUCT_UNIT_STATUS'),
        sortable: true,
        filter: true,
        filterType: 'text',
        accessorFunction: (value) => {
          if (value) {
            return this.activeLanguage === 'en' ? value.productUnitStatus.englishName : value.productUnitStatus.arabicName
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
      }
    ]

    this.formConfig = {
      title: this.translate.instant('DATA.PRODUCT_UNIT'),
      cancelLabel: this.translate.instant('DATA.CANCEL_LABEL'),
      submitLabel: this.translate.instant('DATA.SUBMIT_LABEL'),
      onSubmit: (formData: any) => this.handleOnSubmit(formData),
      fields: [
        {
          field: 'batchUnitStatusId',
          label: this.translate.instant('DATA.BATCH_UNIT_STATUS'),
          type: 'select',
          required: true,
          validations: [
            {field: 'required', validator: Validators.required, message: 'Batch Unit Status is required'},
          ],
          options: () => this.batchUnitStatusOptions,
        },
        {
          field: 'productUnitId',
          label: this.translate.instant('DATA.PRODUCT_UNIT'),
          type: 'select',
          required: true,
          validations: [
            {field: 'required', validator: Validators.required, message: 'Product Unit  is required'},
          ],
          options: () => this.productUnitOptions,
        }
      ]
    }
  }

  get data(): ProductUnitModel[] {
    return this.dataSignal();
  }

  set data(value: ProductUnitModel[]) {
    this.dataSignal.set(value);
  }


  get batchUnitStatusOptions(): Array<{ label: string, value: string }> {
    return this.batchUnitStatusSignal().map(x => ({
      label: `${x.englishName}  | ${x.arabicName}`,
      value: x.id
    }))
  }

  get productUnitOptions(): Array<{ label: string, value: string }> {
    return this.productUnitSignal().map(x => ({
      label: `${x.ProductDetailsName.englishName} | ${x.expiryDate instanceof Date ? formatDateToUTCString(x.expiryDate) : x.expiryDate}`,
      value: x.productUnitId
    }))
  }


  handleOnSubmit(formData: any) {
    try {
      const elementToAssign = this.data.find(x => x.id === formData.id)
      const assign = new ProductBatchToUnitAssignments({
        ...formData,
        productBatchDetailsId: this.batchDetails.id,
      })
      this.batchDetailsService.assignProductToBatch(assign).subscribe(element => {
        this.data = [...this.data, elementToAssign]
        this.loadBatchDetails(this.batchDetails.id)
      })

    } catch (ex: any) {
      console.log(ex)
    }
  }

  handleDelete(id: string) {
    this.batchDetailsService.unassignProductFromBatch({
      productUnitId: id,
      batchDetailsId: this.batchDetails.id
    }).subscribe(element => {
      this.data = this.data.filter(x => x.id !== id)
      this.loadBatchDetails(this.batchDetails.id)
    })
    this.loadBatchDetails(this.batchDetails.id)

  }

  ngOnInit(): void {
    this.data = this.batchDetails.productBatchToUnitAssignments.map(x => x.productUnit);

    this.batchUnitStatusService.getAll().subscribe(elements => {
      this.batchUnitStatusSignal.set(elements)
    })
  }

  ngOnChanges(): void {
    if (this.batchDetails) {
      this.data = this.batchDetails.productBatchToUnitAssignments.map(x => x.productUnit);
    }
  }


}
