import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom, forkJoin } from 'rxjs';
import { CashierProduct } from 'src/app/models/cashier/cashier-product.model';
import { PaymentMethod } from 'src/app/models/cashier/pos-invoice.model';
import {
  CloseTableResult,
  CreateTableRequest,
  DiningArea,
  DiningTable,
  DiningTableStatus,
  MenuCatalogItem,
  OrderSource,
  PlaceSelfOrderRequest,
  PlaceSelfOrderResult,
  RequestTableBillResult,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantOrderStatus,
  TableBillingSnapshot,
  UpdateTableRequest,
  OrderType
} from 'src/app/models/cashier/restaurant-mode.model';
import { CashierService } from './cashier.service';

export interface RestaurantEvent {
  type: 'NEW_ORDER' | 'ORDER_READY' | 'BILL_REQUEST' | 'ORDER_PREPARING' | 'ORDER_PAID' | 'TABLE_STATUS_CHANGED';
  tableId: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestaurantModeService {
  private readonly imageCatalog: string[] = [
    'assets/media/cashier-products/laptop.jpg',
    'assets/media/cashier-products/mouse.jpg',
    'assets/media/cashier-products/keyboard.jpg',
    'assets/media/cashier-products/monitor.jpg',
    'assets/media/cashier-products/headphones.jpg',
    'assets/media/cashier-products/printer.jpg',
    'assets/media/cashier-products/usb.jpg',
    'assets/media/cashier-products/storage.jpg',
    'assets/media/cashier-products/accessories.jpg'
  ];

  private static readonly TABLES_STORAGE_KEY = 'erp_restaurant_tables';
  private static readonly AREAS_STORAGE_KEY = 'erp_restaurant_areas';
  private static readonly ORDERS_STORAGE_KEY = 'erp_restaurant_orders';
  private static readonly ORDERS_CHANNEL = 'erp_restaurant_orders_sync';
  private broadcastChannel: BroadcastChannel | null = null;

  private areas: DiningArea[] = this.getInitialAreas();
  private tableIdSeed = 40;
  private orderIdSeed = 1000;
  private orderNoSeed = 4000;
  private manualStatusOverrides = new Map<number, DiningTableStatus>();

  private tablesSubject = new BehaviorSubject<DiningTable[]>(this.getInitialTables());
  tables$ = this.tablesSubject.asObservable();

  private ordersSubject = new BehaviorSubject<RestaurantOrder[]>([]);
  orders$ = this.ordersSubject.asObservable();

  private menuProductsSubject = new BehaviorSubject<MenuCatalogItem[]>([]);
  menuProducts$ = this.menuProductsSubject.asObservable();

  private eventsSubject = new Subject<RestaurantEvent>();
  events$ = this.eventsSubject.asObservable();

  constructor(private cashierService: CashierService) {
    this.initCrossTabSync();
    this.loadPersistedOrders();
    this.cashierService.currentSession$.subscribe(() => this.refreshMenuProducts());
    this.refreshMenuProducts();
    this.refreshTableStats();
  }

  getAreas(): DiningArea[] {
    return [...this.areas].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ==================== Cross-Tab Sync ====================

  private initCrossTabSync(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(RestaurantModeService.ORDERS_CHANNEL);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'orders_updated') {
          const orders = this.deserializeOrders(event.data.orders);
          this.ordersSubject.next(orders);
          this.syncSeedsFromOrders(orders);
          this.refreshTableStats();
        } else if (event.data?.type === 'tables_updated' && Array.isArray(event.data.tables)) {
          this.tablesSubject.next(event.data.tables);
        } else if (event.data?.type === 'areas_updated' && Array.isArray(event.data.areas)) {
          this.areas = event.data.areas;
        } else if (event.data?.type === 'restaurant_event') {
          this.eventsSubject.next(event.data.payload);
        }
      };
    } catch {
      // BroadcastChannel not supported — fall back to storage event
      window.addEventListener('storage', (event) => {
        if (event.key === RestaurantModeService.ORDERS_STORAGE_KEY && event.newValue) {
          try {
            const orders = this.deserializeOrders(JSON.parse(event.newValue));
            this.ordersSubject.next(orders);
            this.syncSeedsFromOrders(orders);
            this.refreshTableStats();
          } catch { /* ignore parse errors */ }
        } else if (event.key === RestaurantModeService.TABLES_STORAGE_KEY && event.newValue) {
          try {
            const tables = JSON.parse(event.newValue);
            if (Array.isArray(tables)) {
              this.tablesSubject.next(tables);
            }
          } catch {}
        } else if (event.key === RestaurantModeService.AREAS_STORAGE_KEY && event.newValue) {
          try {
            const areas = JSON.parse(event.newValue);
            if (Array.isArray(areas)) {
              this.areas = areas;
            }
          } catch {}
        }
      });
    }
  }

  private loadPersistedOrders(): void {
    try {
      const raw = localStorage.getItem(RestaurantModeService.ORDERS_STORAGE_KEY);
      if (!raw) return;
      const orders = this.deserializeOrders(JSON.parse(raw));
      if (orders.length > 0) {
        this.ordersSubject.next(orders);
        this.syncSeedsFromOrders(orders);
        this.refreshTableStats();
      }
    } catch { /* ignore corrupt data */ }
  }

  /** Persist and broadcast tables to other tabs */
  private emitTables(tables: DiningTable[]): void {
    this.tablesSubject.next(tables);
    try {
      localStorage.setItem(RestaurantModeService.TABLES_STORAGE_KEY, JSON.stringify(tables));
      this.broadcastChannel?.postMessage({ type: 'tables_updated', tables });
    } catch {}
  }

  /** Persist and broadcast areas to other tabs */
  private emitAreas(areas: DiningArea[]): void {
    this.areas = areas;
    try {
      localStorage.setItem(RestaurantModeService.AREAS_STORAGE_KEY, JSON.stringify(areas));
      this.broadcastChannel?.postMessage({ type: 'areas_updated', areas });
    } catch {}
  }

  /** Persist and broadcast orders to other tabs */
  private emitOrders(orders: RestaurantOrder[]): void {
    this.ordersSubject.next(orders);
    try {
      const serialized = JSON.stringify(orders.map(o => this.serializeOrder(o)));
      localStorage.setItem(RestaurantModeService.ORDERS_STORAGE_KEY, serialized);
      this.broadcastChannel?.postMessage({ type: 'orders_updated', orders: JSON.parse(serialized) });
    } catch { /* storage full or broadcast failed — ignore */ }
  }

  private serializeOrder(order: RestaurantOrder): any {
    return {
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      preparationStartedAt: order.preparationStartedAt?.toISOString() ?? null,
      expectedReadyAt: order.expectedReadyAt?.toISOString() ?? null,
      actualReadyAt: order.actualReadyAt?.toISOString() ?? null
    };
  }

  private deserializeOrders(raw: any[]): RestaurantOrder[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(o => ({
      ...o,
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
      preparationStartedAt: o.preparationStartedAt ? new Date(o.preparationStartedAt) : undefined,
      expectedReadyAt: o.expectedReadyAt ? new Date(o.expectedReadyAt) : undefined,
      actualReadyAt: o.actualReadyAt ? new Date(o.actualReadyAt) : undefined
    }));
  }

  private syncSeedsFromOrders(orders: RestaurantOrder[]): void {
    if (orders.length === 0) return;
    const maxId = Math.max(...orders.map(o => o.id));
    const maxNo = Math.max(...orders.map(o => {
      const num = parseInt(o.orderNo.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    }));
    if (maxId >= this.orderIdSeed) this.orderIdSeed = maxId;
    if (maxNo >= this.orderNoSeed) this.orderNoSeed = maxNo;
  }

  getTablesSnapshot(): DiningTable[] {
    return [...this.tablesSubject.value];
  }

  getOrdersSnapshot(): RestaurantOrder[] {
    return [...this.ordersSubject.value];
  }

  clearAllOrders(): void {
    this.emitOrders([]);
    this.manualStatusOverrides.clear();
    this.refreshTableStats();
  }

  getMenuSnapshot(): MenuCatalogItem[] {
    const current = this.menuProductsSubject.value;
    if (current.length > 0) {
      return [...current];
    }

    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.id || !currentSession.storeDetailsId) {
      return [];
    }

    const fallback = this.decorateMenuProducts(this.getFallbackMenuProducts());
    this.menuProductsSubject.next(fallback);
    return [...fallback];
  }

  private getSessionStoreIds(session: any): string[] {
    if (!session?.id) return [];

    const idsSet = new Set<string>();
    if (session.storeDetailsId) {
      idsSet.add(session.storeDetailsId);
    }

    try {
      const stored = localStorage.getItem(`cashier_session_stores_${session.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => {
            if (id && typeof id === 'string') idsSet.add(id);
          });
        }
      }
    } catch {}

    if (Array.isArray(session.assignedStores)) {
      session.assignedStores.forEach((s: any) => {
        const id = typeof s === 'string' ? s : s?.id || s?.storeDetailsId;
        if (id) idsSet.add(id);
      });
    }

    return Array.from(idsSet);
  }

  refreshMenuProducts(searchTerm: string = ''): void {
    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.id) {
      this.menuProductsSubject.next([]);
      return;
    }

    const storeIds = this.getSessionStoreIds(currentSession);
    if (storeIds.length === 0) {
      this.menuProductsSubject.next([]);
      return;
    }

    const requests = storeIds.map(storeId =>
      this.cashierService.searchProducts({
        searchTerm,
        pageSize: 300,
        inStock: true,
        cashierSessionId: currentSession.id,
        storeDetailsId: storeId
      })
    );

    forkJoin(requests).subscribe({
      next: (results: CashierProduct[][]) => {
        const mergedMap = new Map<string | number, CashierProduct>();

        results.forEach((productList) => {
          (productList || []).forEach((prod: any) => {
            const key = prod.batchNo 
              ? `${prod.id || prod.code}_${prod.batchNo}`
              : (prod.id || prod.code || prod.itemCode || prod.barcode);
            if (!key) return;

            const isGuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
            
            let itemCode = prod.itemCode || prod.productCode || prod.referenceCode || prod.itemNumber || prod.code;
            if (itemCode && isGuid(itemCode)) {
              itemCode = prod.barcode || prod.itemBarcode || '';
            } else if (!itemCode && prod.barcode) {
              itemCode = prod.barcode;
            }

            const normalizedProd: CashierProduct = {
              ...prod,
              code: itemCode || ''
            };

            if (mergedMap.has(key)) {
              const existing = mergedMap.get(key)!;
              existing.availableQuantity = (existing.availableQuantity || 0) + (prod.availableQuantity || 0);
            } else {
              mergedMap.set(key, normalizedProd);
            }
          });
        });

        const mergedProducts = Array.from(mergedMap.values());
        const source = mergedProducts.length > 0
          ? (mergedProducts as MenuCatalogItem[])
          : this.getFallbackMenuProducts();
        this.menuProductsSubject.next(this.decorateMenuProducts(source));
      },
      error: () => {
        this.menuProductsSubject.next(this.decorateMenuProducts(this.getFallbackMenuProducts()));
      }
    });
  }

  getTableById(tableId: number): DiningTable | undefined {
    return this.tablesSubject.value.find(table => table.id === tableId);
  }

  getTableByToken(tableToken: string): DiningTable | undefined {
    if (!tableToken) return undefined;
    const normalized = (tableToken || '').trim().toLowerCase();

    // 1. Direct match with table.token
    let match = this.tablesSubject.value.find(table => table.token && table.token.toLowerCase() === normalized);
    if (match) return match;

    // 2. Direct match with table.id
    match = this.tablesSubject.value.find(table => String(table.id) === normalized);
    if (match) return match;

    // 3. Direct match with tableNumber
    match = this.tablesSubject.value.find(table => table.tableNumber.toLowerCase() === normalized);
    if (match) return match;

    // 4. Match prefix or numbers like 'table-2' or 'table-2-X'
    const idMatches = normalized.match(/\d+/g);
    if (idMatches && idMatches.length > 0) {
      const extractedId = Number(idMatches[0]);
      match = this.tablesSubject.value.find(table => table.id === extractedId || table.tableNumber === String(extractedId));
      if (match) return match;
    }

    return undefined;
  }

  createTable(payload: CreateTableRequest): DiningTable {
    const area = this.resolveArea(payload.areaId);
    const areaTables = this.tablesSubject.value.filter(table => table.areaId === area.id);
    const nextSort = areaTables.reduce((max, table) => Math.max(max, table.sortOrder), 0) + 1;

    const table: DiningTable = {
      id: ++this.tableIdSeed,
      tableNumber: this.normalizeTableNumber(payload.tableNumber, this.tableIdSeed),
      seats: Math.max(1, payload.seats || 1),
      areaId: area.id,
      areaName: area.name,
      token: this.buildTableToken(payload.tableNumber || String(this.tableIdSeed), this.tableIdSeed),
      sortOrder: nextSort,
      status: DiningTableStatus.Available,
      activeOrders: 0,
      unpaidTotal: 0,
      notes: payload.notes?.trim() || undefined
    };

    this.emitTables([...this.tablesSubject.value, table]);
    this.refreshTableStats();
    return table;
  }

  updateTable(tableId: number, changes: UpdateTableRequest): DiningTable | undefined {
    let updatedTable: DiningTable | undefined;

    const nextTables = this.tablesSubject.value.map(table => {
      if (table.id !== tableId) {
        return table;
      }

      const area = this.resolveArea(changes.areaId || table.areaId);
      updatedTable = {
        ...table,
        tableNumber: changes.tableNumber
          ? this.normalizeTableNumber(changes.tableNumber, table.id)
          : table.tableNumber,
        seats: changes.seats ? Math.max(1, changes.seats) : table.seats,
        areaId: area.id,
        areaName: area.name,
        notes: changes.notes !== undefined ? (changes.notes?.trim() || undefined) : table.notes
      };

      return updatedTable;
    });

    this.emitTables(nextTables);
    this.rebalanceAreaSortOrder();
    this.refreshTableStats();
    return updatedTable;
  }

  deleteTable(tableId: number): boolean {
    const current = this.tablesSubject.value;
    const exists = current.some(t => t.id === tableId);
    if (!exists) return false;

    const filtered = current.filter(t => t.id !== tableId);
    this.manualStatusOverrides.delete(tableId);
    this.emitTables(this.sortTables(filtered));
    this.rebalanceAreaSortOrder();
    this.refreshTableStats();
    return true;
  }

  moveTable(tableId: number, direction: -1 | 1): boolean {
    const currentTables = [...this.tablesSubject.value];
    const table = currentTables.find(item => item.id === tableId);
    if (!table) {
      return false;
    }

    const siblings = currentTables
      .filter(item => item.areaId === table.areaId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndex = siblings.findIndex(item => item.id === tableId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return false;
    }

    const currentSort = siblings[currentIndex].sortOrder;
    siblings[currentIndex].sortOrder = siblings[targetIndex].sortOrder;
    siblings[targetIndex].sortOrder = currentSort;

    const siblingMap = new Map<number, DiningTable>(siblings.map(item => [item.id, item]));
    const merged = currentTables.map(item => siblingMap.get(item.id) || item);

    this.emitTables(merged);
    this.rebalanceAreaSortOrder();
    this.refreshTableStats();
    return true;
  }

  setTableStatus(tableId: number, status: DiningTableStatus): void {
    if (status === DiningTableStatus.Cleaning || status === DiningTableStatus.ReadyToPay) {
      this.manualStatusOverrides.set(tableId, status);
    } else {
      this.manualStatusOverrides.delete(tableId);
    }

    const nextTables = this.tablesSubject.value.map(table =>
      table.id === tableId
        ? {
            ...table,
            status,
            lastActivityAt: new Date()
          }
        : table
    );

    this.emitTables(nextTables);
    this.refreshTableStats();

    const tableStr = this.getTableById(tableId)?.tableNumber || tableId.toString();
    const eventPayload: RestaurantEvent = { 
      type: 'TABLE_STATUS_CHANGED', 
      tableId: tableId, 
      message: `تغيرت حالة الطاولة ${tableStr}` 
    };
    this.eventsSubject.next(eventPayload);
    try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}
  }

  getOrdersForTable(tableId: number, includeClosed: boolean = false): RestaurantOrder[] {
    const orders = this.ordersSubject.value.filter(order => {
      if (order.tableId !== tableId) {
        return false;
      }

      if (includeClosed) {
        return true;
      }

      return order.status !== RestaurantOrderStatus.Paid && order.status !== RestaurantOrderStatus.Cancelled;
    });

    return [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getLiveOrders(): RestaurantOrder[] {
    const liveStatuses = new Set<RestaurantOrderStatus>([
      RestaurantOrderStatus.New,
      RestaurantOrderStatus.Preparing,
      RestaurantOrderStatus.Ready,
      RestaurantOrderStatus.Served
    ]);

    return this.ordersSubject.value
      .filter(order => liveStatuses.has(order.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async placeSelfOrder(payload: PlaceSelfOrderRequest): Promise<PlaceSelfOrderResult> {
    const table = this.getTableByToken(payload.tableToken);
    if (!table) {
      return {
        success: false,
        message: 'لم يتم العثور على الطاولة'
      };
    }

    const orderItems = this.buildOrderItems(payload.items);
    if (orderItems.length === 0) {
      return {
        success: false,
        message: 'لا توجد أصناف صالحة لإرسال الطلب'
      };
    }

    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const now = new Date();

    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.id || !currentSession.storeDetailsId) {
      return {
        success: false,
        message: 'Please open a cashier session before submitting the order'
      };
    }

    let invoiceId: number;
    try {
      const invoicePayload = this.buildInvoicePayloadForOrder(
        currentSession.id,
        currentSession.storeDetailsId,
        payload.customerName?.trim() || undefined,
        orderItems,
        subtotal,
        taxAmount,
        totalAmount
      );

      const invoice = await firstValueFrom(this.cashierService.createInvoice(invoicePayload as any));
      invoiceId = Number((invoice as any)?.id);
      if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
        return {
          success: false,
          message: 'Unable to persist order invoice'
        };
      }
    } catch {
      return {
        success: false,
        message: 'Unable to persist order invoice'
      };
    }

    const order: RestaurantOrder = {
      id: ++this.orderIdSeed,
      invoiceId,
      orderNo: this.generateOrderNo(),
      tableId: table.id,
      tableNumber: table.tableNumber,
      customerName: payload.customerName?.trim() || undefined,
      source: OrderSource.SelfService,
      status: RestaurantOrderStatus.New,
      createdAt: now,
      updatedAt: now,
      items: orderItems,
      subtotal,
      taxAmount,
      totalAmount,
      notes: payload.notes?.trim() || undefined
    };

    this.emitOrders([...this.ordersSubject.value, order]);
    this.manualStatusOverrides.delete(table.id);
    this.refreshTableStats();

    const eventPayload: RestaurantEvent = { type: 'NEW_ORDER', tableId: table.id, message: `طلب جديد من الطاولة ${table.tableNumber}` };
    this.eventsSubject.next(eventPayload);
    try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}

    return {
      success: true,
      order
    };
  }

  createPosOrder(
    invoiceId: number,
    orderType: OrderType,
    customerName: string | undefined,
    items: RestaurantOrderItem[],
    subtotal: number,
    taxAmount: number,
    totalAmount: number
  ): RestaurantOrder {
    const now = new Date();
    
    const order: RestaurantOrder = {
      id: ++this.orderIdSeed,
      invoiceId,
      orderNo: this.generateOrderNo(),
      tableId: null,
      tableNumber: orderType === OrderType.Takeaway ? 'تيك أواي' : (orderType === OrderType.Delivery ? 'توصيل' : 'محلي'),
      customerName: customerName?.trim() || undefined,
      source: OrderSource.Cashier,
      orderType: orderType,
      status: RestaurantOrderStatus.New,
      createdAt: now,
      updatedAt: now,
      items,
      subtotal,
      taxAmount,
      totalAmount
    };

    this.emitOrders([...this.ordersSubject.value, order]);

    const eventPayload: RestaurantEvent = { 
      type: 'NEW_ORDER', 
      tableId: -1, 
      message: `طلب ${order.tableNumber} جديد من الكاشير` 
    };
    this.eventsSubject.next(eventPayload);
    try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}

    return order;
  }

  updateOrderStatus(orderId: number, status: RestaurantOrderStatus): RestaurantOrder | undefined {
    let updated: RestaurantOrder | undefined;

    const nextOrders = this.ordersSubject.value.map(order => {
      if (order.id !== orderId) {
        return order;
      }

      const now = new Date();
      const nextExpectedReadyAt = status === RestaurantOrderStatus.Preparing
        ? (order.expectedReadyAt || new Date(now.getTime() + this.normalizePreparationMinutes(order.preparationMinutes) * 60_000))
        : order.expectedReadyAt;

      updated = {
        ...order,
        status,
        updatedAt: now,
        preparationMinutes: status === RestaurantOrderStatus.Preparing
          ? this.normalizePreparationMinutes(order.preparationMinutes)
          : order.preparationMinutes,
        preparationStartedAt: status === RestaurantOrderStatus.Preparing
          ? (order.preparationStartedAt || now)
          : order.preparationStartedAt,
        expectedReadyAt: nextExpectedReadyAt,
        actualReadyAt: status === RestaurantOrderStatus.Ready ? now : order.actualReadyAt
      };

      if (status === RestaurantOrderStatus.Ready && order.status !== RestaurantOrderStatus.Ready) {
        const eventPayload: RestaurantEvent = { type: 'ORDER_READY', tableId: order.tableId, message: `طلب الطاولة ${order.tableNumber} جاهز للتقديم` };
        this.eventsSubject.next(eventPayload);
        try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}
      } else if (status === RestaurantOrderStatus.Preparing && order.status !== RestaurantOrderStatus.Preparing) {
        const eventPayload: RestaurantEvent = { type: 'ORDER_PREPARING', tableId: order.tableId, message: `المطبخ بدأ تحضير طلب الطاولة ${order.tableNumber}` };
        this.eventsSubject.next(eventPayload);
        try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}
      }

      return updated;
    });

    this.emitOrders(nextOrders);
    if (updated) {
      this.refreshTableStats();
    }
    return updated;
  }

  setOrderPreparationTime(orderId: number, minutes: number): RestaurantOrder | undefined {
    const normalizedMinutes = this.normalizePreparationMinutes(minutes);
    let updated: RestaurantOrder | undefined;
    const now = new Date();

    const nextOrders = this.ordersSubject.value.map(order => {
      if (order.id !== orderId) {
        return order;
      }

      if (order.status === RestaurantOrderStatus.Paid || order.status === RestaurantOrderStatus.Cancelled) {
        return order;
      }

      updated = {
        ...order,
        status: order.status === RestaurantOrderStatus.New ? RestaurantOrderStatus.Preparing : order.status,
        preparationMinutes: normalizedMinutes,
        preparationStartedAt: now,
        expectedReadyAt: new Date(now.getTime() + normalizedMinutes * 60_000),
        updatedAt: now
      };
      return updated;
    });

    this.emitOrders(nextOrders);
    if (updated) {
      this.refreshTableStats();
    }
    return updated;
  }

  /**
   * Process payment for a single order through the backend.
   * This ensures the exit permit is created and stock is deducted.
   */
  async payOrder(
    orderId: number,
    paymentMethod: PaymentMethod = PaymentMethod.Cash,
    paidAmount?: number
  ): Promise<{ success: boolean; message?: string }> {
    const order = this.ordersSubject.value.find(o => o.id === orderId);
    if (!order) {
      return { success: false, message: 'الطلب غير موجود' };
    }

    if (order.status === RestaurantOrderStatus.Paid) {
      return { success: false, message: 'الطلب مدفوع بالفعل' };
    }

    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.id || !currentSession.storeDetailsId) {
      return { success: false, message: 'يجب فتح جلسة كاشير أولاً' };
    }

    // Ensure order has a backend invoice
    const invoiceId = await this.ensureOrderInvoice(order, currentSession.id, currentSession.storeDetailsId);
    if (!invoiceId) {
      return { success: false, message: 'تعذر إنشاء الفاتورة' };
    }

    // Process payment through backend (triggers exit permit + stock deduction)
    const paymentPayload = this.buildPaymentPayloadForOrder(
      invoiceId,
      order.totalAmount,
      paymentMethod,
      Math.max(0, Number(paidAmount) || order.totalAmount)
    );

    try {
      await firstValueFrom(this.cashierService.processPayment(paymentPayload as any));
    } catch {
      return { success: false, message: 'فشل عملية الدفع' };
    }

    // Update order status to Paid
    const now = new Date();
    const nextOrders = this.ordersSubject.value.map(o =>
      o.id === orderId
        ? { ...o, status: RestaurantOrderStatus.Paid, updatedAt: now }
        : o
    );
    this.emitOrders(nextOrders);
    this.refreshTableStats();

    return { success: true };
  }

  requestTableBillByToken(tableToken: string): RequestTableBillResult {
    const table = this.getTableByToken(tableToken);
    if (!table) {
      return {
        success: false,
        message: 'الطاولة غير موجودة'
      };
    }

    const openOrders = this.getOrdersForTable(table.id, false);
    if (openOrders.length === 0) {
      return {
        success: false,
        table,
        message: 'لا توجد طلبات مفتوحة لهذه الطاولة'
      };
    }

    const readyToPay = openOrders.every(order =>
      order.status === RestaurantOrderStatus.Ready ||
      order.status === RestaurantOrderStatus.Served
    );

    if (!readyToPay) {
      return {
        success: false,
        table,
        message: 'لا يمكن طلب الحساب قبل انتهاء التحضير'
      };
    }

    this.manualStatusOverrides.set(table.id, DiningTableStatus.ReadyToPay);
    this.refreshTableStats();

    const eventPayload: RestaurantEvent = { type: 'BILL_REQUEST', tableId: table.id, message: `العميل على الطاولة ${table.tableNumber} يطلب الحساب` };
    this.eventsSubject.next(eventPayload);
    try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}

    return {
      success: true,
      table: this.getTableById(table.id)
    };
  }

  getTableBillingSnapshot(tableId: number): TableBillingSnapshot | undefined {
    const table = this.getTableById(tableId);
    if (!table) {
      return undefined;
    }

    const openOrders = this.getOrdersForTable(tableId, false);
    const mergedItems = new Map<string, RestaurantOrderItem>();

    for (const order of openOrders) {
      for (const item of order.items) {
        const key = `${item.itemId}-${item.unitPrice}`;
        const existing = mergedItems.get(key);

        if (!existing) {
          mergedItems.set(key, { ...item });
          continue;
        }

        existing.quantity += item.quantity;
        existing.taxAmount += item.taxAmount;
        existing.totalAmount += item.totalAmount;
      }
    }

    const items = Array.from(mergedItems.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      table,
      orders: openOrders,
      items,
      subtotal,
      taxAmount,
      totalAmount
    };
  }

  async closeTable(tableId: number, paymentMethod: PaymentMethod, paidAmount?: number): Promise<CloseTableResult | undefined> {
    const snapshot = this.getTableBillingSnapshot(tableId);
    if (!snapshot) {
      return undefined;
    }

    const currentSession = this.cashierService.getCurrentSessionSnapshot();
    if (!currentSession?.id || !currentSession.storeDetailsId) {
      return undefined;
    }

    let remainingCash = Math.max(0, Number(paidAmount) || 0);
    const openOrders = this.getOrdersForTable(tableId, false);

    for (const order of openOrders) {
      const invoiceId = await this.ensureOrderInvoice(order, currentSession.id, currentSession.storeDetailsId);
      if (!invoiceId) {
        return undefined;
      }

      const paymentPayload = this.buildPaymentPayloadForOrder(
        invoiceId,
        order.totalAmount,
        paymentMethod,
        remainingCash
      );

      try {
        await firstValueFrom(this.cashierService.processPayment(paymentPayload as any));
      } catch {
        return undefined;
      }

      if (paymentMethod === PaymentMethod.Cash || paymentMethod === PaymentMethod.Mixed) {
        remainingCash = Math.max(0, remainingCash - Number((paymentPayload as any).cashAmount || 0));
      }
    }

    const paidAt = new Date();
    const nextOrders = this.ordersSubject.value.map(order => {
      if (order.tableId !== tableId) {
        return order;
      }

      if (order.status === RestaurantOrderStatus.Paid || order.status === RestaurantOrderStatus.Cancelled) {
        return order;
      }

      return {
        ...order,
        status: RestaurantOrderStatus.Paid,
        updatedAt: paidAt
      };
    });

    this.emitOrders(nextOrders);
    this.manualStatusOverrides.delete(tableId);

    const nextTables = this.tablesSubject.value.map(table =>
      table.id === tableId
        ? {
            ...table,
            status: DiningTableStatus.Available,
            activeOrders: 0,
            unpaidTotal: 0,
            lastActivityAt: paidAt
          }
        : table
    );

    this.tablesSubject.next(nextTables);
    this.refreshTableStats();

    const tableStr = this.getTableById(tableId)?.tableNumber || tableId.toString();
    const eventPayload: RestaurantEvent = { type: 'ORDER_PAID', tableId: tableId, message: `تم دفع فاتورة الطاولة ${tableStr} بنجاح` };
    this.eventsSubject.next(eventPayload);
    try { this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload }); } catch {}

    return {
      snapshot,
      paymentMethod,
      paidAt
    };
  }

  vacateTable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    if (!table) {
      return false;
    }

    const now = new Date();
    const nextOrders = this.ordersSubject.value.map(order => {
      if (order.tableId !== tableId) {
        return order;
      }
      if (order.status === RestaurantOrderStatus.Paid || order.status === RestaurantOrderStatus.Cancelled) {
        return order;
      }
      return {
        ...order,
        status: RestaurantOrderStatus.Paid,
        updatedAt: now
      };
    });

    this.emitOrders(nextOrders);
    this.manualStatusOverrides.delete(tableId);

    const nextTables = this.tablesSubject.value.map(t =>
      t.id === tableId
        ? {
            ...t,
            status: DiningTableStatus.Available,
            activeOrders: 0,
            unpaidTotal: 0,
            lastActivityAt: now
          }
        : t
    );

    this.emitTables(nextTables);
    this.refreshTableStats();

    const eventPayload: RestaurantEvent = {
      type: 'TABLE_STATUS_CHANGED',
      tableId,
      message: `تم إخلاء الطاولة ${table.tableNumber} وأصبحت متاحة`
    };
    this.eventsSubject.next(eventPayload);
    try {
      this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload });
    } catch {}

    return true;
  }

  createCashierDineInOrder(
    invoiceId: number,
    tableId: number,
    items: Array<{
      itemId: number;
      itemCode?: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      taxPercentage?: number;
      notes?: string;
    }>,
    customerName?: string
  ): RestaurantOrder | undefined {
    const table = this.getTableById(tableId);
    if (!table) {
      return undefined;
    }

    const orderItems: RestaurantOrderItem[] = items.map(it => {
      const taxPct = Number(it.taxPercentage) || 15;
      const subtotal = it.unitPrice * it.quantity;
      const taxAmount = (subtotal * taxPct) / 100;
      return {
        itemId: it.itemId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxPercentage: taxPct,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        notes: it.notes
      };
    });

    const subtotal = orderItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const taxAmount = orderItems.reduce((s, it) => s + it.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;
    const now = new Date();

    const newOrder: RestaurantOrder = {
      id: ++this.orderIdSeed,
      invoiceId,
      orderNo: this.generateOrderNo(),
      tableId: table.id,
      tableNumber: table.tableNumber,
      customerName: customerName || 'عميل محلي',
      source: OrderSource.Cashier,
      orderType: OrderType.DineIn,
      status: RestaurantOrderStatus.New,
      createdAt: now,
      updatedAt: now,
      items: orderItems,
      subtotal,
      taxAmount,
      totalAmount
    };

    const nextOrders = [newOrder, ...this.ordersSubject.value];
    this.emitOrders(nextOrders);

    const nextTables = this.tablesSubject.value.map(t =>
      t.id === tableId
        ? {
            ...t,
            status: DiningTableStatus.Occupied,
            activeOrders: (t.activeOrders || 0) + 1,
            unpaidTotal: 0, // Since invoice is already paid at cashier
            lastActivityAt: now
          }
        : t
    );

    this.emitTables(nextTables);
    this.refreshTableStats();

    const eventPayload: RestaurantEvent = {
      type: 'NEW_ORDER',
      tableId: table.id,
      message: `طلب محلي جديد للطاولة ${table.tableNumber} برقم ${newOrder.orderNo}`
    };
    this.eventsSubject.next(eventPayload);
    try {
      this.broadcastChannel?.postMessage({ type: 'restaurant_event', payload: eventPayload });
    } catch {}

    return newOrder;
  }

  async createDemoSelfOrder(tableId?: number): Promise<PlaceSelfOrderResult> {
    const table = tableId
      ? this.getTableById(tableId)
      : this.tablesSubject.value.find(item => item.status === DiningTableStatus.Available) || this.tablesSubject.value[0];

    if (!table) {
      return {
        success: false,
        message: 'لا توجد طاولات متاحة'
      };
    }

    const menu = this.getMenuSnapshot();
    if (menu.length === 0) {
      return {
        success: false,
        message: 'لا توجد أصناف متاحة'
      };
    }

    const first = menu[table.id % menu.length];
    const second = menu[(table.id + 2) % menu.length];

    return this.placeSelfOrder({
      tableToken: table.token,
      customerName: 'طلب تجريبي',
      items: [
        { productId: first.id, quantity: 1 },
        { productId: second.id, quantity: 2 }
      ]
    });
  }

  private buildInvoicePayloadForOrder(
    sessionId: number,
    storeDetailsId: string,
    customerName: string | undefined,
    orderItems: RestaurantOrderItem[],
    subtotal: number,
    taxAmount: number,
    totalAmount: number
  ): Record<string, unknown> {
    const taxableBase = Math.max(0, subtotal);
    const taxPercentage = taxableBase > 0 ? (taxAmount / taxableBase) * 100 : 0;

    return {
      invoiceDate: new Date(),
      cashierSessionId: sessionId,
      storeDetailsId,
      customerName: customerName || 'Walk-in Customer',
      items: orderItems.map(item => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: item.taxPercentage,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount
      })),
      subtotal,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage,
      taxAmount,
      totalAmount,
      paymentMethod: PaymentMethod.Credit,
      paidAmount: 0,
      changeAmount: 0
    };
  }

  private async ensureOrderInvoice(order: RestaurantOrder, sessionId: number, storeDetailsId: string): Promise<number | null> {
    if (Number.isFinite(order.invoiceId) && (order.invoiceId as number) > 0) {
      return Number(order.invoiceId);
    }

    try {
      const invoicePayload = this.buildInvoicePayloadForOrder(
        sessionId,
        storeDetailsId,
        order.customerName,
        order.items,
        order.subtotal,
        order.taxAmount,
        order.totalAmount
      );

      const invoice = await firstValueFrom(this.cashierService.createInvoice(invoicePayload as any));
      const invoiceId = Number((invoice as any)?.id);
      if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
        return null;
      }

      const updatedOrders = this.ordersSubject.value.map(item =>
        item.id === order.id ? { ...item, invoiceId } : item
      );
      this.emitOrders(updatedOrders);
      return invoiceId;
    } catch {
      return null;
    }
  }

  private buildPaymentPayloadForOrder(
    invoiceId: number,
    totalAmount: number,
    paymentMethod: PaymentMethod,
    preferredCashAmount: number
  ): Record<string, unknown> {
    const total = Math.max(0, Number(totalAmount) || 0);
    const payload: Record<string, unknown> = {
      invoiceId,
      totalAmount: total,
      paymentMethod
    };

    if (paymentMethod === PaymentMethod.Cash) {
      payload['cashAmount'] = total;
      return payload;
    }

    if (paymentMethod === PaymentMethod.Card || paymentMethod === PaymentMethod.BankTransfer) {
      payload['cardAmount'] = total;
      return payload;
    }

    if (paymentMethod === PaymentMethod.Credit) {
      payload['creditDays'] = 30;
      return payload;
    }

    let mixedCash = Math.max(0, Math.min(preferredCashAmount, total));
    if (mixedCash <= 0) {
      mixedCash = total;
    }
    const mixedCard = Math.max(0, total - mixedCash);
    payload['cashAmount'] = mixedCash;
    payload['cardAmount'] = mixedCard;
    return payload;
  }

  private refreshTableStats(): void {
    const nextTables = this.tablesSubject.value.map(table => {
      const openOrders = this.ordersSubject.value.filter(order =>
        order.tableId === table.id &&
        order.status !== RestaurantOrderStatus.Paid &&
        order.status !== RestaurantOrderStatus.Cancelled
      );

      const unpaidTotal = openOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const status = this.resolveTableStatus(table, openOrders);
      const latestActivity = openOrders.reduce<Date | undefined>((latest, order) => {
        if (!latest) {
          return order.updatedAt;
        }
        return latest.getTime() > order.updatedAt.getTime() ? latest : order.updatedAt;
      }, table.lastActivityAt);

      return {
        ...table,
        activeOrders: openOrders.length,
        unpaidTotal,
        status,
        lastActivityAt: latestActivity
      };
    });

    this.emitTables(this.sortTables(nextTables));
  }

  private resolveTableStatus(table: DiningTable, openOrders: RestaurantOrder[]): DiningTableStatus {
    const manual = this.manualStatusOverrides.get(table.id);

    if (openOrders.length === 0) {
      if (manual === DiningTableStatus.Cleaning) {
        return DiningTableStatus.Cleaning;
      }
      return DiningTableStatus.Available;
    }

    if (manual === DiningTableStatus.ReadyToPay) {
      return DiningTableStatus.ReadyToPay;
    }

    const statuses = openOrders.map(order => order.status);
    if (statuses.some(status => status === RestaurantOrderStatus.New)) {
      return DiningTableStatus.NewOrder;
    }

    if (statuses.every(status => status === RestaurantOrderStatus.Ready || status === RestaurantOrderStatus.Served)) {
      return DiningTableStatus.ReadyToPay;
    }

    return DiningTableStatus.Occupied;
  }

  private buildOrderItems(items: PlaceSelfOrderRequest['items']): RestaurantOrderItem[] {
    const menuMap = new Map<number, MenuCatalogItem>(
      this.getMenuSnapshot().map(item => [item.id, item])
    );

    const result: RestaurantOrderItem[] = [];
    for (const input of items) {
      const quantity = Number(input.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      const product = menuMap.get(input.productId);
      if (!product) {
        continue;
      }

      const unitPrice = (Number(input.unitPrice) > 0)
        ? Number(input.unitPrice)
        : Number(product.sellingPrice || product.retailPrice || product.costPrice || 0);
      const taxPercentage = Number(product.taxPercentage) || 15;
      const subtotal = unitPrice * quantity;
      const taxAmount = (subtotal * taxPercentage) / 100;
      const totalAmount = subtotal + taxAmount;

      result.push({
        itemId: product.id,
        itemCode: product.code,
        itemName: product.nameAr || product.nameEn,
        quantity,
        unitPrice,
        taxPercentage,
        taxAmount,
        totalAmount,
        image: product.image,
        notes: input.notes?.trim() || undefined
      });
    }

    return result;
  }

  private normalizePreparationMinutes(minutes?: number): number {
    const numeric = Number(minutes);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 15;
    }

    return Math.min(180, Math.max(1, Math.round(numeric)));
  }

  private rebalanceAreaSortOrder(): void {
    const groupedByArea = new Map<string, DiningTable[]>();
    for (const table of this.tablesSubject.value) {
      const list = groupedByArea.get(table.areaId) || [];
      list.push(table);
      groupedByArea.set(table.areaId, list);
    }

    const normalized: DiningTable[] = [];
    groupedByArea.forEach(list => {
      const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
      sorted.forEach((table, index) => {
        normalized.push({
          ...table,
          sortOrder: index + 1
        });
      });
    });

    this.emitTables(this.sortTables(normalized));
  }

  private sortTables(tables: DiningTable[]): DiningTable[] {
    return [...tables].sort((a, b) => {
      const areaA = this.resolveArea(a.areaId);
      const areaB = this.resolveArea(b.areaId);

      if (areaA.sortOrder !== areaB.sortOrder) {
        return areaA.sortOrder - areaB.sortOrder;
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return this.parseTableNumber(a.tableNumber) - this.parseTableNumber(b.tableNumber);
    });
  }

  private parseTableNumber(value: string): number {
    const parsed = Number(String(value).replace(/\D/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.MAX_SAFE_INTEGER;
  }

  private normalizeTableNumber(value: string, fallbackId: number): string {
    const trimmed = (value || '').trim();
    return trimmed || String(fallbackId);
  }

  private resolveArea(areaId: string): DiningArea {
    return this.areas.find(area => area.id === areaId) || this.areas[0];
  }

  private generateOrderNo(): string {
    this.orderNoSeed += 1;
    return `ORD-${this.orderNoSeed}`;
  }

  private buildTableToken(tableNumber: string, fallbackId: number): string {
    const normalized = (tableNumber || String(fallbackId))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `table-${normalized || fallbackId}-${fallbackId}`;
  }

  private decorateMenuProducts(products: MenuCatalogItem[]): MenuCatalogItem[] {
    return products.map((product) => ({
      ...product,
      image: product.image || undefined,
      taxPercentage: Number(product.taxPercentage) || 15,
      sellingPrice: Number(product.sellingPrice || product.retailPrice || product.costPrice) || 0,
      retailPrice: Number(product.retailPrice || product.sellingPrice) || 0,
      wholesalePrice: Number(product.wholesalePrice || product.sellingPrice) || 0,
      bulkPrice: Number(product.bulkPrice || product.wholesalePrice || product.sellingPrice) || 0,
      costPrice: Number(product.costPrice) || 0
    }));
  }

  private getInitialAreas(): DiningArea[] {
    try {
      const raw = localStorage.getItem(RestaurantModeService.AREAS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return [
      { id: 'main', name: 'الصالة الرئيسية', color: '#1174cf', sortOrder: 1 },
      { id: 'family', name: 'قسم العائلات', color: '#0c9d74', sortOrder: 2 },
      { id: 'terrace', name: 'التراس', color: '#f39237', sortOrder: 3 }
    ];
  }

  private getInitialTables(): DiningTable[] {
    try {
      const raw = localStorage.getItem(RestaurantModeService.TABLES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const maxId = parsed.reduce((max: number, t: any) => Math.max(max, Number(t.id) || 0), 0);
          if (maxId > 0) {
            this.tableIdSeed = Math.max(this.tableIdSeed, maxId);
          }
          return parsed.map((t: any) => ({
            ...t,
            lastActivityAt: t.lastActivityAt ? new Date(t.lastActivityAt) : undefined
          }));
        }
      }
    } catch {}

    const definitions = [
      { tableNumber: '1', seats: 2, areaId: 'main', sortOrder: 1 },
      { tableNumber: '2', seats: 2, areaId: 'main', sortOrder: 2 },
      { tableNumber: '3', seats: 4, areaId: 'main', sortOrder: 3 },
      { tableNumber: '4', seats: 4, areaId: 'main', sortOrder: 4 },
      { tableNumber: '5', seats: 6, areaId: 'main', sortOrder: 5 },
      { tableNumber: '6', seats: 4, areaId: 'main', sortOrder: 6 },
      { tableNumber: '7', seats: 2, areaId: 'main', sortOrder: 7 },
      { tableNumber: '8', seats: 2, areaId: 'main', sortOrder: 8 },
      { tableNumber: '9', seats: 4, areaId: 'family', sortOrder: 1 },
      { tableNumber: '10', seats: 6, areaId: 'family', sortOrder: 2 },
      { tableNumber: '11', seats: 6, areaId: 'family', sortOrder: 3 },
      { tableNumber: '12', seats: 4, areaId: 'family', sortOrder: 4 },
      { tableNumber: '13', seats: 2, areaId: 'terrace', sortOrder: 1 },
      { tableNumber: '14', seats: 2, areaId: 'terrace', sortOrder: 2 },
      { tableNumber: '15', seats: 4, areaId: 'terrace', sortOrder: 3 },
      { tableNumber: '16', seats: 4, areaId: 'terrace', sortOrder: 4 }
    ];

    return definitions.map((definition, index) => {
      const id = index + 1;
      const area = this.resolveArea(definition.areaId);

      return {
        id,
        tableNumber: definition.tableNumber,
        seats: definition.seats,
        areaId: definition.areaId,
        areaName: area.name,
        token: this.buildTableToken(definition.tableNumber, id),
        sortOrder: definition.sortOrder,
        status: DiningTableStatus.Available,
        activeOrders: 0,
        unpaidTotal: 0
      };
    });
  }

  private getFallbackMenuProducts(): MenuCatalogItem[] {
    return [
      {
        id: 1001,
        code: 'REST-001',
        barcode: 'REST001',
        nameAr: 'برجر لحم',
        nameEn: 'Beef Burger',
        sellingPrice: 39,
        costPrice: 18,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'وجبات رئيسية',
        isActive: true,
        unitName: 'طبق'
      },
      {
        id: 1002,
        code: 'REST-002',
        barcode: 'REST002',
        nameAr: 'بيتزا مارجريتا',
        nameEn: 'Margherita Pizza',
        sellingPrice: 44,
        costPrice: 20,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'وجبات رئيسية',
        isActive: true,
        unitName: 'طبق'
      },
      {
        id: 1003,
        code: 'REST-003',
        barcode: 'REST003',
        nameAr: 'سلطة سيزر',
        nameEn: 'Caesar Salad',
        sellingPrice: 26,
        costPrice: 10,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'سلطات',
        isActive: true,
        unitName: 'طبق'
      },
      {
        id: 1004,
        code: 'REST-004',
        barcode: 'REST004',
        nameAr: 'قهوة أمريكية',
        nameEn: 'Americano',
        sellingPrice: 12,
        costPrice: 4,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'مشروبات',
        isActive: true,
        unitName: 'كوب'
      },
      {
        id: 1005,
        code: 'REST-005',
        barcode: 'REST005',
        nameAr: 'عصير برتقال',
        nameEn: 'Orange Juice',
        sellingPrice: 15,
        costPrice: 6,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'مشروبات',
        isActive: true,
        unitName: 'كوب'
      },
      {
        id: 1006,
        code: 'REST-006',
        barcode: 'REST006',
        nameAr: 'كيك شوكولاتة',
        nameEn: 'Chocolate Cake',
        sellingPrice: 21,
        costPrice: 9,
        availableQuantity: 999,
        taxPercentage: 15,
        includesTax: false,
        categoryNameAr: 'حلويات',
        isActive: true,
        unitName: 'قطعة'
      }
    ];
  }
}
