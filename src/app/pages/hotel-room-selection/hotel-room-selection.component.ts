import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicHotelModel } from 'src/app/models/public-booking/public-hotel.model';
import { PublicRoomTypeModel } from 'src/app/models/public-booking/public-room-type.model';
import { PublicHotelService } from 'src/app/services/public-booking/public-hotel.service';
import { PublicRoomTypeService } from 'src/app/services/public-booking/public-room-type.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { TableModule } from 'primeng/table';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';
import { FormsModule } from '@angular/forms';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@Component({
  selector: 'app-hotel-room-selection',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    RatingModule,
    TableModule,
    GalleriaModule,
    ImageModule
  ],
  templateUrl: './hotel-room-selection.component.html',
  styleUrl: './hotel-room-selection.component.scss'
})
export class HotelRoomSelectionComponent implements OnInit {
  hotel: PublicHotelModel | null = null;
  roomTypes: PublicRoomTypeModel[] = [];
  filteredRoomTypes: PublicRoomTypeModel[] = [];
  hotelImages: string[] = [];
  displayGalleria: boolean = false;
  loading = true;
  hotelId: string = '';

  // Filter properties
  filterMaxPrice: number = 10000;
  filterMinGuests: number = 1;
  filterViewType: string = '';
  filterPaymentOption: string = '';
  viewTypes: string[] = [];

  // Search params from navigation
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  numberOfGuests: number = 2;
  numberOfRooms: number = 1;

  responsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 5
    },
    {
      breakpoint: '768px',
      numVisible: 3
    },
    {
      breakpoint: '560px',
      numVisible: 1
    }
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private hotelService: PublicHotelService,
    private roomTypeService: PublicRoomTypeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.hotelId = params['id'];
      this.loadHotelDetails();
    });

    this.route.queryParams.subscribe(params => {
      if (params['checkIn']) this.checkInDate = new Date(params['checkIn']);
      if (params['checkOut']) this.checkOutDate = new Date(params['checkOut']);
      if (params['guests']) this.numberOfGuests = +params['guests'];
      if (params['rooms']) this.numberOfRooms = +params['rooms'];
    });
  }

  loadHotelDetails(): void {
    this.loading = true;
    console.log('🔵 Loading hotel for ID:', this.hotelId);
    this.hotelService.getById(this.hotelId).subscribe({
      next: (hotel) => {
        console.log('✅ Hotel loaded:', hotel);
        console.log('📸 Hotel additionalImageUrls:', hotel.additionalImageUrls);
        console.log('📸 Hotel mainImageUrl:', hotel.mainImageUrl);
        this.hotel = hotel;
        this.parseHotelImages();
        this.loadRoomTypes();
      },
      error: (error) => {
        console.error('❌ Error loading hotel:', error);
        this.loading = false;
      }
    });
  }

  loadRoomTypes(): void {
    console.log('🔵 Loading room types for hotel:', this.hotelId);
    this.roomTypeService.getAllWithFilters({ hotelId: this.hotelId, isActive: true }).subscribe({
      next: (rooms) => {
        console.log('✅ Room types loaded:', rooms);
        this.roomTypes = rooms;
        this.filteredRoomTypes = rooms;
        this.initializeFilters();
        this.loading = false;
        console.log('✅ Loading complete. Hotel:', this.hotel?.id, 'Rooms:', this.roomTypes.length);
        this.cdr.detectChanges();
        console.log('✅ Change detection triggered');
      },
      error: (error) => {
        console.error('❌ Error loading rooms:', error);
        this.loading = false;
      }
    });
  }

  parseHotelImages(): void {
    console.log('🔵 Starting parseHotelImages...');
    console.log('📸 hotel object:', this.hotel);
    console.log('📸 mainImageUrl exists?', !!this.hotel?.mainImageUrl);
    console.log('📸 mainImageUrl length:', this.hotel?.mainImageUrl?.length);
    console.log('📸 additionalImageUrls exists?', !!this.hotel?.additionalImageUrls);
    console.log('📸 additionalImageUrls length:', this.hotel?.additionalImageUrls?.length);
    
    this.hotelImages = [];
    
    // Add main image first if available
    if (this.hotel?.mainImageUrl && this.hotel.mainImageUrl.trim() !== '') {
      const mainImg = this.hotel.mainImageUrl.trim();
      console.log('📸 Processing mainImageUrl:', mainImg.substring(0, 100));
      this.hotelImages.push(mainImg);
      console.log('✅ MainImage added');
    }
    
    // Process additional images
    if (this.hotel?.additionalImageUrls && this.hotel.additionalImageUrls.trim() !== '') {
      try {
        const additionalUrls = JSON.parse(this.hotel.additionalImageUrls);
        console.log('✅ Parsed additionalImageUrls as JSON successfully');
        
        if (Array.isArray(additionalUrls)) {
          additionalUrls.forEach((url, index) => {
            if (url && typeof url === 'string' && url.trim() !== '') {
              this.hotelImages.push(url.trim());
              console.log(`✅ Image ${index}: added URL`);
            }
          });
        }
      } catch (error) {
        console.log('⚠️ Could not parse additionalImageUrls as JSON:', error);
      }
    }
    
    console.log('📸 Final parsed hotel images:', this.hotelImages.length, 'images');
    if (this.hotelImages.length > 0) {
      console.log('📸 First image preview:', this.hotelImages[0].substring(0, 100));
    } else {
      console.log('⚠️ No images found!');
    }
  }

  getAmenities(): string[] {
    if (!this.hotel?.amenities) return [];
    try {
      return JSON.parse(this.hotel.amenities);
    } catch {
      return [];
    }
  }

  getAmenityLabel(key: string): string {
    const labels: any = {
      'private_parking': 'موقف سيارات خاص',
      'accessibility': 'مرافق لذوي الاحتياجات الخاصة',
      'room_service': 'خدمة الغرف',
      'non_smoking': 'غرف لغير المدخنين',
      '24_7_reception': 'مكتب استقبال 24 ساعة',
      'family_rooms': 'غرف عائلية',
      'free_wifi': 'واي فاي مجاني',
      'restaurants': 'مطاعم',
      'breakfast': 'إفطار',
      'pool': 'مسبح',
      'gym': 'نادي رياضي',
      'spa': 'سبا',
      'business_center': 'مركز أعمال'
    };
    return labels[key] || key;
  }

  getAmenityIcon(key: string): string {
    const icons: any = {
      'private_parking': 'pi-car',
      'accessibility': 'pi-wheelchair',
      'room_service': 'pi-bell',
      'non_smoking': 'pi-ban',
      '24_7_reception': 'pi-clock',
      'family_rooms': 'pi-users',
      'free_wifi': 'pi-wifi',
      'restaurants': 'pi-shopping-bag',
      'breakfast': 'pi-coffee',
      'pool': 'pi-circle',
      'gym': 'pi-heart',
      'spa': 'pi-star',
      'business_center': 'pi-briefcase'
    };
    return icons[key] || 'pi-check';
  }

  initializeFilters(): void {
    // Extract unique view types
    this.viewTypes = [...new Set(this.roomTypes.map(r => r.viewType).filter(v => v))] as string[];
    
    // Set max price based on available rooms
    const prices = this.roomTypes.map(r => this.calculateTotalPrice(r));
    this.filterMaxPrice = Math.max(...prices, 1000);
  }

  applyFilters(): void {
    console.log('🔍 تطبيق الفلاتر:', {
      'السعر الأقصى': this.filterMaxPrice,
      'عدد الضيوف المطلوب': this.filterMinGuests,
      'نوع الإطلالة': this.filterViewType,
      'خيار الدفع': this.filterPaymentOption
    });

    this.filteredRoomTypes = this.roomTypes.filter(room => {
      const price = this.calculateTotalPrice(room);
      
      // Price filter - room price must be less than or equal to max price
      if (price > this.filterMaxPrice) {
        console.log(`❌ الغرفة ${room.nameAr} مرفوضة: السعر ${price.toFixed(2)} ريال أكبر من الحد الأقصى ${this.filterMaxPrice} ريال`);
        return false;
      }
      
      // Guests filter - room must accommodate EXACTLY the required number
      // إذا اختار المستخدم 2 ضيف، نعرض الغرف التي تستوعب 2 فقط (maxGuests == 2)
      if (this.filterMinGuests > 0 && room.maxGuests !== this.filterMinGuests) {
        console.log(`❌ الغرفة ${room.nameAr} مرفوضة: تستوعب ${room.maxGuests} ضيف، المطلوب ${this.filterMinGuests} ضيف بالضبط`);
        return false;
      }
      
      // View type filter
      if (this.filterViewType && room.viewType !== this.filterViewType) {
        console.log(`❌ الغرفة ${room.nameAr} مرفوضة: الإطلالة "${room.viewType}" لا تطابق المطلوب "${this.filterViewType}"`);
        return false;
      }
      
      // Payment option filter
      if (this.filterPaymentOption === 'payNow' && !room.payNow) {
        console.log(`❌ الغرفة ${room.nameAr} مرفوضة: لا تدعم الدفع الآن`);
        return false;
      }
      if (this.filterPaymentOption === 'payAtHotel' && !room.payAtHotel) {
        console.log(`❌ الغرفة ${room.nameAr} مرفوضة: لا تدعم الدفع في الفندق`);
        return false;
      }
      
      console.log(`✅ الغرفة ${room.nameAr} مقبولة - السعر: ${price.toFixed(2)} ريال، تستوعب: ${room.maxGuests} ضيف`);
      return true;
    });

    console.log(`📊 نتائج التصفية: ${this.filteredRoomTypes.length} غرفة تطابق المعايير من أصل ${this.roomTypes.length} غرفة`);
  }

  resetFilters(): void {
    this.filterMaxPrice = Math.max(...this.roomTypes.map(r => this.calculateTotalPrice(r)), 1000);
    this.filterMinGuests = 1;
    this.filterViewType = '';
    this.filterPaymentOption = '';
    this.filteredRoomTypes = this.roomTypes;
  }

  calculateTotalPrice(room: PublicRoomTypeModel): number {
    const basePrice = room.basePrice || 0;
    const viewPrice = room.viewPrice || 0;
    const subtotal = basePrice + viewPrice;
    const municipalityTax = subtotal * ((room.municipalityTaxPercentage || 0) / 100);
    const totalBeforeVAT = subtotal + municipalityTax;
    const vat = totalBeforeVAT * 0.15; // 15% VAT
    return totalBeforeVAT + vat;
  }

  getTaxesAndFees(room: PublicRoomTypeModel): number {
    const basePrice = room.basePrice || 0;
    const viewPrice = room.viewPrice || 0;
    const subtotal = basePrice + viewPrice;
    const municipalityTax = subtotal * ((room.municipalityTaxPercentage || 0) / 100);
    const totalBeforeVAT = subtotal + municipalityTax;
    const vat = totalBeforeVAT * 0.15;
    return municipalityTax + vat;
  }

  selectRoom(roomTypeId: string, paymentOption: 'payNow' | 'payAtHotel'): void {
    console.log('🎯 Navigating to booking form with:', {
      hotelId: this.hotelId,
      roomTypeId,
      paymentOption,
      checkIn: this.checkInDate,
      checkOut: this.checkOutDate,
      guests: this.numberOfGuests,
      rooms: this.numberOfRooms
    });

    // Navigate to the booking form page (NOT the landing page)
    // The landing page is at /booking, but we want the actual booking form
    // Since /booking is the PublicBookingModule which contains PublicBookingFormComponent
    // We need to navigate there with proper query params that will trigger the checkout form
    this.router.navigate(['/booking'], {
      queryParams: {
        hotelId: this.hotelId,
        roomTypeId: roomTypeId,
        paymentOption: paymentOption,
        checkIn: this.checkInDate?.toISOString(),
        checkOut: this.checkOutDate?.toISOString(),
        guests: this.numberOfGuests,
        rooms: this.numberOfRooms,
        showCheckout: 'true' // Flag to show checkout form immediately
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/booking']);
  }

  showImageGallery(): void {
    this.displayGalleria = true;
  }
}
