import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  CashierReceiptData,
  CashierReceiptTemplateId,
  CashierReceiptTemplateService
} from 'src/app/services/cashier/cashier-receipt-template.service';
import { CashierReceiptTemplatePreviewComponent } from '../shared/cashier-receipt-template-preview/cashier-receipt-template-preview.component';
import { TranslateModule } from '@ngx-translate/core';
import { CashierInvoiceControlService } from 'src/app/services/cashier/cashier-invoice-control.service';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { AuthService } from 'src/app/modules/auth';
import { formatDateToString } from 'src/app/utils/dateUtils';
import {
  CashierInvoiceDto,
  CashierInvoiceListFilters,
  CashierInvoicePaymentDto,
  CashierInvoiceStatsDto,
  InvoiceActionReasonDto
} from 'src/app/models/cashier/cashier-invoice-control.model';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type InvoiceStatus = 'paid' | 'pending' | 'voided' | 'cancelled' | 'refunded' | 'partial_refund';
type InvoicePaymentType = 'cash' | 'card' | 'mixed' | 'credit' | string;

interface CashierInvoiceLine {
  saleItemId?: number | string;
  itemCode?: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  returnedQty?: number;
  maxReturnQty?: number;
  returnQty?: number;
  selected?: boolean;
  discount?: number;
  tax?: number;
  taxPercentage?: number;
}

interface CashierInvoice {
  id: number | string;
  invoiceNo: string;
  shiftInvoiceNo?: number | null;
  invoiceDate: Date;
  customerName: string;
  customerTaxNumber?: string;
  cashierName: string;
  stationName: string;
  paymentType: InvoicePaymentType;
  status: InvoiceStatus;
  items: CashierInvoiceLine[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  canCancel: boolean;
  canVoid: boolean;
  canRefund: boolean;
  canReprint: boolean;
  lastActionAt?: Date;
  lastActionReason?: string;
}

@Component({
  selector: 'app-invoice-control',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    InputTextareaModule,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
    CashierReceiptTemplatePreviewComponent,
    TranslateModule
  ],
  providers: [MessageService],
  templateUrl: './invoice-control.component.html',
  styleUrls: ['./invoice-control.component.scss']
})
export class InvoiceControlComponent implements OnInit {
  loading = signal<boolean>(false);
  processing = signal<boolean>(false);
  invoices = signal<CashierInvoice[]>([]);
  selectedInvoice = signal<CashierInvoice | null>(null);
  selectedInvoicePayment = signal<CashierInvoicePaymentDto | null>(null);
  stats = signal<CashierInvoiceStatsDto | null>(null);
  errorMessage = signal<string>('');

  searchTerm = '';
  tableSearchValue = '';
  selectedStatus: InvoiceStatus | 'all' = 'all';
  selectedPayment: InvoicePaymentType | 'all' = 'all';
  selectedSessionId: number | 'all' = 'all';
  sessionOptions: Array<{ label: string; value: number | 'all' }> = [
    { label: 'كل الورديات', value: 'all' }
  ];
  isAdmin = false;
  fromDate = '';
  toDate = '';

  showDetailsDialog = false;
  showReprintDialog = false;
  showTemplateManagerDialog = false;
  showCancelDialog = false;
  showRefundDialog = false;

  reprintTemplate: CashierReceiptTemplateId = 'classic';
  reprintPrinter = 'front-desk';
  reprintCopies = 1;
  selectedReprintPrintType: string = 'Thermal80mm';
  adminTemplateSelection: CashierReceiptTemplateId = 'classic';

  cancelReason = '';
  cancelNotes = '';
  refundReason = '';
  refundNotes = '';

  readonly statusOptions: Array<{ label: string; value: InvoiceStatus | 'all' }> = [
    { label: 'كل الحالات', value: 'all' },
    { label: 'مدفوعة', value: 'paid' },
    { label: 'معلقة', value: 'pending' },
    { label: 'ملغاة', value: 'cancelled' },
    { label: 'Void', value: 'voided' },
    { label: 'مرتجعة', value: 'refunded' },
    { label: 'مرتجع جزئي', value: 'partial_refund' }
  ];

  readonly paymentOptions: Array<{ label: string; value: InvoicePaymentType | 'all' }> = [
    { label: 'كل طرق الدفع', value: 'all' },
    { label: 'نقدي', value: 'cash' },
    { label: 'بطاقة', value: 'card' },
    { label: 'مختلط', value: 'mixed' },
    { label: 'آجل', value: 'credit' }
  ];

  cancelReasonOptions: Array<{ label: string; value: string }> = [];

  readonly printerOptions: Array<{ label: string; value: string }> = [
    { label: 'طابعة الكاونتر', value: 'front-desk' },
    { label: 'طابعة الممر', value: 'hall' },
    { label: 'حفظ PDF فقط', value: 'pdf' }
  ];

  constructor(
    private messageService: MessageService,
    private receiptTemplateService: CashierReceiptTemplateService,
    private invoiceControlService: CashierInvoiceControlService,
    private cashierService: CashierService,
    private salesInvoiceService: SalesInvoiceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.reprintTemplate = this.receiptTemplateService.currentTemplateId;
    this.adminTemplateSelection = this.receiptTemplateService.currentTemplateId;
    this.checkAdminStatus();
    this.loadActionReasons();
    this.reloadInvoices();
  }

  private checkAdminStatus(): void {
    const user = this.authService.currentUserValue;
    if (user) {
      this.isAdmin = !!user.userRoles?.some(ur => {
        const name = ur.role?.name?.toLowerCase().trim() || '';
        return name === 'admin' || name === 'administrator' || name === 'system.admin';
      }) || !!user.userRoles?.some(ur =>
        ur.role?.rolePermissions?.some(rp => rp.permission?.name === 'Cashier.Invoice.ViewAll')
      );

      if (this.isAdmin) {
        this.loadSessions();
      }
    }
  }

  private loadSessions(): void {
    this.cashierService.getSessions(1, 100).subscribe({
      next: (res) => {
        const options = (res.items || []).map(s => ({
          label: `${s.sessionNumber} - ${s.cashierUserName || 'كاشير'}`,
          value: s.id
        }));
        this.sessionOptions = [
          { label: 'كل الورديات', value: 'all' },
          ...options
        ];
      }
    });
  }

  get hasShiftCounterPermission(): boolean {
    return true;
  }

  get currentShiftInvoicesCount(): number {
    const list = this.invoices();
    const shiftNos = list.map(i => i.shiftInvoiceNo).filter((n): n is number => typeof n === 'number' && n > 0);
    if (shiftNos.length > 0) {
      return Math.max(...shiftNos);
    }
    return list.length;
  }

  get filteredInvoices(): CashierInvoice[] {
    return this.invoices();
  }

  get templateOptions(): Array<{ label: string; value: CashierReceiptTemplateId }> {
    return this.receiptTemplateService.templates.map((template) => ({ label: template.label, value: template.id }));
  }

  get totalSalesAmount(): number {
    return Number(this.stats()?.netRevenue ?? this.stats()?.totalPaid ?? this.stats()?.totalAmount ?? 0);
  }

  get totalVoidedAmount(): number {
    return this.filteredInvoices
      .filter((invoice) => invoice.status === 'cancelled')
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  }

  get invoicesTodayCount(): number {
    return Number(this.stats()?.totalInvoices ?? this.filteredInvoices.length);
  }

  get totalItemsSold(): number {
    return this.filteredInvoices.reduce((sum, invoice) => sum + invoice.items.reduce((s, item) => s + item.qty, 0), 0);
  }

  get pendingManagerActions(): number {
    return this.filteredInvoices.filter((invoice) => this.canCancel(invoice) || this.canRefund(invoice)).length;
  }

  reloadInvoices(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const filters = this.buildFilters();

    forkJoin({
      list: this.invoiceControlService.getInvoices(filters),
      stats: this.invoiceControlService.getStats(filters).pipe(catchError(() => of(null)))
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ list, stats }) => {
          this.invoices.set((list.items || []).map((item) => this.mapInvoice(item)));
          this.stats.set(stats);
        },
        error: () => {
          this.invoices.set([]);
          this.stats.set(null);
          this.errorMessage.set('تعذر تحميل الفواتير من الخادم.');
          this.messageService.add({ severity: 'error', summary: 'خطأ', detail: this.errorMessage() });
        }
      });
  }

  resetFilters(table?: Table): void {
    this.searchTerm = '';
    this.tableSearchValue = '';
    this.selectedStatus = 'all';
    this.selectedPayment = 'all';
    this.selectedSessionId = 'all';
    this.fromDate = '';
    this.toDate = '';
    if (table) {
      table.clear();
    }
    this.reloadInvoices();
  }

  filterTable(table: Table, event: Event): void {
    const target = event.target as HTMLInputElement;
    table.filterGlobal(target.value.trim(), 'contains');
  }

  trimTableSearchValue(): void {
    this.tableSearchValue = this.tableSearchValue.trim();
  }

  openDetails(invoice: CashierInvoice): void {
    this.selectedInvoice.set(invoice);
    this.selectedInvoicePayment.set(null);
    this.showDetailsDialog = true;
    this.invoiceControlService.getInvoice(invoice.id).subscribe({
      next: (dto) => this.mergeSelectedInvoice(this.mapInvoice(dto)),
      error: () => this.messageService.add({ severity: 'warn', summary: 'تفاصيل الفاتورة', detail: 'تعذر تحميل التفاصيل الكاملة.' })
    });
    this.invoiceControlService.getPayment(invoice.id)
      .pipe(catchError(() => of(null)))
      .subscribe((payment) => this.selectedInvoicePayment.set(payment));
  }

  openReprintDialog(invoice: CashierInvoice): void {
    if (!invoice.canReprint) {
      this.messageService.add({ severity: 'warn', summary: 'غير متاح', detail: 'إعادة الطباعة غير متاحة لهذه الفاتورة.' });
      return;
    }
    this.selectedInvoice.set(invoice);
    this.selectedReprintPrintType = 'Thermal80mm';
    this.showReprintDialog = true;
  }

  confirmReprint(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;

    this.processing.set(true);
    this.invoiceControlService.reprintInvoice(invoice.id)
      .pipe(
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: () => {
          this.showReprintDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'إعادة طباعة',
            detail: `تم إرسال أمر إعادة طباعة الفاتورة ${invoice.invoiceNo}`
          });
          this.salesInvoiceService.printDocument(Number(invoice.id), this.selectedReprintPrintType);
        },
        error: () => {
          this.showReprintDialog = false;
          this.salesInvoiceService.printDocument(Number(invoice.id), this.selectedReprintPrintType);
        }
      });
  }

  printReceipt(invoice: CashierInvoice): void {
    const receipt = this.mapInvoiceToReceipt(invoice);
    const popup = window.open('', '_blank', 'width=420,height=800');
    if (!popup) {
      this.messageService.add({
        severity: 'warn',
        summary: 'حظر النوافذ المنبثقة',
        detail: 'يرجى السماح بالنوافذ المنبثقة لكي تتمكن من الطباعة.'
      });
      return;
    }

    const itemsHtml = receipt.items.map(item => `
      <tr>
        <td style="text-align: right; padding: 4px 0;">${item.name}</td>
        <td style="text-align: center; padding: 4px 0;">${item.qty}</td>
        <td style="text-align: left; padding: 4px 0;">${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>إعادة طباعة فاتورة ${receipt.invoiceNo}</title>
        <style>
          body { font-family: 'Inter', 'Outfit', sans-serif; font-size: 13px; margin: 10px; color: #333; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h2 { margin: 0 0 5px 0; font-size: 18px; }
          .info-table, .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .items-table th { border-bottom: 2px dashed #ccc; padding: 5px 0; text-align: right; font-weight: bold; }
          .items-table td { padding: 4px 0; }
          .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
          .totals-table { width: 100%; font-size: 13px; }
          .totals-table td { padding: 3px 0; }
          .totals-table .grand-total { font-weight: bold; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${receipt.customerTaxNumber ? 'إعادة طباعة فاتورة ضريبية' : 'إعادة طباعة فاتورة ضريبية مبسطة'}</h2>
          <div>رقم الفاتورة: ${receipt.invoiceNo}</div>
          <div>التاريخ: ${formatDateToString(receipt.invoiceDate)}</div>
          <div>العميل: ${receipt.customerName}</div>
          ${receipt.customerTaxNumber ? `<div>الرقم الضريبي للعميل: ${receipt.customerTaxNumber}</div>` : ''}
          <div>الكاشير: ${receipt.cashierName}</div>
        </div>
        <div class="divider"></div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: right;">الصنف</th>
              <th style="text-align: center; width: 4rem;">الكمية</th>
              <th style="text-align: left; width: 5rem;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <table class="totals-table">
          <tr>
            <td>المجموع الفرعي:</td>
            <td style="text-align: left;">${receipt.subtotal.toFixed(2)} SAR</td>
          </tr>
          <tr>
            <td>الخصم:</td>
            <td style="text-align: left;">-${receipt.discount.toFixed(2)} SAR</td>
          </tr>
          <tr>
            <td>الضريبة (15%):</td>
            <td style="text-align: left;">${receipt.tax.toFixed(2)} SAR</td>
          </tr>
          <tr class="grand-total">
            <td>الإجمالي النهائي:</td>
            <td style="text-align: left;">${receipt.total.toFixed(2)} SAR</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div style="text-align: center; font-size: 11px; color: #666; margin-top: 15px;">
          شكراً لزيارتكم
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    popup.document.write(html);
    popup.document.close();
  }

  openTemplateManager(): void {
    this.adminTemplateSelection = this.receiptTemplateService.currentTemplateId;
    this.showTemplateManagerDialog = true;
  }

  applyTemplateManagerSelection(): void {
    this.receiptTemplateService.setTemplate(this.adminTemplateSelection);
    this.reprintTemplate = this.adminTemplateSelection;
    this.showTemplateManagerDialog = false;
  }

  get activeTemplateLabel(): string {
    return this.receiptTemplateService.getTemplateLabel();
  }

  get templatePreviewData(): CashierReceiptData | null {
    const selected = this.selectedInvoice();
    const invoice = selected || this.filteredInvoices[0];
    return invoice ? this.mapInvoiceToReceipt(invoice) : null;
  }

  // Void dialog and confirmation methods have been removed.



  readonly DEFAULT_REFUND_REASONS: Array<{ label: string; value: string }> = [
    { label: 'طلب العميل / إرجاع', value: 'CUSTOMER_REQUEST' },
    { label: 'صنف معيب / تالف', value: 'DEFECTIVE' },
    { label: 'طلب خاطئ / صنف غير مطابق', value: 'WRONG_ITEM' },
    { label: 'خطأ في السعر أو الحساب', value: 'PRICE_ISSUE' },
    { label: 'أسباب أخرى', value: 'OTHER' }
  ];

  refundReasonOptions: Array<{ label: string; value: string }> = [
    { label: 'طلب العميل / إرجاع', value: 'CUSTOMER_REQUEST' },
    { label: 'صنف معيب / تالف', value: 'DEFECTIVE' },
    { label: 'طلب خاطئ / صنف غير مطابق', value: 'WRONG_ITEM' },
    { label: 'خطأ في السعر أو الحساب', value: 'PRICE_ISSUE' },
    { label: 'أسباب أخرى', value: 'OTHER' }
  ];

  openRefundDialog(invoice: CashierInvoice): void {
    if (!this.canRefund(invoice)) {
      this.messageService.add({ severity: 'warn', summary: 'غير متاح', detail: 'الاسترجاع غير متاح لهذه الفاتورة.' });
      return;
    }
    this.loading.set(true);
    this.invoiceControlService.getInvoice(invoice.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (dto) => {
          const detailedInvoice = this.mapInvoice(dto);
          if (!detailedInvoice.items || detailedInvoice.items.length === 0) {
            detailedInvoice.items = (invoice.items && invoice.items.length > 0) ? invoice.items : [];
          }
          detailedInvoice.items.forEach(item => {
            const remaining = item.maxReturnQty > 0 ? item.maxReturnQty : Math.max(0, item.qty - (item.returnedQty || 0));
            item.maxReturnQty = remaining;
            item.returnQty = remaining;
            item.selected = remaining > 0;
          });
          this.mergeSelectedInvoice(detailedInvoice);
          this.selectedInvoice.set(detailedInvoice);
          this.refundReason = this.refundReasonOptions[0]?.value || 'CUSTOMER_REQUEST';
          this.refundNotes = '';
          this.showRefundDialog = true;
        },
        error: () => {
          if (invoice.items) {
            invoice.items.forEach(item => {
              const remaining = item.maxReturnQty > 0 ? item.maxReturnQty : Math.max(0, item.qty - (item.returnedQty || 0));
              item.maxReturnQty = remaining;
              item.returnQty = remaining;
              item.selected = remaining > 0;
            });
          }
          this.selectedInvoice.set(invoice);
          this.refundReason = this.refundReasonOptions[0]?.value || 'CUSTOMER_REQUEST';
          this.refundNotes = '';
          this.showRefundDialog = true;
        }
      });
  }

  get calculatedRefundTotal(): number {
    const invoice = this.selectedInvoice();
    if (!invoice?.items) return 0;
    return invoice.items
      .filter((item) => item.selected && item.returnQty && item.returnQty > 0)
      .reduce((sum, item) => {
        const qty = item.qty > 0 ? item.qty : 1;
        const returnQty = item.returnQty || 0;
        const perUnitDiscount = (item.discount || 0) / qty;
        const lineSubtotal = (item.unitPrice - perUnitDiscount) * returnQty;
        const lineTax = (lineSubtotal * (item.taxPercentage || 0)) / 100;
        return sum + lineSubtotal + lineTax;
      }, 0);
  }

  get isAllRefundItemsSelected(): boolean {
    const invoice = this.selectedInvoice();
    if (!invoice?.items) return false;
    const available = invoice.items.filter(i => (i.maxReturnQty || 0) > 0);
    return available.length > 0 && available.every(i => i.selected);
  }

  toggleSelectAllRefund(event: any): void {
    const invoice = this.selectedInvoice();
    if (!invoice?.items) return;
    const checked = event?.target ? event.target.checked : !!event;
    invoice.items.forEach(item => {
      if ((item.maxReturnQty || 0) > 0) {
        item.selected = checked;
        if (checked && (!item.returnQty || item.returnQty <= 0)) {
          item.returnQty = item.maxReturnQty;
        }
      }
    });
  }

  calculateItemRefundTotal(item: CashierInvoiceLine): number {
    if (!item.selected || !item.returnQty || item.returnQty <= 0) return 0;
    const qty = item.qty > 0 ? item.qty : 1;
    const returnQty = item.returnQty || 0;
    const perUnitDiscount = (item.discount || 0) / qty;
    const lineSubtotal = (item.unitPrice - perUnitDiscount) * returnQty;
    const lineTax = (lineSubtotal * (item.taxPercentage || 0)) / 100;
    return Number((lineSubtotal + lineTax).toFixed(2));
  }

  incrementItemReturn(item: CashierInvoiceLine): void {
    if (!item.selected) item.selected = true;
    const current = Number(item.returnQty || 0);
    const max = Number(item.maxReturnQty || 0);
    if (current < max) {
      item.returnQty = Math.min(max, Number((current + 1).toFixed(2)));
    }
  }

  decrementItemReturn(item: CashierInvoiceLine): void {
    const current = Number(item.returnQty || 0);
    if (current > 1) {
      item.returnQty = Math.max(1, Number((current - 1).toFixed(2)));
    }
  }

  validateItemReturn(item: CashierInvoiceLine): void {
    const max = Number(item.maxReturnQty || 0);
    let val = Number(item.returnQty);
    if (isNaN(val) || val <= 0) {
      item.returnQty = Math.min(1, max);
    } else if (val > max) {
      item.returnQty = max;
    }
  }

  confirmRefund(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;

    const selectedItems = invoice.items.filter((item) => item.selected && item.returnQty && item.returnQty > 0);
    if (selectedItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى اختيار صنف واحد على الأقل وتحديد كمية مرتجع أكبر من الصفر.'
      });
      return;
    }

    const reasonLabel = this.refundReasonOptions.find((item) => item.value === this.refundReason)?.label || this.refundReason;
    this.processing.set(true);
    this.invoiceControlService.refundInvoice(invoice.id, {
      customerName: invoice.customerName,
      reason: this.refundReason || 'OTHER',
      reasonText: reasonLabel,
      refundMethod: 'original_method',
      notes: this.refundNotes,
      items: selectedItems.map((item) => {
        const qty = item.qty;
        const returnQty = item.returnQty || 0;
        const perUnitDiscount = qty > 0 ? (item.discount || 0) / qty : 0;
        const lineSubtotal = (item.unitPrice - perUnitDiscount) * returnQty;
        const lineTax = (lineSubtotal * (item.taxPercentage || 0)) / 100;
        const refundAmount = lineSubtotal + lineTax;

        return {
          saleItemId: item.saleItemId,
          itemCode: item.itemCode,
          itemName: item.name,
          quantity: returnQty,
          unitPrice: item.unitPrice,
          refundAmount: Number(refundAmount.toFixed(2))
        };
      })
    })
      .pipe(finalize(() => this.processing.set(false)))
      .subscribe({
        next: () => {
          this.showRefundDialog = false;
          this.showDetailsDialog = false;
          this.reloadInvoices();
          this.cashierService.loadCurrentSession();
          this.messageService.add({ severity: 'success', summary: 'استرجاع', detail: `تم إرسال استرجاع الفاتورة ${invoice.invoiceNo}` });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل تنفيذ الاسترجاع.' })
      });
  }

  canVoid(invoice: CashierInvoice): boolean {
    return false;
  }

  canCancel(invoice: CashierInvoice): boolean {
    return false;
  }

  canRefund(invoice: CashierInvoice): boolean {
    if (invoice.canRefund !== undefined && invoice.canRefund !== null) {
      return invoice.canRefund;
    }
    return invoice.status === 'paid' || invoice.status === 'partial_refund';
  }

  getStatusLabel(status: InvoiceStatus): string {
    const labels: Record<string, string> = {
      paid: 'مدفوعة',
      completed: 'مدفوعة',
      pending: 'معلقة',
      voided: 'Void',
      cancelled: 'ملغاة',
      refunded: 'مرتجعة',
      partial_refund: 'مرتجع جزئي'
    };
    return labels[status] || status;
  }

  get detailsRemainingSubtotal(): number {
    const inv = this.selectedInvoice();
    if (!inv) return 0;
    return inv.items.reduce((sum, item) => {
      const remainingQty = item.qty - (item.returnedQty || 0);
      return sum + (remainingQty * item.unitPrice);
    }, 0);
  }

  get detailsRemainingDiscount(): number {
    const inv = this.selectedInvoice();
    if (!inv) return 0;
    return inv.items.reduce((sum, item) => {
      const remainingQty = item.qty - (item.returnedQty || 0);
      const perUnitDiscount = item.qty > 0 ? (item.discount || 0) / item.qty : 0;
      return sum + (remainingQty * perUnitDiscount);
    }, 0);
  }

  get detailsRemainingTax(): number {
    const inv = this.selectedInvoice();
    if (!inv) return 0;
    return inv.items.reduce((sum, item) => {
      const remainingQty = item.qty - (item.returnedQty || 0);
      const perUnitTax = item.qty > 0 ? (item.tax || 0) / item.qty : 0;
      return sum + (remainingQty * perUnitTax);
    }, 0);
  }

  get detailsRemainingTotal(): number {
    return this.detailsRemainingSubtotal - this.detailsRemainingDiscount + this.detailsRemainingTax;
  }

  getStatusSeverity(status: InvoiceStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      paid: 'success',
      completed: 'success',
      pending: 'warning',
      voided: 'danger',
      cancelled: 'warning',
      refunded: 'info',
      partial_refund: 'info'
    };
    return severities[status] || 'secondary';
  }

  getPaymentLabel(type: InvoicePaymentType): string {
    const labels: Record<string, string> = {
      cash: 'نقدي',
      card: 'بطاقة',
      mixed: 'مختلط',
      credit: 'آجل'
    };
    return labels[`${type ?? ''}`.toLowerCase()] || `${type ?? ''}`;
  }

  getPaymentReference(payment: CashierInvoicePaymentDto | null): string {
    return `${payment?.providerReference ?? payment?.transactionId ?? payment?.paymentNo ?? payment?.id ?? '-'}`;
  }

  getPaymentAmount(payment: CashierInvoicePaymentDto | null, invoice: CashierInvoice): number {
    return Number(payment?.paidAmount ?? payment?.amount ?? payment?.cashAmount ?? payment?.cardAmount ?? payment?.creditAmount ?? invoice.paidAmount ?? 0);
  }

  getPaymentStatusText(payment: CashierInvoicePaymentDto | null): string {
    return `${payment?.status ?? '-'}`;
  }

  getPaymentProviderText(payment: CashierInvoicePaymentDto | null): string {
    return `${payment?.provider ?? payment?.paymentMethod ?? payment?.paymentType ?? '-'}`;
  }

  private loadActionReasons(): void {
    this.invoiceControlService.getActionReasons('cancel')
      .pipe(catchError(() => of([])))
      .subscribe({ next: (rows) => this.cancelReasonOptions = this.mapReasons(rows) });
    this.invoiceControlService.getActionReasons('refund')
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (rows) => {
          const mapped = this.mapReasons(rows);
          this.refundReasonOptions = (mapped && mapped.length > 0) ? mapped : [...this.DEFAULT_REFUND_REASONS];
        }
      });
  }

  private buildFilters(): CashierInvoiceListFilters {
    const session = this.cashierService.getCurrentSessionSnapshot();
    const sessionIdFilter = this.isAdmin 
      ? (this.selectedSessionId === 'all' ? undefined : this.selectedSessionId)
      : (session?.id || undefined);

    return {
      page: 1,
      pageSize: 100,
      keyword: this.searchTerm.trim() || undefined,
      status: this.selectedStatus === 'all' ? undefined : this.selectedStatus,
      paymentMethod: this.selectedPayment === 'all' ? undefined : this.selectedPayment,
      from: this.fromDate ? `${this.fromDate}T00:00:00` : undefined,
      to: this.toDate ? `${this.toDate}T23:59:59` : undefined,
      storeDetailsId: this.isAdmin ? undefined : (session?.storeDetailsId || undefined),
      sessionId: sessionIdFilter
    };
  }

  private mapInvoice(dto: CashierInvoiceDto): CashierInvoice {
    const status = this.normalizeStatus(dto.invoiceStatus ?? dto.status);
    const paymentType = `${dto.paymentType ?? dto.paymentMethod ?? 'cash'}`.toLowerCase();
    const items = (dto.items || []).map((item: any) => {
      const qty = Number(item.quantity ?? item.qty ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      const discount = Number(item.discount ?? item.discountAmount ?? 0);
      const tax = Number(item.tax ?? item.taxAmount ?? 0);
      const returnedQty = Number(item.returnedQty ?? 0);
      const maxReturnQty = item.maxReturnQty !== undefined ? Number(item.maxReturnQty) : Math.max(0, qty - returnedQty);

      const subtotal = qty * unitPrice - discount;
      const taxPercentage = subtotal > 0 ? (tax / subtotal) * 100 : 0;

      return {
        saleItemId: item.saleItemId ?? item.id,
        itemCode: item.itemCode ?? undefined,
        name: item.itemName ?? item.name ?? item.itemCode ?? 'Item',
        qty,
        unitPrice,
        totalAmount: Number(item.totalAmount ?? qty * unitPrice),
        returnedQty,
        maxReturnQty,
        returnQty: maxReturnQty,
        selected: maxReturnQty > 0,
        discount,
        tax,
        taxPercentage
      };
    });
    return {
      id: dto.id,
      invoiceNo: dto.invoiceNo,
      shiftInvoiceNo: dto.shiftInvoiceNo ?? (dto as any).shiftInvoiceNumber ?? null,
      invoiceDate: new Date(dto.invoiceDate ?? Date.now()),
      customerName: dto.customerName ?? '',
      customerTaxNumber: (dto as any).customerTaxNumber || (dto as any).customerProfile?.taxNumber || (dto as any).taxNumber || undefined,
      cashierName: dto.cashierName ?? '',
      stationName: dto.sessionNo ?? dto.stationName ?? '',
      paymentType,
      status,
      items,
      subtotal: Number(dto.subtotal ?? 0),
      discount: Number(dto.discount ?? dto.discountAmount ?? 0),
      tax: Number(dto.tax ?? dto.taxAmount ?? 0),
      totalAmount: Number(dto.totalAmount ?? 0),
      paidAmount: Number(dto.paidAmount ?? dto.totalAmount ?? 0),
      refundedAmount: Number(dto.refundedAmount ?? 0),
      canCancel: dto.canCancel === true,
      canVoid: dto.canVoid === true,
      canRefund: dto.canRefund === true,
      canReprint: dto.canReprint !== false
    };
  }

  private normalizeStatus(value: unknown): InvoiceStatus {
    const status = `${value ?? 'paid'}`.trim().toLowerCase().replace('-', '_');
    if (status === 'completed') return 'paid';
    if (['paid', 'pending', 'voided', 'cancelled', 'refunded', 'partial_refund'].includes(status)) {
      return status as InvoiceStatus;
    }
    return 'paid';
  }

  private mapReasons(rows: InvoiceActionReasonDto[]): Array<{ label: string; value: string }> {
    return (rows || [])
      .map((row) => ({ label: row.label || row.labelEn || row.code, value: row.code }))
      .filter((row) => !!row.value);
  }

  private reasonPayload(options: Array<{ label: string; value: string }>, code: string, notes: string) {
    const label = options.find((item) => item.value === code)?.label || code || notes || 'OTHER';
    return { reason: label, reasonCode: code || 'OTHER', notes: notes || '' };
  }

  private mergeSelectedInvoice(invoice: CashierInvoice): void {
    this.selectedInvoice.set(invoice);
    this.invoices.update((items) => items.map((item) => item.id === invoice.id ? invoice : item));
  }

  private mapInvoiceToReceipt(invoice: CashierInvoice): CashierReceiptData {
    const receipt: CashierReceiptData = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      cashierName: invoice.cashierName,
      stationName: invoice.stationName,
      customerName: invoice.customerName || 'عميل نقدي',
      customerTaxNumber: invoice.customerTaxNumber,
      paymentLabel: this.getPaymentLabel(invoice.paymentType),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      total: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      changeAmount: Math.max(0, invoice.paidAmount - invoice.totalAmount),
      footerNote: '',
      items: invoice.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.totalAmount || item.qty * item.unitPrice
      }))
    };
    receipt.qrPayload = this.buildReceiptQrPayload(receipt);
    return receipt;
  }

  private buildReceiptQrPayload(receipt: CashierReceiptData): string {
    return [
      `Invoice: ${receipt.invoiceNo}`,
      `Date: ${receipt.invoiceDate.toISOString()}`,
      `Total: ${receipt.total.toFixed(2)}`,
      `Paid: ${receipt.paidAmount.toFixed(2)}`
    ].join('\n');
  }
}
