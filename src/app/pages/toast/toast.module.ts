import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from './toast-container/toast-container.component';
import { MatIconModule } from '@angular/material/icon';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@NgModule({
  declarations: [ToastContainerComponent],
  imports: [CustomDatePipe, CommonModule, MatIconModule],
  exports: [ToastContainerComponent],
})
export class ToastModule {}
