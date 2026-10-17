import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicBookingService } from 'src/app/services/public-booking/public-booking.service';
import { PaymobService } from 'src/app/services/paymob/paymob.service';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CustomDatePipe, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.scss'
})
export class BookingFormComponent implements OnInit {
  bookingForm: FormGroup;
  bookingData: any = null;
  submitting = false;
  bookingReference: string = '';
  showConfirmation = false;

  countryCodes = [
    { code: '+966', name: 'السعودية' },
    { code: '+20', name: 'مصر' },
    { code: '+971', name: 'الإمارات' },
    { code: '+965', name: 'الكويت' },
    { code: '+973', name: 'البحرين' },
    { code: '+974', name: 'قطر' },
    { code: '+968', name: 'عُمان' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private bookingService: PublicBookingService,
    private paymobService: PaymobService
  ) {
    this.bookingForm = this.fb.group({
      guestName: ['', [Validators.required, Validators.minLength(3)]],
      guestEmail: ['', [Validators.required, Validators.email]],
      countryCode: ['+966', Validators.required],
      guestPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,10}$/)]],
      guestNationality: [''],
      numberOfAdults: [2, [Validators.required, Validators.min(1)]],
      numberOfChildren: [0, [Validators.min(0)]],
      specialRequests: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['data']) {
        try {
          this.bookingData = JSON.parse(params['data']);
        } catch (e) {
          console.error('Error parsing booking data:', e);
          this.router.navigate(['/hotels']);
        }
      } else {
        this.router.navigate(['/hotels']);
      }
    });
  }

  submitBooking(): void {
    if (this.bookingForm.invalid) {
      Object.keys(this.bookingForm.controls).forEach(key => {
        this.bookingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const formData = this.bookingForm.value;

    const bookingPayload: any = {
      hotelId: this.bookingData.hotelId,
      checkInDate: this.bookingData.checkInDate,
      checkOutDate: this.bookingData.checkOutDate,
      guestName: formData.guestName,
      guestEmail: formData.guestEmail,
      guestPhone: formData.guestPhone,
      countryCode: formData.countryCode,
      guestNationality: formData.guestNationality,
      numberOfAdults: formData.numberOfAdults,
      numberOfChildren: formData.numberOfChildren,
      specialRequests: formData.specialRequests,
      totalAmount: this.bookingData.totalAmount,
      discountAmount: 0,
      paymentStatus: 0, // 0 = Pending
      rooms: this.bookingData.selectedRooms.map((r: any) => ({
        roomTypeId: r.roomTypeId,
        quantity: r.quantity,
        pricePerNight: this.getRoomPrice(r.roomTypeId)
      }))
    };

    // First, create the booking in the database
    this.bookingService.add(bookingPayload).subscribe({
      next: (response: any) => {
        this.bookingReference = response?.bookingReference || '';
        
        // Now initiate payment with Paymob
        const nameParts = formData.guestName.split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        const billingData = this.paymobService.formatBillingData(
          firstName,
          lastName,
          formData.guestEmail,
          formData.guestPhone,
          formData.countryCode
        );

        this.paymobService.initiatePayment(
          this.bookingData.totalAmount,
          this.bookingReference,
          billingData
        ).subscribe({
          next: (paymentData) => {
            console.log('🔗 Payment data received:', paymentData);
            
            // Update booking with Paymob order ID
            const bookingId = this.bookingData.id;
            if (bookingId) {
              // Update the booking with Paymob order ID
              this.http.post(`http://localhost:5001/api/PublicBooking/${bookingId}/payment`, {
                PaymentStatus: 0, // Pending
                PaymobOrderId: paymentData.orderId
              }).subscribe({
                next: () => console.log('✅ Booking updated with Paymob order ID'),
                error: (err) => console.error('❌ Failed to update booking with order ID:', err)
              });
            }
            
            // Redirect to Paymob payment page
            const paymentUrl = this.paymobService.getPaymentIframeUrl(paymentData.paymentToken);
            console.log('🔗 Redirecting to payment URL:', paymentUrl);
            window.location.href = paymentUrl;
          },
          error: (error) => {
            console.error('Payment initiation error:', error);
            alert('حدث خطأ أثناء توجيهك لبوابة الدفع. الرجاء المحاولة مرة أخرى.');
            this.submitting = false;
          }
        });
      },
      error: (error) => {
        console.error('Booking error:', error);
        alert('حدث خطأ أثناء إتمام الحجز. الرجاء المحاولة مرة أخرى.');
        this.submitting = false;
      }
    });
  }

  getRoomPrice(roomTypeId: string): number {
    // This would normally come from room data
    return 500; // Placeholder
  }

  getNumberOfNights(): number {
    if (!this.bookingData) return 0;
    const checkIn = new Date(this.bookingData.checkInDate);
    const checkOut = new Date(this.bookingData.checkOutDate);
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.bookingForm.get(fieldName);
    if (field?.hasError('required')) return 'هذا الحقل مطلوب';
    if (field?.hasError('email')) return 'البريد الإلكتروني غير صحيح';
    if (field?.hasError('minlength')) return 'الاسم قصير جداً';
    if (field?.hasError('pattern')) return 'رقم الهاتف غير صحيح';
    if (field?.hasError('min')) return 'القيمة صغيرة جداً';
    return '';
  }
}
