import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  effect,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';

// Services
import { ReservationService } from '../../../services/reservations/reservation.service';
import { HotelService } from '../../../services/hotels/hotel.service';
import { RoomTypeService } from '../../../services/room-type/room-type.service';
import { ReservationViewService } from '../../../services/reservations/reservation-view.service';
import { ReservationCompanyService } from '../../../services/reservations/reservation-company.service';

// Models
import { ReservationModel } from '../../../models/accounting/reservation-model';

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

interface MetricRow {
  key: MetricKey;
  label: string;
  rowClass?: string;
  showWhen?: (form: FormGroup) => boolean;
}

@Component({
  selector: 'app-room-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './room-availability.component.html',
  styleUrls: ['./room-availability.component.scss'],
})
export class RoomAvailabilityComponent {
  private dp = new DatePipe('en-US');

  form!: FormGroup;
  reservations: ReservationModel[] = [];
  purchases: any[] = []; // بيانات المشتريات (allotment)

  // حالات التحميل/الجهوزية
  isLoading = true;
  isLoaded = false;

  // lookup maps
  private hotelNameById = new Map<string, string>();
  private roomTypeNameById = new Map<string, string>();
  private viewNameById = new Map<string, string>();
  private companyNameById = new Map<string, string>(); // ReservationCompany name
  private salesRepNameById = new Map<string, string>();
  private seasonNameById = new Map<string, string>();
  private sourceNameById = new Map<string, string>();

  // Filter options
  hotels: string[] = [];
  views: string[] = [];
  reservationTypes: string[] = [];
  roomTypes: string[] = [];
  sources: string[] = [];
  companies: string[] = [];

  // Table header dates
  headerDates = signal<Date[]>([]);
  dayName = (d: Date) =>
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  dateShort = (d: Date) => this.dp.transform(d, 'dd/MM/yyyy')!;
  dateIso = (d: Date) => this.dp.transform(d, 'dd/MM/yyyy')!;

  readonly infoRows = [
    { label: 'Date', value: (d: Date) => this.dp.transform(d, 'dd/MM/yyyy')! },
    { label: 'Day', value: (d: Date) => this.dayName(d) },
    { label: 'Event', value: (d: Date) => this.dp.transform(d, 'dd/MM/yyyy')! },
  ];

  metricRows: MetricRow[] = [
    { key: 'allotment', label: 'Allotment' },
    { key: 'overHotel', label: 'Over Hotel' },
    { key: 'overAgent', label: 'Over Agent' },
    { key: 'direct', label: 'Direct' },
    { key: 'agent', label: 'Agent' },
    { key: 'totalReserved', label: 'Total Reserved', rowClass: 'bg-purple' },
    { key: 'confirmed', label: 'Confirmed', rowClass: 'bg-yellow' },
    { key: 'notConfirmed', label: 'Not Confirmed', rowClass: 'bg-yellow' },
    { key: 'totalBooked', label: 'Total Booked', rowClass: 'bg-pink' },
    { key: 'saleAllotment', label: 'Sale Allotment' },
    { key: 'totalBalance', label: 'Total Balance', rowClass: 'bg-green' },
    { key: 'noShow', label: 'No Show' },
    { key: 'deleted', label: 'Deleted' },
    { key: 'web', label: 'Web' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'inHouse', label: 'In House' },
    { key: 'inHouseSale', label: 'In House (Sale)' },
    { key: 'occupancyPct', label: '% Occup.' },
    {
      key: 'avgRoomRate',
      label: 'Avg Room Rate (Without Vat)',
      rowClass: 'bg-red',
      showWhen: (f) => !!f.get('showAvgRoomType')!.value,
    },
  ];

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

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private roomTypeService: RoomTypeService,
    private reservationViewService: ReservationViewService,
    private companyService: ReservationCompanyService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      hotel: [''],
      view: [''],
      reservationType: [''],
      roomType: [''],
      source: [''],
      company: [''],
      fromDate: [''],
      toDate: [''],
      showAvgRoomType: [true],
    });

    // NOTE: effect() لا يتتبع تغييرات Reactive Forms، لكنه ينفّذ مرة أولى
    effect(() => {
      const fromRaw = this.form.get('fromDate')!.value;
      const toRaw = this.form.get('toDate')!.value;
      const from = this.parseDateOrNull(fromRaw);
      const to = this.parseDateOrNull(toRaw);

      if (from && to && from > to) {
        this.form.get('toDate')!.setValue(this.toIso(this.addDays(from, 6)), {
          emitEvent: false,
        });
      }
      // يُنفَّذ مرة أولى فقط بشكل فعلي هنا
      this.computeDates();
      if (this.isLoaded) this.computeMetrics();
    });

    // تحميل مبدئي
    this.initialLoad();
  }

  // أزرار
  view() {
    this.computeDates();
    this.computeMetrics();
    this.cdr.detectChanges();
  }
  print() {
    window.print();
  }
  exit() {
    history.back();
  }

  // Helpers
  private asArray<T = any>(v: unknown): T[] {
    return Array.isArray(v) ? (v as T[]) : [];
  }

  /** تحميل الحجوزات + اللّوكتب */
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
      sales: of<any[]>([]),
      seasons: of<any[]>([]),
      sources: of<any[]>([]),
    });

    forkJoin({ reservations: reservations$, purchases: purchases$, lookups: lookups$ }).subscribe({
      next: ({ reservations, purchases, lookups }) => {
        // شغّل كل التحديثات داخل الـ Zone لضمان تشغيل Change Detection
        this.zone.run(() => {
          // تخزين بيانات الحجوزات
          this.reservations = this.asArray<ReservationModel>(reservations);
          // تخزين بيانات المشتريات (allotment)
          this.purchases = this.asArray<any>(purchases);

          const hotels = this.asArray<any>(lookups?.hotels);
          const roomTypes = this.asArray<any>(lookups?.roomTypes);
          const views = this.asArray<any>(lookups?.views);
          const companies = this.asArray<any>(lookups?.companies);
          const sales = this.asArray<any>(lookups?.sales);
          const seasons = this.asArray<any>(lookups?.seasons);
          const sources = this.asArray<any>(lookups?.sources);

          // إنشاء الخرائط للمحتوى
          this.hotelNameById = new Map(
            hotels.map((h: any) => [String(h.id), this.pickName(h)])
          );
          this.roomTypeNameById = new Map(
            roomTypes.map((rt: any) => [String(rt.id), this.pickName(rt)])
          );
          this.viewNameById = new Map(
            views.map((v: any) => [String(v.id), this.pickName(v)])
          );
          this.companyNameById = new Map(
            companies.map((c: any) => [String(c.id), this.pickName(c)])
          );
          this.salesRepNameById = new Map(
            sales.map((s: any) => [String(s.id), this.pickName(s)])
          );
          this.seasonNameById = new Map(
            seasons.map((s: any) => [String(s.id), this.pickName(s)])
          );
          this.sourceNameById = new Map(
            sources.map((s: any) => [String(s.id), this.pickName(s)])
          );

          // بناء الفلاتر من البيانات (يجب أن يكون بعد تحميل purchases)
          this.buildFilterOptionsFromData();

          // حساب التواريخ أولاً (يجب أن يشمل purchases أيضاً)
          this.computeDates();

          // مهم: set isLoaded قبل computeMetrics (لأن computeMetrics تتحقق منه)
          this.isLoaded = true;

          // حساب المقاييس بعد اكتمال التحميل
          this.computeMetrics();

          // تحديث الإشارة لضمان إعادة الرسم (نسخة جديدة من المصفوفة)
          this.headerDates.update((d) => [...d]);

          // إيقاف حالة التحميل
          this.isLoading = false;

          // إجبار كشف التغييرات فورًا
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error loading initial data', err);
        this.zone.run(() => {
          this.isLoaded = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
    });
  }

  /** يبني خيارات الفلاتر من الداتا */
  private buildFilterOptionsFromData() {
    const hotelNames = new Set<string>();
    const viewNames = new Set<string>();
    const typeCodes = new Set<string>();
    const roomTypeNames = new Set<string>();
    const sourceNames = new Set<string>();
    const companyNames = new Set<string>();

    // إضافة بيانات من purchases (allotment)
    for (const purchase of this.purchases) {
      const hId = purchase.hotelId;
      if (hId) {
        const hName = this.hotelNameById.get(String(hId)) ?? String(hId);
        hotelNames.add(hName);
      }

      for (const room of purchase.hotelAllotmentRooms || []) {
        const rtName = this.nameFromIdOrObj(
          room?.roomTypeId,
          room?.roomType,
          this.roomTypeNameById
        );
        if (rtName && rtName !== '-') roomTypeNames.add(rtName);

        const vName = this.nameFromIdOrObj(
          room?.viewId,
          room?.view,
          this.viewNameById
        );
        if (vName && vName !== '-') viewNames.add(vName);
      }
    }

    // إضافة بيانات من reservations
    for (const r of this.reservations) {
      const hId = (r as any).hotelId;
      if (hId) {
        const hName = this.hotelNameById.get(String(hId)) ?? String(hId);
        hotelNames.add(hName);
      }

      if (r.reservationType) typeCodes.add(r.reservationType);

      const srcName = this.deriveSourceName(r);
      if (srcName && srcName !== '-') sourceNames.add(srcName);

      const compIds = [
        (r as any).reservationCompanyId,
        (r as any).reservationClientCompanyId,
      ].filter(Boolean);

      for (const cid of compIds) {
        const idStr = String(cid);
        const cName = this.companyNameById.get(idStr);
        if (cName) companyNames.add(cName);
      }

      for (const e of r.reservationRoomEntries ?? []) {
        const rtName = this.nameFromIdOrObj(
          (e as any)?.roomTypeId,
          (e as any)?.roomType,
          this.roomTypeNameById
        );
        if (rtName && rtName !== '-') roomTypeNames.add(rtName);

        const vName = this.nameFromIdOrObj(
          (e as any)?.reservationViewId,
          (e as any)?.reservationView,
          this.viewNameById
        );
        if (vName && vName !== '-') viewNames.add(vName);
      }
    }

    this.hotels = Array.from(hotelNames).sort();
    this.views = Array.from(viewNames).sort();
    this.reservationTypes = Array.from(typeCodes).sort();
    this.roomTypes = Array.from(roomTypeNames).sort();
    this.sources = Array.from(sourceNames).sort();
    this.companies = Array.from(companyNames).sort();
  }

  /** التواريخ ديناميكية */
  private computeDates() {
    const fromControl = this.parseDateOrNull(this.form.get('fromDate')?.value);
    const toControl = this.parseDateOrNull(this.form.get('toDate')?.value);

    const filteredNoDate = this.filteredReservationsNoDate();
    const filteredPurchases = this.filteredPurchasesNoDate();

    let from: Date | null = fromControl ? this.startOfDay(fromControl) : null;
    let to: Date | null = toControl ? this.startOfDay(toControl) : null;

    if (!from || !to) {
      const allDates: number[] = [];
      
      // إضافة تواريخ من reservations
      if (filteredNoDate.length) {
        const arrivals = filteredNoDate.map(
          (r) => +this.startOfDay(new Date(r.arrivalDate as any))
        );
        const departures = filteredNoDate.map(
          (r) => +this.startOfDay(new Date(r.departureDate as any))
        );
        allDates.push(...arrivals, ...departures);
      }
      
      // إضافة تواريخ من purchases
      if (filteredPurchases.length) {
        for (const purchase of filteredPurchases) {
          for (const room of purchase.hotelAllotmentRooms || []) {
            if (room.fromDate) {
              allDates.push(+this.startOfDay(new Date(room.fromDate)));
            }
            if (room.toDate) {
              allDates.push(+this.startOfDay(new Date(room.toDate)));
            }
          }
        }
      }
      
      if (allDates.length > 0) {
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        if (!from) from = minDate;
        if (!to) to = this.addDays(maxDate, -1);
      } else {
        const today = this.startOfDay(new Date());
        from = today;
        to = this.addDays(today, 6);
      }
    }

    if (from > to) [from, to] = [to, from];

    const days = Math.max(
      1,
      Math.ceil((+this.startOfDay(to) - +this.startOfDay(from)) / 86400000) + 1
    );

    const arr: Date[] = Array.from({ length: days }, (_, i) =>
      this.addDays(this.startOfDay(from!), i)
    );

    this.headerDates.set(arr);
  }

  /** فلترة المشتريات (allotment) بدون أي تقييد تاريخي */
  private filteredPurchasesNoDate(): any[] {
    const f = this.form.getRawValue();

    return (this.purchases ?? []).filter((purchase) => {
      // Hotel by name
      if (f.hotel) {
        const hId = purchase.hotelId;
        const hName = hId
          ? this.hotelNameById.get(String(hId)) ?? String(hId)
          : '-';
        if (hName !== f.hotel) return false;
      }

      // Room Type
      if (f.roomType) {
        const ok = (purchase.hotelAllotmentRooms || []).some((room: any) => {
          const rtName = this.nameFromIdOrObj(
            room?.roomTypeId,
            room?.roomType,
            this.roomTypeNameById
          );
          return rtName === f.roomType;
        });
        if (!ok) return false;
      }

      // View
      if (f.view) {
        const ok = (purchase.hotelAllotmentRooms || []).some((room: any) => {
          const vName = this.nameFromIdOrObj(
            room?.viewId,
            room?.view,
            this.viewNameById
          );
          return vName === f.view;
        });
        if (!ok) return false;
      }

      return true;
    });
  }

  /** فلترة الحجوزات بدون أي تقييد تاريخي */
  private filteredReservationsNoDate(): ReservationModel[] {
    const f = this.form.getRawValue();

    return (this.reservations ?? []).filter((r) => {
      // Hotel by name
      if (f.hotel) {
        const hId = (r as any).hotelId;
        const hName = hId
          ? this.hotelNameById.get(String(hId)) ?? String(hId)
          : '-';
        if (hName !== f.hotel) return false;
      }

      // Reservation Type
      if (f.reservationType && r.reservationType !== f.reservationType)
        return false;

      // Source (by name)
      if (f.source) {
        const srcName = this.deriveSourceName(r);
        if (srcName !== f.source) return false;
      }

      // Company (by name)
      if (f.company) {
        const names = this.companyNamesFor(r).split(' / ');
        if (!names.includes(f.company)) return false;
      }

      // Room Type
      if (f.roomType) {
        const ok = (r.reservationRoomEntries ?? []).some((e) => {
          const rtName = this.nameFromIdOrObj(
            (e as any)?.roomTypeId,
            (e as any)?.roomType,
            this.roomTypeNameById
          );
          return rtName === f.roomType;
        });
        if (!ok) return false;
      }

      // View
      if (f.view) {
        const ok = (r.reservationRoomEntries ?? []).some((e) => {
          const vName = this.nameFromIdOrObj(
            (e as any)?.reservationViewId,
            (e as any)?.reservationView,
            this.viewNameById
          );
          return vName === f.view;
        });
        if (!ok) return false;
      }

      return true;
    });
  }

  /** حساب المقاييس اليومية */
  private computeMetrics() {
    if (!this.isLoaded) return;

    const cols = this.headerDates().length;
    const mk = () => Array.from({ length: cols }, () => 0);

    // reset
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

    const cap = 180; // افتراضي
    const reservations = this.filteredReservationsNoDate();
    const purchases = this.filteredPurchasesNoDate();
    
    if ((!reservations.length && !purchases.length) || !cols) return;

    // حساب الـ allotment من purchases
    for (const purchase of purchases) {
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
            // الحصول على عدد الغرف لهذا اليوم من roomsPerDay
            const dayName = this.getDayNameForRoomsPerDay(day);
            const roomsPerDay = room.roomsPerDay || {};
            const numberOfRooms = roomsPerDay[dayName] || room.numberOfRooms || 0;
            
            this.data.allotment[dIndex] += numberOfRooms;
          }
        }
      }
    }

    // حساب باقي الأنواع من reservations
    for (const r of reservations) {
      const arrival = this.startOfDay(new Date(r.arrivalDate as any));
      const departure = this.startOfDay(new Date(r.departureDate as any));

      for (let dIndex = 0; dIndex < cols; dIndex++) {
        const day = this.headerDates()[dIndex];
        if (day >= arrival && day < departure) {
          const entries = (r as any).reservationRoomEntries ?? [];

          const rooms = entries.reduce(
            (sum: number, e: any) => sum + Number(e?.numberOfRooms ?? 0),
            0
          );

          // لا نحسب Allotment من reservations لأننا نحسبها من purchases
          if (r.reservationType === 'AgentDirect') {
            this.data.agent[dIndex] += rooms;
          } else if (r.reservationType !== 'Allotment') {
            this.data.direct[dIndex] += rooms;
          }

          const { sumRateWeighted, sumRooms } = entries.reduce(
            (acc: any, e: any) => {
              const n = Number(e?.numberOfRooms ?? 0);
              const rate = Number(e?.roomRate ?? 0);
              acc.sumRooms += n;
              acc.sumRateWeighted += rate * n;
              return acc;
            },
            { sumRateWeighted: 0, sumRooms: 0 }
          );

          if (sumRooms > 0) {
            totalRoomsPerDay[dIndex] += sumRooms;
            rateWeightedSumPerDay[dIndex] += sumRateWeighted;
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

      this.data.saleAllotment[i] = Math.max(
        0,
        Math.round(cap * 0.7) - this.data.totalBooked[i]
      );
      this.data.totalBalance[i] = Math.max(0, cap - this.data.totalBooked[i]);

      this.data.noShow[i] = Math.round(confirmed * 0.03);
      this.data.deleted[i] = Math.round(this.data.notConfirmed[i] * 0.05);

      this.data.web[i] = Math.round(direct * 0.4);

      this.data.checkIn[i] = Math.round(confirmed * 0.5);
      this.data.checkOut[i] = Math.round(confirmed * 0.45);
      this.data.inHouse[i] = Math.round(confirmed * 0.7);
      this.data.inHouseSale[i] = Math.round(this.data.inHouse[i] * 0.6);

      const used = Math.min(
        cap,
        this.data.inHouse[i] + this.data.checkIn[i] - this.data.checkOut[i]
      );
      this.data.occupancyPct[i] = Math.round((used / cap) * 100);

      const rooms = totalRoomsPerDay[i];
      const sumWeighted = rateWeightedSumPerDay[i];
      this.data.avgRoomRate[i] =
        rooms > 0 ? Math.round(sumWeighted / rooms) : 0;
    }
  }

  // Getters
  get dates() {
    return this.headerDates();
  }

  metricVisible(row: MetricRow): boolean {
    return row.showWhen ? row.showWhen(this.form) : true;
  }

  valueFor(row: MetricRow, colIndex: number): number {
    const v = this.data[row.key]?.[colIndex];
    return typeof v === 'number' ? v : 0;
  }

  // Utils
  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  private toIso(d: Date) {
    return this.dp.transform(d, 'yyyy-MM-dd')!;
  }
  private parseDateOrNull(v: any): Date | null {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(+d) ? null : d;
  }

  private pickName(obj: any): string {
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

  private nameFromIdOrObj(
    id?: any,
    obj?: any,
    map?: Map<string, string>
  ): string {
    if (obj) return this.pickName(obj);
    if (id == null) return '-';
    const k = String(id);
    return map?.get(k) ?? '-';
  }

  /** تحويل اليوم إلى اسم اليوم في roomsPerDay (Saturday, Sunday, etc.) */
  private getDayNameForRoomsPerDay(date: Date): string {
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[day];
  }

  /** أسماء الشركات (company + clientCompany) */
  private companyNamesFor(r: any): string {
    const ids = [r?.reservationCompanyId, r?.reservationClientCompanyId].filter(
      Boolean
    );
    const names = ids
      .map((id: any) => this.companyNameById.get(String(id)))
      .filter((n): n is string => !!n);
    return names.length ? Array.from(new Set(names)).join(' / ') : '-';
  }

  private deriveSourceName(r: any): string {
    if (r.reservationSource) return this.pickName(r.reservationSource);
    if (r.sourceName) return String(r.sourceName);
    if (r.source) return this.pickName(r.source);
    if (r.sourceId && this.sourceNameById.size) {
      return this.sourceNameById.get(String(r.sourceId)) ?? '-';
    }

    const t = r.reservationType;
    if (t === 'Allotment') return 'Allotment';
    if (t === 'AgentDirect') return 'Agent';
    if (t === 'HotelDirect') return 'Hotel';

    if (
      r.reservationCompanyId &&
      r.reservationClientCompanyId &&
      String(r.reservationCompanyId) !== String(r.reservationClientCompanyId)
    ) {
      return 'Agent';
    }

    return 'Direct';
  }
}
