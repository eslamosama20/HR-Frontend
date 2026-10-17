import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, FormArray, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { GalleriaModule } from 'primeng/galleria';
import { environment } from 'src/environments/environment';
import { ReservationService } from '../../services/reservations/reservation.service';
import { HotelService } from '../../services/hotels/hotel.service';
import { PublicHotelService } from '../../services/public-booking/public-hotel.service';
import { PublicRoomTypeService } from '../../services/public-booking/public-room-type.service';
import { ReservationSeasonService } from '../../services/reservations/reservation-season.service';
import { ReservationCompanyService } from '../../services/reservations/reservation-company.service';
import { RoomTypeService } from '../../services/room-type/room-type.service';
import { ReservationMealService } from '../../services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from '../../services/reservations/reservation-view.service';
import { ReservationServiceService } from '../../services/reservations/reservation-service.service';
import { ReservationSupplierService } from '../../services/ReservationSupplier/reservation-supplier.service';
import { SalesRepresentativeService } from '../../services/sales-representative/sales-representative.service';
import { CompanyDetailsService } from '../../services/inventory/company-details.service';
import { ReservationModel } from '../../models/accounting/reservation-model';
import { ReservationRoomEntryModel } from '../../models/accounting/reservation-room-entry-model';
import { ReservationServiceEntryModel } from '../../models/accounting/reservation-service-entry-model';
import { HotelModel } from '../../models/accounting/hotel-model';
import { PublicHotelModel } from '../../models/public-booking/public-hotel.model';
import { PublicRoomTypeModel } from '../../models/public-booking/public-room-type.model';
import { PublicHotelPaidServiceModel } from '../../models/public-booking/public-paid-service.model';
import { ReservationSeason } from '../../models/accounting/reservation-season';
import { ReservationCompany } from '../../models/accounting/reservation-company';
import { RoomTypeModel } from '../../models/accounting/room-type-model';
import { ReservationMealModel } from '../../models/accounting/reservation-meal-model';
import { ReservationView } from '../../models/accounting/reservation-view';
import { ReservationServiceModel } from '../../models/accounting/reservation-service-model';
import { nationalities } from '../../utils/nationality-data';
import { PaymobService } from '../../services/paymob/paymob.service';
import { formatDateOnlyToString } from '../../utils/dateUtils';

@Component({
  selector: 'app-public-booking-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    CalendarModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    GalleriaModule
  ],
  templateUrl: './public-booking-form.component.html',
  styleUrls: ['./public-booking-form.component.scss']
})
export class PublicBookingFormComponent implements OnInit {
  submitting = signal(false);
  success = signal<boolean | null>(null);
  loading = signal(false);
  showCheckoutForm = signal(false); // Toggle between landing page and checkout form
  activeLanguage: string = 'en'; // Track active language for translations

  form: FormGroup;
  minDate: string;
  minDepartureDate: string;
  minDateObj: Date;
  minDepartureDateObj: Date | null = null;
  private updatingDates = false;
  private nightsDebounceHandle: any;

  // Data arrays for dropdowns
  hotels: HotelModel[] = [];
  publicHotels: PublicHotelModel[] = [];
  publicRoomTypes: PublicRoomTypeModel[] = [];
  // Combined hotels for dropdown (merged from both sources)
  allHotels: Array<{id: string; name: string; isPublic: boolean}> = [];
  seasons: ReservationSeason[] = [];
  companies: ReservationCompany[] = [];
  roomTypes: RoomTypeModel[] = [];
  // Combined room types (filtered by selected hotel)
  filteredRoomTypes: Array<{
    id: string; 
    name: string; 
    nameAr: string; 
    maxGuests: number; 
    numberOfBeds: number; 
    basePrice: number; 
    viewType?: string; 
    viewPrice?: number; 
    municipalityTaxPercentage?: number;
    isPublic: boolean; 
    logo?: string; 
    availableQuantity?: number; 
    mainImageUrl?: string;
    mainImagePublicId?: string;
    additionalImageUrls?: string;
    cancellationPolicy?: string;
    cancellationPolicyAr?: string;
    payAtHotel?: boolean;
    payNow?: boolean;
  }> = [];
  meals: ReservationMealModel[] = [];
  views: ReservationView[] = [];
  availableServices: ReservationServiceModel[] = [];
  suppliers: any[] = [];
  salesRepresentatives: any[] = [];
  bankAccountOptions: any[] = [];
  companyPhoneOptions: any[] = [];
  companyPolicyOptions: any[] = [];
  companyDetails: any = null;

  // Shopping cart state using signals
  selectedRoomTypes = signal<{ 
    id: string; 
    roomType: RoomTypeModel; 
    quantity: number; 
    mealId?: string; 
    viewId?: string; 
  }[]>([]);
  
  selectedServices = signal<{ 
    id: string; 
    service: ReservationServiceModel; 
    quantity: number; 
    description?: string; 
  }[]>([]);

  // Paid services (for public booking)
  selectedPaidServices = signal<{
    hotelPaidServiceId: string;
    serviceId: string;
    serviceName: string;
    serviceNameAr: string;
    price: number;
    quantity: number;
  }[]>([]);

  // Full screen image viewer
  fullScreenImage = signal<string | null>(null);
  fullScreenImageVisible = signal(false);

  nationalities = nationalities.map(n => ({
    label: `${n.arabicName} - ${n.englishName}`,
    value: n.arabicName
  }));

  private http = inject(HttpClient);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private publicHotelService: PublicHotelService,
    private publicRoomTypeService: PublicRoomTypeService,
    private seasonService: ReservationSeasonService,
    private companyService: ReservationCompanyService,
    private roomTypeService: RoomTypeService,
    private mealService: ReservationMealService,
    private viewService: ReservationViewService,
    private serviceService: ReservationServiceService,
    private supplierService: ReservationSupplierService,
    private salesRepresentativeService: SalesRepresentativeService,
    private companyDetailsService: CompanyDetailsService,
    private paymobService: PaymobService
  ) {
    this.form = this.fb.group({
      guestName: ['', Validators.required],
      guestPhone: [''],
      guestEmail: ['', [Validators.email]],
      nationality: ['', Validators.required],
      numberOfAdults: [1, [Validators.required, Validators.min(1)]],
      numberOfChildren: [0, [Validators.min(0)]],
      dateRange: [null as Date[] | null],
      arrivalDate: [null, [Validators.required, this.dateValidator]],
      departureDate: [null, [Validators.required, this.dateValidator]],
      numberOfNights: [null, [Validators.required, Validators.min(1)]],
      reservationCompanyId: [null],
      salesRepresentativeId: [null],
      reservationClientCompanyId: [null],
      hotelId: [null, Validators.required],
      reservationSeasonId: [null],
      reservationType: ['HotelDirect'],
      bankAccountId: [null],
      companyPhoneId: [null],
      companyPolicyId: [null],
      reservationRoomEntries: this.fb.array([]),
      reservationServiceEntries: this.fb.array([]),
    });

    // Set minimum date to today
  const today = new Date();
  this.minDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  this.minDate = this.formatDate(today);
    
    // Initialize with empty arrays for shopping cart style
    this.setupDateListeners();
    
    // Listen to hotel selection changes
    this.form.get('hotelId')?.valueChanges.subscribe(hotelId => {
      this.filterRoomTypesByHotel(hotelId);
      this.loadHotelPaidServices(hotelId);
    });
  }

  ngOnInit(): void {
    // Load data first, THEN handle query params after data is loaded
    this.loadInitialData();
    // handleQueryParams is now called inside loadInitialData after data loads
  }

  private handleQueryParams(): void {
    console.log('🎬 handleQueryParams started - Data available:', {
      publicHotels: this.publicHotels.length,
      publicRoomTypes: this.publicRoomTypes.length,
      allHotels: this.allHotels.length
    });
    
    this.route.queryParams.subscribe(params => {
      console.log('🔍 Query parameters received:', params);
      
      // Check if we should show checkout form immediately
      if (params['showCheckout'] === 'true') {
        this.showCheckoutForm.set(true);
        console.log('✅ Showing checkout form immediately');
      }
      
      // Set hotel if provided
      if (params['hotelId']) {
        this.form.get('hotelId')?.setValue(params['hotelId']);
        console.log('✅ Hotel ID set:', params['hotelId']);
        
        // Filter room types for this hotel immediately
        this.filterRoomTypesByHotel(params['hotelId']);
      }
      
      // Set dates if provided
      if (params['checkIn'] && params['checkOut']) {
        const checkInDate = new Date(params['checkIn']);
        const checkOutDate = new Date(params['checkOut']);
        this.form.get('arrivalDate')?.setValue(checkInDate);
        this.form.get('departureDate')?.setValue(checkOutDate);
        this.form.get('dateRange')?.setValue([checkInDate, checkOutDate]);
        
        // Calculate number of nights
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        this.form.get('numberOfNights')?.setValue(nights);
        
        console.log('✅ Dates set:', checkInDate, checkOutDate, 'Nights:', nights);
      }
      
      // Set guests if provided
      if (params['guests']) {
        const guests = parseInt(params['guests'], 10);
        this.form.get('numberOfAdults')?.setValue(guests);
        console.log('✅ Guests set:', guests);
      }
      
      // Set room type and payment option if provided
      if (params['roomTypeId']) {
        // Wait for initial data to load, then auto-select the room
        // Use a longer timeout to ensure all data is loaded
        setTimeout(() => {
          console.log('⏰ Attempting to auto-select room after delay...');
          this.autoSelectRoomFromParams(params);
        }, 2000); // Increased timeout to 2 seconds
      }
    });
  }

  private autoSelectRoomFromParams(params: any): void {
    const roomTypeId = params['roomTypeId'];
    const paymentOption = params['paymentOption'];
    const numberOfRooms = params['rooms'] ? parseInt(params['rooms'], 10) : 1;
    
    const selectedHotel = this.getSelectedHotel();
    const hotelName = selectedHotel && 'name' in selectedHotel 
      ? selectedHotel.name 
      : selectedHotel && 'arabicName' in selectedHotel 
        ? selectedHotel.arabicName 
        : 'Unknown';
    
    console.log('🎯 Auto-selecting room:', { 
      roomTypeId, 
      paymentOption, 
      numberOfRooms,
      availableRooms: this.filteredRoomTypes.length,
      selectedHotel: hotelName
    });
    
    if (this.filteredRoomTypes.length === 0) {
      console.warn('⚠️ No room types available. Hotel ID:', this.form.get('hotelId')?.value);
      console.warn('⚠️ All public room types:', this.publicRoomTypes.length);
      return;
    }
    
    // Find the room type in filteredRoomTypes (PublicRoomType)
    const publicRoomType = this.filteredRoomTypes.find(rt => rt.id === roomTypeId);
    if (!publicRoomType) {
      console.warn('⚠️ Room type not found:', roomTypeId);
      console.warn('⚠️ Available room types:', this.filteredRoomTypes.map(rt => ({ id: rt.id, name: rt.nameAr })));
      return;
    }
    
    console.log('✅ Found room type:', publicRoomType.nameAr || publicRoomType.name);
    
    // Add room to selection using toggleRoomType
    // Note: toggleRoomType adds one room at a time, so call it multiple times
    for (let i = 0; i < numberOfRooms; i++) {
      this.toggleRoomType(publicRoomType);
      console.log(`✅ Added room ${i + 1}/${numberOfRooms}`);
    }
    
    console.log('✅ Room auto-selected successfully. Selected rooms:', this.selectedRoomTypes().length);
    
    // Scroll to guest information section
    setTimeout(() => {
      const guestInfoSection = document.querySelector('.guest-information-section');
      if (guestInfoSection) {
        guestInfoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // If section not found, just scroll to top
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 500);
  }

  private loadInitialData(): void {
    this.loading.set(true);
    console.log('🔄 Loading initial data...');
    
    // Load only PUBLIC data - skip ERP entities that have DB schema issues
    forkJoin({
      publicHotels: this.publicHotelService.getAllWithFilters({ isActive: true }),
      publicRoomTypes: this.publicRoomTypeService.getAllWithFilters({ isActive: true }),
      companyDetails: this.companyDetailsService.getAll()
    }).subscribe({
      next: (data) => {
        console.log('📊 Raw API Data received:', {
          publicHotels: data.publicHotels?.length || 0,
          publicRoomTypes: data.publicRoomTypes?.length || 0,
          companyDetails: data.companyDetails?.length || 0
        });
        
        // Load ONLY public hotels (ignore ERP hotels due to DB issues)
        this.hotels = []; // Empty - not using ERP hotels
        this.publicHotels = data.publicHotels || [];
        this.publicRoomTypes = data.publicRoomTypes || [];
        
        console.log('✅ Data assigned to component:', {
          publicHotelsCount: this.publicHotels.length,
          publicRoomTypesCount: this.publicRoomTypes.length,
          publicHotels: this.publicHotels.map(h => ({ id: h.id, name: h.name })),
          publicRoomTypes: this.publicRoomTypes.map(rt => ({ 
            id: rt.id, 
            name: rt.nameAr, 
            hotelId: rt.hotelId 
          }))
        });
        
        // Merge hotels from both sources
        this.mergeHotels();
        
        // Set empty arrays for unused ERP data (DB schema issues)
        this.seasons = [];
        this.companies = [];
        this.salesRepresentatives = [];
        this.roomTypes = [];
        this.meals = [];
        this.views = [];
        this.availableServices = [];
        this.suppliers = [];
        
        console.log('✅ Loaded Data:', {
          publicHotelsCount: this.publicHotels.length,
          publicRoomTypesCount: this.publicRoomTypes.length
        });

        if (data.companyDetails && data.companyDetails.length > 0) {
          const company = data.companyDetails[0];
          this.companyDetails = company; // Store company details for display
          this.bankAccountOptions = company.bankAccounts.map(x => ({ label: `${x.bankName} - ${x.bankAccountNumber}`, value: x.id, isPrimary: x.isPrimary }));
          this.companyPhoneOptions = company.phones.map(x => ({ label: x.phoneNumber, value: x.id, isPrimary: x.isPrimary }));
          this.companyPolicyOptions = company.policies.map(x => ({ label: x.policyParagraph, value: x.id, isPrimary: x.isPrimary }));
          
          // Set primary defaults as in reservation component
          const primaryBank = this.bankAccountOptions.find(x => x.isPrimary);
          if (primaryBank) this.form.get('bankAccountId')?.setValue(primaryBank.value);
          const primaryPhone = this.companyPhoneOptions.find(x => x.isPrimary);
          if (primaryPhone) this.form.get('companyPhoneId')?.setValue(primaryPhone.value);
          const primaryPolicy = this.companyPolicyOptions.find(x => x.isPrimary);
          if (primaryPolicy) this.form.get('companyPolicyId')?.setValue(primaryPolicy.value);
        }
        this.loading.set(false);
        
        // NOW handle query params after data is fully loaded
        console.log('✅ Data loaded, now handling query params...');
        this.handleQueryParams();
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.loading.set(false);
      }
    });
  }

  private setupDateListeners(): void {
    // Listen to date range changes
    this.form.get('dateRange')?.valueChanges.subscribe((dates: Date[] | null) => {
      if (dates && dates.length === 2 && dates[0] && dates[1]) {
        this.updatingDates = true;
        const arrival = dates[0];
        const departure = dates[1];
        const nights = this.dayDiff(arrival, departure);
        
        this.form.patchValue({
          arrivalDate: arrival,
          departureDate: departure,
          numberOfNights: nights > 0 ? nights : 1
        }, { emitEvent: false });
        
        this.updatingDates = false;
      }
    });
    this.form.get('arrivalDate')?.valueChanges.subscribe(() => this.recomputeFrom('arrival'));
    this.form.get('departureDate')?.valueChanges.subscribe(() => this.recomputeFrom('departure'));
    const nightsCtrl = this.form.get('numberOfNights');
    nightsCtrl?.valueChanges.subscribe(val => {
      if (this.updatingDates) return;
      if (this.nightsDebounceHandle) clearTimeout(this.nightsDebounceHandle);
      // Debounce to allow multi-digit typing
      this.nightsDebounceHandle = setTimeout(() => {
        const n = Number(val);
        if (!isNaN(n) && n > 0) {
          this.recomputeFrom('nights');
        }
      }, 400);
    });
    this.form.get('reservationType')?.valueChanges.subscribe(value => {
      const companyControl = this.form.get('reservationCompanyId');
      if (value === 'AgentDirect') {
        companyControl?.setValidators(Validators.required);
      } else {
        companyControl?.clearValidators();
      }
      companyControl?.updateValueAndValidity();
    });
  }

  private addDays(base: Date, days: number): Date {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  private dayDiff(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / 86400000);
  }

  recomputeFrom(source: 'arrival' | 'departure' | 'nights'): void {
    if (this.updatingDates) return;
    this.updatingDates = true;

    const today = new Date(); today.setHours(0,0,0,0);
    const arrivalCtrl = this.form.get('arrivalDate');
    const departureCtrl = this.form.get('departureDate');
    const nightsCtrl = this.form.get('numberOfNights');

    let arrival = this.coerceToDate(arrivalCtrl?.value);
    let departure = this.coerceToDate(departureCtrl?.value);
    let nightsRaw = nightsCtrl?.value;
    let nights = nightsRaw && nightsRaw > 0 ? Number(nightsRaw) : null;

    // Normalize arrival not before today
    if (arrival && arrival < today) {
      arrival = today;
      arrivalCtrl?.setValue(arrival, { emitEvent: false });
    }

    // Rule priority based on source
    switch (source) {
      case 'arrival':
        if (arrival && nights && (!departure || source === 'arrival')) {
          departure = this.addDays(arrival, nights);
          departureCtrl?.setValue(departure, { emitEvent: false });
        }
        if (arrival && departure) {
          if (departure <= arrival) {
            departure = null;
            departureCtrl?.setValue(null, { emitEvent: false });
            nightsCtrl?.setValue(null, { emitEvent: false });
          } else {
            const diff = this.dayDiff(arrival, departure);
            if (nights !== diff) {
              nights = diff;
              nightsCtrl?.setValue(diff, { emitEvent: false });
            }
          }
        }
        break;
      case 'departure':
        if (arrival && departure) {
          if (departure <= arrival) {
            // invalid, clear departure & nights
            departureCtrl?.setValue(null, { emitEvent: false });
            nightsCtrl?.setValue(null, { emitEvent: false });
            departure = null; nights = null;
          } else {
            const diff = this.dayDiff(arrival, departure);
            if (nights !== diff) {
              nights = diff;
              nightsCtrl?.setValue(diff, { emitEvent: false });
            }
          }
        } else if (departure && nights && !arrival) {
          // derive arrival
            const possibleArrival = this.addDays(departure, -nights);
            if (possibleArrival >= today) {
              arrival = possibleArrival;
              arrivalCtrl?.setValue(arrival, { emitEvent: false });
            } else {
              arrival = today;
              arrivalCtrl?.setValue(arrival, { emitEvent: false });
              departure = this.addDays(arrival, nights);
              departureCtrl?.setValue(departure, { emitEvent: false });
            }
        } else if (departure && arrival && !nights) {
          const diff = this.dayDiff(arrival, departure);
          nightsCtrl?.setValue(diff, { emitEvent: false });
        }
        break;
      case 'nights':
        if (!nights || nights < 1) {
          nightsCtrl?.setValue(null, { emitEvent: false });
          break;
        }
        if (arrival && departure) {
          // Adjust departure keeping arrival fixed
          departure = this.addDays(arrival, nights);
          departureCtrl?.setValue(departure, { emitEvent: false });
        } else if (arrival && !departure) {
          departure = this.addDays(arrival, nights);
          departureCtrl?.setValue(departure, { emitEvent: false });
        } else if (departure && !arrival) {
          const newArrival = this.addDays(departure, -nights);
          if (newArrival >= today) {
            arrival = newArrival;
            arrivalCtrl?.setValue(arrival, { emitEvent: false });
          } else {
            arrival = today;
            arrivalCtrl?.setValue(arrival, { emitEvent: false });
            departure = this.addDays(arrival, nights);
            departureCtrl?.setValue(departure, { emitEvent: false });
          }
        }
        break;
    }

    // Update min departure date based on (possibly) new arrival
    arrival = this.coerceToDate(arrivalCtrl?.value);
    if (arrival) {
      const minDep = this.addDays(arrival, 1);
      this.minDepartureDate = this.formatDate(minDep);
      this.minDepartureDateObj = minDep;
      departure = this.coerceToDate(departureCtrl?.value);
      if (departure && departure <= arrival) {
        departureCtrl?.setValue(null, { emitEvent: false });
        nightsCtrl?.setValue(null, { emitEvent: false });
      }
    }

    this.updatingDates = false;
  }

  // Backwards compatibility for template calls if any remain
  onCalendarSelect(): void {
    this.recomputeFrom('arrival');
  }

  private parseDisplayDate(value: string): Date | null { // kept for backward compatibility if needed
    if (!value || typeof value !== 'string') return null;
    const match = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(value.trim());
    if (!match) return null;
    const dd = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    const yyyy = parseInt(match[3], 10);
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return d;
  }

  private coerceToDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    return this.parseDisplayDate(val);
  }

  private formatBackendDate(date: Date | null): string | null {
    if (!date) return null;
    return formatDateOnlyToString(date);
  }

  private dateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null; // required handled separately
    if (control.value instanceof Date) return null;
    return this.parseDisplayDate(control.value) ? null : { dateFormat: true };
  };

  private formatDate(date: Date): string {
    return formatDateOnlyToString(date);
  }

  get rooms() { return this.form.get('reservationRoomEntries') as FormArray; }
  get services() { return this.form.get('reservationServiceEntries') as FormArray; }

  addRoom(): void {
    const room = this.fb.group({
      roomTypeId: [null, Validators.required],
      numberOfRooms: [1, Validators.required],
      roomRate: [0, Validators.required],
      roomCost: [0],
      reservationMealId: [null],
      mealRate: [0],
      mealCost: [0],
      reservationViewId: [null],
      viewRate: [0],
      viewCost: [0],
    });

    this.rooms.push(room);
  }

  removeRoom(index: number): void {
    if (this.rooms.length > 1) {
      this.rooms.removeAt(index);
    }
  }

  // Legacy methods kept for form compatibility but not used in shopping cart mode
  addService(): void {
    const service = this.fb.group({
      reservationServiceId: [null, Validators.required],
      description: [''],
      quantity: [1, Validators.required],
      salesPrice: [0, Validators.required],
      costPrice: [0],
      reservationSupplierId: [null, Validators.required],
    });

    this.services.push(service);
  }

  // Shopping cart methods for room types
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  trackByRoomTypeId(index: number, roomType: RoomTypeModel): string {
    return roomType.id;
  }

  trackBySelectedRoomId(index: number, selectedRoom: { id: string; roomType: RoomTypeModel; quantity: number; mealId?: string; viewId?: string; }): string {
    return selectedRoom.id;
  }

  isRoomTypeSelected(roomTypeId: string): boolean {
    return this.selectedRoomTypes().some(item => item.roomType.id === roomTypeId);
  }

  getRoomTypeQuantity(roomTypeId: string): number {
    return this.selectedRoomTypes().filter(item => item.roomType.id === roomTypeId).length;
  }

  // Calculate room price per night including paid services
  getRoomPriceWithServices(roomType: any): number {
    const basePrice = roomType.basePrice || 0;
    const viewPrice = roomType.viewPrice || 0;
    const municipalityTax = (roomType.municipalityTaxPercentage || 0) / 100;
    
    // Calculate base price with municipality tax
    const priceWithMunicipalityTax = (basePrice + viewPrice) * (1 + municipalityTax);
    
    // Add paid services total
    const paidServicesTotal = this.getPaidServicesTotal();
    
    return priceWithMunicipalityTax + paidServicesTotal;
  }

  getSelectedRoomTypes(): { id: string; roomType: RoomTypeModel; quantity: number; mealId?: string; viewId?: string; }[] {
    return this.selectedRoomTypes();
  }

  toggleRoomType(roomType: any): void {
    // Check available quantity before adding
    if (roomType.availableQuantity !== undefined && roomType.availableQuantity === 0) {
      alert('Sorry, this room type is not available. | عذراً، هذا النوع من الغرف غير متاح.');
      return;
    }

    const currentSelections = this.selectedRoomTypes();
    
    // Check if this room type is already selected
    const existingEntry = currentSelections.find(item => item.roomType.id === roomType.id);
    
    if (existingEntry) {
      // If already selected, increment the quantity instead of adding new entry
      const totalSelectedOfThisType = currentSelections
        .filter(item => item.roomType.id === roomType.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      // Check if we can add one more
      if (roomType.availableQuantity !== undefined && totalSelectedOfThisType >= roomType.availableQuantity) {
        alert(`Maximum available quantity for this room is ${roomType.availableQuantity}. | الحد الأقصى المتاح لهذه الغرفة هو ${roomType.availableQuantity}.`);
        return;
      }
      
      // Increment the quantity of the existing entry
      existingEntry.quantity += 1;
      this.selectedRoomTypes.set([...currentSelections]);
      this.updateFormArrays();
      return;
    }

    // If not selected yet, add new entry
    // Check if we've reached the available quantity limit
    const totalSelectedOfThisType = currentSelections
      .filter(item => item.roomType.id === roomType.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    if (roomType.availableQuantity !== undefined && totalSelectedOfThisType >= roomType.availableQuantity) {
      alert(`Maximum available quantity for this room is ${roomType.availableQuantity}. | الحد الأقصى المتاح لهذه الغرفة هو ${roomType.availableQuantity}.`);
      return;
    }

    // Convert filtered room type to RoomTypeModel-like structure
    const roomTypeModel: any = {
      id: roomType.id,
      englishName: roomType.name,
      arabicName: roomType.nameAr,
      personNo: roomType.maxGuests,
      logo: roomType.logoUrl,
      isActive: true,
      availableQuantity: roomType.availableQuantity
    };
    
    // Add a new entry
    const newId = this.generateUniqueId();
    this.selectedRoomTypes.set([
      ...currentSelections,
      { 
        id: newId, 
        roomType: roomTypeModel, 
        quantity: 1 
      }
    ]);
    
    this.updateFormArrays();
  }

  incrementRoomQuantity(roomEntryId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const selected = currentSelections.find(item => item.id === roomEntryId);
    if (!selected) return;

    // Check available quantity limit
    const roomType = selected.roomType;
    if (roomType.availableQuantity !== undefined) {
      const totalSelectedOfThisType = currentSelections
        .filter(item => item.roomType.id === roomType.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      if (totalSelectedOfThisType >= roomType.availableQuantity) {
        alert(`Maximum available quantity for this room is ${roomType.availableQuantity}. | الحد الأقصى المتاح لهذه الغرفة هو ${roomType.availableQuantity}.`);
        return;
      }
    }

    if (selected.quantity < 10) {
      selected.quantity++;
      this.selectedRoomTypes.set([...currentSelections]);
      this.updateFormArrays();
    }
  }

  decrementRoomQuantity(roomEntryId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const selected = currentSelections.find(item => item.id === roomEntryId);
    if (selected) {
      if (selected.quantity > 1) {
        selected.quantity--;
        this.selectedRoomTypes.set([...currentSelections]);
      } else {
        // Remove if quantity would go to 0
        this.removeRoomEntry(roomEntryId);
        return;
      }
      this.updateFormArrays();
    }
  }

  removeRoomType(roomTypeId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const index = currentSelections.findIndex(item => item.roomType.id === roomTypeId);
    if (index >= 0) {
      const newSelections = [...currentSelections];
      newSelections.splice(index, 1);
      this.selectedRoomTypes.set(newSelections);
      this.updateFormArrays();
    }
  }

  // Remove specific room entry by unique ID
  removeRoomEntry(entryId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const index = currentSelections.findIndex(item => item.id === entryId);
    if (index >= 0) {
      const newSelections = [...currentSelections];
      newSelections.splice(index, 1);
      this.selectedRoomTypes.set(newSelections);
      this.updateFormArrays();
    }
  }

  // Shopping cart methods for services
  trackByServiceId(index: number, service: ReservationServiceModel): string {
    return service.id;
  }

  trackBySelectedServiceId(index: number, selectedService: { id: string; service: ReservationServiceModel; quantity: number; description?: string; }): string {
    return selectedService.id;
  }

  isServiceSelected(serviceId: string): boolean {
    return this.selectedServices().some(item => item.service.id === serviceId);
  }

  getServiceQuantity(serviceId: string): number {
    return this.selectedServices().filter(item => item.service.id === serviceId).length;
  }

  getSelectedServices(): { id: string; service: ReservationServiceModel; quantity: number; description?: string; }[] {
    return this.selectedServices();
  }

  toggleService(service: ReservationServiceModel): void {
    // Always add a new entry (allowing multiple of same type)
    const newId = this.generateUniqueId();
    const currentSelections = this.selectedServices();
    this.selectedServices.set([
      ...currentSelections,
      { 
        id: newId, 
        service, 
        quantity: 1,
        description: ''
      }
    ]);
    
    this.updateFormArrays();
  }

  incrementServiceQuantity(serviceEntryId: string): void {
    const currentSelections = this.selectedServices();
    const selected = currentSelections.find(item => item.id === serviceEntryId);
    if (selected && selected.quantity < 10) {
      selected.quantity++;
      this.selectedServices.set([...currentSelections]);
      this.updateFormArrays();
    }
  }

  decrementServiceQuantity(serviceEntryId: string): void {
    const currentSelections = this.selectedServices();
    const selected = currentSelections.find(item => item.id === serviceEntryId);
    if (selected) {
      if (selected.quantity > 1) {
        selected.quantity--;
        this.selectedServices.set([...currentSelections]);
      } else {
        // Remove if quantity would go to 0
        this.removeServiceEntry(serviceEntryId);
        return;
      }
      this.updateFormArrays();
    }
  }

  removeService(serviceId: string): void {
    const currentSelections = this.selectedServices();
    const index = currentSelections.findIndex(item => item.service.id === serviceId);
    if (index >= 0) {
      const newSelections = [...currentSelections];
      newSelections.splice(index, 1);
      this.selectedServices.set(newSelections);
      this.updateFormArrays();
    }
  }

  // Remove specific service entry by unique ID
  removeServiceEntry(entryId: string): void {
    const currentSelections = this.selectedServices();
    const index = currentSelections.findIndex(item => item.id === entryId);
    if (index >= 0) {
      const newSelections = [...currentSelections];
      newSelections.splice(index, 1);
      this.selectedServices.set(newSelections);
      this.updateFormArrays();
    }
  }

  // Calculate dynamic PAX like in reservation component
  getRoomPax(roomType: RoomTypeModel, numberOfRooms: number): number {
    if (!roomType || !numberOfRooms) return 0;
    return numberOfRooms * roomType.personNo;
  }

  // Get room view type from filteredRoomTypes (read-only, part of room definition)
  getRoomViewType(roomTypeId: string): string | undefined {
    const roomType = this.filteredRoomTypes.find(rt => rt.id === roomTypeId);
    return roomType?.viewType;
  }

  // Update meal selection for a room
  updateRoomMeal(roomId: string, mealId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const room = currentSelections.find(item => item.id === roomId);
    if (room) {
      room.mealId = mealId || undefined;
      this.selectedRoomTypes.set([...currentSelections]);
      this.updateFormArrays();
    }
  }

  // Update view selection for a room
  updateRoomView(roomId: string, viewId: string): void {
    const currentSelections = this.selectedRoomTypes();
    const room = currentSelections.find(item => item.id === roomId);
    if (room) {
      room.viewId = viewId || undefined;
      this.selectedRoomTypes.set([...currentSelections]);
      this.updateFormArrays();
    }
  }

  // Update description for a service
  updateServiceDescription(serviceId: string, description: string): void {
    const currentSelections = this.selectedServices();
    const service = currentSelections.find(item => item.id === serviceId);
    if (service) {
      service.description = description;
      this.selectedServices.set([...currentSelections]);
      this.updateFormArrays();
    }
  }

  // Update form arrays based on shopping cart selections
  updateFormArrays(): void {
    // Clear existing form arrays
    while (this.rooms.length !== 0) {
      this.rooms.removeAt(0);
    }
    while (this.services.length !== 0) {
      this.services.removeAt(0);
    }

    // Add rooms based on selections
    this.selectedRoomTypes().forEach(selectedRoom => {
      const room = this.fb.group({
        roomTypeId: [selectedRoom.roomType.id, Validators.required],
        numberOfRooms: [selectedRoom.quantity, Validators.required],
        roomRate: [1, Validators.required], // Hidden, set to 1
        roomCost: [1], // Hidden, set to 1
        reservationMealId: [selectedRoom.mealId || null],
        mealRate: [0],
        mealCost: [0],
        reservationViewId: [selectedRoom.viewId || null],
        viewRate: [0],
        viewCost: [0],
      });
      this.rooms.push(room);
    });

    // Add services based on selections
    this.selectedServices().forEach(selectedService => {
      const service = this.fb.group({
        reservationServiceId: [selectedService.service.id, Validators.required],
        description: [selectedService.description || ''],
        quantity: [selectedService.quantity, Validators.required],
        salesPrice: [1, Validators.required], // Hidden, set to 1
        costPrice: [1], // Hidden, set to 1
        reservationSupplierId: [this.suppliers.length > 0 ? this.suppliers[0].id : null, Validators.required], // Default to first supplier
      });
      this.services.push(service);
    });
  }

  // Landing page methods for Booking.com-style interface
  selectHotel(hotelId: string | null | undefined): void {
    if (hotelId) {
      this.form.get('hotelId')?.setValue(hotelId);
      
      // Set default dates if not set (today + 1 day)
      if (!this.form.get('arrivalDate')?.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.form.get('arrivalDate')?.setValue(tomorrow);
      }
      
      if (!this.form.get('departureDate')?.value) {
        const arrivalDate = this.form.get('arrivalDate')?.value || new Date();
        const departure = new Date(arrivalDate);
        departure.setDate(departure.getDate() + 1);
        this.form.get('departureDate')?.setValue(departure);
        this.form.get('numberOfNights')?.setValue(1);
      }
      
      // Filter room types for the selected hotel
      this.filterRoomTypesByHotel(hotelId);
      
      console.log('🏨 Hotel selected:', {
        hotelId,
        publicRoomTypes: this.publicRoomTypes,
        filteredRoomTypes: this.filteredRoomTypes
      });
      
      // Navigate to checkout page to show hotel details and rooms
      this.showCheckoutForm.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectPublicHotel(hotelId: string | null | undefined): void {
    if (hotelId) {
      this.form.get('hotelId')?.setValue(hotelId);
      
      // Set default dates if not set (today + 1 day)
      if (!this.form.get('arrivalDate')?.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.form.get('arrivalDate')?.setValue(tomorrow);
      }
      
      if (!this.form.get('departureDate')?.value) {
        const arrivalDate = this.form.get('arrivalDate')?.value || new Date();
        const departure = new Date(arrivalDate);
        departure.setDate(departure.getDate() + 1);
        this.form.get('departureDate')?.setValue(departure);
        this.form.get('numberOfNights')?.setValue(1);
      }
      
      // Filter room types for the selected hotel
      this.filterRoomTypesByHotel(hotelId);
      
      console.log('🏨 Hotel selected:', {
        hotelId,
        publicRoomTypes: this.publicRoomTypes,
        filteredRoomTypes: this.filteredRoomTypes
      });
      
      // Navigate to checkout page to show hotel details and rooms
      this.showCheckoutForm.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getStarsArray(stars: number): number[] {
    return Array(stars || 0).fill(0);
  }

  // Get selected hotel object
  getSelectedHotel(): PublicHotelModel | HotelModel | null {
    const hotelId = this.form.get('hotelId')?.value;
    console.log('🔍 getSelectedHotel called with hotelId:', hotelId);
    console.log('📊 Available public hotels:', this.publicHotels.length);
    console.log('📊 Available ERP hotels:', this.hotels.length);
    
    if (!hotelId) {
      console.log('❌ No hotel ID in form');
      return null;
    }

    // Try to find in public hotels first
    const publicHotel = this.publicHotels.find(h => h.id === hotelId);
    if (publicHotel) {
      console.log('✅ Found public hotel:', publicHotel.name || publicHotel.nameAr);
      return publicHotel;
    }

    // Fallback to ERP hotels
    const erpHotel = this.hotels.find(h => h.id === hotelId);
    if (erpHotel) {
      console.log('✅ Found ERP hotel:', erpHotel.englishName || erpHotel.arabicName);
    } else {
      console.log('❌ Hotel not found in either list');
    }
    return erpHotel || null;
  }

  // Get selected public hotel (for template usage)
  getSelectedPublicHotel(): PublicHotelModel | null {
    const hotel = this.getSelectedHotel();
    return hotel && 'name' in hotel ? hotel as PublicHotelModel : null;
  }

  // Get selected hotel images
  getSelectedHotelImages(): any[] {
    const hotel = this.getSelectedHotel();
    if (!hotel) return [];

    // Check if it's a PublicHotelModel (has mainImageUrl property)
    if ('mainImageUrl' in hotel) {
      return this.getHotelImages(hotel as PublicHotelModel);
    }

    // For ERP hotels, check if they have logo
    if ('logo' in hotel && hotel.logo) {
      return [{
        itemImageSrc: hotel.logo,
        thumbnailImageSrc: hotel.logo,
        alt: (hotel as any).englishName || (hotel as any).arabicName || 'Hotel',
        title: (hotel as any).englishName || (hotel as any).arabicName || 'Hotel'
      }];
    }

    return [];
  }

  // Change hotel - go back to landing page
  changeHotel(): void {
    this.showCheckoutForm.set(false);
    this.form.get('hotelId')?.setValue(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Helper to get form validation errors
  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Merge hotels from PublicHotels and ERP Hotels into one array for dropdown
  private mergeHotels(): void {
    console.log('🔀 Merging hotels...');
    this.allHotels = [];
    
    // Add PublicHotels first (priority)
    this.publicHotels.forEach(hotel => {
      this.allHotels.push({
        id: hotel.id!,
        name: hotel.name || hotel.nameAr || 'Unknown Hotel',
        isPublic: true
      });
    });
    
    // Add ERP Hotels
    this.hotels.forEach(hotel => {
      this.allHotels.push({
        id: hotel.id!,
        name: hotel.englishName || hotel.arabicName || 'Unknown Hotel',
        isPublic: false
      });
    });
    
    console.log('✅ Hotels merged:', {
      totalHotels: this.allHotels.length,
      publicCount: this.publicHotels.length,
      erpCount: this.hotels.length,
      hotelsList: this.allHotels.map(h => ({ id: h.id, name: h.name, isPublic: h.isPublic }))
    });
  }

  // Filter room types based on selected hotel
  private filterRoomTypesByHotel(hotelId: string | null): void {
    console.log('🔍 Filtering room types for hotel:', hotelId);
    
    if (!hotelId) {
      this.filteredRoomTypes = [];
      console.log('❌ No hotel ID provided');
      return;
    }

    this.filteredRoomTypes = [];
    
    // Check if selected hotel is a public hotel
    const selectedHotel = this.allHotels.find(h => h.id === hotelId);
    const isPublicHotel = selectedHotel?.isPublic;
    
    console.log('🏨 Selected hotel:', {
      name: selectedHotel?.name,
      isPublic: isPublicHotel,
      totalPublicRoomTypes: this.publicRoomTypes.length,
      totalERPRoomTypes: this.roomTypes.length
    });
    
    if (isPublicHotel) {
      // Get PublicRoomTypes for this hotel
      const hotelRoomTypes = this.publicRoomTypes.filter(rt => rt.hotelId === hotelId && rt.isActive);
      
      console.log('✅ Found public room types:', hotelRoomTypes.length);
      
      hotelRoomTypes.forEach(rt => {
        console.log('  📋 Room:', rt.nameAr || rt.name, 'Available:', rt.availableQuantity);
        
        this.filteredRoomTypes.push({
          id: rt.id!,
          name: rt.name || 'Unknown Room',
          nameAr: rt.nameAr || rt.name || 'غرفة',
          maxGuests: rt.maxGuests || 1,
          numberOfBeds: rt.numberOfBeds || 1,
          basePrice: rt.basePrice || 0,
          viewType: rt.viewType,
          viewPrice: rt.viewPrice || 0,
          municipalityTaxPercentage: rt.municipalityTaxPercentage || 0,
          isPublic: true,
          logo: undefined, // Not using single logo anymore, use images gallery
          availableQuantity: rt.availableQuantity || 0,
          mainImageUrl: rt.mainImageUrl,
          mainImagePublicId: rt.mainImagePublicId,
          additionalImageUrls: rt.additionalImageUrls,
          payAtHotel: rt.payAtHotel !== undefined ? rt.payAtHotel : true, // Default to true
          payNow: rt.payNow !== undefined ? rt.payNow : true, // Default to true
          cancellationPolicy: rt.cancellationPolicy,
          cancellationPolicyAr: rt.cancellationPolicyAr
        });
      });
    } else {
      // Get ERP RoomTypes for this hotel
      console.log('🏢 Using ERP room types');  
      this.roomTypes
        .filter(rt => rt.isActive)
        .forEach(rt => {
          this.filteredRoomTypes.push({
            id: rt.id!,
            name: rt.englishName || 'Unknown Room',
            nameAr: rt.arabicName || rt.englishName || 'غرفة',
            maxGuests: rt.personNo || 1,
            numberOfBeds: 1, // ERP room types don't have numberOfBeds property
            basePrice: 0,
            viewType: undefined,
            viewPrice: 0,
            municipalityTaxPercentage: 0, // ERP room types don't have municipality tax
            isPublic: false,
            logo: rt.logoUrl,
            availableQuantity: 999, // ERP room types don't track quantity
            mainImageUrl: undefined,
            mainImagePublicId: undefined,
            additionalImageUrls: undefined,
            payAtHotel: true, // ERP room types always allow payment at hotel
            payNow: false, // ERP room types don't support online payment
            cancellationPolicy: undefined,
            cancellationPolicyAr: undefined
          });
        });
    }
    
    console.log('🛏️ Filtered Room Types:', {
      hotelId,
      isPublicHotel,
      filteredCount: this.filteredRoomTypes.length,
      rooms: this.filteredRoomTypes
    });
  }

  private loadHotelPaidServices(hotelId: string | null): void {
    if (!hotelId) {
      this.selectedPaidServices.set([]);
      return;
    }

    // Load full hotel details to get paid services
    console.log('🔍 Loading hotel paid services for:', hotelId);
    this.publicHotelService.getById(hotelId).subscribe({
      next: (hotel) => {
        console.log('✅ Hotel details loaded:', hotel);
        // Update the hotel in publicHotels array with paid services
        const hotelIndex = this.publicHotels.findIndex(h => h.id === hotelId);
        if (hotelIndex >= 0) {
          // Update only the paidServices property
          this.publicHotels[hotelIndex].paidServices = hotel.paidServices || [];
          console.log('📦 Hotel paid services updated:', hotel.paidServices?.length || 0);
        }
        // Clear previous selection
        this.selectedPaidServices.set([]);
      },
      error: (error) => {
        console.error('❌ Error loading hotel paid services:', error);
        this.selectedPaidServices.set([]);
      }
    });
  }

  getHotelPaidServices(): PublicHotelPaidServiceModel[] {
    const hotelId = this.form.get('hotelId')?.value;
    if (!hotelId) return [];
    
    const selectedHotel = this.publicHotels.find(h => h.id === hotelId);
    return selectedHotel?.paidServices?.filter(ps => ps.isActive) || [];
  }

  togglePaidService(hotelPaidService: PublicHotelPaidServiceModel): void {
    const current = this.selectedPaidServices();
    const index = current.findIndex(s => s.hotelPaidServiceId === hotelPaidService.id);
    
    if (index >= 0) {
      // Remove service
      this.selectedPaidServices.set(current.filter((_, i) => i !== index));
    } else {
      // Show confirmation dialog before adding
      const serviceName = this.activeLanguage === 'ar' 
        ? hotelPaidService.service?.nameAr 
        : hotelPaidService.service?.nameEn;
      const price = hotelPaidService.price;
      
      const confirmed = confirm(
        this.activeLanguage === 'ar'
          ? `هل تريد إضافة خدمة "${serviceName}" بسعر ${price.toFixed(2)} SAR؟`
          : `Do you want to add "${serviceName}" service for ${price.toFixed(2)} SAR?`
      );
      
      if (confirmed) {
        // Add service
        this.selectedPaidServices.set([
          ...current,
          {
            hotelPaidServiceId: hotelPaidService.id!,
            serviceId: hotelPaidService.publicPaidServiceId,
            serviceName: hotelPaidService.service?.nameEn || '',
            serviceNameAr: hotelPaidService.service?.nameAr || '',
            price: hotelPaidService.price,
            quantity: 1
          }
        ]);
      }
    }
  }

  isPaidServiceSelected(hotelPaidServiceId: string): boolean {
    return this.selectedPaidServices().some(s => s.hotelPaidServiceId === hotelPaidServiceId);
  }

  getPaidServiceQuantity(hotelPaidServiceId: string): number {
    const service = this.selectedPaidServices().find(s => s.hotelPaidServiceId === hotelPaidServiceId);
    return service?.quantity || 1;
  }

  updatePaidServiceQuantity(hotelPaidServiceId: string, quantity: number): void {
    const current = this.selectedPaidServices();
    const updated = current.map(s => 
      s.hotelPaidServiceId === hotelPaidServiceId 
        ? { ...s, quantity: Math.max(1, quantity) }
        : s
    );
    this.selectedPaidServices.set(updated);
  }

  getPaidServicesTotal(): number {
    return this.selectedPaidServices().reduce((total, service) => 
      total + (service.price * service.quantity), 0
    );
  }

  getSelectedPaidServicesForRoom(): any[] {
    return this.selectedPaidServices();
  }

  // Method to navigate to checkout form
  goToCheckout(): void {
    const hotelId = this.form.get('hotelId')?.value;
    const arrivalDate = this.form.get('arrivalDate')?.value;
    const departureDate = this.form.get('departureDate')?.value;
    const numberOfAdults = this.form.get('numberOfAdults')?.value || 1;

    if (!hotelId) {
      alert('يرجى اختيار الفندق | Please select a hotel');
      return;
    }

    if (!arrivalDate || !departureDate) {
      alert('يرجى اختيار تاريخ الوصول والمغادرة | Please select check-in and check-out dates');
      return;
    }

    // Navigate to hotel room selection page
    this.router.navigate(['/hotel-rooms', hotelId], {
      queryParams: {
        checkIn: arrivalDate.toISOString(),
        checkOut: departureDate.toISOString(),
        guests: numberOfAdults,
        rooms: 1
      }
    });
  }

  viewHotelDetails(hotelId: string): void {
    const arrivalDate = this.form.get('arrivalDate')?.value;
    const departureDate = this.form.get('departureDate')?.value;
    const numberOfAdults = this.form.get('numberOfAdults')?.value || 2;

    // Set default dates if not selected
    let checkIn = arrivalDate;
    let checkOut = departureDate;

    if (!checkIn) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      checkIn = tomorrow;
    }

    if (!checkOut) {
      const nextDay = new Date(checkIn);
      nextDay.setDate(nextDay.getDate() + 1);
      checkOut = nextDay;
    }

    // Navigate to hotel room selection page
    this.router.navigate(['/hotel-rooms', hotelId], {
      queryParams: {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests: numberOfAdults,
        rooms: 1
      }
    });
  }

  // Method to go back to landing page
  backToLanding(): void {
    this.showCheckoutForm.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearch(): void {
    // Validate required search fields
    const hotelId = this.form.get('hotelId')?.value;
    const arrivalDate = this.form.get('arrivalDate')?.value;
    const departureDate = this.form.get('departureDate')?.value;

    if (!hotelId || !arrivalDate || !departureDate) {
      alert('Please select destination, check-in and check-out dates | يرجى اختيار الوجهة وتاريخ الوصول والمغادرة');
      return;
    }

    // Scroll to hotels grid to show available hotels
    const hotelsGrid = document.querySelector('.hotels-grid');
    if (hotelsGrid) {
      hotelsGrid.scrollIntoView({ behavior: 'smooth' });
    }
  }

  submit(): void {
    console.log('🚀 Submit clicked!', {
      formValid: this.form.valid,
      formValue: this.form.value,
      errors: this.getFormErrors(),
      selectedRooms: this.selectedRoomTypes()
    });
    
    // Ensure form arrays are up to date with shopping cart selections
    this.updateFormArrays();
    
    // Validate that at least one room is selected
    if (this.selectedRoomTypes().length === 0) {
      // Add validation error for rooms
      alert('Please select at least one room type | يرجى اختيار نوع غرفة واحد على الأقل');
      return;
    }

    if (this.form.invalid) {
      console.error('❌ Form is invalid:', this.getFormErrors());
      this.form.markAllAsTouched();
      alert('Please fill all required fields | يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Check payment options for selected rooms
    const selectedRoomIds = this.selectedRoomTypes().map(r => r.roomType.id);
    const selectedRoomDetails = this.filteredRoomTypes.filter(rt => selectedRoomIds.includes(rt.id));
    
    // Check if ALL selected rooms require online payment only
    const allRoomsRequirePayment = selectedRoomDetails.every(rt => !rt.payAtHotel && rt.payNow);
    
    // Check if at least one room allows payment at hotel
    const hasPayAtHotel = selectedRoomDetails.some(rt => rt.payAtHotel);
    
    console.log('💳 Payment Options Check:', {
      allRoomsRequirePayment,
      hasPayAtHotel,
      selectedRooms: selectedRoomDetails.map(rt => ({
        name: rt.name,
        payAtHotel: rt.payAtHotel,
        payNow: rt.payNow
      }))
    });

    // Logic:
    // - If ALL rooms have ONLY "Pay Now" enabled → Mandatory online payment
    // - If ANY room has "Pay at Hotel" enabled → Allow booking without payment
    const requiresPayment = allRoomsRequirePayment;
    
    if (requiresPayment) {
      console.log('💳 Payment required - all selected rooms require online payment only');
    } else {
      console.log('✅ Direct booking allowed - at least one room accepts payment at hotel');
    }

    this.submitting.set(true);
    this.success.set(null);

    const formValue = this.form.value;
    const arrival = this.coerceToDate(formValue.arrivalDate);
    const departure = this.coerceToDate(formValue.departureDate);
    
    console.log('📋 Form Values Before Submission:', {
      reservationClientCompanyId: formValue.reservationClientCompanyId,
      reservationSeasonId: formValue.reservationSeasonId
    });
    
    // For public booking, we'll use dummy GUIDs if not loaded
    let clientCompanyId = formValue.reservationClientCompanyId;
    if (!clientCompanyId || clientCompanyId === '') {
      clientCompanyId = '00000000-0000-0000-0000-000000000000';
      console.log('⚠️ Using dummy company ID for public booking');
    }
    
    // For public booking, use dummy Season ID if not available
    let seasonId = formValue.reservationSeasonId;
    if (!seasonId || seasonId === '') {
      seasonId = '00000000-0000-0000-0000-000000000000';
      console.log('⚠️ Using dummy season ID for public booking');
    }
    
    // Calculate total from selected rooms
    let subtotalBeforeTax = 0;
    const rooms = this.selectedRoomTypes().map(room => {
      // Get the room type details from filteredRoomTypes to get the price
      const roomTypeDetails = this.filteredRoomTypes.find(rt => rt.id === room.roomType.id);
      const basePrice = roomTypeDetails?.basePrice || 0;
      const viewPrice = roomTypeDetails?.viewPrice || 0;
      const municipalityTax = (roomTypeDetails?.municipalityTaxPercentage || 0) / 100;
      
      // Calculate price per night with municipality tax
      const pricePerNightWithMunicipalityTax = (basePrice + viewPrice) * (1 + municipalityTax);
      const roomTotal = room.quantity * pricePerNightWithMunicipalityTax * formValue.numberOfNights;
      subtotalBeforeTax += roomTotal;
      
      return {
        RoomTypeId: room.roomType.id,
        Quantity: room.quantity,
        PricePerNight: basePrice + viewPrice // Store base price without taxes
      };
    });

    // Add paid services total to the subtotal
    subtotalBeforeTax += this.getPaidServicesTotal();
    
    // Calculate VAT (15%)
    const vatAmount = subtotalBeforeTax * 0.15;
    
    // Calculate final total including VAT
    const totalAmount = subtotalBeforeTax + vatAmount;
    
    console.log('💰 Booking calculation:', {
      subtotalBeforeTax,
      vatAmount,
      totalAmount,
      paidServicesTotal: this.getPaidServicesTotal()
    });

    // Check if payment is required BEFORE creating booking
    if (requiresPayment) {
      console.log('💳 Payment required - initiating payment flow BEFORE booking');
      
      // Prepare billing data for Paymob
      const firstName = formValue.guestName?.split(' ')[0] || 'Guest';
      const lastName = formValue.guestName?.split(' ').slice(1).join(' ') || 'User';
      const email = formValue.guestEmail || 'guest@example.com';
      const phone = formValue.guestPhone || '01000000000';
      
      const billingData = this.paymobService.formatBillingData(
        firstName,
        lastName,
        email,
        phone,
        '+20'
      );
      
      // Generate a temporary booking reference for payment
      const tempBookingRef = 'TEMP-' + Date.now();
      
      // Initiate payment with Paymob FIRST
      this.paymobService.initiatePayment(
        totalAmount, // Amount in EGP
        tempBookingRef, // Temporary Order ID
        billingData // Billing data
      ).subscribe({
        next: (paymentData) => {
          console.log('🔗 Payment data received:', paymentData);
          console.log('🚀 Redirecting to payment gateway...');
          
          const paymentToken = paymentData.paymentToken;
          const integrationId = paymentData.integrationId;
          
          // Clean rooms data - remove payment fields
          const cleanRooms = rooms.map(r => ({
            RoomTypeId: r.RoomTypeId,
            Quantity: r.Quantity,
            PricePerNight: r.PricePerNight
          }));
          
          // Store booking data in sessionStorage to create booking after successful payment
          const bookingDataToStore = {
            HotelId: formValue.hotelId,
            GuestName: formValue.guestName,
            GuestEmail: formValue.guestEmail || 'guest@example.com',
            GuestPhone: formValue.guestPhone || '0000000000',
            CountryCode: null,
            GuestNationality: formValue.nationality || null,
            NumberOfAdults: formValue.numberOfAdults || 1,
            NumberOfChildren: formValue.numberOfChildren || 0,
            CheckInDate: this.formatBackendDate(arrival),
            CheckOutDate: this.formatBackendDate(departure),
            SpecialRequests: null,
            Rooms: cleanRooms,
            TotalAmount: totalAmount,
            DiscountAmount: 0,
            PromoCode: null,
            PaymentMethod: 'PayNow',
            TransactionId: paymentData.orderId,
            PaymentDetails: null,
            ErpReservationId: null
          };
          
          sessionStorage.setItem('pendingBookingData', JSON.stringify(bookingDataToStore));
          
          const paymobUrl = `https://accept.paymob.com/api/acceptance/iframes/${integrationId}?payment_token=${paymentToken}`;
          
          console.log('💳 Redirecting to:', paymobUrl);
          
          // Direct redirect - user will go to payment page
          // After successful payment, Paymob will redirect back to create the booking
          window.location.href = paymobUrl;
        },
        error: (paymentError) => {
          console.error('❌ Payment initialization failed:', paymentError);
          this.submitting.set(false);
          alert('فشل في تهيئة الدفع. يرجى المحاولة مرة أخرى. | Failed to initialize payment. Please try again.');
        }
      });
      
      return; // Stop here - don't create booking yet
    }
    console.log('✅ Payment at hotel - creating booking directly');
    
    // Prepare data matching PublicBookingPostDto structure (clean rooms data)
    const cleanRooms = rooms.map(r => ({
      RoomTypeId: r.RoomTypeId,
      Quantity: r.Quantity,
      PricePerNight: r.PricePerNight
    }));
    
    const publicBookingData = {
      HotelId: formValue.hotelId,
      GuestName: formValue.guestName,
      GuestEmail: formValue.guestEmail || 'guest@example.com',
      GuestPhone: formValue.guestPhone || '0000000000',
      CountryCode: null,
      GuestNationality: formValue.nationality || null,
      NumberOfAdults: formValue.numberOfAdults || 1,
      NumberOfChildren: formValue.numberOfChildren || 0,
      CheckInDate: this.formatBackendDate(arrival),
      CheckOutDate: this.formatBackendDate(departure),
      SpecialRequests: null,
      Rooms: cleanRooms,
      TotalAmount: totalAmount,
      DiscountAmount: 0,
      PromoCode: null,
      PaymentMethod: null,
      TransactionId: null,
      PaymentDetails: null,
      ErpReservationId: null
    };
    
    console.log('📤 Sending public booking:', publicBookingData);

    // Use PublicBooking API with correct DTO structure
    const apiBase = environment.server_urls[environment.active_server].baseApi;
    this.http.post<any>(`${apiBase}PublicBooking`, publicBookingData).subscribe({
      next: (result) => {
        console.log('✅ Booking created successfully:', result);
        
        const bookingReference = result.bookingReference || result.id;
        
        // Direct booking confirmed - payment at hotel
        console.log('✅ Direct booking confirmed - payment at hotel');
        this.success.set(true);
        this.submitting.set(false);
        
        alert(
          `تم تأكيد الحجز بنجاح!\nرقم الحجز: ${bookingReference}\nيمكنك الدفع عند الوصول للفندق\n\n` +
          `Booking confirmed successfully!\nBooking Reference: ${bookingReference}\nYou can pay at the hotel upon arrival`
        );
        
        // Reset form or redirect to booking details page
        this.form.reset();
        this.selectedRoomTypes.set([]);
        this.showCheckoutForm.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        console.error('Booking error:', error);
        this.success.set(false);
        this.submitting.set(false);
        alert('حدث خطأ في الحجز. يرجى المحاولة مرة أخرى. | Booking error. Please try again.');
      }
    });
  }

  // Get all images for a hotel (main + additional)
  getHotelImages(hotel: PublicHotelModel): any[] {
    const images: any[] = [];
    
    console.log('🏨 Getting hotel images for:', {
      hotelName: hotel.name,
      hasMainImage: !!hotel.mainImageUrl,
      mainImageUrl: hotel.mainImageUrl,
      hasAdditionalImages: !!hotel.additionalImageUrls,
      additionalImageUrls: hotel.additionalImageUrls
    });
    
    if (hotel.mainImageUrl) {
      images.push({
        itemImageSrc: hotel.mainImageUrl,
        thumbnailImageSrc: hotel.mainImageUrl,
        alt: hotel.name,
        title: hotel.name
      });
    }
    
    if (hotel.additionalImageUrls) {
      try {
        const additionalUrls = JSON.parse(hotel.additionalImageUrls);
        if (Array.isArray(additionalUrls)) {
          additionalUrls.forEach((url, index) => {
            if (url && typeof url === 'string') {
              images.push({
                itemImageSrc: url,
                thumbnailImageSrc: url,
                alt: `${hotel.name} - Image ${index + 2}`,
                title: `${hotel.name} - Image ${index + 2}`
              });
            }
          });
        }
      } catch (e) {
        console.log('⚠️ Failed to parse additionalImageUrls:', e);
      }
    }
    
    console.log(`🎯 Total images for hotel ${hotel.name}:`, images.length);
    return images;
  }

  // View image in full screen
  viewImageFullScreen(base64Image: string) {
    this.fullScreenImage.set(base64Image);
    this.fullScreenImageVisible.set(true);
  }

  hideFullScreenImage() {
    this.fullScreenImageVisible.set(false);
    this.fullScreenImage.set(null);
  }

  // Get all images for a room type
  getRoomImages(roomType: any): any[] {
    const images: any[] = [];
    
    console.log('🖼️ Getting room images for:', {
      roomTypeName: roomType.name,
      hasMainImageUrl: !!roomType.mainImageUrl,
      hasAdditionalImageUrls: !!roomType.additionalImageUrls
    });
    
    if (roomType.mainImageUrl) {
      images.push({
        itemImageSrc: roomType.mainImageUrl,
        thumbnailImageSrc: roomType.mainImageUrl,
        alt: `${roomType.name} - Main Image`,
        title: `${roomType.name} - Main Image`
      });
    }
    
    if (roomType.additionalImageUrls) {
      try {
        const parsed = JSON.parse(roomType.additionalImageUrls);
        if (Array.isArray(parsed)) {
          parsed.forEach((url, index) => {
            if (url && typeof url === 'string') {
              images.push({
                itemImageSrc: url,
                thumbnailImageSrc: url,
                alt: `${roomType.name} - Image ${index + 1}`,
                title: `${roomType.name} - Image ${index + 1}`
              });
            }
          });
        }
      } catch (error) {
        console.log('⚠️ Failed to parse additionalImageUrls:', error);
      }
    }
    
    console.log(`🎯 Total images for ${roomType.name}:`, images.length);
    return images;
  }
}
