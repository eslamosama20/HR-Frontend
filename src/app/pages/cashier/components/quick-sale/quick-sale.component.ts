import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { CashierService } from 'src/app/services/cashier/cashier.service';
import { CashierSession } from 'src/app/models/cashier/cashier-session.model';
import { CashierProduct } from 'src/app/models/cashier/cashier-product.model';
import { CartItem, PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import { PaymentOrchestrationService } from 'src/app/services/cashier/payment-orchestration.service';
import {
  CheckoutPaymentOption,
  ElectronicPaymentPendingState
} from 'src/app/models/cashier/payment-orchestration.model';

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [
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
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss']
})
export class QuickSaleComponent implements OnInit {
  loading = signal<boolean>(false);
  currentSession = signal<CashierSession | null>(null);
  products = signal<CashierProduct[]>([]);
  cart = signal<CartItem[]>([]);

  /** Dual Mode: false = Normal Retail, true = Pharmacy (no manual qty, shows batch) */
  isPharmacyMode = false;

  searchTerm: string = '';
  barcodeTerm: string = '';
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';

  showCheckoutDialog: boolean = false;
  paymentMethod: PaymentMethod = PaymentMethod.Cash;
  paidAmount: number = 0;
  changeAmount: number = 0;

  // ── Electronic Payment Orchestration ─────────────────────────────────────
  /** Available payment options (static + dynamic from API) */
  checkoutPaymentOptions: CheckoutPaymentOption[] = [];
  /** Which option is currently selected — key string, e.g. 'cash' | 'mada' | 'tabby' */
  selectedPaymentKey: string = 'cash';
  /** True while payment methods are loading from /api/payments/methods */
  loadingPaymentMethods = false;
  /** Non-null while waiting for customer to complete an electronic payment */
  pendingPayment: ElectronicPaymentPendingState | null = null;
  /** True while POSTing to /api/payments */
  creatingPaymentLink = false;
  /** True if the gateway URL was blocked by the browser popup blocker */
  popupBlocked = false;
  /** True while manually confirming payment after cashier verification */
  confirmingPayment = false;
  showPaymentPendingDialog = false;
  checkoutIdempotencyKey: string | null = null;

  PaymentMethod = PaymentMethod;

  constructor(
    private cashierService: CashierService,
    private messageService: MessageService,
    private destroyRef: DestroyRef,
    private translateService: TranslateService,
    private paymentOrchestrationService: PaymentOrchestrationService
  ) {}

  ngOnInit(): void {
    this.loadCurrentSession();
  }

  loadCurrentSession(): void {
    this.cashierService.currentSession$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          const previousSessionId = this.currentSession()?.id;
          this.currentSession.set(session);

          if (session?.id && session.id !== previousSessionId) {
            this.loadProducts();
          }

          if (!session?.id) {
            this.products.set([]);
          }
        },
        error: () => {
          this.currentSession.set(null);
          this.products.set([]);
        }
      });
  }

  loadProducts(): void {
    const currentSession = this.currentSession();
    if (!currentSession?.id) {
      this.products.set([]);
      return;
    }

    this.loading.set(true);
    this.cashierService.searchProducts({
      searchTerm: this.searchTerm,
      pageSize: 80,
      inStock: true,
      cashierSessionId: currentSession.id,
      storeDetailsId: currentSession.storeDetailsId
    }).subscribe({
      next: (products) => {
        this.products.set(products || []);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.loadProducts();
  }

  addByBarcode(): void {
    const code = (this.barcodeTerm || '').trim();
    if (!code) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'أدخل الباركود أولاً'
      });
      return;
    }

    // Search in loaded products by barcode or code
    const fromLoadedProducts = this.products().find(
      (product) => product.barcode === code || product.code === code
    );

    if (fromLoadedProducts) {
      this.addToCart(fromLoadedProducts);
      this.barcodeTerm = '';
      return;
    }

    // Also search by ReferenceCode number or partial match
    const fromPartialMatch = this.products().find(
      (product) => (product.barcode || '').includes(code) || (product.code || '').includes(code)
    );

    if (fromPartialMatch) {
      this.addToCart(fromPartialMatch);
      this.barcodeTerm = '';
      return;
    }

    const currentSession = this.currentSession();
    if (!currentSession?.id || !currentSession.storeDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_OPEN_SESSION_FIRST')
      });
      return;
    }

    this.loading.set(true);
    this.cashierService.getProductByBarcode(code, currentSession.id, currentSession.storeDetailsId).subscribe({
      next: (product) => {
        this.addToCart(product);
        this.barcodeTerm = '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('CASHIER_POS.WARNING'),
          detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_NOT_FOUND')
        });
      }
    });
  }

  togglePharmacyMode(): void {
    this.isPharmacyMode = !this.isPharmacyMode;
    this.messageService.add({
      severity: this.isPharmacyMode ? 'info' : 'secondary',
      summary: this.isPharmacyMode ? 'وضع الصيدلية' : 'وضع البيع العادي',
      detail: this.isPharmacyMode
        ? 'تم تفعيل وضع الصيدلية — الكمية عبر المسح فقط.'
        : 'تم العودة لوضع البيع العادي.'
    });
    if (this.cart().length > 0) {
      this.cart.set([]);
    }
  }

  get quickProducts(): CashierProduct[] {
    return this.products().slice(0, 12);
  }

  addToCart(product: CashierProduct): void {
    if (product.availableQuantity <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_OUT_OF_STOCK'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_OUT_OF_STOCK')
      });
      return;
    }

    const limit = this.currentSession()?.stockAlertLimit ?? 10;
    if (product.availableQuantity <= limit) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه مخزون منخفض',
        detail: `تنبيه: مخزون المنتج "${product.nameAr || product.nameEn}" منخفض جداً! المتبقي: ${product.availableQuantity}`
      });
    }

    const cartItems = [...this.cart()];
    const existing = cartItems.find((item) => item.itemId === product.id);

    if (existing) {
      if ((existing.availableQuantity || 0) > 0 && existing.quantity >= (existing.availableQuantity || 0)) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('CASHIER_POS.WARNING'),
          detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_MAX_QTY')
        });
        return;
      }
      existing.quantity += 1;
      this.updateItemTotal(existing);
    } else {
      const newItem: CartItem = {
        itemId: product.id,
        itemCode: product.code,
        itemName: product.nameAr || product.nameEn,
        itemBarcode: product.barcode,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: product.taxPercentage || 0,
        taxAmount: 0,
        totalAmount: product.sellingPrice,
        availableQuantity: product.availableQuantity,
        unitName: product.unitName
      };
      this.updateItemTotal(newItem);
      cartItems.push(newItem);
    }

    this.cart.set(cartItems);
  }

  decreaseItem(item: CartItem): void {
    this.updateQuantity(item, item.quantity - 1);
  }

  increaseItem(item: CartItem): void {
    this.updateQuantity(item, item.quantity + 1);
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeItem(item);
      return;
    }

    if ((item.availableQuantity || 0) > 0 && newQuantity > (item.availableQuantity || 0)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_ONLY_AVAILABLE', { qty: item.availableQuantity })
      });
      return;
    }

    item.quantity = newQuantity;
    this.updateItemTotal(item);
    this.cart.set([...this.cart()]);
  }

  removeItem(item: CartItem): void {
    this.cart.set(this.cart().filter((cartItem) => cartItem.itemId !== item.itemId));
  }

  clearSale(): void {
    this.cart.set([]);
    this.customerName = '';
    this.paidAmount = 0;
    this.changeAmount = 0;
  }

  openCheckout(): void {
    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_NO_ITEMS')
      });
      return;
    }

    if (!this.currentSession()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_SESSION_REQUIRED')
      });
      return;
    }

    this.paymentMethod = PaymentMethod.Cash;
    this.selectedPaymentKey = 'cash';
    this.paidAmount = this.grandTotal;
    this.calculateChange();
    this.checkoutIdempotencyKey = this.cashierService.generateUUID();
    this.showCheckoutDialog = true;

    // Load dynamic electronic methods (cached after first call)
    this.loadPaymentMethods();
  }

  private loadPaymentMethods(): void {
    this.loadingPaymentMethods = true;
    this.paymentOrchestrationService.getMethods('SA').subscribe({
      next: (methods) => {
        this.checkoutPaymentOptions = this.paymentOrchestrationService.buildCheckoutOptions(methods, false);
        this.loadingPaymentMethods = false;
      },
      error: () => {
        // Graceful degradation: show static options only
        this.checkoutPaymentOptions = this.paymentOrchestrationService.buildCheckoutOptions([], false);
        this.loadingPaymentMethods = false;
      }
    });
  }

  selectPaymentOption(option: CheckoutPaymentOption): void {
    this.selectedPaymentKey = option.key;
    if (option.isElectronic) {
      // Electronic: full amount is sent to the gateway
      this.paidAmount = this.grandTotal;
      this.changeAmount = 0;
      this.paymentMethod = PaymentMethod.Card; // map to closest legacy enum value
    } else if (option.key === 'cash') {
      this.paymentMethod = PaymentMethod.Cash;
      this.paidAmount = this.grandTotal;
      this.calculateChange();
    } else if (option.key === 'credit') {
      this.paymentMethod = PaymentMethod.Credit;
      this.paidAmount = this.grandTotal;
      this.changeAmount = 0;
    }
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    if (method !== PaymentMethod.Cash) {
      this.paidAmount = this.grandTotal;
    }
    this.calculateChange();
  }

  calculateChange(): void {
    if (this.paymentMethod === PaymentMethod.Cash) {
      this.changeAmount = Math.max(0, this.paidAmount - this.grandTotal);
      return;
    }
    this.changeAmount = 0;
  }

  get isElectronicMethodSelected(): boolean {
    return this.checkoutPaymentOptions.find(o => o.key === this.selectedPaymentKey)?.isElectronic ?? false;
  }

  // ── Payment Pending Modal ─────────────────────────────────────────────────

  openPaymentUrl(): void {
    if (!this.pendingPayment) return;
    const opened = this.paymentOrchestrationService.openPaymentUrl(this.pendingPayment.paymentUrl);
    this.popupBlocked = !opened;
    if (this.popupBlocked) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'تم حظر النافذة الجديدة — انقر على "نسخ الرابط" وافتحه يدوياً.'
      });
    }
  }

  async copyPaymentUrl(): Promise<void> {
    if (!this.pendingPayment) return;
    const ok = await this.paymentOrchestrationService.copyToClipboard(this.pendingPayment.paymentUrl);
    this.messageService.add({
      severity: ok ? 'success' : 'warn',
      summary: ok ? 'تم النسخ' : 'تعذر النسخ',
      detail: ok ? 'تم نسخ رابط الدفع إلى الحافظة.' : 'افتح الرابط يدوياً من المتصفح.'
    });
  }

  /**
   * Phase-1: Cashier manually confirms payment after visual verification.
   * Proceeds to finalize the invoice with the existing checkout flow.
   */
  confirmPaymentManually(): void {
    if (!this.pendingPayment) return;
    this.confirmingPayment = true;
    this.finalizeInvoice();
  }

  cancelPendingPayment(): void {
    this.pendingPayment = null;
    this.showPaymentPendingDialog = false;
    this.confirmingPayment = false;
    this.creatingPaymentLink = false;
    this.loading.set(false);
    this.messageService.add({
      severity: 'info',
      summary: 'تم الإلغاء',
      detail: 'تم إلغاء عملية الدفع الإلكتروني.'
    });
  }

  confirmQuickSale(): void {
    // ── Validation ─────────────────────────────────────────────────────────
    if (this.selectedPaymentKey === 'cash' && this.paidAmount < this.grandTotal) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_PAYMENT_LESS')
      });
      return;
    }

    const currentSession = this.currentSession();
    if (!currentSession?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_SESSION.NO_SESSIONS_AVAILABLE')
      });
      return;
    }

    if (!currentSession.storeDetailsId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_POS.WARNING'),
        detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_OPEN_SESSION_FIRST')
      });
      return;
    }

    // ── Route to Electronic Gateway or Standard Flow ───────────────────────
    if (this.isElectronicMethodSelected) {
      this.initiateElectronicPayment(currentSession);
    } else {
      this.loading.set(true);
      this.finalizeInvoice();
    }
  }

  /**
   * Step 1 (Electronic): POST to /api/payments to create the gateway link.
   * Opens the link and shows the pending modal.
   */
  private initiateElectronicPayment(session: CashierSession): void {
    const orderRef = `POS-${session.id}-${Date.now()}`;
    const selectedOption = this.checkoutPaymentOptions.find(o => o.key === this.selectedPaymentKey);

    const request = this.paymentOrchestrationService.buildRequest({
      orderReference: orderRef,
      amount: this.grandTotal,
      methodKey: this.selectedPaymentKey,
      customerName: this.customerName || undefined,
      customerEmail: this.customerEmail || undefined,
      customerPhone: this.customerPhone || undefined,
      description: `فاتورة كاشير — جلسة ${session.id}`
    });

    this.creatingPaymentLink = true;
    this.loading.set(true);

    this.paymentOrchestrationService.createPayment(request).subscribe({
      next: (res) => {
        this.creatingPaymentLink = false;
        this.loading.set(false);
        this.pendingPayment = {
          internalId: res.internalId,
          paymentUrl: res.paymentUrl,
          provider: res.provider,
          orderReference: orderRef,
          amount: this.grandTotal,
          methodKey: this.selectedPaymentKey,
          methodLabel: selectedOption?.label || this.selectedPaymentKey
        };
        this.showCheckoutDialog = false;
        this.showPaymentPendingDialog = true;
        // Attempt auto-open (may be blocked by popup blockers)
        this.popupBlocked = !this.paymentOrchestrationService.openPaymentUrl(res.paymentUrl);
      },
      error: () => {
        this.creatingPaymentLink = false;
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ في الدفع الإلكتروني',
          detail: 'تعذر إنشاء رابط الدفع — تحقق من اتصال الخادم وأعد المحاولة.'
        });
      }
    });
  }

  /**
   * Step 2: Finalize the POS invoice (shared between cash/credit and post-manual-confirm flows).
   */
  private finalizeInvoice(): void {
    const currentSession = this.currentSession();
    if (!currentSession?.id) return;

    const invoicePayload = this.buildInvoicePayload(currentSession.id);
    this.loading.set(true);

    this.cashierService.checkout(invoicePayload as any, this.checkoutIdempotencyKey || undefined).subscribe({
      next: (res: any) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('CASHIER_QUICK_SALE.COMPLETED'),
          detail: this.translateService.instant('CASHIER_QUICK_SALE.NOTIFY_SUCCESS')
        });
        this.showCheckoutDialog = false;
        this.showPaymentPendingDialog = false;
        this.pendingPayment = null;
        this.confirmingPayment = false;
        this.checkoutIdempotencyKey = null;
        this.clearSale();
        this.loading.set(false);
        this.loadProducts();
        this.loadCurrentSession();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.confirmingPayment = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
          detail: err.error?.messageAr || err.error?.message || 'فشلت عملية البيع والدفع. تم التراجع ولم يخصم أي مخزون.'
        });
      }
    });
  }
  get itemsCount(): number {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  get discountTotal(): number {
    return this.cart().reduce((sum, item) => sum + item.discountAmount, 0);
  }

  get taxTotal(): number {
    return this.cart().reduce((sum, item) => sum + item.taxAmount, 0);
  }

  get grandTotal(): number {
    return this.cart().reduce((sum, item) => sum + item.totalAmount, 0);
  }

  private updateItemTotal(item: CartItem): void {
    const itemSubtotal = item.quantity * item.unitPrice;
    item.discountAmount = (itemSubtotal * item.discountPercentage) / 100;
    const afterDiscount = itemSubtotal - item.discountAmount;
    item.taxAmount = (afterDiscount * item.taxPercentage) / 100;
    item.totalAmount = afterDiscount + item.taxAmount;
  }

  private buildInvoicePayload(sessionId: number): Record<string, unknown> {
    const subtotal = this.subtotal;
    const discount = this.discountTotal;
    const tax = this.taxTotal;
    const total = this.grandTotal;
    const taxableBase = Math.max(0, subtotal - discount);

    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const taxPercent = taxableBase > 0 ? (tax / taxableBase) * 100 : 0;

    return {
      invoiceDate: new Date(),
      cashierSessionId: sessionId,
      storeDetailsId: this.currentSession()?.storeDetailsId || null,
      customerName: this.customerName?.trim() || this.translateService.instant('CASHIER_QUICK_SALE.WALK_IN_CUSTOMER'),
      items: this.cart().map(item => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        taxPercentage: item.taxPercentage,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount
      })),
      subtotal,
      discountPercentage: discountPercent,
      discountAmount: discount,
      taxPercentage: taxPercent,
      taxAmount: tax,
      totalAmount: total,
      paymentMethod: this.paymentMethod,
      paidAmount: this.paidAmount,
      changeAmount: this.changeAmount
    };
  }

  private buildPaymentPayload(invoiceId: number): Record<string, unknown> {
    const total = this.grandTotal;
    const payload: Record<string, unknown> = {
      invoiceId,
      totalAmount: total,
      paymentMethod: this.paymentMethod
    };

    if (this.paymentMethod === PaymentMethod.Cash) {
      payload['cashAmount'] = this.paidAmount;
      return payload;
    }

    if (this.paymentMethod === PaymentMethod.Card || this.paymentMethod === PaymentMethod.BankTransfer) {
      payload['cardAmount'] = total;
      return payload;
    }

    if (this.paymentMethod === PaymentMethod.Credit) {
      payload['creditDays'] = 30;
      return payload;
    }

    const mixedCash = Math.max(0, Math.min(this.paidAmount, total));
    const mixedCard = Math.max(0, total - mixedCash);
    payload['cashAmount'] = mixedCash;
    payload['cardAmount'] = mixedCard;
    return payload;
  }

  private getMockProducts(): CashierProduct[] {
    return [
      {
        id: 101,
        code: 'QS-101',
        barcode: '101101101',
        nameAr: 'قهوة سريعة',
        nameEn: 'Quick Coffee',
        sellingPrice: 12,
        costPrice: 8,
        availableQuantity: 40,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'مشروبات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 102,
        code: 'QS-102',
        barcode: '102102102',
        nameAr: 'ماء معدني',
        nameEn: 'Water Bottle',
        sellingPrice: 3,
        costPrice: 1.5,
        availableQuantity: 120,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'مشروبات',
        isActive: true,
        unitName: 'قطعة'
      },
      {
        id: 103,
        code: 'QS-103',
        barcode: '103103103',
        nameAr: 'سناك',
        nameEn: 'Snack',
        sellingPrice: 7.5,
        costPrice: 4,
        availableQuantity: 65,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'وجبات خفيفة',
        isActive: true,
        unitName: 'قطعة'
      }
    ];
  }
}
