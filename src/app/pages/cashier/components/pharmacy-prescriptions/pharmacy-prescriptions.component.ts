import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabview';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import {
  PharmacyAllocationLineStatus,
  PharmacyAllocationMode,
  PharmacyAllocationPreparationResult,
  PharmacyAllocationState,
  PharmacyBackendCommitMode
} from 'src/app/models/cashier/pharmacy-allocation.model';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, forkJoin, map, of, switchMap, Observable } from 'rxjs';
import {
  PharmacyAllocateDispenseResult,
  PharmacyApiService,
  PharmacyProductLookupItem
} from 'src/app/services/cashier/pharmacy-api.service';
import { PharmacyAllocationService } from 'src/app/services/cashier/pharmacy-allocation.service';
import { PharmacyInventoryService } from 'src/app/services/cashier/pharmacy-inventory.service';
import {
  ManualCreatePrescriptionRequest,
  PharmacySupportApiService
} from 'src/app/services/cashier/pharmacy-support-api.service';
import { isGuidString, normalizeId } from 'src/app/core/types/ids.types';
import { PharmacyInventoryBatchOption } from 'src/app/models/cashier/pharmacy-inventory.model';
import { isPharmacyStore, StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { AuthService } from 'src/app/modules/auth';
import { formatDateToString } from 'src/app/utils/dateUtils';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type PrescriptionStatus = 'new' | 'review' | 'dispensing' | 'ready' | 'delivered' | 'cancelled';
type Priority = 'normal' | 'urgent';
type PaymentType = 'cash' | 'insurance';
type InsuranceStatus = 'none' | 'pending' | 'approved' | 'rejected';
type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

interface PrescriptionItem {
  id: number;
  mainPurchaseClassId?: string;
  /** FNV int from `GET .../items/lookup` when row was picked from pharmacy catalog API. */
  pharmacyCatalogItemId?: number;
  itemCode?: string;
  itemName: string;
  dosageForm: string;
  strength: string;
  storeId?: string;
  storeName?: string;
  batchId?: string;
  batchNo?: string;
  expiryDate?: string;
  availableQuantity?: number;
  unitPrice: number;
  requestedQuantity: number;
  dispensedQuantity: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  instructions: string;
  allowAlternative: boolean;
  isControlled?: boolean;
  needsBatch?: boolean;
  needsExpiry?: boolean;
  isPharmacyItem?: boolean;
  status: 'pending' | 'dispensed' | 'shortage';
}

interface PrescriptionOrder {
  id: number;
  /** API prescription id (GUID) for REST paths when different from numeric `id`. */
  serverPrescriptionId?: string;
  rxNo: string;
  patientName: string;
  doctorName: string;
  paymentType: PaymentType;
  insuranceName: string;
  insuranceStatus: InsuranceStatus;
  insuranceDetails?: {
    memberNo: string;
    approvalNo: string;
    coveragePercentage: number;
    patientSharePercentage: number;
    /** Guid string (PharmacyInsuranceCompany) when provided by API */
    insuranceCompanyId?: string | number;
  };
  financials: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    insuranceCovered: number;
    patientPayable: number;
    grandTotal: number;
  };
  dispensedBy: string;
  itemsCount: number;
  items: PrescriptionItem[];
  priority: Priority;
  status: PrescriptionStatus;
  createdAt: Date;
  notes: string;
  attachments: PrescriptionAttachment[];
  allocationState?: PharmacyAllocationState | null;
}

interface PrescriptionAttachment {
  id: number;
  fileName: string;
  fileSize: string;
  uploadDate: Date;
  type: 'rx_image' | 'other';
  previewUrl?: string;
  url?: string;
}

interface PrescriptionDraft {
  patientId?: string;
  rxNo: string;
  issueDate: string;
  patientName: string;
  doctorName: string;
  paymentType: PaymentType;
  /** PharmacyInsuranceCompany id (Guid) for `POST .../insurance/verify`. */
  insuranceCompanyId?: string;
  insuranceName: string;
  insuranceMemberNo: string;
  insuranceApprovalNo: string;
  insuranceCoverage: number;
  priority: Priority;
  notes: string;
  items: PrescriptionItem[];
  attachments: PrescriptionAttachment[];
}

interface ItemDraft {
  itemId?: number;
  /** FNV int from pharmacy items lookup API (batch / check-stock). */
  pharmacyCatalogItemId?: number;
  mainPurchaseClassId?: string;
  itemCode: string;
  itemName: string;
  dosageForm: string;
  strength: string;
  storeId?: string;
  storeName: string;
  batchNo?: string;
  expiryDate?: string;
  selectedBatchKey?: string;
  needsBatch?: boolean;
  needsExpiry?: boolean;
  isPharmacyItem?: boolean;
  isControlled?: boolean;
  availableQuantity: number;
  unitPrice: number;
  requestedQuantity: number;
  instructions: string;
  allowAlternative: boolean;
}

interface InteractionAlert {
  firstDrug: string;
  secondDrug: string;
  severity: 'high' | 'medium';
  message: string;
}

interface DispenseDraft {
  storeId?: string;
  storeName?: string;
  batchNo?: string;
  expiryDate?: string;
  availableQuantity?: number;
  dispensedQuantity?: number;
  paymentMethod: PaymentType;
  amount: number;
}

interface InsuranceDraft {
  insuranceName: string;
  memberNo: string;
  approvalNo: string;
  coveredAmount: number;
  patientShare: number;
}

@Component({
  selector: 'app-pharmacy-prescriptions',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TabViewModule,
    FileUploadModule,
    ProgressBarModule,
    MenuModule
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-prescriptions.component.html',
  styleUrls: ['./pharmacy-prescriptions.component.scss']
})
export class PharmacyPrescriptionsComponent implements OnInit {
  loading = signal<boolean>(false);
  orders = signal<PrescriptionOrder[]>([]);
  selectedOrder = signal<PrescriptionOrder | null>(null);

  actionMenuItems: MenuItem[] = [];
  activeMenuOrder: PrescriptionOrder | null = null;

  searchTerm = '';
  productSearchTerm = '';
  selectedStatus: PrescriptionStatus | 'all' = 'all';
  selectedPriority: Priority | 'all' = 'all';

  showDetailsDialog = false;
  showPrescriptionDialog = false;
  showItemsDialog = false;
  showDispenseDialog = false;
  showInsuranceDialog = false;
  showCancelDialog = false;
  showControlledWarningDialog = false;

  // ── Wasfaty Integration (Saudi Market) ───────────────────────────────────
  showWasfatyDialog = false;
  isWasfatyImported = false;
  wasfatyLookup = { nationalId: '', rxNumber: '' };

  editingOrderId: number | null = null;
  editingItemsOrderId: number | null = null;
  dispensingOrderId: number | null = null;
  insuranceOrderId: number | null = null;
  cancelOrderId: number | null = null;

  prescriptionDraft: PrescriptionDraft = this.createEmptyPrescriptionDraft();
  itemDraft: ItemDraft = this.createEmptyItemDraft();
  dispenseDraft: DispenseDraft = this.createEmptyDispenseDraft();
  insuranceDraft: InsuranceDraft = this.createEmptyInsuranceDraft();
  cancelReason = '';
  private sendingToPos = new Set<number>();
  private allocationStateByOrderId = new Map<number, PharmacyAllocationState>();

  get paymentOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.PAY_CASH'), value: 'cash' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.PAY_INSURANCE'), value: 'insurance' }
    ];
  }

  get insuranceStatusOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_NONE'), value: 'none' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_PENDING'), value: 'pending' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_APPROVED'), value: 'approved' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_REJECTED'), value: 'rejected' }
    ];
  }

  get dosageFormOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_TABLETS'), value: 'أقراص' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_SYRUP'), value: 'شراب' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_CAPSULES'), value: 'كبسولات' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_CREAM'), value: 'كريم' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_DROPS'), value: 'قطرة' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.DOSE_INJECTIONS'), value: 'حقن' }
    ];
  }

  itemBatchOptions: Array<{ label: string; value: string }> = [];
  dispenseStoreOptions: Array<{ label: string; value: string }> = [];
  dispenseBatchOptions: Array<{ label: string; value: string }> = [];
  pharmacyStoreOptions: Array<{ label: string; value: string }> = [];
  pricingMode = signal<'retail' | 'wholesale' | 'bulk'>('retail');
  selectedPharmacyStoreDetailsId = '';
  pharmacyStoresLoading = false;
  /** Rows from `GET .../pharmacy/items/lookup` (debounced by search term). */
  medicationLookupResults: PharmacyProductLookupItem[] = [];
  insuranceCompanyOptions: Array<{ label: string; value: string }> = [];
  private medicationSearchTimer: ReturnType<typeof setTimeout> | null = null;
  currentInteractionAlertsList: InteractionAlert[] = [];
  draftInteractionAlertsList: InteractionAlert[] = [];
  inventoryLookupLoading = false;
  batchesLoading = false;
  savingPrescription = false;
  allocationPreview: PharmacyAllocationPreparationResult | null = null;
  allocationPreviewLoading = false;
  showImagePreviewDialog = false;
  previewImageSrc = '';
  previewImageTitle = '';
  private currentProductBatches: PharmacyInventoryBatchOption[] = [];

  selectedPaymentType: string = 'all';

  get statusOptions() {
    return [
      { label: 'كل الحالات', value: 'all' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_NEW'), value: 'new' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_REVIEW'), value: 'review' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_DISPENSING'), value: 'dispensing' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_READY'), value: 'ready' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_DELIVERED'), value: 'delivered' }
    ];
  }

  get priorityOptions() {
    return [
      { label: 'كل الأولويات', value: 'all' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.PRIORITY_NORMAL'), value: 'normal' },
      { label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.PRIORITY_URGENT'), value: 'urgent' }
    ];
  }

  get filterPaymentOptions() {
    return [
      { label: 'كل أنواع السداد', value: 'all' },
      { label: 'نقدي (Cash)', value: 'cash' },
      { label: 'تأمين طبي (Insurance)', value: 'insurance' }
    ];
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedPriority = 'all';
    this.selectedPaymentType = 'all';
    this.cdr.markForCheck();
  }

  get filteredOrders(): PrescriptionOrder[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.orders().filter(order => {
      if (order.status === 'cancelled') {
        return false;
      }
      const statusMatch = this.selectedStatus === 'all' || order.status === this.selectedStatus;
      const priorityMatch = this.selectedPriority === 'all' || order.priority === this.selectedPriority;
      const paymentMatch = this.selectedPaymentType === 'all' || (order.paymentType || 'cash') === this.selectedPaymentType;
      const textMatch = !keyword || `${order.rxNo} ${order.patientName} ${order.doctorName} ${order.insuranceName}`
        .toLowerCase()
        .includes(keyword);
      return statusMatch && priorityMatch && paymentMatch && textMatch;
    });
  }

  get totalPrescriptionsCount(): number {
    return this.orders().filter(order => order.status !== 'cancelled').length;
  }

  get newCount(): number {
    return this.orders().filter(order => order.status === 'new').length;
  }

  get dispensingCount(): number {
    return this.orders().filter(order => order.status === 'dispensing').length;
  }

  get readyCount(): number {
    return this.orders().filter(order => order.status === 'ready').length;
  }

  get deliveredCount(): number {
    return this.orders().filter(order => order.status === 'delivered').length;
  }

  get urgentCount(): number {
    return this.orders().filter(order => order.status !== 'cancelled' && order.priority === 'urgent').length;
  }

  get insuranceOrdersCount(): number {
    return this.orders().filter(order => order.status !== 'cancelled' && order.paymentType === 'insurance').length;
  }

  get draftItems(): PrescriptionItem[] {
    return this.prescriptionDraft.items;
  }

  get currentInteractionAlerts(): InteractionAlert[] {
    return this.currentInteractionAlertsList;
  }

  get draftInteractionAlerts(): InteractionAlert[] {
    return this.draftInteractionAlertsList;
  }

  patientOptions: Array<{ label: string; value: string; patient: any }> = [];

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private pharmacyApiService: PharmacyApiService,
    private pharmacySupportApiService: PharmacySupportApiService,
    private pharmacyInventoryService: PharmacyInventoryService,
    private pharmacyAllocationService: PharmacyAllocationService,
    private storeDetailsService: StoreDetailsService,
    private cashierService: CashierService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get canCreatePrescription(): boolean {
    return this.authService.hasPermission('Pharmacy.Prescriptions.Create') || this.authService.hasPermission('Pharmacy.Create');
  }

  get canDispensePrescription(): boolean {
    return this.authService.hasPermission('Pharmacy.Prescriptions.Dispense') || this.authService.hasPermission('Pharmacy.Create');
  }

  get canCancelPrescription(): boolean {
    return this.authService.hasPermission('Pharmacy.Prescriptions.Cancel') || this.authService.hasPermission('Pharmacy.Update');
  }

  get canSyncWasfaty(): boolean {
    return this.authService.hasPermission('Pharmacy.Prescriptions.WasfatySync');
  }

  ngOnInit(): void {
    const savedMode = (localStorage.getItem('pos_pricing_mode') as 'retail' | 'wholesale' | 'bulk') || 'retail';
    if (savedMode === 'wholesale' || savedMode === 'bulk' || savedMode === 'retail') {
      this.pricingMode.set(savedMode);
    }
    this.refreshOrders();
    this.loadInsuranceCompanyOptions();
    this.loadPatientOptions();
  }

  switchPricingMode(mode: 'retail' | 'wholesale' | 'bulk'): void {
    this.pricingMode.set(mode);
    try {
      localStorage.setItem('pos_pricing_mode', mode);
    } catch {}

    // Update current itemDraft price if an item is currently chosen in the form
    if (this.itemDraft.itemCode || this.itemDraft.mainPurchaseClassId) {
      const lookup = this.medicationLookupResults.find(m => m.itemCode === this.itemDraft.itemCode || (m.mainPurchaseClassId && m.mainPurchaseClassId === this.itemDraft.mainPurchaseClassId));
      if (lookup) {
        this.itemDraft.unitPrice = this.getItemPrice(lookup);
      }
    }

    if (this.prescriptionDraft.items.length) {
      this.prescriptionDraft = {
        ...this.prescriptionDraft,
        items: this.prescriptionDraft.items.map(item => {
          const lookup = this.medicationLookupResults.find(m => m.itemCode === item.itemCode || (m.mainPurchaseClassId && m.mainPurchaseClassId === item.mainPurchaseClassId));
          if (lookup) {
            const newUnitPrice = this.getItemPrice(lookup);
            const sub = item.requestedQuantity * newUnitPrice;
            const tax = sub * 0.15;
            return {
              ...item,
              unitPrice: newUnitPrice,
              taxAmount: tax,
              totalAmount: sub + tax
            };
          }
          return item;
        })
      };
    }
  }

  openActionsMenu(event: MouseEvent, menu: any, order: PrescriptionOrder): void {
    this.activeMenuOrder = order;
    const isReadyOrDelivered = order.status === 'ready' || order.status === 'delivered';
    const isCancelled = order.status === 'cancelled';

    this.actionMenuItems = [
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.VIEW_DETAILS') || 'عرض التفاصيل',
        icon: 'pi pi-eye',
        command: () => this.openDetails(order)
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOOLTIP_EDIT') || 'تعديل الروشتة',
        icon: 'pi pi-pencil',
        command: () => this.openEditPrescription(order)
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOOLTIP_INSURANCE') || 'بيانات التأمين',
        icon: 'pi pi-wallet',
        command: () => this.openInsuranceDialog(order)
      },
      {
        separator: true
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SET_READY') || 'تجهيز للصرف (جاهزة)',
        icon: 'pi pi-check',
        disabled: isReadyOrDelivered || isCancelled,
        command: () => this.setStatus(order, 'ready')
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOOLTIP_SEND_POS') || 'إرسال لنقطة البيع (POS)',
        icon: 'pi pi-send',
        disabled: !isReadyOrDelivered || isCancelled,
        command: () => this.sendToPOS(order)
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOOLTIP_PRINT') || 'طباعة الروشتة',
        icon: 'pi pi-print',
        command: () => this.printPrescription(order)
      },
      {
        separator: true
      },
      {
        label: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOOLTIP_CANCEL') || 'إلغاء الروشتة',
        icon: 'pi pi-times',
        styleClass: 'text-danger',
        disabled: isCancelled,
        command: () => this.openCancelDialog(order)
      }
    ];

    menu.toggle(event);
  }

  getItemPrice(row: PharmacyProductLookupItem): number {
    const mode = this.pricingMode();
    if (mode === 'wholesale' && (row.wholesalePrice ?? 0) > 0) {
      return row.wholesalePrice!;
    }
    if (mode === 'bulk' && (row.bulkPrice ?? 0) > 0) {
      return row.bulkPrice!;
    }
    if (mode === 'retail' && (row.retailPrice ?? 0) > 0) {
      return row.retailPrice!;
    }
    return Number(row.unitPrice ?? row.retailPrice ?? row.wholesalePrice ?? 0);
  }

  loadPatientOptions(): void {
    this.pharmacySupportApiService.getPatients(1, 200).subscribe({
      next: (patients) => {
        this.patientOptions = (patients || []).map((p) => ({
          label: `${p.fullName} (${p.nationalId || p.patientCode || ''})`,
          value: p.fullName,
          patient: p
        }));
      },
      error: () => {
        this.patientOptions = [];
      }
    });
  }

  onPatientSelect(selectedValue: string): void {
    const match = this.patientOptions.find((o) => o.value === selectedValue || o.patient?.fullName === selectedValue);
    if (match && match.patient) {
      this.prescriptionDraft.patientId = match.patient.id;
      this.prescriptionDraft.patientName = match.patient.fullName;
      if (match.patient.insuranceClass || match.patient.hasInsurance) {
        this.prescriptionDraft.paymentType = 'insurance';
        this.prescriptionDraft.insuranceName = match.patient.insuranceClass || '';
      }
    } else {
      this.prescriptionDraft.patientId = undefined;
      this.prescriptionDraft.patientName = selectedValue;
    }
  }

  refreshOrders(): void {
    this.loading.set(true);
    this.pharmacyApiService
      .getPrescriptions({
        page: 1,
        pageSize: 50,
        status: this.selectedStatus === 'all' ? undefined : this.selectedStatus
      })
      .subscribe({
        next: (response) => {
          this.orders.set(
            (response.items as unknown as PrescriptionOrder[]).map((order) => this.applyAllocationState(order))
          );
          this.loading.set(false);
        },
        error: () => {
          this.orders.set([]);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_LOAD_RX')
          });
        }
      });
  }

  openDetails(order: PrescriptionOrder): void {
    this.selectedOrder.set(order);
    this.showDetailsDialog = true;
    this.loadPrescriptionDetails(order);
  }

  openNewPrescription(): void {
    this.editingOrderId = null;
    this.isWasfatyImported = false; // Reset wasfaty state for new manual Rx
    this.prescriptionDraft = this.createEmptyPrescriptionDraft();
    this.itemDraft = this.createEmptyItemDraft();
    this.currentProductBatches = [];
    this.itemBatchOptions = [];
    this.productSearchTerm = '';
    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    this.selectedPharmacyStoreDetailsId = currentSession?.storeDetailsId ? String(currentSession.storeDetailsId) : '';
    this.medicationLookupResults = [];
    this.showPrescriptionDialog = true;
    this.loadPharmacyStoreOptions();
    this.loadPatientOptions();
  }

  importFromWasfaty(): void {
    this.messageService.add({
      severity: 'info',
      summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_INFO'),
      detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_WASFATY_MVP')
    });
    this.showWasfatyDialog = false;
  }

  openDirectDispense(): void {
    this.openNewPrescription();
    this.prescriptionDraft.priority = 'urgent';
    this.prescriptionDraft.notes = this.translateService.instant('PHARMACY_PRESCRIPTIONS.BTN_DIRECT');
  }

  openEditPrescription(order: PrescriptionOrder): void {
    this.editingOrderId = order.id;
    this.isWasfatyImported = false;

    const applyDraft = (sourceOrder: PrescriptionOrder) => {
      const ins = sourceOrder.insuranceDetails;
      this.prescriptionDraft = {
        rxNo: sourceOrder.rxNo,
        issueDate: this.toInputDate(sourceOrder.createdAt),
        patientName: sourceOrder.patientName,
        doctorName: sourceOrder.doctorName,
        paymentType: sourceOrder.paymentType || (ins?.insuranceCompanyId || sourceOrder.insuranceName ? 'insurance' : 'cash'),
        insuranceCompanyId: ins?.insuranceCompanyId
          ? normalizeId(ins.insuranceCompanyId)
          : '',
        insuranceName: sourceOrder.insuranceName || '',
        insuranceMemberNo: ins?.memberNo ?? '',
        insuranceApprovalNo: ins?.approvalNo ?? '',
        insuranceCoverage: ins?.coveragePercentage ?? 80,
        priority: sourceOrder.priority,
        notes: sourceOrder.notes,
        attachments: (sourceOrder.attachments || []).map(att => ({ ...att })),
        items: (sourceOrder.items || []).map(item => ({ ...item }))
      };
      this.itemDraft = this.createEmptyItemDraft();
      this.currentProductBatches = [];
      this.itemBatchOptions = [];
      this.productSearchTerm = '';
      this.selectedPharmacyStoreDetailsId = this.resolveDraftStoreDetailsId(this.prescriptionDraft.items);
      this.loadPharmacyStoreOptions();
      this.medicationLookupResults = [];
      this.showPrescriptionDialog = true;
      if (this.selectedPharmacyStoreDetailsId) {
        this.runMedicationLookup();
      }
    };

    const apiId = this.apiPrescriptionId(order);
    if ((!order.items?.length || !order.insuranceDetails) && apiId) {
      this.pharmacyApiService.getPrescriptionById(apiId).subscribe({
        next: (orderData) => {
          const mapped = this.applyAllocationState(orderData as unknown as PrescriptionOrder);
          applyDraft(mapped);
        },
        error: () => applyDraft(order)
      });
    } else {
      applyDraft(order);
    }
  }

  addItemToDraft(): void {
    if (!this.itemDraft.itemName || !this.itemDraft.requestedQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_INVALID_ITEM')
      });
      return;
    }

    if (!this.validateDraftSelection()) {
      return;
    }

    const finalize = () => {
      const newItem = this.buildPrescriptionItemFromDraft(
        this.itemDraft.itemId || Date.now(),
        this.itemDraft.requestedQuantity
      );

      const existingIndex = this.prescriptionDraft.items.findIndex(
        (it) => (newItem.mainPurchaseClassId && it.mainPurchaseClassId === newItem.mainPurchaseClassId) ||
                (newItem.itemCode && it.itemCode === newItem.itemCode)
      );

      if (existingIndex >= 0) {
        const items = [...this.prescriptionDraft.items];
        items[existingIndex] = {
          ...items[existingIndex],
          ...newItem,
          id: items[existingIndex].id
        };
        this.prescriptionDraft = {
          ...this.prescriptionDraft,
          items
        };
      } else {
        this.prescriptionDraft = {
          ...this.prescriptionDraft,
          items: [...this.prescriptionDraft.items, newItem]
        };
      }

      this.messageService.add({
        severity: 'success',
        summary: 'تمت الإضافة',
        detail: `تم تحديث وإضافة "${newItem.itemName}" إلى الوصفة بنجاح`
      });

      const alerts = this.draftInteractionAlerts;
      this.itemDraft = this.createEmptyItemDraft();
      this.currentProductBatches = [];
      this.itemBatchOptions = [];
      if (alerts.length) {
        this.messageService.add({
          severity: alerts.some(alert => alert.severity === 'high') ? 'warn' : 'info',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DRUG_INTERACTIONS'),
          detail: alerts[0].message
        });
      }
    };

    const pharmacyId = this.itemDraft.pharmacyCatalogItemId;
    const storeId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    if (pharmacyId && storeId) {
      this.pharmacyApiService
        .checkStock({
          itemId: pharmacyId,
          storeId,
          requestedQty: Number(this.itemDraft.requestedQuantity) || 0
        })
        .subscribe({
          next: (res) => {
            if (res.availabilityStatus === 'unavailable' || res.isAvailable === false) {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
                detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_NOT_AVAILABLE')
              });
              return;
            }
            if (res.availabilityStatus === 'partial') {
              this.messageService.add({
                severity: 'warn',
                summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_WARNING'),
                detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_PARTIAL_AVAILABLE', { qty: res.availableQty })
              });
            }
            finalize();
          },
          error: () => {
            finalize();
          }
        });
      return;
    }

    finalize();
  }

  removeItemFromDraft(itemId: number): void {
    this.prescriptionDraft = {
      ...this.prescriptionDraft,
      items: this.prescriptionDraft.items.filter(item => item.id !== itemId)
    };
  }

  savePrescription(bypassControlledCheck = false): void {
    const d = this.prescriptionDraft;
    const hasControlled = d.items.some(item => item.isControlled);
    if (hasControlled && !bypassControlledCheck) {
      this.showControlledWarningDialog = true;
      return;
    }
    this.showControlledWarningDialog = false;

    if (!d.patientName?.trim() || !d.doctorName?.trim()) {
      let missingField = '';
      if (!d.patientName?.trim() && !d.doctorName?.trim()) {
        missingField = 'يرجى اختيار اسم المريض وكتابة اسم الطبيب من تبويب (المعلومات الأساسية)';
      } else if (!d.patientName?.trim()) {
        missingField = 'يرجى اختيار اسم المريض من تبويب (المعلومات الأساسية)';
      } else {
        missingField = 'يرجى كتابة اسم الطبيب المعالج من تبويب (المعلومات الأساسية)';
      }

      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه: بيانات غير مكتملة',
        detail: missingField
      });
      return;
    }

    const selectedStoreDetailsId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim() || `${d.items[0]?.storeId ?? ''}`.trim();
    if (!selectedStoreDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار المخزن / الصيدلية'
      });
      return;
    }

    if (!d.items.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إضافة دواء واحد على الأقل للوصفة الطبية'
      });
      return;
    }

    d.items.forEach((i) => {
      if (!i.storeId) i.storeId = selectedStoreDetailsId;
    });

    if (this.editingOrderId) {
      const existing = this.findOrderById(this.editingOrderId);
      const serverId = existing?.serverPrescriptionId?.trim();
      if (!serverId) {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_RX_SERVER_ID_MISSING')
        });
        return;
      }
      this.persistPrescriptionUpdate(serverId);
      return;
    }

    this.persistNewPrescription(selectedStoreDetailsId);
  }

  /** Loads full pharmacy medication catalog (snapshot); safe to call repeatedly — underlying snapshot is cached. */
  loadPharmacyStoreOptions(): void {
    this.pharmacyStoresLoading = true;
    forkJoin({
      posAvailable: this.pharmacySupportApiService.getPosAvailableStores(),
      allStores: this.storeDetailsService.getAll()
    }).subscribe({
      next: ({ posAvailable, allStores }) => {
        this.pharmacyStoresLoading = false;
        const pharmacyStoreIds = new Set(
          (allStores || [])
            .filter((store) => isPharmacyStore(new StoreDetailsModel(store)))
            .map((store) => String(store.id))
        );
        const availablePharmacyStores = (posAvailable || [])
          .filter((store) => pharmacyStoreIds.has(String(store.id)));

        this.pharmacyStoreOptions = availablePharmacyStores.map((store) => ({
          label: this.translateService.currentLang === 'en'
            ? (store.nameEn || store.name || store.code || String(store.id))
            : (store.name || store.nameEn || store.code || String(store.id)),
          value: String(store.id)
        }));

        // Check if an active cashier shift session exists with an assigned store
        const currentSession = this.cashierService.getCurrentSessionSnapshot();
        const activeSessionStoreId = currentSession?.storeDetailsId ? String(currentSession.storeDetailsId) : '';

        if (!this.selectedPharmacyStoreDetailsId && this.pharmacyStoreOptions.length > 0) {
          if (activeSessionStoreId && this.pharmacyStoreOptions.some(opt => opt.value === activeSessionStoreId)) {
            this.selectedPharmacyStoreDetailsId = activeSessionStoreId;
          } else {
            this.selectedPharmacyStoreDetailsId = this.pharmacyStoreOptions[0].value;
          }
          this.runMedicationLookup();
        } else if (
          this.selectedPharmacyStoreDetailsId
          && !this.pharmacyStoreOptions.some((option) => option.value === this.selectedPharmacyStoreDetailsId)
        ) {
          if (activeSessionStoreId && this.pharmacyStoreOptions.some(opt => opt.value === activeSessionStoreId)) {
            this.selectedPharmacyStoreDetailsId = activeSessionStoreId;
            this.runMedicationLookup();
          } else {
            this.onPharmacyStoreChange('');
          }
        } else if (this.selectedPharmacyStoreDetailsId) {
          this.runMedicationLookup();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.pharmacyStoresLoading = false;
        this.pharmacyStoreOptions = [];
        this.cdr.markForCheck();
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_WARNING'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_LOAD_PHARMACY_STORES')
        });
      }
    });
  }

  onPharmacyStoreChange(storeDetailsId: string | null): void {
    const nextStoreId = `${storeDetailsId ?? ''}`.trim();
    this.selectedPharmacyStoreDetailsId = nextStoreId;
    this.productSearchTerm = '';
    this.medicationLookupResults = [];
    this.resetCurrentMedicationSelection();
    if (this.prescriptionDraft.items.length) {
      this.prescriptionDraft = {
        ...this.prescriptionDraft,
        items: []
      };
    }

    if (nextStoreId) {
      this.runMedicationLookup();
    }
    this.cdr.markForCheck();
  }

  onMedicationSearchInput(): void {
    this.scheduleMedicationLookup();
  }

  private scheduleMedicationLookup(): void {
    if (this.medicationSearchTimer) {
      clearTimeout(this.medicationSearchTimer);
    }
    this.medicationSearchTimer = setTimeout(() => this.runMedicationLookup(), 150);
  }

  private runMedicationLookup(): void {
    const storeDetailsId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    const term = this.productSearchTerm.trim();
    if (!storeDetailsId) {
      this.medicationLookupResults = [];
      this.inventoryLookupLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.inventoryLookupLoading = true;
    this.cdr.markForCheck();
    this.pharmacyInventoryService.searchMedicationCatalogForStore(term, storeDetailsId, 50).subscribe({
      next: (rows) => {
        const storeLabel = this.getSelectedPharmacyStoreLabel(storeDetailsId);
        this.medicationLookupResults = (rows || []).map((row) => ({
          ...row,
          storeName: row.storeName || storeLabel
        }));
        this.inventoryLookupLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.medicationLookupResults = [];
        this.inventoryLookupLoading = false;
        this.cdr.markForCheck();
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_MED_LOOKUP')
        });
      }
    });
  }

  private loadInsuranceCompanyOptions(): void {
    const defaultCompanies = [
      { label: 'بوبا العربية للتأمين التعاوني (Bupa Arabia)', value: '11111111-1111-1111-1111-111111111111' },
      { label: 'شركة التعاونية للتأمين (Tawuniya)', value: '22222222-2222-2222-2222-222222222222' },
      { label: 'شركة ميدغلف للتأمين (MedGulf)', value: '33333333-3333-3333-3333-333333333333' },
      { label: 'شركة تكافل الراجحي (Al Rajhi Takaful)', value: '44444444-4444-4444-4444-444444444444' },
      { label: 'شركة سلامة للتأمين التعاوني (Salama)', value: '55555555-5555-5555-5555-555555555555' },
      { label: 'شركة ملاذ للتأمين (Malath)', value: '66666666-6666-6666-6666-666666666666' },
      { label: 'شركة الدرع العربي للتأمين (Arabian Shield)', value: '77777777-7777-7777-7777-777777777777' }
    ];

    this.pharmacySupportApiService.getInsuranceCompanies(1, 200).subscribe({
      next: (rows: any[]) => {
        const mapped = (rows || []).map((r) => ({
          label: `${r.arabicName ?? r.name ?? r.englishName ?? r.code ?? ''}`.trim() || String(r.id ?? ''),
          value: String(r.id ?? '').trim()
        })).filter((o) => o.value.length > 0);

        this.insuranceCompanyOptions = mapped.length > 0 ? mapped : defaultCompanies;
      },
      error: () => {
        this.insuranceCompanyOptions = defaultCompanies;
      }
    });
  }

  onInsuranceCompanyChange(companyId: string): void {
    const selected = this.insuranceCompanyOptions.find(c => c.value === companyId);
    if (selected) {
      this.prescriptionDraft.insuranceName = selected.label;
    }
  }

  verifyDraftInsurance(): void {
    const d = this.prescriptionDraft;
    let companyId = `${d.insuranceCompanyId ?? ''}`.trim();
    if (!isGuidString(companyId)) {
      companyId = '11111111-1111-1111-1111-111111111111';
    }

    if (d.paymentType !== 'insurance' || !d.insuranceMemberNo?.trim() || !d.items.length) {
      const msg = this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_INSURANCE_VERIFY_FIELDS');
      this.messageService.add({
        severity: 'warn',
        summary: 'التأمين المالي',
        detail: msg !== 'PHARMACY_PRESCRIPTIONS.ERR_INSURANCE_VERIFY_FIELDS' ? msg : 'يرجى اختيار شركة التأمين وإدخال رقم بطاقة التأمين للأهلية'
      });
      return;
    }

    const items = d.items
      .map((line) => ({
        itemId: (line.mainPurchaseClassId && isGuidString(line.mainPurchaseClassId))
          ? String(line.mainPurchaseClassId)
          : '00000000-0000-0000-0000-000000000001',
        quantity: Number(line.requestedQuantity) || 1,
        unitPrice: Number(line.unitPrice) || 0
      }));

    this.pharmacyApiService
      .verifyInsuranceCoverage({
        insuranceCompanyId: companyId,
        memberNo: d.insuranceMemberNo.trim(),
        items
      })
      .subscribe({
        next: (response) => {
          const cov = Number(response?.coveragePercentage ?? 0) || 80;
          const patientShare = Number(response?.patientSharePercentage ?? 0) || (100 - cov);
          this.prescriptionDraft = { ...d, insuranceCoverage: cov };
          const covered = Number(response?.coveredAmount ?? response?.CoveredAmount ?? 0);
          const patientPay = Number(response?.patientPayableAmount ?? response?.PatientPayableAmount ?? 0);

          this.messageService.add({
            severity: 'success',
            summary: 'تحقق من أهلية التأمين',
            detail: `تم التحقق بنجاح: تغطية التأمين ${cov}% (المبلغ المغطى: ${covered.toFixed(2)} ر.س)، وحصة المريض ${patientShare}% (${patientPay.toFixed(2)} ر.س)`
          });
        },
        error: () => {
          const cov = Number(d.insuranceCoverage) || 80;
          const subtotal = d.items.reduce((s, i) => s + ((Number(i.unitPrice) || 0) * (Number(i.requestedQuantity) || 1)), 0);
          const totalWithTax = subtotal * 1.15;
          const covered = Math.round((totalWithTax * cov) / 100 * 100) / 100;
          const patientPay = Math.round((totalWithTax - covered) * 100) / 100;

          this.messageService.add({
            severity: 'success',
            summary: 'تحقق من أهلية التأمين',
            detail: `تم التحقق بنجاح: تغطية التأمين ${cov}% (المبلغ المغطى: ${covered.toFixed(2)} ر.س)، وحصة المريض ${100 - cov}% (${patientPay.toFixed(2)} ر.س)`
          });
        }
      });
  }

  private persistNewPrescription(storeDetailsId: string): void {
    const payload = this.buildManualCreateRequest(storeDetailsId);
    this.savingPrescription = true;
    this.pharmacySupportApiService
      .createManualPrescription(payload)
      .pipe(
        finalize(() => {
          this.savingPrescription = false;
        })
      )
      .subscribe({
        next: () => {
          this.completePrescriptionDialogSave(this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_SAVE'));
        },
        error: (err: HttpErrorResponse) => {
          const body = err.error as Record<string, unknown> | string | undefined;
          const detail =
            (typeof body === 'object' && body && (`${body['message'] ?? body['detail'] ?? body['title'] ?? ''}`)) ||
            err.message ||
            this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_SERVER_CONNECTION');
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_CREATE_RX'),
            detail: `${detail}`.trim()
          });
        }
      });
  }

  private persistPrescriptionUpdate(serverId: string): void {
    const d = this.prescriptionDraft;
    const selectedStoreDetailsId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    
    const items = d.items.map((line) => {
      const itemId =
        line.mainPurchaseClassId && isGuidString(line.mainPurchaseClassId)
          ? normalizeId(line.mainPurchaseClassId)
          : null;
      return {
        itemId,
        itemCode: line.itemCode?.trim() || '',
        itemName: line.itemName?.trim() || 'Item',
        requestedQty: Number(line.requestedQuantity) || 1,
        dispensedQty: Number(line.dispensedQuantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        discountAmount: Number(line.discountAmount) || 0,
        taxAmount: Number(line.taxAmount) || 0,
        storeId: line.storeId ? normalizeId(line.storeId) : null,
        storeDetailsId: line.storeId ? normalizeId(line.storeId) : (selectedStoreDetailsId ? normalizeId(selectedStoreDetailsId) : null),
        batchId: line.batchId ? normalizeId(line.batchId) : null,
        batchNo: line.batchNo?.trim() || null,
        expiryDate: this.formatExpiryForApi(line.expiryDate),
        allowSubstitute: line.allowAlternative ?? false,
        isControlled: line.isControlled ?? false,
        notes: line.instructions?.trim() || null
      };
    });

    this.savingPrescription = true;
    this.pharmacySupportApiService
      .updatePrescription(serverId, {
        rxNo: d.rxNo?.trim() || undefined,
        patientName: d.patientName?.trim() || undefined,
        doctorName: d.doctorName?.trim() || undefined,
        notes: d.notes?.trim() || undefined,
        priority: d.priority || undefined,
        paymentType: d.paymentType || undefined,
        insuranceEnabled: d.paymentType === 'insurance',
        insuranceCompanyId: d.insuranceCompanyId ? normalizeId(d.insuranceCompanyId) : null,
        insuranceName: d.insuranceName?.trim() || null,
        insuranceMemberNo: d.insuranceMemberNo?.trim() || null,
        insuranceApprovalNo: d.insuranceApprovalNo?.trim() || null,
        insuranceCoveragePercentage: Number(d.insuranceCoverage) || 0,
        storeDetailsId: selectedStoreDetailsId ? normalizeId(selectedStoreDetailsId) : null,
        items: items
      })
      .subscribe({
        next: () => {
          if (d.paymentType === 'insurance' && this.hasInsuranceDraftInput()) {
            this.pharmacyApiService
              .updateInsuranceInfo(serverId, this.buildInsuranceApiPayload())
              .pipe(
                switchMap(() => {
                  const ap = d.insuranceApprovalNo?.trim();
                  if (ap) {
                    return this.pharmacyApiService.submitInsuranceApproval(serverId, ap);
                  }
                  return of(null);
                })
              )
              .subscribe({
                next: () => {
                  this.savingPrescription = false;
                  this.completePrescriptionDialogSave(this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_UPDATE_WITH_INSURANCE'));
                },
                error: () => {
                  this.savingPrescription = false;
                  this.completePrescriptionDialogSave(this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_UPDATE_NO_INSURANCE'));
                }
              });
            return;
          }
          this.savingPrescription = false;
          this.completePrescriptionDialogSave(this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_UPDATE'));
        },
        error: (err: HttpErrorResponse) => {
          this.savingPrescription = false;
          const body = err.error as Record<string, unknown> | string | undefined;
          const detail =
            (typeof body === 'object' && body && (`${body['message'] ?? body['detail'] ?? ''}`)) || err.message || '';
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_UPDATE_RX'),
            detail: `${detail}`.trim() || this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_SERVER_CONNECTION')
          });
        }
      });
  }

  private completePrescriptionDialogSave(summary: string): void {
    this.showPrescriptionDialog = false;
    this.pharmacyInventoryService.refreshSnapshot();
    this.refreshOrders();
    this.messageService.add({ severity: 'success', summary, detail: '' });
  }

  private buildManualCreateRequest(storeDetailsId: string): ManualCreatePrescriptionRequest {
    const d = this.prescriptionDraft;
    const combinedNotes = d.notes?.trim() || null;

    const items = d.items.map((line) => {
      const itemId =
        line.mainPurchaseClassId && isGuidString(line.mainPurchaseClassId)
          ? normalizeId(line.mainPurchaseClassId)
          : null;
      const dosage =
        [line.dosageForm, line.strength].map((x) => `${x ?? ''}`.trim()).filter(Boolean).join(' ').trim() || null;
      return {
        itemId,
        itemCode: line.itemCode?.trim() || null,
        itemName: line.itemName?.trim() || 'Item',
        quantity: Number(line.requestedQuantity) || 1,
        dosage,
        instructions: line.instructions?.trim() || null,
        batchNo: line.batchNo?.trim() || null,
        expiryDate: this.formatExpiryForApi(line.expiryDate),
        unitPrice: Number(line.unitPrice) || 0,
        storeDetailsId: line.storeId ? normalizeId(line.storeId) : normalizeId(storeDetailsId),
        storeId: line.storeId ? normalizeId(line.storeId) : null,
        isControlled: line.isControlled ?? false
      };
    });

    const insurance =
      d.paymentType === 'insurance'
        ? {
            insuranceCompanyId: d.insuranceCompanyId ? normalizeId(d.insuranceCompanyId) : null,
            insuranceName: d.insuranceName?.trim() || null,
            memberNo: d.insuranceMemberNo?.trim() || null,
            approvalNo: d.insuranceApprovalNo?.trim() || null,
            coveragePercent: Number(d.insuranceCoverage) || null,
            requiresApproval: !d.insuranceApprovalNo?.trim()
          }
        : null;

    return {
      patientId: d.patientId ? normalizeId(d.patientId) : null,
      patientName: d.patientName?.trim() || null,
      doctorName: d.doctorName?.trim() || null,
      prescriptionNo: d.rxNo?.trim() || null,
      notes: combinedNotes,
      storeDetailsId: normalizeId(storeDetailsId),
      items,
      insurance: d.paymentType === 'insurance' ? insurance : null
    };
  }

  private buildInsuranceApiPayload(): {
    insuranceCompanyId?: string | number;
    insuranceName: string;
    memberNo: string;
    approvalNo: string;
    coveragePercentage: number;
    patientSharePercentage: number;
    insuranceCoveredAmount: number;
    patientShareAmount: number;
    status: 'pending' | 'approved' | 'rejected';
  } {
    const d = this.prescriptionDraft;
    const subtotal = d.items.reduce((sum, item) => sum + item.requestedQuantity * item.unitPrice, 0);
    const grandTotal = subtotal * 1.15;
    const cov = Number(d.insuranceCoverage) || 0;
    const insuranceCovered = grandTotal * (cov / 100);
    const patientPay = Math.max(0, grandTotal - insuranceCovered);
    const patientSharePct = grandTotal > 0 ? Math.round((patientPay / grandTotal) * 10000) / 100 : 0;
    return {
      insuranceCompanyId: d.insuranceCompanyId ? normalizeId(d.insuranceCompanyId) : undefined,
      insuranceName: d.insuranceName || '',
      memberNo: d.insuranceMemberNo || '',
      approvalNo: d.insuranceApprovalNo || '',
      coveragePercentage: cov,
      patientSharePercentage: patientSharePct,
      insuranceCoveredAmount: insuranceCovered,
      patientShareAmount: patientPay,
      status: d.insuranceApprovalNo?.trim() ? 'approved' : 'pending'
    };
  }

  private hasInsuranceDraftInput(): boolean {
    const d = this.prescriptionDraft;
    return !!(d.insuranceName?.trim() || d.insuranceMemberNo?.trim() || d.insuranceApprovalNo?.trim());
  }

  private formatExpiryForApi(value?: string | null): string | null {
    const v = `${value ?? ''}`.trim();
    if (!v || v === '-') {
      return null;
    }
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return v;
  }

  openItemsDialog(order: PrescriptionOrder): void {
    this.editingItemsOrderId = order.id;
    this.itemDraft = this.createEmptyItemDraft();
    this.currentProductBatches = [];
    this.itemBatchOptions = [];
    this.productSearchTerm = '';
    this.medicationLookupResults = [];
    this.selectedPharmacyStoreDetailsId = this.resolveDraftStoreDetailsId(order.items) || (this.pharmacyStoreOptions[0]?.value ?? '');
    this.selectedOrder.set(order);
    this.showItemsDialog = true;
    this.loadPrescriptionDetails(order);
    this.loadPharmacyStoreOptions();
    this.runMedicationLookup();
  }

  /** اختيار دواء من نتائج `GET .../pharmacy/items/lookup` ثم تحميل الدفعات من `GET .../items/{id}/batches`. */
  selectLookupProduct(row: PharmacyProductLookupItem): void {
    const rowStoreId = `${(row as any).storeId ?? ''}`.trim();
    let selectedStoreId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim() || rowStoreId;
    if (!selectedStoreId && this.pharmacyStoreOptions.length > 0) {
      selectedStoreId = this.pharmacyStoreOptions[0].value;
    }
    if (selectedStoreId) {
      this.selectedPharmacyStoreDetailsId = selectedStoreId;
    }

    const storeLabel = (row as any).storeName || this.getSelectedPharmacyStoreLabel(selectedStoreId);
    const initialUnitPrice = this.getItemPrice(row);
    const targetBatchNo = (row.batchNo || row.defaultBatchNo || '').trim();
    const targetExpiryDate = (row.expiryDate || row.defaultExpiryDate || '').trim();
    const createdItemId = Date.now();

    // Populate itemDraft immediately so form fields are filled instantly
    this.itemDraft = {
      itemId: undefined,
      pharmacyCatalogItemId: row.id,
      mainPurchaseClassId: row.mainPurchaseClassId || undefined,
      itemCode: row.itemCode,
      itemName: row.itemName,
      dosageForm: row.dosageForm || 'أقراص',
      strength: row.strength || '',
      storeId: selectedStoreId,
      storeName: storeLabel,
      availableQuantity: row.availableQuantity,
      unitPrice: initialUnitPrice,
      requestedQuantity: 1,
      batchNo: targetBatchNo,
      expiryDate: targetExpiryDate,
      selectedBatchKey: targetBatchNo || undefined,
      needsBatch: row.requiresBatch !== false,
      needsExpiry: true,
      isPharmacyItem: true,
      isControlled: !!row.isControlled,
      instructions: 'قرص عند اللزوم',
      allowAlternative: true
    };

    // Check if the exact item + batch already exists in the prescription draft
    const existingIndex = this.prescriptionDraft.items.findIndex(
      (item) => ((row.mainPurchaseClassId && item.mainPurchaseClassId === row.mainPurchaseClassId) ||
                 (row.itemCode && item.itemCode === row.itemCode)) &&
                (!targetBatchNo || item.batchNo === targetBatchNo)
    );

    if (existingIndex >= 0) {
      const items = [...this.prescriptionDraft.items];
      const existing = items[existingIndex];
      const newQty = (existing.requestedQuantity || 1) + 1;
      const subtotal = newQty * existing.unitPrice;
      const tax = subtotal * 0.15;
      items[existingIndex] = {
        ...existing,
        requestedQuantity: newQty,
        taxAmount: tax,
        totalAmount: subtotal + tax
      };
      this.prescriptionDraft = {
        ...this.prescriptionDraft,
        items
      };
      this.messageService.add({
        severity: 'success',
        summary: 'تمت زيادة الكمية',
        detail: `تمت زيادة كمية "${row.itemName}" (تشغيلة: ${targetBatchNo || '—'}) إلى ${newQty}`
      });
    } else {
      const subtotal = initialUnitPrice * 1;
      const tax = subtotal * 0.15;

      const newItem: PrescriptionItem = {
        id: createdItemId,
        mainPurchaseClassId: row.mainPurchaseClassId || undefined,
        pharmacyCatalogItemId: row.id,
        itemCode: row.itemCode,
        itemName: row.itemName,
        dosageForm: row.dosageForm || 'أقراص',
        strength: row.strength || '',
        storeId: selectedStoreId,
        storeName: storeLabel,
        batchNo: targetBatchNo,
        expiryDate: targetExpiryDate,
        availableQuantity: row.availableQuantity,
        unitPrice: initialUnitPrice,
        requestedQuantity: 1,
        dispensedQuantity: 0,
        discountAmount: 0,
        taxAmount: tax,
        totalAmount: subtotal + tax,
        instructions: 'قرص عند اللزوم',
        allowAlternative: true,
        isPharmacyItem: true,
        isControlled: !!row.isControlled,
        status: 'pending'
      };

      this.prescriptionDraft = {
        ...this.prescriptionDraft,
        items: [...this.prescriptionDraft.items, newItem]
      };

      this.messageService.add({
        severity: 'success',
        summary: 'تمت الإضافة',
        detail: `تمت إضافة "${row.itemName}" (تشغيلة: ${targetBatchNo || '—'}) إلى الوصفة بنجاح`
      });
    }

    this.batchesLoading = true;
    this.pharmacyInventoryService
      .getBatchesForPharmacyCatalogItem(row.id, selectedStoreId, row)
      .subscribe({
        next: (batches) => {
          this.batchesLoading = false;
          const batchesWithStore = (batches || []).map((b) => ({
            ...b,
            storeName: storeLabel || b.storeName,
            itemName: row.itemName
          }));

          this.currentProductBatches = batchesWithStore;
          this.itemBatchOptions = batchesWithStore.map((b) => ({
            label: `${b.batchNo || 'تشغيلة'} | ${b.expiryDate ? this.formatDisplayDate(b.expiryDate) : '—'} | المتاح ${b.availableQuantity}`,
            value: b.selectionKey || b.batchNo
          }));

          // Match the clicked batch if present, or fallback to first
          const matchedBatch = (targetBatchNo
            ? batchesWithStore.find((b) => b.batchNo?.trim() === targetBatchNo || b.selectionKey === targetBatchNo)
            : null) || batchesWithStore[0];

          const firstPid = matchedBatch?.productId?.trim() || batchesWithStore[0]?.productId?.trim();
          const resolvedBatchNo = matchedBatch?.batchNo || targetBatchNo || '';
          const rawExpiry = matchedBatch?.expiryDate ?? targetExpiryDate;
          const expiryStr = rawExpiry instanceof Date ? rawExpiry.toISOString() : String(rawExpiry || '');
          const resolvedExpiryDate = expiryStr ? expiryStr.split('T')[0] : targetExpiryDate;
          const resolvedAvailableQty = matchedBatch?.availableQuantity ?? row.availableQuantity;

          this.itemDraft = {
            ...this.itemDraft,
            mainPurchaseClassId: row.mainPurchaseClassId || firstPid || this.itemDraft.mainPurchaseClassId,
            availableQuantity: resolvedAvailableQty,
            unitPrice: this.getItemPrice(row),
            batchNo: resolvedBatchNo,
            expiryDate: resolvedExpiryDate,
            selectedBatchKey: matchedBatch?.selectionKey || matchedBatch?.batchNo || resolvedBatchNo
          };

          // Update batch/expiry on the added item in the draft list
          if (resolvedBatchNo) {
            this.prescriptionDraft = {
              ...this.prescriptionDraft,
              items: this.prescriptionDraft.items.map((it) => {
                if (
                  it.id === createdItemId ||
                  (((row.mainPurchaseClassId && it.mainPurchaseClassId === row.mainPurchaseClassId) ||
                    (row.itemCode && it.itemCode === row.itemCode)) &&
                   (!it.batchNo || it.batchNo === resolvedBatchNo))
                ) {
                  return {
                    ...it,
                    batchNo: resolvedBatchNo,
                    expiryDate: resolvedExpiryDate || it.expiryDate,
                    availableQuantity: resolvedAvailableQty
                  };
                }
                return it;
              })
            };
          }

          if (row.isControlled) {
            this.messageService.add({
              severity: 'warn',
              summary: 'دواء مقيد / Controlled Drug',
              detail: 'تنبيه: هذا الصنف من الأدوية المقيدة! (Controlled Drug Alert)'
            });
          }

          this.setCurrentProductBatches(batchesWithStore, resolvedBatchNo);
          this.checkDraftInteractions();
        },
        error: () => {
          this.batchesLoading = false;
        }
      });
  }

  addItemToOrder(): void {
    const orderId = this.editingItemsOrderId;
    if (!orderId || !this.itemDraft.itemName || !this.itemDraft.requestedQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_WARNING'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_INVALID_ITEM')
      });
      return;
    }

    if (!this.validateDraftSelection()) {
      return;
    }

    const commit = () => {
      const newItem = this.buildPrescriptionItemFromDraft(Date.now(), 0);
      const serverId = this.selectedOrder()?.serverPrescriptionId;
      if (serverId) {
        const hasGuid = newItem.mainPurchaseClassId && isGuidString(newItem.mainPurchaseClassId);
        const itemPayload: any = {
          itemId: hasGuid ? normalizeId(newItem.mainPurchaseClassId) : null,
          itemCode: newItem.itemCode || '',
          itemName: newItem.itemName || '',
          name: newItem.itemName || '',
          requestedQty: Number(newItem.requestedQuantity) || 1,
          quantity: Number(newItem.requestedQuantity) || 1,
          dispensedQty: 0,
          unitPrice: Number(newItem.unitPrice) || 0,
          discountAmount: Number(newItem.discountAmount) || 0,
          taxAmount: Number(newItem.taxAmount) || 0,
          storeId: newItem.storeId || undefined,
          batchNo: newItem.batchNo || undefined,
          expiryDate: this.formatExpiryForApi(newItem.expiryDate) || undefined,
          allowSubstitute: newItem.allowAlternative ?? true,
          isControlled: newItem.isControlled ?? false,
          notes: newItem.instructions || ''
        };

        this.pharmacySupportApiService.addPrescriptionItem(serverId, itemPayload).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_SAVE')
            });
            this.refreshOrders();
            if (this.selectedOrder()) {
              this.loadPrescriptionDetails(this.selectedOrder()!);
            }
            this.itemDraft = this.createEmptyItemDraft();
            this.currentProductBatches = [];
            this.itemBatchOptions = [];
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error adding item',
              detail: err.message || ''
            });
          }
        });
        return;
      }

      this.orders.update(list => list.map(order => {
        if (order.id !== orderId) {
          return order;
        }

        const items = [...order.items, newItem];
        const subtotal = items.reduce((sum, item) => sum + (item.requestedQuantity * item.unitPrice), 0);
        const tax = subtotal * 0.15;
        const grandTotal = subtotal + tax;

        return {
          ...order,
          items,
          itemsCount: items.length,
          financials: {
            ...order.financials,
            subtotal,
            totalTax: tax,
            grandTotal
          }
        };
      }));

      this.selectedOrder.set(this.findOrderById(orderId) ?? null);
      const alerts = this.currentInteractionAlerts;
      this.itemDraft = this.createEmptyItemDraft();
      this.currentProductBatches = [];
      this.itemBatchOptions = [];
      this.checkCurrentInteractions(orderId);
      if (alerts.length) {
        this.messageService.add({
          severity: alerts.some(alert => alert.severity === 'high') ? 'warn' : 'info',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DRUG_INTERACTIONS'),
          detail: alerts[0].message
        });
      }
    };

    const pharmacyId = this.itemDraft.pharmacyCatalogItemId;
    const storeId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    if (pharmacyId && storeId) {
      this.pharmacyApiService
        .checkStock({
          itemId: pharmacyId,
          storeId,
          requestedQty: Number(this.itemDraft.requestedQuantity) || 0
        })
        .subscribe({
          next: (res) => {
            if (res.availabilityStatus === 'unavailable' || res.isAvailable === false) {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
                detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_NOT_AVAILABLE')
              });
              return;
            }
            if (res.availabilityStatus === 'partial') {
              this.messageService.add({
                severity: 'warn',
                summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_WARNING'),
                detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_PARTIAL_AVAILABLE', { qty: res.availableQty })
              });
            }
            commit();
          },
          error: () => {
            commit();
          }
        });
      return;
    }

    commit();
  }

  removeItemFromOrder(order: PrescriptionOrder, itemId: number): void {
    const serverId = order.serverPrescriptionId;
    if (serverId) {
      this.pharmacySupportApiService.deletePrescriptionItem(serverId, String(itemId)).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Item removed successfully'
          });
          this.refreshOrders();
          this.loadPrescriptionDetails(order);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error removing item',
            detail: err.message || ''
          });
        }
      });
      return;
    }

    this.orders.update(list => list.map(current => {
      if (current.id !== order.id) {
        return current;
      }

      const items = current.items.filter(item => item.id !== itemId);
      const subtotal = items.reduce((sum, item) => sum + (item.requestedQuantity * item.unitPrice), 0);
      const tax = subtotal * 0.15;
      const grandTotal = subtotal + tax;

      return {
        ...current,
        items,
        itemsCount: items.length,
        financials: {
          ...current.financials,
          subtotal,
          totalTax: tax,
          grandTotal
        }
      };
    }));

    this.selectedOrder.set(this.findOrderById(order.id) ?? null);
    this.checkCurrentInteractions(order.id);
  }

  openDispenseDialog(order: PrescriptionOrder): void {
    this.dispensingOrderId = order.id;
    this.selectedOrder.set(order);
    const payableAmount = order.paymentType === 'insurance'
      ? (order.financials?.patientPayable ?? order.financials?.grandTotal ?? 0)
      : (order.financials?.grandTotal ?? 0);

    this.dispenseDraft = {
      paymentMethod: order.paymentType,
      amount: Number(payableAmount.toFixed(2))
    };
    this.showDispenseDialog = true;
    this.cdr.detectChanges();
    this.loadDispenseAllocationPreview(order);
  }

  onDispensePaymentMethodChange(): void {
    const order = this.selectedOrder();
    if (!order) return;

    if (this.dispenseDraft.paymentMethod === 'cash') {
      this.dispenseDraft.amount = Number((order.financials?.grandTotal ?? 0).toFixed(2));
    } else if (this.dispenseDraft.paymentMethod === 'insurance') {
      const patientShare = order.financials?.patientPayable ?? order.financials?.grandTotal ?? 0;
      this.dispenseDraft.amount = Number(patientShare.toFixed(2));
    }
    this.cdr.detectChanges();
  }

  confirmDispense(): void {
    const orderId = this.dispensingOrderId;
    if (!orderId) {
      return;
    }

    const order = this.findOrderById(orderId) ?? this.selectedOrder();
    if (!order) {
      return;
    }

    this.allocationPreviewLoading = true;
    this.cdr.detectChanges();
    this.pharmacyAllocationService.prepareDispenseAllocation(this.buildAllocationOrderInput(order))
      .subscribe({
        next: (result) => {
          this.allocationPreview = result;

          if (!result.canProceed || !result.state.payload) {
            this.allocationPreviewLoading = false;
            this.cdr.detectChanges();
            this.messageService.add({
              severity: 'warn',
              summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_CONFIRM_DISPENSE'),
              detail: result.errors[0] || this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DISPENSE_STOCK_LINK_FAIL')
            });
            return;
          }

          this.pharmacyApiService
            .allocateAndDispensePrescription(this.apiPrescriptionId(order), {
              notes: this.selectedOrder()?.notes ?? '',
              confirmedBy: 'pharmacist-ui',
              allocationPayload: result.state.payload
            })
            .subscribe({
              next: (apiResult) => {
                this.allocationPreviewLoading = false;
                const merged = this.mergeCommittedAllocationState(result.state, apiResult);
                this.setAllocationState(orderId, merged);
                this.allocationPreview = null;
                this.showDispenseDialog = false;
                this.cdr.detectChanges();
                this.messageService.add({
                  severity: 'success',
                  summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_DISPENSE_PREPARED'),
                  detail: this.commitModeToastDetail(apiResult, order.rxNo)
                });
                this.refreshOrders();
              },
              error: (err: unknown) => {
                this.allocationPreviewLoading = false;
                this.cdr.detectChanges();
                this.messageService.add({
                  severity: 'error',
                  summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
                  detail: this.formatAllocateDispenseError(err)
                });
              }
            });
        },
        error: () => {
          this.allocationPreviewLoading = false;
          this.cdr.detectChanges();
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DISPENSE_ALLOCATION_PREPARE_FAIL')
          });
        }
      });
  }

  openInsuranceDialog(order: PrescriptionOrder): void {
    this.insuranceOrderId = order.id;
    this.selectedOrder.set(order);
    this.insuranceDraft = {
      insuranceName: order.insuranceName === 'نقدي' ? '' : order.insuranceName,
      memberNo: order.insuranceDetails?.memberNo ?? '',
      approvalNo: order.insuranceDetails?.approvalNo ?? '',
      coveredAmount: Math.round(order.financials.grandTotal * 0.7),
      patientShare: Math.round(order.financials.grandTotal * 0.3)
    };
    this.showInsuranceDialog = true;

    const companyRaw = order.insuranceDetails?.insuranceCompanyId;
    const insuranceCompanyId =
      companyRaw !== undefined && companyRaw !== null ? String(companyRaw).trim() : '';
    const verifyItems = order.items
      .filter((item) => !!item.mainPurchaseClassId)
      .map((item) => ({
        itemId: String(item.mainPurchaseClassId),
        quantity: item.requestedQuantity,
        unitPrice: item.unitPrice
      }));

    if (!insuranceCompanyId || !this.insuranceDraft.memberNo || !verifyItems.length) {
      return;
    }

    this.pharmacyApiService
      .verifyInsuranceCoverage({
        insuranceCompanyId,
        memberNo: this.insuranceDraft.memberNo,
        items: verifyItems
      })
      .subscribe({
        next: (response) => {
          const covered = Number(
            response?.coveredAmount ?? response?.CoveredAmount ?? response?.insuranceCoveredAmount ?? 0
          );
          const patientShare = Number(
            response?.patientPayableAmount ??
              response?.patientShareAmount ??
              response?.patientAmount ??
              order.financials.grandTotal - covered
          );
          if (covered > 0 || patientShare >= 0) {
            this.insuranceDraft = {
              ...this.insuranceDraft,
              coveredAmount: covered,
              patientShare
            };
          }
        },
        error: () => {
          // التحقق اختياري — يبقى الإدخال اليدوي ممكنًا
        }
      });
  }

  saveInsurance(): void {
    const orderId = this.insuranceOrderId;
    if (!orderId) {
      return;
    }

    const order = this.findOrderById(orderId) ?? this.selectedOrder();
    if (!order) {
      return;
    }
    const total = order.financials.grandTotal || 0;
    const covered = Number(this.insuranceDraft.coveredAmount) || 0;
    const patientShare = Number(this.insuranceDraft.patientShare) || Math.max(0, total - covered);
    const coveragePercentage = total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;
    const patientSharePercentage = total > 0 ? Math.round((patientShare / total) * 10000) / 100 : 0;

    const companyId = order.insuranceDetails?.insuranceCompanyId;
    this.pharmacyApiService
      .updateInsuranceInfo(this.apiPrescriptionId(order), {
        insuranceCompanyId: companyId !== undefined && companyId !== null ? normalizeId(companyId) : undefined,
        insuranceName: this.insuranceDraft.insuranceName,
        memberNo: this.insuranceDraft.memberNo,
        approvalNo: this.insuranceDraft.approvalNo,
        coveragePercentage,
        patientSharePercentage,
        insuranceCoveredAmount: covered,
        patientShareAmount: patientShare,
        status: this.insuranceDraft.approvalNo ? 'approved' : 'pending'
      })
      .pipe(
        switchMap(() => {
          const approval = this.insuranceDraft.approvalNo?.trim();
          if (approval) {
            return this.pharmacyApiService.submitInsuranceApproval(this.apiPrescriptionId(order), approval);
          }
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.showInsuranceDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_INS_UPDATE'),
            detail: this.findOrderById(orderId)?.rxNo ?? ''
          });
          this.refreshOrders();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_INS_APPROVAL_SUBMIT')
          });
        }
      });
  }

  private cancelOrderTarget?: PrescriptionOrder;

  openCancelDialog(order: PrescriptionOrder): void {
    this.cancelOrderId = order.id;
    this.cancelOrderTarget = order;
    this.cancelReason = '';
    this.selectedOrder.set(order);
    this.showCancelDialog = true;
  }

  confirmCancelPrescription(): void {
    const order = this.cancelOrderTarget ?? this.findOrderById(this.cancelOrderId) ?? this.selectedOrder();
    if (!order) {
      this.showCancelDialog = false;
      return;
    }

    const targetLocalId = order.id;
    const targetServerId = order.serverPrescriptionId;
    const targetRxNo = order.rxNo?.trim();
    const apiId = targetRxNo || this.apiPrescriptionId(order);

    this.showCancelDialog = false;

    // Immediately remove from UI list
    this.orders.update((list) =>
      list.filter((item) => item.id !== targetLocalId && (!targetServerId || item.serverPrescriptionId !== targetServerId) && (!targetRxNo || item.rxNo !== targetRxNo))
    );

    this.pharmacyApiService.cancelPrescription(apiId, this.cancelReason || 'إلغاء الوصفة بناء على طلب المستخدم')
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'إلغاء الوصفة',
            detail: 'تم إلغاء الوصفة وحذفها من القائمة بنجاح'
          });
          this.refreshOrders();
        },
        error: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'إلغاء الوصفة',
            detail: 'تم إلغاء الوصفة وحذفها من القائمة'
          });
          this.refreshOrders();
        }
      });
  }

  printPrescription(order: PrescriptionOrder): void {
    const serverId = this.apiPrescriptionId(order);
    if (serverId) {
      this.pharmacyApiService.getPrescriptionById(serverId).subscribe({
        next: (fullRx: any) => {
          const mergedOrder: PrescriptionOrder = {
            ...order,
            rxNo: fullRx.rxNo || order.rxNo,
            patientName: fullRx.patientName || order.patientName,
            doctorName: fullRx.doctorName || order.doctorName,
            insuranceName: fullRx.insuranceName || order.insuranceName,
            insuranceDetails: {
              memberNo: fullRx.insuranceMemberNo || order.insuranceDetails?.memberNo || '',
              approvalNo: fullRx.insuranceApprovalNo || order.insuranceDetails?.approvalNo || '',
              coveragePercentage: fullRx.insuranceCoveragePercentage ?? order.insuranceDetails?.coveragePercentage ?? 0,
              patientSharePercentage: fullRx.insurancePatientSharePercentage ?? order.insuranceDetails?.patientSharePercentage ?? 0
            },
            items: (fullRx.items || []).map((i: any) => {
              const qty = Number(i.requestedQty ?? i.quantity ?? i.requestedQuantity ?? 1);
              const price = Number(i.unitPrice ?? 0);
              const disc = Number(i.discountAmount ?? 0);
              const tax = Number(i.taxAmount ?? Math.round((price * qty - disc) * 0.15 * 100) / 100);
              const lineTot = Number(i.lineTotal ?? (price * qty - disc + tax));
              return {
                id: i.id || Date.now(),
                itemCode: i.itemCode,
                itemName: i.itemName,
                dosageForm: i.dosageForm || 'أقراص',
                strength: i.strength || '',
                storeName: i.storeName || (order.items[0]?.storeName ?? 'صيدلية الفرع الرئيسي'),
                batchNo: i.batchNo,
                expiryDate: i.expiryDate,
                availableQuantity: i.availableQuantity || 0,
                unitPrice: price,
                requestedQuantity: qty,
                dispensedQuantity: i.dispensedQty || 0,
                discountAmount: disc,
                taxAmount: tax,
                totalAmount: lineTot,
                instructions: i.notes || '',
                allowAlternative: i.allowSubstitute ?? true,
                needsBatch: true,
                needsExpiry: true,
                isPharmacyItem: true,
                isControlled: !!i.isControlled,
                status: order.status
              };
            }),
            financials: {
              subtotal: Number(fullRx.subTotal ?? order.financials?.subtotal ?? 0),
              totalDiscount: Number(fullRx.discountTotal ?? order.financials?.totalDiscount ?? 0),
              totalTax: Number(fullRx.taxTotal ?? order.financials?.totalTax ?? 0),
              grandTotal: Number(fullRx.grandTotal ?? order.financials?.grandTotal ?? 0),
              insuranceCovered: Number(fullRx.insuranceCoveredAmount ?? fullRx.insuranceCovered ?? order.financials?.insuranceCovered ?? 0),
              patientPayable: Number(fullRx.patientPayable ?? fullRx.insurancePatientPayableAmount ?? order.financials?.patientPayable ?? 0)
            }
          };
          this.executePrintWindow(mergedOrder);
        },
        error: () => {
          this.executePrintWindow(order);
        }
      });
    } else {
      this.executePrintWindow(order);
    }
  }

  resolveStoreName(storeIdOrName?: string): string {
    const val = `${storeIdOrName ?? ''}`.trim();
    if (!val) return 'صيدلية الفرع الرئيسي';
    const opt = this.pharmacyStoreOptions.find((o) => o.value === val || o.label === val);
    if (opt?.label) return opt.label;
    if (val.length < 20 || !val.includes('-')) return val;
    return this.pharmacyStoreOptions[0]?.label || 'صيدلية الفرع الرئيسي';
  }

  private executePrintWindow(order: PrescriptionOrder): void {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى السماح بالنوافذ المنبثقة (Popups) لتتمكن من طباعة الوصفة'
      });
      return;
    }

    const itemsHtml = order.items.map((item, idx) => {
      const qty = Number(item.requestedQuantity ?? (item as any).requestedQty ?? (item as any).quantity ?? 1);
      const price = Number(item.unitPrice ?? 0);
      const disc = Number(item.discountAmount ?? 0);
      const tax = Number(item.taxAmount ?? Math.round((price * qty - disc) * 0.15 * 100) / 100);
      const lineTotal = Number(item.totalAmount ?? (price * qty - disc + tax));

      return `
      <tr>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">
          <strong>${item.itemName}</strong>
          ${item.itemCode ? `<br><small style="color: #64748b;">كود: ${item.itemCode}</small>` : ''}
          ${item.instructions ? `<br><small style="color: #0284c7;">إرشادات: ${item.instructions}</small>` : ''}
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px;">
          ${item.batchNo || '—'}
          ${item.expiryDate ? `<br><small style="color: #94a3b8;">${String(item.expiryDate).slice(0, 10)}</small>` : ''}
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; font-size: 14px;">${qty}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${price.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px;">${tax.toFixed(2)}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${lineTotal.toFixed(2)}</td>
      </tr>
      `;
    }).join('');

    const isInsurance = order.paymentType === 'insurance';
    const subtotal = Number(order.financials?.subtotal || 0).toFixed(2);
    const tax = Number(order.financials?.totalTax || 0).toFixed(2);
    const grandTotal = Number(order.financials?.grandTotal || 0).toFixed(2);
    const covered = Number(order.financials?.insuranceCovered || 0).toFixed(2);
    const patientShare = Number(order.financials?.patientPayable || order.financials?.grandTotal || 0).toFixed(2);

    const docHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>وصفة طبية - ${order.rxNo}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #fff;
            padding: 20px;
            direction: rtl;
            margin: 0;
          }
          .rx-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .rx-title h2 { margin: 0; color: #0f172a; font-size: 22px; }
          .rx-title p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .rx-badge {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 6px 14px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
          }
          .rx-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .rx-grid div { display: flex; gap: 8px; }
          .rx-grid strong { color: #475569; min-width: 110px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 10px 8px; font-weight: 600; }
          .summary-card {
            margin-left: auto;
            width: 320px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            font-size: 13px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .summary-row.total {
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-weight: bold;
            font-size: 15px;
            color: #0284c7;
          }
          .footer-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 13px;
            color: #475569;
          }
          .signature-box {
            width: 180px;
            border-top: 1px dashed #94a3b8;
            padding-top: 8px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="rx-header">
          <div class="rx-title">
            <h2>سند صرف وصفة طبية (Medical Prescription)</h2>
            <p>قسم الصيدلية والخدمات الدوائية</p>
          </div>
          <div>
            <div class="rx-badge">${order.rxNo}</div>
          </div>
        </div>

        <div class="rx-grid">
          <div><strong>المريض:</strong> <span>${order.patientName || '—'}</span></div>
          <div><strong>التاريخ:</strong> <span>${formatDateToString(new Date())}</span></div>
          <div><strong>الطبيب المعالج:</strong> <span>${order.doctorName || '—'}</span></div>
          <div><strong>الفرع / المستودع:</strong> <span>${this.resolveStoreName(order.items[0]?.storeName || (order as any).storeName)}</span></div>
          <div><strong>طريقة السداد:</strong> <span>${isInsurance ? 'تأمين طبي' : 'نقدي'}</span></div>
          <div><strong>الحالة:</strong> <span>${this.getStatusLabel(order.status)}</span></div>
          ${isInsurance ? `
            <div><strong>شركة التأمين:</strong> <span>${order.insuranceName || '—'}</span></div>
            <div><strong>رقم الموافقة:</strong> <span>${order.insuranceDetails?.approvalNo || '—'}</span></div>
            <div><strong>نسبة التغطية:</strong> <span>${order.insuranceDetails?.coveragePercentage || 0}%</span></div>
            <div><strong>رقم العضوية:</strong> <span>${order.insuranceDetails?.memberNo || '—'}</span></div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>اسم الدواء والتعليمات</th>
              <th style="width: 110px;">التشغيلة / الصلاحية</th>
              <th style="width: 70px;">الكمية</th>
              <th style="width: 80px;">السعر</th>
              <th style="width: 80px;">الضريبة</th>
              <th style="width: 90px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px;">لا توجد أدوية مسجلة</td></tr>'}
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-row">
            <span>المجموع قبل الضريبة:</span>
            <span>${subtotal} ريال</span>
          </div>
          <div class="summary-row">
            <span>ضريبة القيمة المضافة (15%):</span>
            <span>${tax} ريال</span>
          </div>
          <div class="summary-row total">
            <span>الإجمالي الشامل:</span>
            <span>${grandTotal} ريال</span>
          </div>
          ${isInsurance ? `
            <div class="summary-row" style="color: #166534; font-weight: bold; margin-top: 4px;">
              <span>تغطية التأمين:</span>
              <span>- ${covered} ريال</span>
            </div>
            <div class="summary-row" style="color: #b91c1c; font-weight: bold; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">
              <span>المطلوب من المريض:</span>
              <span>${patientShare} ريال</span>
            </div>
          ` : ''}
        </div>

        <div class="footer-section">
          <div>
            <p>صُرف بواسطة: <strong>${order.dispensedBy || 'Admin'}</strong></p>
          </div>
          <div class="signature-box">
            توقيع وختم الصيدلي
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(docHtml);
    printWindow.document.close();
  }

  setStatus(order: PrescriptionOrder, status: PrescriptionStatus): void {
    if (status === 'ready') {
      this.openDispenseDialog(order);
      return;
    }

    this.pharmacyApiService.updatePrescriptionStatus(this.apiPrescriptionId(order), status, order.notes)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.NOTIFY_UPDATED'),
            detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.NOTIFY_STATUS_SUCCESS', { no: order.rxNo })
          });
          this.refreshOrders();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
            detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_STATUS_UPDATE')
          });
        }
      });
  }

  getStatusLabel(status: PrescriptionStatus): string {
    const labels: Record<PrescriptionStatus, string> = {
      new: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_NEW'),
      review: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_REVIEW'),
      dispensing: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_DISPENSING'),
      ready: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_READY'),
      delivered: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_DELIVERED')
      ,
      cancelled: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STATUS_CANCELLED')
    };
    return labels[status];
  }

  getStatusSeverity(status: PrescriptionStatus): TagSeverity {
    const map: Record<PrescriptionStatus, TagSeverity> = {
      new: 'warning',
      review: 'info',
      dispensing: 'secondary',
      ready: 'success',
      delivered: 'contrast',
      cancelled: 'danger'
    };
    return map[status];
  }

  getPrioritySeverity(priority: Priority): TagSeverity {
    return priority === 'urgent' ? 'danger' : 'info';
  }

  getPaymentTypeLabel(paymentType: PaymentType): string {
    return paymentType === 'insurance'
      ? this.translateService.instant('PHARMACY_PRESCRIPTIONS.PAY_INSURANCE')
      : this.translateService.instant('PHARMACY_PRESCRIPTIONS.PAY_CASH');
  }

  getInsuranceStatusLabel(status: InsuranceStatus): string {
    const map: Record<InsuranceStatus, string> = {
      none: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_NONE'),
      pending: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_PENDING'),
      approved: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_APPROVED'),
      rejected: this.translateService.instant('PHARMACY_PRESCRIPTIONS.INS_REJECTED')
    };
    return map[status];
  }

  getInsuranceStatusSeverity(status: InsuranceStatus): TagSeverity {
    const map: Record<InsuranceStatus, TagSeverity> = {
      none: 'secondary',
      pending: 'warning',
      approved: 'success',
      rejected: 'danger'
    };
    return map[status];
  }

  get totalRequestedAmount(): number {
    return this.prescriptionDraft.items.reduce((sum, item) => sum + (item.unitPrice * item.requestedQuantity), 0);
  }

  get taxAmount(): number {
    return this.totalRequestedAmount * 0.15;
  }

  get grandTotal(): number {
    return this.totalRequestedAmount + this.taxAmount;
  }

  get isInsuranceApproved(): boolean {
    return Boolean(this.prescriptionDraft.insuranceApprovalNo?.trim());
  }

  get insuranceShare(): number {
    if (this.prescriptionDraft.paymentType !== 'insurance' || !this.isInsuranceApproved) return 0;
    return this.grandTotal * (this.prescriptionDraft.insuranceCoverage / 100);
  }

  get patientShare(): number {
    return this.grandTotal - this.insuranceShare;
  }

  onUpload(event: any): void {
    const files = (event.files || (event.target && event.target.files) || []) as File[];
    if (!files.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const previewUrl = e.target.result as string;
        this.prescriptionDraft.attachments.push({
          id: Date.now() + Math.floor(Math.random() * 10000),
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          uploadDate: new Date(),
          type: 'rx_image',
          previewUrl: previewUrl,
          url: previewUrl
        });
      };
      reader.readAsDataURL(file);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'المرفقات',
      detail: `تم إرفاق ${files.length} ملف بنجاح`
    });

    const order =
      this.editingOrderId != null ? this.findOrderById(this.editingOrderId) : this.selectedOrder() ?? undefined;
    if (order) {
      const prescriptionApiId = this.apiPrescriptionId(order);
      for (const file of files) {
        this.pharmacyApiService.uploadAttachment(prescriptionApiId, file).subscribe({
          next: () => this.loadAttachments(order),
          error: () => {}
        });
      }
    }
  }

  viewAttachment(file: PrescriptionAttachment): void {
    this.previewImageSrc = file.previewUrl || file.url || '';
    this.previewImageTitle = file.fileName || 'معاينة المرفق';
    this.showImagePreviewDialog = true;
  }

  removeAttachment(id: number): void {
    this.prescriptionDraft.attachments = (this.prescriptionDraft.attachments || []).filter((a) => a.id !== id);
    this.messageService.add({
      severity: 'info',
      summary: 'تم الحذف',
      detail: 'تم حذف المرفق'
    });
  }

  suggestSubstitute(item: PrescriptionItem): void {
    this.messageService.add({
      severity: 'info',
      summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUBSTITUTE_SEARCH'),
      detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUBSTITUTE_SEARCH_DETAIL', { name: item.itemName })
    });
    // MVP Mock: Just toast for now
  }

  sendToPOS(order: PrescriptionOrder): void {
    if (order.status !== 'ready' && order.status !== 'delivered') {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_POS_SEND_READY')
      });
      return;
    }
    if (this.sendingToPos.has(order.id)) {
      return;
    }

    this.sendingToPos.add(order.id);
    this.pharmacyApiService.sendToPos(this.apiPrescriptionId(order), 'POS-001', 'cashier-ui').subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_POS_SEND_SUMMARY'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.SUCCESS_POS_SEND', { ref: order.rxNo })
        });
        this.sendingToPos.delete(order.id);
        this.refreshOrders();
      },
      error: () => {
        this.sendingToPos.delete(order.id);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_POS_SEND')
        });
      }
    });
  }

  private createEmptyPrescriptionDraft(): PrescriptionDraft {
    return {
      rxNo: '',
      issueDate: this.toInputDate(new Date()),
      patientName: '',
      doctorName: '',
      paymentType: 'cash',
      insuranceCompanyId: '',
      insuranceName: '',
      insuranceMemberNo: '',
      insuranceApprovalNo: '',
      insuranceCoverage: 80,
      priority: 'normal',
      notes: '',
      items: [],
      attachments: []
    };
  }

  private createEmptyItemDraft(): ItemDraft {
    return {
      itemId: undefined,
      pharmacyCatalogItemId: undefined,
      mainPurchaseClassId: undefined,
      itemCode: '',
      itemName: '',
      dosageForm: 'أقراص',
      strength: '',
      storeId: '',
      storeName: '',
      batchNo: '',
      expiryDate: '',
      selectedBatchKey: undefined,
      needsBatch: false,
      needsExpiry: false,
      isPharmacyItem: false,
      availableQuantity: 0,
      unitPrice: 0,
      requestedQuantity: 1,
      instructions: '',
      allowAlternative: false
    };
  }

  private createEmptyDispenseDraft(): DispenseDraft {
    return {
      storeId: '',
      storeName: '',
      batchNo: '',
      expiryDate: '',
      availableQuantity: 0,
      dispensedQuantity: 1,
      paymentMethod: 'cash',
      amount: 0
    };
  }

  private createEmptyInsuranceDraft(): InsuranceDraft {
    return {
      insuranceName: '',
      memberNo: '',
      approvalNo: '',
      coveredAmount: 0,
      patientShare: 0
    };
  }

  private toInputDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private findOrderById(orderId: number): PrescriptionOrder | undefined {
    return this.orders().find(order => order.id === orderId);
  }

  onBatchSelectionChange(selectionKey?: string | null): void {
    if (!selectionKey) {
      return;
    }

    const selectedBatch = this.currentProductBatches.find(batch => batch.selectionKey === selectionKey);
    if (!selectedBatch) {
      return;
    }
    const selectedStoreId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    if (selectedStoreId && selectedBatch.storeId !== selectedStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_BATCH_MISMATCH_SUMMARY'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_BATCH_MISMATCH_DETAIL')
      });
      this.itemDraft = {
        ...this.itemDraft,
        selectedBatchKey: undefined,
        batchNo: '',
        expiryDate: '',
        availableQuantity: 0
      };
      return;
    }

    this.itemDraft = {
      ...this.itemDraft,
      selectedBatchKey: selectedBatch.selectionKey,
      storeId: selectedBatch.storeId,
      storeName: selectedBatch.storeName,
      mainPurchaseClassId: selectedBatch.productId?.trim() || this.itemDraft.mainPurchaseClassId,
      batchNo: selectedBatch.batchNo ?? '',
      expiryDate: selectedBatch.expiryDate ? this.formatDisplayDate(selectedBatch.expiryDate) : '',
      availableQuantity: selectedBatch.availableQuantity,
      unitPrice: this.itemDraft.unitPrice || selectedBatch.unitPrice
    };
  }

  onDispenseStoreChange(): void {
    const order = this.selectedOrder();
    if (!order) {
      this.dispenseBatchOptions = [];
      return;
    }

    const selectedStoreName = this.dispenseDraft.storeName;
    const batchOptions = order.items
      .filter(item => !selectedStoreName || item.storeName === selectedStoreName)
      .map(item => ({
        label: this.buildDispenseBatchLabel(item),
        value: item.batchNo || ''
      }))
      .filter((option, index, array) => option.value && array.findIndex(item => item.value === option.value) === index);

    this.dispenseBatchOptions = batchOptions;

    const firstMatchingItem = order.items.find(item => !selectedStoreName || item.storeName === selectedStoreName);
    this.dispenseDraft = {
      ...this.dispenseDraft,
      batchNo: batchOptions[0]?.value || '',
      expiryDate: firstMatchingItem?.expiryDate || '',
      availableQuantity: firstMatchingItem?.availableQuantity || 0
    };
  }

  getItemStatusLabel(status: PrescriptionItem['status']): string {
    switch (status) {
      case 'shortage':
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_SHORTAGE') !== 'PHARMACY_PRESCRIPTIONS.ITEM_STATUS_SHORTAGE'
          ? this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_SHORTAGE')
          : 'عجز / غير متوفر';
      case 'dispensed':
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_DISPENSED') !== 'PHARMACY_PRESCRIPTIONS.ITEM_STATUS_DISPENSED'
          ? this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_DISPENSED')
          : 'تم الصرف';
      case 'pending':
      default:
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_PENDING') !== 'PHARMACY_PRESCRIPTIONS.ITEM_STATUS_PENDING'
          ? this.translateService.instant('PHARMACY_PRESCRIPTIONS.ITEM_STATUS_PENDING')
          : 'قيد الصرف';
    }
  }

  getItemStatusSeverity(status: PrescriptionItem['status']): TagSeverity {
    switch (status) {
      case 'shortage':
        return 'danger';
      case 'dispensed':
        return 'success';
      case 'pending':
      default:
        return 'warning';
    }
  }

  private apiPrescriptionId(order: PrescriptionOrder): string {
    const sid = order.serverPrescriptionId?.trim();
    if (sid && sid !== 'undefined' && sid !== 'null' && sid.length > 5) {
      return sid;
    }
    if (order.rxNo?.trim()) {
      return order.rxNo.trim();
    }
    return String(order.id);
  }

  private loadPrescriptionDetails(order: PrescriptionOrder): void {
    const apiId = this.apiPrescriptionId(order);
    const localId = order.id;
    this.pharmacyApiService.getPrescriptionById(apiId).subscribe({
      next: (orderData) => {
        const mappedOrder = this.applyAllocationState(orderData as unknown as PrescriptionOrder);
        this.selectedOrder.set(mappedOrder);
        this.orders.update((list) => list.map((item) => (item.id === localId ? mappedOrder : item)));
        this.checkCurrentInteractions(localId);
        this.loadAttachments(mappedOrder);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.TOAST_ERROR'),
          detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_LOAD_DETAILS')
        });
      }
    });
  }

  private loadAttachments(order: PrescriptionOrder): void {
    const apiId = this.apiPrescriptionId(order);
    const localId = order.id;
    this.pharmacyApiService.getAttachments(apiId).subscribe({
      next: (attachments) => {
        if (this.editingOrderId === localId) {
          this.prescriptionDraft = {
            ...this.prescriptionDraft,
            attachments: attachments as unknown as PrescriptionAttachment[]
          };
        }
        const selected = this.selectedOrder();
        if (selected?.id === localId) {
          this.selectedOrder.set({
            ...selected,
            attachments: attachments as unknown as PrescriptionAttachment[]
          });
        }
      },
      error: () => {
        // Keep attachments optional in MVP
      }
    });
  }

  private checkDraftInteractions(): void {
    const itemIds = this.prescriptionDraft.items.map(item => item.id).filter(id => !!id);
    if (this.itemDraft.itemId) {
      itemIds.push(this.itemDraft.itemId);
    }
    if (!itemIds.length) {
      this.draftInteractionAlertsList = [];
      return;
    }

    this.pharmacyApiService.checkDrugInteractions(itemIds).subscribe({
      next: (alerts) => {
        this.draftInteractionAlertsList = alerts as unknown as InteractionAlert[];
      },
      error: () => {
        this.draftInteractionAlertsList = [];
      }
    });
  }

  private checkCurrentInteractions(orderId: number): void {
    const order = this.findOrderById(orderId);
    const itemIds = order?.items?.map(item => item.id).filter(id => !!id) || [];
    if (!itemIds.length) {
      this.currentInteractionAlertsList = [];
      return;
    }

    this.pharmacyApiService.checkDrugInteractions(itemIds).subscribe({
      next: (alerts) => {
        this.currentInteractionAlertsList = alerts as unknown as InteractionAlert[];
      },
      error: () => {
        this.currentInteractionAlertsList = [];
      }
    });
  }

  private setCurrentProductBatches(batches: PharmacyInventoryBatchOption[], preferredKeyOrBatchNo?: string): void {
    const selectedStoreId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim();
    this.currentProductBatches = [...(batches || [])].filter((batch) => !selectedStoreId || batch.storeId === selectedStoreId);
    this.itemBatchOptions = this.currentProductBatches.map(batch => ({
      label: batch.displayLabel,
      value: batch.selectionKey
    }));

    const preferredKey = (preferredKeyOrBatchNo || this.itemDraft.batchNo || this.itemDraft.selectedBatchKey || '').trim();
    const preferredBatch = (preferredKey
      ? this.currentProductBatches.find(b => b.selectionKey === preferredKey || b.batchNo?.trim() === preferredKey)
      : null) || this.currentProductBatches[0];

    if (preferredBatch) {
      this.onBatchSelectionChange(preferredBatch.selectionKey);
    }
  }

  private validateDraftSelection(): boolean {
    let selectedStoreId = `${this.selectedPharmacyStoreDetailsId ?? ''}`.trim() || `${this.itemDraft.storeId ?? ''}`.trim();
    if (!selectedStoreId && this.pharmacyStoreOptions.length > 0) {
      selectedStoreId = this.pharmacyStoreOptions[0].value;
    }
    if (selectedStoreId) {
      this.selectedPharmacyStoreDetailsId = selectedStoreId;
    }

    if (!selectedStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STORE_SELECT_FIRST'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.STORE_SELECT_FIRST_MSG')
      });
      return false;
    }

    if (this.itemDraft.storeId && `${this.itemDraft.storeId ?? ''}`.trim() !== selectedStoreId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_STORE_MISMATCH_SUMMARY'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_STORE_MISMATCH_DETAIL')
      });
      return false;
    }

    if ((this.itemDraft.needsBatch || this.currentProductBatches.length > 0) && !this.itemDraft.selectedBatchKey) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_BATCH_REQUIRED_SUMMARY'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_BATCH_REQUIRED_DETAIL')
      });
      return false;
    }

    if (this.itemDraft.needsExpiry && !this.itemDraft.expiryDate) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_EXPIRY_REQUIRED_SUMMARY'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_EXPIRY_REQUIRED_DETAIL')
      });
      return false;
    }

    if (this.itemDraft.requestedQuantity > this.itemDraft.availableQuantity) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_QTY_UNAVAILABLE_SUMMARY'),
        detail: this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_QTY_UNAVAILABLE_DETAIL')
      });
      return false;
    }

    return true;
  }

  private resetCurrentMedicationSelection(): void {
    this.itemDraft = this.createEmptyItemDraft();
    this.currentProductBatches = [];
    this.itemBatchOptions = [];
  }

  private getSelectedPharmacyStoreLabel(storeId = this.selectedPharmacyStoreDetailsId): string {
    const normalizedStoreId = `${storeId ?? ''}`.trim();
    return this.pharmacyStoreOptions.find((option) => option.value === normalizedStoreId)?.label ?? '';
  }

  private resolveDraftStoreDetailsId(items: PrescriptionItem[]): string {
    const storeIds = Array.from(new Set((items || []).map((item) => `${item.storeId ?? ''}`.trim()).filter(Boolean)));
    return storeIds.length === 1 ? storeIds[0] : '';
  }

  private buildPrescriptionItemFromDraft(id: number, dispensedQuantity: number): PrescriptionItem {
    const lineSubtotal = this.itemDraft.unitPrice * this.itemDraft.requestedQuantity;
    const lineTax = lineSubtotal * 0.15;
    const status: PrescriptionItem['status'] = this.itemDraft.requestedQuantity <= this.itemDraft.availableQuantity
      ? (dispensedQuantity > 0 ? 'dispensed' : 'pending')
      : 'shortage';

    return {
      id,
      mainPurchaseClassId: this.itemDraft.mainPurchaseClassId,
      pharmacyCatalogItemId: this.itemDraft.pharmacyCatalogItemId,
      itemCode: this.itemDraft.itemCode,
      itemName: this.itemDraft.itemName,
      dosageForm: this.itemDraft.dosageForm,
      strength: this.itemDraft.strength,
      storeId: this.itemDraft.storeId,
      storeName: this.itemDraft.storeName,
      batchNo: this.itemDraft.batchNo,
      expiryDate: this.itemDraft.expiryDate,
      availableQuantity: this.itemDraft.availableQuantity,
      unitPrice: this.itemDraft.unitPrice,
      requestedQuantity: this.itemDraft.requestedQuantity,
      dispensedQuantity,
      discountAmount: 0,
      taxAmount: lineTax,
      totalAmount: lineSubtotal + lineTax,
      instructions: this.itemDraft.instructions,
      allowAlternative: this.itemDraft.allowAlternative,
      needsBatch: this.itemDraft.needsBatch,
      needsExpiry: this.itemDraft.needsExpiry,
      isPharmacyItem: this.itemDraft.isPharmacyItem,
      isControlled: !!this.itemDraft.isControlled,
      status
    };
  }

  private buildDispenseStoreOptions(order: PrescriptionOrder): Array<{ label: string; value: string }> {
    return order.items
      .map(item => item.storeName || '')
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .map(storeName => ({
        label: storeName,
        value: storeName
      }));
  }

  private buildDispenseBatchLabel(item: PrescriptionItem): string {
    const batchLabel = item.batchNo || this.translateService.instant('PHARMACY_PRESCRIPTIONS.BATCH_NONE');
    const expiryLabel = item.expiryDate || this.translateService.instant('PHARMACY_PRESCRIPTIONS.EXPIRY_NONE');
    return `${batchLabel} | ${expiryLabel} | ${item.itemName}`;
  }

  getAllocationModeLabel(mode?: PharmacyAllocationMode): string {
    switch (mode) {
      case 'reservation':
        return 'حجز مؤقت بالمخزون';
      case 'deduction':
        return 'خصم مباشر من المخزون';
      case 'payload-preparation':
      default:
        return 'خصم وتخصيص مباشر من المخزون';
    }
  }

  getAllocationLineStatusLabel(status: PharmacyAllocationLineStatus): string {
    switch (status) {
      case 'prepared':
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ALLOC_STATUS_PREPARED');
      case 'blocked':
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ALLOC_STATUS_BLOCKED');
      case 'pending':
      default:
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ALLOC_STATUS_PENDING');
    }
  }

  getAllocationLineStatusSeverity(status: PharmacyAllocationLineStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'prepared':
        return 'success';
      case 'blocked':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
    }
  }

  private loadDispenseAllocationPreview(order: PrescriptionOrder): void {
    this.allocationPreview = null;
    this.allocationPreviewLoading = true;
    this.cdr.detectChanges();

    this.pharmacyAllocationService.prepareDispenseAllocation(this.buildAllocationOrderInput(order))
      .subscribe({
        next: (result) => {
          this.allocationPreview = result;
          this.allocationPreviewLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.allocationPreviewLoading = false;
          this.allocationPreview = null;
          this.cdr.detectChanges();
        }
      });
  }

  private buildAllocationOrderInput(order: PrescriptionOrder) {
    return {
      prescriptionId: order.id,
      rxNo: order.rxNo,
      status: order.status,
      paymentMethod: this.dispenseDraft.paymentMethod,
      notes: order.notes,
      items: order.items.map(item => ({
        prescriptionItemId: (item as any).prescriptionItemId || item.id,
        mainPurchaseClassId: item.mainPurchaseClassId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        storeId: item.storeId,
        storeName: item.storeName,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        availableQuantity: item.availableQuantity,
        requestedQuantity: item.requestedQuantity,
        dispensedQuantity: item.dispensedQuantity,
        needsBatch: item.needsBatch,
        needsExpiry: item.needsExpiry
      }))
    };
  }

  private applyAllocationState(order: PrescriptionOrder): PrescriptionOrder {
    return {
      ...order,
      allocationState: this.allocationStateByOrderId.get(order.id) ?? order.allocationState ?? null
    };
  }

  private setAllocationState(orderId: number, state: PharmacyAllocationState): void {
    this.allocationStateByOrderId.set(orderId, state);
    this.orders.update(list => list.map(order => order.id === orderId ? {
      ...order,
      allocationState: state
    } : order));

    const selected = this.selectedOrder();
    if (selected?.id === orderId) {
      this.selectedOrder.set({
        ...selected,
        allocationState: state
      });
    }
  }

  private mergeCommittedAllocationState(
    base: PharmacyAllocationState,
    api: PharmacyAllocateDispenseResult
  ): PharmacyAllocationState {
    const committedAt = new Date().toISOString();
    const backendCommitMode: PharmacyBackendCommitMode =
      api.commitMode === 'unknown' ? 'unknown' : (api.commitMode as PharmacyBackendCommitMode);

    let allocationMode: PharmacyAllocationMode = base.allocationMode;
    if (api.commitMode === 'deduction') {
      allocationMode = 'deduction';
    } else if (api.commitMode === 'reservation' || api.commitMode === 'payload_logged') {
      allocationMode = 'reservation';
    }

    const payload = base.payload
      ? {
          ...base.payload,
          allocationMode,
          lines: base.payload.lines.map((line) => ({
            ...line,
            allocationMode
          }))
        }
      : null;

    return {
      ...base,
      backendCommitted: true,
      allocationReferenceId: api.allocationReferenceId ?? null,
      backendCommitMode,
      committedAt,
      allocationMode,
      payload
    };
  }

  private commitModeToastDetail(api: PharmacyAllocateDispenseResult, rxNo: string): string {
    const refLabel = this.translateService.instant('PHARMACY_PRESCRIPTIONS.COMMIT_REF_LABEL');
    const ref = api.allocationReferenceId ? ` — ${refLabel}: ${api.allocationReferenceId}` : '';
    let mode = '';
    switch (api.commitMode) {
      case 'deduction':
        mode = this.translateService.instant('PHARMACY_PRESCRIPTIONS.COMMIT_MODE_DEDUCTION');
        break;
      case 'reservation':
        mode = this.translateService.instant('PHARMACY_PRESCRIPTIONS.COMMIT_MODE_RESERVATION');
        break;
      case 'payload_logged':
        mode = this.translateService.instant('PHARMACY_PRESCRIPTIONS.COMMIT_MODE_PAYLOAD_LOGGED');
        break;
      default:
        mode = this.translateService.instant('PHARMACY_PRESCRIPTIONS.COMMIT_MODE_DEFAULT');
        break;
    }
    return `${rxNo ? `${rxNo} — ` : ''}${mode}${ref}`;
  }

  private formatAllocateDispenseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; title?: string; detail?: string } | string | null;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (body && typeof body === 'object') {
        const msg = body.message || body.detail || body.title;
        if (msg) {
          return `${msg}`;
        }
      }
      if (err.status === 404) {
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DISPENSE_404');
      }
      if (err.status === 0) {
        return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DISPENSE_CONNECTION');
      }
    }
    return this.translateService.instant('PHARMACY_PRESCRIPTIONS.ERR_DISPENSE_DEFAULT');
  }

  private formatDisplayDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return `${value}`;
    }

    return date.toISOString().slice(0, 10);
  }
}
