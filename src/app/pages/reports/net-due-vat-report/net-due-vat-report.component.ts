import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslationService } from 'src/app/modules/i18n';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { InvoiceService } from '../../../services/invoice/invoice-service.service';
import { PdfUtilsService } from '../../../services/pdf-utils.service';
import { getSystemNow } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-net-due-vat-report',
  templateUrl: './net-due-vat-report.component.html',
  styleUrl: './net-due-vat-report.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    FormsModule,
    CalendarModule,
    PanelModule,
    TabViewModule,
    TranslateModule
  ],
  providers: [ConfirmationService, MessageService]
})
export class NetDueVatReportComponent implements OnInit {
  loadingSignal = signal(false);
  dateRange: Date[] = [];
  netDueVATReport: any = null;
  netSalesVAT = 0;
  netPurchasesVAT = 0;
  dueVAT = 0;
  hasData = false;
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private invoiceService: InvoiceService,
    private pdfUtilsService: PdfUtilsService,
    private messageService: MessageService,
    private fb: FormBuilder,
    public translate: TranslateService,
    public translationService: TranslationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = getSystemNow();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.dateRange = [firstDay, today];
    
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^\d{8,15}$/)]]
    });
  }

  handleSubmit(): void {
    if (!this.dateRange || this.dateRange.length < 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى تحديد نطاق التاريخ'
      });
      return;
    }

    this.loading = true;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);

    this.invoiceService.getNetDueVATReport(startDate, endDate).subscribe({
      next: (response: any) => {
        this.netDueVATReport = response;
        this.netSalesVAT = response.netSalesVAT || 0;
        this.netPurchasesVAT = response.netPurchasesVAT || 0;
        this.dueVAT = response.dueVAT || 0;
        this.hasData = true;
        this.loading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم جلب التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error fetching Net Due VAT report:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل جلب التقرير'
        });
      }
    });
  }

  downloadPDF(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إنشاء التقرير أولاً'
      });
      return;
    }

    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.loading = true;
    this.invoiceService.downloadNetDueVATReportDocument(startDate, endDate, language).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Net_Due_VAT_Report_${startDate}_${endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.loading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تنزيل التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تنزيل التقرير'
        });
      }
    });
  }

  printPDF(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إنشاء التقرير أولاً'
      });
      return;
    }

    window.print();
  }

  exportToExcel(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إنشاء التقرير أولاً'
      });
      return;
    }

    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const fileName = `Net_Due_VAT_Report_${startDate}_${endDate}.csv`;

    const csvContent = [
      ['البيان', 'القيمة'],
      ['صافي القيمة المضافة للمبيعات', this.netSalesVAT.toFixed(2)],
      ['صافي القيمة المضافة للمشتريات', `${this.netPurchasesVAT.toFixed(2)}-`],
      ['القيمة المضافة المستحقة', this.dueVAT.toFixed(2)]
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.pdfUtilsService.downloadFile(blob, fileName);

    this.messageService.add({
      severity: 'success',
      summary: 'نجح',
      detail: 'تم تصدير التقرير إلى Excel بنجاح'
    });
  }

  showShareDialog(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إنشاء التقرير أولاً'
      });
      return;
    }

    this.shareDialogVisible = true;
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
  }

  submitShareEmail(): void {
    if (this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إدخال بريد إلكتروني صحيح'
      });
      return;
    }

    const email = this.shareForm.get('email')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;

    this.invoiceService.shareNetDueVATReportByEmail(startDate, endDate, email, language).subscribe({
      next: (res: any) => {
        console.log('Email share response:', res);
        
        const isSuccess = res?.isSuccess === true || 
                         res?.IsSuccess === true || 
                         res === true ||
                         (!res?.isSuccess && !res?.IsSuccess && res?.message);

        this.shareBusy = false;
        
        if (isSuccess) {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: res?.message || 'تم إرسال التقرير بنجاح'
          });
          this.shareDialogVisible = false;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res?.message || 'فشل إرسال التقرير'
          });
        }
      },
      error: (error) => {
        console.error('Error sharing via email:', error);
        this.shareBusy = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل إرسال التقرير عبر البريد الإلكتروني'
        });
      }
    });
  }

  submitShareWhatsApp(): void {
    if (this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يرجى إدخال رقم هاتف صحيح (8-15 رقم)'
      });
      return;
    }

    const phone = this.shareForm.get('whatsappNumber')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;

    this.invoiceService.shareNetDueVATReportByWhatsapp(startDate, endDate, phone, language).subscribe({
      next: (res: any) => {
        console.log('WhatsApp share response:', res);
        
        const isSuccess = res?.isSuccess === true || 
                         res?.IsSuccess === true || 
                         res === true ||
                         (!res?.isSuccess && !res?.IsSuccess && res?.whatsappUrl);

        this.shareBusy = false;
        
        if (isSuccess && res?.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم فتح واتساب'
          });
          this.shareDialogVisible = false;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res?.message || 'فشل مشاركة التقرير'
          });
        }
      },
      error: (error) => {
        console.error('Error sharing via WhatsApp:', error);
        this.shareBusy = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل مشاركة التقرير عبر واتساب'
        });
      }
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get formattedStartDate(): string {
    return this.dateRange && this.dateRange[0] ? this.formatDateForDisplay(this.dateRange[0]) : '';
  }

  get formattedEndDate(): string {
    return this.dateRange && this.dateRange[1] ? this.formatDateForDisplay(this.dateRange[1]) : '';
  }

  private formatDateForDisplay(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
