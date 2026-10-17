import { Component, DestroyRef, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import {
  DiningTable,
  DiningTableStatus,
  MenuCatalogItem,
  PlaceSelfOrderResult,
  RestaurantOrder,
  RestaurantOrderStatus
} from 'src/app/models/cashier/restaurant-mode.model';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
interface SelfOrderCartItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

@Component({
  selector: 'app-self-order',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './self-order.component.html',
  styleUrls: ['./self-order.component.scss']
})
export class SelfOrderComponent implements OnInit, OnDestroy {
  readonly orderStatus = RestaurantOrderStatus;
  readonly tableStatus = DiningTableStatus;

  table = signal<DiningTable | undefined>(undefined);
  menu = signal<MenuCatalogItem[]>([]);
  cart = signal<SelfOrderCartItem[]>([]);
  tableOrders = signal<RestaurantOrder[]>([]);
  now = signal<number>(Date.now());

  selectedCategory = signal<number | null>(null);
  showProductImages = signal<boolean>(true);
  showMobileCart = signal<boolean>(false);
  viewMode = signal<'grid' | 'list'>('grid');
  pricingMode = signal<'retail' | 'wholesale' | 'bulk' | 'purchase'>('retail');

  tableToken = '';
  searchTerm = '';
  customerName = '';
  submitting = false;
  lastOrderNo = '';
  requestingBill = false;
  private clockInterval?: ReturnType<typeof setInterval>;

  getItemQuantity(productId: number): number {
    const item = this.cart().find(i => i.productId === productId);
    return item ? item.quantity : 0;
  }

  getCategoryIcon(catName?: string): string {
    if (!catName) return '🍽️';
    const name = catName.toLowerCase();
    if (name.includes('وجب') || name.includes('برجر') || name.includes('ساندوتش') || name.includes('لحم') || name.includes('دجاج')) return '🍔';
    if (name.includes('بيتزا') || name.includes('فطير')) return '🍕';
    if (name.includes('سلط')) return '🥗';
    if (name.includes('مشروب') || name.includes('عصير') || name.includes('قهو') || name.includes('شاي')) return '🥤';
    if (name.includes('حلو') || name.includes('كيك') || name.includes('شوكولات')) return '🍰';
    if (name.includes('مقبل') || name.includes('بطاطس') || name.includes('صوص')) return '🍟';
    return '🍽️';
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

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const token = params.get('token') || '';
      this.tableToken = token;
      this.refreshTableContext();
    });

    this.restaurantModeService.menuProducts$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(products => {
      this.menu.set(products);
    });

    this.restaurantModeService.tables$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshTableContext();
    });

    this.restaurantModeService.orders$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshTableContext();
    });

    this.restaurantModeService.events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (this.table()?.id === event.tableId) {
        this.handleTableEvent(event);
      }
    });

    if (this.restaurantModeService.getMenuSnapshot().length === 0) {
      this.restaurantModeService.refreshMenuProducts();
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  switchViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  switchPricingMode(mode: 'retail' | 'wholesale' | 'bulk' | 'purchase'): void {
    this.pricingMode.set(mode);
  }

  get categories(): Array<{ id: number; name: string; count: number }> {
    const products = this.menu();
    const map = new Map<number, { id: number; name: string; count: number }>();
    for (const p of products) {
      if (p.categoryId) {
        const existing = map.get(p.categoryId);
        const name = p.categoryNameAr || p.categoryNameEn || 'تصنيف';
        if (existing) {
          existing.count += 1;
        } else {
          map.set(p.categoryId, { id: p.categoryId, name, count: 1 });
        }
      }
    }
    return Array.from(map.values());
  }

  selectCategory(catId: number | null): void {
    this.selectedCategory.set(catId);
  }

  toggleProductImages(): void {
    this.showProductImages.set(!this.showProductImages());
  }

  getProductPrice(product: MenuCatalogItem): number {
    switch (this.pricingMode()) {
      case 'wholesale':
        return Number(product.wholesalePrice || product.sellingPrice || product.retailPrice || 0);
      case 'bulk':
        return Number(product.bulkPrice || product.wholesalePrice || product.sellingPrice || product.retailPrice || 0);
      case 'purchase':
        return Number(product.costPrice || 0);
      case 'retail':
      default:
        return Number(product.retailPrice || product.sellingPrice || product.costPrice || 0);
    }
  }

  get filteredMenu(): MenuCatalogItem[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    const catId = this.selectedCategory();
    let items = this.menu();

    if (catId !== null) {
      items = items.filter(item => item.categoryId === catId);
    }

    if (!keyword) {
      return items;
    }

    return items.filter(item => {
      const index = `${item.nameAr || ''} ${item.nameEn || ''} ${item.code || ''}`.toLowerCase();
      return index.includes(keyword);
    });
  }

  get itemsCount(): number {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  get hasOpenOrders(): boolean {
    return this.tableOrders().length > 0;
  }

  get canRequestBill(): boolean {
    const orders = this.tableOrders();
    return orders.length > 0;
  }

  get isBillRequested(): boolean {
    return this.table()?.status === DiningTableStatus.ReadyToPay;
  }

  addToCart(product: MenuCatalogItem): void {
    const next = [...this.cart()];
    const existing = next.find(item => item.productId === product.id);
    const price = this.getProductPrice(product);

    if (existing) {
      existing.quantity += 1;
    } else {
      next.push({
        productId: product.id,
        name: product.nameAr || product.nameEn,
        unitPrice: price,
        quantity: 1,
        image: product.image
      });
    }

    this.cart.set(next);
  }

  increase(item: SelfOrderCartItem): void {
    item.quantity += 1;
    this.cart.set([...this.cart()]);
  }

  decrease(item: SelfOrderCartItem): void {
    if (item.quantity <= 1) {
      this.remove(item);
      return;
    }
    item.quantity -= 1;
    this.cart.set([...this.cart()]);
  }

  decreaseProduct(productId: number): void {
    const item = this.cart().find(c => c.productId === productId);
    if (item) {
      this.decrease(item);
    }
  }

  increaseProduct(productId: number, product?: MenuCatalogItem): void {
    const item = this.cart().find(c => c.productId === productId);
    if (item) {
      this.increase(item);
    } else if (product) {
      this.addToCart(product);
    }
  }

  remove(item: SelfOrderCartItem): void {
    this.cart.set(this.cart().filter(cartItem => cartItem.productId !== item.productId));
  }

  async submitOrder(): Promise<void> {
    if (!this.table()) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'رابط الطاولة غير صالح'
      });
      return;
    }

    if (this.cart().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'أضف أصنافًا قبل إرسال الطلب'
      });
      return;
    }

    this.submitting = true;
    let result: PlaceSelfOrderResult;
    try {
      result = await this.restaurantModeService.placeSelfOrder({
        tableToken: this.tableToken,
        customerName: this.customerName,
        items: this.cart().map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });
    } finally {
      this.submitting = false;
    }

    if (!result.success || !result.order) {
      this.messageService.add({
        severity: 'error',
        summary: 'تعذر الإرسال',
        detail: result.message || 'حدث خطأ أثناء إرسال الطلب'
      });
      return;
    }

    this.lastOrderNo = result.order.orderNo;
    this.cart.set([]);
    this.searchTerm = '';
    this.messageService.add({
      severity: 'success',
      summary: 'تم الإرسال',
      detail: `تم إرسال الطلب ${result.order.orderNo} إلى الكاشير`
    });
  }

  requestBill(): void {
    if (!this.table()) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'تعذر تحديد الطاولة'
      });
      return;
    }

    this.requestingBill = true;
    const result = this.restaurantModeService.requestTableBillByToken(this.tableToken);
    this.requestingBill = false;

    if (!result.success) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: result.message || 'تعذر إرسال طلب الحساب'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'تم الإرسال',
      detail: 'تم إرسال طلب الحساب إلى الكاشير'
    });
  }

  getOrderStatusLabel(status: RestaurantOrderStatus): string {
    const labels: Record<RestaurantOrderStatus, string> = {
      [RestaurantOrderStatus.New]: 'جديد',
      [RestaurantOrderStatus.Preparing]: 'قيد التحضير',
      [RestaurantOrderStatus.Ready]: 'جاهز',
      [RestaurantOrderStatus.Served]: 'تم التقديم',
      [RestaurantOrderStatus.Paid]: 'مدفوع',
      [RestaurantOrderStatus.Cancelled]: 'ملغي'
    };
    return labels[status];
  }

  getPreparationStatus(order: RestaurantOrder): string {
    if (order.status === RestaurantOrderStatus.Ready || order.status === RestaurantOrderStatus.Served) {
      return 'تم تحضير الطلب';
    }

    if (order.status === RestaurantOrderStatus.Preparing) {
      const remaining = this.getRemainingMinutes(order);
      if (remaining === null) {
        return 'قيد التحضير';
      }
      return remaining > 0 ? `متبقي تقريبًا ${remaining} دقيقة` : 'على وشك الجاهزية';
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

  private refreshTableContext(): void {
    const currentTable = this.restaurantModeService.getTableByToken(this.tableToken);
    this.table.set(currentTable);

    if (!currentTable) {
      this.tableOrders.set([]);
      return;
    }

    const openOrders = this.restaurantModeService
      .getOrdersForTable(currentTable.id, false)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    this.tableOrders.set(openOrders);
  }

  private handleTableEvent(event: any): void {
    let severity = 'info';
    let summary = 'تحديث الطلب';
    
    switch (event.type) {
      case 'ORDER_PREPARING':
        severity = 'info';
        summary = 'جاري التحضير';
        this.playCustomerSound('info');
        break;
      case 'ORDER_READY':
        severity = 'success';
        summary = 'طلبك جاهز!';
        this.playCustomerSound('success');
        break;
      case 'TABLE_STATUS_CHANGED':
        // Skip noisy status changes for customer unless important
        return;
      case 'ORDER_PAID':
        severity = 'success';
        summary = 'شكراً لزيارتك';
        this.playCustomerSound('success');
        break;
      default:
        // Ignore events not meant for customer (like NEW_ORDER or BILL_REQUEST which they initiated)
        return;
    }

    this.messageService.add({
      severity,
      summary,
      detail: event.message,
      life: 6000
    });
  }

  private playCustomerSound(type: 'info' | 'success'): void {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'success') {
        // Happy chime for order ready
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.15); // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.3); // G5
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
      } else {
        // Soft notification
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      }
    } catch { }
  }
}
