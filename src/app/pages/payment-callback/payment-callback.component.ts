import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymobService } from 'src/app/services/paymob/paymob.service';
import { PublicBookingService } from 'src/app/services/public-booking/public-booking.service';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-callback.component.html',
  styleUrl: './payment-callback.component.scss'
})
export class PaymentCallbackComponent implements OnInit {
  paymentStatus: 'processing' | 'success' | 'failed' = 'processing';
  bookingReference: string = '';
  transactionId: string = '';
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymobService: PaymobService,
    private bookingService: PublicBookingService
  ) {}

  ngOnInit(): void {
    // Get all query parameters from Paymob callback
    this.route.queryParams.subscribe(params => {
      console.log('Paymob callback params:', params);
      
      // Verify payment
      const verificationResult = this.paymobService.verifyCallback(params);
      
      if (verificationResult.success) {
        this.paymentStatus = 'success';
        this.transactionId = verificationResult.transactionId || '';
        this.bookingReference = params['merchant_order_id'] || params['order'] || '';
        
        // Update booking status in database
        if (this.bookingReference) {
          this.updateBookingStatus(this.bookingReference, this.transactionId);
        }
      } else {
        this.paymentStatus = 'failed';
        this.errorMessage = verificationResult.error || 'فشلت عملية الدفع';
        this.bookingReference = params['merchant_order_id'] || params['order'] || '';
      }
    });
  }

  private updateBookingStatus(bookingRef: string, transactionId: string): void {
    // Get the booking by reference to get its ID
    this.bookingService.getByReference(bookingRef).subscribe({
      next: (booking: any) => {
        if (booking && booking.id) {
          // Update payment status with transaction ID and Paymob order ID
          const paymobOrderId = this.route.snapshot.queryParams['order_id'] || 
                               this.route.snapshot.queryParams['order'];
          
          this.bookingService.updatePayment(booking.id, {
            paymentStatus: 1, // 1 = Paid
            transactionId: transactionId,
            paymobOrderId: paymobOrderId ? parseInt(paymobOrderId) : undefined
          }).subscribe({
            next: () => console.log('Booking payment status updated successfully'),
            error: (err) => {
              console.error('Failed to update booking:', err);
              this.errorMessage = 'تم الدفع بنجاح ولكن فشل تحديث الحجز';
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to get booking:', err);
        this.errorMessage = 'فشل استرجاع بيانات الحجز';
      }
    });
  }

  goToHomePage(): void {
    this.router.navigate(['/']);
  }

  goToBookings(): void {
    this.router.navigate(['/hotels']);
  }

  retryPayment(): void {
    // Redirect back to booking page or payment
    this.router.navigate(['/booking'], {
      queryParams: { retry: true, ref: this.bookingReference }
    });
  }
}
