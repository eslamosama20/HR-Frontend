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
  selector: 'app-net-sales-vat-report',
  templateUrl: './net-sales-vat-report.component.html',
  styleUrl: './net-sales-vat-report.component.scss',
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
export class NetSalesVatReportComponent implements OnInit {
  loadingSignal = signal(false);
  dateRange: Date[] = [];
  netSalesVATReport: any = null;
  totalSalesVAT = 0;
  totalReturnsVAT = 0;
  netVAT = 0;
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
    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'الرجاء اختيار نطاق التاريخ'
      });
      return;
    }

    this.loading = true;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);

    this.invoiceService.getNetSalesVATReport(startDate, endDate).subscribe({
      next: (data: any) => {
        this.netSalesVATReport = data;
        this.totalSalesVAT = data.totalSalesVAT || 0;
        this.totalReturnsVAT = data.totalReturnsVAT || 0;
        this.netVAT = (data.totalVAT !== undefined ? data.totalVAT : (this.totalSalesVAT - this.totalReturnsVAT));
        this.hasData = true;
        this.loading = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إنشاء التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error fetching Net Sales VAT Report:', error);
        this.loading = false;
        this.hasData = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء جلب التقرير'
        });
      }
    });
  }

  downloadPDF(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'الرجاء إنشاء التقرير أولاً'
      });
      return;
    }

    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);

    this.invoiceService.downloadNetSalesVATReportDocument(startDate, endDate, 'ar').subscribe({
      next: (blob: Blob) => {
        const fileName = `تقرير_صافي_القيمة_المضافة_للمبيعات_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
        
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تحميل التقرير بنجاح'
        });
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل التقرير'
        });
      }
    });
  }

  printPDF(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'الرجاء إنشاء التقرير أولاً'
      });
      return;
    }

    window.print();
  }

  exportToExcel(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا يوجد تقرير لتصديره'
      });
      return;
    }

    const csvContent = [
      ['البيان', 'القيمة'],
      ['إجمالي القيمة المضافة للمبيعات', this.totalSalesVAT.toFixed(2)],
      ['إجمالي القيمة المضافة لمرتجعات المبيعات', this.totalReturnsVAT.toFixed(2)],
      ['صافي القيمة المضافة للمبيعات', this.netVAT.toFixed(2)]
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `Net_Sales_VAT_Report_${this.formatDate(this.dateRange[0])}_${this.formatDate(this.dateRange[1])}.csv`;
    this.pdfUtilsService.downloadFile(blob, fileName);

    this.messageService.add({
      severity: 'success',
      summary: 'نجح',
      detail: 'تم تصدير التقرير بنجاح'
    });
  }

  openShareDialog(): void {
    if (!this.hasData) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
    this.shareDialogVisible = true;
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.shareForm.reset();
    this.shareBusy = false;
  }

  submitShareWhatsApp(): void {
    if (this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: this.translate.instant('GENERAL.PLEASE_ENTER_VALID_PHONE')
      });
      return;
    }

    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const phone = this.shareForm.get('whatsappNumber')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;
    this.shareForm.disable();

    this.invoiceService
      .shareNetSalesVATReportByWhatsapp(startDate, endDate, phone, language)
      .subscribe({
        next: (res: any) => {
          this.shareBusy = false;
          this.shareForm.enable();

          console.log('WhatsApp share response:', res);
          
          // Check for success in multiple possible response structures
          const isSuccess = res?.isSuccess === true || 
                           res?.IsSuccess === true || 
                           res === true ||
                           (!res?.isSuccess && !res?.IsSuccess && res?.message);

          if (isSuccess) {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('GENERAL.SUCCESS'),
              detail: res?.message || res?.Message || this.translate.instant('GENERAL.WHATSAPP_MESSAGE_SENT')
            });

            // Open WhatsApp link if provided
            if (res?.WhatsAppLink || res?.whatsAppLink) {
              const link = res?.WhatsAppLink || res?.whatsAppLink;
              window.open(link, '_blank');
            }

            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('GENERAL.ERROR'),
              detail: res?.message || res?.Message || this.translate.instant('GENERAL.FAILED_TO_SEND_WHATSAPP')
            });
          }
        },
        error: (err) => {
          this.shareBusy = false;
          this.shareForm.enable();
          console.error('WhatsApp share error:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('GENERAL.ERROR'),
            detail: err?.error?.message || err?.error?.Message || this.translate.instant('GENERAL.FAILED_TO_SEND_WHATSAPP')
          });
        }
      });
  }

  submitShareEmail(): void {
    if (this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: this.translate.instant('GENERAL.PLEASE_ENTER_VALID_EMAIL')
      });
      return;
    }

    if (!this.dateRange || this.dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('GENERAL.WARNING'),
        detail: 'يرجى اختيار نطاق تاريخ صحيح'
      });
      return;
    }

    const email = this.shareForm.get('email')?.value;
    const startDate = this.formatDate(this.dateRange[0]);
    const endDate = this.formatDate(this.dateRange[1]);
    const language = this.translationService.getSelectedLanguage();

    this.shareBusy = true;
    this.shareForm.disable();

    this.invoiceService
      .shareNetSalesVATReportByEmail(startDate, endDate, email, language)
      .subscribe({
        next: (res: any) => {
          this.shareBusy = false;
          this.shareForm.enable();

          console.log('Email share response:', res);
          
          // Check for success in multiple possible response structures
          const isSuccess = res?.isSuccess === true || 
                           res?.IsSuccess === true || 
                           res === true ||
                           (!res?.isSuccess && !res?.IsSuccess && res?.message);

          if (isSuccess) {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('GENERAL.SUCCESS'),
              detail: res?.message || res?.Message || this.translate.instant('GENERAL.EMAIL_SENT_SUCCESSFULLY')
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('GENERAL.ERROR'),
              detail: res?.message || res?.Message || this.translate.instant('GENERAL.FAILED_TO_SEND_EMAIL')
            });
          }
        },
        error: (err) => {
          this.shareBusy = false;
          this.shareForm.enable();
          console.error('Email share error:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('GENERAL.ERROR'),
            detail: err?.error?.message || err?.error?.Message || this.translate.instant('GENERAL.FAILED_TO_SEND_EMAIL')
          });
        }
      });
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
