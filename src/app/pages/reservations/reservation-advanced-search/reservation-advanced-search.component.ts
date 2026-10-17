import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ReservationService } from '../../../services/reservations/reservation.service';
import { ReservationCompanyService } from '../../../services/reservations/reservation-company.service';
import { HotelService } from '../../../services/hotels/hotel.service';
import { ReservationSeasonService } from '../../../services/reservations/reservation-season.service';
import { SalesRepresentativeService } from '../../../services/sales-representative/sales-representative.service';
import { RoomTypeService } from '../../../services/room-type/room-type.service';
import { ReservationMealService } from '../../../services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from '../../../services/reservations/reservation-view.service';
import { ReservationServiceService } from '../../../services/reservations/reservation-service.service';
import { ReservationSupplierService } from '../../../services/ReservationSupplier/reservation-supplier.service';
import { ReservationModel } from '../../../models/accounting/reservation-model';
import { ReservationCompany } from '../../../models/accounting/reservation-company';
import { HotelModel } from '../../../models/accounting/hotel-model';
import { ReservationSeason } from '../../../models/accounting/reservation-season';
import { SalesRepresentative } from '../../../models/accounting/sales-representative';
import { RoomTypeModel } from '../../../models/accounting/room-type-model';
import { ReservationMealModel } from '../../../models/accounting/reservation-meal-model';
import { ReservationView } from '../../../models/accounting/reservation-view';
import { ReservationServiceModel } from '../../../models/accounting/reservation-service-model';
import { ReservationSupplierModel } from '../../../models/accounting/reservation-supplier-model';
import { ReservationType } from '../../../models/accounting/reservation-type.enum';
import { forkJoin } from 'rxjs';
import { nationalities } from '../../../utils/nationality-data';
import { TranslationService } from '../../../modules/i18n';
import { ReservationPrintTableTemplateModel } from '../../../models/reservation/reservation-print-table-template.model';
import { ReservationPrintTableTemplateService } from '../../../services/reservations/peservation-print-table-template.service';
import { ReservationPrintTemplateCommandModel } from '../../../models/reservation/reservation-print-template-command.model';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ExcelService } from '../../../services/excel/excel.service';
import { PaymentService } from '../../../services/payment/payment.service';
import { PaymentInvoiceType } from '../../../models/payment/payment.model';
import { formatDisplayDate } from '../../../utils/dateUtils';


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-advanced-search',
  templateUrl: './reservation-advanced-search.component.html',
  styleUrl: './reservation-advanced-search.component.scss',
})
export class ReservationAdvancedSearchComponent implements OnInit {
  searchForm!: FormGroup;
  loading = signal<boolean>(false);
  searchResultsSignal = signal<ReservationModel[]>([]);
  showResults = signal<boolean>(false);

  // Dropdown options
  reservationCompaniesOptions = signal<any[]>([]);
  clientCompaniesOptions = signal<any[]>([]);
  hotelsOptions = signal<any[]>([]);
  seasonsOptions = signal<any[]>([]);
  salesRepresentativesOptions = signal<any[]>([]);
  roomTypesOptions = signal<any[]>([]);
  reservationMealsOptions = signal<any[]>([]);
  reservationViewsOptions = signal<any[]>([]);
  reservationServicesOptions = signal<any[]>([]);
  reservationSuppliersOptions = signal<any[]>([]);

  reservationPrintTableTemplatesSignal = signal<
    ReservationPrintTableTemplateModel[]
  >([]);
  get reservationPrintTableTemplates(): ReservationPrintTableTemplateModel[] {
    return this.reservationPrintTableTemplatesSignal();
  }
  set reservationPrintTableTemplates(
    value: ReservationPrintTableTemplateModel[]
  ) {
    this.reservationPrintTableTemplatesSignal.set(value);
  }

  reservationTypesOptions = [
    { label: 'مباشر للوكيل', value: 'AgentDirect' },
    { label: 'مباشر للفندق', value: 'HotelDirect' },
    { label: 'حصة', value: 'Allotment' },
  ];

  nationalitiesOptions = signal<any[]>([]);

  columns: Column[] = [
    { field: 'referenceNumber', header: 'رقم الحجز' },
    { field: 'guestName', header: 'اسم النزيل' },
    { field: 'guestPhone', header: 'رقم الهاتف' },
    { field: 'nationality', header: 'الجنسية' },
    { field: 'hotelName', header: 'اسم الفندق' },
    { field: 'clientCompanyName', header: 'شركة العميل' },
    { field: 'reservationCompanyName', header: 'شركة الحجز' },
    { field: 'roomType', header: 'نوع الغرفة' },
    { field: 'arrivalDate', header: 'تاريخ الوصول' },
    { field: 'departureDate', header: 'تاريخ المغادرة' },
    { field: 'numberOfNights', header: 'عدد الليالي' },
    { field: 'reservationType', header: 'نوع الحجز' },
    { field: 'createdAt', header: 'تاريخ الإنشاء' },
    { field: 'totalCost', header: 'إجمالي التكلفة' },
    { field: 'totalAmount', header: 'إجمالي المبلغ' },
    { field: 'roomCost', header: 'تكلفة الغرف' },
    { field: 'roomAmount', header: 'مبلغ الغرف' },
    { field: 'serviceCost', header: 'تكلفة الخدمات' },
    { field: 'serviceAmount', header: 'مبلغ الخدمات' },
    { field: 'totalRooms', header: 'إجمالي الغرف' },
    { field: 'totalServices', header: 'إجمالي الخدمات' },
    { field: 'averageRoomRate', header: 'متوسط سعر الغرفة' },
    { field: 'totalTax', header: 'إجمالي الضريبة' },
    { field: 'totalDiscount', header: 'إجمالي الخصم' },
    { field: 'netAmount', header: 'المبلغ الصافي' },
  ];

  /** القالب المختار: لو محدد يعرض أعمدة القالب في الجدول، وإلا العرض الافتراضي */
  selectedTemplate: ReservationPrintTableTemplateModel | null = null;

  /** أعمدة الجدول: افتراضي كل الأعمدة، أو أعمدة القالب لو اخترت قالب */
  get displayColumns(): Column[] {
    if (this.selectedTemplate?.columns?.length) {
      const visible = [...this.selectedTemplate.columns]
        .filter((c) => c.isVisible !== false)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return visible.map((c) => ({
        field: c.columnName,
        header: c.displayName || c.columnName,
      }));
    }
    return this.columns;
  }

  private dateFields = new Set([
    'arrivalDate',
    'departureDate',
    'createdAt',
  ]);

  /** Cache: salesInvoiceId → { total, paid, remain } — populated after search */
  private paymentCache = new Map<number, { total: number; paid: number; remain: number }>();

  private currencyFields = new Set([
    'totalCost',
    'totalAmount',
    'roomCost',
    'roomAmount',
    'serviceCost',
    'serviceAmount',
    'totalTax',
    'totalDiscount',
    'netAmount',
    // Totals Summary fields
    'salesAmountWithoutVat',
    'salesVat',
    'salesTotalWithVat',
    'costAmountWithoutVat',
    'costVat',
    'costTotalWithVat',
    'profitWithoutVat',
    'profitVat',
    'profitTotalWithVat',
    // Payment fields
    'paymentAmount',
    'paymentPaid',
    'paymentRemain',
  ]);

  private numberFields = new Set([
    'numberOfNights',
    'totalRooms',
    'totalServices',
    'gopPercentage',
  ]);

  getCellValue(reservation: ReservationModel, col: Column): string {
    // Handle calculated fields
    if (this.currencyFields.has(col.field)) {
      const val = this.getCalculatedValue(reservation, col.field);
      return val != null ? this.formatCurrency(val) : '-';
    }

    if (this.numberFields.has(col.field)) {
      const val = col.field === 'numberOfNights' 
        ? (reservation as any)[col.field]
        : this.getCalculatedValue(reservation, col.field);
      return val != null && val !== '' ? String(val) : '-';
    }

    // Handle hotel name mapping
    if (col.field === 'hotelName') {
      return this.getHotelName(reservation.hotelId) || '-';
    }

    // Handle client company name mapping
    if (col.field === 'reservationClientCompanyId' || col.field === 'clientCompanyName') {
      return this.getClientCompanyName(reservation.reservationClientCompanyId) || '-';
    }

    // Handle reservation company name mapping
    if (col.field === 'reservationCompanyId' || col.field === 'reservationCompanyName') {
      return this.getReservationCompanyName(reservation.reservationCompanyId) || '-';
    }

    // Handle room type mapping
    if (col.field === 'roomType') {
      return this.getRoomTypes(reservation) || '-';
    }

    // Handle averageRoomRate — show each room entry's rate separated by comma
    if (col.field === 'averageRoomRate') {
      return this.calculateAverageRoomRate(reservation) as unknown as string || '-';
    }

    // Handle creator field
    if (col.field === 'creator') {
      return reservation.createdByName || '-';
    }

    // Handle state field: C = Confirmed, X = Cancelled, T = Tentative
    if (col.field === 'state') {
      if (reservation.isCancelled) return 'X';
      if (reservation.isConfirmed) return 'C';
      return 'T';
    }

    const val = (reservation as any)[col.field];
    if (col.field === 'reservationType') {
      return this.getReservationTypeLabel(val) || '-';
    }
    if (this.dateFields.has(col.field) && val) {
      return this.datePipe.transform(val, 'dd/MM/yyyy', undefined, 'ar-SA') ?? '-';
    }
    return val != null && val !== '' ? String(val) : '-';
  }

  private getHotelName(hotelId: string | null | undefined): string | null {
    if (!hotelId) return null;
    const hotel = this.hotelsOptions().find(h => h.value === hotelId);
    return hotel ? hotel.label : null;
  }

  private getClientCompanyName(companyId: string | null | undefined): string | null {
    if (!companyId) return null;
    const company = this.clientCompaniesOptions().find(c => c.value === companyId);
    return company ? company.label : null;
  }

  private getReservationCompanyName(companyId: string | null | undefined): string | null {
    if (!companyId) return null;
    const company = this.reservationCompaniesOptions().find(c => c.value === companyId);
    return company ? company.label : null;
  }

  private getRoomTypes(reservation: ReservationModel): string | null {
    if (!reservation.reservationRoomEntries || reservation.reservationRoomEntries.length === 0) {
      return null;
    }
    const roomTypes = new Set<string>();
    const roomTypesOptions = this.roomTypesOptions();
    
    reservation.reservationRoomEntries.forEach(entry => {
      if (entry.roomTypeId) {
        const roomType = roomTypesOptions.find(rt => rt.value === entry.roomTypeId);
        if (roomType) {
          roomTypes.add(roomType.label);
        }
      }
    });
    
    return roomTypes.size > 0 ? Array.from(roomTypes).join(', ') : null;
  }

  private getCalculatedValue(reservation: ReservationModel, field: string): number | null {
    switch (field) {
      case 'totalCost':
        return this.calculateTotalCost(reservation);
      case 'totalAmount':
        return this.calculateTotalAmount(reservation);
      case 'roomCost':
        return this.calculateRoomCost(reservation);
      case 'roomAmount':
        return this.calculateRoomAmount(reservation);
      case 'serviceCost':
        return this.calculateServiceCost(reservation);
      case 'serviceAmount':
        return this.calculateServiceAmount(reservation);
      case 'totalRooms':
        return this.calculateTotalRooms(reservation);
      case 'totalServices':
        return this.calculateTotalServices(reservation);
      case 'totalTax':
        return this.calculateTotalTax(reservation);
      case 'totalDiscount':
        return this.calculateTotalDiscount(reservation);
      case 'netAmount':
        return this.calculateNetAmount(reservation);
      // Totals Summary fields
      case 'salesAmountWithoutVat':
        return this.calculateSalesAmountWithoutVat(reservation);
      case 'salesVat':
        return this.calculateSalesVat(reservation);
      case 'salesTotalWithVat':
        return this.calculateSalesTotalWithVat(reservation);
      case 'costAmountWithoutVat':
        return this.calculateCostAmountWithoutVat(reservation);
      case 'costVat':
        return this.calculateCostVat(reservation);
      case 'costTotalWithVat':
        return this.calculateCostTotalWithVat(reservation);
      case 'profitWithoutVat':
        return this.calculateProfitWithoutVat(reservation);
      case 'profitVat':
        return this.calculateProfitVat(reservation);
      case 'profitTotalWithVat':
        return this.calculateProfitTotalWithVat(reservation);
      case 'gopPercentage':
        return this.calculateGopPercentage(reservation);
      // Payment fields
      case 'paymentAmount':
        return reservation.saleInvoiceId != null
          ? (this.paymentCache.get(reservation.saleInvoiceId)?.total ?? null)
          : null;
      case 'paymentPaid':
        return reservation.saleInvoiceId != null
          ? (this.paymentCache.get(reservation.saleInvoiceId)?.paid ?? null)
          : null;
      case 'paymentRemain':
        return reservation.saleInvoiceId != null
          ? (this.paymentCache.get(reservation.saleInvoiceId)?.remain ?? null)
          : null;
      default:
        return null;
    }
  }

  /**
   * Fetch payment data for all reservations that have a linked saleInvoiceId,
   * using parallel requests (forkJoin) and caching results to avoid re-fetching.
   */
  private loadPaymentData(reservations: ReservationModel[]): void {
    const invoiceIds = [
      ...new Set(
        reservations
          .map(r => r.saleInvoiceId)
          .filter((id): id is number => id != null)
      ),
    ];

    if (invoiceIds.length === 0) return;

    const requests = invoiceIds.map(id =>
      this.paymentService.getPaymentsByInvoice(String(id), PaymentInvoiceType.SalesInvoice)
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        invoiceIds.forEach((id, index) => {
          const payments = results[index] ?? [];
          const paid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
          // totalInvoice is returned on each payment entry; take the last one or 0
          const total = payments.length > 0 ? (payments[payments.length - 1].totalInvoice ?? 0) : 0;
          const remain = Math.max(0, total - paid);
          this.paymentCache.set(id, { total, paid, remain });
        });
        // Trigger change detection by refreshing the results signal
        this.searchResultsSignal.set([...this.searchResultsSignal()]);
      },
      error: () => {
        // Payment data is supplemental — silently ignore errors
      }
    });
  }

  private calculateTotalCost(reservation: ReservationModel): number {
    const roomCost = this.calculateRoomCost(reservation) || 0;
    const serviceCost = this.calculateServiceCost(reservation) || 0;
    return roomCost + serviceCost;
  }

  private calculateTotalAmount(reservation: ReservationModel): number {
    const roomAmount = this.calculateRoomAmount(reservation) || 0;
    const serviceAmount = this.calculateServiceAmount(reservation) || 0;
    return roomAmount + serviceAmount;
  }

  private calculateRoomCost(reservation: ReservationModel): number {
    if (!reservation.reservationRoomEntries || reservation.reservationRoomEntries.length === 0) {
      return 0;
    }
    const nights = reservation.numberOfNights || 0;
    const roomTypes = this.roomTypesOptions();
    return reservation.reservationRoomEntries.reduce((total, room) => {
      const nRooms = room.numberOfRooms || 0;
      const roomCost = room.roomCost || 0;
      const mealCost = room.mealCost || 0;
      const viewCost = room.viewCost || 0;
      // Get personNo from roomType, default to 1 if not found
      const roomType = roomTypes.find(rt => rt.value === room.roomTypeId);
      const personNo = roomType?.personNo || 1;
      return total + (nRooms * nights * roomCost) + (personNo * nRooms * nights * mealCost) + (nRooms * nights * viewCost);
    }, 0);
  }

  private calculateRoomAmount(reservation: ReservationModel): number {
    if (!reservation.reservationRoomEntries || reservation.reservationRoomEntries.length === 0) {
      return 0;
    }
    const nights = reservation.numberOfNights || 0;
    const roomTypes = this.roomTypesOptions();
    return reservation.reservationRoomEntries.reduce((total, room) => {
      const nRooms = room.numberOfRooms || 0;
      const roomRate = room.roomRate || 0;
      const mealRate = room.mealRate || 0;
      const viewRate = room.viewRate || 0;
      // Get personNo from roomType, default to 1 if not found
      const roomType = roomTypes.find(rt => rt.value === room.roomTypeId);
      const personNo = roomType?.personNo || 1;
      return total + (nRooms * nights * roomRate) + (personNo * nRooms * nights * mealRate) + (nRooms * nights * viewRate);
    }, 0);
  }

  private calculateServiceCost(reservation: ReservationModel): number {
    if (!reservation.reservationServiceEntries || reservation.reservationServiceEntries.length === 0) {
      return 0;
    }
    return reservation.reservationServiceEntries.reduce((total, service) => {
      const quantity = service.quantity || 0;
      const costPrice = service.costPrice || 0;
      return total + (quantity * costPrice);
    }, 0);
  }

  private calculateServiceAmount(reservation: ReservationModel): number {
    if (!reservation.reservationServiceEntries || reservation.reservationServiceEntries.length === 0) {
      return 0;
    }
    return reservation.reservationServiceEntries.reduce((total, service) => {
      const quantity = service.quantity || 0;
      const salesPrice = service.salesPrice || 0;
      return total + (quantity * salesPrice);
    }, 0);
  }

  private calculateTotalRooms(reservation: ReservationModel): number {
    if (!reservation.reservationRoomEntries || reservation.reservationRoomEntries.length === 0) {
      return 0;
    }
    return reservation.reservationRoomEntries.reduce((total, room) => {
      return total + (room.numberOfRooms || 0);
    }, 0);
  }

  private calculateTotalServices(reservation: ReservationModel): number {
    if (!reservation.reservationServiceEntries || reservation.reservationServiceEntries.length === 0) {
      return 0;
    }
    return reservation.reservationServiceEntries.reduce((total, service) => {
      return total + (service.quantity || 0);
    }, 0);
  }

  private calculateAverageRoomRate(reservation: ReservationModel): string {
    if (!reservation.reservationRoomEntries || reservation.reservationRoomEntries.length === 0) {
      return '-';
    }
    return reservation.reservationRoomEntries
      .map(room => room.roomRate ?? 0)
      .join(', ');
  }

  private calculateTotalTax(reservation: ReservationModel): number {
    const totalAmount = this.calculateTotalAmount(reservation);
    // Assuming 15% tax rate (can be adjusted based on your business logic)
    return totalAmount * 0.15;
  }

  private calculateTotalDiscount(reservation: ReservationModel): number {
    // This field might not be directly available in the model
    // Return 0 for now, or implement based on your business logic
    return 0;
  }

  private calculateNetAmount(reservation: ReservationModel): number {
    const totalAmount = this.calculateTotalAmount(reservation);
    const totalTax = this.calculateTotalTax(reservation);
    const totalDiscount = this.calculateTotalDiscount(reservation);
    return totalAmount + totalTax - totalDiscount;
  }

  // ─── Totals Summary methods (mirrors ملخّص الإجماليات in reservation details) ───

  private calculateSalesAmountWithoutVat(reservation: ReservationModel): number {
    return this.calculateTotalAmount(reservation);
  }

  private calculateSalesVat(reservation: ReservationModel): number {
    const sales = this.calculateTotalAmount(reservation);
    return +(sales * 0.15).toFixed(2);
  }

  private calculateSalesTotalWithVat(reservation: ReservationModel): number {
    const sales = this.calculateTotalAmount(reservation);
    return +(sales * 1.15).toFixed(2);
  }

  private calculateCostAmountWithoutVat(reservation: ReservationModel): number {
    return this.calculateTotalCost(reservation);
  }

  private calculateCostVat(reservation: ReservationModel): number {
    const cost = this.calculateTotalCost(reservation);
    return +(cost * 0.15).toFixed(2);
  }

  private calculateCostTotalWithVat(reservation: ReservationModel): number {
    const cost = this.calculateTotalCost(reservation);
    return +(cost * 1.15).toFixed(2);
  }

  private calculateProfitWithoutVat(reservation: ReservationModel): number {
    const sales = this.calculateTotalAmount(reservation);
    const cost = this.calculateTotalCost(reservation);
    return +(sales - cost).toFixed(2);
  }

  private calculateProfitVat(reservation: ReservationModel): number {
    const salesVat = this.calculateSalesVat(reservation);
    const costVat = this.calculateCostVat(reservation);
    return +(salesVat - costVat).toFixed(2);
  }

  private calculateProfitTotalWithVat(reservation: ReservationModel): number {
    const salesTotal = this.calculateSalesTotalWithVat(reservation);
    const costTotal = this.calculateCostTotalWithVat(reservation);
    return +(salesTotal - costTotal).toFixed(2);
  }

  private calculateGopPercentage(reservation: ReservationModel): number {
    const profitWithoutVat = this.calculateProfitWithoutVat(reservation);
    const salesAmountWithoutVat = this.calculateSalesAmountWithoutVat(reservation);
    if (salesAmountWithoutVat === 0) return 0;
    return +((profitWithoutVat / salesAmountWithoutVat) * 100).toFixed(2);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  actionDialog = false;
  selectedRow: ReservationModel | null = null;

  get searchResults() {
    return this.searchResultsSignal();
  }
  activeLanguage: string = 'en';

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }

  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private reservationService: ReservationService,
    private reservationCompanyService: ReservationCompanyService,
    private hotelService: HotelService,
    private seasonService: ReservationSeasonService,
    private salesRepresentativeService: SalesRepresentativeService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private reservationServiceService: ReservationServiceService,
    private reservationSupplierService: ReservationSupplierService,
    public translationService: TranslationService,
    private reservationPrintTableTemplateService: ReservationPrintTableTemplateService,
    private datePipe: DatePipe,
    private excelService: ExcelService,
    private paymentService: PaymentService
  ) {
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');
    this.initializeForm();
    this.initializeNationalities();
  }

  ngOnInit(): void {
    this.loadData();
  }

  initializeNationalities(): void {
    this.nationalitiesOptions.set(
      nationalities.map((x) => ({
        label: `${x.arabicName} - ${x.englishName}`,
        value: x.arabicName,
      }))
    );
  }

  initializeForm(): void {
    this.searchForm = this.fb.group(
      {
        referenceNumber: [''],
        guestName: [''],
        guestPhone: [''],
        nationality: [null],

        arrivalDateFrom: [null],
        arrivalDateTo: [null],
        departureDateFrom: [null],
        departureDateTo: [null],

        numberOfNightsFrom: [null],
        numberOfNightsTo: [null],

        reservationCompanyId: [null],
        reservationClientCompanyId: [null],
        salesRepresentativeId: [null],
        hotelId: [null],
        reservationSeasonId: [null],
        reservationType: [null],
        roomTypeId: [null],
        reservationMealId: [null],
        reservationViewId: [null],
        reservationServiceId: [null],
        reservationSupplierId: [null],

        isActiveFrom: [''],
        isActiveTo: [''],

        createdDateFrom: [null],
        createdDateTo: [null],
      },
      {
        // ⬅️ هنا نضيف التحقق المنطقي لكل Range
        validators: [
          this.dateRangeOrderValidator('arrivalDateFrom', 'arrivalDateTo'),
          this.dateRangeOrderValidator('departureDateFrom', 'departureDateTo'),
          this.dateRangeOrderValidator('createdDateFrom', 'createdDateTo'),
        ],
      }
    );
  }

  loadData(): void {
    this.loading.set(true);

    forkJoin({
      reservationCompanies: this.reservationCompanyService.getAll(),
      clientCompanies: this.reservationCompanyService.getAll(),
      hotels: this.hotelService.getAll(),
      seasons: this.seasonService.getAll(),
      salesRepresentatives: this.salesRepresentativeService.getAll(),
      roomTypes: this.roomTypeService.getAll(),
      reservationMeals: this.reservationMealService.getAll(),
      reservationViews: this.reservationViewService.getAll(),
      reservationServices: this.reservationServiceService.getAll(),
      reservationSuppliers: this.reservationSupplierService.getAll(),
      reservationPrintTableTemplates:
        this.reservationPrintTableTemplateService.getAll(),
    }).subscribe({
      next: (data) => {
        this.reservationPrintTableTemplates =
          (data.reservationPrintTableTemplates ?? []).sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
          );

        // Reservation Companies
        this.reservationCompaniesOptions.set(
          data.reservationCompanies.map((item: ReservationCompany) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Client Companies (same as reservation companies)
        this.clientCompaniesOptions.set(
          data.clientCompanies.map((item: ReservationCompany) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Hotels
        this.hotelsOptions.set(
          data.hotels.map((item: HotelModel) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Seasons
        this.seasonsOptions.set(
          data.seasons.map((item: ReservationSeason) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Sales Representatives
        this.salesRepresentativesOptions.set(
          data.salesRepresentatives.map((item: SalesRepresentative) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Room Types
        this.roomTypesOptions.set(
          data.roomTypes.map((item: RoomTypeModel) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
            personNo: item.personNo || 1,
          }))
        );

        // Reservation Meals
        this.reservationMealsOptions.set(
          data.reservationMeals.map((item: ReservationMealModel) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Reservation Views
        this.reservationViewsOptions.set(
          data.reservationViews.map((item: ReservationView) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Reservation Services
        this.reservationServicesOptions.set(
          data.reservationServices.map((item: ReservationServiceModel) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        // Reservation Suppliers
        this.reservationSuppliersOptions.set(
          data.reservationSuppliers.map((item: ReservationSupplierModel) => ({
            label: item.arabicName || item.englishName,
            value: item.id,
          }))
        );

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dropdown data:', error);
        this.loading.set(false);
      },
    });
  }

  /** قصّ النصوص وتحويل الفارغ إلى null */
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

  /** توحيد شكل رقم الهاتف لإزالة المسافات/الشرطات */
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
  /** Cross-field date range validator: ensures FROM <= TO (inclusive) */
  private dateRangeOrderValidator(fromKey: string, toKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const from = group.get(fromKey)?.value;
      const to = group.get(toKey)?.value;

      // لا نرمي Error إلا لو الاتنين ليهم قيمة
      if (!from || !to) return null;

      // نطبع اليومين لتفادي مشاكل الوقت
      const fromTime = new Date(from).setHours(0, 0, 0, 0);
      const toTime = new Date(to).setHours(23, 59, 59, 999); // تضم اليوم كله

      // نرجع Error باسم مميز لكل Range
      return fromTime <= toTime
        ? null
        : { [`${fromKey}_${toKey}_order`]: true };
    };
  }

  onSearch(): void {
    if (this.searchForm.valid) {
      this.loading.set(true);

      // 1) قصّ القيم النصية قبل أي شيء
      let searchCriteria: any = this.sanitizeCriteria(this.searchForm.value);

      // 2) إزالة القيم الفارغة/null/undefined
      Object.keys(searchCriteria).forEach((key) => {
        if (
          searchCriteria[key] === '' ||
          searchCriteria[key] === null ||
          searchCriteria[key] === undefined
        ) {
          delete searchCriteria[key];
        }
      });

      // 3) تهيئة خاصة للهاتف (إزالة الفراغات الداخلية)
      if (searchCriteria.guestPhone) {
        searchCriteria.guestPhone = this.normalizePhone(
          searchCriteria.guestPhone
        );
      }
      if (this.isFrontal) {
        this.reservationService.getAllFrontalReservations().subscribe({
          next: (data: ReservationModel[]) => {
            let filteredResults = data;

            // Apply filters
            if (searchCriteria.referenceNumber) {
              const q = String(searchCriteria.referenceNumber).toLowerCase();
              filteredResults = filteredResults.filter((item) =>
                (item.referenceNumber || '').toLowerCase().includes(q)
              );
            }

            if (searchCriteria.guestName) {
              const q = String(searchCriteria.guestName).toLowerCase();
              filteredResults = filteredResults.filter((item) =>
                (item.guestName || '').toLowerCase().includes(q)
              );
            }

            if (searchCriteria.guestPhone) {
              const phoneQuery = this.normalizePhone(
                String(searchCriteria.guestPhone)
              );
              filteredResults = filteredResults.filter((item) =>
                this.normalizePhone(item.guestPhone || '').includes(phoneQuery)
              );
            }

            if (searchCriteria.nationality) {
              filteredResults = filteredResults.filter(
                (item) => item.nationality === searchCriteria.nationality
              );
            }

            if (searchCriteria.reservationCompanyId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationCompanyId ===
                  searchCriteria.reservationCompanyId
              );
            }

            if (searchCriteria.reservationClientCompanyId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationClientCompanyId ===
                  searchCriteria.reservationClientCompanyId
              );
            }

            if (searchCriteria.hotelId) {
              filteredResults = filteredResults.filter(
                (item) => item.hotelId === searchCriteria.hotelId
              );
            }

            if (searchCriteria.reservationType) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationType === searchCriteria.reservationType
              );
            }

            if (searchCriteria.salesRepresentativeId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.salesRepresentativeId ===
                  searchCriteria.salesRepresentativeId
              );
            }

            if (searchCriteria.reservationSeasonId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationSeasonId ===
                  searchCriteria.reservationSeasonId
              );
            }

            if (searchCriteria.roomTypeId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) => room.roomTypeId === searchCriteria.roomTypeId
                )
              );
            }

            if (searchCriteria.reservationMealId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) =>
                    room.reservationMealId === searchCriteria.reservationMealId
                )
              );
            }

            if (searchCriteria.reservationViewId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) =>
                    room.reservationViewId === searchCriteria.reservationViewId
                )
              );
            }

            if (searchCriteria.reservationServiceId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationServiceEntries?.some(
                  (service) =>
                    service.reservationServiceId ===
                    searchCriteria.reservationServiceId
                )
              );
            }

            if (searchCriteria.reservationSupplierId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationServiceEntries?.some(
                  (service) =>
                    service.reservationSupplierId ===
                    searchCriteria.reservationSupplierId
                )
              );
            }

            // Date range filters
            if (searchCriteria.arrivalDateFrom) {
              const from = new Date(searchCriteria.arrivalDateFrom).getTime();
              filteredResults = filteredResults.filter(
                (item) =>
                  item.arrivalDate &&
                  new Date(item.arrivalDate).getTime() >= from
              );
            }

            if (searchCriteria.arrivalDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.arrivalDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.arrivalDate &&
                    !isNaN(new Date(item.arrivalDate).getTime()) &&
                    new Date(item.arrivalDate).getTime() <= to
                );
              }
            }

            if (searchCriteria.departureDateFrom) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.departureDate &&
                  new Date(item.departureDate) >=
                    new Date(searchCriteria.departureDateFrom)
              );
            }

            if (searchCriteria.departureDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.departureDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.departureDate &&
                    !isNaN(new Date(item.departureDate).getTime()) &&
                    new Date(item.departureDate).getTime() <= to
                );
              }
            }

            // Number range filters
            if (
              searchCriteria.numberOfNightsFrom &&
              !isNaN(searchCriteria.numberOfNightsFrom)
            ) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.numberOfNights &&
                  item.numberOfNights >= searchCriteria.numberOfNightsFrom
              );
            }

            if (
              searchCriteria.numberOfNightsTo &&
              !isNaN(searchCriteria.numberOfNightsTo)
            ) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.numberOfNights &&
                  item.numberOfNights <= searchCriteria.numberOfNightsTo
              );
            }

            // Created date range filters
            if (searchCriteria.createdDateFrom) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.createdAt &&
                  new Date(item.createdAt) >=
                    new Date(searchCriteria.createdDateFrom)
              );
            }

            if (searchCriteria.createdDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.createdDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.createdAt &&
                    !isNaN(new Date(item.createdAt).getTime()) &&
                    new Date(item.createdAt).getTime() <= to
                );
              }
            }

            this.paymentCache.clear();
            this.searchResultsSignal.set(filteredResults);
            this.showResults.set(true);
            this.loading.set(false);
            this.loadPaymentData(filteredResults);
          },
          error: (error) => {
            console.error('Error searching reservations:', error);
            this.loading.set(false);
          },
        });
      } else {
        this.reservationService.getAll().subscribe({
          next: (data: ReservationModel[]) => {
            let filteredResults = data;

            // Apply filters
            if (searchCriteria.referenceNumber) {
              const q = String(searchCriteria.referenceNumber).toLowerCase();
              filteredResults = filteredResults.filter((item) =>
                (item.referenceNumber || '').toLowerCase().includes(q)
              );
            }

            if (searchCriteria.guestName) {
              const q = String(searchCriteria.guestName).toLowerCase();
              filteredResults = filteredResults.filter((item) =>
                (item.guestName || '').toLowerCase().includes(q)
              );
            }

            if (searchCriteria.guestPhone) {
              const phoneQuery = this.normalizePhone(
                String(searchCriteria.guestPhone)
              );
              filteredResults = filteredResults.filter((item) =>
                this.normalizePhone(item.guestPhone || '').includes(phoneQuery)
              );
            }

            if (searchCriteria.nationality) {
              filteredResults = filteredResults.filter(
                (item) => item.nationality === searchCriteria.nationality
              );
            }

            if (searchCriteria.reservationCompanyId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationCompanyId ===
                  searchCriteria.reservationCompanyId
              );
            }

            if (searchCriteria.reservationClientCompanyId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationClientCompanyId ===
                  searchCriteria.reservationClientCompanyId
              );
            }

            if (searchCriteria.hotelId) {
              filteredResults = filteredResults.filter(
                (item) => item.hotelId === searchCriteria.hotelId
              );
            }

            if (searchCriteria.reservationType) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationType === searchCriteria.reservationType
              );
            }

            if (searchCriteria.salesRepresentativeId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.salesRepresentativeId ===
                  searchCriteria.salesRepresentativeId
              );
            }

            if (searchCriteria.reservationSeasonId) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.reservationSeasonId ===
                  searchCriteria.reservationSeasonId
              );
            }

            if (searchCriteria.roomTypeId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) => room.roomTypeId === searchCriteria.roomTypeId
                )
              );
            }

            if (searchCriteria.reservationMealId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) =>
                    room.reservationMealId === searchCriteria.reservationMealId
                )
              );
            }

            if (searchCriteria.reservationViewId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationRoomEntries?.some(
                  (room) =>
                    room.reservationViewId === searchCriteria.reservationViewId
                )
              );
            }

            if (searchCriteria.reservationServiceId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationServiceEntries?.some(
                  (service) =>
                    service.reservationServiceId ===
                    searchCriteria.reservationServiceId
                )
              );
            }

            if (searchCriteria.reservationSupplierId) {
              filteredResults = filteredResults.filter((item) =>
                item.reservationServiceEntries?.some(
                  (service) =>
                    service.reservationSupplierId ===
                    searchCriteria.reservationSupplierId
                )
              );
            }

            // Date range filters
            if (searchCriteria.arrivalDateFrom) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.arrivalDate &&
                  new Date(item.arrivalDate) >=
                    new Date(searchCriteria.arrivalDateFrom)
              );
            }

            if (searchCriteria.arrivalDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.arrivalDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.arrivalDate &&
                    !isNaN(new Date(item.arrivalDate).getTime()) &&
                    new Date(item.arrivalDate).getTime() <= to
                );
              }
            }

            if (searchCriteria.departureDateFrom) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.departureDate &&
                  new Date(item.departureDate) >=
                    new Date(searchCriteria.departureDateFrom)
              );
            }

            if (searchCriteria.departureDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.departureDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.departureDate &&
                    !isNaN(new Date(item.departureDate).getTime()) &&
                    new Date(item.departureDate).getTime() <= to
                );
              }
            }

            // Number range filters
            if (
              searchCriteria.numberOfNightsFrom &&
              !isNaN(searchCriteria.numberOfNightsFrom)
            ) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.numberOfNights &&
                  item.numberOfNights >= searchCriteria.numberOfNightsFrom
              );
            }

            if (
              searchCriteria.numberOfNightsTo &&
              !isNaN(searchCriteria.numberOfNightsTo)
            ) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.numberOfNights &&
                  item.numberOfNights <= searchCriteria.numberOfNightsTo
              );
            }

            // Created date range filters
            if (searchCriteria.createdDateFrom) {
              filteredResults = filteredResults.filter(
                (item) =>
                  item.createdAt &&
                  new Date(item.createdAt) >=
                    new Date(searchCriteria.createdDateFrom)
              );
            }

            if (searchCriteria.createdDateTo) {
              const to = this.toEndOfDayTs(searchCriteria.createdDateTo);
              if (to !== null) {
                filteredResults = filteredResults.filter(
                  (item) =>
                    item.createdAt &&
                    !isNaN(new Date(item.createdAt).getTime()) &&
                    new Date(item.createdAt).getTime() <= to
                );
              }
            }

            this.paymentCache.clear();
            this.searchResultsSignal.set(filteredResults);
            this.showResults.set(true);
            this.loading.set(false);
            this.loadPaymentData(filteredResults);
          },
          error: (error) => {
            console.error('Error searching reservations:', error);
            this.loading.set(false);
          },
        });
      }
    }
  }

  onClear(): void {
    this.searchForm.reset();
    this.showResults.set(false);
    this.searchResultsSignal.set([]);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    return formatDisplayDate(date);
  }

  getReservationTypeLabel(type: string): string {
    const option = this.reservationTypesOptions.find(
      (opt) => opt.value === type
    );
    return option ? option.label : type;
  }

  viewReservation(id: string): void {
    this.router.navigate(['/reservations', id]);
  }

  updateLanguage(): void {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.initializeNationalities();
  }

  printReservation(template: ReservationPrintTableTemplateModel): void {
    const reservationsIds = this.searchResults.map(
      (reservation) => reservation.id
    );
    const request = new ReservationPrintTemplateCommandModel();
    request.templateId = template.id;
    request.reservationIds = reservationsIds;
    this.reservationService.printReservationsTemplate(request);
  }

  downloadReservation(template: ReservationPrintTableTemplateModel): void {
    const reservationsIds = this.searchResults.map(
      (reservation) => reservation.id
    );
    const request = new ReservationPrintTemplateCommandModel();
    request.templateId = template.id;
    request.reservationIds = reservationsIds;
    this.reservationService.downloadReservationsTemplate(request);
  }
  
  exportToExcel(): void {
    if (!this.searchResults || this.searchResults.length === 0) return;
    
    const dataToExport = this.searchResults.map(reservation => {
      const row: any = {};
      this.displayColumns.forEach(col => {
        row[col.header] = this.getCellValue(reservation, col);
      });
      return row;
    });

    const fileName = this.selectedTemplate 
      ? `نتائج البحث - ${this.selectedTemplate.name}`
      : 'نتائج البحث عن الحجوزات';
      
    this.excelService.exportAsExcelFile(dataToExport, fileName);
  }

  onPhoneInput(event: any): void {
    const value = event.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    event.target.value = numericValue;
    this.searchForm.get('guestPhone')?.setValue(numericValue);
  }
}

