import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { QRCodeModule } from 'angularx-qrcode';
import { CashierReceiptData, CashierReceiptTemplateId } from 'src/app/services/cashier/cashier-receipt-template.service';

import { CustomDatePipe } from '../../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-cashier-receipt-template-preview',
  standalone: true,
  imports: [CustomDatePipe, CommonModule, QRCodeModule],
  templateUrl: './cashier-receipt-template-preview.component.html',
  styleUrls: ['./cashier-receipt-template-preview.component.scss']
})
export class CashierReceiptTemplatePreviewComponent {
  @Input() templateId: CashierReceiptTemplateId = 'classic';
  @Input() receipt: CashierReceiptData | null = null;
}
