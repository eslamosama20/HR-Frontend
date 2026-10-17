import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TranslationService } from 'src/app/modules/i18n';
import { PublicRoomTypeService } from 'src/app/services/public-booking/public-room-type.service';
import { PublicHotelService } from 'src/app/services/public-booking/public-hotel.service';
import { PublicRoomTypeModel } from 'src/app/models/public-booking/public-room-type.model';
import { PublicHotelModel } from 'src/app/models/public-booking/public-hotel.model';

@Component({
  selector: 'app-public-room-types-admin',
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
    TranslateModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './public-room-types-admin.component.html',
  styleUrl: './public-room-types-admin.component.scss'
})
export class PublicRoomTypesAdminComponent implements OnInit {
  roomTypesSignal = signal<PublicRoomTypeModel[]>([]);
  get roomTypes() {
    return this.roomTypesSignal();
  }
  set roomTypes(value: PublicRoomTypeModel[]) {
    this.roomTypesSignal.set(value);
  }

  hotelsSignal = signal<PublicHotelModel[]>([]);
  get hotels() {
    return this.hotelsSignal();
  }
  set hotels(value: PublicHotelModel[]) {
    this.hotelsSignal.set(value);
  }

  loadingSignal = signal(true);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  roomTypeDialogVisibleSignal = signal(false);
  get roomTypeDialogVisible() {
    return this.roomTypeDialogVisibleSignal();
  }
  set roomTypeDialogVisible(value: boolean) {
    this.roomTypeDialogVisibleSignal.set(value);
  }

  roomTypeFormGroup: FormGroup;
  selectedHotelId: string | null = null;

  bedTypeOptions = [
    { label: 'Single', value: 'Single' },
    { label: 'Double', value: 'Double' },
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

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public publicRoomTypeService: PublicRoomTypeService,
    public publicHotelService: PublicHotelService
  ) {
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
      images: [''],
      amenities: [''],
      viewType: [''],
      totalRooms: [1, [Validators.required, Validators.min(1)]],
      availableQuantity: [1, [Validators.required, Validators.min(0)]],
      isActive: [true],
      erpRoomTypeId: [null]
    });
  }

  ngOnInit(): void {
    this.loadHotels();
    this.loadRoomTypes();
  }

  loadHotels() {
    this.publicHotelService.getAllWithFilters({ isActive: true }).subscribe({
      next: (hotels) => {
        this.hotels = hotels || [];
      },
      error: (error) => {
        console.error('Error loading hotels:', error);
      }
    });
  }

  loadRoomTypes() {
    console.log('🔄 Loading room types...');
    this.loading = true;
    const filters = this.selectedHotelId 
      ? { hotelId: this.selectedHotelId, isActive: true } 
      : { isActive: true };
    
    this.publicRoomTypeService.getAllWithFilters(filters).subscribe({
      next: (roomTypes) => {
        console.log('✅ Room types loaded:', roomTypes?.length || 0, 'room types');
        this.roomTypes = roomTypes || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading room types:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room types'
        });
        this.loading = false;
      }
    });
  }

  filterByHotel(hotelId: string | null) {
    this.selectedHotelId = hotelId;
    this.loadRoomTypes();
  }

  openNew() {
    this.roomTypeFormGroup.reset({
      maxGuests: 2,
      numberOfBeds: 1,
      bedType: 'Double',
      basePrice: 0,
      totalRooms: 1,
      isActive: true,
      hotelId: this.selectedHotelId
    });
    this.roomTypeDialogVisible = true;
  }

  editRoomType(roomType: PublicRoomTypeModel) {
    console.log('📝 Editing room type:', roomType);
    console.log('Room Type ID:', roomType.id);
    this.roomTypeFormGroup.patchValue(roomType);
    this.roomTypeDialogVisible = true;
  }

  deleteRoomType(roomType: PublicRoomTypeModel) {
    console.log('🗑️ Deleting room type:', roomType);
    console.log('Room Type ID:', roomType.id);
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${roomType.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.publicRoomTypeService.delete(roomType.id).subscribe({
          next: (response) => {
            console.log('✅ Delete successful, response:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Successful',
              detail: 'Room Type Deleted',
              life: 3000
            });
            console.log('🔄 Calling loadRoomTypes() after delete...');
            this.loadRoomTypes();
          },
          error: (error) => {
            console.error('Error deleting room type:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete room type'
            });
          }
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

    const roomTypeData = this.roomTypeFormGroup.value;
    const isEdit = !!roomTypeData.id;

    console.log('💾 Saving room type:', roomTypeData);
    console.log('Is Edit?', isEdit);
    console.log('Room Type ID:', roomTypeData.id);

    // Create model instance
    const roomType = new PublicRoomTypeModel(roomTypeData);

    const operation = isEdit
      ? this.publicRoomTypeService.update(roomType)
      : this.publicRoomTypeService.create(roomType);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: `Room Type ${isEdit ? 'Updated' : 'Created'}`,
          life: 3000
        });
        this.roomTypeDialogVisible = false;
        this.loadRoomTypes();
      },
      error: (error) => {
        console.error('Error saving room type:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${isEdit ? 'update' : 'create'} room type`
        });
      }
    });
  }

  hideDialog() {
    this.roomTypeDialogVisible = false;
  }
}
