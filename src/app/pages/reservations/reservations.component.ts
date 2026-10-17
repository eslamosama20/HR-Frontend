import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Table, TableLazyLoadEvent } from 'primeng/table';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../modules/i18n';
import { AuthService } from '../../modules/auth';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PermissionModel } from '../../models/auth/permission.model';
import { UserAccountModel } from '../../models/auth/userAccount.model';
import { ReservationModel } from '../../models/accounting/reservation-model';
import { Router } from '@angular/router';
import { ReservationService } from '../../services/reservations/reservation.service';
// import { forkJoin, firstValueFrom, of } from 'rxjs';
// import { map, catchError, finalize } from 'rxjs/operators';
import { forkJoin, firstValueFrom } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';

import { RoomTypeService } from '../../services/room-type/room-type.service';
import { ReservationMealService } from '../../services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from '../../services/reservations/reservation-view.service';
import { ReservationServiceService } from '../../services/reservations/reservation-service.service';
import { ReservationSupplierService } from '../../services/ReservationSupplier/reservation-supplier.service';
import { MainSalesClassService } from '../../services/sales-classes-tree/main-sales-class.service';
import { SalesInvoiceService } from '../../services/salesInvoice/sales-invoice.service';
import { ReservationCompanyService } from '../../services/reservations/reservation-company.service';
import { FilterMetadata } from 'primeng/api';
import { PERMISSIONS } from '../../config/permissions';
import { formatDisplayDate } from '../../utils/dateUtils';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss'],
  providers: [
    ConfirmationService,
    // MessageService, // ❌ Removed - using global service to persist toasts across navigation
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class ReservationsComponent implements OnInit {
  selectedEntry: any = null;
  @ViewChild('overlayPanel') overlayPanel: any;
  bulkPrintMenuItems: any[] = [];
  bulkDownloadMenuItems: any[] = [];
  private currentOverlay: any = null;
  private lastOverlayEntryId: string | number | null = null;
  private currentFakeTarget: HTMLElement | null = null;

  initBulkMenus(): void {
    this.bulkPrintMenuItems = [
      {
        label: this.translate.instant('FINANCE.PRINT_DOCUMENTS') || 'طباعة مستندات الحجز',
        icon: 'pi pi-file-pdf',
        command: () => this.bulkPrintDocuments()
      },
      {
        label: this.translate.instant('FINANCE.PRINT_COST_SHEET') || 'طباعة إثباتات التكلفة',
        icon: 'pi pi-calculator',
        command: () => this.bulkPrintCostSheets()
      },
      {
        label: this.translate.instant('FINANCE.PRINT_HOTEL_REQUESTS') || 'طباعة طلبات الفندق',
        icon: 'pi pi-building',
        command: () => this.bulkPrintHotelRequests()
      }
    ];

    this.bulkDownloadMenuItems = [
      {
        label: this.translate.instant('FINANCE.DOWNLOAD_DOCUMENTS') || 'تنزيل مستندات الحجز',
        icon: 'pi pi-file-pdf',
        command: () => this.bulkDownloadDocuments()
      },
      {
        label: this.translate.instant('FINANCE.DOWNLOAD_COST_SHEET') || 'تنزيل إثباتات التكلفة',
        icon: 'pi pi-calculator',
        command: () => this.bulkDownloadCostSheets()
      },
      {
        label: this.translate.instant('FINANCE.DOWNLOAD_HOTEL_REQUESTS') || 'تنزيل طلبات الفندق',
        icon: 'pi pi-building',
        command: () => this.bulkDownloadHotelRequests()
      }
    ];
  }

  /**
   * Show overlay panel at mouse position using a fake target element (matches treasuries/user-management pattern)
   */
  openOverlayPanel(event: MouseEvent, overlay: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const entryId = entry?.id ?? null;
    const isOpen = !!overlay?.overlayVisible; // PrimeNG OverlayPanel flag

    // ✅ لو نفس الـ overlay مفتوح لنفس الـ entry => اقفل
    if (isOpen && this.currentOverlay === overlay && this.lastOverlayEntryId === entryId) {
      overlay.hide();
      this.lastOverlayEntryId = null;

      // نظّف fake target لو موجود
      if (this.currentFakeTarget && this.currentFakeTarget.parentNode) {
        this.currentFakeTarget.parentNode.removeChild(this.currentFakeTarget);
      }
      this.currentFakeTarget = null;
      return;
    }

    // ✅ لو في overlay تاني مفتوح اقفله
    if (this.currentOverlay && this.currentOverlay !== overlay) {
      this.currentOverlay.hide();
    }

    this.selectedEntry = entry;
    this.currentOverlay = overlay;
    this.lastOverlayEntryId = entryId;

    // ✅ نظّف أي fake target قديم
    if (this.currentFakeTarget && this.currentFakeTarget.parentNode) {
      this.currentFakeTarget.parentNode.removeChild(this.currentFakeTarget);
    }

    // Create a fake target element at the mouse position
    const fakeTarget = document.createElement('div');
    fakeTarget.style.position = 'fixed';
    fakeTarget.style.left = event.clientX + 'px';
    fakeTarget.style.top = event.clientY + 'px';
    fakeTarget.style.width = '0px';
    fakeTarget.style.height = '0px';
    fakeTarget.style.zIndex = '9999';
    document.body.appendChild(fakeTarget);

    this.currentFakeTarget = fakeTarget;

    // Show the overlay panel at the fake target
    overlay.show(event, fakeTarget);

    // Remove the fake target after showing the overlay + ضبط مكانه
    setTimeout(() => {
      if (overlay.container) {
        const panelEl = overlay.container as HTMLElement;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX + 5;
        let top = event.clientY + 5;

        if (left + panelRect.width > viewportWidth) left = viewportWidth - panelRect.width - 10;
        if (left < 10) left = 10;

        if (top + panelRect.height > viewportHeight) top = viewportHeight - panelRect.height - 10;
        if (top < 10) top = 10;

        panelEl.style.position = 'fixed';
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        panelEl.style.zIndex = '9999';
      }

      // ✅ شيل fake target
      if (this.currentFakeTarget && this.currentFakeTarget.parentNode) {
        this.currentFakeTarget.parentNode.removeChild(this.currentFakeTarget);
      }
      this.currentFakeTarget = null;
    }, 10);
  }

  @ViewChild('dt') dt!: Table;
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareTargetReservation: any | null = null;
  shareForm!: FormGroup;
  // Signals
  reservationsSignal = signal<any[]>([]);
  reservationEntriesSignal = signal<any[]>([]);
  searchValueSignal = signal<any>('');
  searchFieldSignal = signal<string>('referencenumber');
  isFrontalSignal = signal<boolean>(false);
  shareMode: 'single' | 'bulk' = 'single';
  shareBulkIds: string[] = [];

  // UI
  loading: boolean = true;
  rows = 10;                       // عدد الصفوف الافتراضي
  pageNumber = 1;                  // 1-based للباك إند
  totalRecords = 0;                // total record count
  private readonly baseRowsPerPageOptions = [10, 20, 50, 100];
  private lazyLoad$ = new Subject<TableLazyLoadEvent>();

  get rowsPerPageOptions(): number[] {
    const total = this.totalRecords || 0;
    const options = this.baseRowsPerPageOptions.filter(
      (n) => n <= total || n === this.baseRowsPerPageOptions[0]
    );
    return options.length ? options : [this.rows];
  }

  currentPage = 0;
  isTableView = true; // يبدأ بالجدول

  // Forms & perms
  reservationEntryFormGroup!: FormGroup;
  userPermissionsSignal = signal<PermissionModel[]>([]);
  PERMISSIONS = PERMISSIONS;

  // i18n
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;

  columns!: Column[];

  private router: Router;

  // عناصر محددة من الجدول
  selectedReservations: any[] = [];

  private invoiceCache = new Map<
    string,
    { salesInvoiceId: string | number | null; hasSalesInvoice: boolean }
  >();
  private inflightInvoiceIds = new Set<string>();
  private invoiceBatchLoading = false;

  // حالة انشغال أثناء التنفيذ الجماعي
  bulkBusy = false;

  get isFrontal() {
    return this.isFrontalSignal();
  }

  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }
  private roomTypeNameById = new Map<string, string>();
  private mealNameById = new Map<string, string>();
  private viewNameById = new Map<string, string>();
  private resServiceNameById = new Map<string, string>();
  private supplierNameById = new Map<string, string>();

  /** رجع اسم عربي لو متاح، وإلا إنجليزي، وإلا فاضي */
  private pickName(obj: any): string {
    if (!obj) return '';
    const ar = obj.arabicName ?? obj.nameAr ?? obj.displayNameAr;
    const en =
      obj.englishName ?? obj.nameEn ?? obj.displayNameEn ?? obj.displayName;
    return ar || en || '';
  }

  /** خُد الاسم من الكائن لو موجود، وإلا من الخريطة بالـ id */
  private nameFromIdOrObj(
    id?: any,
    obj?: any,
    map?: Map<string, string>
  ): string {
    if (obj) return this.pickName(obj);
    const k = id ? String(id) : '';
    if (!k) return '';
    return map?.get(k) ?? '';
  }


  constructor(
    private reservationService: ReservationService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,

    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private reservationServiceService: ReservationServiceService,
    private reservationSupplierService: ReservationSupplierService,
    private mainSalesClassService: MainSalesClassService,
    private salesInvoiceService: SalesInvoiceService,
    private reservationCompanyService: ReservationCompanyService,
    router: Router
  ) {
    this.router = router;
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions = res.userRoles
          .map((ur) => ur.role.rolePermissions.map((rp) => rp.permission))
          .reduce((acc, val) => acc.concat(val), []);
      }
    });
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }
  private clientCompanyNameById = new Map<string, string>();

  private pickNameByLang(obj: any): string {
    if (!obj) return '';
    const ar = obj.arabicName ?? obj.nameAr ?? obj.displayNameAr;
    const en = obj.englishName ?? obj.nameEn ?? obj.displayNameEn ?? obj.displayName;
    return this.activeLanguage === 'en' ? (en || ar || '') : (ar || en || '');
  }

  private async ensureLookupsLoadedForExport(): Promise<void> {
    try {
      const d: any = await firstValueFrom(
        forkJoin({
          roomTypes: this.roomTypeService.getAll(),
          meals: this.reservationMealService.getAll(),
          views: this.reservationViewService.getAll(),
          services: this.reservationServiceService.getAll(),
          suppliers: this.reservationSupplierService.getAll(),
          clientCompanies: this.reservationCompanyService.getAll(),
        })
      );
      this.roomTypeNameById = new Map((d.roomTypes || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
      this.mealNameById = new Map((d.meals || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
      this.viewNameById = new Map((d.views || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
      this.resServiceNameById = new Map((d.services || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
      this.supplierNameById = new Map((d.suppliers || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
      this.clientCompanyNameById = new Map((d.clientCompanies || []).map((x: any) => [String(x.id), this.pickNameByLang(x)]));
    } catch (err) {
      console.error('Export lookups load error', err);
    }
  }

  private applyFiltersOnPage(list: any[], filters: any): any[] {
    if (!filters || !Object.keys(filters).length) return list;

    const normalizeMetas = (f: any): { operator: 'and' | 'or'; metas: FilterMetadata[] } => {
      if (!f) return { operator: 'and', metas: [] };

      // Array case
      if (Array.isArray(f)) return { operator: 'and', metas: f.filter(Boolean) as any };

      // PrimeNG { operator, constraints }
      if (f?.constraints && Array.isArray(f.constraints)) {
        const op = (String(f.operator || 'and').toLowerCase() === 'or' ? 'or' : 'and') as 'and' | 'or';
        return { operator: op, metas: (f.constraints || []).filter(Boolean) as any };
      }

      // Simple { value, matchMode }
      return { operator: 'and', metas: [f as any] };
    };

    const matchBoolean = (value: any, filterValue: any) =>
      !!value === !!filterValue;

    const toLower = (value: any) => String(value ?? '').toLowerCase();

    const matchText = (value: any, filterValue: any, matchMode: string) => {
      const v = toLower(value);
      const f = toLower(filterValue);
      switch (matchMode) {
        case 'startsWith':
          return v.startsWith(f);
        case 'endsWith':
          return v.endsWith(f);
        case 'notContains':
          return !v.includes(f);
        case 'equals':
          return v === f;
        case 'notEquals':
          return v !== f;
        case 'contains':
        default:
          return v.includes(f);
      }
    };

    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const matchNumber = (value: any, filterValue: any, matchMode: string): boolean | null => {
      if (matchMode === 'between' && Array.isArray(filterValue)) {
        const min = toNumber(filterValue[0]);
        const max = toNumber(filterValue[1]);
        const v = toNumber(value);
        if (v === null || min === null || max === null) return null;
        return v >= min && v <= max;
      }

      const v = toNumber(value);
      const f = toNumber(filterValue);
      if (v === null || f === null) return null;

      switch (matchMode) {
        case 'equals':
          return v === f;
        case 'notEquals':
          return v !== f;
        case 'lt':
          return v < f;
        case 'lte':
          return v <= f;
        case 'gt':
          return v > f;
        case 'gte':
          return v >= f;
        default:
          return v === f;
      }
    };

    const toDateOnlyTime = (v: any) => {
      const d = v instanceof Date ? v : new Date(v);
      if (!Number.isFinite(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    const matchDate = (value: any, filterValue: any, matchMode: string): boolean => {
      if (matchMode === 'between' && Array.isArray(filterValue)) {
        const min = toDateOnlyTime(filterValue[0]);
        const max = toDateOnlyTime(filterValue[1]);
        const v = toDateOnlyTime(value);
        if (v === null || min === null || max === null) return false;
        return v >= min && v <= max;
      }

      const a = toDateOnlyTime(value);
      const b = toDateOnlyTime(filterValue);
      if (a === null || b === null) return false;

      if (matchMode === 'dateIs') return a === b;
      if (matchMode === 'dateIsNot') return a !== b;
      if (matchMode === 'dateBefore') return a < b;
      if (matchMode === 'dateAfter') return a > b;
      return a === b;
    };

    const matchIn = (value: any, filterValue: any) => {
      if (!Array.isArray(filterValue)) return false;
      const normalized = new Set(filterValue.map((v) => String(v)));
      if (Array.isArray(value)) {
        return value.some((v) => normalized.has(String(v)));
      }
      return normalized.has(String(value));
    };

    const matchOneMeta = (rowValue: any, meta: any): boolean => {
      const filterValue = meta?.value;
      const matchMode = String(meta?.matchMode || 'contains');

      // ignore empty filter
      if (filterValue === null || filterValue === undefined || filterValue === '') return true;

      // list match
      if (matchMode === 'in') {
        return matchIn(rowValue, filterValue);
      }

      // boolean
      if (typeof filterValue === 'boolean') {
        return matchBoolean(rowValue, filterValue);
      }

      // date
      if (filterValue instanceof Date || matchMode.startsWith('date')) {
        return matchDate(rowValue, filterValue, matchMode);
      }

      // numeric filters from PrimeNG may come as number/string
      const numericModes = new Set(['equals', 'notEquals', 'lt', 'lte', 'gt', 'gte', 'between']);
      if (numericModes.has(matchMode)) {
        const numericResult = matchNumber(rowValue, filterValue, matchMode);
        if (numericResult !== null) return numericResult;
      }

      // default contains
      return matchText(rowValue, filterValue, matchMode);
    };

    return (list || []).filter((row) => {
      for (const field of Object.keys(filters)) {
        if (field === 'global') continue;
        const { operator, metas } = normalizeMetas(filters[field]);
        if (!metas.length) continue;

        const rowValue = row?.[field];

        const results = metas.map((m) => matchOneMeta(rowValue, m));

        // AND/OR between constraints
        const ok = operator === 'or' ? results.some(Boolean) : results.every(Boolean);
        if (!ok) return false;
      }
      return true;
    });
  }

  ngOnInit(): void {
    this.isFrontal = this.router.url.includes('frontal');

    // ✅ 1) subscriber لازم علشان lazyLoad$.next يشتغل فعليًا
    this.lazyLoad$
      .pipe(
        debounceTime(150),
        tap(() => (this.loading = true)),
        switchMap((e) => this.loadReservations$(e))
      )
      .subscribe({
        next: ({ built, totalRecords }) => {
          this.reservations = built;
          this.totalRecords = totalRecords;
          this.loading = false;

          // ✅ تحديث الفواتير بعد تحميل القائمة
          this.checkSalesInvoicesForReservations(built);
        },
        error: (err) => this.handleReservationLoadError(err),
      });

    // ✅ 2) اطلق أول تحميل للبيانات مباشرة بدون ريكويستات lookups إضافية
    this.lazyLoad$.next({
      first: 0,
      rows: this.rows,
      sortField: 'createdAt',
      sortOrder: -1,
      filters: {},
    } as any);

    // Initialize columns and bulk menus
    this.initColumns();
    this.initBulkMenus();

    // Subscribe to language change events
    this.translate.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang || this.translationService.getSelectedLanguage() || 'en';
      this.initColumns();
      this.initBulkMenus();
    });
  }

  initColumns(): void {
    this.columns = [
      {
        field: 'isConfirmed',
        header: this.translate.instant('FINANCE.IS_CONFIRMED'),
        filter: true,
        filterType: 'boolean',
      },
      {
        field: 'referenceNumber',
        header: this.translate.instant('FINANCE.RESERVATION_REFERENCE_NUMBER'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'clientCompanyName',
        header: this.translate.instant('FINANCE.CLIENT_COMPANY_NAME') || (this.activeLanguage === 'en' ? 'Client Company' : 'شركة العميل'),
        filter: true,
        filterType: 'text',
      },
      { field: 'reservationType', header: this.translate.instant('FINANCE.RESERVATION_TYPE') },
      { field: 'numberOfNights', header: this.translate.instant('FINANCE.NUMBER_OF_NIGHTS') },
      { field: 'guestName', header: this.translate.instant('FINANCE.GUEST_NAME') },
      {
        field: 'arrivalDate',
        header: this.translate.instant('FINANCE.ARRIVAL_DATE'),
        filter: true,
        filterType: 'date',
      },
      {
        field: 'departureDate',
        header: this.translate.instant('FINANCE.DEPARTURE_DATE'),
        filter: true,
        filterType: 'date',
      },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date',
      },
    ];
  }

  private loadReservations$(e: TableLazyLoadEvent) {
    const first = e.first ?? 0;
    const rows = e.rows ?? this.rows;

    const filters = e.filters || {};
    const sortField = ((e.sortField as string) || 'createdAt');
    const sortOrder = (typeof e.sortOrder === 'number' ? e.sortOrder : -1); // default DESC

    const pageNumber = Math.floor(first / rows) + 1;

    // ✅ Non-frontal => Server paging (بيجيب الصفحة فقط) لكن الفلترة+الترتيب Frontend على نفس الصفحة (زي الكود الأول)
    if (!this.isFrontal) {
      // ✅ مهم: ابعت filters = null للسيرفر لو انت عاوزه Frontend 100%
      // (علشان السيرفر ميعملش فلترة مختلفة)
      return this.reservationService
        .getPage(pageNumber, rows, sortField, sortOrder, null, this.searchField, this.getFormattedSearchValue())
        .pipe(
          map(({ data, totalCount }: any) => {
            const built = this.buildReservationList(data || []);

            // ✅ فلترة Frontend على الصفحة
            const filteredOnPage = this.applyFiltersOnPage(built, filters);

            // ✅ ترتيب بعد الفلترة
            const sortedOnPage = this.sortReservations(filteredOnPage, sortField, sortOrder);

            // ✅ totalRecords زي ما هو (إجمالي السيرفر)
            return { built: sortedOnPage, totalRecords: totalCount ?? 0 };
          }),
          catchError((err) => {
            console.error(err);
            return EMPTY;
          })
        );
    }

    // ✅ Frontal => كل الداتا محلي (فلترة + ترتيب + تقطيع الصفحة)
    return this.reservationService.getAllFrontalReservations().pipe(
      map((allRows: any[]) => {
        const builtAll = this.buildReservationList(allRows || []);

        // 1) فلترة على كل الداتا
        const filteredAll = this.applyFiltersOnPage(builtAll, filters);

        // 2) ترتيب بعد الفلتر
        const sortedAll = this.sortReservations(filteredAll, sortField, sortOrder);

        // 3) pagination
        const pageRows = sortedAll.slice(first, first + rows);

        // 4) totalRecords بعد الفلتر
        return { built: pageRows, totalRecords: filteredAll.length };
      }),
      catchError((err) => {
        console.error(err);
        return EMPTY;
      })
    );
  }


  loadReservations(
    page: number = this.pageNumber,
    size: number = this.rows,
    sortField: string = 'createdAt',
    sortOrder: number = -1,
    filters: any = null
  ) {
    this.loading = true;

    if (!this.isFrontal) {
      this.reservationService.getPage(page, size, sortField, sortOrder, filters, this.searchField, this.getFormattedSearchValue()).subscribe({
        next: ({ data, totalCount }) => {
          // ✅ 1) ابنِ ليست جاهزة فيها clientCompanyName / isConfirmedForFilter
          const built = this.buildReservationList(data || []);
          const filteredOnPage = this.applyFiltersOnPage(built, filters || {});
          const sortedOnPage = this.sortReservations(filteredOnPage, sortField, sortOrder);

          this.reservations = sortedOnPage;
          this.checkSalesInvoicesForReservations(sortedOnPage);


          // ✅ سيب totalRecords إجمالي السيرفر
          this.totalRecords = totalCount ?? data?.length ?? 0;
          this.loading = false;
        },
        error: (err) => this.handleReservationLoadError(err),
      });
    } else {
      // frontal
      this.reservationService.getAllFrontalReservations().subscribe({
        next: (rows: any[]) => {
          const built = this.buildReservationList(rows || []);
          const filteredOnPage = this.applyFiltersOnPage(built, filters || {});

          const sortedOnPage = this.sortReservations(filteredOnPage, sortField, sortOrder);

          this.reservations = sortedOnPage;
          this.checkSalesInvoicesForReservations(sortedOnPage);

          this.totalRecords = filteredOnPage.length;
          this.loading = false;
        },
        error: (err) => this.handleReservationLoadError(err),
      });
    }
  }

  private toDateOnly(value: any): Date | null {
    if (!value) return null;

    // لو Date جاهز
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) return null;
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const s = String(value);

    // لو جاي بصيغة YYYY-MM-DD أو بداية ISO
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d); // midnight local (ثابت)
    }

    // fallback
    const dt = new Date(value);
    if (!Number.isFinite(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }


  private buildReservationList(rows: any[]): any[] {
    return (rows || []).map((x: any) => {
      const clientCompanyId = x?.reservationClientCompanyId;

      // ✅ استخدم Date Only لتجنب timezone shifting
      const arrival = this.toDateOnly(x.arrivalDate);
      const departure = this.toDateOnly(x.departureDate);
      const created = this.toDateOnly(x.createdAt);

      const clientCompanyName =
        (this.activeLanguage === 'en'
          ? (x?.reservationClientCompanyEnglishName || x?.reservationClientCompanyArabicName)
          : (x?.reservationClientCompanyArabicName || x?.reservationClientCompanyEnglishName)) ||
        this.pickNameByLang(x?.reservationClientCompany) ||
        (clientCompanyId
          ? (this.clientCompanyNameById.get(String(clientCompanyId)) ?? '')
          : '') ||
        (x?.clientCompanyName ?? '');

      const searchKey =
        `${x.referenceNumber ?? ''} ${x.reservationType ?? ''} ${x.guestName ?? ''} ${x.numberOfNights ?? ''} ${clientCompanyName}`
          .toLowerCase();

      return {
        ...x,

        id: x.id,
        referenceNumber: x.referenceNumber ?? '',
        reservationType: x.reservationType ?? '',
        numberOfNights: x.numberOfNights ?? 0,
        guestName: x.guestName ?? '',

        arrivalDate: arrival,
        departureDate: departure,
        createdAt: created,

        _arrivalTs: arrival ? arrival.getTime() : 0,
        _createdTs: created ? created.getTime() : 0,

        isFrontal: !!x.isFrontal,
        isConfirmed: typeof x.isConfirmed === 'boolean' ? x.isConfirmed : !!x.transactionId,
        isConfirmedForFilter: !!(x.isConfirmed ?? !!x.transactionId),
        transactionId: x.transactionId ?? null,

        salesInvoiceId: x.saleInvoiceId ?? null,
        hasSalesInvoice: !!x.saleInvoiceId,

        clientCompanyName,
        _searchKey: searchKey,
      };
    });
  }




  private sortByArrivalDesc(list: any[]): any[] {
    return [...(list || [])].sort((a, b) => {
      const ta = this.toTime(a?.arrivalDate); // الأساس: الوصول
      const tb = this.toTime(b?.arrivalDate);

      // لو الاتنين صفر (null/invalid) نكسر التعادل بـ createdAt
      if (ta === 0 && tb === 0) {
        return this.toTime(b?.createdAt) - this.toTime(a?.createdAt);
      }

      return tb - ta; // الأحدث أولاً
    });
  }

  private processReservationData(rows: any[]) {
    const list = (rows || []).map((x: any) => {
      const clientCompanyId = x?.reservationClientCompanyId;

      const clientCompanyName =
        (this.activeLanguage === 'en'
          ? (x?.reservationClientCompanyEnglishName || x?.reservationClientCompanyArabicName)
          : (x?.reservationClientCompanyArabicName || x?.reservationClientCompanyEnglishName)) ||
        this.pickNameByLang(x?.reservationClientCompany) ||
        (clientCompanyId ? (this.clientCompanyNameById.get(String(clientCompanyId)) ?? '') : '') ||
        (x?.clientCompanyName ?? '');

      const processedItem: any = {
        id: x.id,
        referenceNumber: x.referenceNumber ?? '',
        reservationType: x.reservationType ?? '',
        numberOfNights: x.numberOfNights ?? 0,
        guestName: x.guestName ?? '',

        arrivalDate: this.ensureValidDate(x.arrivalDate),
        departureDate: this.ensureValidDate(x.departureDate),
        createdAt: this.ensureValidDate(x.createdAt),

        isFrontal: !!x.isFrontal,
        isConfirmed: typeof x.isConfirmed === 'boolean' ? x.isConfirmed : !!x.transactionId,
        isConfirmedForFilter: !!(x.isConfirmed ?? !!x.transactionId),
        transactionId: x.transactionId ?? null,

        salesInvoiceId: x.saleInvoiceId ?? null,
        hasSalesInvoice: !!x.saleInvoiceId,

        clientCompanyName,

        ...x,
      };

      return processedItem;
    });

    // ✅ هنا الترتيب الحقيقي للجدول + الكروت (لأن reservations نفسها اتغيرت)
    const sorted = this.sortReservations(list, 'arrivalDate', -1);

    this.reservations = sorted;
  }



  private sortReservations(list: any[], sortField?: string, sortOrder?: number): any[] {
    const field = sortField && sortField !== 'rowIndex' ? sortField : 'createdAt';
    const order = sortOrder === 1 ? 1 : -1;

    return [...(list || [])].sort((a, b) => {
      // ✅ arrivalDate: الأساسي arrival ثم كسر التعادل createdAt
      if (field === 'arrivalDate') {
        const aArr = a?._arrivalTs ?? 0;
        const bArr = b?._arrivalTs ?? 0;

        // empty handling: لو واحد فاضي والتاني لا → الفاضي آخر الجدول
        const aEmpty = aArr === 0;
        const bEmpty = bArr === 0;
        if (aEmpty && !bEmpty) return 1;
        if (!aEmpty && bEmpty) return -1;

        // primary
        if (aArr !== bArr) return (aArr - bArr) * order;

        // tie-break: createdAt
        const aCr = a?._createdTs ?? 0;
        const bCr = b?._createdTs ?? 0;
        return (aCr - bCr) * order;
      }

      // ✅ createdAt طبيعي
      if (field === 'createdAt') {
        const aCr = a?._createdTs ?? 0;
        const bCr = b?._createdTs ?? 0;
        return (aCr - bCr) * order;
      }

      const av = a?.[field];
      const bv = b?.[field];

      const aEmpty = av === null || av === undefined || av === '';
      const bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      // ✅ أرقام
      const an = typeof av === 'number' ? av : Number(av);
      const bn = typeof bv === 'number' ? bv : Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * order;

      // ✅ boolean
      if (typeof av === 'boolean' || typeof bv === 'boolean') {
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * order;
      }

      // ✅ نص
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return as.localeCompare(bs) * order;
    });
  }


  private checkSalesInvoicesForReservations(reservations: any[]) {
    if (!reservations?.length) return;

    const pending: any[] = [];

    reservations.forEach((reservation) => {
      const id = reservation?.id ? String(reservation.id) : '';
      if (!id) return;

      if (reservation.salesInvoiceId) {
        this.invoiceCache.set(id, { salesInvoiceId: reservation.salesInvoiceId, hasSalesInvoice: true });
        return;
      }

      const cached = this.invoiceCache.get(id);
      if (cached) {
        reservation.salesInvoiceId = cached.salesInvoiceId;
        reservation.hasSalesInvoice = cached.hasSalesInvoice;
        return;
      }

      if (!this.inflightInvoiceIds.has(id)) {
        this.inflightInvoiceIds.add(id);
        pending.push(reservation);
      }
    });

    if (!pending.length) {
      this.reservations = [...reservations];
      return;
    }

    const reservationIds = pending
      .map((reservation) => String(reservation.id))
      .filter(Boolean);

    this.invoiceBatchLoading = true;
    this.salesInvoiceService
      .getInvoicesByReservationIdsBatch(reservationIds)
      .pipe(
        finalize(() => {
          pending.forEach((reservation) => {
            const id = String(reservation.id);
            this.inflightInvoiceIds.delete(id);
          });
          this.invoiceBatchLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          const invoicesMap = response?.invoices ?? {};

          pending.forEach((reservation) => {
            const id = String(reservation.id);
            const invoice = invoicesMap[id] ?? null;
            const info = {
              salesInvoiceId: invoice?.id ?? null,
              hasSalesInvoice: !!invoice,
            };

            this.invoiceCache.set(id, info);
            reservation.salesInvoiceId = info.salesInvoiceId;
            reservation.hasSalesInvoice = info.hasSalesInvoice;
          });

          this.reservations = [...reservations];
        },
        error: () => {
          pending.forEach((reservation) => {
            const id = String(reservation.id);
            const info = { salesInvoiceId: null, hasSalesInvoice: false };
            this.invoiceCache.set(id, info);
            reservation.salesInvoiceId = null;
            reservation.hasSalesInvoice = false;
          });
          this.reservations = [...reservations];
        },
      });
  }
  private handleReservationLoadError(err: any) {
    console.error('Error Loading Reservations', err);
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('FINANCE.ERROR'),
      detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR'),
    });
    this.loading = false;
  }

  // ========== Getters/Setters للإشارات ==========
  get reservations() {
    return this.reservationsSignal();
  }
  set reservations(value) {
    this.reservationsSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
    this.currentPage = 0; // ارجع لأول صفحة عند تغيير البحث
    this.triggerReload();
  }

  get searchField() {
    return this.searchFieldSignal();
  }
  set searchField(value) {
    this.searchFieldSignal.set(value);
    this.searchValue = ''; // clear search when field changes
    this.currentPage = 0;
    this.triggerReload();
  }

  getFormattedSearchValue(): string {
    const val = this.searchValue;
    if (val instanceof Date) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return val || '';
  }

  triggerReload() {
    if (this.dt) {
      this.lazyLoad$.next({
        first: 0,
        rows: this.rows,
        sortField: this.dt.sortField || 'createdAt',
        sortOrder: this.dt.sortOrder || -1,
        filters: this.dt.filters || {},
      } as any);
    } else {
      this.loadReservations(1, this.rows, 'createdAt', -1);
    }
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal();
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    try {
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
          console.warn('Invalid Date object:', dateValue);
          return null;
        }
        return dateValue;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue);
        return null;
      }
      return date;
    } catch (error) {
      console.warn('Error parsing date:', dateValue, error);
      return null;
    }
  }

  private ensureValidDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    if (dateValue === null || dateValue === undefined) {
      return null;
    }

    if (typeof dateValue === 'string' && dateValue.trim() === '') {
      return null;
    }

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }

    const parsedDate = this.parseDate(dateValue);
    if (
      parsedDate &&
      parsedDate instanceof Date &&
      !isNaN(parsedDate.getTime())
    ) {
      return parsedDate;
    }

    return null;
  }

  // ========== لعرض القائمة بعد الفلترة ==========
  private toTime(d: any): number {
    if (!d) return 0;
    const dt = d instanceof Date ? d : new Date(d);
    const t = dt.getTime();
    return Number.isFinite(t) ? t : 0;
  }

  get filteredReservations(): any[] {
    const list = this.reservations || [];
    const q = (this.getFormattedSearchValue() || '').toLowerCase().trim();

    // الأحدث للأقدم (createdAt ثم arrivalDate)
    const sorted = [...list].sort((a, b) => {
      const ta = (a?._createdTs || a?._arrivalTs || 0);
      const tb = (b?._createdTs || b?._arrivalTs || 0);
      return tb - ta;
    });

    if (!q) return sorted;

    return sorted.filter((r: any) => (r?._searchKey || '').includes(q));
  }




  // ========== أحداث واجهة ==========
  onPage(e: any) {
    this.rows = e.rows;
    this.currentPage = Math.floor(e.first / e.rows);
  }
  onTableLazyLoad(e: TableLazyLoadEvent) {
    const first = e.first ?? 0;
    const rows = e.rows ?? this.rows;
    const filters = e.filters || {};

    // ✅ هل فيه فلتر فعّال؟
    const hasActiveFilter = Object.values(filters).some((f: any) => {
      if (!f) return false;

      // { constraints: [...] }
      if (f?.constraints && Array.isArray(f.constraints)) {
        return f.constraints.some((c: any) => c?.value !== null && c?.value !== undefined && c?.value !== '');
      }

      // array metas
      if (Array.isArray(f)) {
        return f.some((m: any) => m?.value !== null && m?.value !== undefined && m?.value !== '');
      }

      // single meta
      return f?.value !== null && f?.value !== undefined && f?.value !== '';
    });

    this.rows = rows;

    // ✅ لو فلتر شغال → رجّع لأول صفحة
    const patchedEvent: TableLazyLoadEvent = {
      ...e,
      first: hasActiveFilter ? 0 : first,
      rows,
      filters,
    };

    this.lazyLoad$.next(patchedEvent);
  }






  onCardsPageChange(event: any) {
    this.rows = event.rows;
    this.pageNumber = Math.floor((event.first ?? 0) / event.rows) + 1; // 1-based

    // ✅ خلي الكروت تطلب نفس ترتيب الأحدث للأقدم
    this.loadReservations(this.pageNumber, this.rows, 'createdAt', -1);
  }


  clearFilters() {
    this.searchValue = '';
    this.searchField = 'referencenumber';
    if (this.dt) {
      this.dt.clear();
    }
  }
  openShareDialog(entry: any | null, bulkIds: string[] = []) {
    this.shareForm.reset();
    if (bulkIds && bulkIds.length > 1) {
      // bulk mode
      this.shareMode = 'bulk';
      this.shareBulkIds = bulkIds;
      this.shareTargetReservation = null;
    } else {
      // single mode
      this.shareMode = 'single';
      this.shareBulkIds = [];
      this.shareTargetReservation = entry || null;
    }
    this.shareActiveTabIndex = 0;
    this.shareDialogVisible = true;
  }

  closeShareDialog() {
    this.shareDialogVisible = false;
    this.shareTargetReservation = null;
  }

  /** بناء رسالة افتراضية أنيقة */
  private buildShareMessage(r: any): string {
    const lines = [
      `تفاصيل الحجز:`,
      `- رقم الحجز: #${r?.referenceNumber ?? '-'}`,
      `- الضيف: ${r?.guestName ?? '-'}`,
      `- الليالي: ${r?.numberOfNights ?? '-'}`,
      `- الوصول: ${r?.arrivalDate ? formatDisplayDate(r.arrivalDate) : '-'
      }`,
      `- المغادرة: ${r?.departureDate ? formatDisplayDate(r.departureDate) : '-'
      }`,
    ];
    return lines.join('\n');
  }

  /** إرسال عبر البريد (بدون API حاليًا — فتح mailto). عند توفير API: استبدل بمكالمة service */
  submitShareEmail() {
    const email = (this.shareForm.get('email')?.value || '').trim();

    if (!email || this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    // Single
    if (this.shareMode === 'single' && this.shareTargetReservation?.id) {
      this.reservationService
        .shareReservationByEmail(this.shareTargetReservation.id, email)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إرسال الحجز عبر البريد الإلكتروني.',
            });
            this.closeShareDialog();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذر إرسال البريد. حاول مرة أخرى.',
            });
          },
        });
      return;
    }

    // Bulk
    if (this.shareMode === 'bulk' && this.shareBulkIds.length > 1) {
      this.reservationService
        .shareReservationsByEmail(this.shareBulkIds, email)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: `تم إرسال ${this.shareBulkIds.length} حجزًا عبر البريد الإلكتروني.`,
            });
            this.closeShareDialog();
            this.clearSelection();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذر إرسال البريد الجماعي. حاول مرة أخرى.',
            });
          },
        });
      return;
    }

    // لا يوجد هدف صالح
    this.messageService.add({
      severity: 'warn',
      summary: 'تنبيه',
      detail: 'لا يوجد حجز/حجوزات صالحة للإرسال.',
    });
  }
  /** تهيئة الرقم: شيل مسافات و "+" لأن الباك إند عايزها بدون "+" */
  private normalizePhoneForApi(input: string): string {
    return String(input || '')
      .replace(/\s+/g, '')
      .replace(/^\+/, '');
  }

  /** إرسال واتساب لحجز واحد عبر الـ API */
  /** إرسال واتساب لحجز واحد عبر الـ API + فتح لينك الواتساب من الريسبونس مباشرة */
  shareReservationViaWhatsappApi(): void {
    const phoneRaw = this.shareForm.get('whatsappNumber')?.value || '';
    const phone = this.normalizePhoneForApi(phoneRaw);

    if (
      this.shareForm.controls['whatsappNumber'].invalid ||
      !this.shareTargetReservation?.id
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'رقم غير صالح أو لا يوجد حجز محدد.',
      });
      return;
    }

    this.reservationService
      .shareReservationByWhatsapp(this.shareTargetReservation.id, phone)
      .subscribe({
        next: (res: any) => {
          const links = this.extractWhatsAppLinks(res);
          if (links.length) {
            // افتح لينك الواتساب
            this.openWhatsAppLink(links[0]);

            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم فتح واتساب بالرسالة الجاهزة.',
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'لم يتم العثور على رابط واتساب في الاستجابة.',
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'تعذر الإرسال عبر واتساب.',
          });
        },
      });
  }

  /** إرسال واتساب لأكثر من حجز عبر الـ API */
  /** إرسال واتساب لأكثر من حجز عبر الـ API + فتح كل روابط الواتساب من الريسبونس */
  shareReservationsViaWhatsappApi(): void {
    const phoneRaw = this.shareForm.get('whatsappNumber')?.value || '';
    const phone = this.normalizePhoneForApi(phoneRaw);

    if (
      this.shareForm.controls['whatsappNumber'].invalid ||
      this.shareBulkIds.length === 0
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'رقم غير صالح أو لا توجد حجوزات محددة.',
      });
      return;
    }

    this.bulkBusy = true;
    this.reservationService
      .shareReservationsByWhatsapp(this.shareBulkIds, phone)
      .subscribe({
        next: (res: any) => {
          const links = this.extractWhatsAppLinks(res);

          if (links.length) {
            this.openMultipleWhatsAppLinks(links);

            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: `تم فتح ${links.length} رابط واتساب.`,
            });
            this.closeShareDialog();
            this.clearSelection();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'تنبيه',
              detail: 'لم يتم العثور على روابط واتساب في الاستجابة.',
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'تعذر الإرسال الجماعي عبر واتساب.',
          });
        },
        complete: () => {
          this.bulkBusy = false;
        },
      });
  }

  /** زر الإرسال في التبويب يقرر يرسل مفرد أو جماعي */
  submitShareWhatsAppApi(): void {
    if (this.shareMode === 'single') {
      this.shareReservationViaWhatsappApi();
    } else {
      this.shareReservationsViaWhatsappApi();
    }
  }

  handleToolbarShare(): void {
    const selected = (this.selectedReservations || []).filter(Boolean);

    if (!selected.length) {
      this.messageService.add({
        severity: 'info',
        summary: 'معلومة',
        detail: 'اختر سجلًا للمشاركة',
      });
      return;
    }

    const ids = selected.map((r) => r?.id).filter(Boolean);
    if (ids.length > 1) {
      // فتح الحوار في وضع الإرسال الجماعي
      this.openShareDialog(null, ids);
    } else {
      // عنصر واحد
      this.openShareDialog(selected[0]);
    }
  }

  /** إرسال عبر واتساب (بدون API — فتح wa.me). عند توفير API: استبدل بمكالمة service */
  // submitShareWhatsApp() {
  //   const phone = (this.shareForm.get('whatsappNumber')?.value || '').trim();
  //   if (
  //     !this.shareTargetReservation ||
  //     !phone ||
  //     this.shareForm.get('whatsappNumber')?.invalid
  //   ) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'تحذير',
  //       detail: 'برجاء إدخال رقم صحيح.',
  //     });
  //     return;
  //   }

  //   const r = this.shareTargetReservation;
  //   const text = encodeURIComponent(this.buildShareMessage(r));

  //   // 👉 افتراضي الآن: رابط واتساب رسمي
  //   const url = `https://wa.me/${phone}?text=${text}`;
  //   window.open(url, '_blank');

  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'تم',
  //     detail: 'تم فتح واتساب لإرسال الرسالة.',
  //   });
  //   this.closeShareDialog();
  // }
  /** فتح لينك واتساب بأمان */
  private openWhatsAppLink(url: string) {
    if (!url) return;
    try {
      // فتح في تاب جديدة (أقل حجبًا من البوب أب)
      window.open(url, '_blank', 'noopener');
    } catch {
      // كـ fallback
      window.location.href = url;
    }
  }

  /** افتح عدة روابط واتساب (للجماعي) مع تأخير بسيط لتقليل حجب المتصفح */
  private openMultipleWhatsAppLinks(urls: string[]) {
    if (!Array.isArray(urls) || !urls.length) return;
    // افتح أول رابط فورًا
    this.openWhatsAppLink(urls[0]);

    // افتح الباقي بتأخير بسيط — ملاحظة: قد يحجب المتصفح فتح عدة تبويبات 👀
    const rest = urls.slice(1);
    rest.forEach((u, i) => {
      setTimeout(() => this.openWhatsAppLink(u), (i + 1) * 400);
    });
  }

  /** استخرج روابط واتساب من أي شكل محتمل للريسبونس (مرن للجماعي) */
  private extractWhatsAppLinks(res: any): string[] {
    if (!res) return [];

    // شكل مفرد: { response: { whatsAppLink } }
    if (res?.response?.whatsAppLink) {
      return [res.response.whatsAppLink];
    }
    if (res?.whatsAppLink) {
      return [res.whatsAppLink];
    }

    const links: string[] = [];

    // شكل Array من الردود
    if (Array.isArray(res)) {
      res.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    // شكل responses: [] أو items: []
    const bags = [res?.responses, res?.items, res?.data]?.filter(Array.isArray);
    if (bags?.length) {
      bags.forEach((arr: any[]) => {
        arr.forEach((item) => {
          const link = item?.response?.whatsAppLink || item?.whatsAppLink;
          if (link) links.push(link);
        });
      });
    }

    // شكل قاموسي { reservationId: { response: { whatsAppLink } } }
    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    // فلترة أي فراغات/تكرارات
    return Array.from(new Set(links.filter(Boolean)));
  }

  async exportCSV() {
    // ✅ المحدد > المفلتر > الكل
    const baseList = this.selectedReservations?.length
      ? this.selectedReservations
      : this.filteredReservations.length
        ? this.filteredReservations
        : this.reservations;

    if (!baseList?.length) return;

    // ✅ تحميل Lookups فقط عند طلب تصدير الإكسيل (Lazy on-demand)
    if (!this.roomTypeNameById.size && !this.clientCompanyNameById.size) {
      await this.ensureLookupsLoadedForExport();
    }

    // ✅ هنجلب كل حجز كامل (علشان entries)
    const fullReservations: any[] = await Promise.all(
      baseList.map((r: any) =>
        firstValueFrom(this.reservationService.getById(r.id))
      )
    );

    // ✅ الأعمدة (غرفة + خدمة في نفس الصف) + أعمدة الإجماليات في آخر الجدول
    const cols = [
      'referenceNumber',
      'reservationType',
      'guestName',
      'numberOfNights',
      'arrivalDate',
      'departureDate',
      'createdAt',
      'isConfirmed',

      // ===== Room columns (أسماء بدل IDs) =====
      'roomType', // ⬅️ بدل roomTypeId
      'numberOfRooms',
      'roomRate',
      'roomCost',
      'reservationMeal', // ⬅️ بدل reservationMealId
      'mealRate',
      'mealCost',
      'reservationView', // ⬅️ بدل reservationViewId
      'viewRate',
      'viewCost',

      // ===== Service columns (أسماء بدل IDs) =====
      'reservationService', // ⬅️ بدل reservationServiceId
      'description',
      'quantity',
      'salesPrice',
      'costPrice',
      'reservationSupplier', // ⬅️ بدل reservationSupplierId

      // ===== Totals =====
      'totalSales',
      'totalCost',
      'profit',
      'reservationTotal',
    ];
    const header = cols.join(',');

    const lines: string[] = [];

    // 🔢 Helper آمن للأرقام
    const num = (v: any) => {
      const n = Number(v);
      return isFinite(n) ? n : 0;
    };

    for (const r of fullReservations) {
      const nights = num(r?.numberOfNights);

      const rooms: any[] = Array.isArray(r?.reservationRoomEntries)
        ? (r.reservationRoomEntries as any[])
        : [];
      const services: any[] = Array.isArray(r?.reservationServiceEntries)
        ? (r.reservationServiceEntries as any[])
        : [];

      // ===== احسب إجمالي المبيعات والتكلفة (غرف) =====
      let totalRoomSales = 0;
      let totalRoomCost = 0;

      for (const room of rooms) {
        const nRooms = num(room?.numberOfRooms);
        const roomRate = num(room?.roomRate);
        const roomCost = num(room?.roomCost);
        const mealRate = num(room?.mealRate);
        const mealCost = num(room?.mealCost);
        const viewRate = num(room?.viewRate);
        const viewCost = num(room?.viewCost);

        // مبيعات الغرفة (تقديريًا لكل غرفة/ليلة)
        const roomSales =
          nRooms * nights * roomRate +
          nRooms * nights * mealRate +
          nRooms * nights * viewRate;

        // تكلفة الغرفة
        const roomCosts =
          nRooms * nights * roomCost +
          nRooms * nights * mealCost +
          nRooms * nights * viewCost;

        totalRoomSales += roomSales;
        totalRoomCost += roomCosts;
      }

      // ===== احسب إجمالي المبيعات والتكلفة (خدمات) =====
      let totalServiceSales = 0;
      let totalServiceCost = 0;

      for (const srv of services) {
        totalServiceSales += num(srv?.quantity) * num(srv?.salesPrice);
        totalServiceCost += num(srv?.quantity) * num(srv?.costPrice);
      }

      // ===== إجماليات الحجز =====
      const totalSales = totalRoomSales + totalServiceSales;
      const totalCost = totalRoomCost + totalServiceCost;
      const profit = totalSales - totalCost;

      // reservationTotal = alias لـ totalSales
      const reservationTotal = totalSales;

      // بيانات الحجز الأساسية (تظهر في أول سطر فقط — دمج بصري)
      const base = [
        r.referenceNumber ?? '',
        r.reservationType ?? '',
        r.guestName ?? '', // ✅ العربي مضبوط بفضل BOM
        r.numberOfNights ?? '',
        r.arrivalDate ? new Date(r.arrivalDate).toISOString().slice(0, 10) : '',
        r.departureDate
          ? new Date(r.departureDate).toISOString().slice(0, 10)
          : '',
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.isConfirmed ?? !!r.transactionId ? 'true' : 'false',
      ];
      const baseEmpty = new Array(base.length).fill('');
      let basePrinted = false;

      // هنطلع صفوف بعدد الأكبر من (الغرف، الخدمات)
      const maxLen = Math.max(rooms.length, services.length);

      if (maxLen === 0) {
        // لا غرف ولا خدمات → صف واحد بالحجز + الإجماليات
        const row = [
          ...base,
          // Room
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          // Service
          '',
          '',
          '',
          '',
          '',
          '',
          // Totals
          totalSales.toFixed(2),
          totalCost.toFixed(2),
          profit.toFixed(2),
          reservationTotal.toFixed(2),
        ];
        lines.push(
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
        );
        continue;
      }

      for (let i = 0; i < maxLen; i++) {
        const room = rooms[i];
        const srv = services[i];

        // ===== أسماء بدل IDs (مع fallback من الكائنات والـ DTO) =====
        const roomTypeName = room
          ? (this.activeLanguage === 'en' ? (room.roomTypeEnglishName || room.roomTypeArabicName) : (room.roomTypeArabicName || room.roomTypeEnglishName)) ||
            this.nameFromIdOrObj(
              room?.roomTypeId,
              room?.roomType,
              this.roomTypeNameById
            )
          : '';
        const mealName = room
          ? (this.activeLanguage === 'en' ? (room.reservationMealEnglishName || room.reservationMealArabicName) : (room.reservationMealArabicName || room.reservationMealEnglishName)) ||
            this.nameFromIdOrObj(
              room?.reservationMealId,
              room?.reservationMeal,
              this.mealNameById
            )
          : '';
        const viewName = room
          ? (this.activeLanguage === 'en' ? (room.reservationViewEnglishName || room.reservationViewArabicName) : (room.reservationViewArabicName || room.reservationViewEnglishName)) ||
            this.nameFromIdOrObj(
              room?.reservationViewId,
              room?.reservationView,
              this.viewNameById
            )
          : '';

        const serviceName = srv
          ? (this.activeLanguage === 'en' ? (srv.reservationServiceEnglishName || srv.reservationServiceArabicName) : (srv.reservationServiceArabicName || srv.reservationServiceEnglishName)) ||
            this.nameFromIdOrObj(
              srv?.reservationServiceId,
              srv?.reservationService,
              this.resServiceNameById
            )
          : '';
        const supplierName = srv
          ? (this.activeLanguage === 'en' ? (srv.reservationSupplierEnglishName || srv.reservationSupplierArabicName) : (srv.reservationSupplierArabicName || srv.reservationSupplierEnglishName)) ||
            this.nameFromIdOrObj(
              srv?.reservationSupplierId,
              srv?.reservationSupplier,
              this.supplierNameById
            )
          : '';

        const row = [
          ...(basePrinted ? baseEmpty : base),

          // ===== Room (أسماء بدل IDs) =====
          roomTypeName,
          room?.numberOfRooms ?? '',
          room?.roomRate ?? '',
          room?.roomCost ?? '',
          mealName,
          room?.mealRate ?? '',
          room?.mealCost ?? '',
          viewName,
          room?.viewRate ?? '',
          room?.viewCost ?? '',

          // ===== Service (أسماء بدل IDs) =====
          serviceName,
          srv?.description ?? '',
          srv?.quantity ?? '',
          srv?.salesPrice ?? '',
          srv?.costPrice ?? '',
          supplierName,

          // ===== Totals (مكررة في كل صف للحجز كـ "دمج بصري") =====
          totalSales.toFixed(2),
          totalCost.toFixed(2),
          profit.toFixed(2),
          reservationTotal.toFixed(2),
        ];

        lines.push(
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
        );
        basePrinted = true;
      }
    }

    // ✅ BOM علشان العربي يظهر مظبوط في Excel
    const BOM = '\uFEFF';
    const csv = BOM + [header, ...lines].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reservations-merged-rows.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ========== صلاحيات ==========
  public hasPermission(permission: string): boolean {
    return this.userPermissions.some((x) => x.name === permission);
  }

  // ========== دوال قديمة للـ p-table ==========
  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains');
  }

  // ========== API Actions ==========
  deleteReservation(reservation: ReservationModel) {
    this.loading = true;
    this.reservationService.delete(reservation.id).subscribe(() => {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.RESERVATION_DELETED'),
      });
      this.loadReservations();
    });
  }

  confirmReservationDeletion(event: Event, reservation: ReservationModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_DELETE', {
        referenceNumber: reservation.referenceNumber,
      }),
      header: this.translate.instant('FINANCE.RESERVATION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservation(reservation);
      },
    });
  }

  navigateToAddReservation() {
    if (this.isFrontal) {
      this.router.navigate(['/reservations/frontal-new']);
    } else {
      this.router.navigate(['/reservations/new']);
    }
  }
  /** نسخ الحجز: انتقل لصفحة إنشاء جديد مع تمرير copyId كـ Query Param */
  copyReservation(entry: any) {
    const id = typeof entry === 'string' ? entry : entry?.id;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'لا يمكن نسخ هذا الحجز.',
      });
      return;
    }

    // لو القائمة الحالية واجهة Frontal نروح لمسار frontal-new
    const targetUrl = this.isFrontal
      ? '/reservations/frontal-new'
      : '/reservations/new';

    this.router.navigate([targetUrl], {
      queryParams: { copyId: id },
    });
  }

  reactivateReservation(entry: any) {
    const id = typeof entry === 'string' ? entry : entry?.id;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: this.translate.instant('RESERVATION.REACTIVATE_FAILED'),
      });
      return;
    }

    this.reservationService.reactivateReservation(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('RESERVATION.REACTIVATE_SUCCESS'),
        });
        this.loadReservations();
      },
      error: (error) => {
        console.error('Error reactivating reservation:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: error.error?.message || this.translate.instant('RESERVATION.REACTIVATE_FAILED'),
        });
      },
    });
  }

  isSendingToFrontal = false;

  sendToFrontal(reservation: ReservationModel) {
    if (!reservation || reservation.isFrontal || this.isSendingToFrontal) return;

    this.isSendingToFrontal = true;
    this.reservationService.makeFrontal(reservation.id).subscribe({
      next: () => {
        this.isSendingToFrontal = false;
        reservation.isFrontal = true;
        if (this.selectedEntry) {
          this.selectedEntry.isFrontal = true;
        }

        const msg = this.translate.instant('FINANCE.RESERVATION_MADE_FRONTAL_SUCCESS');
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS') || 'نجاح',
          detail: msg !== 'FINANCE.RESERVATION_MADE_FRONTAL_SUCCESS' ? msg : 'تم إرسال الحجز إلى الواجهة بنجاح',
        });
        this.loadReservations();
      },
      error: (error) => {
        this.isSendingToFrontal = false;
        console.error('Error making reservation frontal:', error);
        const errorMsg = this.translate.instant('FINANCE.ERROR_MAKING_RESERVATION_FRONTAL');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: errorMsg !== 'FINANCE.ERROR_MAKING_RESERVATION_FRONTAL' ? errorMsg : 'حدث خطأ أثناء إرسال الحجز إلى الواجهة',
        });
      },
    });
  }

  navigateToReservation(reservation: ReservationModel) {
    const targetPath = this.isFrontal
      ? ['/reservations/frontal', reservation.id]
      : ['/reservations', reservation.id];
    this.router.navigate(targetPath);
  }

  confirmReservationCreateTransaction(
    event: Event,
    reservation: ReservationModel
  ) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant(
        'FINANCE.CONFIRM_RESERVATION_CREATE_TRANSACTION',
        {
          referenceNumber: reservation.referenceNumber,
        }
      ),
      header: this.translate.instant(
        'FINANCE.RESERVATION_CREATE_TRANSACTION_CONFIRMATION'
      ),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-success p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.createTransaction(reservation.id);
      },
    });
  }

  confirmReservationSendToZatca(event: Event, reservation: ReservationModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant(
        'FINANCE.CONFIRM_RESERVATION_SEND_TO_ZATCA',
        {
          referenceNumber: reservation.referenceNumber,
        }
      ),
      header: this.translate.instant(
        'FINANCE.RESERVATION_SEND_TO_ZATCA_CONFIRMATION'
      ),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-success p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.sendToZatca(reservation.id);
      },
    });
  }

  createTransaction(id: string) {
    this.loading = true;

    this.reservationService.createTransaction(id).subscribe({
      next: () => {
        this.loadReservations();
      },
      error: () => {
        alert(this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  sendToZatca(id: string) {
    this.loading = true;

    this.reservationService.sendToZatca(id).subscribe({
      next: () => {
        this.loadReservations();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR'),
        });
        this.loading = false;
      },
    });
  }

  printDocument(id: string): void {
    this.reservationService.printDocument(id);
  }
  downloadDocument(id: string, refNum?: string): void {
    this.reservationService.downloadDocument(id, refNum);
  }

  printCostSheet(id: string): void {
    this.reservationService.printCostSheet(id);
  }
  downloadCostSheet(id: string, refNum?: string): void {
    this.reservationService.downloadCostSheet(id, refNum);
  }

  printHotelRequest(id: string): void {
    this.reservationService.printHotelRequest(id);
  }
  downloadHotelRequest(id: string, refNum?: string): void {
    this.reservationService.downloadHotelRequest(id, refNum);
  }

  // ========== Helpers للاختيار ==========
  private getSelected(): any[] {
    return (this.selectedReservations || []).filter(Boolean);
  }

  get canBulkCreateSalesInvoices(): boolean {
    const selected = this.getSelected();
    if (!selected || selected.length === 0) return false;
    return selected.every((r: any) => !r.isCancelled && r.isConfirmed && !r.hasSalesInvoice);
  }
  private getSelectedIds(): string[] {
    return this.getSelected()
      .map((r: any) => r?.id)
      .filter((x: any) => !!x);
  }

  clearSelection() {
    this.selectedReservations = [];
  }

  // ========== إرسال جماعي إلى ZATCA (يتجاهل المرسلة مسبقًا) ==========
  async sendManyToZatcaLoop() {
    const selected = this.getSelected();
    if (!selected.length) return;

    const toSend = selected.filter((r) => !r?.isSentToZatca);
    const skipped = selected.length - toSend.length;

    if (!toSend.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: 'كل العناصر المحددة مرسلة مسبقًا إلى ZATCA.',
      });
      return;
    }

    this.bulkBusy = true;
    let success = 0,
      fail = 0;

    try {
      for (const r of toSend) {
        try {
          await firstValueFrom(this.reservationService.sendToZatca(r.id));
          success++;
        } catch {
          fail++;
        }
      }

      // ملخص
      const parts: string[] = [];
      if (success) parts.push(`تم إرسال ${success} عنصر`);
      if (fail) parts.push(`فشل ${fail} عنصر`);
      if (skipped) parts.push(`تم تجاهل ${skipped} (مرسلة مسبقًا)`);

      this.messageService.add({
        severity: fail ? 'warn' : 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: parts.join('، '),
      });

      this.loadReservations();
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }

  // ========== تأكيد الحذف الجماعي ==========
  confirmBulkDeletion(event: Event) {
    const count = this.getSelected().length;
    if (!count) return;

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `هل تريد حذف ${count} حجزاً؟`,
      header: 'تأكيد حذف جماعي',
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => this.bulkDeleteReservations(),
    });
  }

  // ========== حذف جماعي (يتجاهل المرسلة لـ ZATCA) ==========
  async bulkDeleteReservations() {
    const selected = this.getSelected();
    if (!selected.length) return;

    const toDelete = selected.filter((r) => !r?.isSentToZatca);
    const skipped = selected.length - toDelete.length;

    if (!toDelete.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: 'لا يمكن حذف العناصر المحددة لأنها مرسلة إلى ZATCA.',
      });
      return;
    }

    this.bulkBusy = true;
    let success = 0,
      fail = 0;

    try {
      for (const r of toDelete) {
        try {
          await firstValueFrom(this.reservationService.delete(r.id));
          success++;
        } catch {
          fail++;
        }
      }

      const parts: string[] = [];
      if (success) parts.push(`تم حذف ${success} عنصر`);
      if (fail) parts.push(`فشل حذف ${fail} عنصر`);
      if (skipped) parts.push(`تم تجاهل ${skipped} (مرسلة لـ ZATCA)`);

      this.messageService.add({
        severity: fail ? 'warn' : 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: parts.join('، '),
      });

      this.loadReservations();
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }

  // ===== طباعة/تنزيل جماعي — باستخدام لوب على الدوال الفردية =====
  // مستندات
  bulkPrintDocuments() {
    const ids = this.getSelectedIds();
    if (!ids.length) return;
    this.bulkBusy = true;
    try {
      for (const id of ids) {
        this.reservationService.printDocument(id);
      }
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: 'تم إرسال المستندات للطباعة',
      });
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }
  bulkDownloadDocuments() {
    const selected = this.getSelected();
    if (!selected.length) return;
    this.bulkBusy = true;
    try {
      const showToast = selected.length === 1;
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'info',
          summary: 'تجهيز',
          detail: this.translate.instant('FINANCE.PREPARING_DOCUMENTS'),
          life: 4000
        });
      }
      for (const item of selected) {
        this.reservationService.downloadDocument(item.id, item.referenceNumber, showToast);
      }
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'success',
          summary: 'تم',
          detail: this.translate.instant('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS'),
          life: 3500
        });
      }
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }

  // إثباتات التكلفة
  bulkPrintCostSheets() {
    const ids = this.getSelectedIds();
    if (!ids.length) return;
    this.bulkBusy = true;
    try {
      for (const id of ids) {
        this.reservationService.printCostSheet(id);
      }
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: 'تم إرسال إثباتات التكلفة للطباعة',
      });
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }
  bulkDownloadCostSheets() {
    const selected = this.getSelected();
    if (!selected.length) return;
    this.bulkBusy = true;
    try {
      const showToast = selected.length === 1;
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'info',
          summary: 'تجهيز',
          detail: this.translate.instant('FINANCE.PREPARING_DOCUMENTS'),
          life: 4000
        });
      }
      for (const item of selected) {
        this.reservationService.downloadCostSheet(item.id, item.referenceNumber, showToast);
      }
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'success',
          summary: 'تم',
          detail: this.translate.instant('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS'),
          life: 3500
        });
      }
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }

  // طلبات الفندق
  bulkPrintHotelRequests() {
    const ids = this.getSelectedIds();
    if (!ids.length) return;
    this.bulkBusy = true;
    try {
      for (const id of ids) {
        this.reservationService.printHotelRequest(id);
      }
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: 'تم إرسال طلبات الفندق للطباعة',
      });
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }
  bulkDownloadHotelRequests() {
    const selected = this.getSelected();
    if (!selected.length) return;
    this.bulkBusy = true;
    try {
      const showToast = selected.length === 1;
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'info',
          summary: 'تجهيز',
          detail: this.translate.instant('FINANCE.PREPARING_DOCUMENTS'),
          life: 4000
        });
      }
      for (const item of selected) {
        this.reservationService.downloadHotelRequest(item.id, item.referenceNumber, showToast);
      }
      if (!showToast) {
        this.messageService.clear();
        this.messageService.add({
          severity: 'success',
          summary: 'تم',
          detail: this.translate.instant('FINANCE.DOCUMENTS_DOWNLOADED_SUCCESS'),
          life: 3500
        });
      }
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
  }

  bulkCreateSalesInvoices(): void {
    const ids = this.getSelectedIds();
    if (!ids.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: 'لم يتم تحديد أي حجوزات.',
      });
      return;
    }

    // Validate that all selected reservations belong to the same client company
    const selected = this.getSelected();

    // Check if any reservation already has an invoice
    const alreadyInvoiced = selected.some(res => res?.hasSalesInvoice);
    if (alreadyInvoiced) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail: 'عذراً، بعض الحجوزات المحددة تمت فوترتها مسبقاً. يرجى إلغاء تحديدها والمحاولة مرة أخرى.',
      });
      return;
    }

    if (selected.length > 1) {
      const firstCompanyId = selected[0]?.reservationClientCompanyId || selected[0]?.reservationCompanyId || selected[0]?.hotelId || null;
      const firstGuestName = selected[0]?.guestName;
      
      for (const res of selected) {
        const currentCompanyId = res?.reservationClientCompanyId || res?.reservationCompanyId || res?.hotelId || null;
        
        if (currentCompanyId !== firstCompanyId) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
            detail: 'لا يمكن إنشاء فاتورة مجمعة لحجوزات تابعة لشركات أو فنادق مختلفة. يرجى اختيار حجوزات تابعة لنفس الشركة.',
          });
          return;
        }

        // If no company exists, they must at least have the same guest name
        if (!firstCompanyId && res?.guestName !== firstGuestName) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
            detail: 'لا يمكن إنشاء فاتورة مجمعة لحجوزات بأسماء ضيوف مختلفين في حال عدم وجود شركة.',
          });
          return;
        }
      }
    }

    // بدلاً من الإنشاء مباشرة، ننتقل لصفحة إنشاء الفاتورة لمعاينتها أولاً
    this.router.navigate(['/invoices/new'], {
      queryParams: { reservationIds: ids },
    });
  }
  // ✅ إنشاء قيود يومية جماعياً (Loop على createTransaction)
  async bulkCreateTransactions() {
    const selected = (this.selectedReservations || []) as any[];
    // تجاهل العناصر المؤكدة أصلاً
    const toCreate = selected.filter(
      (r) => !(r?.isConfirmed ?? !!r?.transactionId)
    );

    if (!selected.length) return;
    if (!toCreate.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: 'كل العناصر المحددة لديها قيود بالفعل.',
      });
      return;
    }

    this.bulkBusy = true;
    let success = 0;
    let fail = 0;

    try {
      for (const r of toCreate) {
        try {
          await firstValueFrom(this.reservationService.createTransaction(r.id));
          success++;
        } catch {
          fail++;
        }
      }

      const skipped = selected.length - toCreate.length;
      const parts: string[] = [];
      if (success) parts.push(`تم إنشاء ${success} قيد`);
      if (fail) parts.push(`فشل ${fail} قيد`);
      if (skipped) parts.push(`تم تجاهل ${skipped} (لديها قيود مسبقًا)`);

      this.messageService.add({
        severity: fail ? 'warn' : 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: parts.join('، '),
      });

      this.loadReservations();
    } finally {
      this.bulkBusy = false;
      this.clearSelection();
    }
    // انتقل للـ form
    const billableIds = toCreate.map(r => r.id);
    this.router.navigate(['/invoices/new'], {
      queryParams: { reservationIds: billableIds },
    });
  }

  async createSalesInvoiceFromReservation(reservation: any) {
    // الانتقال لمعاينة الفاتورة قبل إنشائها فعلياً
    this.router.navigate(['/invoices/new'], {
      queryParams: { reservationId: reservation.id },
    });
  }

  viewSalesInvoice(reservation: any) {
    if (reservation?.salesInvoiceId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/invoices/reservation-details', reservation.salesInvoiceId])
      );
      window.open(url, '_blank');
    }
  }

  confirmReservation(entry: any): void {
    if (!entry?.id) return;
    this.reservationService.confirmReservation(entry.id).subscribe({
      next: () => {
        entry.isConfirmed = true;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
          detail: this.translate.instant('FINANCE.RESERVATION_CONFIRMED_SUCCESS') || 'تم تأكيد الحجز بنجاح ✅',
        });
        this.loadReservations();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: err?.error?.message || 'تعذر تأكيد الحجز',
        });
      }
    });
  }

  cancelReservation(entry: any): void {
    if (!entry?.id) return;
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_CANCEL_RESERVATION_MSG') || 'هل أنت تأكد من رغبتك في إلغاء هذا الحجز؟',
      header: this.translate.instant('FINANCE.CANCEL_RESERVATION') || 'إلغاء الحجز',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('FINANCE.YES') || 'نعم',
      rejectLabel: this.translate.instant('FINANCE.NO') || 'لا',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm',
      defaultFocus: 'accept',
      accept: () => {
        this.reservationService.cancelReservation(entry.id).subscribe({
          next: () => {
            entry.isCancelled = true;
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
              detail: this.translate.instant('FINANCE.RESERVATION_CANCELLED_SUCCESS') || 'تم إلغاء الحجز بنجاح ✅',
            });
            this.loadReservations();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
              detail: err?.error?.message || 'تعذر إلغاء الحجز',
            });
          }
        });
      }
    });
  }
}
