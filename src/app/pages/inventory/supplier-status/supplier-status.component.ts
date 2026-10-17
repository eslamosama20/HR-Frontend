import {Component, ViewChild} from '@angular/core';
import {FormConfig} from "../../../shared-components/entity-manager/common/form-config";
import {Validators} from "@angular/forms";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule} from "@angular/common";
import {SupplierStatusModel} from "../../../models/inventory/supplierStatus.model";
import {SupplierStatusService} from "../../../services/inventory/supplier-status.service";
import {TableActions} from "../../../shared-components/entity-manager/common/table-action";
import {formatDateToUTCString} from "../../../utils/dateUtils";
import {Column} from "../../../shared-components/entity-manager/common/columns-config";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import { EntityManagerComponent } from "../../../shared-components/entity-manager/entity-manager.component";

@Component({
  selector: 'app-supplier-status',
  standalone: true,
  imports: [EntityManagerModule, CommonModule],
  templateUrl: './supplier-status.component.html',
  styleUrl: './supplier-status.component.scss'
})
export class SupplierStatusComponent {
  @ViewChild(EntityManagerComponent) entityManager!: EntityManagerComponent<any>;
  columns: Column<SupplierStatusModel>[]
  entityName = "SupplierStatusModel"
  formConfig: FormConfig
  actions: TableActions = {
    edit: {
      name: 'Edit',

    },
    delete: {
      name: 'Delete',

      onClick: (item: SupplierStatusModel) => this.handleDelete(item.id)
    },
  }


  private activeLanguage: string = 'en'
  constructor(
    public supplierStatusService: SupplierStatusService,
    private translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.columns = [
      //{field: 'id', label: 'ID'},
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
      title: this.translate.instant('DATA.SUPPLIER_STATUS'),
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
              validator: Validators.maxLength(20),
              message: this.translate.instant('DATA.ENGLISH_NAME_MUST_BE_LESS_THAN_N_CHARACTERS', {n: 20})
            },
          ]
        },
      ]
    }
  }

  public loadData = {
    load: (page: number, size: number, searchQuery: string = '', sortField: string = 'createdAt', sortOrder: number = -1) =>
      this.supplierStatusService.searchPaged(searchQuery, page, size, sortField, sortOrder)
  };

  handleOnSubmit(formData: any) {
    try {
      if (formData.id) {
        const updatedElement = new SupplierStatusModel(formData)
        this.supplierStatusService.update(updatedElement).subscribe(element => {
          this.entityManager?.reload();
        })
      } else {
        const newEntity = new SupplierStatusModel(formData)

        if (newEntity.validate()) {
          this.supplierStatusService.create(newEntity).subscribe(element => {
            this.entityManager?.reload();
          })
        }
      }
    } catch (ex: any) {
      console.log(ex)
    }
  }


  handleDelete(id: string) {
    this.supplierStatusService.delete(id).subscribe(element => {
      this.entityManager?.reload();
    })
  }
}
