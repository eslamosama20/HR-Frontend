import { Component, DestroyRef, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import {
  DiningTable,
  DiningTableStatus,
  MenuCatalogItem,
  RestaurantOrder,
  RestaurantOrderStatus,
  SelfOrderDraftItem,
  TableBillingSnapshot
} from 'src/app/models/cashier/restaurant-mode.model';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-table-workspace',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputNumberModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './table-workspace.component.html',
  styleUrls: ['./table-workspace.component.scss']
})
export class TableWorkspaceComponent implements OnInit, OnDestroy {
  readonly orderStatus = RestaurantOrderStatus;
  readonly tableStatus = DiningTableStatus;
  readonly prepPresets = [10, 15, 20, 30, 45];

  readonly paymentMethods = [
    { label: 'نقدي', value: PaymentMethod.Cash, icon: 'pi pi-money-bill' },
    { label: 'بطاقة / مدى', value: PaymentMethod.Card, icon: 'pi pi-credit-card' },
    { label: 'دفع مختلط', value: PaymentMethod.Mixed, icon: 'pi pi-sliders-h' },
    { label: 'آجل', value: PaymentMethod.Credit, icon: 'pi pi-file-edit' },
    { label: 'تحويل بنكي', value: PaymentMethod.BankTransfer, icon: 'pi pi-building' }
  ];

  table = signal<DiningTable | undefined>(undefined);
  snapshot = signal<TableBillingSnapshot | undefined>(undefined);
  orderTimeline = signal<RestaurantOrder[]>([]);
  menuProducts = signal<MenuCatalogItem[]>([]);
  cartItems = signal<Array<{ product: MenuCatalogItem; quantity: number }>>([]);
  activeTab: 'orders' | 'menu' = 'orders';
  selectedCategory = 'all';
  menuSearchTerm = '';
  now = signal<number>(Date.now());

  tableId = 0;
  showPaymentDialog = false;
  showAddItemsDialog = false;
  isSubmittingOrder = false;
  paymentMethod: PaymentMethod = PaymentMethod.Cash;
  paidAmount = 0;
  cashAmount = 0;
  cardAmount = 0;
  changeAmount = 0;
  prepMinutesByOrder: Record<number, number> = {};
  private clockInterval?: ReturnType<typeof setInterval>;

  PaymentMethod = PaymentMethod;

  get selfOrderUrl(): string {
    const token = this.table()?.token;
    if (!token) return '';
    return `${window.location.origin}/self-order/${token}`;
  }

  get categories(): string[] {
    const set = new Set<string>();
    this.menuProducts().forEach(p => {
      const cat = p.categoryNameAr || p.categoryNameEn;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }

  get filteredMenuProducts(): MenuCatalogItem[] {
    const search = this.menuSearchTerm.trim().toLowerCase();
    const cat = this.selectedCategory;
    return this.menuProducts().filter(p => {
      const nameMatch = !search ||
        (p.nameAr && p.nameAr.toLowerCase().includes(search)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(search));
      const catMatch = cat === 'all' ||
        (p.categoryNameAr === cat || p.categoryNameEn === cat);
      return nameMatch && catMatch;
    });
  }

  get cartTotal(): number {
    return this.cartItems().reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  }

  get cartCount(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  get cashSuggestions(): number[] {
    const tot = this.totalAmount;
    if (tot <= 0) return [];
    const suggestions = new Set<number>();
    suggestions.add(tot);
    if (tot % 10 !== 0) suggestions.add(Math.ceil(tot / 10) * 10);
    if (tot % 50 !== 0) suggestions.add(Math.ceil(tot / 50) * 50);
    if (tot % 100 !== 0) suggestions.add(Math.ceil(tot / 100) * 100);
    suggestions.add(500);
    return Array.from(suggestions).filter(s => s >= tot).sort((a, b) => a - b).slice(0, 4);
  }

  constructor(
    private route: ActivatedRoute,
    private restaurantModeService: RestaurantModeService,
    private messageService: MessageService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.now.set(Date.now());
    }, 15_000);

    this.restaurantModeService.menuProducts$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(products => {
      this.menuProducts.set(products || []);
    });
    const existingMenu = this.restaurantModeService.getMenuSnapshot();
    if (existingMenu.length > 0) {
      this.menuProducts.set(existingMenu);
    }

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const tableId = Number(params.get('tableId'));
      if (!Number.isFinite(tableId) || tableId <= 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'رقم الطاولة غير صالح'
        });
        return;
      }

      this.tableId = tableId;
      this.loadTableData();
    });

    this.restaurantModeService.tables$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadTableData());
    this.restaurantModeService.orders$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadTableData());
  }

  addToCart(product: MenuCatalogItem): void {
    const current = [...this.cartItems()];
    const index = current.findIndex(i => i.product.id === product.id);
    if (index > -1) {
      current[index] = { ...current[index], quantity: current[index].quantity + 1 };
    } else {
      current.push({ product, quantity: 1 });
    }
    this.cartItems.set(current);
    this.messageService.add({
      severity: 'info',
      summary: 'تمت الإضافة',
      detail: `تمت إضافة "${product.nameAr || product.nameEn}" إلى الطلب`,
      life: 2000
    });
  }

  removeFromCart(productId: number): void {
    this.cartItems.set(this.cartItems().filter(i => i.product.id !== productId));
  }

  updateCartQty(productId: number, delta: number): void {
    const current = [...this.cartItems()];
    const index = current.findIndex(i => i.product.id === productId);
    if (index > -1) {
      const newQty = current[index].quantity + delta;
      if (newQty <= 0) {
        this.removeFromCart(productId);
      } else {
        current[index] = { ...current[index], quantity: newQty };
        this.cartItems.set(current);
      }
    }
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  async submitCartOrder(): Promise<void> {
    const currentTable = this.table();
    if (!currentTable?.token) {
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'رمز الطاولة غير متاح' });
      return;
    }

    if (this.cartItems().length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'تنبيه', detail: 'يرجى اختيار أصناف لإرسال الطلب' });
      return;
    }

    this.isSubmittingOrder = true;
    try {
      const itemsPayload: SelfOrderDraftItem[] = this.cartItems().map(i => ({
        productId: i.product.id,
        quantity: i.quantity
      }));

      const result = await this.restaurantModeService.placeSelfOrder({
        tableToken: currentTable.token,
        items: itemsPayload,
        customerName: `طاولة ${currentTable.tableNumber}`
      });

      if (result.success) {
        this.cartItems.set([]);
        this.showAddItemsDialog = false;
        this.activeTab = 'orders';
        this.messageService.add({
          severity: 'success',
          summary: 'تم إرسال الطلب',
          detail: 'تم تسجيل الطلب وإرساله إلى المطبخ بنجاح'
        });
        this.loadTableData();
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: result.message || 'تعذر إرسال الطلب'
        });
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء إرسال الطلب' });
    } finally {
      this.isSubmittingOrder = false;
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  get hasOpenBill(): boolean {
    return this.totalAmount > 0;
  }

  get confirmedOrdersCount(): number {
    return this.snapshot()?.orders.length || 0;
  }

  get ordersCount(): number {
    return this.confirmedOrdersCount + (this.cartItems().length > 0 ? 1 : 0);
  }

  get confirmedItemsCount(): number {
    return this.snapshot()?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  get itemsCount(): number {
    return this.confirmedItemsCount + this.cartCount;
  }

  get confirmedSubtotal(): number {
    return this.snapshot()?.subtotal || 0;
  }

  get draftSubtotal(): number {
    const total = this.cartTotal;
    return total > 0 ? Math.round((total / 1.15) * 100) / 100 : 0;
  }

  get subtotal(): number {
    return this.confirmedSubtotal + this.draftSubtotal;
  }

  get confirmedTax(): number {
    return this.snapshot()?.taxAmount || 0;
  }

  get draftTax(): number {
    const total = this.cartTotal;
    return total > 0 ? Math.round((total - this.draftSubtotal) * 100) / 100 : 0;
  }

  get taxAmount(): number {
    return this.confirmedTax + this.draftTax;
  }

  get confirmedTotal(): number {
    return this.snapshot()?.totalAmount || 0;
  }

  get totalAmount(): number {
    return this.confirmedTotal + this.cartTotal;
  }

  openPayment(): void {
    if (!this.hasOpenBill) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'لا توجد طلبات مفتوحة لهذه الطاولة'
      });
      return;
    }

    this.paymentMethod = PaymentMethod.Cash;
    this.paidAmount = this.totalAmount;
    this.cashAmount = Number((this.totalAmount / 2).toFixed(2));
    this.cardAmount = Number((this.totalAmount - this.cashAmount).toFixed(2));
    this.calculateChange();
    this.showPaymentDialog = true;
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    if (method === PaymentMethod.Cash) {
      this.paidAmount = this.totalAmount;
    } else if (method === PaymentMethod.Mixed) {
      this.cashAmount = Number((this.totalAmount / 2).toFixed(2));
      this.cardAmount = Number((this.totalAmount - this.cashAmount).toFixed(2));
    }
    this.calculateChange();
  }

  calculateChange(): void {
    if (this.paymentMethod === PaymentMethod.Cash) {
      this.changeAmount = Math.max(0, this.paidAmount - this.totalAmount);
      return;
    }
    if (this.paymentMethod === PaymentMethod.Mixed) {
      this.cardAmount = Math.max(0, Number((this.totalAmount - (this.cashAmount || 0)).toFixed(2)));
      this.changeAmount = 0;
      return;
    }
    this.changeAmount = 0;
  }

  onCashAmountChange(val: number): void {
    this.cashAmount = Math.max(0, Math.min(this.totalAmount, Number(val) || 0));
    this.cardAmount = Math.max(0, Number((this.totalAmount - this.cashAmount).toFixed(2)));
  }

  async closeTable(): Promise<void> {
    if (this.paymentMethod === PaymentMethod.Cash && this.paidAmount < this.totalAmount) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'المبلغ المدفوع أقل من الإجمالي'
      });
      return;
    }

    const effectiveCash = this.paymentMethod === PaymentMethod.Mixed
      ? this.cashAmount
      : (this.paymentMethod === PaymentMethod.Cash ? this.paidAmount : 0);

    const result = await this.restaurantModeService.closeTable(this.tableId, this.paymentMethod, effectiveCash);
    if (!result) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'تعذر إتمام الدفع وإغلاق الطاولة'
      });
      return;
    }

    this.showPaymentDialog = false;
    this.messageService.add({
      severity: 'success',
      summary: 'تم التحصيل',
      detail: `تم سداد فاتورة الطاولة ${this.table()?.tableNumber} بنجاح`
    });
    this.loadTableData();
  }

  setOrderPreparing(order: RestaurantOrder): void {
    this.restaurantModeService.setOrderPreparationTime(order.id, this.getPreparationMinutes(order));
  }

  setOrderReady(order: RestaurantOrder): void {
    this.restaurantModeService.updateOrderStatus(order.id, RestaurantOrderStatus.Ready);
  }

  setOrderServed(order: RestaurantOrder): void {
    this.restaurantModeService.updateOrderStatus(order.id, RestaurantOrderStatus.Served);
  }

  setOrderPreparationTime(order: RestaurantOrder): void {
    const updated = this.restaurantModeService.setOrderPreparationTime(order.id, this.getPreparationMinutes(order));
    if (!updated) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'تعذر تحديد وقت التحضير'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'تم',
      detail: `تم ضبط وقت التحضير (${updated.preparationMinutes} دقيقة) للطلب ${order.orderNo}`
    });
  }

  getOrderStatusLabel(status: RestaurantOrderStatus): string {
    const labels: Record<RestaurantOrderStatus, string> = {
      [RestaurantOrderStatus.New]: 'جديد',
      [RestaurantOrderStatus.Preparing]: 'تحضير',
      [RestaurantOrderStatus.Ready]: 'جاهز',
      [RestaurantOrderStatus.Served]: 'تم التقديم',
      [RestaurantOrderStatus.Paid]: 'مدفوع',
      [RestaurantOrderStatus.Cancelled]: 'ملغي'
    };
    return labels[status];
  }

  getPreparationMinutes(order: RestaurantOrder): number {
    const selected = this.prepMinutesByOrder[order.id];
    if (Number.isFinite(selected) && selected > 0) {
      return Math.min(180, Math.max(1, Math.round(selected)));
    }

    if (order.preparationMinutes && Number.isFinite(order.preparationMinutes)) {
      return Math.min(180, Math.max(1, Math.round(order.preparationMinutes)));
    }

    return 15;
  }

  onPreparationMinutesChange(order: RestaurantOrder, value: number | null | undefined): void {
    const numeric = Number(value);
    this.prepMinutesByOrder[order.id] = Number.isFinite(numeric) && numeric > 0
      ? Math.min(180, Math.max(1, Math.round(numeric)))
      : 15;
  }

  getPreparationStatus(order: RestaurantOrder): string {
    if (order.status === RestaurantOrderStatus.Ready || order.status === RestaurantOrderStatus.Served) {
      return 'تم التحضير';
    }

    if (order.status === RestaurantOrderStatus.Preparing) {
      const remaining = this.getRemainingMinutes(order);
      if (remaining === null) {
        return 'قيد التحضير';
      }
      return remaining > 0 ? `متبقي ${remaining} دقيقة` : 'على وشك الجاهزية';
    }

    if (order.status === RestaurantOrderStatus.New) {
      return 'بانتظار بدء التحضير';
    }

    return '';
  }

  private getRemainingMinutes(order: RestaurantOrder): number | null {
    const now = this.now();
    if (!order.expectedReadyAt) {
      return null;
    }

    const expectedAt = order.expectedReadyAt instanceof Date
      ? order.expectedReadyAt.getTime()
      : new Date(order.expectedReadyAt).getTime();

    if (!Number.isFinite(expectedAt)) {
      return null;
    }

    return Math.max(0, Math.ceil((expectedAt - now) / 60_000));
  }

  setTableStatus(status: DiningTableStatus): void {
    if (!this.tableId) return;
    this.restaurantModeService.setTableStatus(this.tableId, status);
    this.loadTableData();
    this.messageService.add({
      severity: 'info',
      summary: 'تحديث الحالة',
      detail: `تم تغيير حالة الطاولة إلى "${this.getTableStatusLabel(status)}"`
    });
  }

  vacateTable(): void {
    if (!this.tableId) return;
    const success = this.restaurantModeService.vacateTable(this.tableId);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'تم الإخلاء',
        detail: `تم إخلاء الطاولة ${this.table()?.tableNumber} بنجاح وأصبحت متاحة`
      });
      this.loadTableData();
    }
  }

  quickSetCash(amount: number): void {
    this.paidAmount = amount;
    this.calculateChange();
  }

  setPrepMinutesPreset(order: RestaurantOrder, mins: number): void {
    this.prepMinutesByOrder[order.id] = mins;
    this.setOrderPreparationTime(order);
  }

  copySelfOrderLink(): void {
    if (!this.selfOrderUrl) return;
    navigator.clipboard?.writeText(this.selfOrderUrl).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'تم النسخ',
        detail: 'تم نسخ رابط الطلب الذاتي للطاولة بنجاح'
      });
    });
  }

  printBill(): void {
    window.print();
  }

  getTableStatusLabel(status?: DiningTableStatus): string {
    if (!status) return '';
    const labels: Record<DiningTableStatus, string> = {
      [DiningTableStatus.Available]: 'متاحة',
      [DiningTableStatus.Occupied]: 'مشغولة',
      [DiningTableStatus.NewOrder]: 'طلب جديد',
      [DiningTableStatus.ReadyToPay]: 'جاهزة للحساب',
      [DiningTableStatus.Cleaning]: 'قيد التنظيف'
    };
    return labels[status] || status;
  }

  getTableStatusIcon(status?: DiningTableStatus): string {
    switch (status) {
      case DiningTableStatus.Available: return 'pi pi-check-circle';
      case DiningTableStatus.Occupied: return 'pi pi-users';
      case DiningTableStatus.NewOrder: return 'pi pi-bell';
      case DiningTableStatus.ReadyToPay: return 'pi pi-wallet';
      case DiningTableStatus.Cleaning: return 'pi pi-sparkles';
      default: return 'pi pi-table';
    }
  }

  private loadTableData(): void {
    if (!this.tableId) {
      return;
    }

    this.table.set(this.restaurantModeService.getTableById(this.tableId));
    this.snapshot.set(this.restaurantModeService.getTableBillingSnapshot(this.tableId));
    this.orderTimeline.set(this.restaurantModeService.getOrdersForTable(this.tableId, true));
  }
}

