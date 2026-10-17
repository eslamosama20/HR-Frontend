import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PublicHotelModel } from 'src/app/models/public-hotel/public-hotel.model';
import { PublicHotelService } from 'src/app/services/public-hotel/public-hotel.service';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-home.component.html',
  styleUrl: './public-home.component.scss'
})
export class PublicHomeComponent implements OnInit {
  featuredHotels: PublicHotelModel[] = [];
  loading = false;

  searchData = {
    city: '',
    checkIn: new Date(),
    checkOut: new Date(Date.now() + 86400000),
    guests: 2
  };

  cities = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الطائف'];

  constructor(
    private hotelService: PublicHotelService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeaturedHotels();
  }

  loadFeaturedHotels(): void {
    this.loading = true;
    this.hotelService.getFeaturedHotels(6).subscribe({
      next: (hotels) => {
        this.featuredHotels = hotels;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading featured hotels:', error);
        this.loading = false;
      }
    });
  }

  searchHotels(): void {
    this.router.navigate(['/hotels'], {
      queryParams: {
        city: this.searchData.city,
        checkIn: this.searchData.checkIn.toISOString(),
        checkOut: this.searchData.checkOut.toISOString(),
        guests: this.searchData.guests
      }
    });
  }

  viewHotel(hotelId: string): void {
    this.router.navigate(['/hotel-details', hotelId]);
  }

  getStarsArray(count: number): number[] {
    return Array(count).fill(0);
  }

  getMinPrice(hotel: PublicHotelModel): number {
    if (!hotel.roomTypes || hotel.roomTypes.length === 0) return 0;
    return Math.min(...hotel.roomTypes.map(r => r.basePrice));
  }
}
