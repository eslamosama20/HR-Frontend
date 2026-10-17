import {Component, ViewChild} from '@angular/core';
import {FormConfig} from "../../../shared-components/entity-manager/common/form-config";
import {Validators} from "@angular/forms";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule} from "@angular/common";
import {BatchStatusModel} from "../../../models/inventory/batchStatus.model";
import {BatchStatusService} from "../../../services/inventory/batch-status.service";
import {TableActions} from "../../../shared-components/entity-manager/common/table-action";
import {Column} from "../../../shared-components/entity-manager/common/columns-config";
import {formatDateToUTCString} from "../../../utils/dateUtils";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import { EntityManagerComponent } from "../../../shared-components/entity-manager/entity-manager.component";

@Component({
  selector: 'app-batch-status',
  standalone: true,
  imports: [EntityManagerModule, CommonModule],
  templateUrl: './batch-status.component.html',
  styleUrl: './batch-status.component.scss'
})
export class BatchStatusComponent {
  @ViewChild(EntityManagerComponent) entityManager!: EntityManagerComponent<any>;
  columns: Column<BatchStatusModel>[]
  entityName = "BatchStatusModel"
  formConfig: FormConfig
  actions: TableActions = {
    edit: {
      name: 'Edit',
    },
    delete: {
      name: 'Delete',
      onClick: (item: BatchStatusModel) => this.handleDelete(item.id)
    },
  }
  private activeLanguage: string = 'en'
  constructor(
    public batchStatusService: BatchStatusService,
    private translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.columns = [
      //{field: 'id', label: 'ID'},
      {
        filter: true,
        filterType: 'text',
        type: 'text',field: 'arabicName', label: this.translate.instant('DATA.ARABIC_NAME'), sortable: true},
      {
        filter: true,
        filterType: 'text',
        type: 'text',field: 'englishName', label: this.translate.instant('DATA.ENGLISH_NAME'), sortable: true},
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

    ];

    this.formConfig = {
      title: this.translate.instant('DATA.BATCH_STATUS'),
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
            {field: 'required', validator: Validators.required, message: 'Arabic Name is required'},
            {
              field: 'minlength',
              validator: Validators.minLength(3),
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_GREATER_THAN_N_CHARACTERS', {n: 3})
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant('DATA.ARABIC_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', {n: 200})
            },

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

          ]
        },
      ]
    }

  }

  public loadData = {
    load: (page: number, size: number, searchQuery: string = '', sortField: string = 'createdAt', sortOrder: number = -1) =>
      this.batchStatusService.searchPaged(searchQuery, page, size, sortField, sortOrder)
  };

  handleOnSubmit(formData: any) {
    try {
      if (formData.id) {
        const updatedElement = new BatchStatusModel(formData)
        this.batchStatusService.update(updatedElement).subscribe(() => {
          this.entityManager?.reload()
        })
      } else {
        const newEntity = new BatchStatusModel(formData)

        if (newEntity.validate()) {
          this.batchStatusService.create(newEntity).subscribe(() => {
            this.entityManager?.reload()
          })
        }
      }
    } catch (ex: any) {
      console.log(ex)
    }
  }

  handleDelete(id: string) {
    this.batchStatusService.delete(id).subscribe(() => {
      this.entityManager?.reload()
    })
  }
}
