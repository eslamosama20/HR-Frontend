import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';

import { CashierService } from 'src/app/services/cashier/cashier.service';
import { CashierSession, CashierSessionStatus } from 'src/app/models/cashier/cashier-session.model';
import { InventoryStocksService } from 'src/app/services/reports/inventory-stocks.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { InventoryStocksModel } from 'src/app/models/reports/inventory-stocks/inventoryStocks.model';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { getSystemNow } from 'src/app/utils/dateUtils';

interface DailySalesSnapshot {
  totalSales: number;
  totalTransactions: number;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  refundsAmount: number;
  averageTicket: number;
}

interface InventoryInsight {
  storesCount: number;
  productsCount: number;
  totalQuantity: number;
  estimatedValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface InventoryItemInsight {
  productId: string;
  storeName: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  lastPrice: number;
  estimatedValue: number;
  stockLevelPercent: number;
  valuePercent: number;
  stockStatus?: 'out' | 'low';
  stockStatusLabel?: string;
}

interface StoreBreakdown {
  storeName: string;
  productsCount: number;
  totalQuantity: number;
  estimatedValue: number;
}

interface CashierPerformance {
  cashierName: string;
  sessionsCount: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  sharePercent: number;
}

interface StoreOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-cashier-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DropdownModule,
    TableModule,
    InputTextModule,
    RadioButtonModule,
    TagModule,
    ToastModule,
    CustomDatePipe
  ],
  providers: [MessageService],
  templateUrl: './cashier-reports.component.html',
  styleUrls: ['./cashier-reports.component.scss']
})
export class CashierReportsComponent implements OnInit {
  loading = signal<boolean>(false);
  loadingDaily = signal<boolean>(false);

  dailyDate: string = this.toInputDate(getSystemNow());
  selectedStoreId: string = '';

  dailySnapshot = signal<DailySalesSnapshot>(this.getEmptyDailySnapshot());
  inventoryInsight = signal<InventoryInsight>(this.getEmptyInventoryInsight());

  recentSessions = signal<CashierSession[]>([]);
  cashierPerformance = signal<CashierPerformance[]>([]);
  storeBreakdown = signal<StoreBreakdown[]>([]);
  lowStockItems = signal<InventoryItemInsight[]>([]);
  topValueItems = signal<InventoryItemInsight[]>([]);
  storeOptions = signal<StoreOption[]>([]);

  openSessionsCount = signal<number>(0);
  closedSessionsCount = signal<number>(0);
  suspendedSessionsCount = signal<number>(0);

  // Search and Filter Properties for Recent Sessions
  sessionsSearchValue: string = '';
  sessionStatusFilter: 'all' | 'open' | 'closed' = 'all';
  sessionColumns: Array<{
    field: string;
    header: string;
    filter: boolean;
    filterType: string;
    minWidth?: string;
  }> = [];

  // Search and Filter Properties for Stock Alerts
  stockAlertsSearchValue: string = '';
  stockAlertsStatusFilter: 'all' | 'out' | 'low' = 'all';
  stockAlertsColumns: Array<{
    field: string;
    header: string;
    filter: boolean;
    filterType: string;
    minWidth?: string;
  }> = [];

  get activeLanguage(): string {
    return this.translateService.currentLang || 'ar';
  }

  private allSessions: CashierSession[] = [];
  private allStocks: InventoryStocksModel[] = [];
  private allStores: StoreDetailsModel[] = [];

  SessionStatus = CashierSessionStatus;

  constructor(
    private cashierService: CashierService,
    private inventoryStocksService: InventoryStocksService,
    private storeDetailsService: StoreDetailsService,
    private messageService: MessageService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.initSessionColumns();
    this.initStockAlertsColumns();
    this.loadReportData();
  }

  initStockAlertsColumns(): void {
    this.stockAlertsColumns = [
      {
        field: 'storeName',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_STORE') || 'المخزن',
        filter: true,
        filterType: 'text',
        minWidth: '11rem'
      },
      {
        field: 'itemCode',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_ITEM_CODE') || 'كود الصنف',
        filter: true,
        filterType: 'text',
        minWidth: '10rem'
      },
      {
        field: 'itemName',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_ITEM_NAME') || 'اسم الصنف',
        filter: true,
        filterType: 'text',
        minWidth: '14rem'
      },
      {
        field: 'quantity',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_QTY') || 'الكمية',
        filter: true,
        filterType: 'numeric',
        minWidth: '9rem'
      },
      {
        field: 'lastPrice',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_LAST_PRICE') || 'آخر سعر',
        filter: true,
        filterType: 'numeric',
        minWidth: '9.5rem'
      },
      {
        field: 'estimatedValue',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_EST_VALUE') || 'القيمة التقديرية',
        filter: true,
        filterType: 'numeric',
        minWidth: '10.5rem'
      },
      {
        field: 'stockStatusLabel',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_STOCK_STATUS') || 'حالة المخزون',
        filter: true,
        filterType: 'text',
        minWidth: '9.5rem'
      }
    ];
  }

  clearStockAlertsTable(table: Table): void {
    table.clear();
    this.stockAlertsSearchValue = '';
    this.stockAlertsStatusFilter = 'all';
  }

  trimStockAlertsSearchValue(): void {
    this.stockAlertsSearchValue = this.stockAlertsSearchValue.trim();
  }

  filterStockAlertsTable(table: Table, event: Event): void {
    const target = event.target as HTMLInputElement;
    table.filterGlobal(target.value.trim(), 'contains');
  }

  onStockAlertsStatusFilterChange(table: Table): void {
    if (this.stockAlertsStatusFilter === 'all') {
      table.filter(null, 'stockStatus', 'equals');
    } else if (this.stockAlertsStatusFilter === 'out') {
      table.filter('out', 'stockStatus', 'equals');
    } else if (this.stockAlertsStatusFilter === 'low') {
      table.filter('low', 'stockStatus', 'equals');
    }
  }

  initSessionColumns(): void {
    this.sessionColumns = [
      {
        field: 'sessionNumber',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_SESSION_NO') || 'رقم الوردية',
        filter: true,
        filterType: 'text',
        minWidth: '10rem'
      },
      {
        field: 'cashierUserName',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_CASHIER') || 'الكاشير',
        filter: true,
        filterType: 'text',
        minWidth: '11rem'
      },
      {
        field: 'openingDate',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_OPEN_TIME') || 'وقت الفتح',
        filter: true,
        filterType: 'date',
        minWidth: '11.5rem'
      },
      {
        field: 'closingDate',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_CLOSE_TIME') || 'وقت الإغلاق',
        filter: true,
        filterType: 'date',
        minWidth: '11.5rem'
      },
      {
        field: 'totalSales',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_TOTAL_SALES') || 'إجمالي المبيعات',
        filter: true,
        filterType: 'numeric',
        minWidth: '10.5rem'
      },
      {
        field: 'totalCash',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_CASH') || 'نقدي',
        filter: true,
        filterType: 'numeric',
        minWidth: '9.5rem'
      },
      {
        field: 'totalCard',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_CARD') || 'شبكة',
        filter: true,
        filterType: 'numeric',
        minWidth: '9.5rem'
      },
      {
        field: 'difference',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_DIFF') || 'الفارق',
        filter: true,
        filterType: 'numeric',
        minWidth: '9.5rem'
      },
      {
        field: 'status',
        header: this.translateService.instant('CASHIER_REPORTS.TABLE_STATUS') || 'الحالة',
        filter: true,
        filterType: 'text',
        minWidth: '9rem'
      }
    ];
  }

  clearSessionsTable(table: Table): void {
    table.clear();
    this.sessionsSearchValue = '';
    this.sessionStatusFilter = 'all';
  }

  trimSessionsSearchValue(): void {
    this.sessionsSearchValue = this.sessionsSearchValue.trim();
  }

  filterSessionsTable(table: Table, event: Event): void {
    const target = event.target as HTMLInputElement;
    table.filterGlobal(target.value.trim(), 'contains');
  }

  onSessionStatusFilterChange(table: Table): void {
    if (this.sessionStatusFilter === 'all') {
      table.filter(null, 'status', 'equals');
    } else if (this.sessionStatusFilter === 'open') {
      table.filter(0, 'status', 'equals');
    } else if (this.sessionStatusFilter === 'closed') {
      table.filter(1, 'status', 'equals');
    }
  }

  loadReportData(): void {
    this.loading.set(true);

    let hasSessionError = false;
    let hasStoreError = false;
    let hasStockError = false;

    forkJoin({
      sessionsResponse: this.cashierService.getSessions(1, 200).pipe(
        catchError(() => {
          hasSessionError = true;
          return of({ items: [] as CashierSession[], total: 0 });
        })
      ),
      stores: this.storeDetailsService.getAll().pipe(
        catchError(() => {
          hasStoreError = true;
          return of([] as StoreDetailsModel[]);
        })
      ),
      inventoryStocks: this.inventoryStocksService.getInventoryStocks().pipe(
        catchError(() => {
          hasStockError = true;
          return of([] as InventoryStocksModel[]);
        })
      )
    }).subscribe({
      next: ({ sessionsResponse, stores, inventoryStocks }) => {
        this.allSessions = [...(sessionsResponse.items || [])];
        this.allStores = [...(stores || [])];
        this.allStocks = [...(inventoryStocks || [])];

        this.prepareSessionPanels();
        this.buildStoreOptions();
        this.buildInventoryInsights();
        this.loadDailySnapshot();

        if (hasSessionError) {
          this.notifyWarn(this.translateService.instant('CASHIER_REPORTS.NOTIFY_SESSION_ERR'));
        }

        if (hasStoreError || hasStockError) {
          this.notifyWarn(this.translateService.instant('CASHIER_REPORTS.NOTIFY_STORE_ERR'));
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifyError(this.translateService.instant('CASHIER_REPORTS.NOTIFY_GENERAL_ERR'));
      }
    });
  }

  refreshAllData(): void {
    this.loadReportData();
  }

  onStoreFilterChange(): void {
    this.buildInventoryInsights();
  }

  onDailyDateChange(): void {
    this.loadDailySnapshot();
  }

  getStatusLabel(status: CashierSessionStatus): string {
    const labels = {
      [CashierSessionStatus.Open]: this.translateService.instant('CASHIER_REPORTS.OPEN_SESSIONS'),
      [CashierSessionStatus.Closed]: this.translateService.instant('CASHIER_REPORTS.CLOSED'),
      [CashierSessionStatus.Suspended]: this.translateService.instant('CASHIER_REPORTS.SUSPENDED')
    };
    return labels[status] || this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN');
  }

  getStatusSeverity(
    status: CashierSessionStatus
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<
      CashierSessionStatus,
      'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'
    > = {
      [CashierSessionStatus.Open]: 'success',
      [CashierSessionStatus.Closed]: 'danger',
      [CashierSessionStatus.Suspended]: 'warning'
    };
    return severities[status] || 'info';
  }

  getMixPercent(value: number): number {
    const total = this.dailySnapshot().totalSales;
    if (!total) {
      return 0;
    }
    return Math.max(0, Math.min(100, (value / total) * 100));
  }

  private loadDailySnapshot(): void {
    this.loadingDaily.set(true);
    const targetDate = this.parseInputDate(this.dailyDate);

    this.cashierService.getDailySalesReport(targetDate).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (report) => {
        const mapped = report ? this.mapDailySnapshot(report) : this.getEmptyDailySnapshot();

        if (this.hasDailyData(mapped)) {
          this.dailySnapshot.set(mapped);
        } else {
          this.dailySnapshot.set(this.buildDailySnapshotFromSessions(targetDate));
        }

        this.loadingDaily.set(false);
      },
      error: () => {
        this.dailySnapshot.set(this.buildDailySnapshotFromSessions(targetDate));
        this.loadingDaily.set(false);
      }
    });
  }

  private mapDailySnapshot(report: any): DailySalesSnapshot {
    const source = Array.isArray(report)
      ? (report[0] || {})
      : (report?.data || report?.result || report || {});

    const totalSales = this.pickNumber(source, [
      'totalSales',
      'totalSalesAmount',
      'salesAmount',
      'netSales',
      'summary.totalSalesAmount'
    ]);

    const totalTransactions = this.pickNumber(source, [
      'totalTransactions',
      'transactionsCount',
      'transactionCount',
      'summary.totalTransactions'
    ]);

    const cashAmount = this.pickNumber(source, [
      'cashAmount',
      'cashSales',
      'summary.cashAmount'
    ]);

    const cardAmount = this.pickNumber(source, [
      'cardAmount',
      'cardSales',
      'summary.cardAmount'
    ]);

    const creditAmount = this.pickNumber(source, [
      'creditAmount',
      'creditSales',
      'summary.creditAmount'
    ]);

    const refundsAmount = this.pickNumber(source, [
      'refundsAmount',
      'totalRefunds',
      'totalRefundsAmount',
      'summary.refundsAmount'
    ]);

    const averageTicket = this.pickNumber(source, ['averageTicket', 'avgTicket']) ||
      (totalTransactions > 0 ? totalSales / totalTransactions : 0);

    return {
      totalSales,
      totalTransactions,
      cashAmount,
      cardAmount,
      creditAmount,
      refundsAmount,
      averageTicket
    };
  }

  private buildDailySnapshotFromSessions(targetDate: Date): DailySalesSnapshot {
    const sessionsInDay = this.allSessions.filter(session =>
      this.isSameDay(session.openingDate, targetDate)
    );

    const totalSales = sessionsInDay.reduce((sum, session) => sum + this.safeNumber(session.totalSales), 0);
    const cashAmount = sessionsInDay.reduce((sum, session) => sum + this.safeNumber(session.totalCash), 0);
    const cardAmount = sessionsInDay.reduce((sum, session) => sum + this.safeNumber(session.totalCard), 0);
    const creditAmount = sessionsInDay.reduce((sum, session) => sum + this.safeNumber(session.totalCredit), 0);
    const refundsAmount = sessionsInDay.reduce((sum, session) => sum + this.safeNumber(session.totalRefunds), 0);

    const totalTransactions = sessionsInDay.reduce((sum, session) => {
      return sum + this.safeNumber(session.cashDrawerOpenings);
    }, 0) || sessionsInDay.length;

    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    return {
      totalSales,
      totalTransactions,
      cashAmount,
      cardAmount,
      creditAmount,
      refundsAmount,
      averageTicket
    };
  }

  private prepareSessionPanels(): void {
    const sortedSessions = [...this.allSessions].map(session => ({
      ...session,
      openingDate: session.openingDate ? new Date(session.openingDate) : undefined,
      closingDate: session.closingDate ? new Date(session.closingDate) : undefined
    })).sort((a, b) => {
      const aTime = this.getTimeValue(a.openingDate);
      const bTime = this.getTimeValue(b.openingDate);
      return bTime - aTime;
    });

    this.recentSessions.set(sortedSessions);

    this.openSessionsCount.set(
      sortedSessions.filter(session => session.status === CashierSessionStatus.Open).length
    );
    this.closedSessionsCount.set(
      sortedSessions.filter(session => session.status === CashierSessionStatus.Closed).length
    );
    this.suspendedSessionsCount.set(
      sortedSessions.filter(session => session.status === CashierSessionStatus.Suspended).length
    );

    this.buildCashierPerformance(sortedSessions);
  }

  private buildCashierPerformance(sessions: CashierSession[]): void {
    const grouped = new Map<string, CashierPerformance>();

    for (const session of sessions) {
      const cashierName = session.cashierUserName || this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN');
      const existing = grouped.get(cashierName);

      if (!existing) {
        grouped.set(cashierName, {
          cashierName,
          sessionsCount: 1,
          totalSales: this.safeNumber(session.totalSales),
          totalCash: this.safeNumber(session.totalCash),
          totalCard: this.safeNumber(session.totalCard),
          sharePercent: 0
        });
        continue;
      }

      existing.sessionsCount += 1;
      existing.totalSales += this.safeNumber(session.totalSales);
      existing.totalCash += this.safeNumber(session.totalCash);
      existing.totalCard += this.safeNumber(session.totalCard);
    }

    const list = Array.from(grouped.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, 6);
    const maxSales = list.reduce((max, item) => Math.max(max, item.totalSales), 0);

    list.forEach(item => {
      item.sharePercent = maxSales > 0 ? (item.totalSales / maxSales) * 100 : 0;
    });

    this.cashierPerformance.set(list);
  }

  private buildStoreOptions(): void {
    const options: StoreOption[] = [
      { label: this.translateService.instant('CASHIER_REPORTS.ALL_STORES'), value: '' },
      ...this.allStores
        .filter(store => !!store.id)
        .map(store => ({
          label: store.arabicName || store.englishName || this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN'),
          value: String(store.id)
        }))
    ];

    this.storeOptions.set(options);

    const selectedExists = options.some(option => option.value === this.selectedStoreId);
    if (!selectedExists) {
      this.selectedStoreId = '';
    }
  }

  private buildInventoryInsights(): void {
    const filteredStocks = this.selectedStoreId
      ? this.allStocks.filter(stock => String(stock.storeDetailsId || '') === this.selectedStoreId)
      : this.allStocks;

    const storeNameMap = new Map<string, string>();
    this.allStores.forEach(store => {
      storeNameMap.set(
        String(store.id || ''),
        store.arabicName || store.englishName || this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN')
      );
    });

    const allItems: InventoryItemInsight[] = [];
    const storeAgg = new Map<string, StoreBreakdown>();
    const productIds = new Set<string>();
    const storesWithStocks = new Set<string>();

    for (const stock of filteredStocks) {
      const storeId = String(stock.storeDetailsId || '');
      if (storeId) {
        storesWithStocks.add(storeId);
      }

      const storeName =
        stock.storeDetailsArabicName ||
        stock.storeDetailsEnglishName ||
        storeNameMap.get(storeId) ||
        this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN');

      const items = stock.storedItems || [];

      for (const item of items) {
        const productId = String(item.mainPurchaseClassId || '');
        if (productId) {
          productIds.add(productId);
        }

        const quantity = this.safeNumber(item.quantity);
        const lastPrice = this.safeNumber(item.lastPrice);
        const estimatedValue = quantity * lastPrice;

        allItems.push({
          productId,
          storeName,
          itemName: item.mainPurchaseClassArabicName || item.mainPurchaseClassEnglishName || this.translateService.instant('CASHIER_REPORTS.STATUS_UNKNOWN'),
          itemCode: item.mainPurchaseClassReferenceCode || '-',
          quantity,
          lastPrice,
          estimatedValue,
          stockLevelPercent: Math.min(100, Math.max(0, quantity * 10)),
          valuePercent: 0
        });

        const currentStoreAgg = storeAgg.get(storeName) || {
          storeName,
          productsCount: 0,
          totalQuantity: 0,
          estimatedValue: 0
        };

        currentStoreAgg.productsCount += 1;
        currentStoreAgg.totalQuantity += quantity;
        currentStoreAgg.estimatedValue += estimatedValue;
        storeAgg.set(storeName, currentStoreAgg);
      }
    }

    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedValue = allItems.reduce((sum, item) => sum + item.estimatedValue, 0);
    const outOfStockCount = allItems.filter(item => item.quantity <= 0).length;
    const lowStockCount = allItems.filter(item => item.quantity > 0 && item.quantity <= 5).length;

    const storesCount = this.selectedStoreId
      ? (filteredStocks.length > 0 ? 1 : 0)
      : (storesWithStocks.size || this.allStores.length);

    this.inventoryInsight.set({
      storesCount,
      productsCount: productIds.size,
      totalQuantity,
      estimatedValue,
      lowStockCount,
      outOfStockCount
    });

    const lowStockItems = allItems
      .filter(item => item.quantity <= 10)
      .map(item => ({
        ...item,
        stockStatus: (item.quantity <= 0 ? 'out' : 'low') as 'out' | 'low',
        stockStatusLabel: item.quantity <= 0
          ? (this.translateService.instant('CASHIER_REPORTS.STATUS_OUT') || 'نافد')
          : (item.quantity <= 5
              ? (this.translateService.instant('CASHIER_REPORTS.STATUS_VERY_LOW') || 'منخفض جداً')
              : (this.translateService.instant('CASHIER_REPORTS.STATUS_LOW') || 'منخفض'))
      }))
      .sort((a, b) => a.quantity - b.quantity || a.estimatedValue - b.estimatedValue);

    this.lowStockItems.set(lowStockItems);

    const topValueItems = [...allItems]
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 8);

    const maxValue = topValueItems.reduce((max, item) => Math.max(max, item.estimatedValue), 0);
    topValueItems.forEach(item => {
      item.valuePercent = maxValue > 0 ? (item.estimatedValue / maxValue) * 100 : 0;
    });
    this.topValueItems.set(topValueItems);

    const storeBreakdown = Array.from(storeAgg.values())
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 6);

    this.storeBreakdown.set(storeBreakdown);
  }

  private hasDailyData(snapshot: DailySalesSnapshot): boolean {
    return (
      snapshot.totalSales > 0 ||
      snapshot.totalTransactions > 0 ||
      snapshot.cashAmount > 0 ||
      snapshot.cardAmount > 0 ||
      snapshot.creditAmount > 0
    );
  }

  private pickNumber(source: any, paths: string[]): number {
    for (const path of paths) {
      const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], source);
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  private parseInputDate(value: string): Date {
    if (!value) {
      return getSystemNow();
    }
    return new Date(`${value}T00:00:00`);
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isSameDay(value: Date | string | undefined, target: Date): boolean {
    const parsed = this.tryParseDate(value);
    if (!parsed) {
      return false;
    }

    return (
      parsed.getFullYear() === target.getFullYear() &&
      parsed.getMonth() === target.getMonth() &&
      parsed.getDate() === target.getDate()
    );
  }

  private tryParseDate(value: Date | string | undefined): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getTimeValue(value: Date | string | undefined): number {
    const parsed = this.tryParseDate(value);
    return parsed ? parsed.getTime() : 0;
  }

  private safeNumber(value: number | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getEmptyDailySnapshot(): DailySalesSnapshot {
    return {
      totalSales: 0,
      totalTransactions: 0,
      cashAmount: 0,
      cardAmount: 0,
      creditAmount: 0,
      refundsAmount: 0,
      averageTicket: 0
    };
  }

  private getEmptyInventoryInsight(): InventoryInsight {
    return {
      storesCount: 0,
      productsCount: 0,
      totalQuantity: 0,
      estimatedValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };
  }

  private notifyWarn(detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translateService.instant('CASHIER_POS.WARNING'),
      detail
    });
  }

  private notifyError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
      detail
    });
  }
}
