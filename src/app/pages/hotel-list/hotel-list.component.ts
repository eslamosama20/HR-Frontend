import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PublicHotelModel, HotelSearchFilters } from 'src/app/models/public-hotel/public-hotel.model';
import { PublicHotelService } from 'src/app/services/public-hotel/public-hotel.service';
import { CarouselModule } from 'primeng/carousel';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { RatingModule } from 'primeng/rating';

interface Amenity {
  name: string;
  icon: string;
  checked: boolean;
}

@Component({
  selector: 'app-hotel-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CarouselModule,
    SliderModule,
    CheckboxModule,
    DropdownModule,
    ButtonModule,
    CalendarModule,
    InputNumberModule,
    TagModule,
    RatingModule
  ],
  templateUrl: './hotel-list.component.html',
  styleUrl: './hotel-list.component.scss'
})
export class HotelListComponent implements OnInit {
  hotels: PublicHotelModel[] = [];
  filteredHotels: PublicHotelModel[] = [];
  loading = false;
  
  today = new Date();

  searchFilters: HotelSearchFilters = {
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000), // +1 day
    numberOfGuests: 2,
    numberOfRooms: 1
  };

  cities: string[] = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الطائف'];
  selectedCity: string = '';
  selectedStars: number[] = [];
  priceRange: number[] = [0, 5000];
  minPrice: number = 0;
  maxPrice: number = 5000;
  sortBy: 'price' | 'stars' | 'rating' | 'name' = 'stars';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Amenities filters
  amenities: Amenity[] = [
    { name: 'واي فاي', icon: 'pi pi-wifi', checked: false },
    { name: 'مسبح', icon: 'pi pi-sun', checked: false },
    { name: 'موقف سيارات', icon: 'pi pi-car', checked: false },
    { name: 'مطعم', icon: 'pi pi-shopping-bag', checked: false },
    { name: 'صالة رياضية', icon: 'pi pi-heart', checked: false },
    { name: 'سبا', icon: 'pi pi-star', checked: false }
  ];

  sortOptions = [
    { label: 'السعر: الأقل أولاً', value: 'price-asc' },
    { label: 'السعر: الأعلى أولاً', value: 'price-desc' },
    { label: 'التقييم: الأعلى أولاً', value: 'rating-desc' },
    { label: 'النجوم: الأعلى أولاً', value: 'stars-desc' },
    { label: 'الاسم', value: 'name-asc' }
  ];
  selectedSort: string = 'stars-desc';

  starOptions = [5, 4, 3, 2, 1];
  
  carouselResponsiveOptions = [
    { breakpoint: '1024px', numVisible: 1, numScroll: 1 },
    { breakpoint: '768px', numVisible: 1, numScroll: 1 },
    { breakpoint: '560px', numVisible: 1, numScroll: 1 }
  ];

  constructor(
    private hotelService: PublicHotelService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadHotels();
  }

  loadHotels(): void {
    this.loading = true;
    this.hotelService.getAll().subscribe({
      next: (response: any) => {
        this.hotels = response?.data || response || [];
        this.filteredHotels = this.hotels;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading hotels:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.hotels];

    // City filter
    if (this.selectedCity) {
      filtered = filtered.filter(h => h.city === this.selectedCity);
    }

    // Stars filter (multi-select)
    if (this.selectedStars && this.selectedStars.length > 0) {
      filtered = filtered.filter(h => this.selectedStars.includes(h.stars));
    }

    // Price range filter
    filtered = filtered.filter(h => {
      const minRoomPrice = h.roomTypes && h.roomTypes.length > 0 
        ? Math.min(...h.roomTypes.map(r => r.basePrice))
        : 0;
      return minRoomPrice >= this.priceRange[0] && minRoomPrice <= this.priceRange[1];
    });

    // Amenities filter
    const selectedAmenities = this.amenities.filter(a => a.checked).map(a => a.name);
    if (selectedAmenities.length > 0) {
      filtered = filtered.filter(h => {
        const hotelAmenities = h.amenities || [];
        return selectedAmenities.every(amenity => hotelAmenities.includes(amenity));
      });
    }

    // Sorting
    this.applySorting(filtered);

    this.filteredHotels = filtered;
  }

  applySorting(hotels: PublicHotelModel[]): void {
    const [sortBy, sortOrder] = this.selectedSort.split('-');
    
    hotels.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'price':
          const priceA = this.getMinPrice(a);
          const priceB = this.getMinPrice(b);
          compareValue = priceA - priceB;
          break;
        case 'stars':
          compareValue = a.stars - b.stars;
          break;
        case 'rating':
          compareValue = (a.averageRating || 0) - (b.averageRating || 0);
          break;
        case 'name':
          compareValue = a.name.localeCompare(b.name, 'ar');
          break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onPriceRangeChange(): void {
    this.applyFilters();
  }

  onStarFilterChange(): void {
    this.applyFilters();
  }

  onAmenityChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedCity = '';
    this.selectedStars = [];
    this.priceRange = [0, 5000];
    this.amenities.forEach(a => a.checked = false);
    this.applyFilters();
  }

  viewHotelDetails(hotelId: string): void {
    this.router.navigate(['/hotel-details', hotelId], {
      queryParams: {
        checkIn: this.searchFilters.checkInDate?.toISOString(),
        checkOut: this.searchFilters.checkOutDate?.toISOString(),
        guests: this.searchFilters.numberOfGuests,
        rooms: this.searchFilters.numberOfRooms
      }
    });
  }

  getMinPrice(hotel: PublicHotelModel): number {
    if (!hotel.roomTypes || hotel.roomTypes.length === 0) return 0;
    return Math.min(...hotel.roomTypes.map(r => r.basePrice));
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getHotelImages(hotel: PublicHotelModel): string[] {
    const images: string[] = [];
    
    // Add main image
    if (hotel.mainImageUrl) {
      images.push(hotel.mainImageUrl);
    }
    
    // Add additional images
    if (hotel.additionalImageUrls) {
      try {
        const additionalUrls = JSON.parse(hotel.additionalImageUrls);
        if (Array.isArray(additionalUrls)) {
          additionalUrls.forEach((url: string) => {
            if (url) images.push(url);
          });
        }
      } catch (e) {}
    }
    
    // Add room images
    if (hotel.roomTypes) {
      hotel.roomTypes.forEach(room => {
        if (room.mainImageUrl) images.push(room.mainImageUrl);
      });
    }
    
    return images.slice(0, 10); // Max 10 images for carousel
  }

  hasAmenity(hotel: PublicHotelModel, amenityName: string): boolean {
    return hotel.amenities?.includes(amenityName) || false;
  }

  calculateNights(): number {
    if (!this.searchFilters.checkInDate || !this.searchFilters.checkOutDate) return 1;
    const diffTime = Math.abs(this.searchFilters.checkOutDate.getTime() - this.searchFilters.checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }
}
