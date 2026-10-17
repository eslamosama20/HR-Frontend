import {Component, ViewChild} from '@angular/core';
import {FormConfig} from "../../../shared-components/entity-manager/common/form-config";
import {Validators} from "@angular/forms";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule} from "@angular/common";
import {MeasurementUnitService} from "../../../services/inventory/measurement-unit.service";
import {MeasurementUnitModel} from "../../../models/inventory/measurementUnit.model";
import {TableActions} from "../../../shared-components/entity-manager/common/table-action";
import {formatDateToUTCString} from "../../../utils/dateUtils";
import {Column} from "../../../shared-components/entity-manager/common/columns-config";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {CustomValidators} from "../../../utils/CustomValidators";
import { EntityManagerComponent } from "../../../shared-components/entity-manager/entity-manager.component";

@Component({
  selector: 'app-measurement-unit',
  standalone: true,
  imports: [EntityManagerModule, CommonModule],
  templateUrl: './measurement-unit.component.html',
  styleUrl: './measurement-unit.component.scss'
})
export class MeasurementUnitComponent {
  @ViewChild(EntityManagerComponent) entityManager!: EntityManagerComponent<any>;
  columns: Column<MeasurementUnitModel>[]
  entityName = "MeasurementUnitModel"
  formConfig: FormConfig
  actions: TableActions = {
    view: {
      name: 'View',
      // لا حاجة لـ onClick هنا لأن entity-manager سيستدعي handleAction تلقائياً
    },
    edit: {
      name: 'Edit',
    },
    delete: {
      name: 'Delete',
      onClick: (item: MeasurementUnitModel) => this.handleDelete(item.id)
    },
  }


  private activeLanguage: string = 'en'
  constructor(
    public measurementUnitService: MeasurementUnitService,
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
        type: 'text',
        field: 'arabicSymbol', label: this.translate.instant('DATA.ARABIC_SYMBOL'), sortable: true},
      {
        filter: true,
        filterType: 'text',
        type: 'text',
        field: 'englishSymbol', label: this.translate.instant('DATA.ENGLISH_SYMBOL'), sortable: true},
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
      title: this.translate.instant('DATA.MEASUREMENT_UNIT'),
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
              validator: CustomValidators.requiredNoWhitespace(),
              message: this.translate.instant('DATA.ARABIC_NAME_IS_REQUIRED'),
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant(
                'DATA.ARABIC_NAME_MUST_BE_LESS_THAN_N_CHARACTERS',
                { n: 200 }
              ),
            },
          ],
        },
        {
          field: 'englishName',
          label: this.translate.instant('DATA.ENGLISH_NAME'),
          type: 'text',
          required: true,
          validations: [
            {
              field: 'required',
              validator: CustomValidators.requiredNoWhitespace(),
              message: this.translate.instant('DATA.ENGLISH_NAME_IS_REQUIRED'),
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(200),
              message: this.translate.instant(
                'DATA.ENGLISH_NAME_MUST_BE_LESS_THAN_N_CHARACTERS',
                { n: 200 }
              ),
            },
          ],
        },
        {
          field: 'arabicSymbol',
          label: this.translate.instant('DATA.ARABIC_SYMBOL'),
          type: 'text',
          required: true,
          validations: [
            {
              field: 'required',
              validator: CustomValidators.requiredNoWhitespace(),
              message: 'Arabic Symbol is required',
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'Arabic Symbol must be less than 100 characters long',
            },
          ],
        },
        {
          field: 'englishSymbol',
          label: this.translate.instant('DATA.ENGLISH_SYMBOL'),
          type: 'text',
          required: true,
          validations: [
            {
              field: 'required',
              validator: CustomValidators.requiredNoWhitespace(),
              message: 'English Symbol is required',
            },
            {
              field: 'maxlength',
              validator: Validators.maxLength(100),
              message: 'English Symbol must be less than 100 characters long',
            },
          ],
        },
      ],
    };
  }

  public loadData = {
    load: (page: number, size: number, searchQuery: string = '', sortField: string = 'createdAt', sortOrder: number = -1) =>
      this.measurementUnitService.searchPaged(searchQuery, page, size, sortField, sortOrder)
  };

  handleOnSubmit(formData: any) {
    try {
      if (formData.id) {
        const updatedElement = new MeasurementUnitModel(formData)
        this.measurementUnitService.update(updatedElement).subscribe(() => {
          this.entityManager?.reload()
        })
      } else {
        const newMeasurementUnit = new MeasurementUnitModel(formData)

        if (newMeasurementUnit.validate()) {
          this.measurementUnitService.create(newMeasurementUnit).subscribe(() => {
            this.entityManager?.reload()
          })
        }
      }

    } catch (ex: any) {
      console.log(ex)
    }
  }

  handleDelete(id: string) {
    this.measurementUnitService.delete(id).subscribe(() => {
      this.entityManager?.reload()
    })
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    try {
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
          console.warn('Invalid Date object:', dateValue);
          return null;
        }
        return dateValue;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue);
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Error parsing date:', dateValue, error);
      return null;
    }
  }

  private ensureValidDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    if (dateValue === null || dateValue === undefined) {
      return null;
    }

    if (typeof dateValue === 'string' && dateValue.trim() === '') {
      return null;
    }

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }

    const parsedDate = this.parseDate(dateValue);
    if (
      parsedDate &&
      parsedDate instanceof Date &&
      !isNaN(parsedDate.getTime())
    ) {
      return parsedDate;
    }

    return null;
  }
}
