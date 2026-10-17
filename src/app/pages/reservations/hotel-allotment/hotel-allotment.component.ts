import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { forkJoin } from 'rxjs';

// خدمات وموديلات
import { ReservationService } from '../../../services/reservations/reservation.service';
import { HotelService } from '../../../services/hotels/hotel.service';
import { RoomTypeService } from '../../../services/room-type/room-type.service';
import { ReservationMealService } from '../../../services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from '../../../services/reservations/reservation-view.service';

import { HotelModel } from '../../../models/accounting/hotel-model';
import { RoomTypeModel } from '../../../models/accounting/room-type-model';
import { ReservationMealModel } from '../../../models/accounting/reservation-meal-model';
import { ReservationView } from '../../../models/accounting/reservation-view';

import { TranslationService } from '../../../modules/i18n';
import { formatDisplayDate } from '../../../utils/dateUtils';

type TabKey = 'roomType' | 'roomCost' | 'extraMealCost' | 'viewCost';

type Column = { field: string; header: string };

@Component({
  selector: 'app-hotel-allotment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DropdownModule,
    CalendarModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TableModule,
  ],
  templateUrl: './hotel-allotment.component.html',
  styleUrls: ['./hotel-allotment.component.scss'],
})
export class HotelAllotmentComponent implements OnInit {
  searchForm!: FormGroup;
  loading = signal(false);
  showResults = signal(false);

  // ✅ التابات
  tabs = [
    { key: 'roomType' as TabKey, label: 'Room Type' },
    { key: 'roomCost' as TabKey, label: 'Room Cost' },
    { key: 'extraMealCost' as TabKey, label: 'Extra Meal Cost' },
    { key: 'viewCost' as TabKey, label: 'View Cost' },
  ];
  activeTab = signal<TabKey>('roomType');

  // ✅ أعمدة ديناميكية حسب التاب (مع إبقاء أعمدة الأيام في الجميع)
  private roomTypeColumns: Column[] = [
    { field: 'sn', header: 'S/N' },
    { field: 'fromDate', header: 'From Date' },
    { field: 'nts', header: 'Nts' },
    { field: 'toDate', header: 'To' },
    { field: 'roomType', header: 'Room Type' },
    { field: 'mealPlan', header: 'Meal Plan' },
    { field: 'mealCostPlan', header: 'Meal Cost Plan' },
    { field: 'view', header: 'View' },
    { field: 'viewCost', header: 'View Cost' },
    { field: 'sat', header: 'SAT' },
    { field: 'sun', header: 'SUN' },
    { field: 'mon', header: 'MON' },
    { field: 'tue', header: 'TUE' },
    { field: 'wed', header: 'WED' },
    { field: 'thu', header: 'THU' },
    { field: 'fri', header: 'FRI' },
  ];

  private roomCostColumns: Column[] = [
    { field: 'sn', header: 'S/N' },
    { field: 'fromDate', header: 'From Date' },
    { field: 'nts', header: 'Nts' },
    { field: 'toDate', header: 'To' },
    { field: 'roomType', header: 'Room Type' },
    { field: 'mealPlan', header: 'Meal Plan' },
    { field: 'view', header: 'View' },
    { field: 'roomRate', header: 'Room Rate' },
    { field: 'roomCost', header: 'Room Cost' },
    { field: 'mealCostPlan', header: 'MP Cost' },
    { field: 'viewCost', header: 'View Cost' },
    { field: 'totalNightCost', header: 'Total / Night' },
    { field: 'numberOfRooms', header: 'No. of Rooms' },
    { field: 'sat', header: 'SAT' },
    { field: 'sun', header: 'SUN' },
    { field: 'mon', header: 'MON' },
    { field: 'tue', header: 'TUE' },
    { field: 'wed', header: 'WED' },
    { field: 'thu', header: 'THU' },
    { field: 'fri', header: 'FRI' },
  ];

  private extraMealCostColumns: Column[] = [
    { field: 'sn', header: 'S/N' },
    { field: 'fromDate', header: 'From Date' },
    { field: 'nts', header: 'Nts' },
    { field: 'toDate', header: 'To' },
    { field: 'roomType', header: 'Room Type' },
    { field: 'mealPlan', header: 'Meal Plan' },
    { field: 'mealRate', header: 'Meal Rate' },
    { field: 'mealCost', header: 'Meal Cost' },
    { field: 'sat', header: 'SAT' },
    { field: 'sun', header: 'SUN' },
    { field: 'mon', header: 'MON' },
    { field: 'tue', header: 'TUE' },
    { field: 'wed', header: 'WED' },
    { field: 'thu', header: 'THU' },
    { field: 'fri', header: 'FRI' },
  ];

  private viewCostColumns: Column[] = [
    { field: 'sn', header: 'S/N' },
    { field: 'fromDate', header: 'From Date' },
    { field: 'nts', header: 'Nts' },
    { field: 'toDate', header: 'To' },
    { field: 'roomType', header: 'Room Type' },
    { field: 'view', header: 'View' },
    { field: 'viewRate', header: 'View Rate' },
    { field: 'viewCost', header: 'View Cost' },
    { field: 'sat', header: 'SAT' },
    { field: 'sun', header: 'SUN' },
    { field: 'mon', header: 'MON' },
    { field: 'tue', header: 'TUE' },
    { field: 'wed', header: 'WED' },
    { field: 'thu', header: 'THU' },
    { field: 'fri', header: 'FRI' },
  ];

  /** هذا المتغيّر هو ما تستخدمه التمبلت (يتم تبديله حسب التاب) */
  commonColumns: Column[] = [];

  setTab(tab: TabKey) {
    this.activeTab.set(tab);
    this.commonColumns = this.getColumnsForTab(tab);
  }

  private getColumnsForTab(tab: TabKey): Column[] {
    switch (tab) {
      case 'roomType':
        return this.roomTypeColumns;
      case 'roomCost':
        return this.roomCostColumns;
      case 'extraMealCost':
        return this.extraMealCostColumns;
      case 'viewCost':
        return this.viewCostColumns;
      default:
        return this.roomTypeColumns;
    }
  }

  private isFrontal = false;
  private activeLanguage = 'en'; // للّغات الأخرى في الأسماء فقط، مش للتواريخ

  // بيانات التابات
  dataRoomType: any[] = [];
  dataRoomCost: any[] = [];
  dataExtraMealCost: any[] = [];
  dataViewCost: any[] = [];

  // خيارات الدروب داون
  private _hotelsOptions = signal<any[]>([]);
  private _roomTypesOptions = signal<any[]>([]);
  private _reservationMealsOptions = signal<any[]>([]);
  private _reservationViewsOptions = signal<any[]>([]);

  // خرائط أسماء
  private mealNameById = new Map<string, string>();
  private viewNameById = new Map<string, string>();
  private roomTypeNameById = new Map<string, string>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private translationService: TranslationService
  ) {
    this.isFrontal = this.router.url.includes('frontal');
    this.activeLanguage =
      this.translationService.getSelectedLanguage?.() ?? 'en';
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadDropdowns();

    // اعرض أعمدة التاب الافتراضي
    this.commonColumns = this.getColumnsForTab(this.activeTab());
  }

  private buildForm(): void {
    this.searchForm = this.fb.group({
      hotelId: [null],
      fromDate: [null],
      toDate: [null],
      roomTypeId: [null],
      reservationMealId: [null],
      reservationViewId: [null],
    });
  }

  private loadDropdowns(): void {
    this.loading.set(true);
    forkJoin({
      hotels: this.hotelService.getAll(),
      roomTypes: this.roomTypeService.getAll(),
      reservationMeals: this.reservationMealService.getAll(),
      reservationViews: this.reservationViewService.getAll(),
    }).subscribe({
      next: (data) => {
        // خيارات الدروب داون
        this._hotelsOptions.set(
          (data.hotels || []).map((item: HotelModel) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
        this._roomTypesOptions.set(
          (data.roomTypes || []).map((item: RoomTypeModel) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
        this._reservationMealsOptions.set(
          (data.reservationMeals || []).map((item: ReservationMealModel) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );
        this._reservationViewsOptions.set(
          (data.reservationViews || []).map((item: ReservationView) => ({
            label: this.pickName(item),
            value: item.id,
          }))
        );

        // خرائط أسماء
        this.mealNameById = new Map(
          (data.reservationMeals || []).map((m: ReservationMealModel) => [
            m.id,
            this.pickName(m),
          ])
        );
        this.viewNameById = new Map(
          (data.reservationViews || []).map((v: ReservationView) => [
            v.id,
            this.pickName(v),
          ])
        );
        this.roomTypeNameById = new Map(
          (data.roomTypes || []).map((rt: RoomTypeModel) => [
            rt.id,
            this.pickName(rt),
          ])
        );

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dropdowns', err);
        this.loading.set(false);
      },
    });
  }

  // getters للـ template
  hotelsOptions = () => this._hotelsOptions();
  roomTypesOptions = () => this._roomTypesOptions();
  reservationMealsOptions = () => this._reservationMealsOptions();
  reservationViewsOptions = () => this._reservationViewsOptions();

  // Utils
  private sanitizeCriteria<T extends Record<string, any>>(obj: T): T {
    const copy: any = { ...obj };
    Object.keys(copy).forEach((key) => {
      const v = copy[key];
      if (typeof v === 'string') {
        const t = v.trim();
        copy[key] = t.length ? t : null;
      }
    });
    return copy;
  }

  private normalizePhone(v: string): string {
    if (!v) return '';
    return String(v).replace(/\s+/g, '').replace(/-/g, '');
  }

  private toEndOfDayTs(input: any): number | null {
    if (!input) return null;
    const d = new Date(input);
    if (isNaN(d.getTime())) return null;
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
  }

  private parseTs(value?: string | Date | null): number | null {
    if (!value) return null;
    const t = new Date(value).getTime();
    return isNaN(t) ? null : t;
  }

  private d(value?: string | Date | null): Date | null {
    if (!value) return null;
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // ✅ التاريخ دائمًا إنجليزي (Gregorian) بغض النظر عن اللغة
  private fmt(date?: string | Date | null): string {
    const dt = this.d(date);
    return dt ? formatDisplayDate(dt) : '-';
  }

  private pickName(obj: any): string {
    if (!obj) return '-';
    const ar =
      obj.arabicName ??
      obj.nameAr ??
      obj.arName ??
      obj.displayNameAr ??
      obj.displayNameArabic;
    const en =
      obj.englishName ??
      obj.nameEn ??
      obj.enName ??
      obj.displayNameEn ??
      obj.displayName;
    if (this.activeLanguage === 'ar') return ar || en || '-';
    return en || ar || '-';
  }

  private nameFromIdOrObj(
    id?: any,
    obj?: any,
    map?: Map<string, string>
  ): string {
    if (obj) return this.pickName(obj);
    if (id == null) return '-';
    const k = String(id);
    if (!k) return '-';
    return map?.get(k) ?? '-';
  }

  /** ✅ حساب كامل لأيام الأسبوع داخل فترة الإقامة */
  private countWeekDays(
    arrival: string | Date | null | undefined,
    nights: number | null | undefined
  ) {
    const counts = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    if (!arrival || !nights || nights <= 0) return counts;

    const start = new Date(arrival);
    if (isNaN(start.getTime())) return counts;

    for (let i = 0; i < nights; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dow = d.getDay(); // 0=Sun ... 6=Sat
      switch (dow) {
        case 0:
          counts.sun++;
          break;
        case 1:
          counts.mon++;
          break;
        case 2:
          counts.tue++;
          break;
        case 3:
          counts.wed++;
          break;
        case 4:
          counts.thu++;
          break;
        case 5:
          counts.fri++;
          break;
        case 6:
          counts.sat++;
          break;
      }
    }
    return counts;
  }

  // Search
  onSearch() {
    this.loading.set(true);

    let criteria: any = this.sanitizeCriteria(this.searchForm.value);
    Object.keys(criteria).forEach((k) => {
      if (
        criteria[k] === '' ||
        criteria[k] === null ||
        criteria[k] === undefined
      ) {
        delete criteria[k];
      }
    });

    // استخدام getAllPurchases بدلاً من reservations
    this.reservationService.getAllPurchases().subscribe({
      next: (data) => {
        let results: any[] = data || [];
        console.log('🔎 API Results (Purchases):', results);

        // فلترة حسب الفندق
        if (criteria.hotelId) {
          results = results.filter(
            (x) => x.hotelId === criteria.hotelId
          );
        }

        // فلترة حسب التواريخ
        if (criteria.fromDate) {
          const from = this.parseTs(criteria.fromDate);
          if (from !== null) {
            results = results.filter((x) => {
              // فحص على hotelAllotmentRooms
              if (x.hotelAllotmentRooms && Array.isArray(x.hotelAllotmentRooms)) {
                return x.hotelAllotmentRooms.some((room: any) => {
                  const ts = this.parseTs(room.fromDate);
                  return ts !== null && ts >= from;
                });
              }
              return false;
            });
          }
        }
        if (criteria.toDate) {
          const to = this.toEndOfDayTs(criteria.toDate);
          if (to !== null) {
            results = results.filter((x) => {
              if (x.hotelAllotmentRooms && Array.isArray(x.hotelAllotmentRooms)) {
                return x.hotelAllotmentRooms.some((room: any) => {
                  const ts = this.parseTs(room.toDate);
                  return ts !== null && ts <= to;
                });
              }
              return false;
            });
          }
        }

        // فلترة حسب نوع الغرفة
        if (criteria.roomTypeId) {
          results = results.filter((x) => {
            if (x.hotelAllotmentRooms && Array.isArray(x.hotelAllotmentRooms)) {
              return x.hotelAllotmentRooms.some((room: any) =>
                room.roomTypeId === criteria.roomTypeId
              );
            }
            return false;
          });
        }

        // فلترة حسب نوع الوجبة
        if (criteria.reservationMealId) {
          results = results.filter((x) => {
            if (x.hotelAllotmentRooms && Array.isArray(x.hotelAllotmentRooms)) {
              return x.hotelAllotmentRooms.some((room: any) =>
                room.mealPlanId === criteria.reservationMealId
              );
            }
            return false;
          });
        }

        // فلترة حسب الإطلالة
        if (criteria.reservationViewId) {
          results = results.filter((x) => {
            if (x.hotelAllotmentRooms && Array.isArray(x.hotelAllotmentRooms)) {
              return x.hotelAllotmentRooms.some((room: any) =>
                room.viewId === criteria.reservationViewId
              );
            }
            return false;
          });
        }

        this.fillTabsFromPurchases(results);

        this.showResults.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error searching purchases:', err);
        this.loading.set(false);
      },
    });
  }

  /** تحويل النتائج لصفوف التابات من بيانات Purchases */
  private fillTabsFromPurchases(purchases: any[]): void {
    let snRT = 1,
      snRC = 1,
      snEM = 1,
      snVC = 1;

    const criteria: any = (this.searchForm?.getRawValue?.() as any) || {};
    const filterRoomTypeId = criteria?.roomTypeId ?? null;
    const filterMealId = criteria?.reservationMealId ?? null;
    const filterViewId = criteria?.reservationViewId ?? null;

    const hasEntryLevelFilters = !!(
      filterRoomTypeId ||
      filterMealId ||
      filterViewId
    );

    const rt: any[] = [];
    const rc: any[] = [];
    const em: any[] = [];
    const vc: any[] = [];

    for (const purchase of purchases) {
      // الحصول على hotelAllotmentRooms
      let rooms: any[] = Array.isArray(purchase.hotelAllotmentRooms)
        ? purchase.hotelAllotmentRooms
        : [];

      // تطبيق الفلترة
      if (filterRoomTypeId) {
        rooms = rooms.filter((room: any) => room.roomTypeId === filterRoomTypeId);
      }
      if (filterMealId) {
        rooms = rooms.filter((room: any) => room.mealPlanId === filterMealId);
      }
      if (filterViewId) {
        rooms = rooms.filter((room: any) => room.viewId === filterViewId);
      }

      if (hasEntryLevelFilters && rooms.length === 0) {
        continue;
      }

      const rowsToRender = rooms.length > 0 ? rooms : [{}];

      for (const room of rowsToRender) {
        const fromDate = this.d(room.fromDate);
        const toDate = this.d(room.toDate);
        
        // حساب عدد الليالي
        let numberOfNights = 0;
        if (fromDate && toDate) {
          const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
          numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const roomTypeName = this.roomTypeNameById.get(room.roomTypeId || '') || '-';
        const mealName = this.mealNameById.get(room.mealPlanId || '') || '-';
        const viewName = this.viewNameById.get(room.viewId || '') || '-';

        // حساب التكاليف من pricePerDay
        const pricePerDay = room.pricePerDay || {};
        const satCost = pricePerDay.Saturday || 0;
        const sunCost = pricePerDay.Sunday || 0;
        const monCost = pricePerDay.Monday || 0;
        const tueCost = pricePerDay.Tuesday || 0;
        const wedCost = pricePerDay.Wednesday || 0;
        const thuCost = pricePerDay.Thursday || 0;
        const friCost = pricePerDay.Friday || 0;

        // حساب عدد أيام الأسبوع
        const dayCounts = this.countWeekDays(fromDate, numberOfNights);

        const numberOfRooms = room.numberOfRooms || 0;
        
        // متوسط التكلفة
        const avgRoomCost = (satCost + sunCost + monCost + tueCost + wedCost + thuCost + friCost) / 7;
        const totalNightCost = avgRoomCost;

        const baseRow = {
          fromDate: this.fmt(fromDate),
          nts: numberOfNights,
          toDate: this.fmt(toDate),
          roomType: roomTypeName,
          mealPlan: mealName,
          view: viewName,
          sat: dayCounts.sat,
          sun: dayCounts.sun,
          mon: dayCounts.mon,
          tue: dayCounts.tue,
          wed: dayCounts.wed,
          thu: dayCounts.thu,
          fri: dayCounts.fri,
        };

        // Room Type
        rt.push({
          sn: snRT++,
          ...baseRow,
          mealCostPlan: 0,
          viewCost: 0,
        });

        // Room Cost
        rc.push({
          sn: snRC++,
          ...baseRow,
          roomRate: avgRoomCost,
          roomCost: avgRoomCost,
          mealCostPlan: 0,
          viewCost: 0,
          totalNightCost: totalNightCost,
          numberOfRooms: numberOfRooms,
        });

        // Extra Meal Cost
        em.push({
          sn: snEM++,
          fromDate: baseRow.fromDate,
          nts: baseRow.nts,
          toDate: baseRow.toDate,
          roomType: baseRow.roomType,
          mealPlan: baseRow.mealPlan,
          mealRate: 0,
          mealCost: 0,
          sat: baseRow.sat,
          sun: baseRow.sun,
          mon: baseRow.mon,
          tue: baseRow.tue,
          wed: baseRow.wed,
          thu: baseRow.thu,
          fri: baseRow.fri,
        });

        // View Cost
        vc.push({
          sn: snVC++,
          fromDate: baseRow.fromDate,
          nts: baseRow.nts,
          toDate: baseRow.toDate,
          roomType: baseRow.roomType,
          view: baseRow.view,
          viewRate: 0,
          viewCost: 0,
          sat: baseRow.sat,
          sun: baseRow.sun,
          mon: baseRow.mon,
          tue: baseRow.tue,
          wed: baseRow.wed,
          thu: baseRow.thu,
          fri: baseRow.fri,
        });
      }
    }

    this.dataRoomType = rt;
    this.dataRoomCost = rc;
    this.dataExtraMealCost = em;
    this.dataViewCost = vc;
  }

  currentData() {
    switch (this.activeTab()) {
      case 'roomType':
        return this.dataRoomType || [];
      case 'roomCost':
        return this.dataRoomCost || [];
      case 'extraMealCost':
        return this.dataExtraMealCost || [];
      case 'viewCost':
        return this.dataViewCost || [];
      default:
        return [];
    }
  }

  /** تحديد الحقول التي تحتوي على أرقام عشرية */
  isNumericField(field: string): boolean {
    const numericFields = [
      'mealCostPlan',
      'viewCost',
      'roomRate',
      'roomCost',
      'totalNightCost',
      'mealRate',
      'mealCost',
      'viewRate',
      'satCost',
      'sunCost',
      'monCost',
      'tueCost',
      'wedCost',
      'thuCost',
      'friCost',
    ];
    return numericFields.includes(field);
  }
}
