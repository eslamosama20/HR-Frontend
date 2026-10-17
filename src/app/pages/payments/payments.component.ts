import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Modules
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

// App imports
import { PaymentService } from 'src/app/services/payment/payment.service';
import { PaymentModel, PaymentMethodType, PAYMENT_METHOD_OPTIONS, PaymentInvoiceType } from 'src/app/models/payment/payment.model';
import { TranslationService } from 'src/app/modules/i18n';
import { BackButtonComponent } from 'src/app/shared-components/back-button/back-button.component';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { InvoicePaymentStatus } from 'src/app/models/invoicePaymentStatus';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { Treasury } from 'src/app/models/treasury/treasury';
import { PageInfoService } from 'src/app/_metronic/layout';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    PanelModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    InputTextareaModule,
    ToastModule,
    ProgressSpinnerModule,
    DropdownModule,
    ConfirmDialogModule,
    BackButtonComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Query params
  invoiceId: string = '';
  invoiceType: number = PaymentInvoiceType.SalesInvoice;

  // State
  payments: PaymentModel[] = [];
  receipts: any[] = [];
  receiptsTotal: number = 0;
  loading: boolean = false;
  saving: boolean = false;
  loadingInvoice: boolean = false;
  loadingTreasuries: boolean = false;

  // Invoice data
  invoice: SalesInvoice | null = null;
  invoiceTotal: number = 0;
  totalPaid: number = 0;
  remainingAmount: number = 0;

  // Treasuries
  treasuries: Treasury[] = [];
  treasuryOptions: { label: string; value: string }[] = [];

  // Form
  paymentForm!: FormGroup;

  // Payment method options
  paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  // Invoice type enum for template
  PaymentInvoiceType = PaymentInvoiceType;
  InvoicePaymentStatus = InvoicePaymentStatus;
  paymentMethodTypeEnum = PaymentMethodType;

  // Language
  isRtl: boolean = false;
  currentLang: string = 'ar';

  // Form Visibility UI State
  isPaymentFormVisible: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private salesInvoiceService: SalesInvoiceService,
    private treasuryService: TreasuryService,
    private messageService: MessageService,
    private translateService: TranslateService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private confirmationService: ConfirmationService,
    private pageInfo: PageInfoService
  ) { }

  ngOnInit(): void {
    this.initLanguage();
    this.initForm();
    this.loadQueryParams();
    this.loadTreasuries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initLanguage(): void {
    this.currentLang = this.translationService.getSelectedLanguage();
    this.isRtl = this.currentLang === 'ar';

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLang = event.lang;
        this.isRtl = event.lang === 'ar';
        this.pageInfo.setTitle(this.getPageTitle());
        this.cdr.detectChanges();
      });
  }

  private initForm(): void {
    const today = new Date();

    this.paymentForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      paymentDate: [today, Validators.required],
      paymentMethodType: [PaymentMethodType.Cash, Validators.required],
      referenceNumber: [null],
      notes: [null],
      treasuryId: [null, Validators.required]
    });
  }

  private loadTreasuries(): void {
    this.loadingTreasuries = true;
    this.treasuryService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (treasuries) => {
          this.treasuries = treasuries;
          this.treasuryOptions = treasuries.map(t => ({
            label: t.name || t['treasuryName'] || 'خزينة',
            value: t.id
          }));
          this.loadingTreasuries = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading treasuries:', err);
          this.loadingTreasuries = false;
        }
      });
  }

  private loadQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['invoiceId']) {
          this.invoiceId = params['invoiceId'];
          this.invoiceType = params['invoiceType'] ? +params['invoiceType'] : PaymentInvoiceType.SalesInvoice;
          const title = this.getPageTitle();
          this.pageInfo.updateTitle(title);
          this.cdr.detectChanges();

          this.loadInvoiceData();
          this.loadPayments();
          this.loadReceipts();
        }
      });
  }

  private loadReceipts(): void {
    if (this.invoiceType !== PaymentInvoiceType.SalesInvoice) return;

    this.paymentService.getPaycheckReceiptsByInvoice(this.invoiceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (receipts) => {
          this.receipts = receipts || [];
          // Calculate instantly on the frontend to avoid visual delay while waiting for the heavier invoice endpoint
          this.receiptsTotal = this.receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading receipts:', err);
        }
      });
  }

  /**
   * Load invoice data to get the total amount
   */
  private loadInvoiceData(): void {
    if (this.invoiceType !== PaymentInvoiceType.SalesInvoice) {
      // For now, only sales invoices are supported
      // Meal reservations would need a different service
      return;
    }

    this.loadingInvoice = true;
    this.cdr.detectChanges();

    const invoiceIdNum = parseInt(this.invoiceId, 10);
    if (isNaN(invoiceIdNum)) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('COMMON.ERROR'),
        detail: this.translateService.instant('PAYMENTS.INVALID_INVOICE_ID')
      });
      this.loadingInvoice = false;
      return;
    }

    this.salesInvoiceService.getInvoiceSummary(invoiceIdNum)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          // summary = { id, invoiceNo, invoiceTotal, paidAmount, remainingAmount, paymentStatus }
          // Build a minimal invoice-like object so the rest of the component works unchanged
          this.invoice = {
            ...this.invoice,
            invoiceNo: summary.invoiceNo,
            paidAmount: summary.paidAmount ?? 0,
            remainingAmount: summary.remainingAmount ?? 0,
            paymentStatus: summary.paymentStatus,
            totalPrice: summary.invoiceTotal ?? 0,
            netPrice: summary.invoiceTotal ?? 0
          } as any;
          this.invoiceTotal = summary.invoiceTotal ?? 0;
          this.totalPaid = summary.paidAmount ?? 0;
          this.remainingAmount = summary.remainingAmount ?? 0;

          // Update the page title with the real invoiceNo
          const title = this.getPageTitle();
          this.pageInfo.updateTitle(title);

          this.loadingInvoice = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading invoice summary:', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('COMMON.ERROR'),
            detail: this.translateService.instant('PAYMENTS.INVOICE_LOAD_ERROR')
          });
          this.loadingInvoice = false;
          this.cdr.detectChanges();
        }
      });
  }


  /**
   * Calculate the remaining amount based on formal invoice totals
   */
  private calculateRemainingAmount(): void {
    // Sum up all payment amounts (formal receipts only)
    this.totalPaid = this.invoice?.paidAmount ?? 0;

    // Calculate remaining (formal)
    this.remainingAmount = this.invoice?.remainingAmount ?? Math.max(0, this.invoiceTotal - this.totalPaid);

    // Update form validator
    this.paymentForm.get('amount')?.updateValueAndValidity();

    this.cdr.detectChanges();
  }

  /**
   * Get the page title based on invoice type
   */
  private getPageTitle(): string {
    const typeLabel = this.invoiceType === PaymentInvoiceType.SalesInvoice
      ? this.translateService.instant('PAYMENTS.PAGE_TITLE_SALES_INVOICE')
      : (this.invoiceType === PaymentInvoiceType.MealReservation
          ? this.translateService.instant('PAYMENTS.PAGE_TITLE_MEAL_RESERVATION')
          : this.translateService.instant('PAYMENTS.PAGE_TITLE'));
    const displayNo = this.invoice?.invoiceNo || this.invoiceId;
    return `${typeLabel} #${displayNo}`;
  }

  /**
   * Get the invoice type label for display
   */
  getInvoiceTypeLabel(): string {
    switch (this.invoiceType) {
      case PaymentInvoiceType.MealReservation:
        return this.translateService.instant('PAYMENTS.MEAL_RESERVATION');
      case PaymentInvoiceType.SalesInvoice:
      default:
        return this.translateService.instant('PAYMENTS.SALES_INVOICE');
    }
  }

  /**
   * Get the invoice/reservation number label
   */
  getInvoiceNumberLabel(): string {
    switch (this.invoiceType) {
      case PaymentInvoiceType.MealReservation:
        return this.translateService.instant('PAYMENTS.RESERVATION_NUMBER');
      case PaymentInvoiceType.SalesInvoice:
      default:
        return this.translateService.instant('PAYMENTS.INVOICE_NUMBER');
    }
  }

  loadPayments(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.paymentService.getPaymentsByInvoice(this.invoiceId, this.invoiceType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payments) => {
          this.payments = payments;
          this.calculateRemainingAmount();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('COMMON.ERROR'),
            detail: this.translateService.instant('PAYMENTS.LOAD_ERROR')
          });
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  savePayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const formValue = this.paymentForm.getRawValue();
    const paymentDate = formValue.paymentDate instanceof Date
      ? formValue.paymentDate.toISOString()
      : formValue.paymentDate;

    const createRequest: any = {
      invoiceId: this.invoiceId,
      invoiceType: this.invoiceType,
      amount: formValue.amount,
      paymentDate: paymentDate,
      paymentMethodType: formValue.paymentMethodType,
      referenceNumber: formValue.referenceNumber || null,
      notes: formValue.notes || null,
      treasuryId: formValue.treasuryId || null
    };

    const submitPayment = () => {
      this.saving = true;
      this.cdr.detectChanges();

      this.paymentService.createPayment(createRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (payment) => {
            const excessAmount = Math.max(0, (formValue.amount ?? 0) - this.remainingAmount);
            const receiptMessage = payment?.receiptNo
              ? this.getReceiptCreatedMessage(payment.receiptNo)
              : this.getReceiptCreatedMessage();
            const transferMessage = excessAmount > 0
              ? ` ${this.getExcessTransferredSuccessMessage(excessAmount)}`
              : '';

            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('COMMON.SUCCESS'),
              detail: `${this.translateService.instant('PAYMENTS.PAYMENT_SAVED')}. ${receiptMessage}${transferMessage}`.trim()
            });
            this.resetForm();
            this.isPaymentFormVisible = false;
            this.saving = false;
            this.cdr.detectChanges();
            this.loadPayments();
            this.loadReceipts();
            this.loadInvoiceData();
          },
          error: (error) => {
            console.error('Error saving payment:', error);
            const errMsg = error?.error || this.translateService.instant('PAYMENTS.PAYMENT_SAVE_ERROR');
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('COMMON.ERROR'),
              detail: typeof errMsg === 'string' ? errMsg : this.translateService.instant('PAYMENTS.PAYMENT_SAVE_ERROR')
            });
            this.saving = false;
            this.cdr.detectChanges();
          }
        });
    };

    const confirmMessage = this.currentLang === 'ar'
      ? 'هل تريد حفظ الدفعة؟ سيتم إنشاء سند قبض بمبلغ الدفعة تلقائيًا.'
      : 'Do you want to save the payment? A paycheck receipt will be created automatically for the payment amount.';

    const confirmHeader = this.currentLang === 'ar' ? 'تأكيد الحفظ' : 'Save Confirmation';
    const acceptLabel = this.currentLang === 'ar' ? 'استمرار' : 'Continue';
    const rejectLabel = this.currentLang === 'ar' ? 'إلغاء' : 'Cancel';

    this.confirmationService.confirm({
      message: confirmMessage,
      header: confirmHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: acceptLabel,
      rejectLabel: rejectLabel,
      acceptButtonStyleClass: 'p-button-primary p-button-rounded px-5',
      rejectButtonStyleClass: 'p-button-danger p-button-outlined p-button-rounded px-5',
      accept: () => {
        submitPayment();
      }
    });
  }

  private resetForm(): void {
    this.paymentForm.reset({
      amount: null,
      paymentDate: new Date(),
      paymentMethodType: PaymentMethodType.Cash,
      referenceNumber: null,
      notes: null,
      treasuryId: null
    });
    this.cdr.detectChanges();
  }

  togglePaymentForm(): void {
    if (this.isInvoiceFullyPaid()) return;
    this.isPaymentFormVisible = !this.isPaymentFormVisible;
    if (this.isPaymentFormVisible) {
      // Small delay to allow the DOM to render the form before scrolling
      setTimeout(() => {
        document.getElementById('payment-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      this.resetForm();
    }
  }

  formatDate(date: string | null): string {
    if (!date) return '-';
    try {
      const d = new Date(date);
      // Format as YYYY/MM/DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch {
      return '-';
    }
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    // Always use English numerals
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  /**
   * Dynamically translate Arabic receipt notes to English if they follow known patterns
   */
  translateDescription(desc: string | null | undefined): string {
    if (!desc) return '-';
    if (this.isRtl) return desc; // Already Arabic, return as is

    // Known patterns mapping
    const patterns = [
      {
        // سداد فاتورة Inv-219 بمبلغ 10.00
        regex: /^سداد فاتورة\s+(.+?)\s+بمبلغ\s+(.+)$/,
        replacer: (m: string[]) => `Payment of invoice ${m[1]} with amount ${m[2]}`
      },
      {
        // سداد جزء من فاتورة Inv-219 بمبلغ 10.00
        regex: /^سداد جزء من فاتورة\s+(.+?)\s+بمبلغ\s+(.+)$/,
        replacer: (m: string[]) => `Partial payment of invoice ${m[1]} with amount ${m[2]}`
      },
      {
        // دفعة من فاتورة Inv-219 بمبلغ 10.00
        regex: /^دفعة من فاتورة\s+(.+?)\s+بمبلغ\s+(.+)$/,
        replacer: (m: string[]) => `Payment from invoice ${m[1]} with amount ${m[2]}`
      },
      {
        // سداد فاتورة Inv-219
        regex: /^سداد فاتورة\s+(.+)$/,
        replacer: (m: string[]) => `Payment of invoice ${m[1]}`
      }
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern.regex);
      if (match) {
        return pattern.replacer(match);
      }
    }

    // If no pattern matched, return the original text
    return desc;
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return this.translateService.instant(`PAYMENTS.${fieldName.toUpperCase()}_REQUIRED`);
    }
    if (field.errors['min']) {
      return this.translateService.instant('PAYMENTS.AMOUNT_POSITIVE');
    }
    if (field.errors['maxAmount']) {
      return this.translateService.instant('PAYMENTS.AMOUNT_EXCEEDS_REMAINING', {
        remaining: this.formatNumber(this.remainingAmount)
      });
    }
    return '';
  }

  /**
   * Check if the invoice is fully paid
   */
  isInvoiceFullyPaid(): boolean {
    return this.invoice?.paymentStatus === InvoicePaymentStatus.Paid;
  }

  /**
   * Check if the invoice is partially paid
   */
  isInvoicePartiallyPaid(): boolean {
    return this.invoice?.paymentStatus === InvoicePaymentStatus.PartiallyPaid;
  }

  /**
   * Get payment status label based on database status
   */
  getPaymentStatusLabel(): string {
    const status = this.invoice?.paymentStatus;
    switch (status) {
      case InvoicePaymentStatus.Paid:
        return this.translateService.instant('PAYMENTS.STATUS_FULLY_PAID');
      case InvoicePaymentStatus.PartiallyPaid:
        return this.translateService.instant('PAYMENTS.STATUS_PARTIALLY_PAID');
      case InvoicePaymentStatus.Unpaid:
      default:
        return this.translateService.instant('PAYMENTS.STATUS_UNPAID');
    }
  }

  /**
   * Get payment status class for styling based on database status
   */
  getPaymentStatusClass(): string {
    const status = this.invoice?.paymentStatus;
    switch (status) {
      case InvoicePaymentStatus.Paid:
        return 'status-fully-paid';
      case InvoicePaymentStatus.PartiallyPaid:
        return 'status-partially-paid';
      case InvoicePaymentStatus.Unpaid:
      default:
        return 'status-unpaid';
    }
  }



  /**
   * Get the label for a payment method based on current language
   */
  getPaymentMethodLabel(paymentMethodType: PaymentMethodType | null | undefined): string {
    if (paymentMethodType === null || paymentMethodType === undefined) return '-';

    const option = this.paymentMethodOptions.find(opt => opt.value === paymentMethodType);
    if (!option) return '-';

    return this.isRtl ? option.labelAr : option.labelEn;
  }

  /**
   * Navigate to view an auto-created receipt for this payment
   */
  navigateToViewReceipt(payment: any): void {
    if (!payment?.paycheckReceiptId) return;
    const basePath = this.invoice?.isFrontal
      ? '/receipts/frontal-paycheck-receipts'
      : '/receipts/paycheck-receipts';
    const url = this.router.serializeUrl(
      this.router.createUrlTree([basePath, payment.paycheckReceiptId])
    );
    window.open(url, '_blank', 'noopener');
  }

  /**
   * Navigate to view an actual receipt from the receipts table
   */
  navigateToViewActualReceipt(receiptId: string | number): void {
    if (!receiptId) return;
    const basePath = this.invoice?.isFrontal
      ? '/receipts/frontal-paycheck-receipts'
      : '/receipts/paycheck-receipts';
    const url = this.router.serializeUrl(
      this.router.createUrlTree([basePath, receiptId])
    );
    window.open(url, '_blank', 'noopener');
  }


  getExcessAmountHint(amount: number | null | undefined): string {
    const enteredAmount = Number(amount || 0);
    const excessAmount = Math.max(0, enteredAmount - this.remainingAmount);
    if (excessAmount <= 0) return '';

    return this.isRtl
      ? `سيتم ترحيل مبلغ زائد قدره <strong>( ${this.formatNumber(excessAmount)} )</strong> إلى رصيد العميل بعد تسوية المتبقي <strong>( ${this.formatNumber(this.remainingAmount)} )</strong>`
      : `An extra amount of <strong>( ${this.formatNumber(excessAmount)} )</strong> will be transferred to customer credit after settling the remaining <strong>( ${this.formatNumber(this.remainingAmount)} )</strong>`;
  }

  getReceiptColumnLabel(): string {
    return this.isRtl ? 'رقم سند القبض' : 'Receipt Number';
  }

  getTreasuryLabel(): string {
    return this.isRtl ? 'الخزينة' : 'Treasury';
  }

  getSelectTreasuryPlaceholder(): string {
    return this.isRtl ? 'اختر الخزينة' : 'Select Treasury';
  }

  getTreasuryRequiredMessage(): string {
    return this.isRtl ? 'الخزينة مطلوبة' : 'Treasury is required';
  }

  getViewReceiptLabel(): string {
    return this.isRtl ? 'عرض السند' : 'View Receipt';
  }

  getReceiptCreatedMessage(receiptNo?: string | null): string {
    if (receiptNo) {
      return this.isRtl
        ? `تم إنشاء سند القبض رقم ${receiptNo} تلقائياً`
        : `Receipt voucher ${receiptNo} created automatically`;
    }

    return this.isRtl
      ? 'تم إنشاء سند القبض تلقائياً'
      : 'Receipt voucher created automatically';
  }

  getExcessTransferredSuccessMessage(amount: number): string {
    return this.isRtl
      ? `تم ترحيل مبلغ ${this.formatNumber(amount)} إلى الرصيد الدائن للعميل`
      : `${this.formatNumber(amount)} has been transferred to the customer credit balance`;
  }

  getExcessConfirmHeader(): string {
    return this.isRtl ? 'تأكيد الدفعة الزائدة' : 'Confirm extra payment';
  }

  getExcessConfirmMessage(excessAmount: number): string {
    return this.isRtl
      ? `المبلغ المدخل أكبر من المتبقي على الفاتورة. سيتم تسوية الفاتورة بمبلغ ${this.formatNumber(this.remainingAmount)} وترحيل مبلغ ${this.formatNumber(excessAmount)} إلى الرصيد الدائن للعميل. هل تريد المتابعة؟`
      : `The entered amount exceeds the remaining invoice balance. ${this.formatNumber(this.remainingAmount)} will be allocated to the invoice and ${this.formatNumber(excessAmount)} will be transferred to the customer credit balance. Do you want to continue?`;
  }
}
