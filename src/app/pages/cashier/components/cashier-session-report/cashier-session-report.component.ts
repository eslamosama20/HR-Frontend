import { Component, OnInit } from '@angular/core';
import { CommonModule,NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { formatDisplayDate, formatDateToString } from 'src/app/utils/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

interface SessionReport {
  session: {
    sessionId: number;
    sessionNumber: string;
    cashierName: string;
    openingDate: Date;
    closingDate?: Date;
    status: number;
    statusName: string;
    openingBalance: number;
    closingBalance?: number;
    expectedBalance?: number;
    actualBalance?: number;
    difference?: number;
    notes?: string;
  };
  statistics: {
    totalTransactions: number;
    totalSalesAmount: number;
    totalRefundsAmount: number;
    netSales: number;
    totalCash: number;
    totalCard: number;
    totalCredit: number;
    totalItemsSold: number;
    averageTransactionValue: number;
  };
  invoices: any[];
  refunds: any[];
}

@Component({
  selector: 'app-cashier-session-report',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    DividerModule,
    ToastModule,
    NgOptimizedImage,
    CustomDatePipe
  ],
  providers: [MessageService],
  templateUrl: './cashier-session-report.component.html',
  styleUrls: ['./cashier-session-report.component.scss']
})
export class CashierSessionReportComponent implements OnInit {
  sessionId: number = 0;
  report: SessionReport | null = null;
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cashierService: CashierService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.sessionId = +params['id'];
      if (this.sessionId) {
        this.loadReport();
      }
    });
  }

  loadReport() {
    this.loading = true;
    this.cashierService.getSessionReport(this.sessionId)
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading session report:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل تحميل تقرير الوردية'
          });
          this.loading = false;
        }
      });
  }

  goBack() {
    this.router.navigate(['/cashier/session']);
  }

  print() {
    window.print();
  }

  exportExcel() {
    if (!this.report) return;

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    
    // Session Info
    XLSX.utils.sheet_add_aoa(ws, [
      ['تقرير الوردية'],
      ['رقم الوردية:', this.report.session.sessionNumber],
      ['الكاشير:', this.report.session.cashierName],
      ['وقت الفتح:', formatDateToString(this.report.session.openingDate)],
      ['وقت الإغلاق:', this.report.session.closingDate ? formatDateToString(this.report.session.closingDate) : 'مفتوحة'],
      ['الحالة:', this.report.session.statusName],
      [],
      ['الإحصائيات'],
      ['إجمالي المعاملات:', this.report.statistics.totalTransactions],
      ['إجمالي المبيعات:', this.report.statistics.totalSalesAmount],
      ['إجمالي المرتجعات:', this.report.statistics.totalRefundsAmount],
      ['صافي المبيعات:', this.report.statistics.netSales],
      ['الرصيد الافتتاحي:', this.report.session.openingBalance],
      ['الرصيد المتوقع:', this.report.session.expectedBalance || 0],
      ['الرصيد الفعلي:', this.report.session.actualBalance || 0],
      ['الفرق:', this.report.session.difference || 0],
      [],
      ['الفواتير']
    ]);

    // Invoices
    const invoiceData = this.report.invoices.map(inv => ({
      'رقم الفاتورة': inv.invoiceNo,
      'التاريخ': formatDateToString(inv.invoiceDate),
      'العميل': inv.customerName,
      'المبلغ': inv.totalAmount,
      'طريقة الدفع': inv.paymentMethodName,
      'حالة': inv.isRefunded ? 'مرتجع' : 'عادي'
    }));

    XLSX.utils.sheet_add_json(ws, invoiceData, { origin: -1 });

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الوردية');
    XLSX.writeFile(wb, `session-report-${this.report.session.sessionNumber}.xlsx`);

    this.messageService.add({
      severity: 'success',
      summary: 'نجح',
      detail: 'تم تصدير التقرير إلى Excel'
    });
  }

  exportPDF() {
    if (!this.report) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add custom Arabic font (you need to include this in your assets)
    // For now, using standard font
    doc.setFontSize(16);
    doc.text('تقرير الوردية', 105, 15, { align: 'center' });

    // Session Info
    doc.setFontSize(12);
    let yPos = 30;
    doc.text(`رقم الوردية: ${this.report.session.sessionNumber}`, 20, yPos);
    yPos += 7;
    doc.text(`الكاشير: ${this.report.session.cashierName}`, 20, yPos);
    yPos += 7;
    doc.text(`وقت الفتح: ${formatDateToString(this.report.session.openingDate)}`, 20, yPos);
    yPos += 7;
    if (this.report.session.closingDate) {
      doc.text(`وقت الإغلاق: ${formatDateToString(this.report.session.closingDate)}`, 20, yPos);
      yPos += 7;
    }
    doc.text(`الحالة: ${this.report.session.statusName}`, 20, yPos);
    yPos += 10;

    // Statistics
    doc.setFontSize(14);
    doc.text('الإحصائيات', 20, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.text(`إجمالي المعاملات: ${this.report.statistics.totalTransactions}`, 20, yPos);
    yPos += 5;
    doc.text(`إجمالي المبيعات: ${this.report.statistics.totalSalesAmount.toFixed(2)} ريال`, 20, yPos);
    yPos += 5;
    doc.text(`إجمالي المرتجعات: ${this.report.statistics.totalRefundsAmount.toFixed(2)} ريال`, 20, yPos);
    yPos += 5;
    doc.text(`صافي المبيعات: ${this.report.statistics.netSales.toFixed(2)} ريال`, 20, yPos);
    yPos += 10;

    // Invoices table
    const tableData = this.report.invoices.map(inv => [
      inv.invoiceNo,
      formatDisplayDate(inv.invoiceDate),
      inv.customerName,
      inv.totalAmount.toFixed(2),
      inv.paymentMethodName,
      inv.isRefunded ? 'مرتجع' : 'عادي'
    ]);

    autoTable(doc, {
      head: [['رقم الفاتورة', 'التاريخ', 'العميل', 'المبلغ', 'طريقة الدفع', 'الحالة']],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 8 }
    });

    doc.save(`session-report-${this.report.session.sessionNumber}.pdf`);

    this.messageService.add({
      severity: 'success',
      summary: 'نجح',
      detail: 'تم تصدير التقرير إلى PDF'
    });
  }

  shareWhatsApp() {
    if (!this.report) return;

    const message = `
تقرير الوردية - ${this.report.session.sessionNumber}
الكاشير: ${this.report.session.cashierName}
إجمالي المعاملات: ${this.report.statistics.totalTransactions}
إجمالي المبيعات: ${this.report.statistics.totalSalesAmount.toFixed(2)} ريال
صافي المبيعات: ${this.report.statistics.netSales.toFixed(2)} ريال
    `.trim();

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  shareEmail() {
    if (!this.report) return;

    const subject = `تقرير الوردية - ${this.report.session.sessionNumber}`;
    const body = `
تقرير الوردية
رقم الوردية: ${this.report.session.sessionNumber}
الكاشير: ${this.report.session.cashierName}
وقت الفتح: ${new Date(this.report.session.openingDate).toLocaleString('ar-EG')}
${this.report.session.closingDate ? `وقت الإغلاق: ${new Date(this.report.session.closingDate).toLocaleString('ar-EG')}` : ''}

الإحصائيات:
إجمالي المعاملات: ${this.report.statistics.totalTransactions}
إجمالي المبيعات: ${this.report.statistics.totalSalesAmount.toFixed(2)} ريال
إجمالي المرتجعات: ${this.report.statistics.totalRefundsAmount.toFixed(2)} ريال
صافي المبيعات: ${this.report.statistics.netSales.toFixed(2)} ريال
    `.trim();

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }
}
