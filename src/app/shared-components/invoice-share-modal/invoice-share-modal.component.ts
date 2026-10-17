import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';

@Component({
  selector: 'app-invoice-share-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TabViewModule,
    InputTextModule,
    ToastModule,
  ],
  templateUrl: './invoice-share-modal.component.html',
  styleUrls: ['./invoice-share-modal.component.scss'],
})
export class InvoiceShareModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() invoiceId?: number | string | null;
  @Input() bulkIds: number[] = [];
  @Input() bulkMode = false;
  @Input() customerName?: string | null;
  @Input() invoiceNo?: string | null;
  @Input() defaultEmail?: string | null;
  @Input() defaultPhone?: string | null;
  @Input() isReservation = false;
  @Input() activeLanguage = 'ar';

  shareForm: FormGroup;
  shareActiveTabIndex = 0;
  shareBusy = false;

  constructor(
    private fb: FormBuilder,
    private salesInvoiceService: SalesInvoiceService,
    private messageService: MessageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    this.shareForm = this.fb.group({
      email: [''],
      whatsappNumber: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.visible && (changes['visible'] || changes['defaultEmail'] || changes['defaultPhone'] || changes['invoiceId'])) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.shareActiveTabIndex = 0;
    this.shareBusy = false;
    const emailVal = this.bulkMode ? '' : (this.defaultEmail || '').trim();
    const phoneVal = this.bulkMode ? '' : this.normalizePhoneForApi(this.defaultPhone || '');
    this.shareForm.reset({ email: emailVal, whatsappNumber: phoneVal });
    this.shareForm.enable({ emitEvent: false });
  }

  closeDialog(): void {
    this.visible = false;
    this.shareBusy = false;
    this.visibleChange.emit(false);
    this.cdr.detectChanges();
  }

  // ─── EMAIL ───────────────────────────────────────────────────────────────────

  submitEmail(): void {
    const rawEmail = (this.shareForm.get('email')?.value || '').trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

    if (!rawEmail || !isValidEmail) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('COMMON.WARNING') || 'تحذير',
        detail: this.translate.instant('VALIDATION.INVALID_EMAIL') || 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    if (this.bulkMode) {
      if (!this.bulkIds?.length) {
        this.messageService.add({ severity: 'warn', summary: this.translate.instant('COMMON.WARNING') || 'تحذير', detail: 'اختر فواتير للمشاركة' });
        return;
      }
      const ids = [...this.bulkIds];
      const count = ids.length;

      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('COMMON.INFO') || 'معلومات',
        detail: this.translate.instant('INVOICE.SENDING_BULK_EMAILS', { count }),
      });
      this.closeDialog();

      this.salesInvoiceService.shareInvoicesByEmail(ids, rawEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('INVOICE.SENT_SUCCESS') || 'تم الإرسال',
            detail: this.translate.instant('INVOICE.SENT_BULK_EMAILS_SUCCESS', { count }),
          });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('COMMON.ERROR') || 'خطأ', detail: this.translate.instant('INVOICE.SHARE_FAILED') });
        },
      });
    } else {
      const targetId = Number(this.invoiceId || 0);
      if (!targetId) {
        this.messageService.add({ severity: 'warn', summary: this.translate.instant('COMMON.WARNING') || 'تحذير', detail: 'لا توجد فاتورة محددة.' });
        return;
      }

      this.closeDialog();

      setTimeout(() => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('COMMON.INFO') || 'معلومات',
          detail: this.translate.instant('INVOICE.SENDING_EMAIL') || 'جاري إرسال الفاتورة عبر البريد الإلكتروني...',
        });
      }, 50);

      this.salesInvoiceService.shareInvoiceByEmail(targetId, rawEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('INVOICE.SENT_SUCCESS') || 'تم الإرسال',
            detail: this.translate.instant('INVOICE.SENT_EMAIL_SUCCESS') || 'تم إرسال الفاتورة على البريد بنجاح.',
          });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('COMMON.ERROR') || 'خطأ', detail: this.translate.instant('INVOICE.SHARE_FAILED') || 'تعذّر مشاركة الفاتورة.' });
        },
      });
    }
  }

  // ─── WHATSAPP ─────────────────────────────────────────────────────────────────

  private normalizePhoneForApi(input: string): string {
    let clean = String(input || '')
      .replace(/\s+/g, '')
      .replace(/[^\d+]/g, '')
      .replace(/^\+/, '');

    if (!clean) return '';

    // If already starts with a known country code
    if (/^(966|20|971|965|968|973|962|964|961|212|213|216|249|1|44)\d+/.test(clean)) {
      return clean;
    }

    const trimmed = clean.replace(/^0+/, '');

    // Egyptian mobile (010, 011, 012, 015 -> 201xxxxxxxxxx)
    if (/^(10|11|12|15)\d{8}$/.test(trimmed)) {
      return '20' + trimmed;
    }

    // Saudi mobile (05xxxxxxxx -> 9665xxxxxxxx)
    if (/^5\d{8}$/.test(trimmed)) {
      return '966' + trimmed;
    }

    if (trimmed.startsWith('1')) {
      return '20' + trimmed;
    }
    if (trimmed.startsWith('5')) {
      return '966' + trimmed;
    }

    return trimmed;
  }

  private openWhatsAppLink(url: string): void {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.location.href = url;
    }
  }



  private openMultipleWhatsAppLinks(urls: string[]): void {
    if (!Array.isArray(urls) || !urls.length) return;
    this.openWhatsAppLink(urls[0]);
    urls.slice(1).forEach((u, i) => setTimeout(() => this.openWhatsAppLink(u), (i + 1) * 400));
  }

  private extractWhatsAppLinks(res: any): string[] {
    if (!res) return [];
    if (res?.response?.whatsAppLink) return [res.response.whatsAppLink];
    if (res?.whatsAppLink) return [res.whatsAppLink];

    const links: string[] = [];

    if (Array.isArray(res)) {
      res.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    const bags = [res?.responses, res?.items, res?.data].filter(Array.isArray);
    bags.forEach((arr: any[]) => {
      arr.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    });

    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    return Array.from(new Set(links.filter(Boolean)));
  }

  submitWhatsapp(): void {
    const raw = this.shareForm.get('whatsappNumber')?.value || '';
    const phone = this.normalizePhoneForApi(raw);

    if (!phone) {
      this.messageService.add({ severity: 'warn', summary: this.translate.instant('COMMON.WARNING') || 'تحذير', detail: 'برجاء إدخال رقم صحيح (8–15 رقم).' });
      return;
    }
    if (this.bulkMode && !this.bulkIds?.length) {
      this.messageService.add({ severity: 'info', summary: 'معلومة', detail: 'اختر فواتير للمشاركة' });
      return;
    }
    if (!this.bulkMode && !this.invoiceId) {
      this.messageService.add({ severity: 'info', summary: 'معلومة', detail: 'لا توجد فاتورة محددة.' });
      return;
    }

    const isRes = this.isReservation || window.location.href.includes('reservation');
    const title = isRes ? 'فاتورة حجز' : 'فاتورة مبيعات';

    let pageUrl = '';
    if (this.bulkMode) {
      const query = this.bulkIds.map(id => `id=${id}`).join('&');
      pageUrl = `${window.location.origin}/invoice?${query}`;
    } else {
      const targetId = Number(this.invoiceId || 0);
      pageUrl = isRes 
        ? `${window.location.origin}/invoices/reservation-details/${targetId}` 
        : `${window.location.origin}/invoice?id=${targetId}`;
    }

    const invoiceLabel = this.invoiceNo || this.invoiceId || '';
    const formattedText = `*${title} (${invoiceLabel})*\n\nاضغط على الرابط التالي لتحميل ${isRes ? 'فاتورة الحجز' : 'الفاتورة'}:\n${pageUrl}`;
    const waUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(formattedText)}&type=phone_number&app_absent=0`;

    // Open WhatsApp URL DIRECTLY on click gesture - NO about:blank tab!
    this.openWhatsAppLink(waUrl);

    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('INVOICE.SENT_SUCCESS') || 'تم الإرسال',
      detail: 'تم فتح واتساب بالرسالة الجاهزة.',
    });
    this.closeDialog();

    // Trigger backend share request in background for audit logging
    if (this.bulkMode) {
      this.salesInvoiceService.shareInvoicesByWhatsapp(this.bulkIds, phone).subscribe({ error: (err) => console.error(err) });
    } else {
      this.salesInvoiceService.shareInvoiceByWhatsapp(Number(this.invoiceId || 0), phone).subscribe({ error: (err) => console.error(err) });
    }
  }
}
