import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicHotelModel, PublicRoomTypeModel } from 'src/app/models/public-hotel/public-hotel.model';
import { PublicHotelService } from 'src/app/services/public-hotel/public-hotel.service';
import { PublicRoomTypeService } from 'src/app/services/public-room-type/public-room-type.service';
import { PublicBookingService } from 'src/app/services/public-booking/public-booking.service';
import { GalleriaModule } from 'primeng/galleria';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';
import { DividerModule } from 'primeng/divider';
import { DataViewModule } from 'primeng/dataview';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';

interface ImageItem {
  previewImageSrc: string;
  thumbnailImageSrc: string;
  alt: string;
}

@Component({
  selector: 'app-hotel-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GalleriaModule,
    TabViewModule,
    CardModule,
    ButtonModule,
    TagModule,
    RatingModule,
    DividerModule,
    DataViewModule,
    InputNumberModule,
    CalendarModule
  ],
  templateUrl: './hotel-details.component.html',
  styleUrl: './hotel-details.component.scss'
})
export class HotelDetailsComponent implements OnInit {
  hotel: PublicHotelModel | null = null;
  roomTypes: PublicRoomTypeModel[] = [];
  loading = false;
  hotelId: string = '';

  // Search params from navigation
  checkInDate: Date = new Date();
  checkOutDate: Date = new Date(Date.now() + 86400000);
  numberOfGuests: number = 2;
  numberOfRooms: number = 1;

  // Selected rooms for booking
  selectedRooms: Map<string, number> = new Map();
  
  // Gallery images
  images: ImageItem[] = [];
  activeIndex: number = 0;
  displayCustom: boolean = false;

  // Tab tracking
  activeTabIndex: number = 0;

  // Galleria responsive options
  responsiveOptions: any[] = [
    { breakpoint: '1024px', numVisible: 5 },
    { breakpoint: '768px', numVisible: 3 },
    { breakpoint: '560px', numVisible: 1 }
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private hotelService: PublicHotelService,
    private roomTypeService: PublicRoomTypeService,
    private bookingService: PublicBookingService
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
    this.hotelService.get(this.hotelId).subscribe({
      next: (response) => {
        this.hotel = response.data;
        this.prepareGalleryImages();
        this.loadRoomTypes();
      },
      error: (error) => {
        console.error('Error loading hotel:', error);
        this.loading = false;
      }
    });
  }

  prepareGalleryImages(): void {
    this.images = [];
    
    // Add main image
    if (this.hotel?.mainImageUrl) {
      this.images.push({
        previewImageSrc: this.hotel.mainImageUrl,
        thumbnailImageSrc: this.hotel.mainImageUrl,
        alt: this.hotel.name
      });
    }

    // Add additional images from JSON string
    if (this.hotel?.additionalImageUrls) {
      try {
        const additionalUrls = JSON.parse(this.hotel.additionalImageUrls);
        if (Array.isArray(additionalUrls)) {
          additionalUrls.forEach((url: string, index: number) => {
            if (url) {
              this.images.push({
                previewImageSrc: url,
                thumbnailImageSrc: url,
                alt: `${this.hotel?.name} - Image ${index + 2}`
              });
            }
          });
        }
      } catch (e) {}
    }

    // Add room images
    if (this.hotel?.roomTypes) {
      this.hotel.roomTypes.forEach((room) => {
        if (room.mainImageUrl) {
          this.images.push({
            previewImageSrc: room.mainImageUrl,
            thumbnailImageSrc: room.mainImageUrl,
            alt: room.name
          });
        }
      });
    }
  }

  loadRoomTypes(): void {
    this.roomTypeService.getHotelRooms(this.hotelId).subscribe({
      next: (response) => {
        this.roomTypes = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rooms:', error);
        this.loading = false;
      }
    });
  }

  selectRoom(roomTypeId: string, quantity: number): void {
    if (quantity > 0) {
      this.selectedRooms.set(roomTypeId, quantity);
    } else {
      this.selectedRooms.delete(roomTypeId);
    }
  }

  getRoomQuantity(roomTypeId: string): number {
    return this.selectedRooms.get(roomTypeId) || 0;
  }

  getTotalPrice(): number {
    let total = 0;
    const nights = this.getNumberOfNights();
    
    this.selectedRooms.forEach((quantity, roomTypeId) => {
      const room = this.roomTypes.find(r => r.id === roomTypeId);
      if (room) {
        total += room.basePrice * quantity * nights;
      }
    });
    
    return total;
  }

  getNumberOfNights(): number {
    const diff = this.checkOutDate.getTime() - this.checkInDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  proceedToBooking(): void {
    if (this.selectedRooms.size === 0) {
      alert('الرجاء اختيار غرفة واحدة على الأقل');
      return;
    }

    const bookingData = {
      hotelId: this.hotelId,
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      numberOfGuests: this.numberOfGuests,
      selectedRooms: Array.from(this.selectedRooms.entries()).map(([roomTypeId, quantity]) => ({
        roomTypeId,
        quantity
      })),
      totalAmount: this.getTotalPrice()
    };

    // Navigate to booking form with data
    this.router.navigate(['/booking-form'], {
      queryParams: { data: JSON.stringify(bookingData) }
    });
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  parseImages(imagesJson: string | undefined): string[] {
    if (!imagesJson) return [];
    try {
      return JSON.parse(imagesJson);
    } catch {
      return [];
    }
  }

  parseAmenities(amenitiesJson: string | undefined): string[] {
    if (!amenitiesJson) return [];
    try {
      return JSON.parse(amenitiesJson);
    } catch {
      return [];
    }
  }

  imageClick(index: number): void {
    this.activeIndex = index;
    this.displayCustom = true;
  }

  getAmenityIcon(amenity: string): string {
    const iconMap: {[key: string]: string} = {
      'واي فاي': 'pi-wifi',
      'مسبح': 'pi-sun',
      'موقف سيارات': 'pi-car',
      'مطعم': 'pi-shopping-bag',
      'صالة رياضية': 'pi-heart',
      'سبا': 'pi-star',
      'تكييف': 'pi-cloud',
      'خدمة الغرف': 'pi-phone',
      'مصعد': 'pi-arrow-up',
      'خدمة تنظيف': 'pi-check-circle'
    };
    return `pi ${iconMap[amenity] || 'pi-check'}`;
  }

  getRoomFeatures(room: PublicRoomTypeModel): string[] {
    const features = [];
    if (room.maxGuests) features.push(`${room.maxGuests} أشخاص`);
    if (room.numberOfBeds) features.push(`${room.numberOfBeds} سرير`);
    if (room.sizeInSqMeters) features.push(`${room.sizeInSqMeters} م²`);
    return features;
  }

  incrementRoomQuantity(roomTypeId: string): void {
    const current = this.getRoomQuantity(roomTypeId);
    const room = this.roomTypes.find(r => r.id === roomTypeId);
    if (room && current < (room.availableQuantity || 10)) {
      this.selectRoom(roomTypeId, current + 1);
    }
  }

  decrementRoomQuantity(roomTypeId: string): void {
    const current = this.getRoomQuantity(roomTypeId);
    if (current > 0) {
      this.selectRoom(roomTypeId, current - 1);
    }
  }

  hasSelectedRooms(): boolean {
    return this.selectedRooms.size > 0;
  }
}
