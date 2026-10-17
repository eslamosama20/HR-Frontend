import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './modules/auth/services/auth.guard';
import { LoginComponent } from './modules/auth/components/login/login.component';

export const routes: Routes = [
  {path:'mylogin',component:LoginComponent},
  // Public hotel booking pages (no authentication required)
  {
    path: 'public-home',
    loadComponent: () => import('./pages/public-home/public-home.component').then(m => m.PublicHomeComponent)
  },
  {
    path: 'hotel-details/:id',
    loadComponent: () => import('./pages/hotel-details/hotel-details.component').then(m => m.HotelDetailsComponent)
  },
  {
    path: 'hotel-rooms/:id',
    loadComponent: () => import('./pages/hotel-room-selection/hotel-room-selection.component').then(m => m.HotelRoomSelectionComponent)
  },
  {
    path: 'booking-form',
    loadComponent: () => import('./pages/booking-form/booking-form.component').then(m => m.BookingFormComponent)
  },
  {
    path: 'payment-callback',
    loadComponent: () => import('./pages/payment-callback/payment-callback.component').then(m => m.PaymentCallbackComponent)
  },
  {
    path: 'self-order/:token',
    loadComponent: () => import('./pages/cashier/components/self-order/self-order.component').then(m => m.SelfOrderComponent)
  },
  {
    path: 'self-order',
    loadComponent: () => import('./pages/cashier/components/self-order/self-order.component').then(m => m.SelfOrderComponent)
  },
  // Public reservation booking (unauthenticated) route placed before guarded layout
  {
    path: 'booking',
    loadChildren: () => import('./public-booking/public-booking.module').then(m => m.PublicBookingModule)
  },
 {
    path: 'invoice',
    loadComponent: () =>
      import('./pages/invoices/invoice-download/invoice-download.component')
        .then((m) => m.InvoiceDownloadComponent),
  },
  {
    path: 'reservation',
    loadComponent: () =>
      import('./pages/reservations/reservation-download/reservation-download.component')
        .then(m => m.ReservationDownloadComponent),
  },
  {
    path: 'barcode-management',
    redirectTo: 'inventory/barcode-management',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'error',
    loadChildren: () =>
      import('./modules/errors/errors.module').then((m) => m.ErrorsModule),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./_metronic/layout/layout.module').then((m) => m.LayoutModule),
  },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
