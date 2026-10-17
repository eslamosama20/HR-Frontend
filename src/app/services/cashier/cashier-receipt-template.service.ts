import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type CashierReceiptTemplateId = 'classic' | 'compact' | 'modern' | 'pro';

export interface CashierReceiptTemplateOption {
  id: CashierReceiptTemplateId;
  label: string;
  description: string;
}

export interface CashierReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface CashierReceiptData {
  invoiceNo: string;
  invoiceDate: Date;
  cashierName: string;
  stationName: string;
  customerName: string;
  customerTaxNumber?: string;
  paymentLabel: string;
  companyName?: string;
  companyLogoUrl?: string;
  companyTaxNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  isMixedPayment?: boolean;
  mixedCashAmount?: number;
  mixedCardAmount?: number;
  mixedOtherAmount?: number;
  footerNote?: string;
  qrPayload?: string;
  items: CashierReceiptLine[];
  /** Saudi ZATCA UI readiness — show VAT label & QR slot without real TLV generation */
  vatRatePercent?: number;
  zatcaQrPlaceholder?: boolean;
  zatcaReadinessNote?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CashierReceiptTemplateService {
  private readonly storageKey = 'cashier.receipt.template';

  readonly templates: CashierReceiptTemplateOption[] = [
    {
      id: 'classic',
      label: 'حراري كلاسيك 80mm',
      description: 'تصميم تقليدي واضح مناسب لأغلب طابعات الكاشير.'
    },
    {
      id: 'compact',
      label: 'حراري مضغوط 80mm',
      description: 'نفس البيانات بشكل مختصر وسريع القراءة.'
    },
    {
      id: 'modern',
      label: 'حراري حديث 80mm',
      description: 'تصميم حديث مع إبراز قوي للإجمالي ووسيلة الدفع.'
    },
    {
      id: 'pro',
      label: 'احترافي مفصل + QR 80mm',
      description: 'تصميم احترافي مفصل مع جدول أصناف كامل وQR لتفاصيل الفاتورة.'
    }
  ];

  private readonly selectedTemplateIdSubject = new BehaviorSubject<CashierReceiptTemplateId>(this.loadTemplateFromStorage());
  readonly selectedTemplateId$ = this.selectedTemplateIdSubject.asObservable();

  get currentTemplateId(): CashierReceiptTemplateId {
    return this.selectedTemplateIdSubject.value;
  }

  setTemplate(templateId: CashierReceiptTemplateId): void {
    this.selectedTemplateIdSubject.next(templateId);
    this.persistTemplate(templateId);
  }

  getTemplateLabel(templateId: CashierReceiptTemplateId = this.currentTemplateId): string {
    return this.templates.find(template => template.id === templateId)?.label ?? this.templates[0].label;
  }

  private loadTemplateFromStorage(): CashierReceiptTemplateId {
    if (typeof window === 'undefined') {
      return 'classic';
    }

    const saved = window.localStorage.getItem(this.storageKey) as CashierReceiptTemplateId | null;
    if (!saved || !this.templates.some(template => template.id === saved)) {
      return 'classic';
    }

    return saved;
  }

  private persistTemplate(templateId: CashierReceiptTemplateId): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.storageKey, templateId);
  }
}
