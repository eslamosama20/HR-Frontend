import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ReservationService } from '../../../services/reservations/reservation.service';
import { HotelService } from '../../../services/hotels/hotel.service';
import { RoomTypeService } from '../../../services/room-type/room-type.service';
import { ReservationViewService } from '../../../services/reservations/reservation-view.service';
import { ReservationCompanyService } from '../../../services/reservations/reservation-company.service';
import { ReservationModel } from '../../../models/accounting/reservation-model';
import { PaymentReceiptsService } from '../../../services/receipts/payment-receipts.service';
import { SalesInvoiceService } from '../../../services/salesInvoice/sales-invoice.service';
import { catchError, map } from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { getSystemNow } from '../../../utils/dateUtils';

type MetricKey =
  | 'allotment'
  | 'overHotel'
  | 'overAgent'
  | 'direct'
  | 'agent'
  | 'totalReserved'
  | 'confirmed'
  | 'notConfirmed'
  | 'totalBooked'
  | 'saleAllotment'
  | 'totalBalance'
  | 'noShow'
  | 'deleted'
  | 'web'
  | 'checkIn'
  | 'checkOut'
  | 'inHouse'
  | 'inHouseSale'
  | 'occupancyPct'
  | 'avgRoomRate';
type TabKey =
  | 'summary'
  | 'saleAllotments'
  | 'balance'
  | 'arrivalsByHotel'
  | 'roomingAvailability'
  | 'roomingList'
  | 'arrivalsDetail'
  | 'dailyReport'
  | 'departuresDetail';

interface MetricRow {
  key: MetricKey;
  label: string;
  rowClass?: string;
}

interface HotelBalanceRow {
  sn: number | string;
  hotelId: string;
  hotelName: string;
  capacity: number;
  values: number[];
}
interface ArrivalRow {
  sn: number | string;
  hotelId: string;
  hotelName: string;
  values: number[]; // عدد الغرف الواصلة في كل يوم
}
interface DailySummaryRow {
  roomType: string;
  stock: number;
  arrival: number;
  inHouse: number;
  departure: number;
  balance: number;
}

interface RoomingRow {
  label: string;
  values: number[];
  isPercent?: boolean;
}
interface RoomingTable {
  hotelId: string;
  hotelName: string;
  fromDate: Date;
  columns: string[];
  rows: RoomingRow[];
}

interface RoomingListRow {
  sn: number;
  hotelId: string;
  hotelName: string;
  guestName: string;
  roomTypeLines: string[];
  checkIn: Date;
  checkOut: Date;
  hotelReservationNo: string;
  roomNo?: string;
  paymentMethod?: string;
}

interface RoomingListGroup {
  hotelId: string;
  hotelName: string;
  rows: RoomingListRow[];
}
interface ArrivalsRow {
  serial: number;
  state: string;
  rsvNo: string;
  from: Date;
  till: Date;
  hotelReservationNo: string;
  guestName: string;
  hotelName: string;
  agentName: string;
  nationality: string;
  roomTypeLines: string[];
  totalRooms: number;

  // === جديد للفلاتر الدقيقة ===
  reservationType: string;   // AgentDirect / Allotment / Direct
  isCancelled: boolean;      // من r.isCancelled
  roomTypeIds: string[];     // من reservationRoomEntries[].roomTypeId
  viewIds: string[];         // من reservationRoomEntries[].reservationViewId
  minRoomRate: number;       // أدنى roomRate داخل entries
  maxRoomRate: number;       // أعلى roomRate داخل entries
}

type DeparturesRow = ArrivalsRow;


@Component({
  selector: 'app-reservation-reports',
  standalone: true,
 imports: [CommonModule, ReactiveFormsModule, TranslateModule],

  templateUrl: './reservation-reports.component.html',
  styleUrls: ['./reservation-reports.component.scss'],
})
export class ReservationReportsComponent {
  private dp = new DatePipe('en-US');
private companyNameById = new Map<string, string>();
private viewNameById = new Map<string, string>();
private paymentMethodByReservationId = new Map<string, string>();
private paymentMethodByInvoiceId = new Map<string, string>();
private paymentMethodByReservationIdFromInvoice = new Map<string, string>();

arrivalsDetailRows: ArrivalsRow[] = [];

departuresDetailRows: DeparturesRow[] = [];
departuresDetailRowsView: DeparturesRow[] = [];

departuresFilters = {
  from: null as Date | null,
  to: null as Date | null,
  hotelId: '',
  companyName: '',
  nationality: '',
  roomTypeQuery: '',
  search: '',
  viewId: '',
  roomTypeId: '',
  reservationType: '',
  cancelled: '' as '' | 'active' | 'cancelled',
  minRooms: '',
  maxRooms: '',
  minRate: '',
  maxRate: '',
};

  isLoading = true;
  isLoaded = false;

  reservations: ReservationModel[] = [];
  purchases: any[] = []; // بيانات المشتريات (allotment)
arrivalRowsView: ArrivalRow[] = [];
arrivalDatesView: Date[] = [];
arrivalTotalsView: number[] = [];

  private hotelsLookup: any[] = [];
  private roomTypesLookup: any[] = [];
private viewsLookup: any[] = [];

dailyFilters = {
  date: null as Date | null,
  hotelId: ''
};

dailySummaryRows: DailySummaryRow[] = [];
dailyArrivalsRowsView: ArrivalsRow[] = [];
dailyHotelName = '';

/** لقوائم الفلترة في الـ HTML */
get roomTypesForFilter(): any[] { return this.roomTypesLookup ?? []; }
get viewsForFilter(): any[] { return this.viewsLookup ?? []; }

  private hotelNameById = new Map<string, string>();
  private sourceNameById = new Map<string, string>();
roomingTables: RoomingTable[] = [];
  headerDates = signal<Date[]>([]);
  dayName = (d: Date) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return this.translate.instant('RESERVATION_REPORTS.' + days[d.getDay()]);
  };
  dateShort = (d: Date) => this.dp.transform(d, 'dd/MM/yyyy') ?? '';
  dateShortNoYear = (d: Date) => this.dp.transform(d, 'dd/MM') ?? '';
  dateIso = (d: Date) => this.dp.transform(d, 'dd/MM/yyyy') ?? '';

  get infoRows() {
    return [
      { label: this.translate.instant('RESERVATION_REPORTS.DATE_COL'), value: (d: Date) => this.dateShort(d) },
      { label: this.translate.instant('RESERVATION_REPORTS.DAY'), value: (d: Date) => this.dayName(d) },
      { label: this.translate.instant('RESERVATION_REPORTS.EVENT'), value: (d: Date) => this.dp.transform(d, 'dd/MM/yyyy') ?? '' },
    ];
  }

  get metricRows(): MetricRow[] {
    return [
      { key: 'allotment', label: this.translate.instant('RESERVATION_REPORTS.ALLOTMENT') },
      { key: 'overHotel', label: this.translate.instant('RESERVATION_REPORTS.OVER_HOTEL') },
      { key: 'overAgent', label: this.translate.instant('RESERVATION_REPORTS.OVER_AGENT') },
      { key: 'direct', label: this.translate.instant('RESERVATION_REPORTS.DIRECT_METRIC') },
      { key: 'agent', label: this.translate.instant('RESERVATION_REPORTS.AGENT_METRIC') },
      { key: 'totalReserved', label: this.translate.instant('RESERVATION_REPORTS.TOTAL_RESERVED'), rowClass: 'bg-purple' },
      { key: 'confirmed', label: this.translate.instant('RESERVATION_REPORTS.CONFIRMED'), rowClass: 'bg-yellow' },
      { key: 'notConfirmed', label: this.translate.instant('RESERVATION_REPORTS.NOT_CONFIRMED'), rowClass: 'bg-yellow' },
      { key: 'totalBooked', label: this.translate.instant('RESERVATION_REPORTS.TOTAL_BOOKED'), rowClass: 'bg-pink' },
      { key: 'saleAllotment', label: this.translate.instant('RESERVATION_REPORTS.SALE_ALLOTMENT') },
      { key: 'totalBalance', label: this.translate.instant('RESERVATION_REPORTS.TOTAL_BALANCE'), rowClass: 'bg-green' },
      { key: 'noShow', label: this.translate.instant('RESERVATION_REPORTS.NO_SHOW') },
      { key: 'deleted', label: this.translate.instant('RESERVATION_REPORTS.DELETED') },
      { key: 'web', label: this.translate.instant('RESERVATION_REPORTS.WEB') },
      { key: 'checkIn', label: this.translate.instant('RESERVATION_REPORTS.CHECK_IN') },
      { key: 'checkOut', label: this.translate.instant('RESERVATION_REPORTS.CHECK_OUT') },
      { key: 'inHouse', label: this.translate.instant('RESERVATION_REPORTS.IN_HOUSE') },
      { key: 'inHouseSale', label: this.translate.instant('RESERVATION_REPORTS.IN_HOUSE_SALE') },
      { key: 'occupancyPct', label: this.translate.instant('RESERVATION_REPORTS.OCCUP_PCT') },
      { key: 'avgRoomRate', label: this.translate.instant('RESERVATION_REPORTS.AVG_ROOM_RATE'), rowClass: 'bg-red' },
    ];
  }

  data: Record<MetricKey, number[]> = {
    allotment: [],
    overHotel: [],
    overAgent: [],
    direct: [],
    agent: [],
    totalReserved: [],
    confirmed: [],
    notConfirmed: [],
    totalBooked: [],
    saleAllotment: [],
    totalBalance: [],
    noShow: [],
    deleted: [],
    web: [],
    checkIn: [],
    checkOut: [],
    inHouse: [],
    inHouseSale: [],
    occupancyPct: [],
    avgRoomRate: [],
  };
balanceDatesView: Date[] = [];
balanceRowsView: HotelBalanceRow[] = [];
balanceTotalsView: number[] = [];

  hotelBalanceRows: HotelBalanceRow[] = [];
  hotelBalanceTotals: number[] = [];
arrivalRows: ArrivalRow[] = [];
arrivalTotals: number[] = [];
roomingListGroups: RoomingListGroup[] = [];
roomingListGroupsView: RoomingListGroup[] = [];

activeTab: TabKey = 'summary';
/** ====== Filters (Arrivals during period) ====== */
filters = {
  from: null as Date | null,
  to: null as Date | null,
  hotelId: '',
  companyName: '',
  nationality: '',
  roomTypeQuery: '',
  search: '',

  // ⬇️ جديد
  viewId: '',
  roomTypeId: '',
  reservationType: '',
  cancelled: '' as '' | 'active' | 'cancelled',
  minRooms: '',
  maxRooms: '',
  minRate: '',
  maxRate: '',
};
arrivalByHotelFilters = {
  from: null as Date | null,
  to: null as Date | null,
  hotelId: '',
  min: '',
  max: '',
  search: '',
  hideEmpty: false
};
setDeparturesFilter(key: keyof typeof this.departuresFilters, val: any) {
  (this.departuresFilters as any)[key] = val?.trim?.() ?? val;
  this.applyDeparturesFilters();
}

onDeparturesFilterDate(which: 'from' | 'to', value: string) {
  this.departuresFilters[which] = this.parseDateInput(value);
  this.applyDeparturesFilters();
}

resetDeparturesFilters() {
  this.departuresFilters = {
    from: null, to: null,
    hotelId: '',
    companyName: '',
    nationality: '',
    roomTypeQuery: '',
    search: '',
    viewId: '',
    roomTypeId: '',
    reservationType: '',
    cancelled: '',
    minRooms: '',
    maxRooms: '',
    minRate: '',
    maxRate: '',
  };
  this.applyDeparturesFilters();
}
private applyDeparturesFilters() {
  let rows = this.departuresDetailRows.slice();

  // التاريخ: نعتمد تاريخ المغادرة r.till
  if (this.departuresFilters.from) {
    rows = rows.filter(r =>
      this.startOfDay(r.till) >= this.startOfDay(this.departuresFilters.from!)
    );
  }
  if (this.departuresFilters.to) {
    rows = rows.filter(r =>
      this.startOfDay(r.till) <= this.startOfDay(this.departuresFilters.to!)
    );
  }

  // الفندق
  if (this.departuresFilters.hotelId) {
    const wanted = this.hotelNameBy(this.departuresFilters.hotelId);
    rows = rows.filter(r => r.hotelName === wanted);
  }

  // الشركة
  if (this.departuresFilters.companyName) {
    const q = this.departuresFilters.companyName.toLowerCase();
    rows = rows.filter(r => (r.agentName || '').toLowerCase().includes(q));
  }

  // الجنسية
  if (this.departuresFilters.nationality) {
    const q = this.departuresFilters.nationality.toLowerCase();
    rows = rows.filter(r => (r.nationality || '').toLowerCase().includes(q));
  }

  // نوع الغرفة (نصي)
  if (this.departuresFilters.roomTypeQuery) {
    const q = this.departuresFilters.roomTypeQuery.toLowerCase();
    rows = rows.filter(r => (r.roomTypeLines || []).some(line => (line || '').toLowerCase().includes(q)));
  }

  // View by ID
  if (this.departuresFilters.viewId) {
    rows = rows.filter(r => (r.viewIds || []).includes(this.departuresFilters.viewId));
  }

  // RoomType by ID
  if (this.departuresFilters.roomTypeId) {
    rows = rows.filter(r => (r.roomTypeIds || []).includes(this.departuresFilters.roomTypeId));
  }

  // Type
  if (this.departuresFilters.reservationType) {
    const t = this.departuresFilters.reservationType.toLowerCase();
    rows = rows.filter(r => (r.reservationType || '').toLowerCase() === t);
  }

  // Cancelled tri-state
  if (this.departuresFilters.cancelled === 'active') rows = rows.filter(r => !r.isCancelled);
  else if (this.departuresFilters.cancelled === 'cancelled') rows = rows.filter(r => !!r.isCancelled);

  // نطاق الغرف
  const minRooms = this.toNumOrNull(this.departuresFilters.minRooms);
  const maxRooms = this.toNumOrNull(this.departuresFilters.maxRooms);
  if (minRooms != null) rows = rows.filter(r => (r.totalRooms ?? 0) >= minRooms);
  if (maxRooms != null) rows = rows.filter(r => (r.totalRooms ?? 0) <= maxRooms);

  // نطاق السعر
  const minRate = this.toNumOrNull(this.departuresFilters.minRate);
  const maxRate = this.toNumOrNull(this.departuresFilters.maxRate);
  if (minRate != null) rows = rows.filter(r => (r.maxRoomRate ?? 0) >= minRate);
  if (maxRate != null) rows = rows.filter(r => (r.minRoomRate ?? 0) <= maxRate);

  // بحث عام
  if (this.departuresFilters.search) {
    const q = this.departuresFilters.search.toLowerCase();
    rows = rows.filter(r =>
      (r.rsvNo || '').toLowerCase().includes(q) ||
      (r.hotelReservationNo || '').toLowerCase().includes(q) ||
      (r.guestName || '').toLowerCase().includes(q)
    );
  }

  this.departuresDetailRowsView = rows;
}

setDailyFilter(key: keyof typeof this.dailyFilters, val: any) {
  (this.dailyFilters as any)[key] = val?.trim?.() ?? val;
  this.computeDailyReport();
}
onDailyDate(value: string) {
  this.dailyFilters.date = this.parseDateInput(value);
  this.computeDailyReport();
}

// arrivalRowsView: ArrivalRow[] = [];

setArrivalByHotelFilter(key: keyof typeof this.arrivalByHotelFilters, val: any) {
  (this.arrivalByHotelFilters as any)[key] = val?.trim?.() ?? val;
  this.applyArrivalByHotelFilters();
}

onArrivalByHotelDate(which: 'from' | 'to', value: string) {
  this.arrivalByHotelFilters[which] = this.parseDateInput(value);
  this.applyArrivalByHotelFilters();
}

toggleArrivalByHotelFilter(key: 'hideEmpty', checked: boolean) {
  (this.arrivalByHotelFilters as any)[key] = !!checked;
  this.applyArrivalByHotelFilters();
}

resetArrivalByHotelFilters() {
  this.arrivalByHotelFilters = {
    from: null,
    to: null,
    hotelId: '',
    min: '',
    max: '',
    search: '',
    hideEmpty: false
  };
  this.applyArrivalByHotelFilters();
}

private applyArrivalByHotelFilters() {
  const f = this.arrivalByHotelFilters;
  let rows = (this.arrivalRows ?? []).slice();

  // فلتر الفندق بالاسم (من id)
  if (f.hotelId) {
    const name = this.hotelNameBy(f.hotelId);
    rows = rows.filter(r => r.hotelName === name);
  }

  // احسب نطاق الأعمدة (من/إلى) ثم قصّه
  const fromIdx = f.from ? this.dates.findIndex(d => +d === +this.startOfDay(f.from!)) : 0;
  const toIdx   = f.to   ? this.dates.findIndex(d => +d === +this.startOfDay(f.to!))   : this.dates.length - 1;

  const minI = fromIdx === -1 ? 0 : fromIdx;
  const maxI = toIdx   === -1 ? this.dates.length - 1 : toIdx;

  // قصّ تواريخ الهيدر
  this.arrivalDatesView = this.dates.slice(minI, maxI + 1);

  // فلتر البحث بالاسم
  if (f.search) {
    const q = f.search.toLowerCase();
    rows = rows.filter(r => r.hotelName.toLowerCase().includes(q));
  }

  // إخفاء الصفوف الفارغة
  if (f.hideEmpty) {
    rows = rows.filter(r => r.values.some(v => v > 0));
  }

  // قصّ القيم بنفس النطاق
  rows = rows.map(r => ({ ...r, values: r.values.slice(minI, maxI + 1) }));

  // نطاق العدد (min/max) على مجموع الواصلين داخل الفترة المختارة
  const toSum = (r: ArrivalRow) => r.values.reduce((a, b) => a + (b ?? 0), 0);
  const min = Number(f.min);
  const max = Number(f.max);
  if (!isNaN(min) && f.min !== '') rows = rows.filter(r => toSum(r) >= min);
  if (!isNaN(max) && f.max !== '') rows = rows.filter(r => toSum(r) <= max);

  // احسب التوتال المفلتر للأعمدة
  this.arrivalTotalsView = Array.from({ length: this.arrivalDatesView.length }, (_, i) =>
    rows.reduce((sum, r) => sum + (r.values[i] ?? 0), 0)
  );

  this.arrivalRowsView = rows;
}

roomingFilters = {
  hotelId: '',
  guest: '',
  roomTypeQuery: '',
  paymentMethod: '',
  from: null as Date | null,
  to: null as Date | null,
  search: ''
};

arrivalsDetailRowsView: ArrivalsRow[] = []; // ما سيُعرض بعد الفلترة

/** لعرض قائمة الفنادق في الـ HTML بدون كشف الخاصية الخاصة */
get hotelsForFilter(): any[] {
  return this.hotelsLookup ?? [];
}
/** لقائمة طرق الدفع في فلاتر Rooming List */
get paymentMethodsForFilter(): string[] {
  const s = new Set<string>();
  for (const g of this.roomingListGroups ?? []) {
    for (const r of g.rows ?? []) {
      const v = (r.paymentMethod ?? '').toString().trim();
      if (v) s.add(v);
    }
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/** ترجمة id -> اسم الفندق (للمقارنة مع اسم الجدول) */
private hotelNameBy(hotelId: string): string {
  return this.hotelNameById.get(String(hotelId)) ?? String(hotelId ?? '');
}

/** تحويل yyyy-MM-dd إلى Date (input[type=date]) */
private parseDateInput(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return this.startOfDay(new Date(y, m - 1, d));
}

/** تعديل فلتر نصّي/اختيار */
setFilter(key: keyof typeof this.filters, val: string) {
  (this.filters as any)[key] = val?.trim?.() ?? val;
  this.applyArrivalsFilters();
}

/** تعديل فلتر تاريخ */
onFilterDate(which: 'from' | 'to', value: string) {
  this.filters[which] = this.parseDateInput(value);
  this.applyArrivalsFilters();
}
/** ====== Filters (Rooming Availability) ====== */
roomingAvailFilters = {
  hotelId: '',
  roomTypeName: '',
  metric: '',
  date: null as Date | null,
  hideEmpty: false,
  percentOnly: false,
  search: ''
};

roomingTablesView: RoomingTable[] = [];

/** أسماء أنواع الغرف المتاحة كأعمدة عبر كل الفنادق (ديناميك) */
get roomTypeNamesForAvailFilter(): string[] {
  const set = new Set<string>();
  for (const t of this.roomingTables ?? []) {
    for (const c of t.columns ?? []) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** أسماء مؤشرات الصفوف (Allotment/Direct/… إلخ) ديناميك */
get roomingMetrics(): string[] {
  const set = new Set<string>();
  for (const t of this.roomingTables ?? []) {
    for (const r of t.rows ?? []) set.add(r.label);
  }
  return Array.from(set);
}

/** تعديل فلتر نصّي/اختيار */
setRoomingAvailFilter(key: keyof typeof this.roomingAvailFilters, val: any) {
  (this.roomingAvailFilters as any)[key] =
    typeof val === 'string' ? val.trim() : val;

  // لو التاريخ اتغير، نعيد حساب الجدول (لأن snapshot بيتغير)
  if (key === 'date') {
    this.computeRoomingAvailability();
  } else {
    this.applyRoomingAvailabilityFilters();
  }
}

/** Toggle لفلاتر الـ checkbox */
toggleRoomingAvailFilter(key: 'hideEmpty' | 'percentOnly', checked: boolean) {
  (this.roomingAvailFilters as any)[key] = !!checked;
  this.applyRoomingAvailabilityFilters();
}

/** تغيير التاريخ من input */
onRoomingAvailDate(value: string) {
  this.roomingAvailFilters.date = this.parseDateInput(value);
  this.computeRoomingAvailability(); // snapshot جديد
}

/** إعادة تعيين فلاتر Rooming Availability */
resetRoomingAvailFilters() {
  this.roomingAvailFilters = {
    hotelId: '',
    roomTypeName: '',
    metric: '',
    date: null,
    hideEmpty: false,
    percentOnly: false,
    search: ''
  };
  this.applyRoomingAvailabilityFilters();
}
private computeDailyReport() {
  if (!this.isLoaded) return;

  const allDates = this.headerDates();
  if (!allDates.length) { this.dailySummaryRows = []; this.dailyArrivalsRowsView = []; return; }

  // تاريخ التقرير
  const reportDate = this.startOfDay(this.dailyFilters.date ?? allDates[0]);

  // تحديد الفندق (إن لم يحدد، خذ أول فندق موجود في الحجوزات أو أول فندق في اللوكلوب)
  if (!this.dailyFilters.hotelId) {
    const firstRes = this.reservations.find(r => (r as any)?.hotelId);
    if (firstRes) this.dailyFilters.hotelId = String((firstRes as any).hotelId);
    else if (this.hotelsLookup[0]) this.dailyFilters.hotelId = String(this.hotelsLookup[0].id);
  }
  const hotelId = String(this.dailyFilters.hotelId || '');
  const hotel = this.hotelsLookup.find(h => String(h.id) === hotelId);
  const hotelName = this.hotelNameById.get(hotelId) ?? hotelId;
  this.dailyHotelName = hotelName;

  // تجميع أسماء أنواع الغرف لهذا الفندق
  const typeSet = new Set<string>();
  for (const r of this.reservations) {
    if (String((r as any).hotelId ?? '') !== hotelId) continue;
    for (const e of ((r as any).reservationRoomEntries ?? [])) {
      const rtName =
        this.pickName(e?.roomType) ||
        String(e?.roomTypeName ?? '') ||
        String(e?.roomTypeId ?? '');
      if (rtName) typeSet.add(rtName);
    }
  }
  const types = Array.from(typeSet).sort();
  if (!types.length) { this.dailySummaryRows = []; this.dailyArrivalsRowsView = []; return; }

  const idxByType = new Map<string, number>();
  types.forEach((t, i) => idxByType.set(t, i));

  const N = types.length;
  const mk = () => Array.from({ length: N }, () => 0);

  const arrival   = mk();
  const inHouse   = mk();
  const departure = mk();
  const booked    = mk(); // للحساب داخل الليلة

  // سعة الفندق وتوزيع "Stock" بالتساوي (عندي ما فيش per-type capacity حقيقي)
  const hotelCap = this.getHotelCapacity(hotel) || 180;
  const capPerType = N ? Math.max(1, Math.round(hotelCap / N)) : 0;

  // لف على الحجوزات الخاصة بالفندق
  for (const r of this.reservations) {
    if (String((r as any).hotelId ?? '') !== hotelId) continue;

    const arr = this.startOfDay(new Date((r as any).arrivalDate));
    const dep = this.startOfDay(new Date((r as any).departureDate));
    const stayCovers = reportDate >= arr && reportDate < dep;
    const isArrival  = +arr === +reportDate;
    const isDeparture= +dep === +reportDate;

    for (const e of ((r as any).reservationRoomEntries ?? [])) {
      const rtName =
        this.pickName(e?.roomType) ||
        String(e?.roomTypeName ?? '') ||
        String(e?.roomTypeId ?? '');

      const i = idxByType.get(rtName);
      if (i == null) continue;

      const rooms = Number(e?.numberOfRooms ?? 0) || 0;
      if (isArrival)    arrival[i]   += rooms;
      if (isDeparture)  departure[i] += rooms;
      if (stayCovers) { inHouse[i]   += rooms; booked[i] += rooms; }
    }
  }

  this.dailySummaryRows = types.map((t, i) => ({
    roomType: t,
    stock: capPerType,
    arrival: arrival[i],
    inHouse: inHouse[i],
    departure: departure[i],
    balance: capPerType - booked[i],
  }));

  // جدول Arrivals (قائمة الواصلين اليوم لهذا الفندق)
  this.dailyArrivalsRowsView = (this.arrivalsDetailRows ?? []).filter(r =>
    r.hotelName === hotelName && +this.startOfDay(r.from) === +reportDate
  );
}

/** تطبيق الفلاتر على roomingTables -> roomingTablesView */
private applyRoomingAvailabilityFilters() {
  const f = this.roomingAvailFilters;

  const result: RoomingTable[] = (this.roomingTables ?? [])
    // فلتر الفندق
    .filter(t => !f.hotelId || String(t.hotelId) === String(f.hotelId))
    // معالجة الأعمدة والسطور
    .map((t) => {
      const search = (f.search || '').toLowerCase();

      // أي الأعمدة (أنواع الغرف) سنُبقي؟
      const includeCol: boolean[] = t.columns.map((name) => {
        const bySelectedName = !f.roomTypeName || name === f.roomTypeName;
        const bySearch = !search || name.toLowerCase().includes(search);
        return bySelectedName && bySearch;
      });

      const hasAnyCol = includeCol.some(Boolean);
      if (!hasAnyCol) return { ...t, columns: [], rows: [] };

      const columns = t.columns.filter((_, i) => includeCol[i]);

      // فلترة الصفوف (المؤشرات)
      let rows = t.rows
        .filter(r => (!f.percentOnly || !!r.isPercent) && (!f.metric || r.label === f.metric))
        .map(r => ({ ...r, values: r.values.filter((_, i) => includeCol[i]) }));

      // إخفاء الصفوف الفارغة بالكامل (كل قيمها 0)
      if (f.hideEmpty) {
        rows = rows.filter(r => r.values.some(v => Number(v) !== 0));
      }

      return { ...t, columns, rows };
    })
    // إسقاط الجداول الفارغة بعد الفلترة
    .filter(t => t.columns.length && t.rows.length);

  this.roomingTablesView = result;
}

/** إعادة تعيين الفلاتر */
resetFilters() {
  this.filters = {
    from: null,
    to: null,
    hotelId: '',
    companyName: '',
    nationality: '',
    roomTypeQuery: '',
    search: '',

    // المفاتيح الجديدة لازم تتعيّن أيضًا
    viewId: '',
    roomTypeId: '',
    reservationType: '',
    cancelled: '' as '' | 'active' | 'cancelled',
    minRooms: '',
    maxRooms: '',
    minRate: '',
    maxRate: '',
  };
  this.applyArrivalsFilters();
}


/** تطبيق الفلاتر على rows الخاصة بجدول Arrivals during period */
private applyArrivalsFilters() {
  let rows = this.arrivalsDetailRows.slice();

  // التاريخ
  if (this.filters.from) {
    rows = rows.filter(r => this.startOfDay(r.from) >= this.startOfDay(this.filters.from!));
  }
  if (this.filters.to) {
    rows = rows.filter(r => this.startOfDay(r.from) <= this.startOfDay(this.filters.to!));
  }

  // الفندق (بالاسم من الـ id)
  if (this.filters.hotelId) {
    const wantedName = this.hotelNameBy(this.filters.hotelId);
    rows = rows.filter(r => r.hotelName === wantedName);
  }

  // الشركة/العميل (بالاسم الظاهر في العمود Agent)
  if (this.filters.companyName) {
    const q = this.filters.companyName.toLowerCase();
    rows = rows.filter(r => (r.agentName || '').toLowerCase().includes(q));
  }

  // الجنسية
  if (this.filters.nationality) {
    const q = this.filters.nationality.toLowerCase();
    rows = rows.filter(r => (r.nationality || '').toLowerCase().includes(q));
  }

  // نوع الغرفة (بحث نصّي داخل السطور)
  if (this.filters.roomTypeQuery) {
    const q = this.filters.roomTypeQuery.toLowerCase();
    rows = rows.filter(r => (r.roomTypeLines || []).some(line => (line || '').toLowerCase().includes(q)));
  }

  // ====== الفلاتر الجديدة ======

  // View (by ID)
  if (this.filters.viewId) {
    const id = this.filters.viewId;
    rows = rows.filter(r => (r.viewIds || []).includes(id));
  }

  // Room Type (by ID)
  if (this.filters.roomTypeId) {
    const id = this.filters.roomTypeId;
    rows = rows.filter(r => (r.roomTypeIds || []).includes(id));
  }

  // Reservation Type (مطابقة نصية كاملة)
  if (this.filters.reservationType) {
    const t = this.filters.reservationType.toLowerCase();
    rows = rows.filter(r => (r.reservationType || '').toLowerCase() === t);
  }

  // Cancelled tri-state
  if (this.filters.cancelled === 'active') {
    rows = rows.filter(r => !r.isCancelled);
  } else if (this.filters.cancelled === 'cancelled') {
    rows = rows.filter(r => !!r.isCancelled);
  }

  // Rooms range
  const minRooms = this.toNumOrNull(this.filters.minRooms);
  const maxRooms = this.toNumOrNull(this.filters.maxRooms);
  if (minRooms != null) rows = rows.filter(r => (r.totalRooms ?? 0) >= minRooms);
  if (maxRooms != null) rows = rows.filter(r => (r.totalRooms ?? 0) <= maxRooms);

  // Rate range (حسب min/max داخل الحجز)
  const minRate = this.toNumOrNull(this.filters.minRate);
  const maxRate = this.toNumOrNull(this.filters.maxRate);
  if (minRate != null) rows = rows.filter(r => (r.maxRoomRate ?? 0) >= minRate); // يوجد على الأقل rate يغطي الحد الأدنى
  if (maxRate != null) rows = rows.filter(r => (r.minRoomRate ?? 0) <= maxRate);

  // بحث عام: رقم الحجز / رقم حجز الفندق / اسم النزيل
  if (this.filters.search) {
    const q = this.filters.search.toLowerCase();
    rows = rows.filter(r =>
      (r.rsvNo || '').toLowerCase().includes(q) ||
      (r.hotelReservationNo || '').toLowerCase().includes(q) ||
      (r.guestName || '').toLowerCase().includes(q)
    );
  }

  this.arrivalsDetailRowsView = rows;
}
/** تعديل فلتر نصّي/اختيار (Rooming List) */
setRoomingFilter(key: keyof typeof this.roomingFilters, val: string) {
  (this.roomingFilters as any)[key] = val?.trim?.() ?? val;
  this.applyRoomingListFilters();
}

/** تعديل فلتر تاريخ (Rooming List) */
onRoomingDate(which: 'from' | 'to', value: string) {
  this.roomingFilters[which] = this.parseDateInput(value);
  this.applyRoomingListFilters();
}

/** إعادة تعيين فلاتر Rooming List */
resetRoomingFilters() {
  this.roomingFilters = {
    hotelId: '',
    guest: '',
    roomTypeQuery: '',
    paymentMethod: '',
    from: null,
    to: null,
    search: ''
  };
  this.applyRoomingListFilters();
}

/** تطبيق فلاتر Rooming List على المجموعات */
private applyRoomingListFilters() {
  const f = this.roomingFilters;

  // نبقي نسخة مفلترة من كل جروب
  const filteredGroups: RoomingListGroup[] = (this.roomingListGroups ?? [])
    .map((g) => {
      // فلترة الصفوف داخل الجروب
      let rows = (g.rows ?? []).slice();

      // التاريخ: نعتمد checkIn كنقطة الفلترة (قائمة Rooming List للواصلين)
      if (f.from) rows = rows.filter(r => this.startOfDay(r.checkIn) >= this.startOfDay(f.from!));
      if (f.to)   rows = rows.filter(r => this.startOfDay(r.checkIn) <= this.startOfDay(f.to!));

      // الفندق: بالـ id (رغم أن الجروب نفسه على مستوى الفندق، بس نخليها على مستوى الصف لضمان الدقة)
      if (f.hotelId) {
        const id = String(f.hotelId);
        rows = rows.filter(r => String(r.hotelId) === id);
      }

      // الضيف
      if (f.guest) {
        const q = f.guest.toLowerCase();
        rows = rows.filter(r => (r.guestName || '').toLowerCase().includes(q));
      }

      // نوع الغرفة (بحث نصّي داخل السطور)
      if (f.roomTypeQuery) {
        const q = f.roomTypeQuery.toLowerCase();
        rows = rows.filter(r => (r.roomTypeLines || []).some(line => (line || '').toLowerCase().includes(q)));
      }

      // طريقة الدفع (مطابقة كاملة)
      if (f.paymentMethod) {
        const pm = f.paymentMethod.toLowerCase();
        rows = rows.filter(r => (r.paymentMethod || '').toLowerCase() === pm);
      }

      // بحث عام: رقم حجز الفندق / رقم الغرفة / اسم النزيل
      if (f.search) {
        const q = f.search.toLowerCase();
        rows = rows.filter(r =>
          (r.hotelReservationNo || '').toLowerCase().includes(q) ||
          (r.roomNo || '').toLowerCase().includes(q) ||
          (r.guestName || '').toLowerCase().includes(q)
        );
      }

      // إعادة ترقيم SN بعد الفلترة
      rows = rows
        .slice()
        .sort((a, b) => +a.checkIn - +b.checkIn || a.guestName.localeCompare(b.guestName))
        .map((r, i) => ({ ...r, sn: i + 1 }));

      return { ...g, rows };
    })
    // إسقاط الجروبات الفارغة
    .filter(g => (g.rows?.length ?? 0) > 0);

  this.roomingListGroupsView = filteredGroups;
}

/** ====== Sale Allotments Availability (state) ====== */
saleFilters = {
  from: null as Date | null,
  to: null as Date | null,
  hotelId: '',
  reservationType: '',
  companyName: '',
  roomTypeId: '',
  viewId: '',
  minRooms: '',
  maxRooms: '',
};
saleDatesView: Date[] = [];
// ===== Summary (توافر الغرف) - فلاتر ونافذة عرض =====
summaryForm!: FormGroup;
summaryDatesView: Date[] = [];
private summaryColStart = 0;

// بيانات summary المصفّاة حسب الفلاتر (زي saleData لكن للـ Summary)
summaryData: Record<MetricKey, number[]> = {
  allotment: [], overHotel: [], overAgent: [], direct: [], agent: [], totalReserved: [],
  confirmed: [], notConfirmed: [], totalBooked: [], saleAllotment: [], totalBalance: [],
  noShow: [], deleted: [], web: [], checkIn: [], checkOut: [], inHouse: [], inHouseSale: [],
  occupancyPct: [], avgRoomRate: [],
};

private saleColStart = 0;

get saleHotelName(): string {
  if (!this.saleFilters.hotelId) return 'All Hotels';
  return this.hotelNameById.get(String(this.saleFilters.hotelId)) ?? String(this.saleFilters.hotelId);
}


/** صفوف المؤشرات المطلوبة بالترتيب مثل الصورة */
get saleMetricRows(): MetricRow[] {
  const needed: MetricKey[] = [
    'allotment',
    'confirmed',
    'notConfirmed',
    'totalBooked',
    'noShow',
    'totalBalance',
    'checkIn',
    'checkOut',
    'inHouse',
    'occupancyPct',
    'avgRoomRate',
  ];
  const set = new Set<MetricKey>(needed);
  return this.metricRows.filter(r => set.has(r.key));
}


saleData: Record<MetricKey, number[]> = {
  allotment: [], overHotel: [], overAgent: [], direct: [], agent: [], totalReserved: [],
  confirmed: [], notConfirmed: [], totalBooked: [], saleAllotment: [], totalBalance: [],
  noShow: [], deleted: [], web: [], checkIn: [], checkOut: [], inHouse: [], inHouseSale: [],
  occupancyPct: [], avgRoomRate: [],
};

valueForSale(row: MetricRow, viewIndex: number): number {
  const col = viewIndex + this.saleColStart;
  const arr = this.saleData[row.key] || [];
  const v = arr[col];
  return typeof v === 'number' ? v : 0;
}
setSaleFilter(key: keyof typeof this.saleFilters, val: any) {
  (this.saleFilters as any)[key] = val?.trim?.() ?? val;

  // لو تعدّل التاريخ نكتفي بقصّ الهيدر
  if (key === 'from' || key === 'to') {
    this.applySaleViewWindow();
  } else {
    this.recomputeSaleMetrics();
  }
}
onSaleDate(which: 'from' | 'to', value: string) {
  this.saleFilters[which] = this.parseDateInput(value);
  this.applySaleViewWindow();
}
resetSaleFilters() {
  this.saleFilters = {
    from: null, to: null, hotelId: '',
    reservationType: '', companyName: '',
    roomTypeId: '', viewId: '',
    minRooms: '', maxRooms: '',
  };
  this.recomputeSaleMetrics();
}
private applySaleViewWindow() {
  const dates = this.headerDates();
  if (!dates.length) { this.saleDatesView = []; this.saleColStart = 0; return; }

  const fromIdx = this.saleFilters.from ? dates.findIndex(d => +d === +this.startOfDay(this.saleFilters.from!)) : 0;
  const toIdx   = this.saleFilters.to   ? dates.findIndex(d => +d === +this.startOfDay(this.saleFilters.to!))   : dates.length - 1;

  const start = fromIdx === -1 ? 0 : fromIdx;
  const end   = toIdx   === -1 ? dates.length - 1 : toIdx;

  this.saleColStart  = Math.max(0, Math.min(start, dates.length - 1));
  const endClamped   = Math.max(this.saleColStart, Math.min(end, dates.length - 1));

  this.saleDatesView = dates.slice(this.saleColStart, endClamped + 1);
}
private applySummaryViewWindow() {
  const dates = this.headerDates();
  if (!dates.length) { this.summaryDatesView = []; this.summaryColStart = 0; return; }

  const f = this.summaryForm?.value || {};
  const fromDate = f.fromDate ? this.parseDateInput(f.fromDate) : null;
  const toDate   = f.toDate   ? this.parseDateInput(f.toDate)   : null;

  const fromIdx = fromDate ? dates.findIndex(d => +d === +this.startOfDay(fromDate)) : 0;
  const toIdx   = toDate   ? dates.findIndex(d => +d === +this.startOfDay(toDate))   : dates.length - 1;

  const start = fromIdx === -1 ? 0 : fromIdx;
  const end   = toIdx   === -1 ? dates.length - 1 : toIdx;

  this.summaryColStart = Math.max(0, Math.min(start, dates.length - 1));
  const endClamped = Math.max(this.summaryColStart, Math.min(end, dates.length - 1));

  this.summaryDatesView = dates.slice(this.summaryColStart, endClamped + 1);
}

/** حساب المؤشرات مع فلترة على مستوى الفندق (إن وُجد) */
private recomputeSaleMetrics() {
  const dates = this.headerDates();
  const cols = dates.length;
  const mk = () => Array.from({ length: cols }, () => 0);

  // صفّر كل المصفوفات
  (Object.keys(this.saleData) as MetricKey[]).forEach(k => (this.saleData[k] = mk()));
  if (!cols || (!this.reservations.length && !this.purchases.length)) { this.saleDatesView = []; this.saleColStart = 0; return; }

  // ==== فلاتر التاب ====
  const hotelId      = String(this.saleFilters.hotelId || '');
  const typeFilter   = String(this.saleFilters.reservationType || '').toLowerCase();
  const qCompany     = (this.saleFilters.companyName || '').toLowerCase();
  const roomTypeId   = String(this.saleFilters.roomTypeId || '');
  const viewId       = String(this.saleFilters.viewId || '');
  const minRooms     = this.toNumOrNull(this.saleFilters.minRooms);
  const maxRooms     = this.toNumOrNull(this.saleFilters.maxRooms);

  // السعة: اجمع سعات الفنادق ضمن النطاق (فندق محدد أو كل الفنادق الموجودة في البيانات)
  const allHotelIds = new Set<string>();
  this.reservations.forEach(r => {
    const hId = String((r as any).hotelId ?? '');
    if (hId) allHotelIds.add(hId);
  });
  this.purchases.forEach(p => {
    const hId = String(p?.hotelId ?? '');
    if (hId) allHotelIds.add(hId);
  });

  const hotelIdsInScope: string[] = hotelId
    ? [hotelId]
    : Array.from(allHotelIds);
  const cap = hotelIdsInScope.reduce((sum, id) => {
    const h = this.hotelsLookup.find((x: any) => String(x.id) === id);
    return sum + (this.getHotelCapacity(h) || 180);
  }, 0);

  const totalRoomsPerDay = mk();
  const rateWeightedSumPerDay = mk();

  // ==== حساب Allotment من purchases ====
  for (const purchase of this.purchases) {
    if (hotelId && String(purchase?.hotelId ?? '') !== hotelId) continue;

    if (!purchase.hotelAllotmentRooms || !Array.isArray(purchase.hotelAllotmentRooms)) {
      continue;
    }

    for (const room of purchase.hotelAllotmentRooms) {
      if (!room.fromDate || !room.toDate) continue;

      // فلترة حسب roomType/view
      const rt = String(room?.roomTypeId ?? room?.roomType?.id ?? '');
      const v  = String(room?.viewId ?? room?.view?.id ?? '');
      if (roomTypeId && rt !== roomTypeId) continue;
      if (viewId && v !== viewId) continue;

      const fromDate = this.startOfDay(new Date(room.fromDate));
      const toDate = this.startOfDay(new Date(room.toDate));

      for (let dIndex = 0; dIndex < cols; dIndex++) {
        const day = dates[dIndex];
        if (day >= fromDate && day < toDate) {
          const dayName = this.getDayNameForRoomsPerDay(day);
          const roomsPerDay = room.roomsPerDay || {};
          const numberOfRooms = roomsPerDay[dayName] || room.numberOfRooms || 0;
          
          this.saleData.allotment[dIndex] += numberOfRooms;
        }
      }
    }
  }

  // ==== حساب باقي الأنواع من reservations (تخطي Allotment) ====
  for (const r of this.reservations) {
    // تخطي Allotment لأننا نحسبها من purchases
    if ((r as any).reservationType === 'Allotment') continue;

    if (hotelId && String((r as any).hotelId ?? '') !== hotelId) continue;

    // نوع الحجز
    if (typeFilter && String((r as any).reservationType ?? '').toLowerCase() !== typeFilter) continue;

    // الشركة/العميل (نص حر)
    if (qCompany) {
      const compName =
        this.companyNameById.get(String((r as any).reservationClientCompanyId ?? '')) ||
        this.companyNameById.get(String((r as any).reservationCompanyId ?? '')) || '';
      if (!compName.toLowerCase().includes(qCompany)) continue;
    }

    // فلترة الـ entries حسب نوع الغرفة/الإطلالة
    const allEntries: any[] = (r as any).reservationRoomEntries ?? [];
    const entries = allEntries.filter(e => {
      const rt = String(e?.roomTypeId ?? e?.roomType?.id ?? '');
      const v  = String(e?.reservationViewId ?? e?.viewId ?? e?.view?.id ?? '');
      return (!roomTypeId || rt === roomTypeId) && (!viewId || v === viewId);
    });
    if (!entries.length) continue;

    // عدد الغرف لهذا الحجز (بعد الفلترة)
    const roomsForRes = entries.reduce((s, e) => s + Number(e?.numberOfRooms ?? 0), 0);
    if (minRooms != null && roomsForRes < minRooms) continue;
    if (maxRooms != null && roomsForRes > maxRooms) continue;

    const arrival = this.startOfDay(new Date((r as any).arrivalDate));
    const departure = this.startOfDay(new Date((r as any).departureDate));

    for (let dIndex = 0; dIndex < cols; dIndex++) {
      const day = dates[dIndex];
      if (day >= arrival && day < departure) {
        const rooms = roomsForRes;

        if ((r as any).reservationType === 'AgentDirect') this.saleData.agent[dIndex] += rooms;
        else this.saleData.direct[dIndex] += rooms;

        // معدل السعر المتوسط
        const acc = entries.reduce((a: any, e: any) => {
          const n = Number(e?.numberOfRooms ?? 0);
          const rate = Number(e?.roomRate ?? 0);
          a.sumRooms += n;
          a.sumRateWeighted += rate * n;
          return a;
        }, { sumRooms: 0, sumRateWeighted: 0 });

        if (acc.sumRooms > 0) {
          totalRoomsPerDay[dIndex]      += acc.sumRooms;
          rateWeightedSumPerDay[dIndex] += acc.sumRateWeighted;
        }
      }
    }
  }

  // ==== المخرجات ====
  for (let i = 0; i < cols; i++) {
    const allot  = this.saleData.allotment[i] || 0;
    const agent  = this.saleData.agent[i]     || 0;
    const direct = this.saleData.direct[i]    || 0;

    const total = allot + agent + direct;
    this.saleData.totalReserved[i] = total;

    const confirmed                = Math.round(total * 0.7);
    this.saleData.confirmed[i]     = confirmed;
    this.saleData.notConfirmed[i]  = total - confirmed;
    this.saleData.totalBooked[i]   = total;

    this.saleData.noShow[i]   = Math.round(confirmed * 0.03);
    this.saleData.checkIn[i]  = Math.round(confirmed * 0.5);
    this.saleData.checkOut[i] = Math.round(confirmed * 0.45);
    this.saleData.inHouse[i]  = Math.round(confirmed * 0.7);

    this.saleData.totalBalance[i] = cap - this.saleData.totalBooked[i];

    const used = Math.min(cap, this.saleData.inHouse[i] + this.saleData.checkIn[i] - this.saleData.checkOut[i]);
    this.saleData.occupancyPct[i] = cap > 0 ? Math.round((used / cap) * 100) : 0;

    const rooms       = totalRoomsPerDay[i];
    const sumWeighted = rateWeightedSumPerDay[i];
    this.saleData.avgRoomRate[i] = rooms > 0 ? Math.round(sumWeighted / rooms) : 0;
  }

  // مهم جدًا: قصّ نافذة العرض بعد الحساب
  this.applySaleViewWindow();
}
private recomputeSummaryMetrics() {
  const dates = this.headerDates();
  const cols = dates.length;
  const mk = () => Array.from({ length: cols }, () => 0);

  // صفّر
  (Object.keys(this.summaryData) as MetricKey[]).forEach(k => (this.summaryData[k] = mk()));
  if (!cols || (!this.reservations.length && !this.purchases.length)) { this.summaryDatesView = []; this.summaryColStart = 0; return; }

  const f = this.summaryForm?.value || {};
  const hotelId      = String(f.hotelId || '');             // ID
  const viewId       = String(f.viewId || '');              // ID
  const roomTypeId   = String(f.roomTypeId || '');          // ID
  const typeFilter   = String(f.reservationType || '').toLowerCase(); // نص
  const qCompany     = (f.companyName || '').toLowerCase(); // نص حر

  // اجمع السعة حسب الفنادق الواقعة ضمن الفلتر (لو فندق محدد => سعته فقط)
  const allHotelIds = new Set<string>();
  this.reservations.forEach(r => {
    const hId = String((r as any).hotelId ?? '');
    if (hId) allHotelIds.add(hId);
  });
  this.purchases.forEach(p => {
    const hId = String(p?.hotelId ?? '');
    if (hId) allHotelIds.add(hId);
  });

  const hotelIdsInScope: string[] = hotelId
    ? [hotelId]
    : Array.from(allHotelIds);

  const cap = hotelIdsInScope.reduce((sum, id) => {
    const h = this.hotelsForFilter.find(x => String(x.id) === id);
    return sum + (this.getHotelCapacity(h) || 180);
  }, 0);

  // لمتوسط السعر
  const totalRoomsPerDay = mk();
  const rateWeightedSumPerDay = mk();

  // ===== حساب Allotment من purchases (مشتريات الحجوزات) =====
  for (const purchase of this.purchases) {
    if (hotelId && String(purchase?.hotelId ?? '') !== hotelId) continue;

    if (!purchase.hotelAllotmentRooms || !Array.isArray(purchase.hotelAllotmentRooms)) {
      continue;
    }

    for (const room of purchase.hotelAllotmentRooms) {
      if (!room.fromDate || !room.toDate) continue;

      // فلترة حسب roomType/view
      const rt = String(room?.roomTypeId ?? room?.roomType?.id ?? '');
      const v  = String(room?.viewId ?? room?.view?.id ?? '');
      if (roomTypeId && rt !== roomTypeId) continue;
      if (viewId && v !== viewId) continue;

      const fromDate = this.startOfDay(new Date(room.fromDate));
      const toDate = this.startOfDay(new Date(room.toDate));

      for (let dIndex = 0; dIndex < cols; dIndex++) {
        const day = dates[dIndex];
        if (day >= fromDate && day < toDate) {
          // الحصول على عدد الغرف لهذا اليوم من roomsPerDay
          const dayName = this.getDayNameForRoomsPerDay(day);
          const roomsPerDay = room.roomsPerDay || {};
          const numberOfRooms = roomsPerDay[dayName] || room.numberOfRooms || 0;
          
          this.summaryData.allotment[dIndex] += numberOfRooms;
        }
      }
    }
  }

  // ===== حساب باقي الأنواع من reservations (Direct, AgentDirect) =====
  for (const r of this.reservations) {
    if (hotelId && String((r as any).hotelId ?? '') !== hotelId) continue;

    // تخطي Allotment لأننا نحسبها من purchases
    if ((r as any).reservationType === 'Allotment') continue;

    if (typeFilter && String((r as any).reservationType ?? '').toLowerCase() !== typeFilter) continue;

    if (qCompany) {
      const compName =
        this.companyNameById.get(String((r as any).reservationClientCompanyId ?? '')) ||
        this.companyNameById.get(String((r as any).reservationCompanyId ?? '')) || '';
      if (!compName.toLowerCase().includes(qCompany)) continue;
    }

    // entries بالفلترة (roomType/view)
    const allEntries: any[] = (r as any).reservationRoomEntries ?? [];
    const entries = allEntries.filter(e => {
      const rt = String(e?.roomTypeId ?? e?.roomType?.id ?? '');
      const v  = String(e?.reservationViewId ?? e?.viewId ?? e?.view?.id ?? '');
      return (!roomTypeId || rt === roomTypeId) && (!viewId || v === viewId);
    });
    if (!entries.length) continue;

    const arrival = this.startOfDay(new Date((r as any).arrivalDate));
    const departure = this.startOfDay(new Date((r as any).departureDate));

    for (let dIndex = 0; dIndex < cols; dIndex++) {
      const day = dates[dIndex];
      if (day >= arrival && day < departure) {
        const rooms = entries.reduce((s, e) => s + Number(e?.numberOfRooms ?? 0), 0);

        if ((r as any).reservationType === 'AgentDirect') this.summaryData.agent[dIndex] += rooms;
        else this.summaryData.direct[dIndex] += rooms;

        // متوسط سعر وزني
        const acc = entries.reduce((a: any, e: any) => {
          const n = Number(e?.numberOfRooms ?? 0);
          const rate = Number(e?.roomRate ?? 0);
          a.sumRooms += n;
          a.sumRateWeighted += rate * n;
          return a;
        }, { sumRooms: 0, sumRateWeighted: 0 });

        if (acc.sumRooms > 0) {
          totalRoomsPerDay[dIndex]      += acc.sumRooms;
          rateWeightedSumPerDay[dIndex] += acc.sumRateWeighted;
        }
      }
    }
  }

  // المخرجات لكل يوم
  for (let i = 0; i < cols; i++) {
    const allot  = this.summaryData.allotment[i] || 0;
    const agent  = this.summaryData.agent[i]     || 0;
    const direct = this.summaryData.direct[i]    || 0;

    const total = allot + agent + direct;
    this.summaryData.totalReserved[i] = total;

    const confirmed                = Math.round(total * 0.7);
    this.summaryData.confirmed[i]   = confirmed;
    this.summaryData.notConfirmed[i]= total - confirmed;
    this.summaryData.totalBooked[i] = total;

    this.summaryData.noShow[i]   = Math.round(confirmed * 0.03);
    this.summaryData.checkIn[i]  = Math.round(confirmed * 0.5);
    this.summaryData.checkOut[i] = Math.round(confirmed * 0.45);
    this.summaryData.inHouse[i]  = Math.round(confirmed * 0.7);

    this.summaryData.totalBalance[i] = cap - this.summaryData.totalBooked[i];

    const used = Math.min(cap, this.summaryData.inHouse[i] + this.summaryData.checkIn[i] - this.summaryData.checkOut[i]);
    this.summaryData.occupancyPct[i] = cap > 0 ? Math.round((used / cap) * 100) : 0;

    const rooms       = totalRoomsPerDay[i];
    const sumWeighted = rateWeightedSumPerDay[i];
    this.summaryData.avgRoomRate[i] = rooms > 0 ? Math.round(sumWeighted / rooms) : 0;
  }

  // قص نافذة العرض
  this.applySummaryViewWindow();
}

roomTypeNameById(id: string): string {
  const rt = (this.roomTypesForFilter || [])
    .find(x => String(x.id) === String(id));
  return rt ? this.pickName(rt) : '-';
}
balanceFilters = {
  from: null,
  to: null,
  hotelId: '',
  reservationType: '',
  minBalance: null,
  maxBalance: null,
  search: '',
  hideEmpty: false
};

setBalanceFilter(key: string, value: any) {
  this.balanceFilters[key] = value;
  this.applyBalanceFilters();
}

toggleBalanceFilter(key: string, value: boolean) {
  this.balanceFilters[key] = value;
  this.applyBalanceFilters();
}

onBalanceDate(key: 'from' | 'to', value: string) {
  this.balanceFilters[key] = this.parseDateInput(value);
  this.applyBalanceFilters();
}


resetBalanceFilters() {
  this.balanceFilters = {
    from: null,
    to: null,
    hotelId: '',
    reservationType: '',
    minBalance: null,
    maxBalance: null,
    search: '',
    hideEmpty: false
  };
  this.applyBalanceFilters();
}

applyBalanceFilters() {
  const dates = this.dates;
  if (!dates?.length) {
    this.balanceDatesView = [];
    this.balanceRowsView = [];
    this.balanceTotalsView = [];
    return;
  }

  // 1) قصّ نافذة التواريخ
  const fromI = this.balanceFilters.from
    ? dates.findIndex(d => +d === +this.startOfDay(this.balanceFilters.from!))
    : 0;
  const toI = this.balanceFilters.to
    ? dates.findIndex(d => +d === +this.startOfDay(this.balanceFilters.to!))
    : dates.length - 1;

  const start = fromI === -1 ? 0 : Math.max(0, fromI);
  const end   = toI   === -1 ? dates.length - 1 : Math.min(dates.length - 1, toI);

  this.balanceDatesView = dates.slice(start, end + 1);

  // 2) فلترة الفنادق + البحث + إخفاء الفارغ
  const q = (this.balanceFilters.search || '').toLowerCase();
  let rows = (this.hotelBalanceRows || []).slice();

  if (this.balanceFilters.hotelId) {
    rows = rows.filter(r => String(r.hotelId) === String(this.balanceFilters.hotelId));
  }
  if (q) {
    rows = rows.filter(r => (r.hotelName || '').toLowerCase().includes(q));
  }

  // قصّ القيم حسب نافذة التواريخ
  rows = rows.map(r => ({ ...r, values: r.values.slice(start, end + 1) }));

  // نطاق الرصيد (min/max) على مجموع الفترة المختارة
  const toSum = (r: HotelBalanceRow) => r.values.reduce((a, b) => a + (b ?? 0), 0);
  const minB = this.toNumOrNull(this.balanceFilters.minBalance);
  const maxB = this.toNumOrNull(this.balanceFilters.maxBalance);
  if (minB != null) rows = rows.filter(r => toSum(r) >= minB);
  if (maxB != null) rows = rows.filter(r => toSum(r) <= maxB);

  // إخفاء الصفوف اللي كل قيمها صفر
  if (this.balanceFilters.hideEmpty) {
    rows = rows.filter(r => r.values.some(v => Number(v) !== 0));
  }

  // ترتيب بالاسم (اختياري)
  rows.sort((a, b) => a.hotelName.localeCompare(b.hotelName));

  // 3) احسب التوتال للأعمدة بعد الفلترة
  const cols = this.balanceDatesView.length;
  const totals = Array.from({ length: cols }, (_, i) =>
    rows.reduce((sum, r) => sum + (r.values[i] ?? 0), 0)
  );

  this.balanceRowsView = rows;
  this.balanceTotalsView = totals;
}


  constructor(
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private roomTypeService: RoomTypeService,
    private reservationViewService: ReservationViewService,
    private companyService: ReservationCompanyService,
     private paymentReceiptsService: PaymentReceiptsService,
       private salesInvoiceService: SalesInvoiceService,
    private zone: NgZone,
      private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    public translate: TranslateService
  ) {
    this.initialLoad();
  }
  private initSummaryForm() {
  // نجهّز لوائح بسيطة من lookups الحالية
  const hotels = (this.hotelsForFilter || []).map(h => ({ id: String(h.id), name: this.pickName(h) }));
  const views  = (this.viewsForFilter || []).map(v => ({ id: String(v.id), name: this.pickName(v) }));
  const rts    = (this.roomTypesForFilter || []).map(rt => ({ id: String(rt.id), name: this.pickName(rt) }));

  // نستخدم IDs حيث أمكن
  this.summaryForm = this.fb.group({
    hotelId: [''],
    viewId: [''],
    roomTypeId: [''],
    fromDate: [null],
    toDate: [null],
    reservationType: [''], // Direct / Allotment / AgentDirect
    source: [''],          // (لو عندك مصدر حقيقي لاحقاً)
    companyName: [''],     // نص حر
    showAvgRoomRate: [true],
  });

  // إزالة الاشتراك التلقائي - سنستخدم زر البحث بدلاً من ذلك
  // this.summaryForm.valueChanges.subscribe(() => {
  //   this.applySummaryViewWindow();
  //   this.recomputeSummaryMetrics();
  // });
}

/** تطبيق الفلاتر عند الضغط على زر البحث */
applySummaryFilters() {
  this.applySummaryViewWindow();
  this.recomputeSummaryMetrics();
}

  setTab(tab: TabKey): void {
    this.activeTab = tab;
  }
  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private initialLoad() {
    this.isLoading = true;
    this.isLoaded = false;

    const reservations$ = this.reservationService.getAllFrontalReservations();
    const purchases$ = (this.reservationService as any).getAllPurchases();
    const lookups$ = forkJoin({
      hotels: this.hotelService.getAll(),
      roomTypes: this.roomTypeService.getAll(),
      views: this.reservationViewService.getAll(),
      companies: this.companyService.getAll(),
      receipts: this.paymentReceiptsService.getAllFrontal(),
      sales: of<any[]>([]),
      seasons: of<any[]>([]),
      sources: of<any[]>([]),
    });

    forkJoin({ reservations: reservations$, purchases: purchases$, lookups: lookups$ }).subscribe({
      next: ({ reservations, purchases, lookups }) => {
        this.zone.run(() => {
          this.reservations = Array.isArray(reservations) ? reservations : [];
          this.purchases = Array.isArray(purchases) ? purchases : [];
          console.log('✅ جميع بيانات الحجوزات:', this.reservations);
          console.log('✅ جميع بيانات المشتريات (Allotment):', this.purchases);

          this.hotelsLookup = Array.isArray(lookups?.hotels) ? lookups.hotels : [];
          const sources = Array.isArray(lookups?.sources) ? lookups.sources : [];

          // ⬇️ إضافات: تخزين اللوكلوبات لعرضها في الفلاتر (Room Types & Views)
          this.roomTypesLookup = Array.isArray(lookups?.roomTypes) ? lookups.roomTypes : [];
          this.viewsLookup     = Array.isArray(lookups?.views)     ? lookups.views     : [];

          this.hotelNameById = new Map(this.hotelsLookup.map((h: any) => [String(h.id), this.pickName(h)]));
          this.sourceNameById = new Map(sources.map((s: any) => [String(s.id), this.pickName(s)]));
          this.companyNameById = new Map(
            (Array.isArray(lookups?.companies) ? lookups.companies : []).map((c: any) => [String(c.id), this.pickName(c)])
          );
          this.viewNameById = new Map(
            (Array.isArray(lookups?.views) ? lookups.views : []).map((v: any) => [String(v.id), this.pickName(v)])
          );

          const receipts: any[] = Array.isArray(lookups?.receipts) ? lookups.receipts : [];
          this.paymentMethodByReservationId.clear();
          this.paymentMethodByInvoiceId.clear();

          for (const pr of receipts) {
            const pm = this.pickPaymentMethodFromReceipt(pr);
            if (!pm) continue;

            const resId = String(pr?.reservationId ?? pr?.reservationID ?? pr?.resId ?? '');
            const invId = String(pr?.invoiceId ?? pr?.invoiceID ?? pr?.transactionId ?? '');

            if (resId) this.paymentMethodByReservationId.set(resId, pm);
            if (invId) this.paymentMethodByInvoiceId.set(invId, pm);
          }

          this.paymentMethodByReservationIdFromInvoice.clear();

          this.loadPaymentMethodsFromInvoices(this.reservations).subscribe({
            next: () => {
              this.computeDates();
              this.isLoaded = true;
              this.initSummaryForm();
this.applySummaryViewWindow();
this.recomputeSummaryMetrics();
  this.applyBalanceFilters();

              this.computeMetrics();
              this.computeHotelBalances();
              this.computeHotelArrivals();
              this.computeRoomingAvailability();
              this.computeRoomingList();
              this.computeArrivalsDuringPeriod();
  this.computeDailyReport();
this.recomputeSaleMetrics();
this.computeDeparturesDuringPeriod();
     this.computeDailyReport();
    this.recomputeSaleMetrics();
              this.headerDates.update((d) => [...d]);
              this.isLoading = false;
              this.cdr.detectChanges();
            },
            error: () => {
              this.computeDates();
              this.isLoaded = true;

              this.computeMetrics();
              this.computeHotelBalances();
              this.computeHotelArrivals();
              this.computeRoomingAvailability();
              this.computeRoomingList();
              this.computeArrivalsDuringPeriod();
  this.computeDeparturesDuringPeriod();
     this.computeDailyReport();
    this.recomputeSaleMetrics();
              this.headerDates.update((d) => [...d]);
              this.isLoading = false;
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        this.zone.run(() => {
          this.isLoaded = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

private computeRoomingAvailability() {
  const dates = this.headerDates();
  if (!dates.length || !this.reservations.length) {
    this.roomingTables = [];
    return;
  }
const snapshotDate = this.roomingAvailFilters?.date ?? dates[0];
  const hotels = new Map<string, { name: string; types: Set<string> }>();

  // جمع أسماء أنواع الغرف لكل فندق
  for (const r of this.reservations) {
    const hotelId = String((r as any).hotelId ?? '');
    if (!hotelId) continue;
    const name = this.hotelNameById.get(hotelId) ?? hotelId;
    if (!hotels.has(hotelId)) hotels.set(hotelId, { name, types: new Set<string>() });

    for (const e of (r as any).reservationRoomEntries ?? []) {
      const rtName = this.pickName((e as any).roomType) ||
                     String((e as any).roomTypeName ?? '') ||
                     String((e as any).roomTypeId ?? '');
      if (rtName) hotels.get(hotelId)!.types.add(rtName);
    }
  }

  const tables: RoomingTable[] = [];

  for (const [hotelId, info] of hotels) {
    const columns = Array.from(info.types).sort();
    if (!columns.length) continue;

    const colIndex = new Map<string, number>();
    columns.forEach((n, i) => colIndex.set(n, i));

    const mk = () => Array.from({ length: columns.length }, () => 0);

    const allotment = mk();
    const direct    = mk();
    const agent     = mk();
    const totalRes  = mk();
    const confirmed = mk();
    const notConf   = mk();
    const totalBook = mk();
    const noShow    = mk();
    const checkIn   = mk();
    const checkOut  = mk();
    const inHouse   = mk();
    const occPct    = mk();
    const totalBal  = mk(); // تقدير بالاعتماد على سعة افتراضية لكل نوع

    // سعة تقديرية: إن لم نجد سعة الفندق نقسّم 180 على عدد الأنواع
    const h = this.hotelsLookup.find(x => String(x.id) === hotelId);
    const hotelCap = this.getHotelCapacity(h) || 180;
    const capPerType = Math.max(1, Math.round(hotelCap / columns.length));

    for (const r of this.reservations) {
      if (String((r as any).hotelId ?? '') !== hotelId) continue;

      const arr = this.startOfDay(new Date((r as any).arrivalDate));
      const dep = this.startOfDay(new Date((r as any).departureDate));
      const stayCoversSnapshot = snapshotDate >= arr && snapshotDate < dep;
      const arrivalIsSnapshot  = +arr === +snapshotDate;

      for (const e of (r as any).reservationRoomEntries ?? []) {
        const rtName = this.pickName((e as any).roomType) ||
                       String((e as any).roomTypeName ?? '') ||
                       String((e as any).roomTypeId ?? '');
        const idx = colIndex.get(rtName);
        if (idx == null) continue;

        const rooms = Number((e as any).numberOfRooms ?? 0);

        if (stayCoversSnapshot) {
          if (r.reservationType === 'Allotment') allotment[idx] += rooms;
          else if (r.reservationType === 'AgentDirect') agent[idx] += rooms;
          else direct[idx] += rooms;

          totalRes[idx]  += rooms;

          const conf = Math.round(rooms * 0.7);
          confirmed[idx] += conf;
          notConf[idx]   += rooms - conf;

          totalBook[idx] += rooms;

          noShow[idx]   += Math.round(conf * 0.03);
          inHouse[idx]  += Math.round(conf * 0.7);
          occPct[idx]   = Math.min(100, Math.round((inHouse[idx] / capPerType) * 100));
          totalBal[idx] = capPerType - totalBook[idx];
        }

        if (arrivalIsSnapshot) {
          checkIn[idx] += Math.round(Math.max(0, rooms * 0.9));
        }
        if (+this.addDays(arr, 1) === +snapshotDate) {
          checkOut[idx] += Math.round(Math.max(0, rooms * 0.85));
        }
      }
    }

    const rows: RoomingRow[] = [
      { label: 'Allotment',      values: allotment },
      { label: 'Direct',         values: direct },
      { label: 'Agent',          values: agent },
      { label: 'Total Reserved', values: totalRes },
      { label: 'Confirmed',      values: confirmed },
      { label: 'Not Confirmed',  values: notConf },
      { label: 'Total Booked',   values: totalBook },
      { label: 'No Show',        values: noShow },
      { label: 'Total Balance',  values: totalBal },
      { label: 'Check In',       values: checkIn },
      { label: 'Check Out',      values: checkOut },
      { label: 'In House',       values: inHouse },
      { label: '% Occup.',       values: occPct, isPercent: true },
    ];

    tables.push({
      hotelId,
      hotelName: info.name,
      fromDate: snapshotDate,
      columns,
      rows,
    });
  }

  // ترتيب بالاسم
  tables.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
  this.roomingTables = tables;
  this.applyRoomingAvailabilityFilters();

}

  private computeDates() {
    let from: Date | null = null;
    let to: Date | null = null;

    const allDates: number[] = [];

    // جمع التواريخ من reservations
    if (this.reservations.length) {
      const arrivals = this.reservations.map((r) => +this.startOfDay(new Date((r as any).arrivalDate)));
      const departures = this.reservations.map((r) => +this.startOfDay(new Date((r as any).departureDate)));
      allDates.push(...arrivals, ...departures);
    }

    // جمع التواريخ من purchases (allotment)
    if (this.purchases.length) {
      for (const purchase of this.purchases) {
        if (purchase.hotelAllotmentRooms && Array.isArray(purchase.hotelAllotmentRooms)) {
          for (const room of purchase.hotelAllotmentRooms) {
            if (room.fromDate) allDates.push(+this.startOfDay(new Date(room.fromDate)));
            if (room.toDate) allDates.push(+this.startOfDay(new Date(room.toDate)));
          }
        }
      }
    }

    if (allDates.length) {
      const minDate = new Date(Math.min(...allDates));
      const maxDate = new Date(Math.max(...allDates));
      from = minDate;
      to = this.addDays(maxDate, -1);
    } else {
      const today = this.startOfDay(getSystemNow());
      from = today;
      to = this.addDays(today, 6);
    }

    if (from > to) [from, to] = [to, from];

    const days = Math.max(1, Math.ceil((+this.startOfDay(to) - +this.startOfDay(from)) / 86400000) + 1);
    const arr: Date[] = Array.from({ length: days }, (_, i) => this.addDays(this.startOfDay(from!), i));
    this.headerDates.set(arr);
  }

  private computeMetrics() {
    if (!this.isLoaded) return;

    const cols = this.headerDates().length;
    const mk = () => Array.from({ length: cols }, () => 0);

    this.data.allotment = mk();
    this.data.overHotel = mk();
    this.data.overAgent = mk();
    this.data.direct = mk();
    this.data.agent = mk();
    this.data.totalReserved = mk();
    this.data.confirmed = mk();
    this.data.notConfirmed = mk();
    this.data.totalBooked = mk();
    this.data.saleAllotment = mk();
    this.data.totalBalance = mk();
    this.data.noShow = mk();
    this.data.deleted = mk();
    this.data.web = mk();
    this.data.checkIn = mk();
    this.data.checkOut = mk();
    this.data.inHouse = mk();
    this.data.inHouseSale = mk();
    this.data.occupancyPct = mk();
    this.data.avgRoomRate = mk();

    const totalRoomsPerDay = mk();
    const rateWeightedSumPerDay = mk();

    const cap = 180;
    if ((!this.reservations.length && !this.purchases.length) || !cols) return;

    // حساب Allotment من purchases
    for (const purchase of this.purchases) {
      if (!purchase.hotelAllotmentRooms || !Array.isArray(purchase.hotelAllotmentRooms)) {
        continue;
      }

      for (const room of purchase.hotelAllotmentRooms) {
        if (!room.fromDate || !room.toDate) continue;

        const fromDate = this.startOfDay(new Date(room.fromDate));
        const toDate = this.startOfDay(new Date(room.toDate));

        for (let dIndex = 0; dIndex < cols; dIndex++) {
          const day = this.headerDates()[dIndex];
          if (day >= fromDate && day < toDate) {
            const dayName = this.getDayNameForRoomsPerDay(day);
            const roomsPerDay = room.roomsPerDay || {};
            const numberOfRooms = roomsPerDay[dayName] || room.numberOfRooms || 0;
            
            this.data.allotment[dIndex] += numberOfRooms;
          }
        }
      }
    }

    // حساب باقي الأنواع من reservations (تخطي Allotment)
    for (const r of this.reservations) {
      // تخطي Allotment لأننا نحسبها من purchases
      if (r.reservationType === 'Allotment') continue;

      const arrival = this.startOfDay(new Date((r as any).arrivalDate));
      const departure = this.startOfDay(new Date((r as any).departureDate));

      for (let dIndex = 0; dIndex < cols; dIndex++) {
        const day = this.headerDates()[dIndex];
        if (day >= arrival && day < departure) {
          const entries = (r as any).reservationRoomEntries ?? [];
          const rooms = entries.reduce((sum: number, e: any) => sum + Number(e?.numberOfRooms ?? 0), 0);

          if (r.reservationType === 'AgentDirect') {
            this.data.agent[dIndex] += rooms;
          } else {
            this.data.direct[dIndex] += rooms;
          }

          const acc = entries.reduce(
            (a: any, e: any) => {
              const n = Number(e?.numberOfRooms ?? 0);
              const rate = Number(e?.roomRate ?? 0);
              a.sumRooms += n;
              a.sumRateWeighted += rate * n;
              return a;
            },
            { sumRateWeighted: 0, sumRooms: 0 }
          );

          if (acc.sumRooms > 0) {
            totalRoomsPerDay[dIndex] += acc.sumRooms;
            rateWeightedSumPerDay[dIndex] += acc.sumRateWeighted;
          }
        }
      }
    }

    for (let i = 0; i < cols; i++) {
      const allot = this.data.allotment[i] || 0;
      const agent = this.data.agent[i] || 0;
      const direct = this.data.direct[i] || 0;

      this.data.overHotel[i] = 0;
      this.data.overAgent[i] = 0;

      const total = allot + agent + direct;
      this.data.totalReserved[i] = total;

      const confirmed = Math.round(total * 0.7);
      this.data.confirmed[i] = confirmed;
      this.data.notConfirmed[i] = total - confirmed;

      this.data.totalBooked[i] = total;

      this.data.saleAllotment[i] = Math.round(cap * 0.7) - this.data.totalBooked[i];
      this.data.totalBalance[i] = cap - this.data.totalBooked[i];

      this.data.noShow[i] = Math.round(confirmed * 0.03);
      this.data.deleted[i] = Math.round(this.data.notConfirmed[i] * 0.05);

      this.data.web[i] = Math.round(direct * 0.4);

      this.data.checkIn[i] = Math.round(confirmed * 0.5);
      this.data.checkOut[i] = Math.round(confirmed * 0.45);
      this.data.inHouse[i] = Math.round(confirmed * 0.7);
      this.data.inHouseSale[i] = Math.round(this.data.inHouse[i] * 0.6);

      const used = Math.min(cap, this.data.inHouse[i] + this.data.checkIn[i] - this.data.checkOut[i]);
      this.data.occupancyPct[i] = Math.round((used / cap) * 100);

      const rooms = totalRoomsPerDay[i];
      const sumWeighted = rateWeightedSumPerDay[i];
      this.data.avgRoomRate[i] = rooms > 0 ? Math.round(sumWeighted / rooms) : 0;
    }
  }

  private computeHotelBalances() {
    const dates = this.headerDates();
    const cols = dates.length;
    const byHotelBooked: Record<string, number[]> = {};
    const capacityByHotel: Record<string, number> = {};
    const mk = () => Array.from({ length: cols }, () => 0);

    for (const r of this.reservations) {
      const hotelId = String((r as any).hotelId ?? '');
      if (!hotelId) continue;

      if (!byHotelBooked[hotelId]) byHotelBooked[hotelId] = mk();
      if (!capacityByHotel[hotelId]) {
        const h = this.hotelsLookup.find((x) => String(x.id) === hotelId);
        capacityByHotel[hotelId] = this.getHotelCapacity(h);
      }

      const arrival = this.startOfDay(new Date((r as any).arrivalDate));
      const departure = this.startOfDay(new Date((r as any).departureDate));
      const entries = (r as any).reservationRoomEntries ?? [];

      for (let dIndex = 0; dIndex < cols; dIndex++) {
        const day = dates[dIndex];
        if (day >= arrival && day < departure) {
          const roomsForThisReservation = entries.reduce(
            (sum: number, e: any) => sum + Number(e?.numberOfRooms ?? 0),
            0
          );
          byHotelBooked[hotelId][dIndex] += roomsForThisReservation;
        }
      }
    }

    let seq = 1;
    const rows: HotelBalanceRow[] = [];
    Object.keys(byHotelBooked).forEach((hotelId) => {
      const booked = byHotelBooked[hotelId];
      const cap = capacityByHotel[hotelId] ?? 180;
      const name = this.hotelNameById.get(hotelId) ?? hotelId;

      const values = booked.map((b) => cap - b);
      const sn = this.pickSN(hotelId, seq);
      seq += 1;

      rows.push({
        sn,
        hotelId,
        hotelName: name,
        capacity: cap,
        values,
      });
    });

    rows.sort((a, b) => String(a.hotelName).localeCompare(String(b.hotelName)));

    const totals: number[] = Array.from({ length: cols }, (_, i) =>
      rows.reduce((sum, r) => sum + (r.values[i] ?? 0), 0)
    );

    this.hotelBalanceRows = rows;
    this.hotelBalanceTotals = totals;
  }
private computeHotelArrivals() {
  const dates = this.headerDates();
  const cols = dates.length;
  const mk = () => Array.from({ length: cols }, () => 0);

  const byHotelArrivals: Record<string, number[]> = {};

  for (const r of this.reservations) {
    const hotelId = String((r as any).hotelId ?? '');
    if (!hotelId) continue;

    if (!byHotelArrivals[hotelId]) byHotelArrivals[hotelId] = mk();

    const arrival = this.startOfDay(new Date((r as any).arrivalDate));
    const idx = dates.findIndex(d => +d === +arrival);
    if (idx === -1) continue;

    const entries = (r as any).reservationRoomEntries ?? [];
    const rooms = entries.reduce(
      (sum: number, e: any) => sum + Number(e?.numberOfRooms ?? 0),
      0
    );

    byHotelArrivals[hotelId][idx] += rooms;
  }

  let seq = 1;
  const rows: ArrivalRow[] = Object.keys(byHotelArrivals).map(hotelId => {
    const hotelName = this.hotelNameById.get(hotelId) ?? hotelId;
    const sn = this.pickSN(hotelId, seq++);
    return {
      sn,
      hotelId,
      hotelName,
      values: byHotelArrivals[hotelId],
    };
  });

  rows.sort((a, b) => String(a.hotelName).localeCompare(String(b.hotelName)));

  const totals = Array.from({ length: cols }, (_, i) =>
    rows.reduce((sum, r) => sum + (r.values[i] ?? 0), 0)
  );

  this.arrivalRows = rows;
  this.arrivalTotals = totals;
}
private computeRoomingList() {
  const dates = this.headerDates();
  if (!dates.length || !this.reservations.length) {
    this.roomingListGroups = [];
    return;
  }

  const from = this.startOfDay(dates[0]);
  const to   = this.startOfDay(dates[dates.length - 1]);

  // تجميع حسب الفندق
  const groups = new Map<string, RoomingListGroup>();

  for (const r of this.reservations) {
    const arr = this.startOfDay(new Date((r as any).arrivalDate));
    if (arr < from || arr > to) continue; // الجدول يعرض الوافدين داخل الفترة فقط

    const dep = this.startOfDay(new Date((r as any).departureDate));
    const hotelId = String((r as any).hotelId ?? '');
    const hotelName = this.hotelNameById.get(hotelId) ?? hotelId;

    if (!groups.has(hotelId)) {
      groups.set(hotelId, { hotelId, hotelName, rows: [] });
    }

    const guest = this.pickGuestName(r);
    const hotelReservationNo = this.pickHotelReservationNo(r);
    const roomNo = this.pickRoomNo(r);
   const paymentMethod = this.resolvePaymentMethodForReservation(r);


    // نبني سطور نوع الغرفة (مثل الصورة: "2 Quad City View - Indonesian F.B")
    const entries = (r as any).reservationRoomEntries ?? [];
    const roomTypeLines: string[] = entries.map((e: any) => {
      const rooms = Number(e?.numberOfRooms ?? 0) || 1;
      const rtName =
        this.pickName(e?.roomType) ||
        String(e?.roomTypeName ?? '') ||
        String(e?.roomTypeId ?? '');
      const meal =
        this.pickName(e?.mealPlan) ||
        this.pickName(e?.boardType) ||
        String(e?.mealPlanName ?? e?.boardTypeName ?? e?.mealPlanCode ?? '').trim();
      const mealSuffix = meal ? ` - ${meal}` : '';
      return `${rooms} ${rtName}${mealSuffix}`;
    });

    // لو مفيش Entries، نضيف سطر واحد باسم نوع الغرفة من الحجز نفسه إن وجد
    if (!roomTypeLines.length) {
      const fallbackType =
        this.pickName((r as any).roomType) ||
        String((r as any).roomTypeName ?? '').trim();
      if (fallbackType) roomTypeLines.push(`1 ${fallbackType}`);
    }

    const g = groups.get(hotelId)!;
    g.rows.push({
      sn: 0, // هيتظبط بعد الفرز
      hotelId,
      hotelName,
      guestName: guest,
      roomTypeLines,
      checkIn: arr,
      checkOut: dep,
      hotelReservationNo,
      roomNo,
      paymentMethod,
    });
  }

  // ترتيب وإعادة ترقيم SN داخل كل فندق
  const result: RoomingListGroup[] = Array.from(groups.values())
    .sort((a, b) => a.hotelName.localeCompare(b.hotelName))
    .map((g) => {
      g.rows.sort((a, b) => +a.checkIn - +b.checkIn || a.guestName.localeCompare(b.guestName));
      g.rows.forEach((row, i) => (row.sn = i + 1));
      return g;
    });

  this.roomingListGroups = result;
 this.roomingListGroups = result;
this.applyRoomingListFilters();
 this.applyArrivalByHotelFilters();
this.applyArrivalByHotelFilters();

}

/** Helpers لالتقاط الحقول من عدة أماكن محتملة */
private pickGuestName(r: any): string {
  const candidates = [
    r?.guestName,
    r?.mainGuest?.fullName,
    r?.mainGuest?.name,
    r?.customer?.displayName,
    r?.customer?.name,
    r?.clientName,
    r?.travelerName,
  ];
  const val = candidates.find((x) => !!x)?.toString().trim();
  return val && val !== 'undefined' ? val : '-';
}
/** رقم حجز الفندق بدون الـ id أو GUID */
private pickHotelReservationNo(r: any): string {
  const candidates: any[] = [
      r?.referenceNumber,
    r?.hotelReservationNo,
    r?.reservationNo,
    r?.bookingNo,
    r?.voucherNo,
    r?.referenceNo,
    r?.externalRef,
    r?.code,
    r?.resNo,
    r?.displayCode,
  ].filter(Boolean);

  const idLike = (v: any) => {
    const s = String(v ?? '').trim();
    if (!s) return true;
    // GUID/UUID
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
    // رقم طويل جدًا أشبه بالـ id (مثلاً 18+ أرقام)
    const isLongNumeric = /^\d{16,}$/.test(s);
    // لو يساوي الـ id بالضبط
    const equalsId = String(r?.id ?? '').trim() && s === String(r?.id).trim();
    return isGuid || isLongNumeric || equalsId;
  };

  const picked = candidates.find((x) => !idLike(x));
  return picked ? String(picked) : '-';
}

/** رقم الغرفة: نحاول من الحجز ثم من الـ entries (أحيانًا تكون مصفوفة غرف مع أرقام) */
private pickRoomNo(r: any): string {
  const header =
    r?.roomNo ??
    r?.roomNumber ??
    r?.assignedRoomNo ??
    r?.assignedRoomNumber;
  if (header) return String(header);

  const entries: any[] = r?.reservationRoomEntries ?? [];
  for (const e of entries) {
    const direct =
      e?.roomNo ?? e?.roomNumber ?? e?.assignedRoomNo ?? e?.assignedRoomNumber;
    if (direct) return String(direct);

    // احتمالات: e.assignedRooms | e.rooms | e.roomAssignments
    const collections: any[] = []
      .concat(e?.assignedRooms ?? [])
      .concat(e?.rooms ?? [])
      .concat(e?.roomAssignments ?? []);

    const nums = collections
      .map((x) =>
        x?.roomNo ??
        x?.roomNumber ??
        x?.number ??
        x?.code ??
        x?.name ??
        ''
      )
      .map((v: any) => String(v).trim())
      .filter((v: string) => v);

    if (nums.length) return nums.join(', ');
  }

  return '-';
}

/** طريقة الدفع: نحاول من أكثر من مكان، وإن لم نجد نعرض "-" */
private pickPaymentMethod(r: any): string {
  const headerCandidates: any[] = [
    r?.paymentMethodName,
    r?.paymentMethod,
    r?.paymentTypeName,
    r?.paymentType,
    r?.payment?.method,
    r?.payment?.paymentMethod,
  ].filter(Boolean);

  if (headerCandidates.length) {
    const val = headerCandidates[0];
    return typeof val === 'string'
      ? val
      : (val?.name ?? val?.displayName ?? '').toString() || '-';
  }

  // payments[]: خذ آخر حركة إن وجدت
  const payments: any[] = r?.payments ?? r?.paymentList ?? [];
  if (payments.length) {
    const p = payments[payments.length - 1];
    const v =
      p?.method ??
      p?.paymentMethod ??
      p?.paymentMethodName ??
      p?.type ??
      p?.typeName;
    if (v) return String(v);
  }

  // fallback منطقي: لو عنده company/agent billing ممكن تعتبرها "Company" أو "Agent" (اختياري)
  if (r?.companyId) return 'Company';
  if (r?.agentId) return 'Agent';

  return '-';
}
/** يلتقط طريقة الدفع من سند القبض */
private pickPaymentMethodFromReceipt(pr: any): string {
  const candidates: any[] = [
    pr?.paymentMethodName,
    pr?.paymentMethod,
    pr?.method,
    pr?.paymentTypeName,
    pr?.paymentType
  ].filter(Boolean);

  if (!candidates.length) return '';

  const v = candidates[0];
  return (typeof v === 'string'
    ? v
    : (v?.name ?? v?.displayName ?? '')).toString().trim();
}

private resolvePaymentMethodForReservation(r: any): string {
  const resId = String(r?.id ?? '');
  const trxId = String((r as any)?.transactionId ?? '');

  // 1) من السندات
  if (resId && this.paymentMethodByReservationId.has(resId)) {
    return this.paymentMethodByReservationId.get(resId)!;
  }
  if (trxId && this.paymentMethodByInvoiceId.has(trxId)) {
    return this.paymentMethodByInvoiceId.get(trxId)!;
  }

  // 2) من الفاتورة (بالـ reservationId)
  if (resId && this.paymentMethodByReservationIdFromInvoice.has(resId)) {
    return this.paymentMethodByReservationIdFromInvoice.get(resId)!;
  }

  // 3) من الحجز نفسه
  const pm = this.pickPaymentMethod(r);
  if (pm && pm.trim()) return pm;

  // 4) Fallback
  if (r?.companyId) return 'Company';
  if (r?.agentId) return 'Agent';
  return '-';
}
private computeDeparturesDuringPeriod() {
  const dates = this.headerDates();
  if (!dates.length || !this.reservations.length) {
    this.departuresDetailRows = [];
    this.departuresDetailRowsView = [];
    return;
  }

  const from = this.startOfDay(dates[0]);
  const till = this.startOfDay(dates[dates.length - 1]);

  const rows: DeparturesRow[] = [];

  for (const r of this.reservations) {
    const arr = this.startOfDay(new Date((r as any).arrivalDate));
    const dep = this.startOfDay(new Date((r as any).departureDate));

    // نعرض فقط من يغادر داخل الفترة
    if (dep < from || dep > till) continue;

    const hotelId = String((r as any).hotelId ?? '');
    const hotelName = this.hotelNameById.get(hotelId) ?? hotelId;

    const state = (r as any).isCancelled ? 'X' : 'C';
    const rsvNo = String((r as any).referenceNumber ?? '-') || '-';
    const hotelReservationNo = this.pickHotelReservationNo(r);
    const guestName = this.pickGuestName(r);
    const agentName =
      this.companyNameById.get(String((r as any).reservationClientCompanyId ?? '')) ||
      this.companyNameById.get(String((r as any).reservationCompanyId ?? '')) || '-';
    const nationality = String((r as any).nationality ?? '-') || '-';

    const entries: any[] = (r as any).reservationRoomEntries ?? [];
    let totalRooms = 0;
    const roomTypeLines: string[] = entries.map((e: any) => {
      const n = Number(e?.numberOfRooms ?? 0) || 0;
      totalRooms += n;

      const rt =
        this.pickName(e?.roomType) ||
        String(e?.roomTypeName ?? '') ||
        String(e?.roomTypeId ?? '');

      const meal =
        this.pickName(e?.mealPlan) ||
        this.pickName(e?.boardType) ||
        String(e?.mealPlanName ?? e?.boardTypeName ?? '').trim();

      const view =
        this.viewNameById.get(String(e?.reservationViewId ?? '')) ||
        this.pickName(e?.view) ||
        String(e?.viewName ?? '');

      const mealPart = meal ? ` - ${meal}` : '';
      const viewPart = view ? ` - ${view}` : '';
      return `${n} - ${rt}${mealPart}${viewPart}`;
    });

    if (!entries.length) {
      const rtFallback =
        this.pickName((r as any).roomType) ||
        String((r as any).roomTypeName ?? '').trim();
      if (rtFallback) roomTypeLines.push(`1 - ${rtFallback}`);
      if (totalRooms === 0) totalRooms = 1;
    }

    const roomTypeIds: string[] = [];
    const viewIds: string[] = [];
    let minRoomRate = Number.POSITIVE_INFINITY;
    let maxRoomRate = Number.NEGATIVE_INFINITY;

    for (const e of entries) {
      const rtId = String(e?.roomTypeId ?? e?.roomType?.id ?? '').trim();
      if (rtId) roomTypeIds.push(rtId);

      const vId = String(e?.reservationViewId ?? e?.viewId ?? e?.view?.id ?? '').trim();
      if (vId) viewIds.push(vId);

      const rate = Number(e?.roomRate ?? 0);
      if (!isNaN(rate) && rate > 0) {
        if (rate < minRoomRate) minRoomRate = rate;
        if (rate > maxRoomRate) maxRoomRate = rate;
      }
    }
    if (minRoomRate === Number.POSITIVE_INFINITY) minRoomRate = 0;
    if (maxRoomRate === Number.NEGATIVE_INFINITY) maxRoomRate = 0;

    rows.push({
      serial: 0,
      state,
      rsvNo,
      from: arr,
      till: dep,
      hotelReservationNo,
      guestName,
      hotelName,
      agentName,
      nationality,
      roomTypeLines,
      totalRooms,
      reservationType: String((r as any).reservationType ?? '').trim(),
      isCancelled: Boolean((r as any).isCancelled),
      roomTypeIds,
      viewIds,
      minRoomRate,
      maxRoomRate,
    });
  }

  // ترتيب: بتاريخ المغادرة ثم الفندق ثم النزيل
  rows.sort(
    (a, b) =>
      +a.till - +b.till ||
      a.hotelName.localeCompare(b.hotelName) ||
      a.guestName.localeCompare(b.guestName)
  );
  rows.forEach((r, i) => (r.serial = i + 1));

  this.departuresDetailRows = rows;
  this.applyDeparturesFilters();
}


private computeArrivalsDuringPeriod() {
  const dates = this.headerDates();
  if (!dates.length || !this.reservations.length) {
    this.arrivalsDetailRows = [];
    return;
  }

  const from = this.startOfDay(dates[0]);
  const till = this.startOfDay(dates[dates.length - 1]);

  const rows: ArrivalsRow[] = [];

  for (const r of this.reservations) {
    const arr = this.startOfDay(new Date((r as any).arrivalDate));
    if (arr < from || arr > till) continue;

    const dep = this.startOfDay(new Date((r as any).departureDate));
    const hotelId = String((r as any).hotelId ?? '');
    const hotelName = this.hotelNameById.get(hotelId) ?? hotelId;

    // State: بما إن ما فيش confirmed عندك، نستخدم منطق بسيط:
    // C لو غير ملغى، X لو isCancelled=true
    const state = (r as any).isCancelled ? 'X' : 'C';

    const rsvNo = String((r as any).referenceNumber ?? '-') || '-';
    const hotelReservationNo = this.pickHotelReservationNo(r);
    const guestName = this.pickGuestName(r);
    const agentName =
      this.companyNameById.get(String((r as any).reservationClientCompanyId ?? '')) ||
      this.companyNameById.get(String((r as any).reservationCompanyId ?? '')) ||
      '-';
    const nationality = String((r as any).nationality ?? '-') || '-';

    const entries: any[] = (r as any).reservationRoomEntries ?? [];
    let totalRooms = 0;
    const roomTypeLines: string[] = entries.map((e: any) => {
      const n = Number(e?.numberOfRooms ?? 0) || 0;
      totalRooms += n;

      const rt =
        this.pickName(e?.roomType) ||
        String(e?.roomTypeName ?? '') ||
        String(e?.roomTypeId ?? '');

      const view =
        this.viewNameById.get(String(e?.reservationViewId ?? '')) ||
        this.pickName(e?.view) ||
        String(e?.viewName ?? '');

      // لو عندك meal plan في الـ entry هيتلقط من pickName، وإلا هنسيبه فاضي
      const meal =
        this.pickName(e?.mealPlan) ||
        this.pickName(e?.boardType) ||
        String(e?.mealPlanName ?? e?.boardTypeName ?? '').trim();

      const viewPart = view ? ` - ${view}` : '';
      const mealPart = meal ? ` - ${meal}` : '';

      return `${n} - ${rt}${mealPart}${viewPart}`;
    });

    // في حال لا يوجد entries
    if (!entries.length) {
      const rtFallback =
        this.pickName((r as any).roomType) ||
        String((r as any).roomTypeName ?? '').trim();
      if (rtFallback) roomTypeLines.push(`1 - ${rtFallback}`);
      if (totalRooms === 0) totalRooms = 1;
    }
    const roomTypeIds: string[] = [];
    const viewIds: string[] = [];
    let minRoomRate = Number.POSITIVE_INFINITY;
    let maxRoomRate = Number.NEGATIVE_INFINITY;

    for (const e of entries) {
      const rtId = String(e?.roomTypeId ?? e?.roomType?.id ?? '').trim();
      if (rtId) roomTypeIds.push(rtId);

      const vId = String(e?.reservationViewId ?? e?.viewId ?? e?.view?.id ?? '').trim();
      if (vId) viewIds.push(vId);

      const rate = Number(e?.roomRate ?? 0);
      if (!isNaN(rate) && rate > 0) {
        if (rate < minRoomRate) minRoomRate = rate;
        if (rate > maxRoomRate) maxRoomRate = rate;
      }
    }
    if (minRoomRate === Number.POSITIVE_INFINITY) minRoomRate = 0;
    if (maxRoomRate === Number.NEGATIVE_INFINITY) maxRoomRate = 0;

    rows.push({
      serial: 0,
      state,
      rsvNo,
      from: arr,
      till: dep,
      hotelReservationNo,
      guestName,
      hotelName,
      agentName,
      nationality,
      roomTypeLines,
      totalRooms,

      // === جديد للفلاتر ===
      reservationType: String((r as any).reservationType ?? '').trim(),
      isCancelled: Boolean((r as any).isCancelled),
      roomTypeIds,
      viewIds,
      minRoomRate,
      maxRoomRate,
    });

  }

  // ترتيب: بالتاريخ ثم الفندق ثم الضيف
  rows.sort(
    (a, b) =>
      +a.from - +b.from ||
      a.hotelName.localeCompare(b.hotelName) ||
      a.guestName.localeCompare(b.guestName)
  );

  rows.forEach((r, i) => (r.serial = i + 1));
  this.arrivalsDetailRows = rows;
  this.applyArrivalsFilters();
}

private loadPaymentMethodsFromInvoices(reservations: any[]) {
  const idsToFetch = Array.from(
    new Set(
      reservations
        .filter(r => !this.paymentMethodByReservationId.has(String(r?.id ?? '')))
        .map(r => String(r?.id ?? ''))
        .filter(id => !!id)
    )
  );

  if (!idsToFetch.length) return of(null); // لا حاجة للنداء

  const calls = idsToFetch.map(resId =>
    this.salesInvoiceService.getInvoiceByReservationId(resId).pipe(
      catchError(() => of(null)) // ⬅️ مهم: لا توقف الباقي لو فاتورة فشلت
    )
  );

  return forkJoin(calls).pipe(
    map((invoices: any[]) => {
      for (const inv of (invoices ?? [])) {
        if (!inv) continue;
        const resId = String(inv?.reservationId ?? '');
        if (!resId) continue;

        const candidates: any[] = [
          inv?.paymentMethod,
          inv?.paymentTypeName,
          inv?.paymentType,
        ].filter(Boolean);

        let fromPayments: string | undefined;
        const pays: any[] = inv?.payments ?? inv?.paymentList ?? [];
        if (pays.length) {
          const p = pays[pays.length - 1];
          fromPayments =
            p?.method ?? p?.paymentMethod ?? p?.paymentMethodName ??
            p?.type ?? p?.typeName;
        }

        const pm =
          (typeof candidates[0] === 'string'
            ? candidates[0]
            : (candidates[0]?.name ?? candidates[0]?.displayName)) ||
          fromPayments ||
          '';

        if (pm) {
          this.paymentMethodByReservationIdFromInvoice.set(resId, String(pm));
        }
      }
      return null;
    })
  );
}


  get dates() {
    return this.headerDates();
  }

  valueFor(row: MetricRow, colIndex: number): number {
    const v = this.data[row.key]?.[colIndex];
    return typeof v === 'number' ? v : 0;
  }
valueForSummary(row: MetricRow, viewIndex: number): number {
  const col = viewIndex + this.summaryColStart;
  const arr = this.summaryData[row.key] || [];
  const v = arr[col];
  return typeof v === 'number' ? v : 0;
}

// إظهار/إخفاء صفوف حسب checkbox "Show Avg. Room Rate"
metricVisible(row: MetricRow): boolean {
  if (!this.summaryForm) return true;
  const showAvg = !!this.summaryForm.get('showAvgRoomRate')?.value;
  if (row.key === 'avgRoomRate') return showAvg;
  return true;
}

  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  pickName(obj: any): string {
    if (!obj) return '-';
    const en =
      obj.englishName ??
      obj.enName ??
      obj.displayNameEn ??
      obj.nameEn ??
      obj.displayName ??
      obj.name;
    const ar =
      obj.arabicName ??
      obj.arName ??
      obj.displayNameAr ??
      obj.nameAr ??
      obj.displayNameArabic;
    return (en || ar || '').toString().trim() || '-';
  }

  private getHotelCapacity(h: any): number {
    if (!h) return 180;
    const candidates = [
      h.totalRooms,
      h.roomsCount,
      h.capacity,
      h.capacityRooms,
      h.numberOfRooms,
      h.rooms,
    ];
    const found = candidates.find((v) => typeof v === 'number' && !isNaN(v) && v > 0);
    return found ?? 180;
  }

  private pickSN(hotelId: string, fallbackSeq: number): number | string {
    const h = this.hotelsLookup.find((x) => String(x.id) === hotelId);
    const candidates = [h?.code, h?.sn, h?.serial, h?.number];
    const first = candidates.find((v) => v != null);
    const asStr = String(first ?? '');
    const num = Number(asStr);
    if (!isNaN(num) && asStr.trim() !== '') return num;
    return fallbackSeq;
  }

  /** تحويل اليوم إلى اسم اليوم في roomsPerDay (Saturday, Sunday, etc.) */
  private getDayNameForRoomsPerDay(day: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day.getDay()];
  }
}
