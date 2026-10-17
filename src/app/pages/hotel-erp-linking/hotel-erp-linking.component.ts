import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicHotelService } from 'src/app/services/public-hotel/public-hotel.service';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import { PublicRoomTypeService } from 'src/app/services/public-room-type/public-room-type.service';

@Component({
  selector: 'app-hotel-erp-linking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-erp-linking.component.html',
  styleUrl: './hotel-erp-linking.component.scss'
})
export class HotelErpLinkingComponent implements OnInit {
  publicHotels: any[] = [];
  erpHotels: any[] = [];
  publicRoomTypes: any[] = [];
  erpRoomTypes: any[] = [];
  
  selectedPublicHotel: any = null;
  selectedErpHotel: any = null;
  selectedPublicRoomType: any = null;
  selectedErpRoomType: any = null;
  
  loading = false;
  activeTab: 'hotels' | 'roomTypes' = 'hotels';

  constructor(
    private publicHotelService: PublicHotelService,
    private erpHotelService: HotelService,
    private publicRoomTypeService: PublicRoomTypeService,
    private erpRoomTypeService: RoomTypeService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    // Load Public Hotels
    this.publicHotelService.getAll().subscribe({
      next: (response: any) => {
        this.publicHotels = response?.data || response || [];
      },
      error: (error) => console.error('Error loading public hotels:', error)
    });

    // Load ERP Hotels
    this.erpHotelService.getAll().subscribe({
      next: (response: any) => {
        this.erpHotels = response?.data || response || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading ERP hotels:', error);
        this.loading = false;
      }
    });
  }

  loadRoomTypes(publicHotelId?: string): void {
    if (publicHotelId) {
      this.publicRoomTypeService.getByHotel(publicHotelId).subscribe({
        next: (response: any) => {
          this.publicRoomTypes = response?.data || response || [];
        },
        error: (error) => console.error('Error loading public room types:', error)
      });
    }

    this.erpRoomTypeService.getAll().subscribe({
      next: (response: any) => {
        this.erpRoomTypes = response?.data || response || [];
      },
      error: (error) => console.error('Error loading ERP room types:', error)
    });
  }

  linkHotel(): void {
    if (!this.selectedPublicHotel || !this.selectedErpHotel) {
      alert('الرجاء اختيار فندق عام وفندق ERP');
      return;
    }

    this.loading = true;
    this.publicHotelService.linkToErpHotel(this.selectedPublicHotel.id, this.selectedErpHotel.id).subscribe({
      next: () => {
        alert('تم ربط الفندق بنجاح');
        this.loadData();
        this.selectedPublicHotel = null;
        this.selectedErpHotel = null;
      },
      error: (error) => {
        console.error('Error linking hotel:', error);
        alert('حدث خطأ أثناء ربط الفندق');
        this.loading = false;
      }
    });
  }

  unlinkHotel(publicHotelId: string): void {
    if (confirm('هل أنت متأكد من فك ربط هذا الفندق؟')) {
      this.loading = true;
      this.publicHotelService.unlinkFromErpHotel(publicHotelId).subscribe({
        next: () => {
          alert('تم فك ربط الفندق بنجاح');
          this.loadData();
        },
        error: (error) => {
          console.error('Error unlinking hotel:', error);
          alert('حدث خطأ أثناء فك ربط الفندق');
          this.loading = false;
        }
      });
    }
  }

  linkRoomType(): void {
    if (!this.selectedPublicRoomType || !this.selectedErpRoomType) {
      alert('الرجاء اختيار نوع غرفة عام ونوع غرفة ERP');
      return;
    }

    this.loading = true;
    this.publicRoomTypeService.linkToErpRoomType(this.selectedPublicRoomType.id, this.selectedErpRoomType.id).subscribe({
      next: () => {
        alert('تم ربط نوع الغرفة بنجاح');
        this.loadRoomTypes(this.selectedPublicHotel?.id);
        this.selectedPublicRoomType = null;
        this.selectedErpRoomType = null;
      },
      error: (error) => {
        console.error('Error linking room type:', error);
        alert('حدث خطأ أثناء ربط نوع الغرفة');
        this.loading = false;
      }
    });
  }

  unlinkRoomType(publicRoomTypeId: string): void {
    if (confirm('هل أنت متأكد من فك ربط نوع الغرفة؟')) {
      this.loading = true;
      this.publicRoomTypeService.unlinkFromErpRoomType(publicRoomTypeId).subscribe({
        next: () => {
          alert('تم فك ربط نوع الغرفة بنجاح');
          this.loadRoomTypes(this.selectedPublicHotel?.id);
        },
        error: (error) => {
          console.error('Error unlinking room type:', error);
          alert('حدث خطأ أثناء فك ربط نوع الغرفة');
          this.loading = false;
        }
      });
    }
  }

  getErpHotelName(erpHotelId: string | null): string {
    if (!erpHotelId) return 'غير مرتبط';
    const hotel = this.erpHotels.find(h => h.id === erpHotelId);
    return hotel ? hotel.arabicName || hotel.englishName : 'غير معروف';
  }

  getErpRoomTypeName(erpRoomTypeId: string | null): string {
    if (!erpRoomTypeId) return 'غير مرتبط';
    const roomType = this.erpRoomTypes.find(r => r.id === erpRoomTypeId);
    return roomType ? roomType.arabicName || roomType.englishName : 'غير معروف';
  }
}
