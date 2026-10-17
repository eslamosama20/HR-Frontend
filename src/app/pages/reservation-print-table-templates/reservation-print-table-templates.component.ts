import {Component, OnInit, signal, viewChild} from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import {Dropdown, DropdownModule} from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DragDropModule } from 'primeng/dragdrop';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

import { ReservationPrintTableTemplateService } from '../../services/reservations/peservation-print-table-template.service';
import { ReservationPrintTableTemplateModel } from '../../models/reservation/reservation-print-table-template.model';
import { PrintTableColumnModel } from '../../models/reservation/print-table-column.model';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { InputSwitchModule } from 'primeng/inputswitch';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../config/permissions';

interface ColumnOption {
  value: string;
  label: string;
  dataType: "string" | "number" | "date" | "boolean" | "currency";
  category: string;
}

@Component({
  selector: 'app-reservation-print-table-templates',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    CheckboxModule,
    TableModule,
    ToolbarModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    DragDropModule,
    TooltipModule,
    TranslateModule,
    CustomDatePipe,
    InputSwitchModule,
    SelectButtonModule

  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './reservation-print-table-templates.component.html',
  styleUrl: './reservation-print-table-templates.component.scss'
})
export class ReservationPrintTableTemplatesComponent implements OnInit {
  templateForm: FormGroup;
  columnForm: FormGroup;
  templates: ReservationPrintTableTemplateModel[] = [];
  selectedTemplate: ReservationPrintTableTemplateModel | null = null;
  showTemplateDialog = false;
  hasOrderChanged = false;
  savingOrder = false;
  showColumnDialog = false;
  editingColumnIndex = -1;



  loadingSignal = signal(false);
  get loading(): boolean {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  seedingTemplates = false;
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService?.hasPermission(permission) ?? false;
  }

  get isDeveloper(): boolean {
    return this.authService.hasPermission('System.DevOnly.SeedTemplates');
  }

  dataTypes: { label: string; value: string }[] = [];
  alignmentOptions: { label: string; value: string }[] = [];
  availableColumns: ColumnOption[] = [];  constructor(
    private fb: FormBuilder,
    private templateService: ReservationPrintTableTemplateService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
  ) {
    this.initializeForms();
    this.initializeTranslatedData();
  }

  ngOnInit() {
    this.loadTemplates();
  }

  initializeTranslatedData() {
    // Initialize data types with translations
    this.dataTypes = [
      { label: this.translate.instant('FINANCE.TT_TEXT'), value: 'string' },
      { label: this.translate.instant('FINANCE.TT_NUMBER'), value: 'number' },
      { label: this.translate.instant('FINANCE.TT_DATE_TYPE'), value: 'date' },
      { label: this.translate.instant('FINANCE.TT_BOOLEAN'), value: 'boolean' },
      { label: this.translate.instant('FINANCE.TT_CURRENCY'), value: 'currency' }
    ];

    // Initialize alignment options with translations
    this.alignmentOptions = [
      { label: this.translate.instant('FINANCE.TT_LEFT'), value: 'left' },
      { label: this.translate.instant('FINANCE.TT_CENTER'), value: 'center' },
      { label: this.translate.instant('FINANCE.TT_RIGHT'), value: 'right' }
    ];

    // Initialize available columns with translations
    this.availableColumns = [
      // Basic reservation fields
      { value: 'referenceNumber', label: this.translate.instant('FINANCE.TT_REFERENCE_NUMBER'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'guestName', label: this.translate.instant('FINANCE.TT_GUEST_NAME'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'guestPhone', label: this.translate.instant('FINANCE.TT_GUEST_PHONE'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'nationality', label: this.translate.instant('FINANCE.TT_NATIONALITY'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'hotelName', label: this.translate.instant('FINANCE.TT_HOTEL_NAME'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'clientCompanyName', label: this.translate.instant('FINANCE.TT_CLIENT_COMPANY_NAME'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'reservationCompanyName', label: this.translate.instant('FINANCE.TT_RESERVATION_COMPANY_NAME'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'roomType', label: this.translate.instant('FINANCE.TT_ROOM_TYPE'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'arrivalDate', label: this.translate.instant('FINANCE.TT_ARRIVAL_DATE'), dataType: 'date', category: this.translate.instant('FINANCE.TT_DATES') },
      { value: 'departureDate', label: this.translate.instant('FINANCE.TT_DEPARTURE_DATE'), dataType: 'date', category: this.translate.instant('FINANCE.TT_DATES') },
      { value: 'numberOfNights', label: this.translate.instant('FINANCE.TT_NUMBER_OF_NIGHTS'), dataType: 'number', category: this.translate.instant('FINANCE.TT_DATES') },
      { value: 'reservationType', label: this.translate.instant('FINANCE.TT_RESERVATION_TYPE'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },

      // Entity base fields
      { value: 'createdAt', label: this.translate.instant('FINANCE.TT_CREATED_AT'), dataType: 'date', category: this.translate.instant('FINANCE.TT_SYSTEM') },

      // Calculated fields
      { value: 'totalCost', label: this.translate.instant('FINANCE.TT_TOTAL_COST'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'totalAmount', label: this.translate.instant('FINANCE.TT_TOTAL_AMOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'roomCost', label: this.translate.instant('FINANCE.TT_ROOM_COST'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'roomAmount', label: this.translate.instant('FINANCE.TT_ROOM_AMOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'serviceCost', label: this.translate.instant('FINANCE.TT_SERVICE_COST'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'serviceAmount', label: this.translate.instant('FINANCE.TT_SERVICE_AMOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'totalRooms', label: this.translate.instant('FINANCE.TT_TOTAL_ROOMS'), dataType: 'number', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'totalServices', label: this.translate.instant('FINANCE.TT_TOTAL_SERVICES'), dataType: 'number', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'averageRoomRate', label: this.translate.instant('FINANCE.TT_AVERAGE_ROOM_RATE'), dataType: 'string', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'totalTax', label: this.translate.instant('FINANCE.TT_TOTAL_TAX'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'totalDiscount', label: this.translate.instant('FINANCE.TT_TOTAL_DISCOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },
      { value: 'netAmount', label: this.translate.instant('FINANCE.TT_NET_AMOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_CALCULATED') },

      // Totals Summary fields (from ملخّص الإجماليات table in reservation details)
      { value: 'salesAmountWithoutVat', label: this.translate.instant('FINANCE.TT_SALES_AMOUNT_WITHOUT_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'salesVat', label: this.translate.instant('FINANCE.TT_SALES_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'salesTotalWithVat', label: this.translate.instant('FINANCE.TT_SALES_TOTAL_WITH_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'costAmountWithoutVat', label: this.translate.instant('FINANCE.TT_COST_AMOUNT_WITHOUT_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'costVat', label: this.translate.instant('FINANCE.TT_COST_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'costTotalWithVat', label: this.translate.instant('FINANCE.TT_COST_TOTAL_WITH_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'profitWithoutVat', label: this.translate.instant('FINANCE.TT_PROFIT_WITHOUT_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'profitVat', label: this.translate.instant('FINANCE.TT_PROFIT_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'profitTotalWithVat', label: this.translate.instant('FINANCE.TT_PROFIT_TOTAL_WITH_VAT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },
      { value: 'gopPercentage', label: this.translate.instant('FINANCE.TT_GOP_PERCENTAGE'), dataType: 'number', category: this.translate.instant('FINANCE.TT_TOTALS_SUMMARY') },

      // Payment fields
      { value: 'paymentAmount', label: this.translate.instant('FINANCE.TT_PAYMENT_AMOUNT'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_PAYMENTS') },
      { value: 'paymentPaid',   label: this.translate.instant('FINANCE.TT_PAYMENT_PAID'),   dataType: 'currency', category: this.translate.instant('FINANCE.TT_PAYMENTS') },
      { value: 'paymentRemain', label: this.translate.instant('FINANCE.TT_PAYMENT_REMAIN'), dataType: 'currency', category: this.translate.instant('FINANCE.TT_PAYMENTS') },
      // Remarks & State fields
      { value: 'creator',       label: this.translate.instant('FINANCE.TT_CREATOR'),      dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'state',         label: this.translate.instant('FINANCE.TT_STATE'),        dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      // Remarks fields
      { value: 'hotelRemarks', label: this.translate.instant('FINANCE.HOTEL_REMARKS'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
      { value: 'clientRemarks', label: this.translate.instant('FINANCE.CLIENT_REMARKS'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') },
    ];
  }

initializeForms() {
  this.templateForm = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    description: [''],
    pageOrientation: ['Portrait', Validators.required],
    columns: this.fb.array([])
  });

  this.columnForm = this.fb.group({
    columnName: ['', Validators.required],
    displayName: ['', Validators.required],
    dataType: ['string', Validators.required],
    orderIndex: [0, Validators.required],
    isVisible: [true],
    width: [0],
    alignment: ['right', Validators.required]
  });
}



  get columnsFormArray(): FormArray {
    return this.templateForm.get('columns') as FormArray;
  }

  loadTemplates() {
    this.loading = true;
    this.templateService.getAll().subscribe({
      next: (response) => {
        this.templates = [];
        if (response){
          this.templates = response.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        }
        this.loading = false;

      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.TT_ERROR'),
          detail: this.translate.instant('FINANCE.TT_FAILED_TO_LOAD')
        });
        this.loading = false;
      }
    });
  }

 newTemplate() {
  this.selectedTemplate = null;
  this.templateForm.reset();
  this.columnsFormArray.clear();
  this.templateForm.patchValue({
    name: '',
    description: '',
    pageOrientation: 'Portrait',
    columns: []
  });
  this.showTemplateDialog = true;
}


  editTemplate(template: ReservationPrintTableTemplateModel) {
  this.selectedTemplate = template;
  this.templateForm.patchValue({
    id: template.id,
    name: template.name,
    description: template.description,
    pageOrientation: template.pageOrientation || 'Portrait'
  });

  this.columnsFormArray.clear();
  if (template.columns) {
    template.columns.forEach(column => {
      this.columnsFormArray.push(this.createColumnFormGroup(column));
    });
  }

  this.showTemplateDialog = true;
}


  createColumnFormGroup(column?: PrintTableColumnModel): FormGroup {
    return this.fb.group({
      id: [column?.id || ''],
      columnName: [column?.columnName || '', Validators.required],
      displayName: [column?.displayName || '', Validators.required],
      dataType: [column?.dataType || 'string', Validators.required],
      orderIndex: [column?.orderIndex || 0, Validators.required],
      isVisible: [column?.isVisible !== false],
      width: [column?.width || 0],
      alignment: [column?.alignment || 'left', Validators.required]
    });
  }

  addColumn() {
    this.editingColumnIndex = -1;
    this.columnForm.reset({
      columnName: '',
      displayName: '',
      dataType: 'string',
      orderIndex: this.columnsFormArray.length,
      isVisible: true,
      width: 0,
      alignment: 'left'
    });
    this.showColumnDialog = true;
  }

  editColumn(index: number) {
    this.editingColumnIndex = index;
    const column = this.columnsFormArray.at(index).value;
    this.columnForm.patchValue(column);
    this.showColumnDialog = true;
  }

  saveColumn() {
    if (this.columnForm.valid) {
      const columnData = this.columnForm.value;

      // Check for duplicate column names
      const existingColumns = this.columnsFormArray.value;
      const isDuplicate = existingColumns.some((col, index) =>
        col.columnName === columnData.columnName && index !== this.editingColumnIndex
      );

      if (isDuplicate) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.instant('FINANCE.TT_DUPLICATE_COLUMN'),
          detail: this.translate.instant('FINANCE.TT_DUPLICATE_COLUMN_MESSAGE')
        });
        return;
      }

      if (this.editingColumnIndex >= 0) {
        this.columnsFormArray.at(this.editingColumnIndex).patchValue(columnData);
      } else {
        this.columnsFormArray.push(this.createColumnFormGroup(columnData));
      }

      this.showColumnDialog = false;
      this.updateColumnOrderIndexes();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.columnForm.controls).forEach(key => {
        this.columnForm.get(key)?.markAsTouched();
      });
    }
  }

  removeColumn(index: number) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to remove this column?',
      accept: () => {
        this.columnsFormArray.removeAt(index);
        this.updateColumnOrderIndexes();
      }
    });
  }

  moveColumnUp(index: number) {
    if (index > 0) {
      const column = this.columnsFormArray.at(index);
      this.columnsFormArray.removeAt(index);
      this.columnsFormArray.insert(index - 1, column);
      this.updateColumnOrderIndexes();
    }
  }

  moveColumnDown(index: number) {
    if (index < this.columnsFormArray.length - 1) {
      const column = this.columnsFormArray.at(index);
      this.columnsFormArray.removeAt(index);
      this.columnsFormArray.insert(index + 1, column);
      this.updateColumnOrderIndexes();
    }
  }

  updateColumnOrderIndexes() {
    this.columnsFormArray.controls.forEach((control, index) => {
      control.patchValue({ orderIndex: index });
    });
  }

  onColumnSelect(columnOption: ColumnOption, dropdown: Dropdown) {
    if (columnOption) {
      this.columnForm.patchValue({
        columnName: columnOption.value,
        displayName: columnOption.label,
        dataType: columnOption.dataType
      });
      dropdown.clear();

    }
  }

  getColumnOption(value: string): ColumnOption | undefined {
    return this.availableColumns.find(col => col.value === value);
  }

  moveTemplateUp(index: number, event: Event) {
    event.stopPropagation();
    if (index <= 0) return;
    this.swapTemplateOrder(index, index - 1);
  }

  moveTemplateDown(index: number, event: Event) {
    event.stopPropagation();
    if (index >= this.templates.length - 1) return;
    this.swapTemplateOrder(index, index + 1);
  }

  private swapTemplateOrder(indexA: number, indexB: number) {
    const templateA = this.templates[indexA];
    const templateB = this.templates[indexB];

    const orderA = templateA.displayOrder ?? indexA;
    const orderB = templateB.displayOrder ?? indexB;

    templateA.displayOrder = orderB;
    templateB.displayOrder = orderA;

    // Swap in local array for immediate visual feedback
    this.templates[indexA] = templateB;
    this.templates[indexB] = templateA;
    this.templates = [...this.templates];

    // Mark order as changed — user must click "Save Order" to persist
    this.hasOrderChanged = true;
  }

  saveTemplateOrder() {
    if (!this.hasOrderChanged) return;
    this.savingOrder = true;
    // Reassign displayOrder based on current array position before saving
    this.templates.forEach((t, index) => t.displayOrder = index);
    const updates$ = this.templates.map(t => this.templateService.update(t));
    forkJoin(updates$).subscribe({
      next: () => {
        this.hasOrderChanged = false;
        this.savingOrder = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.TT_SUCCESS'),
          detail: this.translate.instant('FINANCE.TT_ORDER_SAVED')
        });
      },
      error: () => {
        this.savingOrder = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.TT_ERROR'),
          detail: this.translate.instant('FINANCE.TT_FAILED_TO_SAVE_ORDER')
        });
      }
    });
  }

  saveTemplate() {
    if (this.templateForm.valid && this.columnsFormArray.length > 0) {
      this.loading = true;
      const templateData = new ReservationPrintTableTemplateModel({
        ...this.templateForm.value,
        columns: this.columnsFormArray.value.map((col, index) => new PrintTableColumnModel({
          ...col,
          orderIndex: index
        }))
      });

      const saveOperation = this.selectedTemplate
        ? this.templateService.update(templateData)
        : this.templateService.create(templateData);

      saveOperation.subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Template ${this.selectedTemplate ? 'updated' : 'created'} successfully`
          });
          this.showTemplateDialog = false;
          this.loadTemplates();
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${this.selectedTemplate ? 'update' : 'create'} template`
          });
          this.loading = false;
        }
      });
    } else {
      if (this.columnsFormArray.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please add at least one column to the template'
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill in all required fields'
        });
      }

      // Mark all fields as touched to show validation errors
      Object.keys(this.templateForm.controls).forEach(key => {
        this.templateForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteTemplate(template: ReservationPrintTableTemplateModel) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete template "${template.name}"?`,
      accept: () => {
        this.loading = true;
        this.templateService.delete(template.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Template deleted successfully'
            });
            this.loadTemplates();
            this.loading = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete template'
            });
            this.loading = false;
          }
        });
      }
    });
  }

  seedDefaultTemplates() {
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.TT_SEED_CONFIRM_MSG'),
      header: this.translate.instant('FINANCE.TT_SEED_CONFIRM_TITLE'),
      icon: 'pi pi-info-circle',
      accept: () => {
        this.seedingTemplates = true;
        this.templateService.seedDefaultTemplates().subscribe({
          next: (res) => {
            let insertedCount = res?.data ?? 0;
            const successDetail = (this.translate.currentLang === 'ar')
              ? `تم توليد ${insertedCount} قوالب بنجاح.`
              : `Successfully seeded ${insertedCount} templates.`;
            this.messageService.add({
              severity: 'success',
              summary: this.translate.currentLang === 'ar' ? 'نجاح' : 'Success',
              detail: successDetail
            });
            this.loadTemplates();
            this.seedingTemplates = false;
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.currentLang === 'ar' ? 'خطأ' : 'Error',
              detail: this.translate.instant('FINANCE.TT_SEED_FAILED_MSG')
            });
            this.seedingTemplates = false;
          }
        });
      }
    });
  }

  private generateSampleReservationData() {
    return [
      {
        id: '1',
        referenceNumber: 'RES-2024-001',
        guestName: 'John Smith',
        guestPhone: '+1-555-0123',
        nationality: 'American',
        arrivalDate: new Date('2024-12-25'),
        departureDate: new Date('2024-12-30'),
        numberOfNights: 5,
        reservationType: 'HotelDirect',
        createdAt: new Date('2024-12-01'),
        createdBy: 'admin',
        isActive: true,
        // Calculated fields
        totalCost: 2500.00,
        totalAmount: 2875.00,
        roomCost: 2000.00,
        roomAmount: 2300.00,
        serviceCost: 500.00,
        serviceAmount: 575.00,
        totalRooms: 2,
        totalServices: 3,
        averageRoomRate: 460.00,
        totalTax: 287.50,
        totalDiscount: 100.00,
        netAmount: 2775.00
      },
      {
        id: '2',
        referenceNumber: 'RES-2024-002',
        guestName: 'Marie Dubois',
        guestPhone: '+33-1-23-45-67-89',
        nationality: 'French',
        arrivalDate: new Date('2024-12-28'),
        departureDate: new Date('2025-01-02'),
        numberOfNights: 5,
        reservationType: 'AgentDirect',
        createdAt: new Date('2024-12-02'),
        createdBy: 'agent1',
        isActive: true,
        // Calculated fields
        totalCost: 1800.00,
        totalAmount: 2070.00,
        roomCost: 1500.00,
        roomAmount: 1725.00,
        serviceCost: 300.00,
        serviceAmount: 345.00,
        totalRooms: 1,
        totalServices: 2,
        averageRoomRate: 345.00,
        totalTax: 207.00,
        totalDiscount: 50.00,
        netAmount: 2020.00
      }
    ];
  }
}
