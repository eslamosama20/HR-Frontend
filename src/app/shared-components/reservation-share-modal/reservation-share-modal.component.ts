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
import { ReservationService } from 'src/app/services/reservations/reservation.service';

@Component({
  selector: 'app-reservation-share-modal',
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
  templateUrl: './reservation-share-modal.component.html',
  styleUrls: ['./reservation-share-modal.component.scss'],
})
export class ReservationShareModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() reservation: any | null = null;
  @Input() bulkIds: string[] = [];
  @Input() bulkMode = false;
  @Input() activeLanguage = 'ar';

  shareForm: FormGroup;
  shareActiveTabIndex = 0;
  shareBusy = false;

  constructor(
    private fb: FormBuilder,
    private reservationService: ReservationService,
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
    if (this.visible && (changes['visible'] || changes['reservation'] || changes['bulkIds'] || changes['bulkMode'])) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.shareActiveTabIndex = 0;
    this.shareBusy = false;
    const defaultEmail = this.reservation?.email || this.reservation?.guestEmail || '';
    const defaultPhone = this.reservation?.whatsappNumber || this.reservation?.phone || this.reservation?.mobileNumber || '';
    
    const emailVal = this.bulkMode ? '' : (defaultEmail || '').trim();
    const phoneVal = this.bulkMode ? '' : this.normalizePhoneForApi(defaultPhone || '');
    
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
        detail: this.translate.instant('VALIDATION.INVALID_EMAIL') || 'برجاء إدخال بريد إلكتروني صحيح.',
      });
      return;
    }

    if (this.bulkMode) {
      if (!this.bulkIds?.length) {
        this.messageService.add({ severity: 'warn', summary: this.translate.instant('COMMON.WARNING') || 'تحذير', detail: 'اختر حجوزات للمشاركة' });
        return;
      }
      const ids = [...this.bulkIds];
      const count = ids.length;

      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('COMMON.INFO') || 'معلومات',
        detail: `جاري إرسال ${count} حجزًا عبر البريد الإلكتروني...`,
      });
      this.closeDialog();

      this.reservationService.shareReservationsByEmail(ids, rawEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('COMMON.SUCCESS') || 'تم الإرسال',
            detail: `تم إرسال ${count} حجزًا عبر البريد الإلكتروني بنجاح.`,
          });
        },
        error: (err) => {
          console.error('Error sharing reservations by email:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR') || 'خطأ',
            detail: 'تعذّر إرسال الحجوزات عبر البريد الإلكتروني.',
          });
        },
      });
    } else {
      const resId = this.reservation?.id;
      if (!resId) {
        this.messageService.add({ severity: 'warn', summary: 'تحذير', detail: 'لا يوجد حجز محدد.' });
        return;
      }

      this.closeDialog();

      setTimeout(() => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('COMMON.INFO') || 'معلومات',
          detail: 'جاري إرسال تفاصيل الحجز عبر البريد الإلكتروني...',
        });
      }, 50);

      this.reservationService.shareReservationByEmail(resId, rawEmail).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('COMMON.SUCCESS') || 'تم الإرسال',
            detail: 'تم إرسال تفاصيل الحجز عبر البريد الإلكتروني بنجاح.',
          });
        },
        error: (err) => {
          console.error('Error sharing reservation by email:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR') || 'خطأ',
            detail: 'تعذّر إرسال الحجز عبر البريد الإلكتروني.',
          });
        },
      });
    }
  }

  // ─── WHATSAPP ─────────────────────────────────────────────────────────────────

  submitWhatsapp(): void {
    const raw = this.shareForm.get('whatsappNumber')?.value || '';
    const phone = this.normalizePhoneForApi(raw);

    if (!phone || phone.length < 8) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('COMMON.WARNING') || 'تحذير',
        detail: 'برجاء إدخال رقم جوال صحيح (8 أرقام على الأقل).',
      });
      return;
    }

    if (this.bulkMode) {
      if (!this.bulkIds?.length) {
        this.messageService.add({ severity: 'warn', summary: 'تحذير', detail: 'اختر حجوزات للمشاركة' });
        return;
      }

      const query = this.bulkIds.map(id => `id=${id}`).join('&');
      const pageUrl = `${window.location.origin}/reservation?${query}`;
      const formattedText = `*مشاركة حجوزات متعددة (${this.bulkIds.length})*\n\nاضغط على الرابط التالي لتحميل الحجوزات:\n${pageUrl}`;
      const waUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(formattedText)}&type=phone_number&app_absent=0`;
      this.openWhatsAppLink(waUrl);

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('COMMON.SUCCESS') || 'تم الإرسال',
        detail: 'تم فتح واتساب بالرسالة الجاهزة.',
      });
      this.closeDialog();

      this.reservationService.shareReservationsByWhatsapp(this.bulkIds, phone).subscribe({ error: (err) => console.error(err) });
    } else {
      if (!this.reservation?.id) {
        this.messageService.add({ severity: 'warn', summary: 'تحذير', detail: 'لا يوجد حجز محدد.' });
        return;
      }

      const r = this.reservation;
      const targetId = r?.id || r?.guid || '';
      const pageUrl = `${window.location.origin}/reservation?id=${targetId}`;
      const reservationLabel = r?.referenceNumber || r?.id || '';

      const formattedText = `*تفاصيل الحجز (${reservationLabel})*\n\nاضغط على الرابط التالي لتحميل تفاصيل الحجز:\n${pageUrl}`;

      const waUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(formattedText)}&type=phone_number&app_absent=0`;
      this.openWhatsAppLink(waUrl);

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('COMMON.SUCCESS') || 'تم الإرسال',
        detail: 'تم فتح واتساب بالرسالة الجاهزة.',
      });
      this.closeDialog();

      this.reservationService.shareReservationByWhatsapp(r.id, phone).subscribe({ error: (err) => console.error(err) });
    }
  }

  private openWhatsAppLink(url: string): void {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.open(url, '_blank');
    }
  }

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
}
