import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PublicBookingFormComponent } from './public-booking/public-booking-form.component';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

import { CustomDatePipe } from '../pipes/custom-date.pipe';
const routes: Routes = [
  { path: '', component: PublicBookingFormComponent }
];

@NgModule({
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
    CalendarModule,
    PublicBookingFormComponent,
    RouterModule.forChild(routes)
  ],
})
export class PublicBookingModule {}
