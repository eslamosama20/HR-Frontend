import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { CashierService } from 'src/app/services/cashier/cashier.service';
import { CashierReturnsService } from 'src/app/services/cashier/cashier-returns.service';
import { CashierSession } from 'src/app/models/cashier/cashier-session.model';
import { PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import {
    CashierRefundReason,
    CashierRefundStatus,
    CashierRefundMethod,
    CashierReturnInvoiceDetail,
    CashierReturnInvoiceLine,
    CashierReturnHistoryRecord
} from 'src/app/models/cashier/cashier-returns.model';
import { ReturnRequestDto } from 'src/app/models/cashier/pharmacy-prescription-pos.model';
import { PharmacySimulationService } from 'src/app/services/cashier/pharmacy-simulation.service';
import { mapApiToReturnViewModel } from 'src/app/adapters/cashier/returns.adapter';
import { environment } from 'src/environments/environment';

export type RefundReason = CashierRefundReason;
export type RefundStatus = CashierRefundStatus;
export type RefundMethod = CashierRefundMethod;
export type OriginalInvoice = CashierReturnInvoiceDetail;
export type OriginalInvoiceItem = CashierReturnInvoiceLine;
export type RefundRecord = CashierReturnHistoryRecord;

// ─── Component ───────────────────────────────────────────────────
@Component({
    selector: 'app-returns',
    standalone: true,
    imports: [CustomDatePipe, 
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        DialogModule,
        ToastModule,
        TagModule,
        TableModule,
        DropdownModule,
        InputTextareaModule,
        CheckboxModule,
        TooltipModule
    ],
    providers: [MessageService],
    templateUrl: './returns.component.html',
    styleUrls: ['./returns.component.scss']
})
export class ReturnsComponent implements OnInit {
    loading = signal<boolean>(false);
    currentSession = signal<CashierSession | null>(null);

    // Search
    invoiceSearchTerm = '';
    foundInvoice = signal<OriginalInvoice | null>(null);
    searchPerformed = signal<boolean>(false);

    // Return Flow
    returnReason: RefundReason = 'defective';
    returnNotes = '';
    refundMethod: RefundMethod = 'original_method';
    showConfirmDialog = false;
    processing = false;

    // History
    refundHistory = signal<RefundRecord[]>([]);
    historyFilterStatus: RefundStatus | 'all' = 'all';
    historySearchTerm = '';

    // Refund Detail Dialog
    showRefundDetailDialog = false;
    selectedRefund: RefundRecord | null = null;

    get reasonOptions(): Array<{ label: string; value: RefundReason }> {
        return [
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_DEFECTIVE'), value: 'defective' },
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_WRONG_ITEM'), value: 'wrong_item' },
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_CUSTOMER_CHANGE'), value: 'customer_changed_mind' },
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_EXPIRED'), value: 'expired' },
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_DAMAGED'), value: 'damaged' },
            { label: this.translateService.instant('CASHIER_RETURNS.REASON_OTHER'), value: 'other' }
        ];
    }

    get refundMethodOptions(): Array<{ label: string; value: RefundMethod }> {
        return [
            { label: this.translateService.instant('CASHIER_RETURNS.METHOD_ORIGINAL'), value: 'original_method' },
            { label: this.translateService.instant('CASHIER_RETURNS.METHOD_CASH'), value: 'cash' },
            { label: this.translateService.instant('CASHIER_RETURNS.METHOD_CARD'), value: 'card' },
            { label: this.translateService.instant('CASHIER_RETURNS.METHOD_CREDIT_NOTE'), value: 'credit_note' }
        ];
    }

    get statusFilterOptions(): Array<{ label: string; value: RefundStatus | 'all' }> {
        return [
            { label: this.translateService.instant('CASHIER_RETURNS.ALL_STATUS'), value: 'all' },
            { label: this.translateService.instant('CASHIER_RETURNS.PENDING'), value: 'pending' },
            { label: this.translateService.instant('CASHIER_RETURNS.APPROVED'), value: 'approved' },
            { label: this.translateService.instant('CASHIER_RETURNS.COMPLETED'), value: 'completed' },
            { label: this.translateService.instant('CASHIER_RETURNS.REJECTED'), value: 'rejected' }
        ];
    }

    constructor(
        private cashierService: CashierService,
        private cashierReturnsService: CashierReturnsService,
        private messageService: MessageService,
        private destroyRef: DestroyRef,
        private translateService: TranslateService,
        private simulationService: PharmacySimulationService
    ) { }

    ngOnInit(): void {
        this.loadCurrentSession();
        this.loadRefundHistory();
    }

    // ─── Session ─────────────────────────────────────────────────
    loadCurrentSession(): void {
        this.cashierService.currentSession$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
            next: (session) => this.currentSession.set(session),
            error: () => {
                this.currentSession.set(null);
            }
        });
    }

    // ─── Invoice Search ──────────────────────────────────────────
    searchInvoice(): void {
        const term = (this.invoiceSearchTerm || '').trim();
        if (!term) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translateService.instant('CASHIER_POS.WARNING'),
                detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_ENTER_TERM')
            });
            return;
        }

        this.loading.set(true);
        this.searchPerformed.set(true);

        this.cashierReturnsService.getInvoiceDetails(term).subscribe({
            next: (invoice) => {
                this.foundInvoice.set(invoice);
                this.loading.set(false);

                if (!invoice) {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translateService.instant('CASHIER_RETURNS.INVOICE_NOT_FOUND'),
                        detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_NOT_FOUND_ERR', { term })
                    });
                } else {
                    this.messageService.add({
                        severity: 'success',
                        summary: this.translateService.instant('CASHIER_QUICK_SALE.COMPLETED'),
                        detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_FOUND_SUCCESS', { no: invoice.invoiceNo })
                    });
                }
            },
            error: () => {
                this.foundInvoice.set(null);
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: this.translateService.instant('CASHIER_RETURNS.INVOICE_NOT_FOUND'),
                    detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_NOT_FOUND_ERR', { term })
                });
            }
        });
    }

    // ─── Item Selection ──────────────────────────────────────────
    toggleItemSelection(item: OriginalInvoiceItem): void {
        item.selected = !item.selected;
        if (item.selected && item.returnQty === 0) {
            item.returnQty = item.maxReturnQty;
        }
        if (!item.selected) {
            item.returnQty = 0;
        }
    }

    onItemSelectionChange(item: OriginalInvoiceItem): void {
        if (item.selected && item.returnQty <= 0) {
            item.returnQty = item.maxReturnQty > 0 ? 1 : 0;
        }

        if (!item.selected) {
            item.returnQty = 0;
        }

        if (item.returnQty > item.maxReturnQty) {
            item.returnQty = item.maxReturnQty;
        }
    }

    onReturnQtyChange(item: OriginalInvoiceItem, value: number | null | undefined): void {
        const parsedValue = Number(value ?? 0);
        const safeValue = Number.isFinite(parsedValue) ? Math.floor(parsedValue) : 0;
        const normalizedQty = Math.max(0, Math.min(item.maxReturnQty, safeValue));

        item.returnQty = normalizedQty;
        item.selected = normalizedQty > 0;
    }

    selectAllItems(): void {
        const invoice = this.foundInvoice();
        if (!invoice) return;

        const allSelected = invoice.items.every(i => i.selected);
        invoice.items.forEach(item => {
            item.selected = !allSelected;
            item.returnQty = !allSelected ? item.maxReturnQty : 0;
        });
    }

    get allItemsSelected(): boolean {
        const invoice = this.foundInvoice();
        return !!invoice && invoice.items.length > 0 && invoice.items.every(i => i.selected);
    }

    get selectedItems(): OriginalInvoiceItem[] {
        return this.foundInvoice()?.items.filter(i => i.selected && i.returnQty > 0) || [];
    }

    get selectedItemsCount(): number {
        return this.selectedItems.length;
    }

    // ─── Return Calculations ─────────────────────────────────────
    getItemRefundAmount(item: OriginalInvoiceItem): number {
        const unitTotal = item.unitPrice;
        const perUnitDiscount = item.quantity > 0 ? item.discountAmount / item.quantity : 0;
        const subtotal = (unitTotal - perUnitDiscount) * item.returnQty;
        const tax = (subtotal * item.taxPercentage) / 100;
        return subtotal + tax;
    }

    get refundSubtotal(): number {
        return this.selectedItems.reduce((sum, item) => {
            const perUnitDiscount = item.quantity > 0 ? item.discountAmount / item.quantity : 0;
            return sum + ((item.unitPrice - perUnitDiscount) * item.returnQty);
        }, 0);
    }

    get refundTaxAmount(): number {
        return this.selectedItems.reduce((sum, item) => {
            const perUnitDiscount = item.quantity > 0 ? item.discountAmount / item.quantity : 0;
            const subtotal = (item.unitPrice - perUnitDiscount) * item.returnQty;
            return sum + (subtotal * item.taxPercentage) / 100;
        }, 0);
    }

    get refundTotalAmount(): number {
        return this.refundSubtotal + this.refundTaxAmount;
    }

    get refundTotalItems(): number {
        return this.selectedItems.reduce((sum, item) => sum + item.returnQty, 0);
    }

    get isFullRefund(): boolean {
        const invoice = this.foundInvoice();
        if (!invoice) return false;
        return invoice.items.every(item => item.selected && item.returnQty === item.maxReturnQty);
    }

    // ─── Process Refund ──────────────────────────────────────────
    openConfirmDialog(): void {
        if (this.selectedItemsCount === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translateService.instant('CASHIER_POS.WARNING'),
                detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_SELECT_ITEM')
            });
            return;
        }

        if (!this.currentSession()) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translateService.instant('CASHIER_POS.WARNING'),
                detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_SESSION_REQ')
            });
            return;
        }

        this.showConfirmDialog = true;
    }

    confirmRefund(): void {
        const invoice = this.foundInvoice();
        if (!invoice) {
            this.processing = false;
            return;
        }

        this.processing = true;

        const payload: ReturnRequestDto = {
            originalInvoiceId: String(invoice.id),
            originalInvoiceNo: invoice.invoiceNo,
            cashierSessionId: this.currentSession()?.id ? String(this.currentSession()!.id) : undefined,
            reasonCode: this.returnReason,
            notes: this.returnNotes,
            refundMethod: this.refundMethod,
            lines: this.selectedItems.map((item) => ({
                invoiceLineId: String(item.id),
                returnQty: item.returnQty,
                itemCode: item.itemCode,
                itemName: item.itemName,
                unitPrice: item.unitPrice,
                refundAmount: this.getItemRefundAmount(item)
            }))
        };

        this.cashierReturnsService
            .createReturnRequest(payload, {
                reason: this.returnReason,
                reasonText: this.getReasonLabel(this.returnReason),
                cashierName: this.currentSession()?.cashierUserName || this.translateService.instant('CASHIER_RETURNS.STATUS_UNKNOWN'),
                customerName: invoice.customerName,
                refundSubtotal: this.refundSubtotal,
                refundTaxAmount: this.refundTaxAmount,
                refundTotalAmount: this.refundTotalAmount
            })
            .subscribe({
                next: (res) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: this.translateService.instant('CASHIER_RETURNS.NOTIFY_SUCCESS'),
                        detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_SUCCESS_DETAIL', {
                            no: res.returnRequestId,
                            amount: this.refundTotalAmount.toFixed(2),
                            currency: this.translateService.instant('CASHIER_QUICK_SALE.CURRENCY')
                        })
                    });
                    this.showConfirmDialog = false;
                    this.processing = false;
                    this.resetReturnForm();
                    this.loadRefundHistory();
                },
                error: () => {
                    this.processing = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translateService.instant('CASHIER_POS.WARNING'),
                        detail: this.translateService.instant('CASHIER_RETURNS.RETURN_SUBMIT_FAILED')
                    });
                }
            });
    }

    cancelReturn(): void {
        this.resetReturnForm();
        this.messageService.add({
            severity: 'info',
            summary: this.translateService.instant('CASHIER_LIVE_ORDERS.CANCELLED'),
            detail: this.translateService.instant('CASHIER_RETURNS.NOTIFY_CANCELLED')
        });
    }

    resetReturnForm(): void {
        this.foundInvoice.set(null);
        this.searchPerformed.set(false);
        this.invoiceSearchTerm = '';
        this.returnReason = 'defective';
        this.returnNotes = '';
        this.refundMethod = 'original_method';
    }

    // ─── Refund History ──────────────────────────────────────────
    loadRefundHistory(): void {
        this.loading.set(true);
        if ((environment as any).simulateBackend) {
             this.simulationService.getReturns({ simulateError: false }).subscribe({
                 next: (rows) => {
                     const mapped = rows.map(r => mapApiToReturnViewModel(r));
                     // map back to internal component state for now to avoid massive refactor
                     const normalized: CashierReturnHistoryRecord[] = mapped.map(r => ({
                        id: Number(r.id) || 0,
                        refundNo: r.returnNo,
                        originalInvoiceNo: r.returnNo,
                        customerName: r.requestorName,
                        refundTotalAmount: 0,
                        refundSubtotal: 0,
                        refundTaxAmount: 0,
                        refundMethod: 'cash' as any,
                        status: r.status as any,
                        cashierName: 'System',
                        reason: 'other' as any,
                        reasonText: 'Simulated Return',
                        refundDate: r.returnDate,
                        itemsCount: 0,
                        notes: ''
                     }));
                     this.refundHistory.set(normalized);
                     this.loading.set(false);
                 },
                 error: () => {
                     this.refundHistory.set([]);
                     this.loading.set(false);
                 }
             });
             return;
        }

        this.cashierReturnsService.getReturnHistory().subscribe({
            next: (rows) => {
                const normalized = rows.map((r) => ({
                    ...r,
                    reasonText: r.reasonText || this.getReasonLabel(r.reason)
                }));
                this.refundHistory.set(normalized);
                this.loading.set(false);
            },
            error: () => {
                this.refundHistory.set([]);
                this.loading.set(false);
            }
        });
    }

    get filteredHistory(): RefundRecord[] {
        return this.refundHistory().filter(record => {
            const statusMatch = this.historyFilterStatus === 'all' || record.status === this.historyFilterStatus;
            const keyword = this.historySearchTerm.trim().toLowerCase();
            const textMatch = !keyword ||
                record.refundNo.toLowerCase().includes(keyword) ||
                record.originalInvoiceNo.toLowerCase().includes(keyword) ||
                record.customerName.toLowerCase().includes(keyword);
            return statusMatch && textMatch;
        });
    }

    get totalRefundsAmount(): number {
        return this.refundHistory()
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + r.refundTotalAmount, 0);
    }

    get completedRefundsCount(): number {
        return this.refundHistory().filter(r => r.status === 'completed').length;
    }

    get pendingRefundsCount(): number {
        return this.refundHistory().filter(r => r.status === 'pending').length;
    }

    get rejectedRefundsCount(): number {
        return this.refundHistory().filter(r => r.status === 'rejected').length;
    }

    viewRefundDetails(record: RefundRecord): void {
        this.selectedRefund = record;
        this.showRefundDetailDialog = true;
    }

    // ─── Helpers ─────────────────────────────────────────────────
    getReasonLabel(reason: RefundReason): string {
        return this.reasonOptions.find(o => o.value === reason)?.label || this.translateService.instant('CASHIER_RETURNS.STATUS_UNKNOWN');
    }

    getRefundMethodLabel(method: RefundMethod): string {
        return this.refundMethodOptions.find(o => o.value === method)?.label || this.translateService.instant('CASHIER_RETURNS.STATUS_UNKNOWN');
    }

    getStatusLabel(status: RefundStatus): string {
        const labels: Record<RefundStatus, string> = {
            pending: this.translateService.instant('CASHIER_RETURNS.PENDING'),
            approved: this.translateService.instant('CASHIER_RETURNS.APPROVED'),
            completed: this.translateService.instant('CASHIER_RETURNS.COMPLETED'),
            rejected: this.translateService.instant('CASHIER_RETURNS.REJECTED')
        };
        return labels[status];
    }

    getStatusSeverity(status: RefundStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
        const severities: Record<RefundStatus, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
            completed: 'success',
            approved: 'info',
            pending: 'warning',
            rejected: 'danger'
        };
        return severities[status];
    }

    getPaymentMethodLabel(method: PaymentMethod): string {
        const labels: Record<PaymentMethod, string> = {
            [PaymentMethod.Cash]: this.translateService.instant('CASHIER_RETURNS.PAYMENT_CASH'),
            [PaymentMethod.Card]: this.translateService.instant('CASHIER_RETURNS.PAYMENT_CARD'),
            [PaymentMethod.Credit]: this.translateService.instant('CASHIER_RETURNS.PAYMENT_CREDIT'),
            [PaymentMethod.Mixed]: this.translateService.instant('CASHIER_RETURNS.PAYMENT_MIXED'),
            [PaymentMethod.BankTransfer]: this.translateService.instant('CASHIER_RETURNS.PAYMENT_BANK')
        };
        return labels[method] || this.translateService.instant('CASHIER_RETURNS.STATUS_UNKNOWN');
    }

}
