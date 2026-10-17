import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  LOCALE_ID,
  OnInit,
  OnDestroy,
  Renderer2,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { forkJoin, of, Subscription } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { HotelModel } from 'src/app/models/accounting/hotel-model';
import { ReservationModel } from 'src/app/models/accounting/reservation-model';
import { ReservationSeason } from 'src/app/models/accounting/reservation-season';
import { ReservationView } from 'src/app/models/accounting/reservation-view';
import { RoomTypeModel } from 'src/app/models/accounting/room-type-model';
import { SalesRepresentative } from 'src/app/models/accounting/sales-representative';
import { InvoiceNo } from 'src/app/models/invoice/invoiceNo';
import { SalesItem } from 'src/app/models/salesInvoice/salesItem';
import { TranslationService } from 'src/app/modules/i18n';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { ReservationSeasonService } from 'src/app/services/reservations/reservation-season.service';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { SalesRepresentativeService } from 'src/app/services/sales-representative/sales-representative.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { ReservationCompanyService } from '../../../services/reservations/reservation-company.service';
import { ReservationCompany } from 'src/app/models/accounting/reservation-company';
import { nationalities } from 'src/app/utils/nationality-data';
import { CustomValidators } from 'src/app/utils/CustomValidators';
import { ReservationMealModel } from '../../../models/accounting/reservation-meal-model';
import { ReservationMealService } from '../../../services/reservation-meal/reservation-meal.service';
import { ReservationSupplierService } from '../../../services/ReservationSupplier/reservation-supplier.service';
import { ReservationRoomEntryModel } from '../../../models/accounting/reservation-room-entry-model';
import { ReservationService } from '../../../services/reservations/reservation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservationServiceEntryModel } from '../../../models/accounting/reservation-service-entry-model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AttachmentService } from '../../../services/attachments/attachment.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { AttachmentModel } from '../../../models/Attachments/attachment.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ReservationActionLogResponseDto } from '../../../models/reservation/reservation-action-log-response.model';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-reservation',
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.scss',
  providers: [
  // MessageService, // ❌ Removed - using global service instead
  ConfirmationService,
  // Changed from 'ar-SA' to 'en-CA' for yyyy-mm-dd date format
  { provide: LOCALE_ID, useValue: 'en-CA' }
],
})
export class ReservationComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('reservationPage', { static: true })
  reservationPage!: ElementRef<HTMLElement>;
  private baseDpr = 1;
  private baseViewportHeight = 0;
  private baseViewportWidth = 0;
  private baseContentHeight = 0;
  private currentScale = 1;
  private supportsZoom = false;
  printMenuItems: MenuItem[] = [];
  downloadMenuItems: MenuItem[] = [];
  isInvoiced = false;
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
    if (this.reservationForm) {
      if (value) {
        this.reservationForm.disable({ emitEvent: false });
      } else {
        this.reservationForm.enable({ emitEvent: false });
      }
    }
  }

  get isFrontal(): boolean {
    return this.router.url.includes('frontal');
  }

  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    const wasLoading = this.loadingSignal();
    this.loadingSignal.set(value);
    if (wasLoading && !value) {
      setTimeout(() => {
        this.updateReservationHeight();
      }, 50);
    }
  }

  hasSalesInvoiceSignal = signal<boolean>(false);
  get hasSalesInvoice() {
    return this.hasSalesInvoiceSignal();
  }
  set hasSalesInvoice(value: boolean) {
    this.hasSalesInvoiceSignal.set(value);
  }

  salesInvoiceIdSignal = signal<number | null>(null);
  get salesInvoiceId() {
    return this.salesInvoiceIdSignal();
  }
  set salesInvoiceId(value: number | null) {
    this.salesInvoiceIdSignal.set(value);
  }

  salesInvoiceNoSignal = signal<string | null>(null);
  get salesInvoiceNo() {
    return this.salesInvoiceNoSignal();
  }
  set salesInvoiceNo(value: string | null) {
    this.salesInvoiceNoSignal.set(value);
  }

  nationalities = signal<any[]>([]);

  private initializeNationalities(): void {
    const opts = nationalities.map((x) => ({
      label: this.activeLanguage === 'en' 
        ? `${x.englishName} - ${x.arabicName}`
        : `${x.arabicName} - ${x.englishName}`,
      value: x.arabicName,
    }));
    this.nationalities.set(opts);
  }
  reservationForm!: FormGroup;

  translate: TranslateService;
  activeLanguage: string = 'en';
  private langChangeSubscription?: Subscription;
  private cachedSelectData: any = null;

  reservationCompaniesOptions = [];
  salesRepresentativesOptions = [];
  hotelsOptions = [];
  seasonsOptions = [];
  reservationServicesOptions = [];
  viewsOptions = [];
  reservationSupplierOptions = [];
  reservationTypesOptions = [
    { label: 'Agent Direct', value: 'AgentDirect' },
    { label: 'Hotel Direct', value: 'HotelDirect' },
    { label: 'Allotment', value: 'Allotment' },
  ];

  companyBankAccountOptions = [];
  companyPhoneOptions = [];
  companyPolicyOptions = [];

  roomTypesSignal = signal<RoomTypeModel[]>([]);
  roomTypesOptions: { label: string; value: any }[] = [];

  get roomTypes() {
    return this.roomTypesSignal();
  }
  set roomTypes(value: RoomTypeModel[]) {
    this.roomTypesSignal.set(value || []);
    this.updateRoomTypesOptions();
  }

  updateRoomTypesOptions(): void {
    const list = this.roomTypesSignal() || [];
    if (list.length > 0) {
      this.roomTypesOptions = list.map((x) => ({
        label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
        value: x.id,
      }));
    }
  }

  reservationMealSignal = signal<ReservationMealModel[]>([]);
  reservationMealOptions: { label: string; value: any }[] = [];

  get reservationMeals() {
    return this.reservationMealSignal();
  }
  set reservationMeals(value: ReservationMealModel[]) {
    this.reservationMealSignal.set(value || []);
    this.updateReservationMealOptions();
  }

  updateReservationMealOptions(): void {
    const list = this.reservationMealSignal() || [];
    if (list.length > 0) {
      this.reservationMealOptions = list.map((x) => ({
        label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
        value: x.id,
      }));
    }
  }

  pickName(ar?: string, en?: string): string {
    if (this.activeLanguage === 'en') {
      return (en || ar || '').trim();
    }
    return (ar || en || '').trim();
  }

  seedOptionsFromReservation(res: any): void {
    if (!res) return;

    // Hotel
    if (res.hotelId && (res.hotelArabicName || res.hotelEnglishName)) {
      const label = this.pickName(res.hotelArabicName, res.hotelEnglishName);
      if (!this.hotelsOptions.some((o: any) => o.value === res.hotelId)) {
        this.hotelsOptions = [...this.hotelsOptions, { label, value: res.hotelId }];
      } else {
        const item: any = this.hotelsOptions.find((o: any) => o.value === res.hotelId);
        if (item) item.label = label;
      }
    }

    // Reservation Client Company
    if (res.reservationClientCompanyId && (res.reservationClientCompanyArabicName || res.reservationClientCompanyEnglishName)) {
      const label = this.pickName(res.reservationClientCompanyArabicName, res.reservationClientCompanyEnglishName);
      if (!this.reservationCompaniesOptions.some((o: any) => o.value === res.reservationClientCompanyId)) {
        this.reservationCompaniesOptions = [...this.reservationCompaniesOptions, { label, value: res.reservationClientCompanyId }];
      } else {
        const item: any = this.reservationCompaniesOptions.find((o: any) => o.value === res.reservationClientCompanyId);
        if (item) item.label = label;
      }
    }

    // Reservation Company
    if (res.reservationCompanyId && (res.reservationCompanyArabicName || res.reservationCompanyEnglishName)) {
      const label = this.pickName(res.reservationCompanyArabicName, res.reservationCompanyEnglishName);
      if (!this.reservationCompaniesOptions.some((o: any) => o.value === res.reservationCompanyId)) {
        this.reservationCompaniesOptions = [...this.reservationCompaniesOptions, { label, value: res.reservationCompanyId }];
      }
    }

    // Sales Representative
    if (res.salesRepresentativeId && (res.salesRepresentativeArabicName || res.salesRepresentativeEnglishName)) {
      const label = this.pickName(res.salesRepresentativeArabicName, res.salesRepresentativeEnglishName);
      if (!this.salesRepresentativesOptions.some((o: any) => o.value === res.salesRepresentativeId)) {
        this.salesRepresentativesOptions = [...this.salesRepresentativesOptions, { label, value: res.salesRepresentativeId }];
      } else {
        const item: any = this.salesRepresentativesOptions.find((o: any) => o.value === res.salesRepresentativeId);
        if (item) item.label = label;
      }
    }

    // Season
    if (res.reservationSeasonId && (res.reservationSeasonArabicName || res.reservationSeasonEnglishName)) {
      const label = this.pickName(res.reservationSeasonArabicName, res.reservationSeasonEnglishName);
      if (!this.seasonsOptions.some((o: any) => o.value === res.reservationSeasonId)) {
        this.seasonsOptions = [...this.seasonsOptions, { label, value: res.reservationSeasonId }];
      } else {
        const item: any = this.seasonsOptions.find((o: any) => o.value === res.reservationSeasonId);
        if (item) item.label = label;
      }
    }

    // Bank Account
    if (res.bankAccountId && res.bankAccountName) {
      if (!this.companyBankAccountOptions.some((o: any) => o.value === res.bankAccountId)) {
        this.companyBankAccountOptions = [...this.companyBankAccountOptions, { label: res.bankAccountName, value: res.bankAccountId }];
      }
    }

    // Company Phone
    if (res.companyPhoneId && res.companyPhoneNumber) {
      if (!this.companyPhoneOptions.some((o: any) => o.value === res.companyPhoneId)) {
        this.companyPhoneOptions = [...this.companyPhoneOptions, { label: res.companyPhoneNumber, value: res.companyPhoneId }];
      }
    }

    // Company Policy
    if (res.companyPolicyId && res.companyPolicyParagraph) {
      if (!this.companyPolicyOptions.some((o: any) => o.value === res.companyPolicyId)) {
        this.companyPolicyOptions = [...this.companyPolicyOptions, { label: res.companyPolicyParagraph, value: res.companyPolicyId }];
      }
    }

    // Room Entries (RoomType, Meal, View)
    if (res.reservationRoomEntries?.length) {
      res.reservationRoomEntries.forEach((entry: any) => {
        if (entry.roomTypeId && (entry.roomTypeArabicName || entry.roomTypeEnglishName)) {
          const label = this.pickName(entry.roomTypeArabicName, entry.roomTypeEnglishName);
          if (!this.roomTypesOptions.some((o: any) => o.value === entry.roomTypeId)) {
            this.roomTypesOptions = [...this.roomTypesOptions, { label, value: entry.roomTypeId }];
          }
        }
        if (entry.reservationMealId && (entry.reservationMealArabicName || entry.reservationMealEnglishName)) {
          const label = this.pickName(entry.reservationMealArabicName, entry.reservationMealEnglishName);
          if (!this.reservationMealOptions.some((o: any) => o.value === entry.reservationMealId)) {
            this.reservationMealOptions = [...this.reservationMealOptions, { label, value: entry.reservationMealId }];
          }
        }
        if (entry.reservationViewId && (entry.reservationViewArabicName || entry.reservationViewEnglishName)) {
          const label = this.pickName(entry.reservationViewArabicName, entry.reservationViewEnglishName);
          if (!this.viewsOptions.some((o: any) => o.value === entry.reservationViewId)) {
            this.viewsOptions = [...this.viewsOptions, { label, value: entry.reservationViewId }];
          }
        }
      });
    }

    // Service Entries (Service, Supplier)
    if (res.reservationServiceEntries?.length) {
      res.reservationServiceEntries.forEach((entry: any) => {
        if (entry.reservationServiceId && (entry.reservationServiceArabicName || entry.reservationServiceEnglishName)) {
          const label = this.pickName(entry.reservationServiceArabicName, entry.reservationServiceEnglishName);
          if (!this.reservationServicesOptions.some((o: any) => o.value === entry.reservationServiceId)) {
            this.reservationServicesOptions = [...this.reservationServicesOptions, { label, value: entry.reservationServiceId }];
          }
        }
        if (entry.reservationSupplierId && (entry.reservationSupplierArabicName || entry.reservationSupplierEnglishName)) {
          const label = this.pickName(entry.reservationSupplierArabicName, entry.reservationSupplierEnglishName);
          if (!this.reservationSupplierOptions.some((o: any) => o.value === entry.reservationSupplierId)) {
            this.reservationSupplierOptions = [...this.reservationSupplierOptions, { label, value: entry.reservationSupplierId }];
          }
        }
      });
    }
  }

  reservation: ReservationModel;
  minDepartureDate!: string;
  minDepartureDateObj: Date | null = null;
   isConfirmed: boolean = false;
  isCancelled: boolean = false;
  actionLogs: ReservationActionLogResponseDto[] = [];
  salesAmountSignal = signal<number | null>(null);
  get salesAmount() {
    return this.salesAmountSignal();
  }
  set salesAmount(value: number | null) {
    this.salesAmountSignal.set(value);
  }
  costAmountSignal = signal<number | null>(null);
  get costAmount() {
    return this.costAmountSignal();
  }
  set costAmount(value: number | null) {
    this.costAmountSignal.set(value);
  }
 
showCompactTotalsSignal = signal<boolean>(true);
get showCompactTotals() { return this.showCompactTotalsSignal(); }
set showCompactTotals(v: boolean) { this.showCompactTotalsSignal.set(v); }

  constructor(
    private salesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,

    private salesRepresentativeService: SalesRepresentativeService,
    private reservationCompanyService: ReservationCompanyService,
    private hotelService: HotelService,
    private seasonService: ReservationSeasonService,
    private reservationServiceService: ReservationServiceService,
    private reservationService: ReservationService,
    private roomTypeService: RoomTypeService,
    private reservationViewService: ReservationViewService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public reservationMealService: ReservationMealService,
    public reservationSupplierService: ReservationSupplierService,
    public router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private companyDetailsService: CompanyDetailsService,
    private salesInvoiceService: SalesInvoiceService,
    @Inject(LOCALE_ID) private locale: string,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log('🔍 Reservation Component Locale:', this.locale);
    console.log('🌍 Browser Language:', navigator.language);
    console.log('🌍 Browser Languages:', navigator.languages);
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.initializeNationalities();
    this.buildActionMenus();

    this.reservationForm = this.fb.group({
      id: [null],
      referenceNumber: [''],
      guestName: ['', Validators.required],
      guestPhone: ['', [Validators.pattern('^[+]?[0-9\\s-]*$')]],
      guestEmail: ['', [Validators.email]],
      nationality: ['', Validators.required],
      arrivalDate: [null, Validators.required],
      departureDate: [null, Validators.required],
      numberOfNights: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      reservationCompanyId: [null],
      reservationClientCompanyId: [null, Validators.required],
      salesRepresentativeId: [null],
      hotelId: [null, Validators.required],
      reservationSeasonId: [null, Validators.required],
      reservationType: ['', Validators.required],
      reservationRoomEntries: this.fb.array([]),
      reservationServiceEntries: this.fb.array([]),
      bankAccountId: [null],
      companyPhoneId: [null],
      companyPolicyId: [null],
      hotelRemarks: [null],
      clientRemarks: [null],
    });

    // Example: Add one reservation detail by default
    this.addRoomEntry();
    this.addServiceEntry();

    // Set up listeners for automatic calculations
    // Update minimum departure date when arrival date changes
    this.reservationForm
      .get('arrivalDate')
      ?.valueChanges.subscribe((arrivalDate) => {
        if (arrivalDate) {
          const minDate = new Date(arrivalDate);
          minDate.setDate(minDate.getDate() + 1); // Add 1 day
          this.minDepartureDate = this.formatDate(minDate); // Format as yyyy-MM-dd
          this.minDepartureDateObj = minDate;

          // Automatically adjust departure date if it's before the new min date
          const departureDate =
            this.reservationForm.get('departureDate')?.value;
          if (departureDate && new Date(departureDate) < minDate) {
            this.reservationForm.get('departureDate')?.setValue(null); // Reset if invalid
          }
        } else {
          this.minDepartureDate = ''; // Clear min date if no arrival date
          this.minDepartureDateObj = null;
        }
      });

    this.reservationForm.get('numberOfNights')?.valueChanges.subscribe(() => {
      this.calculateDepartureDateOrNights();
    });

    this.reservationForm.get('departureDate')?.valueChanges.subscribe(() => {
      this.calculateNumberOfNights();
    });

  }
  reservationId: string;

  ngOnInit(): void {
    this.baseDpr = window.devicePixelRatio || 1;
    this.supportsZoom = 'zoom' in this.document.body.style;
    this.renderer.addClass(this.document.body, 'reservation-fullheight');
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.reservationId = id;
      if (id) {
        this.getById(id);
      }
    });
    this.route.queryParamMap.subscribe((params) => {
      const copyId = params.get('copyId');
      // ننفذ النسخ فقط لو مفيش id (إنشاء جديد)
      if (copyId && !this.reservationId) {
        this.reservationService.getById(copyId).subscribe({
          next: (res) => this.fillFormForCopy(res),
          error: (err) => console.error('Error loading copy source:', err),
        });
      }
      if (!copyId && !this.reservationId) {
      this.reservationService.getNewReferenceNumber().subscribe({
        next: (ref) => {
          this.reservationForm.get('referenceNumber')?.setValue(ref);
        },
        error: (err) => {
          console.error('Error getting new reference number:', err);
          // ممكن تسيبه فاضي أو تحط قيمة افتراضية
        },
      });
    }
    });
    
    this.calculateTotals();

    // If totals depend on form changes, add a subscription to the form changes.
    this.reservationForm.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    // Subscribe to language changes for dynamic switching without page reload
    this.langChangeSubscription = this.translate.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang;
      this.initializeNationalities();
      this.buildActionMenus();
      this.updateOptionsTranslations();
      this.updateReservationHeight();
      this.cdr.detectChanges();
    });

    if (!this.reservationId) {
      this.loadData();
    }
  }

 ngAfterViewInit(): void {
  this.updateReservationHeight();

  window.addEventListener('resize', this.handleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', this.handleResize, { passive: true });
}

ngOnDestroy(): void {
  this.langChangeSubscription?.unsubscribe();
  this.renderer.removeClass(this.document.body, 'reservation-fullheight');

  window.removeEventListener('resize', this.handleResize);
  window.visualViewport?.removeEventListener('resize', this.handleResize);
}


  private handleResize = () => {
    this.updateReservationHeight();
  };

  private updateReservationHeight(): void {
    if (!this.reservationPage?.nativeElement) return;
    const pageEl = this.reservationPage.nativeElement;

    this.currentScale = 1;
    this.renderer.removeStyle(pageEl, 'zoom');
    this.renderer.removeStyle(pageEl, 'transform');
    this.renderer.removeStyle(pageEl, 'transformOrigin');
    this.renderer.removeStyle(pageEl, 'height');
    this.renderer.removeStyle(pageEl, 'min-height');
    this.renderer.setStyle(pageEl, 'width', '100%');
  }



  getById(id: string): void {
    this.loading = true;

    // Load logs in background without blocking main reservation rendering
    this.reservationService.getReservationLogs(id).subscribe({
      next: (logs) => {
        this.actionLogs = logs;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load logs', err)
    });

    this.reservationService.getById(id).subscribe({
      next: (res) => {
        this.reservation = res;
        this.isConfirmed = !!res.isConfirmed;
        this.isCancelled = !!res.isCancelled;
        this.isInvoiced = !!res.saleInvoiceId;
        this.isReadOnly = !!res.isSentToZatca || !!res.isConfirmed || !!res.isCancelled || this.isInvoiced;

        // Populate initial dropdown options immediately from DTO names for instant display
        this.seedOptionsFromReservation(res);

        // Populate the form with the retrieved data
        this.reservationForm.patchValue(
          {
            id: res.id,
            referenceNumber: res.referenceNumber,
            guestName: res.guestName,
            guestPhone: res.guestPhone,
            guestEmail: res.guestEmail,
            nationality: res.nationality,
            arrivalDate: res.arrivalDate,
            departureDate: res.departureDate,
            numberOfNights: res.numberOfNights,
            reservationCompanyId: res.reservationCompanyId,
            reservationClientCompanyId: res.reservationClientCompanyId,
            salesRepresentativeId: res.salesRepresentativeId,
            hotelId: res.hotelId,
            reservationSeasonId: res.reservationSeasonId,
            reservationType: res.reservationType,
            bankAccountId: res.bankAccountId,
            companyPhoneId: res.companyPhoneId,
            companyPolicyId: res.companyPolicyId,
            hotelRemarks: res.hotelRemarks,
            clientRemarks: res.clientRemarks,
          },
          { emitEvent: true }
        );

        this.setRoomEntries(res.reservationRoomEntries || []);
        this.setServiceEntries(res.reservationServiceEntries || []);

        if (this.isReadOnly) {
          this.reservationForm.disable({ emitEvent: false });
        }

        // Unblock UI immediately so the user sees the reservation in 0 seconds
        this.loading = false;
        this.cdr.detectChanges();

        // Check if this reservation has a sales invoice in background
        if (this.isConfirmed || this.isInvoiced) {
          this.checkForSalesInvoice(res.id);
        }

        // If editable, fetch full lookup lists in background silently after page paint
        if (!this.isReadOnly) {
          setTimeout(() => {
            this.loadData();
          }, 150);
        }
      },
      error: (error) => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  relatedReservationsDropdown: any[] = [];
  selectedRelatedReservation: string | null = null;

  checkForSalesInvoice(reservationId: string): void {
    this.salesInvoiceService.getInvoiceByReservationId(reservationId).pipe(
      map((invoice: any) => {
        if (invoice && invoice.id) {
          this.hasSalesInvoice = true;
          this.salesInvoiceId = invoice.id;
          this.salesInvoiceNo = invoice.invoiceNo || invoice.referenceNumber || `#${invoice.id}`;
          this.selectedRelatedReservation = reservationId;
          
          // Check for multiple reservations linked to the same invoice
          if (invoice.reservationIds && invoice.reservationIds.length > 1) {
            const requests = invoice.reservationIds.map((id: string) => this.reservationService.getById(id));
            forkJoin(requests).subscribe((resList: any[]) => {
              this.relatedReservationsDropdown = resList.map((r: any) => ({
                label: `#${r.referenceNumber || r.id} - ${r.guestName || ''}`,
                value: r.id
              }));
              this.cdr.detectChanges();
            });
          } else {
            this.relatedReservationsDropdown = [];
            this.cdr.detectChanges();
          }

        } else {
          this.hasSalesInvoice = false;
          this.salesInvoiceId = null;
          this.salesInvoiceNo = null;
          this.selectedRelatedReservation = null;
          this.relatedReservationsDropdown = [];
          this.cdr.detectChanges();
        }
      }),
      catchError((error) => {
        this.hasSalesInvoice = false;
        this.salesInvoiceId = null;
        this.salesInvoiceNo = null;
        this.selectedRelatedReservation = null;
        this.relatedReservationsDropdown = [];
        return of(null);
      })
    ).subscribe();
  }

  onRelatedReservationSelect(event: any): void {
    if (event.value && event.value !== this.reservationId) {
      // Navigate to the other reservation
      this.router.navigate(['/reservations', event.value]);
    }
  }

  viewSalesInvoice(): void {
    const invoiceId = this.salesInvoiceId || this.reservation?.saleInvoiceId;
    if (invoiceId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/invoices/reservation-details', invoiceId])
      );
      window.open(url, '_blank');
    } else if (this.reservationId) {
      this.salesInvoiceService.getInvoiceByReservationId(this.reservationId).subscribe((invoice: any) => {
        if (invoice && invoice.id) {
          this.salesInvoiceId = invoice.id;
          const url = this.router.serializeUrl(
            this.router.createUrlTree(['/invoices/reservation-details', invoice.id])
          );
          window.open(url, '_blank');
        } else {
          this.messageService.add({
            severity: 'info',
            summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Information',
            detail: this.activeLanguage === 'ar' ? 'لا توجد فاتورة مبيعات مرتبطة بهذا الحجز.' : 'No sales invoice associated with this reservation.',
          });
        }
      });
    }
  }

  copyReservation(): void {
    if (!this.reservationId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
        detail: this.activeLanguage === 'ar' ? 'لا يمكن نسخ هذا الحجز.' : 'Cannot copy this reservation.',
      });
      return;
    }

    const targetUrl = this.isFrontal
      ? '/reservations/frontal-new'
      : '/reservations/new';

    this.router.navigate([targetUrl], {
      queryParams: { copyId: this.reservationId },
    });
  }


  private fillFormForCopy(source: ReservationModel): void {
    // ⬅️ لازم نشتغل على Instances من الكلاسات، مش Object literals
    const copy = new ReservationModel(source);

    // صفّر القيَم اللي ماينفعش تتنسخ
    copy.id = null;
    copy.referenceNumber = null as any; // هيتولد تلقائيًا بعد الحفظ
    (copy as any).isSentToZatca = false;
    (copy as any).isConfirmed = false;
    (copy as any).transactionId = null;
 this.isConfirmed = false;
    this.isCancelled = false;
    // لو فيه مرفقات في الموديل.. صفّرها
    if ('attachments' in copy) {
      (copy as any).attachments = [];
    }

    // ⬅️ الأهم: خلي تفاصيل الغرف والخدمات Instances من موديلاتهم
    copy.reservationRoomEntries = (source.reservationRoomEntries || []).map(
      (e) =>
        new ReservationRoomEntryModel({
          ...e,
          id: null,
          reservationId: null,
        })
    );

    copy.reservationServiceEntries = (
      source.reservationServiceEntries || []
    ).map(
      (e) =>
        new ReservationServiceEntryModel({
          ...e,
          id: null,
          reservationId: null,
        })
    );

    // عبّي النموذج بالقيم (بدون Id)
    this.reservationForm.patchValue(
      {
        id: null,
        referenceNumber: '',
        guestName: copy.guestName,
        guestPhone: copy.guestPhone,
        guestEmail: copy.guestEmail,
        nationality: copy.nationality,
        arrivalDate: copy.arrivalDate,
        departureDate: copy.departureDate,
        numberOfNights: copy.numberOfNights,
        reservationCompanyId: copy.reservationCompanyId,
        reservationClientCompanyId: copy.reservationClientCompanyId,
        salesRepresentativeId: copy.salesRepresentativeId,
        hotelId: copy.hotelId,
        reservationSeasonId: copy.reservationSeasonId,
        reservationType: copy.reservationType,
        bankAccountId: copy.bankAccountId ?? null,
        companyPhoneId: copy.companyPhoneId ?? null,
        companyPolicyId: copy.companyPolicyId ?? null,
        hotelRemarks: copy.hotelRemarks ?? null,
        clientRemarks: copy.clientRemarks ?? null,
      },
      { emitEvent: true }
    );

    // املأ الـ FormArrays بالـ Instances اللي فوق
    this.setRoomEntries(copy.reservationRoomEntries || []);
    this.setServiceEntries(copy.reservationServiceEntries || []);

    // وضع إنشاء جديد
    this.reservationId = null;
    this.isReadOnly = false;

    this.calculateTotals();
  }

  get reservationRoomEntries(): FormArray {
    return this.reservationForm.get('reservationRoomEntries') as FormArray;
  }

  get reservationServiceEntries(): FormArray {
    return this.reservationForm.get('reservationServiceEntries') as FormArray;
  }

  addRoomEntry(): void {
    const room = this.fb.group({
      id: [null],
      roomTypeId: [null, Validators.required],
      numberOfRooms: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      roomRate: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      roomCost: [null],
      reservationMealId: [null],
      mealRate: [null, [CustomValidators.greaterThanZero()]],
      mealCost: [null],
      reservationViewId: [null],
      viewRate: [null, [CustomValidators.greaterThanZero()]],
      viewCost: [null],
      reservationId: [null],
    });

    room.get('reservationMealId')?.valueChanges.subscribe((mealId) => {
      if (!mealId) {
        room.get('mealRate')?.setValue(null);
        room.get('mealCost')?.setValue(null);
      }
    });

    room.get('reservationViewId')?.valueChanges.subscribe((viewId) => {
      if (!viewId) {
        room.get('viewRate')?.setValue(null);
        room.get('viewCost')?.setValue(null);
      }
    });

    this.reservationRoomEntries.push(room);
  }

  addServiceEntry(): void {
    const service = this.fb.group({
      id: [null],
      reservationServiceId: [null, Validators.required],
      description: [''],
      //startDate: [null, Validators.required],
      //endDate: [null, Validators.required],
      quantity: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      salesPrice: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      costPrice: [null],
      reservationSupplierId: [null],
      reservationId: [null],
    });

    this.reservationServiceEntries.push(service);
  }

  getRoomPax(roomDetail: AbstractControl) {
    const roomType = this.roomTypes.find(
      (r) => r.id === roomDetail.get('roomTypeId').value
    );
    const noOfRooms = roomDetail.get('numberOfRooms')?.value;
    if (roomType == null || noOfRooms == null) return null;
    const result = noOfRooms * roomType.personNo;
    return result === 0 ? null : result;
  }

  setRoomEntries(entries: ReservationRoomEntryModel[]): void {
    const roomEntriesFormArray = this.reservationForm.get(
      'reservationRoomEntries'
    ) as FormArray;
    roomEntriesFormArray.clear(); // Clear existing entries
    entries.forEach((entry) => {
      const roomGroup = this.fb.group({
        id: [entry.id],
        roomTypeId: [entry.roomTypeId, Validators.required],
        numberOfRooms: [entry.numberOfRooms, [Validators.required, CustomValidators.greaterThanZero()]],
        roomRate: [entry.roomRate, [Validators.required, CustomValidators.greaterThanZero()]],
        roomCost: [entry.roomCost],
        reservationMealId: [entry.reservationMealId],
        mealRate: [entry.mealRate, [CustomValidators.greaterThanZero()]],
        mealCost: [entry.mealCost],
        reservationViewId: [entry.reservationViewId],
        viewRate: [entry.viewRate, [CustomValidators.greaterThanZero()]],
        viewCost: [entry.viewCost],
        reservationId: [entry.reservationId],
      });

      roomGroup.get('reservationMealId')?.valueChanges.subscribe((mealId) => {
        if (!mealId) {
          roomGroup.get('mealRate')?.setValue(null);
          roomGroup.get('mealCost')?.setValue(null);
        }
      });

      roomGroup.get('reservationViewId')?.valueChanges.subscribe((viewId) => {
        if (!viewId) {
          roomGroup.get('viewRate')?.setValue(null);
          roomGroup.get('viewCost')?.setValue(null);
        }
      });

      roomEntriesFormArray.push(roomGroup);
    });
  }

  setServiceEntries(entries: ReservationServiceEntryModel[]): void {
    const serviceEntriesFormArray = this.reservationForm.get(
      'reservationServiceEntries'
    ) as FormArray;
    serviceEntriesFormArray.clear(); // Clear existing entries
    entries.forEach((entry) => {
      serviceEntriesFormArray.push(
        this.fb.group({
          id: [entry.id],

          reservationServiceId: [
            entry.reservationServiceId,
            Validators.required,
          ],
          description: [entry.description],
          quantity: [entry.quantity, [Validators.required, CustomValidators.greaterThanZero()]],
          //startDate: [entry.startDate, Validators.required],
          //endDate: [entry.endDate, Validators.required],
          salesPrice: [entry.salesPrice, [Validators.required, CustomValidators.greaterThanZero()]],
          costPrice: [entry.costPrice],
          reservationSupplierId: [entry.reservationSupplierId],
          reservationId: [entry.reservationId],
        })
      );
    });
  }

  getRoomTotalSalesPrice(roomDetail: AbstractControl) {
    const numberOfNights = this.reservationForm.get('numberOfNights')?.value;
    const roomRate = roomDetail.get('roomRate')?.value;
    const numberOfRooms = roomDetail.get('numberOfRooms')?.value;

    const roomPax = this.getRoomPax(roomDetail);

    const mealRate = roomDetail.get('mealRate')?.value;

    const viewRate = roomDetail.get('viewRate')?.value;
    // check if all not null
    if (
      roomRate == null ||
      roomPax == null ||
      numberOfNights == null ||
      numberOfRooms == null
    ) {
      return null;
    }
    const result = numberOfRooms * numberOfNights * roomRate +
      roomPax * numberOfNights * (mealRate || 0) +
      numberOfRooms * numberOfNights * (viewRate || 0);
    return result === 0 ? null : result;
  }

  getRoomTotalCostPrice(roomDetail: AbstractControl) {
    const numberOfNights = this.reservationForm.get('numberOfNights')?.value;
    const roomCost = roomDetail.get('roomCost')?.value;
    const numberOfRooms = roomDetail.get('numberOfRooms')?.value;
    const roomPax = this.getRoomPax(roomDetail);
    const mealCost = roomDetail.get('mealCost')?.value;
    const viewCost = roomDetail.get('viewCost')?.value;
    // check if all not null
    if (
      roomCost == null ||
      roomPax == null ||
      numberOfNights == null ||
      numberOfRooms == null
    ) {
      return null;
    }
    const result = numberOfRooms * numberOfNights * roomCost +
      roomPax * numberOfNights * (mealCost || 0) +
      numberOfRooms * numberOfNights * (viewCost || 0);
    return result === 0 ? null : result;
  }

  getSalesVatAmount(serviceDetail: AbstractControl) {
    const salesPrice = serviceDetail.get('salesPrice')?.value;
    return salesPrice ? (salesPrice * 0.15).toFixed(2) : null;
  }

  getCostVatAmount(serviceDetail: AbstractControl) {
    const costPrice = serviceDetail.get('costPrice')?.value;
    return costPrice ? (costPrice * 0.15).toFixed(2) : null;
  }

  getServiceTotalSalesPrice(serviceDetail: AbstractControl) {
    const quantity = serviceDetail.get('quantity')?.value;
    const salesPrice = serviceDetail.get('salesPrice')?.value;
    if (quantity == null || salesPrice == null) return null;
    const result = quantity * salesPrice;
    return result === 0 ? null : result;
  }

  getServiceTotalCostPrice(serviceDetail: AbstractControl) {
    const quantity = serviceDetail.get('quantity')?.value;
    const costPrice = serviceDetail.get('costPrice')?.value;
    if (quantity == null || costPrice == null) return null;
    const result = quantity * costPrice;
    return result === 0 ? null : result;
  }

  removeRoomEntry(index: number): void {
    this.reservationRoomEntries.removeAt(index);
  }

  removeServiceEntry(index: number): void {
    this.reservationServiceEntries.removeAt(index);
  }

  cleanEmptyServiceEntries(): void {
    const entries = this.reservationServiceEntries;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries.at(i);
      const serviceId = entry.get('reservationServiceId')?.value;
      const quantity = entry.get('quantity')?.value;
      const salesPrice = entry.get('salesPrice')?.value;

      const isEmpty = !serviceId &&
                      (quantity === null || quantity === undefined || quantity === '') &&
                      (salesPrice === null || salesPrice === undefined || salesPrice === '');

      if (isEmpty) {
        entries.removeAt(i);
      }
    }
  }

  onSubmit(): void {
  if (this.isReadOnly) return;

  this.cleanEmptyServiceEntries();

  this.reservationForm.markAllAsTouched();
  if (this.reservationForm.invalid) {
    this.messageService.add({
      severity: 'warn',
      summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
      detail: this.activeLanguage === 'ar' ? 'برجاء ملء الحقول الفارغة المطلوبة' : 'Please fill in the required empty fields',
      life: 6000,
    });
    return;
  }

  // المحاولة الأولى بدون force
  this.saveReservation(false);
}

/**
 * Get list of missing required field names in active language
 */
public getMissingRequiredFields(): string[] {
  const missingFields: string[] = [];
  const isAr = this.activeLanguage === 'ar';
  
  // Map of field names to their labels
  const fieldLabels: { [key: string]: string } = isAr ? {
    'guestName': 'اسم النزيل',
    'nationality': 'الجنسية',
    'arrivalDate': 'تاريخ الوصول',
    'departureDate': 'تاريخ المغادرة',
    'numberOfNights': 'عدد الليالي',
    'reservationClientCompanyId': 'العميل',
    'hotelId': 'الفندق',
    'reservationSeasonId': 'الموسم',
    'reservationType': 'نوع الحجز',
  } : {
    'guestName': 'Guest Name',
    'nationality': 'Nationality',
    'arrivalDate': 'Arrival Date',
    'departureDate': 'Departure Date',
    'numberOfNights': 'Number of Nights',
    'reservationClientCompanyId': 'Client Company',
    'hotelId': 'Hotel',
    'reservationSeasonId': 'Season',
    'reservationType': 'Reservation Type',
  };

  // Check main form controls
  Object.keys(fieldLabels).forEach(fieldName => {
    const control = this.reservationForm.get(fieldName);
    if (control && control.invalid && control.errors?.['required']) {
      missingFields.push(fieldLabels[fieldName]);
    }
  });

  // Check room entries
  const roomEntries = this.reservationRoomEntries;
  if (roomEntries.length === 0) {
    missingFields.push(isAr ? 'بيانات الغرف (يجب إضافة غرفة واحدة على الأقل)' : 'Room details (at least one room is required)');
  } else {
    let hasInvalidRoom = false;
    roomEntries.controls.forEach((room, index) => {
      if (room.invalid) {
        const roomErrors: string[] = [];
        if (room.get('roomTypeId')?.invalid) roomErrors.push(isAr ? 'نوع الغرفة' : 'Room Type');
        if (room.get('numberOfRooms')?.invalid) roomErrors.push(isAr ? 'عدد الغرف' : 'Number of Rooms');
        if (room.get('roomRate')?.invalid) roomErrors.push(isAr ? 'سعر الغرفة' : 'Room Rate');
        if (room.get('roomCost')?.invalid) roomErrors.push(isAr ? 'تكلفة الغرفة' : 'Room Cost');
        
        if (roomErrors.length > 0 && !hasInvalidRoom) {
          missingFields.push(isAr ? `بيانات الغرفة رقم ${index + 1} (${roomErrors.join('، ')})` : `Room #${index + 1} details (${roomErrors.join(', ')})`);
          hasInvalidRoom = true;
        }
      }
    });
  }

  // Check service entries
  const serviceEntries = this.reservationServiceEntries;
  if (serviceEntries.length > 0) {
    let hasInvalidService = false;
    serviceEntries.controls.forEach((service, index) => {
      if (service.invalid) {
        const serviceErrors: string[] = [];
        if (service.get('reservationServiceId')?.invalid) serviceErrors.push(isAr ? 'الخدمة' : 'Service');
        if (service.get('quantity')?.invalid) serviceErrors.push(isAr ? 'الكمية' : 'Quantity');
        if (service.get('salesPrice')?.invalid) serviceErrors.push(isAr ? 'سعر البيع' : 'Sales Price');
        if (service.get('costPrice')?.invalid) serviceErrors.push(isAr ? 'سعر التكلفة' : 'Cost Price');
        if (service.get('reservationSupplierId')?.invalid) serviceErrors.push(isAr ? 'المورد' : 'Supplier');
        
        if (serviceErrors.length > 0 && !hasInvalidService) {
          missingFields.push(isAr ? `بيانات الخدمة رقم ${index + 1} (${serviceErrors.join('، ')})` : `Service #${index + 1} details (${serviceErrors.join(', ')})`);
          hasInvalidService = true;
        }
      }
    });
  }

  return missingFields;
}

/** الحفظ الفعلي (create/update) */
// private saveReservation(forceBooking: boolean): void {
//   this.loading = true;

//   const reservation: ReservationModel = this.reservationForm.value;
//   reservation.isConfirmed = this.isConfirmed;
//   reservation.isCancelled = this.isCancelled;

//   const reservationEntity = new ReservationModel(reservation);

//   if (reservation.id) {
//     reservationEntity.reservationRoomEntries =
//       (reservation.reservationRoomEntries || []).map(
//         (x: any) => new ReservationRoomEntryModel({ ...x, reservationId: reservation.id })
//       );

//     reservationEntity.reservationServiceEntries =
//       (reservation.reservationServiceEntries || []).map(
//         (x: any) => new ReservationServiceEntryModel({ ...x, reservationId: reservation.id })
//       );
//   } else {
//     reservationEntity.reservationRoomEntries =
//       (reservation.reservationRoomEntries || []).map((x: any) => new ReservationRoomEntryModel(x));

//     reservationEntity.reservationServiceEntries =
//       (reservation.reservationServiceEntries || []).map((x: any) => new ReservationServiceEntryModel(x));
//   }

//   // ✅ أضف forceBooking للـ payload حتى لو الموديل مش فيه
//   (reservationEntity as any).forceBooking = forceBooking;

//   const req$ = reservation.id
//     ? this.reservationService.update(reservationEntity)
//     : this.reservationService.create(reservationEntity);

//   // req$.subscribe({
//   //   next: () => {
//   //     this.loading = false;
//   //     this.messageService.add({
//   //       severity: 'success',
//   //       summary: 'Success',
//   //       detail: 'تم الحفظ بنجاح',
//   //     });
//   //     this.router.navigate(['/reservations/']);
//   //   },
//   //   error: (err) => {
//   //     this.loading = false;
//   //     this.handleSaveError(err, forceBooking);
//   //   },
//   // });

// req$.subscribe({
//   next: (res: any) => {
//     this.loading = false;

//       console.log('SAVE RESPONSE ===>', res);
//   console.log('forceBooking ===>', forceBooking);
//     // 🚨 Overbooking من الباك (OperationResponse)
// // ==================================
// // 🚨 1) Overbooking – من الباك مباشرة
// // ==================================
// if (res?.errorCode === -11 && !forceBooking) {
//   const days = res.data?.overbookedDays || [];
//   const formattedDays = days.map((d: any) => {
//     const date = new Date(d);
//     return date.toLocaleDateString(); // زي 2025‑12‑30
//   }).join(', ');

//   this.confirmationService.confirm({
//     header: 'تأكيد المتابعة',
//     message: `يوجد تجاوز في الأيام التالية: ${formattedDays}. هل تريد المتابعة؟`,
//     icon: 'pi pi-exclamation-triangle',
//     acceptLabel: 'نعم',
//     rejectLabel: 'لا',
//     accept: () => {
//       // ⬅️ إعادة تنفيذ الحفظ مع forceBooking = true
//       this.saveReservation(true);
//     },
//     reject: () => {
//       this.messageService.add({
//         severity: 'info',
//         summary: 'تم الإلغاء',
//         detail: 'تم إلغاء الحفظ',
//       });
//     }
//   });

//   return; // ✋ مهم جدًا — نوقف تنفيذ الـ success بعد كده
// }


//     // ✅ نجاح حقيقي
//     this.messageService.add({
//       severity: 'success',
//       summary: 'Success',
//       detail: 'تم الحفظ بنجاح',
//     });
//     this.router.navigate(['/reservations/']);
//   },

//   error: (err) => {
//     // أخطاء حقيقية فقط (500 / validation / network)
//     this.loading = false;
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Error',
//       detail: this.extractErrorMessage(err) || 'فشل الحفظ',
//     });
//   },
// });



// }


  formatDateToLocalString(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

private saveReservation(forceBooking: boolean): void {
  this.loading = true;

  const reservation: ReservationModel = this.reservationForm.value;
  reservation.isConfirmed = this.isConfirmed;
  reservation.isCancelled = this.isCancelled;

  if (reservation.arrivalDate) {
    reservation.arrivalDate = this.formatDateToLocalString(reservation.arrivalDate);
  }
  if (reservation.departureDate) {
    reservation.departureDate = this.formatDateToLocalString(reservation.departureDate);
  }

  const reservationEntity = new ReservationModel(reservation);

  if (reservation.id) {
    reservationEntity.reservationRoomEntries =
      (reservation.reservationRoomEntries || []).map(
        (x: any) => new ReservationRoomEntryModel({ ...x, reservationId: reservation.id })
      );

    reservationEntity.reservationServiceEntries =
      (reservation.reservationServiceEntries || []).map(
        (x: any) => new ReservationServiceEntryModel({ ...x, reservationId: reservation.id })
      );
  } else {
    reservationEntity.reservationRoomEntries =
      (reservation.reservationRoomEntries || []).map((x: any) => new ReservationRoomEntryModel(x));

    reservationEntity.reservationServiceEntries =
      (reservation.reservationServiceEntries || []).map((x: any) => new ReservationServiceEntryModel(x));
  }

  // أضف forceBooking للـ payload
  (reservationEntity as any).forceBooking = forceBooking;

  const req$ = reservation.id
    ? this.reservationService.update(reservationEntity)
    : this.reservationService.create(reservationEntity);

  req$.subscribe({
    next: (res: any) => {
      this.loading = false;
      console.log('SAVE RESPONSE ===>', res, 'forceBooking ===>', forceBooking);

      // ===== Overbooking =====
      if (res?.status === -11 && !forceBooking) {
        const days = res.overbookedDays || [];
        // const formattedDays = days
        //   .map((d: any) => new Date(d).toLocaleDateString())
        //   .join(', ');

        this.confirmationService.confirm({
          header: 'تأكيد المتابعة',
          // message: `يوجد تجاوز في الأيام التالية: ${formattedDays}. هل تريد المتابعة؟`,
         message: `يوجد تجاوز في عدد الغرف المتاحة هل تريد المتابعة؟`,
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'نعم',
          rejectLabel: 'لا',
          accept: () => this.saveReservation(true),
          reject: () => {
            this.messageService.add({
              severity: 'info',
              summary: 'تم الإلغاء',
              detail: 'تم إلغاء الحفظ',
            });
          }
        });

        return; // مهم جدًا لإيقاف تنفيذ success بعد كده
      }

      // ✅ نجاح فعلي - عرض رسالة مناسبة حسب العملية (إنشاء أو تحديث)
      const isCreating = !reservation.id;
      const toastMessage = isCreating 
        ? this.translate.instant('FINANCE.RESERVATION_CREATED')
        : this.translate.instant('FINANCE.RESERVATION_UPDATED');
      
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS'),
        detail: toastMessage,
        life: 5000, // 5 seconds - enough time to see after navigation
      });
      
      // Navigate immediately - toast will persist
      const target = this.isFrontal ? ['/reservations/frontal'] : ['/reservations'];
      this.router.navigate(target);
    },
    error: (err) => {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: this.extractErrorMessage(err) || 'فشل الحفظ',
      });
    }
  });
}






/** معالجة الخطأ: لو Overbooking اعرض confirm */
// private handleSaveError(err: any, alreadyForced: boolean): void {
//   const msg = this.extractErrorMessage(err);

//   // ✅ عدّل الشرط ده حسب اللي الباك هيرجعه بعد ما يظبطه
//   const isOverbooking =
//     err?.status === 409 ||
//     err?.error?.errorCode === 'OVERBOOKING' ||
//     err?.error?.code === 'OVERBOOKING' ||
//     /overbook|exceed|available|متاح|الحد|غرف/i.test(msg);

//   if (!isOverbooking) {
//     // أي خطأ عادي
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Error',
//       detail: msg || 'فشل الحفظ',
//     });
//     console.log('SAVE ERROR:', err);
//     return;
//   }

//   // لو بالفعل حاولنا forceBooking=true ولسه خطأ → خلاص
//   if (alreadyForced) {
//     this.messageService.add({
//       severity: 'error',
//       summary: 'لا يمكن الحفظ',
//       detail: msg || 'لا توجد غرف متاحة حتى مع Force Booking',
//     });
//     return;
//   }

//   // ✅ Toast تحذير
//   this.messageService.add({
//     severity: 'warn',
//     summary: 'تنبيه',
//     detail: 'لقد تعدّيت الحد الأقصى من عدد الغرف المتاحة',
//   });

//   // ✅ Confirm: accept => إعادة الحفظ بـ forceBooking=true
//   this.confirmationService.confirm({
//     header: 'تأكيد المتابعة',
//     message: 'لقد تعدّيت الحد الأقصى من عدد الغرف المتاحة. هل تريد الاستمرار؟',
//     icon: 'pi pi-exclamation-triangle',
//     acceptLabel: 'تأكيد',
//     rejectLabel: 'إلغاء',
//     accept: () => this.saveReservation(true),
//     reject: () => {
//       // يفضل نوضح للمستخدم إننا وقفنا العملية
//       this.messageService.add({
//         severity: 'info',
//         summary: 'تم الإلغاء',
//         detail: 'لم يتم الحفظ',
//       });
//     },
//   });
// }

/** استخراج رسالة الخطأ بشكل مرن */
private extractErrorMessage(err: any): string {
  // .NET غالبًا: title / message / errors
  if (typeof err?.error === 'string') return err.error;

  const e = err?.error;
  return (
    e?.message ||
    e?.title ||
    (Array.isArray(e?.errors) ? e.errors.join(', ') : '') ||
    (e?.errors && typeof e.errors === 'object' ? Object.values(e.errors).flat().join(', ') : '') ||
    err?.message ||
    ''
  );
}


  onCancel(): void {
    const target = this.isFrontal ? ['/reservations/frontal'] : ['/reservations'];
    this.router.navigate(target);
  }
 // ✅ نخزن الحالة قبل ما نظهر التوست (لو عايز ترجعها بالظبط)
private prevIsCancelled = false;
private prevIsConfirmed = false;

cancelReservationStatus(event?: Event): void {
  if (this.isCancelled || this.loading || this.reservation?.isSentToZatca || this.isInvoiced || this.hasSalesInvoice) return;

  this.confirmationService.confirm({
    header: this.activeLanguage === 'ar' ? 'تأكيد إلغاء الحجز' : 'Confirm Cancellation',
    message: this.activeLanguage === 'ar'
      ? 'سيتم إلغاء الحجز بشكل نهائي. هل تريد المتابعة؟'
      : 'This reservation will be cancelled. Do you want to continue?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: this.activeLanguage === 'ar' ? 'نعم، إلغاء الحجز' : 'Yes, Cancel',
    rejectLabel: this.activeLanguage === 'ar' ? 'تراجع' : 'No',
    acceptButtonStyleClass: 'p-button-danger p-button-sm',
    rejectButtonStyleClass: 'p-button-secondary p-button-sm',
    defaultFocus: 'accept',
    accept: () => {
      this.loading = true;
      this.reservationService.cancelReservation(this.reservationId).subscribe({
        next: () => {
          this.isCancelled = true;
          this.isReadOnly = true;
          this.reservationForm.disable({ emitEvent: false });
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'نجاح' : 'Success',
            detail: this.activeLanguage === 'ar' ? 'تم إلغاء الحجز بنجاح' : 'Reservation cancelled successfully',
          });
          this.reservationService.getReservationLogs(this.reservationId).subscribe({
            next: (logs) => {
              this.actionLogs = logs;
              this.cdr.detectChanges();
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.detectChanges();
          this.messageService.add({
            severity: 'error',
            summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
            detail: err.error?.message || (this.activeLanguage === 'ar' ? 'فشل إلغاء الحجز' : 'Failed to cancel reservation'),
          });
        }
      });
    }
  });
}

reactivateReservationStatus(event?: Event): void {
  if (!this.isCancelled || this.loading || this.reservation?.isSentToZatca) return;

  this.confirmationService.confirm({
    header: this.translate.instant('RESERVATION.REACTIVATE_CONFIRM_TITLE') || (this.activeLanguage === 'ar' ? 'تأكيد إعادة التنشيط' : 'Confirm Reactivation'),
    message: this.translate.instant('RESERVATION.REACTIVATE_CONFIRM_DETAIL') || (this.activeLanguage === 'ar' ? 'هل تريد بالتأكيد إعادة تنشيط هذا الحجز؟' : 'Are you sure you want to reactivate this reservation?'),
    icon: 'pi pi-replay',
    acceptLabel: this.activeLanguage === 'ar' ? 'إعادة تنشيط' : 'Reactivate',
    rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
    acceptButtonStyleClass: 'p-button-success p-button-sm',
    rejectButtonStyleClass: 'p-button-secondary p-button-sm',
    defaultFocus: 'accept',
    accept: () => {
      this.loading = true;
      this.reservationService.reactivateReservation(this.reservationId).subscribe({
        next: () => {
          this.isCancelled = false;
          this.isReadOnly = !!this.reservation?.isSentToZatca || !!this.isConfirmed || this.isInvoiced;
          if (!this.isReadOnly) {
            this.reservationForm.enable({ emitEvent: false });
          }
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || (this.activeLanguage === 'ar' ? 'نجاح' : 'Success'),
            detail: this.translate.instant('RESERVATION.REACTIVATE_SUCCESS') || (this.activeLanguage === 'ar' ? 'تمت إعادة تنشيط الحجز بنجاح' : 'Reservation reactivated successfully'),
          });
          this.reservationService.getReservationLogs(this.reservationId).subscribe({
            next: (logs) => {
              this.actionLogs = logs;
              this.cdr.detectChanges();
            }
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.detectChanges();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || (this.activeLanguage === 'ar' ? 'خطأ' : 'Error'),
            detail: err.error?.message || this.translate.instant('RESERVATION.REACTIVATE_FAILED'),
          });
        }
      });
    }
  });
}

confirmReservationStatus(event?: Event): void {
  if (this.isConfirmed || this.isCancelled || this.loading || this.reservation?.isSentToZatca) return;

  this.confirmationService.confirm({
    header: this.activeLanguage === 'ar' ? 'تأكيد الحجز' : 'Confirm Reservation',
    message: this.activeLanguage === 'ar'
      ? 'عند تأكيد الحجز لا يمكن التراجع عنه أو تعديله. هل تريد الاستمرار؟'
      : 'Once confirmed, this reservation cannot be edited or reverted. Do you want to continue?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: this.activeLanguage === 'ar' ? 'تأكيد' : 'Confirm',
    rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
    acceptButtonStyleClass: 'btn-confirm-action p-button-sm',
    rejectButtonStyleClass: 'btn-danger-action p-button-sm',
    defaultFocus: 'accept',
    accept: () => {
      this.loading = true;
      this.reservationService.confirmReservation(this.reservationId).subscribe({
        next: (res) => {
          this.loading = false;
          this.isConfirmed = true;
          this.isReadOnly = true;
          if (res?.lastLog) {
            this.actionLogs = [res.lastLog, ...this.actionLogs];
          }
          this.cdr.detectChanges();
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'نجاح' : 'Success',
            detail: this.activeLanguage === 'ar' ? 'تم تأكيد الحجز بنجاح' : 'Reservation confirmed successfully',
          });
        },
        error: (err) => {
          this.loading = false;
          this.cdr.detectChanges();
          this.messageService.add({
            severity: 'error',
            summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
            detail: err.error?.message || (this.activeLanguage === 'ar' ? 'فشل تأكيد الحجز' : 'Failed to confirm reservation'),
          });
        }
      });
    }
  });
}

  refreshLogsOnly(): void {
    this.reservationService.getReservationLogs(this.reservationId).subscribe({
      next: (logs) => {
        this.actionLogs = logs;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to refresh logs', err)
    });
  }

  updateOptionsTranslations(): void {
    this.updateRoomTypesOptions();
    this.updateReservationMealOptions();
    if (this.reservation) {
      this.seedOptionsFromReservation(this.reservation);
    }
    if (!this.cachedSelectData) return;
    const res = this.cachedSelectData;
    if (res.reservationSuppliers) {
      this.reservationSupplierOptions = res.reservationSuppliers
        .filter((x: any) => x.mainAccountId != null)
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
    if (res.reservationCompanies) {
      this.reservationCompaniesOptions = res.reservationCompanies
        .filter((x: any) => x.mainAccountId != null)
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
    if (res.salesRepresentatives) {
      this.salesRepresentativesOptions = res.salesRepresentatives
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
    if (res.hotels) {
      this.hotelsOptions = res.hotels
        .filter((x: any) => x.mainAccountId != null)
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
    if (res.seasons) {
      this.seasonsOptions = res.seasons
        .filter(
          (x: any) =>
            x.roomRevenueMainAccountId != null &&
            x.roomExpenseMainAccountId != null &&
            x.mealRevenueMainAccountId != null &&
            x.mealExpenseMainAccountId != null &&
            x.otherRevenueMainAccountId != null &&
            x.otherExpenseMainAccountId != null
        )
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
    if (res.views) {
      this.viewsOptions = res.views.map((x: any) => ({
        label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
        value: x.id,
      }));
    }
    if (res.reservationServices) {
      this.reservationServicesOptions = res.reservationServices
        .filter(
          (x: any) =>
            x.revenueMainAccountId != null && x.expenseMainAccountId != null
        )
        .map((x: any) => ({
          label: this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName),
          value: x.id,
        }));
    }
  }

  loadData(): void {
    if (!this.reservationId) {
      this.loading = true;
    }
    forkJoin({
      reservationCompanies: this.reservationCompanyService.getAll(),
      salesRepresentatives: this.salesRepresentativeService.getAll(),
      hotels: this.hotelService.getAll(),
      seasons: this.seasonService.getAll(),
      roomTypes: this.roomTypeService.getAll(),
      views: this.reservationViewService.getAll(),
      reservationServices: this.reservationServiceService.getAll(),
      reservationMeals: this.reservationMealService.getAll(),
      reservationSuppliers: this.reservationSupplierService.getAll(),
      companyDetails: this.companyDetailsService.getAll(),
    }).subscribe({
      next: (res) => {
      console.log(res);
      this.cachedSelectData = res;
      this.reservationMeals = res.reservationMeals;
      this.roomTypes = res.roomTypes;
      this.updateOptionsTranslations();

      this.companyBankAccountOptions = res.companyDetails[0].bankAccounts.map(
        (x) => ({
          label: `${x.bankName} - ${x.bankAccountNumber}`,
          value: x.id,
        })
      );
      this.companyPhoneOptions = res.companyDetails[0].phones.map((x) => ({
        label: x.phoneNumber,
        value: x.id,
      }));
      this.companyPolicyOptions = res.companyDetails[0].policies.map((x) => ({
        label: x.policyParagraph,
        value: x.id,
      }));

      // Set default values for primary records (isPrimary = true) only if creating new or empty
      if (res.companyDetails && res.companyDetails.length > 0) {
        const company = res.companyDetails[0];

        // Set default bank account (isPrimary = true)
        const primaryBankAccount = company.bankAccounts.find(
          (account) => account.isPrimary
        );
        if (primaryBankAccount && !this.reservationForm.get('bankAccountId')?.value) {
          this.reservationForm
            .get('bankAccountId')
            ?.setValue(primaryBankAccount.id);
        }

        // Set default phone (isPrimary = true)
        const primaryPhone = company.phones.find((phone) => phone.isPrimary);
        if (primaryPhone && !this.reservationForm.get('companyPhoneId')?.value) {
          this.reservationForm.get('companyPhoneId')?.setValue(primaryPhone.id);
        }

        // Set default policy (isPrimary = true)
        const primaryPolicy = company.policies.find(
          (policy) => policy.isPrimary
        );
        if (primaryPolicy && !this.reservationForm.get('companyPolicyId')?.value) {
          this.reservationForm
            .get('companyPolicyId')
            ?.setValue(primaryPolicy.id);
        }
      }

      // After all data is loaded, call detectChanges
      if (!this.reservationId) {
        this.loading = false;
        this.calculateTotals();
      }
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error loading data:', err);
      if (!this.reservationId) {
        this.loading = false;
      }
    }
    });
  }

  // Calculate total sales and cost price for room entries
  getRoomTotals() {
    let totalSalesPrice = 0;
    let totalCostPrice = 0;
    let hasValidSales = false;
    let hasValidCost = false;

    this.reservationRoomEntries.controls.forEach((control) => {
      const salesPrice = this.getRoomTotalSalesPrice(control);
      const costPrice = this.getRoomTotalCostPrice(control);

      if (salesPrice !== null) {
        totalSalesPrice += salesPrice;
        hasValidSales = true;
      }
      if (costPrice !== null) {
        totalCostPrice += costPrice;
        hasValidCost = true;
      }
    });

    return { 
      totalSalesPrice: hasValidSales ? totalSalesPrice : null, 
      totalCostPrice: hasValidCost ? totalCostPrice : null 
    };
  }

  // Calculate total sales and cost price for service entries
  getServiceTotals() {
    let totalSalesPrice = 0;
    let totalCostPrice = 0;
    let hasValidSales = false;
    let hasValidCost = false;

    this.reservationServiceEntries.controls.forEach((control) => {
      const salesPrice = this.getServiceTotalSalesPrice(control);
      const costPrice = this.getServiceTotalCostPrice(control);

      if (salesPrice !== null) {
        totalSalesPrice += salesPrice;
        hasValidSales = true;
      }
      if (costPrice !== null) {
        totalCostPrice += costPrice;
        hasValidCost = true;
      }
    });

    return { 
      totalSalesPrice: hasValidSales ? totalSalesPrice : null, 
      totalCostPrice: hasValidCost ? totalCostPrice : null 
    };
  }

  calculateTotals(): void {
    const roomTotals = this.getRoomTotals();
    const serviceTotals = this.getServiceTotals();

    const roomSales = roomTotals.totalSalesPrice || 0;
    const serviceSales = serviceTotals.totalSalesPrice || 0;
    const roomCost = roomTotals.totalCostPrice || 0;
    const serviceCost = serviceTotals.totalCostPrice || 0;

    const totalSales = roomSales + serviceSales;
    const totalCost = roomCost + serviceCost;

    this.salesAmount = totalSales === 0 ? null : totalSales;
    this.costAmount = totalCost === 0 ? null : totalCost;
  }

  // Calculate departure date or number of nights based on inputs
  calculateDepartureDateOrNights(): void {
    const arrivalDate = this.reservationForm.get('arrivalDate')?.value;
    const numberOfNights = this.reservationForm.get('numberOfNights')?.value;

    if (arrivalDate && numberOfNights) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(
        arrival.getTime() + numberOfNights * 24 * 60 * 60 * 1000
      ); // Add days
      this.reservationForm
        .get('departureDate')
        ?.setValue(this.formatDate(departure), { emitEvent: false });
    }
  }

  // Calculate number of nights based on arrival and departure dates
  calculateNumberOfNights(): void {
    const arrivalDate = this.reservationForm.get('arrivalDate')?.value;
    const departureDate = this.reservationForm.get('departureDate')?.value;

    if (arrivalDate && departureDate) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      const differenceInTime = departure.getTime() - arrival.getTime();
      const numberOfNights = Math.ceil(differenceInTime / (1000 * 3600 * 24)); // Calculate days
      this.reservationForm
        .get('numberOfNights')
        ?.setValue(numberOfNights, { emitEvent: false });
    }
  }
  getOverallTotals() {
    const roomTotals = this.getRoomTotals();
    const serviceTotals = this.getServiceTotals();

    const roomSales = roomTotals.totalSalesPrice || 0;
    const serviceSales = serviceTotals.totalSalesPrice || 0;
    const roomCost = roomTotals.totalCostPrice || 0;
    const serviceCost = serviceTotals.totalCostPrice || 0;

    const totalSales = roomSales + serviceSales;
    const totalCost = roomCost + serviceCost;

    return {
      totalSalesPrice: totalSales === 0 ? null : totalSales,
      totalCostPrice: totalCost === 0 ? null : totalCost,
    };
  }

  // Calculate VAT (15%)
  calculateVAT(amount: number): number {
    if (amount == null || amount === 0) return null;
    return +(amount * 0.15).toFixed(2);
  }

  // Calculate Total (Amount + VAT)
  calculateTotal(amount: number): number {
    if (amount == null || amount === 0) return null;
    const vat = this.calculateVAT(amount) || 0;
    return +(amount + vat).toFixed(2);
  }

  // Calculate Profit Difference (Sales - Cost)
  calculateDifference(sales: number, cost: number): number {
    if (sales == null && cost == null) return null;
    const s = sales || 0;
    const c = cost || 0;
    const result = +(s - c).toFixed(2);
    return result === 0 ? null : result;
  }

  // Format date to yyyy-MM-dd
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get attachments(): AttachmentModel[] {
    return this.reservation?.attachments || [];
  }
  loadAttachments() {
    this.getById(this.reservationId);
  }

  deleteAttachment(attachmentId: string) {
    this.loading = true;
    this.attachmentService.delete(attachmentId).subscribe((res) => {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.CONFIRMED'),
        detail: this.translate.instant('FINANCE.ATTACHMENT_DELETED'),
      });
      this.loadAttachments();
    });
  }

  viewDialogSignal = signal(false);
  get viewDialog() {
    return this.viewDialogSignal();
  }
  set viewDialog(value) {
    this.viewDialogSignal.set(value);
  }
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }

  onView(pdf: AttachmentModel) {
    this.attachmentService.downloadAttachment(pdf.id).subscribe((res) => {
      // Decode the Base64 string into a binary array
      const byteCharacters = atob(res.fileData); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType || 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      window.open(blobUrl, '_blank');
    });
  }

  onUpdate(event: any, pdf: AttachmentModel) {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (!reservationId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.reservationId = reservationId;
      requestData.id = pdf.id;
      this.attachmentService.update(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.viewDialog = false;
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file);
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }
  onDelete(pdf: AttachmentModel) {
    const originalAttachments = [...(this.reservation?.attachments || [])];
    if (this.reservation?.attachments) {
      this.reservation.attachments = this.reservation.attachments.filter(
        (a) => a.id !== pdf.id
      );
    }
    this.attachmentService.delete(pdf.id).subscribe({
      next: (res) => {
        this.messageService.clear();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
          detail: this.translate.instant('RESERVATION.FILE_DELETED_SUCCESS') || 'تم حذف الملف بنجاح ✅',
        });
      },
      error: (err) => {
        console.error(err);
        if (this.reservation) {
          this.reservation.attachments = originalAttachments;
        }
        this.messageService.clear();
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: this.translate.instant('RESERVATION.FILE_DELETE_FAILED') || 'فشل حذف الملف ❌',
        });
      },
    });
  }
  onFileSelected(event: any) {
    const reservationId = this.route.snapshot.paramMap.get('id');
    if (!reservationId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.clear();
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR') || 'تنبيه',
        detail: this.translate.instant('RESERVATION.UNSUPPORTED_FILE_TYPE') || 'نوع الملف غير مدعوم ⚠️',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.reservationId = reservationId;
      this.attachmentService.create(requestData).subscribe({
        next: (res) => {
          this.messageService.clear();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
            detail: this.translate.instant('RESERVATION.FILE_UPLOADED_SUCCESS') || 'تم رفع الملف بنجاح ✅',
          });
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.clear();
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.translate.instant('RESERVATION.FILE_UPLOAD_FAILED') || 'فشل رفع الملف ❌',
          });
        },
      });
    };
    reader.readAsDataURL(file); // Convert file to base64
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }

  printDocument() {
    console.log('print');
    this.reservationService.printDocument(this.reservationId);
  }
  downloadDocument() {
    console.log('download');
    this.reservationService.downloadDocument(this.reservationId);
  }

  printCostSheet() {
    console.log('print');
    this.reservationService.printCostSheet(this.reservationId);
  }
  downloadCostSheet() {
    console.log('download');
    this.reservationService.downloadCostSheet(this.reservationId);
  }

  printHotelRequest() {
    console.log('print');
    this.reservationService.printHotelRequest(this.reservationId);
  }
  downloadHotelRequest() {
    console.log('download');
    this.reservationService.downloadHotelRequest(this.reservationId);
  }

  private buildActionMenus(): void {
    this.printMenuItems = [
      {
        label: this.translate.instant('DATA.PRINT_CONFIRMATION'),
        command: () => this.printDocument(),
      },
      {
        label: this.translate.instant('DATA.PRINT_COSTSHEET'),
        command: () => this.printCostSheet(),
      },
      {
        label: this.translate.instant('DATA.PRINT_HOTELREQUEST'),
        command: () => this.printHotelRequest(),
      },
    ];

    this.downloadMenuItems = [
      {
        label: this.translate.instant('DATA.DOWNLOAD_CONFIRMATION'),
        command: () => this.downloadDocument(),
      },
      {
        label: this.translate.instant('DATA.DOWNLOAD_COSTSHEET'),
        command: () => this.downloadCostSheet(),
      },
      {
        label: this.translate.instant('DATA.DOWNLOAD_HOTELREQUEST'),
        command: () => this.downloadHotelRequest(),
      },
    ];
  }

  monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  get monthsList() {
    return this.activeLanguage === 'en' ? this.monthsEn : this.monthsAr;
  }

  onMonthSelect(monthVal: string, cal: any) {
    const month = parseInt(monthVal, 10);
    cal.currentMonth = month;
    cal.createMonths(cal.currentMonth, cal.currentYear);
  }

  onYearInput(yearVal: string, cal: any) {
    const year = parseInt(yearVal, 10);
    if (year > 1900 && year < 2100) {
      cal.currentYear = year;
      cal.createMonths(cal.currentMonth, cal.currentYear);
    }
  }

  onReferenceNumberSearch(value: string) {
    if (!value || value.trim() === '') return;
    
    const refNum = value.trim();
    
    // If it's already the current one, do nothing
    if (this.reservation && this.reservation.referenceNumber === refNum) {
      return;
    }
    
    this.loading = true;
    this.reservationService.getPage(1, 1, 'createdAt', -1, null, 'referenceNumber', refNum).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.data && res.data.length > 0) {
          const matchedReservation = res.data[0];
          const targetPath = this.isFrontal 
            ? ['/reservations/frontal', matchedReservation.id]
            : ['/reservations', matchedReservation.id];
          this.router.navigate(targetPath);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.activeLanguage === 'en' 
              ? `Reservation ${refNum} not found` 
              : `رقم الحجز ${refNum} غير موجود`,
            life: 4000
          });
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error searching reservation by reference number:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: this.activeLanguage === 'en' 
            ? 'Error searching reservation' 
            : 'حدث خطأ أثناء البحث عن الحجز',
          life: 4000
        });
      }
    });
  }
}


