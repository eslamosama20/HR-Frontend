import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TooltipModule } from 'primeng/tooltip';

import { NotificationsComponent } from './notifications.component';

@NgModule({
  declarations: [NotificationsComponent],
  imports: [CustomDatePipe, 
    CommonModule,
    MatListModule,
    MatIconModule,
  MatButtonModule,
  TooltipModule,
  ],
  exports: [NotificationsComponent],
})
export class NotificationsModule {}
