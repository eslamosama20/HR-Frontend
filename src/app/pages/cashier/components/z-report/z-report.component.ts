import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { getSystemNow } from 'src/app/utils/dateUtils';

@Component({
    selector: 'app-z-report',
    standalone: true,
    imports: [CustomDatePipe, 
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        ButtonModule,
        CardModule,
        TableModule,
        ToastModule,
        TagModule,
        DividerModule,
        CalendarModule,
        DropdownModule
    ],
    providers: [MessageService],
    templateUrl: './z-report.component.html',
    styleUrls: ['./z-report.component.scss']
})
export class ZReportComponent implements OnInit {
    loading = signal<boolean>(false);
    reportDate = getSystemNow();

    // Live Z-Report Data Signal
    reportData = signal<any>({
        reportDate: getSystemNow(),
        sessionNumber: '-',
        cashierName: '-',
        branchName: '-',
        openTime: null,
        closeTime: null,
        openingBalance: 0,

        // Sales Summary
        totalSales: 0,
        totalTax: 0,
        totalDiscounts: 0,
        netSales: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        totalRefunds: 0,
        refundCount: 0,

        // Payment Breakdown
        cashSales: 0,
        cardSales: 0,
        creditSales: 0,
        otherSales: 0,

        // Cash Reconciliation
        openingCash: 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: 0,
        actualCash: 0,
        cashDifference: 0,

        // Category Breakdown
        categoryBreakdown: [],
        cashActions: [],
        topProducts: []
    });

    constructor(
        private translateService: TranslateService,
        private messageService: MessageService,
        private cashierService: CashierService
    ) {}

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading.set(true);
        // Try loading current active session first
        this.cashierService.getCurrentSession().subscribe({
            next: (session) => {
                if (session && session.id) {
                    this.fetchZReport(session.id);
                } else {
                    this.fetchFallbackSession();
                }
            },
            error: () => {
                this.fetchFallbackSession();
            }
        });
    }

    private fetchFallbackSession(): void {
        this.cashierService.getSessions(1, 1).subscribe({
            next: (res) => {
                const sessions = res.items || [];
                if (sessions.length > 0 && sessions[0].id) {
                    this.fetchZReport(sessions[0].id);
                } else {
                    this.loading.set(false);
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'تنبيه',
                        detail: 'لم يتم العثور على أي وردية مفتوحة أو سابقة لعرض التقرير.'
                    });
                }
            },
            error: () => {
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'فشل تحميل تفاصيل الوردية السابقة'
                });
            }
        });
    }

    private fetchZReport(sessionId: number): void {
        this.cashierService.getZReport(sessionId).subscribe({
            next: (data) => {
                this.loading.set(false);
                if (data) {
                    this.reportData.set({
                        reportDate: data.reportDate ? new Date(data.reportDate) : getSystemNow(),
                        sessionNumber: data.sessionNumber || 'SS-' + sessionId,
                        cashierName: data.cashierName || 'Cashier',
                        branchName: data.storeName || 'الفرع الرئيسي',
                        openTime: data.openTime ? new Date(data.openTime) : null,
                        closeTime: data.closeTime ? new Date(data.closeTime) : null,
                        openingBalance: data.openingBalance || 0,

                        // Sales Summary
                        totalSales: data.totalSales || 0,
                        totalTax: data.totalTax || 0,
                        totalDiscounts: data.totalDiscounts || 0,
                        netSales: data.netSales || 0,
                        totalTransactions: data.totalTransactions || 0,
                        averageTransactionValue: data.totalTransactions > 0 ? (data.netSales / data.totalTransactions) : 0,
                        totalRefunds: data.refundsTotal ?? data.totalRefunds ?? 0,
                        refundCount: data.refundCount || 0,

                        // Payment Breakdown
                        cashSales: data.paymentBreakdown?.cashSales || 0,
                        cardSales: data.paymentBreakdown?.cardSales || 0,
                        creditSales: data.paymentBreakdown?.creditSales || 0,
                        otherSales: data.paymentBreakdown?.otherSales || 0,

                        // Cash Reconciliation
                        openingCash: data.cashReconciliation?.openingCash ?? data.openingBalance ?? 0,
                        cashIn: data.cashReconciliation?.cashIn || 0,
                        cashOut: data.cashReconciliation?.cashOut || 0,
                        expectedCash: data.cashReconciliation?.expectedCash || 0,
                        actualCash: data.cashReconciliation?.actualCash || 0,
                        cashDifference: data.cashReconciliation?.difference ?? data.cashReconciliation?.cashDifference ?? 0,

                        // Category Breakdown
                        categoryBreakdown: (data.categoryBreakdown || []).map((c: any) => ({
                            name: c.categoryName || c.name || 'General',
                            qty: c.qty ?? c.soldQty ?? c.itemCount ?? 0,
                            amount: c.amount ?? c.totalAmount ?? 0
                        })),
                        cashActions: [],
                        topProducts: (data.topProducts || []).map((p: any) => ({
                            name: p.productName || p.name || 'Product',
                            qty: p.qty ?? p.quantitySold ?? 0,
                            revenue: p.revenue ?? p.totalRevenue ?? 0
                        }))
                    });
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'خطأ في تحميل التقرير',
                    detail: err.error?.messageAr || err.error?.message || 'فشل تحميل تقرير Z-Report المالي من الخادم.'
                });
            }
        });
    }

    printReport(): void {
        window.print();
    }

    get taxRate(): number {
        const data = this.reportData();
        return data.totalSales > 0 ? (data.totalTax / data.totalSales) * 100 : 0;
    }

    get closedDuration(): string {
        const data = this.reportData();
        if (!data.openTime || !data.closeTime) return '-';
        const diffMs = data.closeTime.getTime() - data.openTime.getTime();
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        
        const hourLabel = this.translateService.instant('CASHIER_Z_REPORT.HOUR');
        const minuteLabel = this.translateService.instant('CASHIER_Z_REPORT.MINUTE');
        
        return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
    }
    getPercentOfTotal(value: number, total: number): number {
        if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
            return 0;
        }
        return (value / total) * 100;
    }
}

