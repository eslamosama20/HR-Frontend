import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule, Table } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { TranslationService } from 'src/app/modules/i18n';
import { PublicHotelService } from 'src/app/services/public-booking/public-hotel.service';
import { PublicRoomTypeService } from 'src/app/services/public-booking/public-room-type.service';
import { PublicPaidServiceService } from 'src/app/services/public-booking/public-paid-service.service';
import { PublicHotelModel } from 'src/app/models/public-booking/public-hotel.model';
import { PublicRoomTypeModel } from 'src/app/models/public-booking/public-room-type.model';
import { PublicPaidServiceModel, PublicHotelPaidServiceModel } from 'src/app/models/public-booking/public-paid-service.model';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-public-hotels-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputTextareaModule,
    CardModule,
    ConfirmDialogModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TableModule,
    TabViewModule,
    DropdownModule,
    InputNumberModule,
    CheckboxModule,
    TranslateModule,
    FileUploadModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './public-hotels-management.component.html',
  styleUrl: './public-hotels-management.component.scss'
})
export class PublicHotelsManagementComponent implements OnInit {
  // Hotels signals
  hotelsSignal = signal<PublicHotelModel[]>([]);
  get hotels() {
    return this.hotelsSignal();
  }
  set hotels(value: PublicHotelModel[]) {
    this.hotelsSignal.set(value);
  }

  // Room types signals
  roomTypesSignal = signal<PublicRoomTypeModel[]>([]);
  get roomTypes() {
    return this.roomTypesSignal();
  }
  set roomTypes(value: PublicRoomTypeModel[]) {
    this.roomTypesSignal.set(value);
  }

  // Loading states
  loadingHotelsSignal = signal(true);
  get loadingHotels() {
    return this.loadingHotelsSignal();
  }
  set loadingHotels(value: boolean) {
    this.loadingHotelsSignal.set(value);
  }

  loadingRoomTypesSignal = signal(true);
  get loadingRoomTypes() {
    return this.loadingRoomTypesSignal();
  }
  set loadingRoomTypes(value: boolean) {
    this.loadingRoomTypesSignal.set(value);
  }

  // Dialog visibility
  hotelDialogVisibleSignal = signal(false);
  get hotelDialogVisible() {
    return this.hotelDialogVisibleSignal();
  }
  set hotelDialogVisible(value: boolean) {
    this.hotelDialogVisibleSignal.set(value);
  }

  roomTypeDialogVisibleSignal = signal(false);
  get roomTypeDialogVisible() {
    return this.roomTypeDialogVisibleSignal();
  }
  set roomTypeDialogVisible(value: boolean) {
    this.roomTypeDialogVisibleSignal.set(value);
  }

  roomsManagementDialogVisibleSignal = signal(false);
  get roomsManagementDialogVisible() {
    return this.roomsManagementDialogVisibleSignal();
  }
  set roomsManagementDialogVisible(value: boolean) {
    this.roomsManagementDialogVisibleSignal.set(value);
  }

  // Forms
  hotelFormGroup: FormGroup;
  roomTypeFormGroup: FormGroup;
  selectedHotelForRooms: PublicHotelModel | null = null;
  selectedHotelId: string | null = null;

  @ViewChild('fileUploader') fileUploader!: FileUpload;
  @ViewChild('mainImageUploader') mainImageUploader!: FileUpload;
  @ViewChild('additionalImagesUploader') additionalImagesUploader!: FileUpload;
  @ViewChild('roomImagesUploader') roomImagesUploader!: FileUpload;
  
  isFileUploadingSignal = signal(false);
  get isFileUploading() {
    return this.isFileUploadingSignal();
  }
  set isFileUploading(value: boolean) {
    this.isFileUploadingSignal.set(value);
  }

  hotelMainImageUrlSignal = signal<string | null>(null);
  get hotelMainImageUrl() {
    return this.hotelMainImageUrlSignal();
  }
  set hotelMainImageUrl(value: string | null) {
    this.hotelMainImageUrlSignal.set(value);
  }

  hotelMainImagePublicIdSignal = signal<string | null>(null);
  get hotelMainImagePublicId() {
    return this.hotelMainImagePublicIdSignal();
  }
  set hotelMainImagePublicId(value: string | null) {
    this.hotelMainImagePublicIdSignal.set(value);
  }

  hotelAdditionalImageUrlsSignal = signal<string[]>([]);
  get hotelAdditionalImageUrls() {
    return this.hotelAdditionalImageUrlsSignal();
  }
  set hotelAdditionalImageUrls(value: string[]) {
    this.hotelAdditionalImageUrlsSignal.set(value);
  }

  roomTypeMainImageUrlSignal = signal<string | null>(null);
  get roomTypeMainImageUrl() {
    return this.roomTypeMainImageUrlSignal();
  }
  set roomTypeMainImageUrl(value: string | null) {
    this.roomTypeMainImageUrlSignal.set(value);
  }

  roomTypeMainImagePublicIdSignal = signal<string | null>(null);
  get roomTypeMainImagePublicId() {
    return this.roomTypeMainImagePublicIdSignal();
  }
  set roomTypeMainImagePublicId(value: string | null) {
    this.roomTypeMainImagePublicIdSignal.set(value);
  }

  roomTypeImageUrlsSignal = signal<string[]>([]);
  get roomTypeImageUrls() {
    return this.roomTypeImageUrlsSignal();
  }
  set roomTypeImageUrls(value: string[]) {
    this.roomTypeImageUrlsSignal.set(value);
  }

  // Full screen image viewer
  fullScreenImageSignal = signal<string | null>(null);
  get fullScreenImage() {
    return this.fullScreenImageSignal();
  }
  set fullScreenImage(value: string | null) {
    this.fullScreenImageSignal.set(value);
  }

  fullScreenImageVisibleSignal = signal(false);
  get fullScreenImageVisible() {
    return this.fullScreenImageVisibleSignal();
  }
  set fullScreenImageVisible(value: boolean) {
    this.fullScreenImageVisibleSignal.set(value);
  }
  
  public activeLanguage: string = 'en';
  hotelColumns!: Column[];
  roomTypeColumns!: Column[];

  get isRTL(): boolean {
    return this.activeLanguage === 'ar';
  }
  starsOptions = [1, 2, 3, 4, 5];

  bedTypeOptions = [
    { label: 'Single', value: 'Single' },
    { label: 'Double', value: 'Double' },
    { label: 'Triple', value: 'Triple' },
    { label: 'Queen', value: 'Queen' },
    { label: 'King', value: 'King' },
    { label: 'Twin', value: 'Twin' }
  ];

  viewTypeOptions = [
    { label: 'Sea View', value: 'Sea View' },
    { label: 'City View', value: 'City View' },
    { label: 'Garden View', value: 'Garden View' },
    { label: 'Mountain View', value: 'Mountain View' },
    { label: 'Pool View', value: 'Pool View' }
  ];

  // Hotel Amenities Options
  hotelAmenitiesOptions = [
    { label: 'موقف سيارات خاص | Private Parking', value: 'private_parking', icon: '🅿️' },
    { label: 'مرافق لذوي الاحتياجات الخاصة | Accessibility Facilities', value: 'accessibility', icon: '♿' },
    { label: 'خدمة الغرف | Room Service', value: 'room_service', icon: '🛎️' },
    { label: 'غرف لغير المدخنين | Non-Smoking Rooms', value: 'non_smoking', icon: '🚭' },
    { label: 'مكتب استقبال على مدار 24 ساعة | 24/7 Reception', value: '24_7_reception', icon: '🕐' },
    { label: 'غرف عائلية | Family Rooms', value: 'family_rooms', icon: '👨‍👩‍👧‍👦' },
    { label: 'واي فاي مجاني | Free WiFi', value: 'free_wifi', icon: '📶' },
    { label: 'مطاعم | Restaurants', value: 'restaurants', icon: '🍽️' },
    { label: 'إفطار | Breakfast', value: 'breakfast', icon: '☕' },
    { label: 'مسبح | Swimming Pool', value: 'pool', icon: '🏊' },
    { label: 'صالة رياضية | Gym', value: 'gym', icon: '💪' },
    { label: 'سبا | Spa', value: 'spa', icon: '🧖' },
    { label: 'مركز أعمال | Business Center', value: 'business_center', icon: '💼' }
  ];

  selectedAmenitiesSignal = signal<string[]>([]);
  get selectedAmenities() {
    return this.selectedAmenitiesSignal();
  }
  set selectedAmenities(value: string[]) {
    this.selectedAmenitiesSignal.set(value);
  }

  // Paid Services
  availablePaidServicesSignal = signal<PublicPaidServiceModel[]>([]);
  get availablePaidServices() {
    return this.availablePaidServicesSignal();
  }
  set availablePaidServices(value: PublicPaidServiceModel[]) {
    this.availablePaidServicesSignal.set(value);
  }

  selectedPaidServicesSignal = signal<PublicHotelPaidServiceModel[]>([]);
  get selectedPaidServices() {
    return this.selectedPaidServicesSignal();
  }
  set selectedPaidServices(value: PublicHotelPaidServiceModel[]) {
    this.selectedPaidServicesSignal.set(value);
  }

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public publicHotelService: PublicHotelService,
    public publicRoomTypeService: PublicRoomTypeService,
    public publicPaidServiceService: PublicPaidServiceService
  ) {
    this.activeLanguage = translationService.getSelectedLanguage();

    // Hotel Form
    this.hotelFormGroup = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      nameAr: [''],
      description: [''],
      descriptionAr: [''],
      address: [''],
      addressAr: [''],
      city: [''],
      country: [''],
      stars: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      phone: [''],
      email: ['', Validators.email],
      website: [''],
      mainImageUrl: [''],
      mainImagePublicId: [''],
      additionalImageUrls: [''],
      amenities: [''],
      checkInTime: ['14:00'],
      checkOutTime: ['12:00'],
      latitude: [null],
      longitude: [null],
      policies: [''],
      isActive: [true],
      isFeatured: [false],
      erpHotelId: [null]
    });

    // Room Type Form
    this.roomTypeFormGroup = this.fb.group({
      id: [null],
      hotelId: [null, Validators.required],
      name: ['', Validators.required],
      nameAr: [''],
      description: [''],
      descriptionAr: [''],
      sizeInSqMeters: [null],
      maxGuests: [2, [Validators.required, Validators.min(1)]],
      numberOfBeds: [1, [Validators.required, Validators.min(1)]],
      bedType: ['Double'],
      basePrice: [0, [Validators.required, Validators.min(0)]],
      weekendPrice: [null],
      mainImageUrl: [''],
      mainImagePublicId: [''],
      additionalImageUrls: [''],
      amenities: [''],
      viewType: [''],
      viewPrice: [0, [Validators.min(0)]],
      municipalityTaxPercentage: [0, [Validators.min(0), Validators.max(100)]],
      totalRooms: [1, [Validators.required, Validators.min(1)]],
      availableQuantity: [1, [Validators.required, Validators.min(0)]],
      payAtHotel: [true],
      payNow: [true],
      cancellationPolicy: [''],
      cancellationPolicyAr: [''],
      isActive: [true],
      erpRoomTypeId: [null]
    });

    this.hotelColumns = [
      { field: 'mainImageUrl', header: 'Image' },
      { field: 'name', header: 'Name' },
      { field: 'city', header: 'City' },
      { field: 'stars', header: 'Stars' },
      { field: 'isActive', header: 'Active' },
      { field: 'isFeatured', header: 'Featured' },
      { field: 'roomTypesCount', header: 'Rooms' }
    ];

    this.roomTypeColumns = [
      { field: 'hotelName', header: 'Hotel' },
      { field: 'name', header: 'Room Type' },
      { field: 'maxGuests', header: 'Max Guests' },
      { field: 'bedType', header: 'Bed Type' },
      { field: 'basePrice', header: 'Price' },
      { field: 'totalRooms', header: 'Total Rooms' },
      { field: 'isActive', header: 'Active' }
    ];
  }

  ngOnInit(): void {
    this.loadHotels();
    this.loadRoomTypes();
    this.loadPaidServices();
    this.setupRoomTypeAutoFill();
    this.subscribeToLanguageChanges();
  }

  subscribeToLanguageChanges() {
    // Subscribe to language changes to update direction
    this.translateService.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang;
    });
  }

  setupRoomTypeAutoFill() {
    // Subscribe to bedType changes to auto-fill numberOfBeds and maxGuests
    this.roomTypeFormGroup.get('bedType')?.valueChanges.subscribe(bedType => {
      if (bedType) {
        const bedTypeLower = bedType.toLowerCase();
        
        // Auto-fill based on bed type
        if (bedTypeLower.includes('double')) {
          // Double room: 2 beds, 2 guests
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 2,
            maxGuests: 2
          }, { emitEvent: false });
        } else if (bedTypeLower.includes('king')) {
          // King room: 1 bed, 2 guests
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 1,
            maxGuests: 2
          }, { emitEvent: false });
        } else if (bedTypeLower.includes('triple')) {
          // Triple room: 3 beds, 3 guests
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 3,
            maxGuests: 3
          }, { emitEvent: false });
        } else if (bedTypeLower.includes('single')) {
          // Single room: 1 bed, 1 guest
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 1,
            maxGuests: 1
          }, { emitEvent: false });
        } else if (bedTypeLower.includes('twin')) {
          // Twin room: 2 beds, 2 guests
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 2,
            maxGuests: 2
          }, { emitEvent: false });
        } else if (bedTypeLower.includes('queen')) {
          // Queen room: 1 bed, 2 guests
          this.roomTypeFormGroup.patchValue({
            numberOfBeds: 1,
            maxGuests: 2
          }, { emitEvent: false });
        }
      }
    });
  }

  // Hotels Methods
  loadHotels() {
    console.log('🔄 Loading hotels...');
    this.loadingHotels = true;
    this.publicHotelService.getAllWithFilters({ isActive: true }).subscribe({
      next: (hotels) => {
        console.log('✅ Hotels loaded:', hotels?.length || 0, 'hotels');
        this.hotels = hotels || [];
        this.loadingHotels = false;
      },
      error: (error) => {
        console.error('❌ Error loading hotels:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load hotels'
        });
        this.loadingHotels = false;
      }
    });
  }

  loadPaidServices() {
    console.log('🔄 Loading paid services...');
    this.publicPaidServiceService.getAll().subscribe({
      next: (services) => {
        console.log('✅ Paid services loaded:', services?.length || 0, 'services');
        this.availablePaidServices = services || [];
      },
      error: (error) => {
        console.error('❌ Error loading paid services:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load paid services'
        });
      }
    });
  }

  togglePaidService(service: PublicPaidServiceModel, event: any) {
    const isChecked = event.checked;
    if (isChecked) {
      // Add service with default price 0
      this.selectedPaidServices = [
        ...this.selectedPaidServices,
        {
          publicPaidServiceId: service.id!,
          price: 0,
          isActive: true,
          service: service
        }
      ];
    } else {
      // Remove service
      this.selectedPaidServices = this.selectedPaidServices.filter(
        s => s.publicPaidServiceId !== service.id
      );
    }
  }

  isPaidServiceSelected(serviceId: string): boolean {
    return this.selectedPaidServices.some(s => s.publicPaidServiceId === serviceId);
  }

  getPaidServicePrice(serviceId: string): number {
    const service = this.selectedPaidServices.find(s => s.publicPaidServiceId === serviceId);
    return service?.price || 0;
  }

  updatePaidServicePrice(serviceId: string, price: number) {
    const service = this.selectedPaidServices.find(s => s.publicPaidServiceId === serviceId);
    if (service) {
      service.price = price;
    }
  }

  openNewHotel() {
    this.hotelMainImageUrl = null;
    this.hotelMainImagePublicId = null;
    this.hotelAdditionalImageUrls = [];
    this.selectedAmenities = [];
    this.selectedPaidServices = [];
    this.isFileUploading = false;
    this.hotelFormGroup.reset({
      stars: 3,
      isActive: true,
      isFeatured: false,
      checkInTime: '14:00',
      checkOutTime: '12:00'
    });
    this.hotelDialogVisible = true;
  }

  editHotel(hotel: PublicHotelModel) {
    console.log('📝 Editing hotel:', hotel);
    this.hotelMainImageUrl = hotel.mainImageUrl || null;
    this.hotelMainImagePublicId = hotel.mainImagePublicId || null;
    this.isFileUploading = false;
    try {
      this.hotelAdditionalImageUrls = hotel.additionalImageUrls
        ? JSON.parse(hotel.additionalImageUrls)
        : [];
    } catch {
      this.hotelAdditionalImageUrls = [];
    }
    try {
      this.selectedAmenities = hotel.amenities ? JSON.parse(hotel.amenities) : [];
    } catch {
      this.selectedAmenities = [];
    }
    
    console.log('🔍 Loading full hotel details for:', hotel.id);
    this.publicHotelService.getById(hotel.id).subscribe({
      next: (fullHotel) => {
        console.log('✅ Full hotel data loaded:', fullHotel);
        this.selectedPaidServices = fullHotel.paidServices || [];
        console.log('📦 Loaded paid services:', this.selectedPaidServices);
      },
      error: (error) => {
        console.error('❌ Error loading hotel details:', error);
        this.selectedPaidServices = [];
      }
    });
    
    this.hotelFormGroup.patchValue(hotel);
    this.hotelDialogVisible = true;
  }

  deleteHotel(hotel: PublicHotelModel) {
    console.log('🗑️ Deleting hotel:', hotel);
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${hotel.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.publicHotelService.delete(hotel.id).subscribe({
          next: (response) => {
            console.log('✅ Delete successful');
            this.messageService.add({
              severity: 'success',
              summary: 'Successful',
              detail: 'Hotel Deleted',
              life: 3000
            });
            // Remove the deleted hotel from the signal immediately
            this.hotels = this.hotels.filter(h => h.id !== hotel.id);
            this.loadRoomTypes(); // Refresh room types in case they were linked to this hotel
          },
          error: (error) => {
            console.error('Error deleting hotel:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete hotel'
            });
          }
        });
      }
    });
  }

  saveHotel() {
    if (this.hotelFormGroup.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields'
      });
      return;
    }

    const hotelFormValue = this.hotelFormGroup.value;
    const isEdit = !!hotelFormValue.id;

    const hotelData = {
      ...hotelFormValue,
      mainImageUrl: this.hotelMainImageUrl,
      mainImagePublicId: this.hotelMainImagePublicId,
      additionalImageUrls: JSON.stringify(this.hotelAdditionalImageUrls),
      amenities: JSON.stringify(this.selectedAmenities),
    };

    console.log('💾 Saving hotel:', hotelData);
    console.log('📦 Selected paid services:', this.selectedPaidServices);

    const hotel = new PublicHotelModel(hotelData);
    
    hotel.paidServices = this.selectedPaidServices.map(ps => ({
      publicHotelId: hotelFormValue.id,
      publicPaidServiceId: ps.publicPaidServiceId,
      price: ps.price,
      isActive: ps.isActive,
      notes: ps.notes
    }));

    console.log('🚀 Hotel with paid services:', hotel);

    const operation = isEdit
      ? this.publicHotelService.update(hotel)
      : this.publicHotelService.create(hotel);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: `Hotel ${isEdit ? 'Updated' : 'Created'}`,
          life: 3000
        });
        this.hotelDialogVisible = false;
        this.hotelMainImageUrl = null;
        this.hotelMainImagePublicId = null;
        this.hotelAdditionalImageUrls = [];
        this.loadHotels();
      },
      error: (error) => {
        console.error('Error saving hotel:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${isEdit ? 'update' : 'create'} hotel`
        });
      }
    });
  }

  hideHotelDialog() {
    this.hotelDialogVisible = false;
    this.hotelMainImageUrl = null;
    this.hotelMainImagePublicId = null;
    this.hotelAdditionalImageUrls = [];
    this.selectedAmenities = [];
    this.selectedPaidServices = [];
    this.isFileUploading = false;
  }

  // Room Types Methods
  loadRoomTypes() {
    console.log('🔄 Loading room types...');
    this.loadingRoomTypes = true;
    const filters = this.selectedHotelId 
      ? { hotelId: this.selectedHotelId, isActive: true } 
      : { isActive: true };
    
    this.publicRoomTypeService.getAllWithFilters(filters).subscribe({
      next: (roomTypes) => {
        console.log('✅ Room types loaded:', roomTypes?.length || 0, 'room types');
        this.roomTypes = roomTypes || [];
        this.loadingRoomTypes = false;
      },
      error: (error) => {
        console.error('❌ Error loading room types:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room types'
        });
        this.loadingRoomTypes = false;
      }
    });
  }

  filterByHotel(hotelId: string | null) {
    this.selectedHotelId = hotelId;
    this.loadRoomTypes();
  }

  openNewRoomType() {
    this.roomTypeMainImageUrl = null;
    this.roomTypeMainImagePublicId = null;
    this.roomTypeImageUrls = [];
    this.isFileUploading = false;
    this.roomTypeFormGroup.reset({
      maxGuests: 2,
      numberOfBeds: 1,
      bedType: 'Double',
      basePrice: 0,
      viewPrice: 0,
      totalRooms: 1,
      availableQuantity: 1,
      isActive: true,
      hotelId: this.selectedHotelForRooms?.id || this.selectedHotelId
    });
    this.roomTypeDialogVisible = true;
  }

  editRoomType(roomType: PublicRoomTypeModel) {
    console.log('📝 Editing room type:', roomType);
    this.roomTypeMainImageUrl = roomType.mainImageUrl || null;
    this.roomTypeMainImagePublicId = roomType.mainImagePublicId || null;
    this.isFileUploading = false;
    try {
      const urls = roomType.additionalImageUrls ? JSON.parse(roomType.additionalImageUrls) : [];
      this.roomTypeImageUrls = Array.isArray(urls) ? urls : [];
    } catch {
      this.roomTypeImageUrls = [];
    }
    this.roomTypeFormGroup.patchValue(roomType);
    this.roomTypeDialogVisible = true;
  }

  deleteRoomType(roomType: PublicRoomTypeModel) {
    console.log('🗑️ Deleting room type:', roomType);
    
    this.confirmationService.confirm({
      message: `هل أنت متأكد من حذف نوع الغرفة "${roomType.name}"؟
      
Are you sure you want to delete room type "${roomType.name}"?

⚠️ سيتم حذف جميع البيانات المرتبطة بهذا النوع
⚠️ All associated data will be deleted`,
      header: this.translateService.instant('DATA.CONFIRM_DELETE') || 'تأكيد الحذف | Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translateService.instant('DATA.YES') || 'نعم | Yes',
      rejectLabel: this.translateService.instant('DATA.NO') || 'لا | No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        console.log('🔄 Deleting room type ID:', roomType.id);
        this.publicRoomTypeService.delete(roomType.id).subscribe({
          next: (response) => {
            console.log('✅ Delete successful:', response);
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('COMMON.SUCCESS') || 'نجح | Success',
              detail: `تم حذف نوع الغرفة "${roomType.name}" بنجاح
              
Room type "${roomType.name}" deleted successfully`,
              life: 3000
            });
            // Remove the deleted room type from the signal immediately
            this.roomTypes = this.roomTypes.filter(rt => rt.id !== roomType.id);
            this.loadHotels(); // Refresh hotels to update room count
          },
          error: (error) => {
            console.error('❌ Error deleting room type:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              message: error.message,
              error: error.error
            });
            
            let errorMessage = 'فشل حذف نوع الغرفة | Failed to delete room type';
            
            if (error.status === 404) {
              errorMessage = 'نوع الغرفة غير موجود | Room type not found';
            } else if (error.status === 400) {
              errorMessage = 'لا يمكن حذف نوع الغرفة. قد يكون مرتبط بحجوزات | Cannot delete room type. It may be linked to reservations';
            } else if (error.status === 500) {
              errorMessage = 'خطأ في الخادم. يرجى المحاولة لاحقاً | Server error. Please try again later';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('COMMON.ERROR') || 'خطأ | Error',
              detail: errorMessage,
              life: 5000
            });
          }
        });
      },
      reject: () => {
        console.log('❌ Delete cancelled by user');
        this.messageService.add({
          severity: 'info',
          summary: this.translateService.instant('COMMON.CANCELLED') || 'ملغي | Cancelled',
          detail: 'تم إلغاء عملية الحذف | Delete operation cancelled',
          life: 2000
        });
      }
    });
  }

  saveRoomType() {
    if (this.roomTypeFormGroup.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields'
      });
      return;
    }

    const payAtHotel = this.roomTypeFormGroup.get('payAtHotel')?.value;
    const payNow = this.roomTypeFormGroup.get('payNow')?.value;
    
    if (!payAtHotel && !payNow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير | Warning',
        detail: 'يجب تحديد طريقة دفع واحدة على الأقل | At least one payment method must be selected'
      });
      return;
    }

    const roomTypeData = {
      ...this.roomTypeFormGroup.value,
      mainImageUrl: this.roomTypeMainImageUrl,
      mainImagePublicId: this.roomTypeMainImagePublicId,
      additionalImageUrls: JSON.stringify(this.roomTypeImageUrls),
    };
    const isEdit = !!roomTypeData.id;

    console.log('💾 Saving room type:', {
      roomTypeData,
      imagesCount: this.roomTypeImageUrls.length,
      mainImageUrl: this.roomTypeMainImageUrl,
      additionalImageUrls: roomTypeData.additionalImageUrls,
    });

    const cleanRoomTypeData = {
      ...roomTypeData,
      payAtHotel: roomTypeData.payAtHotel === true || roomTypeData.payAtHotel === 'true',
      payNow: roomTypeData.payNow === true || roomTypeData.payNow === 'true',
      isActive: roomTypeData.isActive === true || roomTypeData.isActive === 'true'
    };

    console.log('🧹 Cleaned room type data:', cleanRoomTypeData);

    const roomType = new PublicRoomTypeModel(cleanRoomTypeData);
    
    console.log('📦 Room type model:', roomType);

    const operation = isEdit
      ? this.publicRoomTypeService.update(roomType)
      : this.publicRoomTypeService.create(roomType);

    operation.subscribe({
      next: (response) => {
        console.log('✅ Save response:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: `Room Type ${isEdit ? 'Updated' : 'Created'}`,
          life: 3000
        });
        this.roomTypeDialogVisible = false;
        this.roomTypeMainImageUrl = null;
        this.roomTypeMainImagePublicId = null;
        this.roomTypeImageUrls = [];
        this.loadRoomTypes();
        this.loadHotels();
      },
      error: (error) => {
        console.error('❌ Error saving room type:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${isEdit ? 'update' : 'create'} room type`
        });
      }
    });
  }

  hideRoomTypeDialog() {
    this.roomTypeDialogVisible = false;
    this.roomTypeMainImageUrl = null;
    this.roomTypeMainImagePublicId = null;
    this.roomTypeImageUrls = [];
    this.isFileUploading = false;
  }

  // Manage Rooms for specific hotel
  manageHotelRooms(hotel: PublicHotelModel) {
    console.log('🏨 Managing rooms for hotel:', hotel);
    this.selectedHotelForRooms = hotel;
    this.selectedHotelId = hotel.id;
    this.loadRoomTypes();
    this.roomsManagementDialogVisible = true;
  }

  hideRoomsManagementDialog() {
    this.roomsManagementDialogVisible = false;
    this.selectedHotelForRooms = null;
    this.selectedHotelId = null;
    this.loadRoomTypes(); // Reload all room types
  }

  // Utility Methods
  onMainImageSelected(event: any) {
    const file = event.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'يرجى اختيار صورة بصيغة JPG أو PNG'
      });
      this.mainImageUploader?.clear();
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت'
      });
      this.mainImageUploader?.clear();
      return;
    }

    this.isFileUploading = true;

    this.publicHotelService.uploadMainImageTemp(file).subscribe({
      next: (response: any) => {
        this.hotelMainImageUrl = response.url;
        this.hotelMainImagePublicId = response.publicId;
        this.isFileUploading = false;
        this.mainImageUploader?.clear();
      },
      error: (error) => {
        console.error('❌ Error uploading main image:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في رفع الصورة'
        });
        this.isFileUploading = false;
        this.mainImageUploader?.clear();
      }
    });
  }

  removeMainImage() {
    this.hotelMainImageUrl = null;
    this.hotelMainImagePublicId = null;
    this.mainImageUploader?.clear();
  }

  onAdditionalImagesSelected(event: any) {
    const files = event.files;
    if (!files || files.length === 0) return;

    this.isFileUploading = true;

    this.publicHotelService.uploadAdditionalImagesTemp(files).subscribe({
      next: (response: any) => {
        const newUrls = (response.urls || []).map((r: any) => r.url);
        this.hotelAdditionalImageUrls = [...this.hotelAdditionalImageUrls, ...newUrls];
        this.isFileUploading = false;
        this.additionalImagesUploader?.clear();
      },
      error: (error) => {
        console.error('❌ Error uploading additional images:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في رفع الصور'
        });
        this.isFileUploading = false;
        this.additionalImagesUploader?.clear();
      }
    });
  }

  removeAdditionalImage(index: number) {
    this.hotelAdditionalImageUrls = this.hotelAdditionalImageUrls.filter((_, i) => i !== index);
  }

  onRoomImagesSelected(event: any) {
    const files = event.files;
    if (!files || files.length === 0) return;

    console.log('🖼️ Room images selected:', files.length, 'files');

    this.isFileUploading = true;

    this.publicRoomTypeService.uploadAdditionalImagesTemp(files).subscribe({
      next: (response: any) => {
        const newUrls = (response.urls || []).map((r: any) => r.url);
        this.roomTypeImageUrls = [...this.roomTypeImageUrls, ...newUrls];
        this.isFileUploading = false;
        this.roomImagesUploader?.clear();
        console.log('🎯 All room images uploaded:', this.roomTypeImageUrls.length);
      },
      error: (error) => {
        console.error('❌ Error uploading room images:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في رفع الصور'
        });
        this.isFileUploading = false;
        this.roomImagesUploader?.clear();
      }
    });
  }

  removeRoomImage(index: number) {
    this.roomTypeImageUrls = this.roomTypeImageUrls.filter((_, i) => i !== index);
  }

  onUpload(event: any) {
    console.log('File uploaded:', event);
  }

  // View image in full screen
  viewImageFullScreen(base64Image: string) {
    this.fullScreenImage = base64Image;
    this.fullScreenImageVisible = true;
  }

  hideFullScreenImage() {
    this.fullScreenImageVisible = false;
    this.fullScreenImage = null;
  }

  getStarsArray(stars: number): number[] {
    return Array(stars).fill(0);
  }

  getRoomTypesForHotel(hotelId: string): PublicRoomTypeModel[] {
    return this.roomTypes.filter(rt => rt.hotelId === hotelId);
  }
}
