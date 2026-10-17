import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicBookingService } from '../../services/public-booking/public-booking.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { PaginatorModule } from 'primeng/paginator';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService, ConfirmationService } from 'primeng/api';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@Component({
  selector: 'app-public-bookings-admin',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule, 
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    PaginatorModule,
    TagModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    SkeletonModule,
    TranslateModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './public-bookings-admin.component.html',
  styleUrls: ['./public-bookings-admin.component.scss']
})
export class PublicBookingsAdminComponent implements OnInit {
  // Signals for reactive state
  bookingsSignal = signal<any[]>([]);
  get bookings() {
    return this.bookingsSignal();
  }
  set bookings(value: any[]) {
    this.bookingsSignal.set(value);
  }

  loadingSignal = signal(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  selectedBooking: any = null;
  showCancelDialog = false;
  cancellationReason = '';
  bookingDetailsDialogVisible = false;

  // Pagination
  // Pagination
  totalRecords = 0;
  rows = 10;
  first = 0;

  filters = {
    status: '',
    searchTerm: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  };

  statusOptions = [
    { label: 'الكل', value: '' },
    { label: 'قيد الانتظار', value: 'Pending' },
    { label: 'مؤكد', value: 'Confirmed' },
    { label: 'ملغي', value: 'Cancelled' },
    { label: 'مكتمل', value: 'Completed' }
  ];

  constructor(
    private bookingService: PublicBookingService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(event?: any): void {
    console.log('🔄 Loading bookings with filters:', this.filters, event);
    if (event) {
      this.first = event.first;
      this.rows = event.rows;
    }
    this.loading = true;
    
    // Build filters object for server-side filtering
    const apiFilters: any = {};
    
    if (this.filters.status) {
      apiFilters.status = this.filters.status;
    }
    
    if (this.filters.searchTerm) {
      apiFilters.searchTerm = this.filters.searchTerm;
    }
    
    if (this.filters.dateFrom) {
      apiFilters.checkInDateFrom = this.filters.dateFrom.toISOString();
    }
    
    if (this.filters.dateTo) {
      apiFilters.checkInDateTo = this.filters.dateTo.toISOString();
    }

    // Use filtered endpoint
    const observable = Object.keys(apiFilters).length > 0
      ? this.bookingService.getAllWithFilters(apiFilters)
      : this.bookingService.getAll();

    observable.subscribe({
      next: (response: any) => {
        console.log('✅ Bookings loaded:', response?.length || 0);
        this.bookings = response || [];
        this.totalRecords = this.bookings.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading bookings:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تحميل الحجوزات'
        });
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    console.log('🔍 Applying filters...');
    this.loadBookings();
  }

  clearFilters(): void {
    console.log('🗑️ Clearing filters...');
    this.filters = {
      status: '',
      searchTerm: '',
      dateFrom: null,
      dateTo: null
    };
    this.loadBookings();
  }

  viewBooking(booking: any): void {
    this.selectedBooking = booking;
    this.bookingDetailsDialogVisible = true;
  }

  openCancelDialog(booking: any): void {
    this.selectedBooking = booking;
    this.showCancelDialog = true;
    this.cancellationReason = '';
  }

  confirmBooking(bookingId: string): void {
    this.confirmationService.confirm({
      message: 'هل أنت متأكد من تأكيد هذا الحجز؟',
      header: 'تأكيد الحجز',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'نعم',
      rejectLabel: 'لا',
      accept: () => {
        this.loading = true;
        this.bookingService.confirmBooking(bookingId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم تأكيد الحجز بنجاح'
            });
            this.loadBookings();
          },
          error: (error) => {
            console.error('Error confirming booking:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'حدث خطأ أثناء تأكيد الحجز'
            });
            this.loading = false;
          }
        });
      }
    });
  }

  cancelBooking(booking?: any): void {
    if (booking) {
      this.selectedBooking = booking;
      this.showCancelDialog = true;
      this.cancellationReason = '';
      return;
    }
    
    if (!this.cancellationReason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'الرجاء إدخال سبب الإلغاء'
      });
      return;
    }

    this.loading = true;
    this.bookingService.cancelBooking(this.selectedBooking.id, this.cancellationReason).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إلغاء الحجز بنجاح'
        });
        this.showCancelDialog = false;
        this.loadBookings();
      },
      error: (error) => {
        console.error('Error cancelling booking:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء إلغاء الحجز'
        });
        this.loading = false;
      }
    });
  }

  closeCancelDialog(): void {
    this.showCancelDialog = false;
    this.cancellationReason = '';
  }

  getStatusClass(status: string): string {
    const statusMap: any = {
      'Pending': 'warning',
      'Confirmed': 'success',
      'Cancelled': 'danger',
      'Completed': 'info'
    };
    return statusMap[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'Pending': 'قيد الانتظار',
      'Confirmed': 'مؤكد',
      'Cancelled': 'ملغي',
      'Completed': 'مكتمل'
    };
    return labels[status] || status;
  }

  getPaymentStatusClass(status: string): string {
    const statusMap: any = {
      'Pending': 'warning',
      'Paid': 'success',
      'Failed': 'danger',
      'Refunded': 'info'
    };
    return statusMap[status] || 'secondary';
  }

  exportToExcel(): void {
    // TODO: Implement Excel export
    this.messageService.add({
      severity: 'info',
      summary: 'معلومة',
      detail: 'سيتم تنفيذ التصدير إلى Excel قريباً'
    });
  }
}
