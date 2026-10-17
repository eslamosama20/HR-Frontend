import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TopProductModel, TopProductsFilter, TopProductsStatistics } from 'src/app/models/reports/top-product.model';
import { TopSellingProductsService } from 'src/app/services/reports/top-selling-products.service';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-top-selling-products',
  templateUrl: './top-selling-products.component.html',
  styleUrls: ['./top-selling-products.component.scss'],
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ButtonModule,
    CalendarModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    RadioButtonModule,
    TableModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService]
})
export class TopSellingProductsComponent implements OnInit {
  products = signal<TopProductModel[]>([]);
  statistics = signal<TopProductsStatistics | null>(null);
  loading = false;
  pdfLoading = false;
  excelLoading = false;
  shareLoading = false;

  // Filters
  searchTerm = '';
  dateRange: Date[] | null = null;
  fromDate: Date | null = null;
  toDate: Date | null = null;
  topCount = 100;

  topCountOptions = [
    { label: 'أفضل 10', value: 10 },
    { label: 'أفضل 25', value: 25 },
    { label: 'أفضل 50', value: 50 },
    { label: 'أفضل 100', value: 100 },
    { label: 'الكل', value: 1000 }
  ];

  // Share Dialog
  showShareDialog = false;
  shareMethod: 'email' | 'whatsapp' = 'email';
  shareEmail = '';
  sharePhone = '';

  constructor(
    private topSellingService: TopSellingProductsService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const filters = this.buildFilters();

    this.topSellingService.getTopSellingProducts(filters).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading top selling products', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل البيانات'
        });
        this.loading = false;
      }
    });

    this.topSellingService.getStatistics(filters).subscribe({
      next: (stats) => {
        this.statistics.set(stats);
      },
      error: (err) => {
        console.error('Error loading statistics', err);
      }
    });
  }

  buildFilters(): TopProductsFilter {
    let fromDate: Date | undefined = undefined;
    let toDate: Date | undefined = undefined;

    if (this.dateRange && this.dateRange.length > 0) {
      fromDate = this.dateRange[0] || undefined;
      toDate = this.dateRange[1] || undefined;
    } else {
      fromDate = this.fromDate || undefined;
      toDate = this.toDate || undefined;
    }

    return {
      fromDate: fromDate,
      toDate: toDate,
      top: this.topCount,
      searchTerm: this.searchTerm || undefined
    };
  }

  applyFilters(): void {
    this.loadData();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dateRange = null;
    this.fromDate = null;
    this.toDate = null;
    this.topCount = 100;
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  getRankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }

  // PDF Download
  downloadPdf(): void {
    this.pdfLoading = true;
    const filters = this.buildFilters();

    this.topSellingService.exportToPdf(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `top-selling-products-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.pdfLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تحميل التقرير بنجاح'
        });
      },
      error: (err) => {
        console.error('Error downloading PDF', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل التقرير'
        });
        this.pdfLoading = false;
      }
    });
  }

  // Print PDF
  printPdf(): void {
    this.pdfLoading = true;
    const filters = this.buildFilters();

    this.topSellingService.exportToPdf(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        this.pdfLoading = false;
      },
      error: (err) => {
        console.error('Error printing PDF', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل طباعة التقرير'
        });
        this.pdfLoading = false;
      }
    });
  }

  // Excel Export
  exportExcel(): void {
    this.excelLoading = true;
    const filters = this.buildFilters();

    this.topSellingService.exportToExcel(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `top-selling-products-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.excelLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تصدير البيانات بنجاح'
        });
      },
      error: (err) => {
        console.error('Error exporting Excel', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تصدير البيانات'
        });
        this.excelLoading = false;
      }
    });
  }

  // Share Dialog
  openShareDialog(): void {
    this.shareMethod = 'email';
    this.shareEmail = '';
    this.sharePhone = '';
    this.showShareDialog = true;
  }

  confirmShare(): void {
    if (this.shareMethod === 'email') {
      if (!this.shareEmail) {
        this.messageService.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: 'يرجى إدخال البريد الإلكتروني'
        });
        return;
      }
      this.shareViaEmail();
    } else if (this.shareMethod === 'whatsapp') {
      if (!this.sharePhone) {
        this.messageService.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: 'يرجى إدخال رقم الهاتف'
        });
        return;
      }
      this.shareViaWhatsApp();
    }
  }

  private shareViaEmail(): void {
    this.shareLoading = true;
    const filters = this.buildFilters();

    this.topSellingService.shareViaEmail(this.shareEmail, filters).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم إرسال التقرير بنجاح'
        });
        this.showShareDialog = false;
        this.shareLoading = false;
      },
      error: (err) => {
        console.error('Error sharing via email', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل إرسال التقرير'
        });
        this.shareLoading = false;
      }
    });
  }

  private shareViaWhatsApp(): void {
    this.shareLoading = true;
    const filters = this.buildFilters();

    this.topSellingService.shareViaWhatsApp(this.sharePhone, filters).subscribe({
      next: (response) => {
        // Open WhatsApp link
        if (response?.response?.whatsAppUrl) {
          window.open(response.response.whatsAppUrl, '_blank');
        }
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail: 'تم تجهيز رابط المشاركة'
        });
        this.showShareDialog = false;
        this.shareLoading = false;
      },
      error: (err) => {
        console.error('Error sharing via WhatsApp', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل إنشاء رابط المشاركة'
        });
        this.shareLoading = false;
      }
    });
  }
}
