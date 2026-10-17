import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';
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
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { TranslationService } from 'src/app/modules/i18n';
import { PublicHotelService } from 'src/app/services/public-booking/public-hotel.service';
import { PublicHotelModel } from 'src/app/models/public-booking/public-hotel.model';
import { PublicPaidServiceService } from 'src/app/services/public-booking/public-paid-service.service';
import { PublicPaidServiceModel } from 'src/app/models/public-booking/public-paid-service.model';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-public-hotels-admin',
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
    DropdownModule,
    InputNumberModule,
    CheckboxModule,
    TranslateModule,
    FileUploadModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './public-hotels-admin.component.html',
  styleUrl: './public-hotels-admin.component.scss'
})
export class PublicHotelsAdminComponent implements OnInit {
  hotelsSignal = signal<PublicHotelModel[]>([]);
  get hotels() {
    return this.hotelsSignal();
  }
  set hotels(value: PublicHotelModel[]) {
    console.log('🔄 Setting hotels signal with', value?.length || 0, 'hotels');
    this.hotelsSignal.set(value);
  }

  loadingSignal = signal(true);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  hotelDialogVisibleSignal = signal(false);
  get hotelDialogVisible() {
    return this.hotelDialogVisibleSignal();
  }
  set hotelDialogVisible(value: boolean) {
    this.hotelDialogVisibleSignal.set(value);
  }

  hotelFormGroup: FormGroup;
  @ViewChild('fileUploader') fileUploader!: FileUpload;

  public activeLanguage: string = 'en';
  columns!: Column[];
  starsOptions = [1, 2, 3, 4, 5];
  
  // Paid Services
  availablePaidServicesSignal = signal<PublicPaidServiceModel[]>([]);
  get availablePaidServices() {
    return this.availablePaidServicesSignal();
  }
  set availablePaidServices(value: PublicPaidServiceModel[]) {
    this.availablePaidServicesSignal.set(value);
  }
  
  selectedPaidServicesSignal = signal<Map<string, { selected: boolean; price: number }>>(new Map());
  get selectedPaidServices() {
    return this.selectedPaidServicesSignal();
  }
  set selectedPaidServices(value: Map<string, { selected: boolean; price: number }>) {
    this.selectedPaidServicesSignal.set(value);
  }

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public publicHotelService: PublicHotelService,
    private publicPaidServiceService: PublicPaidServiceService
  ) {
    this.activeLanguage = translationService.getSelectedLanguage();

this.hotelFormGroup = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      nameAr: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      descriptionAr: ['', Validators.maxLength(500)],
      address: ['', Validators.maxLength(200)],
      addressAr: ['', Validators.maxLength(200)],
      city: ['', Validators.maxLength(50)],
      country: ['', Validators.maxLength(50)],
      stars: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      phone: ['', [Validators.pattern('^[+]?[0-9]{10,15}$')]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      website: ['', Validators.pattern('^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$')],
      mainImage: ['', Validators.pattern('^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp)$')],
      additionalImages: [''],
      amenities: ['', Validators.maxLength(1000)],
      checkInTime: ['14:00', [Validators.required, Validators.pattern('^([01]?[0-9]|2[0-3]):[0-5][0-9]$')]],
      checkOutTime: ['12:00', [Validators.required, Validators.pattern('^([01]?[0-9]|2[0-3]):[0-5][0-9]$')]],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      policies: ['', Validators.maxLength(1000)],
      isActive: [true],
      isFeatured: [false],
      erpHotelId: [null]
    });

    this.columns = [
      { field: 'mainImage', header: 'Image' },
      { field: 'name', header: 'Name' },
      { field: 'city', header: 'City' },
      { field: 'stars', header: 'Stars' },
      { field: 'isActive', header: 'Active' },
      { field: 'isFeatured', header: 'Featured' },
      { field: 'roomTypesCount', header: 'Rooms' }
    ];
  }

  ngOnInit(): void {
    this.loadHotels();
    this.loadPaidServices();
  }

  loadHotels() {
    console.log('🔄 Loading hotels...');
    this.loading = true;
    this.publicHotelService.getAllWithFilters({ isActive: true }).subscribe({
      next: (hotels) => {
        console.log('✅ Hotels loaded:', hotels?.length || 0, 'hotels');
        console.log('📦 Hotels data:', JSON.stringify(hotels, null, 2));
        console.log('🏨 Hotels IDs:', hotels?.map(h => h.id));
        console.log('🔵 Before assignment - Current hotels count:', this.hotels.length);
        this.hotels = hotels || [];
        console.log('🟢 After assignment - New hotels count:', this.hotels.length);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading hotels:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load hotels'
        });
        this.loading = false;
      }
    });
  }

  openNew() {
    this.hotelFormGroup.reset({
      stars: 3,
      isActive: true,
      isFeatured: false,
      checkInTime: '14:00',
      checkOutTime: '12:00'
    });
    this.selectedPaidServices = new Map();
    this.hotelDialogVisible = true;
  }

  editHotel(hotel: PublicHotelModel) {
    console.log('📝 Editing hotel:', hotel);
    console.log('Hotel ID:', hotel.id);
    console.log('Hotel Paid Services:', hotel.paidServices);
    this.hotelFormGroup.patchValue(hotel);
    
    // Load selected paid services
    const servicesMap = new Map<string, { selected: boolean; price: number }>();
    if (hotel.paidServices && hotel.paidServices.length > 0) {
      hotel.paidServices.forEach(service => {
        servicesMap.set(service.publicPaidServiceId, {
          selected: service.isActive,
          price: service.price || 0
        });
      });
    }
    this.selectedPaidServices = servicesMap;
    console.log('Selected services map:', this.selectedPaidServices);
    
    this.hotelDialogVisible = true;
  }

  deleteHotel(hotel: PublicHotelModel) {
    console.log('🗑️ Deleting hotel:', hotel);
    console.log('Hotel ID:', hotel.id);

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${hotel.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.publicHotelService.delete(hotel.id).subscribe({
          next: (response) => {
            console.log('✅ Delete successful, response:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Successful',
              detail: 'Hotel Deleted',
              life: 3000
            });
            console.log('🔄 Calling loadHotels() after delete...');
            this.loadHotels();
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
      // Mark all fields as touched to trigger validation messages
      this.markFormGroupTouched(this.hotelFormGroup);

      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    const hotelData = this.hotelFormGroup.value;
    const isEdit = !!hotelData.id;

    console.log('💾 Saving hotel:', hotelData);
    console.log('Is Edit?', isEdit);
    console.log('Hotel ID:', hotelData.id);
    console.log('Selected Paid Services:', this.selectedPaidServices);

    // Create model instance
    const hotel = new PublicHotelModel(hotelData);
    
    // Add paid services
    hotel.paidServices = [];
    this.selectedPaidServices.forEach((value, serviceId) => {
      if (value.selected) {
        hotel.paidServices.push({
          publicHotelId: hotelData.id, // Add hotel ID
          publicPaidServiceId: serviceId,
          price: value.price,
          isActive: true
        } as any);
      }
    });
    console.log('Hotel with paid services:', hotel);
    console.log('Paid services array:', JSON.stringify(hotel.paidServices));

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

  hideDialog() {
    this.hotelDialogVisible = false;
  }

  onUpload(event: any) {
    // Handle file upload - you'll need to implement image upload service
    console.log('File uploaded:', event);
  }

getStarsArray(stars: number): number[] {
    return Array(stars).fill(0);
  }

  // Validation helper methods
getErrorMessage(fieldName: string): string {
    const field = this.hotelFormGroup.get(fieldName);
  const fieldKey = this.getFieldTranslationKey(fieldName);
  if (field?.errors && field.touched) {
      if (field.errors['required']) {
        // Map field names to correct translation keys
        return this.getTranslation(fieldKey + '_REQUIRED');
      }
      if (field.errors['min']) {
        return this.getTranslation(fieldKey + '_MIN_VALUE');
      }
      if (field.errors['max']) {
        return this.getTranslation(fieldKey + '_MAX_VALUE');
      }
      if (field.errors['email']) {
        return this.getTranslation('EMAIL_INVALID');
      }
      if (field.errors['pattern']) {
        return this.getTranslation(fieldKey + '_INVALID');
      }
      if (field.errors['minlength']) {
        return this.translateService.instant('DATA.VALIDATION.MINLENGTH', { value: field.errors['minlength'].requiredLength });
      }
      if (field.errors['maxlength']) {
        return this.translateService.instant('DATA.VALIDATION.MAXLENGTH', { value: field.errors['maxlength'].requiredLength });
      }
    }
    return '';
  }

  private getFieldTranslationKey(fieldName: string): string {
    // Map form field names to translation keys
    switch (fieldName) {
      case 'name':
        return 'HOTEL_NAME';
      case 'nameAr':
        return 'ARABIC_NAME';
      case 'stars':
        return 'STARS';
      case 'checkInTime':
        return 'CHECK_IN_TIME';
      case 'checkOutTime':
        return 'CHECK_OUT_TIME';
      case 'email':
        return 'EMAIL';
      case 'phone':
        return 'PHONE';
      case 'website':
        return 'WEBSITE';
      case 'mainImage':
        return 'MAIN_IMAGE';
      case 'latitude':
        return 'LATITUDE';
      case 'longitude':
        return 'LONGITUDE';
      default:
        return fieldName.toUpperCase();
    }
  }

private getTranslation(key: string): string {
    const fullKey = 'DATA.' + key;
    const translation = this.translateService.instant(fullKey);

    // If translation key not found, return a default message
    if (translation === fullKey) {
      // Handle specific cases for better fallback messages
      switch (key) {
        case 'HOTEL_NAME_REQUIRED':
          return this.translateService.instant('DATA.ENGLISH_NAME_IS_REQUIRED');
        case 'STARS_REQUIRED':
          return this.translateService.instant('DATA.VALIDATION.REQUIRED');
        case 'EMAIL_INVALID':
          return this.translateService.instant('DATA.EMAIL_INVALID_FORMAT');
        case 'PHONE_INVALID':
          return 'Phone number is invalid';
        case 'WEBSITE_INVALID':
          return 'Website URL is invalid';
        case 'MAIN_IMAGE_INVALID':
          return 'Image URL is invalid';
        case 'CHECK_IN_TIME_REQUIRED':
        case 'CHECK_OUT_TIME_REQUIRED':
          return this.translateService.instant('DATA.VALIDATION.REQUIRED');
        case 'CHECK_IN_TIME_INVALID':
          return 'Check-in time must be in HH:MM format';
        case 'CHECK_OUT_TIME_INVALID':
          return 'Check-out time must be in HH:MM format';
        case 'LATITUDE_INVALID':
          return 'Latitude must be between -90 and 90';
        case 'LONGITUDE_INVALID':
          return 'Longitude must be between -180 and 180';
        default:
          return translation;
      }
    }

    return translation;
  }

  // Paid Services Methods
  loadPaidServices() {
    console.log('🔄 Loading paid services...');
    this.publicPaidServiceService.getAllActive().subscribe({
      next: (services) => {
        console.log('✅ Paid services loaded:', services?.length || 0);
        this.availablePaidServices = services || [];
      },
      error: (error) => {
        console.error('❌ Error loading paid services:', error);
      }
    });
  }

  togglePaidService(serviceId: string, event: any) {
    const currentMap = new Map(this.selectedPaidServices);
    const isChecked = event.checked || event.target?.checked;
    
    if (isChecked) {
      const existingService = currentMap.get(serviceId);
      currentMap.set(serviceId, {
        selected: true,
        price: existingService?.price || 0
      });
    } else {
      currentMap.delete(serviceId);
    }
    
    this.selectedPaidServices = currentMap;
    console.log('Updated selected services:', this.selectedPaidServices);
  }

  updateServicePrice(serviceId: string, price: number) {
    const currentMap = new Map(this.selectedPaidServices);
    const service = currentMap.get(serviceId);
    
    if (service) {
      currentMap.set(serviceId, {
        ...service,
        price: price
      });
      this.selectedPaidServices = currentMap;
      console.log('Updated service price:', serviceId, price);
    }
  }

  isServiceSelected(serviceId: string): boolean {
    return this.selectedPaidServices.get(serviceId)?.selected || false;
  }

  getServicePrice(serviceId: string): number {
    return this.selectedPaidServices.get(serviceId)?.price || 0;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.hotelFormGroup.get(fieldName);
    return field ? field.invalid && (field.touched || field.dirty) : false;
  }

private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control) {
        control.markAsTouched({ onlySelf: true });
      }
    });
  }

  // Search functionality with trim
  onSearchChange(event: any, dt: Table) {
    const searchValue = event.target.value.trim();
    dt.filterGlobal(searchValue, 'contains');
  }

  // Clear search
  clearSearch(dt: Table) {
    dt.filterGlobal('', 'contains');
  }
}
