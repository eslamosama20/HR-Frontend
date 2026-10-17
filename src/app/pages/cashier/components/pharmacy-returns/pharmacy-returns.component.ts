import { Component, OnInit, signal } from '@angular/core';
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
import { MessageService } from 'primeng/api';
import { PharmacySupportApiService } from 'src/app/services/cashier/pharmacy-support-api.service';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type ReturnSource = 'customer' | 'internal' | 'supplier';
type ReturnReferenceType = 'sales_invoice' | 'purchase_invoice' | 'prescription' | 'inventory_permit';
type InventoryAction = 'restock' | 'quarantine' | 'destroy' | 'return_to_supplier';
type ReturnStatus = 'pending' | 'review' | 'approved' | 'rejected' | 'cancelled';
type ReturnReasonCode =
  | 'wrong_item'
  | 'adverse_reaction'
  | 'damaged'
  | 'temperature'
  | 'near_expiry'
  | 'customer_request'
  | 'other';
type RefundMethod = 'cash' | 'card' | 'wallet' | 'credit_note';
type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

interface PharmacyReturn {
  id: string;
  returnNo: string;
  source: ReturnSource;
  referenceType: ReturnReferenceType;
  referenceId: string | null;
  referenceNo: string;
  requestorName: string;
  createdBy: string;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  batchId: string | null;
  batchNo: string;
  storeId: string | null;
  storeName: string;
  targetStoreId: string | null;
  targetStoreName: string;
  unitId: string | null;
  quantity: number;
  availableReturnQty: number;
  approvedQty: number;
  receivedQty: number;
  unitPrice: number;
  reasonCode: ReturnReasonCode;
  reason: string;
  decisionReason: string;
  inventoryAction: InventoryAction;
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: RefundMethod | null;
  supplierCreditAmount: number;
  notes: string;
  returnDate: Date;
  reviewedBy: string;
  approvedBy: string;
  reviewedAt: Date | null;
  approvedAt: Date | null;
}

interface ReturnDraft {
  returnNo: string;
  source: ReturnSource;
  referenceType: ReturnReferenceType | null;
  referenceId: string | null;
  referenceNo: string;
  requestorName: string;
  createdBy: string;
  itemId: string | null;
  itemCode: string;
  itemName: string;
  batchId: string | null;
  batchNo: string;
  storeId: string | null;
  storeName: string;
  targetStoreId: string | null;
  targetStoreName: string;
  unitId: string | null;
  quantity: number;
  availableReturnQty: number;
  approvedQty: number;
  receivedQty: number;
  unitPrice: number;
  reasonCode: ReturnReasonCode;
  reason: string;
  decisionReason: string;
  inventoryAction: InventoryAction;
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: RefundMethod | null;
  supplierCreditAmount: number;
  notes: string;
}

interface StatusDraft {
  status: ReturnStatus;
  approvedQty: number;
  decisionReason: string;
  notes: string;
}

interface ReturnReferenceLookupItem {
  id: string;
  type: ReturnReferenceType;
  source: ReturnSource;
  referenceNo: string;
  requestorName: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  batchId: string | null;
  batchNo: string;
  storeId: string;
  storeName: string;
  unitId: string;
  availableReturnQty: number;
  unitPrice: number;
}

interface StoreOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-pharmacy-returns',
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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-returns.component.html',
  styleUrls: ['./pharmacy-returns.component.scss']
})
export class PharmacyReturnsComponent implements OnInit {
  returns = signal<PharmacyReturn[]>([]);
  selectedReturn = signal<PharmacyReturn | null>(null);

  searchTerm = '';
  selectedSource: ReturnSource | 'all' = 'all';
  selectedStatus: ReturnStatus | 'all' = 'all';

  showDetailsDialog = false;
  showReturnDialog = false;
  showStatusDialog = false;

  editingReturnId: string | null = null;
  statusReturnId: string | null = null;

  returnDraft: ReturnDraft = this.createEmptyReturnDraft();
  statusDraft: StatusDraft = this.createEmptyStatusDraft();

  storeMasterOptions: StoreOption[] = [];

  /** Invoice-based return (API contract §2.2 + §2.4) */
  invoiceReturnNo = '';
  invoiceLookupLoading = false;
  invoiceLookupError: string | null = null;
  invoiceLookupResult: { invoiceNo: string; customerName?: string; items: Array<{ itemId: string; itemName?: string; quantity: number; price?: number }> } | null = null;
  invoiceReturnQuantities: Record<string, number> = {};

  readonly referenceCatalog: ReturnReferenceLookupItem[] = [];

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private pharmacySupportApiService: PharmacySupportApiService
  ) {}

  ngOnInit(): void {
    this.loadPosStores();
    this.loadReturns();
  }

  private loadPosStores(): void {
    this.pharmacySupportApiService.getPosAvailableStores().subscribe({
      next: (rows) => {
        this.storeMasterOptions = (rows || []).map((s) => ({
          label: s.name || s.nameEn || s.code || String(s.id),
          value: String(s.id)
        }));
        if (!this.returnDraft.targetStoreId && this.storeMasterOptions.length) {
          this.returnDraft.targetStoreId = this.storeMasterOptions[0].value;
          this.returnDraft.targetStoreName = this.storeMasterOptions[0].label;
        }
      },
      error: () => {
        this.storeMasterOptions = [];
      }
    });
  }

  get sourceOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_CUSTOMER'), value: 'customer' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_INTERNAL'), value: 'internal' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_SUPPLIER'), value: 'supplier' }
    ];
  }

  get statusOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_PENDING'), value: 'pending' },
      { label: 'تحت المراجعة', value: 'review' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_APPROVED'), value: 'approved' },
      { label: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_REJECTED'), value: 'rejected' },
      { label: 'ملغي', value: 'cancelled' }
    ];
  }

  get referenceTypeOptions() {
    const allOptions = [
      { label: 'فاتورة مبيعات', value: 'sales_invoice' as ReturnReferenceType },
      { label: 'وصفة صرف', value: 'prescription' as ReturnReferenceType },
      { label: 'فاتورة مشتريات', value: 'purchase_invoice' as ReturnReferenceType },
      { label: 'إذن مخزني', value: 'inventory_permit' as ReturnReferenceType }
    ];

    switch (this.returnDraft.source) {
      case 'customer':
        return allOptions.filter(option => option.value === 'sales_invoice' || option.value === 'prescription');
      case 'supplier':
        return allOptions.filter(option => option.value === 'purchase_invoice');
      default:
        return allOptions.filter(option => option.value === 'inventory_permit' || option.value === 'purchase_invoice');
    }
  }

  get inventoryActionOptions() {
    const allOptions = [
      { label: 'إعادة للمخزن', value: 'restock' as InventoryAction },
      { label: 'تحويل للحجر', value: 'quarantine' as InventoryAction },
      { label: 'إتلاف', value: 'destroy' as InventoryAction },
      { label: 'إرجاع للمورد', value: 'return_to_supplier' as InventoryAction }
    ];

    if (this.returnDraft.source === 'customer') {
      return allOptions.filter(option => option.value !== 'return_to_supplier');
    }

    if (this.returnDraft.source === 'supplier') {
      return allOptions.filter(option => option.value === 'return_to_supplier' || option.value === 'quarantine');
    }

    return allOptions;
  }

  get reasonCodeOptions() {
    return [
      { label: 'صرف صنف خاطئ', value: 'wrong_item' as ReturnReasonCode },
      { label: 'تفاعل أو حساسية', value: 'adverse_reaction' as ReturnReasonCode },
      { label: 'تلف أو كسر', value: 'damaged' as ReturnReasonCode },
      { label: 'خلل حرارة/تخزين', value: 'temperature' as ReturnReasonCode },
      { label: 'قرب انتهاء الصلاحية', value: 'near_expiry' as ReturnReasonCode },
      { label: 'طلب عميل', value: 'customer_request' as ReturnReasonCode },
      { label: 'أخرى', value: 'other' as ReturnReasonCode }
    ];
  }

  get refundMethodOptions() {
    return [
      { label: 'نقدي', value: 'cash' as RefundMethod },
      { label: 'بطاقة', value: 'card' as RefundMethod },
      { label: 'محفظة', value: 'wallet' as RefundMethod },
      { label: 'إشعار دائن', value: 'credit_note' as RefundMethod }
    ];
  }

  get storeOptions() {
    return this.storeMasterOptions;
  }

  lookupInvoiceForReturn(): void {
    const no = this.invoiceReturnNo.trim();
    if (!no) {
      this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'أدخل رقم الفاتورة.' });
      return;
    }
    this.invoiceLookupLoading = true;
    this.invoiceLookupError = null;
    this.invoiceLookupResult = null;
    this.invoiceReturnQuantities = {};
    this.pharmacySupportApiService.lookupReturnInvoice(no).subscribe({
      next: (res) => {
        this.invoiceLookupLoading = false;
        const items = Array.isArray(res?.items) ? res.items : [];
        this.invoiceLookupResult = {
          invoiceNo: res?.invoiceNo ?? no,
          customerName: res?.customerName,
          items: items.map((it: any) => ({
            itemId: String(it?.itemId ?? '').trim(),
            itemName: it?.itemName,
            quantity: Number(it?.quantity ?? 0) || 0,
            price: it?.price != null ? Number(it.price) : undefined
          }))
        };
        for (const row of this.invoiceLookupResult.items) {
          if (row.itemId) {
            this.invoiceReturnQuantities[row.itemId] = Math.min(1, row.quantity || 1);
          }
        }
      },
      error: (err) => {
        this.invoiceLookupLoading = false;
        this.invoiceLookupError =
          err?.status === 404
            ? (typeof err?.error?.message === 'string' ? err.error.message : 'الفاتورة غير موجودة.')
            : 'تعذر البحث عن الفاتورة.';
        this.messageService.add({
          severity: 'info',
          summary: 'بحث',
          detail: this.invoiceLookupError
        });
      }
    });
  }

  saveInvoiceReturn(): void {
    if (!this.invoiceLookupResult?.items?.length) {
      this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'ابحث عن فاتورة صالحة أولاً.' });
      return;
    }
    const invNo = this.invoiceLookupResult.invoiceNo;
    const items: Array<{ itemId: string; quantity: number }> = [];
    for (const row of this.invoiceLookupResult.items) {
      if (!row.itemId) {
        continue;
      }
      const q = Math.max(0, Math.min(Number(this.invoiceReturnQuantities[row.itemId] ?? 0) || 0, row.quantity));
      if (q > 0) {
        items.push({ itemId: row.itemId, quantity: q });
      }
    }
    if (!items.length) {
      this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'حدد كمية مرتجع أكبر من صفر لسطر واحد على الأقل.' });
      return;
    }
    this.pharmacySupportApiService.createReturnFromInvoice({ invoiceNo: invNo, items }).subscribe({
      next: () => {
        this.showReturnDialog = false;
        this.loadReturns();
        this.invoiceReturnNo = '';
        this.invoiceLookupResult = null;
        this.invoiceReturnQuantities = {};
        this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم تسجيل المرتجع من الفاتورة.' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر إنشاء المرتجع من الفاتورة.' });
      }
    });
  }

  get referenceLookupOptions() {
    return this.referenceCatalog
      .filter(item => item.source === this.returnDraft.source)
      .filter(item => !this.returnDraft.referenceType || item.type === this.returnDraft.referenceType)
      .map(item => ({
        label: `${item.referenceNo} - ${item.itemName} - ${item.storeName}`,
        value: item.id
      }));
  }

  get filteredReturns(): PharmacyReturn[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.returns().filter(item => {
      const sourceMatch = this.selectedSource === 'all' || item.source === this.selectedSource;
      const statusMatch = this.selectedStatus === 'all' || item.status === this.selectedStatus;
      const textMatch =
        !keyword ||
        `${item.returnNo} ${item.referenceNo} ${item.itemCode} ${item.itemName} ${item.batchNo} ${item.requestorName} ${item.storeName}`
          .toLowerCase()
          .includes(keyword);
      return sourceMatch && statusMatch && textMatch;
    });
  }

  get pendingCount(): number {
    return this.returns().filter(item => item.status === 'pending' || item.status === 'review').length;
  }

  get approvedCount(): number {
    return this.returns().filter(item => item.status === 'approved').length;
  }

  get quarantineCount(): number {
    return this.returns().filter(item => item.inventoryAction === 'quarantine').length;
  }

  get shouldShowRefundSection(): boolean {
    return this.returnDraft.source === 'customer';
  }

  get shouldShowSupplierCreditSection(): boolean {
    return this.returnDraft.source === 'supplier';
  }

  get requiresTargetStore(): boolean {
    return this.returnDraft.inventoryAction === 'restock' || this.returnDraft.inventoryAction === 'quarantine';
  }

  loadReturns(): void {
    this.pharmacySupportApiService.getReturns(1, 100).subscribe({
      next: (items) => {
        this.returns.set(items as unknown as PharmacyReturn[]);
      },
      error: () => {
        this.returns.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تحميل المرتجعات.'
        });
      }
    });
  }

  openNewReturn(): void {
    this.editingReturnId = null;
    this.returnDraft = this.createEmptyReturnDraft();
    this.invoiceReturnNo = '';
    this.invoiceLookupResult = null;
    this.invoiceLookupError = null;
    this.invoiceReturnQuantities = {};
    this.showReturnDialog = true;
  }

  openEditReturn(returnItem: PharmacyReturn): void {
    this.editingReturnId = returnItem.id;
    this.selectedReturn.set(returnItem);
    this.returnDraft = {
      returnNo: returnItem.returnNo,
      source: returnItem.source,
      referenceType: returnItem.referenceType,
      referenceId: returnItem.referenceId,
      referenceNo: returnItem.referenceNo,
      requestorName: returnItem.requestorName,
      createdBy: returnItem.createdBy,
      itemId: returnItem.itemId,
      itemCode: returnItem.itemCode,
      itemName: returnItem.itemName,
      batchId: returnItem.batchId,
      batchNo: returnItem.batchNo,
      storeId: returnItem.storeId,
      storeName: returnItem.storeName,
      targetStoreId: returnItem.targetStoreId,
      targetStoreName: returnItem.targetStoreName,
      unitId: returnItem.unitId,
      quantity: returnItem.quantity,
      availableReturnQty: returnItem.availableReturnQty,
      approvedQty: returnItem.approvedQty,
      receivedQty: returnItem.receivedQty,
      unitPrice: returnItem.unitPrice,
      reasonCode: returnItem.reasonCode,
      reason: returnItem.reason,
      decisionReason: returnItem.decisionReason,
      inventoryAction: returnItem.inventoryAction,
      status: returnItem.status,
      refundAmount: returnItem.refundAmount,
      refundMethod: returnItem.refundMethod,
      supplierCreditAmount: returnItem.supplierCreditAmount,
      notes: returnItem.notes
    };
    this.enforceDraftRules();
    this.showReturnDialog = true;
  }

  onSourceChange(): void {
    this.returnDraft.referenceType = null;
    this.returnDraft.referenceId = null;
    this.clearReferenceSelection();
    this.enforceDraftRules();
  }

  onReferenceTypeChange(): void {
    this.returnDraft.referenceId = null;
    this.clearReferenceSelection(false);
  }

  onReferenceSelectionChange(): void {
    const selectedReference = this.referenceCatalog.find(item => item.id === this.returnDraft.referenceId);
    if (!selectedReference) {
      this.clearReferenceSelection(false);
      return;
    }

    this.returnDraft.referenceNo = selectedReference.referenceNo;
    this.returnDraft.requestorName = selectedReference.requestorName;
    this.returnDraft.itemId = selectedReference.itemId;
    this.returnDraft.itemCode = selectedReference.itemCode;
    this.returnDraft.itemName = selectedReference.itemName;
    this.returnDraft.batchId = selectedReference.batchId;
    this.returnDraft.batchNo = selectedReference.batchNo;
    this.returnDraft.storeId = selectedReference.storeId;
    this.returnDraft.storeName = selectedReference.storeName;
    this.returnDraft.unitId = selectedReference.unitId;
    this.returnDraft.availableReturnQty = selectedReference.availableReturnQty;
    this.returnDraft.quantity = Math.max(1, Math.min(this.returnDraft.quantity || 1, selectedReference.availableReturnQty));
    this.returnDraft.approvedQty = this.returnDraft.quantity;
    this.returnDraft.unitPrice = selectedReference.unitPrice;

    if (this.returnDraft.source === 'customer') {
      this.returnDraft.refundAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
      this.returnDraft.refundMethod = this.returnDraft.refundMethod || 'cash';
    } else {
      this.returnDraft.refundAmount = 0;
      this.returnDraft.refundMethod = null;
    }

    if (this.returnDraft.source === 'supplier') {
      this.returnDraft.supplierCreditAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
    }

    this.enforceDraftRules();
  }

  onInventoryActionChange(): void {
    this.enforceDraftRules();
  }

  onQuantityChange(): void {
    const maxQty = Math.max(1, this.returnDraft.availableReturnQty || this.returnDraft.quantity || 1);
    this.returnDraft.quantity = Math.max(1, Math.min(Number(this.returnDraft.quantity) || 1, maxQty));
    this.returnDraft.approvedQty = Math.max(1, Math.min(Number(this.returnDraft.approvedQty) || this.returnDraft.quantity, this.returnDraft.quantity));
    this.recalculateFinancials();
  }

  onApprovedQtyChange(): void {
    const maxQty = Math.max(1, this.returnDraft.quantity || 1);
    this.returnDraft.approvedQty = Math.max(1, Math.min(Number(this.returnDraft.approvedQty) || 1, maxQty));
    this.recalculateFinancials();
  }

  onTargetStoreChange(): void {
    this.returnDraft.targetStoreName = this.getStoreName(this.returnDraft.targetStoreId);
  }

  saveReturn(): void {
    if (!this.validateReturnDraft()) {
      return;
    }

    if (this.editingReturnId) {
      this.messageService.add({
        severity: 'info',
        summary: 'تنبيه',
        detail: 'تعديل المرتجع غير مدعوم ضمن نطاق MVP الحالي.'
      });
      return;
    }

    this.pharmacySupportApiService.createReturn({
      source: this.returnDraft.source,
      itemCode: this.returnDraft.itemCode,
      itemName: this.returnDraft.itemName,
      batchNo: this.returnDraft.batchNo,
      quantity: Number(this.returnDraft.quantity) || 0,
      reason: this.returnDraft.reason || this.getReasonCodeLabel(this.returnDraft.reasonCode)
    }).subscribe({
      next: () => {
        this.showReturnDialog = false;
        this.loadReturns();
        this.messageService.add({ severity: 'success', summary: 'تمت إضافة المرتجع' });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر إنشاء المرتجع.'
        });
      }
    });
  }

  openDetails(returnItem: PharmacyReturn): void {
    this.pharmacySupportApiService.getReturnById(returnItem.id).subscribe({
      next: (response) => {
        this.selectedReturn.set({
          ...returnItem,
          ...response
        } as PharmacyReturn);
        this.showDetailsDialog = true;
      },
      error: () => {
        this.selectedReturn.set(returnItem);
        this.showDetailsDialog = true;
      }
    });
  }

  openStatusDialog(returnItem: PharmacyReturn): void {
    this.statusReturnId = returnItem.id;
    this.selectedReturn.set(returnItem);
    this.statusDraft = {
      status: returnItem.status,
      approvedQty: returnItem.approvedQty,
      decisionReason: returnItem.decisionReason,
      notes: returnItem.notes
    };
    this.showStatusDialog = true;
  }

  saveStatus(): void {
    const returnId = this.statusReturnId;
    if (!returnId) {
      return;
    }

    this.pharmacySupportApiService.patchPharmacyReturn(returnId, {
      status: this.statusDraft.status,
      approvedQty: this.statusDraft.approvedQty,
      receivedQty: this.statusDraft.approvedQty,
      decisionReason: this.statusDraft.decisionReason,
      notes: this.statusDraft.notes
    }).subscribe({
      next: () => {
        this.showStatusDialog = false;
        this.loadReturns();
        this.messageService.add({
          severity: 'success',
          summary: 'تم تحديث الحالة'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تحديث حالة المرتجع.'
        });
      }
    });
  }

  updateStatus(returnItem: PharmacyReturn, status: ReturnStatus): void {
    this.pharmacySupportApiService.patchPharmacyReturnStatus(returnItem.id, {
      status: status === 'review' ? 'pending' : status
    }).subscribe({
      next: () => {
        this.loadReturns();
        this.messageService.add({
          severity: status === 'approved' ? 'success' : 'warn',
          summary: this.translateService.instant('PHARMACY_RETURNS_PAGE.NOTIFY_UPDATED'),
          detail: this.translateService.instant('PHARMACY_RETURNS_PAGE.NOTIFY_SUCCESS', { no: returnItem.returnNo })
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تحديث حالة المرتجع.'
        });
      }
    });
  }

  getSourceLabel(source: ReturnSource): string {
    const labels: Record<ReturnSource, string> = {
      customer: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_CUSTOMER'),
      internal: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_INTERNAL'),
      supplier: this.translateService.instant('PHARMACY_RETURNS_PAGE.SOURCE_SUPPLIER')
    };
    return labels[source];
  }

  getReferenceTypeLabel(referenceType: ReturnReferenceType): string {
    const labels: Record<ReturnReferenceType, string> = {
      sales_invoice: 'فاتورة مبيعات',
      purchase_invoice: 'فاتورة مشتريات',
      prescription: 'وصفة صرف',
      inventory_permit: 'إذن مخزني'
    };
    return labels[referenceType];
  }

  getInventoryActionLabel(action: InventoryAction): string {
    const labels: Record<InventoryAction, string> = {
      restock: 'إعادة للمخزن',
      quarantine: 'تحويل للحجر',
      destroy: 'إتلاف',
      return_to_supplier: 'إرجاع للمورد'
    };
    return labels[action];
  }

  getInventoryActionTag(action: InventoryAction): TagSeverity {
    const map: Record<InventoryAction, TagSeverity> = {
      restock: 'success',
      quarantine: 'warning',
      destroy: 'danger',
      return_to_supplier: 'info'
    };
    return map[action];
  }

  getStatusLabel(status: ReturnStatus): string {
    const labels: Record<ReturnStatus, string> = {
      pending: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_PENDING'),
      review: 'تحت المراجعة',
      approved: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_APPROVED'),
      rejected: this.translateService.instant('PHARMACY_RETURNS_PAGE.STATUS_REJECTED'),
      cancelled: 'ملغي'
    };
    return labels[status];
  }

  getStatusTag(status: ReturnStatus): TagSeverity {
    const map: Record<ReturnStatus, TagSeverity> = {
      pending: 'warning',
      review: 'info',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return map[status];
  }

  getReasonCodeLabel(reasonCode: ReturnReasonCode): string {
    const labels: Record<ReturnReasonCode, string> = {
      wrong_item: 'صرف صنف خاطئ',
      adverse_reaction: 'تفاعل أو حساسية',
      damaged: 'تلف أو كسر',
      temperature: 'خلل حرارة/تخزين',
      near_expiry: 'قرب انتهاء الصلاحية',
      customer_request: 'طلب عميل',
      other: 'أخرى'
    };
    return labels[reasonCode];
  }

  getFinancialSummary(returnItem: PharmacyReturn): string {
    if (returnItem.refundAmount > 0) {
      return `رد ${returnItem.refundAmount.toFixed(2)}`;
    }

    if (returnItem.supplierCreditAmount > 0) {
      return `إشعار دائن ${returnItem.supplierCreditAmount.toFixed(2)}`;
    }

    return '-';
  }

  private createEmptyReturnDraft(): ReturnDraft {
    const first = this.storeMasterOptions[0];
    return {
      returnNo: '',
      source: 'customer',
      referenceType: null,
      referenceId: null,
      referenceNo: '',
      requestorName: '',
      createdBy: 'الصيدلي الحالي',
      itemId: null,
      itemCode: '',
      itemName: '',
      batchId: null,
      batchNo: '',
      storeId: null,
      storeName: '',
      targetStoreId: first?.value ?? null,
      targetStoreName: first?.label ?? '',
      unitId: null,
      quantity: 1,
      availableReturnQty: 0,
      approvedQty: 1,
      receivedQty: 1,
      unitPrice: 0,
      reasonCode: 'customer_request',
      reason: '',
      decisionReason: '',
      inventoryAction: 'restock',
      status: 'pending',
      refundAmount: 0,
      refundMethod: 'cash',
      supplierCreditAmount: 0,
      notes: ''
    };
  }

  private createEmptyStatusDraft(): StatusDraft {
    return {
      status: 'pending',
      approvedQty: 1,
      decisionReason: '',
      notes: ''
    };
  }

  private clearReferenceSelection(clearType: boolean = true): void {
    if (clearType) {
      this.returnDraft.referenceType = null;
    }

    this.returnDraft.referenceId = null;
    this.returnDraft.referenceNo = '';
    this.returnDraft.requestorName = '';
    this.returnDraft.itemId = null;
    this.returnDraft.itemCode = '';
    this.returnDraft.itemName = '';
    this.returnDraft.batchId = null;
    this.returnDraft.batchNo = '';
    this.returnDraft.storeId = null;
    this.returnDraft.storeName = '';
    this.returnDraft.unitId = null;
    this.returnDraft.availableReturnQty = 0;
    this.returnDraft.unitPrice = 0;
    this.returnDraft.quantity = 1;
    this.returnDraft.approvedQty = 1;
    this.returnDraft.receivedQty = 1;
    this.returnDraft.refundAmount = 0;
    this.returnDraft.supplierCreditAmount = 0;
  }

  private validateReturnDraft(): boolean {
    if (!this.returnDraft.source || !this.returnDraft.itemCode || !this.returnDraft.itemName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'بيانات غير مكتملة',
        detail: 'أدخل المصدر وكود الصنف واسم الصنف قبل الحفظ.'
      });
      return false;
    }

    if (!this.returnDraft.batchNo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'بيانات غير مكتملة',
        detail: 'أدخل رقم الدفعة قبل الحفظ.'
      });
      return false;
    }

    if (this.returnDraft.quantity <= 0 || this.returnDraft.approvedQty <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'كمية غير صحيحة',
        detail: 'الكمية المطلوبة والمعتمدة يجب أن تكون أكبر من صفر.'
      });
      return false;
    }

    return true;
  }

  private enforceDraftRules(): void {
    if (this.returnDraft.source === 'supplier') {
      this.returnDraft.inventoryAction = this.returnDraft.inventoryAction === 'restock'
        ? 'return_to_supplier'
        : this.returnDraft.inventoryAction;
      this.returnDraft.refundAmount = 0;
      this.returnDraft.refundMethod = null;
      this.returnDraft.supplierCreditAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
    }

    if (this.returnDraft.source === 'customer') {
      if (this.returnDraft.inventoryAction === 'return_to_supplier') {
        this.returnDraft.inventoryAction = 'restock';
      }
      this.returnDraft.supplierCreditAmount = 0;
      this.returnDraft.refundMethod = this.returnDraft.refundMethod || 'cash';
      this.returnDraft.refundAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
    }

    if (this.returnDraft.source === 'internal') {
      this.returnDraft.refundAmount = 0;
      this.returnDraft.refundMethod = null;
      this.returnDraft.supplierCreditAmount = 0;
    }

    if (this.returnDraft.inventoryAction === 'quarantine') {
      const id = this.storeMasterOptions[0]?.value ?? this.returnDraft.targetStoreId;
      this.returnDraft.targetStoreId = id;
      this.returnDraft.targetStoreName = this.getStoreName(id);
    } else if (this.returnDraft.inventoryAction === 'destroy' || this.returnDraft.inventoryAction === 'return_to_supplier') {
      this.returnDraft.targetStoreId = null;
      this.returnDraft.targetStoreName = '';
    } else if (this.returnDraft.inventoryAction === 'restock' && !this.returnDraft.targetStoreId) {
      this.returnDraft.targetStoreId = this.returnDraft.storeId;
      this.returnDraft.targetStoreName = this.getStoreName(this.returnDraft.storeId);
    }
  }

  private recalculateFinancials(): void {
    if (this.returnDraft.source === 'customer') {
      this.returnDraft.refundAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
    } else if (this.returnDraft.source === 'supplier') {
      this.returnDraft.supplierCreditAmount = this.returnDraft.approvedQty * this.returnDraft.unitPrice;
    }
  }

  private getStoreName(storeId: string | null): string {
    return this.storeMasterOptions.find(option => option.value === storeId)?.label || '';
  }

  private findReturnById(returnId: string): PharmacyReturn | undefined {
    return this.returns().find(item => item.id === returnId);
  }

}
