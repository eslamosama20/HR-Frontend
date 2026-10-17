import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { HttpClient } from '@angular/common/http';
import { InventoryPermitService } from '../../../services/permits/inventory-permit.service';
import { InventoryPermitModel } from '../../../models/permits/inventory-permit.model';
import { MessageService } from 'primeng/api';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { environment } from 'src/environments/environment';

import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
interface TransferRecord {
  id: string;
  transferDate: Date;
  referenceNumber: string;
  fromStore: string;
  toStore: string;
  products: string;
  totalQuantity: number;
  shippingCost: number;
  status: string;
}

@Component({
  selector: 'app-store-transfer-list',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    CardModule,
    DialogModule,
    TabViewModule,
    ToastModule,
    TooltipModule
  ],
  templateUrl: './store-transfer-list.component.html',
  styleUrls: ['./store-transfer-list.component.scss'],
  providers: [MessageService]
})
export class StoreTransferListComponent implements OnInit {
  transfers = signal<TransferRecord[]>([]);
  loading = signal(false);

  // Share dialog
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;
  
  private readonly baseApi = environment.server_urls[environment.active_server].baseApi;
  
  constructor(
    private router: Router,
    private inventoryPermitService: InventoryPermitService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private http: HttpClient,
    private pdfUtils: PdfUtilsService
  ) {}

  ngOnInit(): void {
    this.loadTransfers();
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }

  loadTransfers(): void {
    this.loading.set(true);
    
    // Load all permits and filter for transfers (paired Exit/Entry permits)
    this.inventoryPermitService.getAll().subscribe({
      next: (permits) => {
        console.log('Total permits loaded:', permits.length);
        
        // Group permits by reference number to find transfer pairs
        const transferMap = new Map<string, InventoryPermitModel[]>();
        
        permits.forEach(permit => {
          console.log('Checking permit:', permit.referenceNumber, permit.permitType);
          
          if (permit.referenceNumber && 
              (permit.referenceNumber.startsWith('EXIT-') || 
               permit.referenceNumber.startsWith('ENTRY-'))) {
            const baseRef = permit.referenceNumber.replace(/^(EXIT|ENTRY)-/, '');
            if (!transferMap.has(baseRef)) {
              transferMap.set(baseRef, []);
            }
            transferMap.get(baseRef)!.push(permit);
          }
        });
        
        console.log('Transfer pairs found:', transferMap.size);
        
        // Convert to transfer records
        const transfersList: TransferRecord[] = [];
        transferMap.forEach((permits, baseRef) => {
          const exitPermit = permits.find(p => p.permitType === 'Exit');
          const entryPermit = permits.find(p => p.permitType === 'Entry');
          
          if (exitPermit && entryPermit) {
            // Calculate total quantity
            const totalQuantity = exitPermit.permitEntries?.reduce(
              (sum, entry) => sum + (entry.quantity || 0), 
              0
            ) || 0;
            
            // Get shipping cost (stored in description or a specific field)
            const shippingCost = exitPermit.shippingCost || 0;
            
            // Get product names
            const productNames = exitPermit.permitEntries?.map(entry => {
              if (entry.mainPurchaseClass) {
                return entry.mainPurchaseClass.arabicName || entry.mainPurchaseClass.englishName;
              } else if (entry.mainSalesClass) {
                return entry.mainSalesClass.arabicName || entry.mainSalesClass.englishName;
              }
              return 'صنف';
            }).filter(Boolean).join(', ') || '-';
            
            transfersList.push({
              id: baseRef,
              transferDate: new Date(exitPermit.permitDate),
              referenceNumber: baseRef,
              fromStore: exitPermit.storeDetails?.arabicName || exitPermit.storeDetailsId || '',
              toStore: entryPermit.storeDetails?.arabicName || entryPermit.storeDetailsId || '',
              products: productNames,
              totalQuantity: totalQuantity,
              shippingCost: shippingCost,
              status: 'مكتمل'
            });
          }
        });
        
        // Sort by date descending
        transfersList.sort((a, b) => b.transferDate.getTime() - a.transferDate.getTime());
        
        console.log('Final transfers list:', transfersList);
        
        this.transfers.set(transfersList);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading transfers:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل سجل التحويلات'
        });
        this.loading.set(false);
      }
    });
  }

  addNewTransfer(): void {
    this.router.navigate(['/inventory/transfer/new']);
  }

  viewTransferDetails(transfer: TransferRecord): void {
    // Navigate to view details page
    console.log('View transfer:', transfer);
  }

  deleteTransfer(transfer: TransferRecord): void {
    // Implement delete functionality
    console.log('Delete transfer:', transfer);
  }

  // ====================================
  // Export and Share Functions
  // ====================================

  exportToExcel(): void {
    if (!this.transfers() || this.transfers().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      const data = this.transfers().map((item, index) => ({
        'م': index + 1,
        'تاريخ التحويل': item.transferDate ? this.formatDate(new Date(item.transferDate)) : '-',
        'رقم المرجع': item.referenceNumber || '-',
        'من المخزن': item.fromStore || '-',
        'إلى المخزن': item.toStore || '-',
        'الأصناف': item.products || '-',
        'الكمية': item.totalQuantity || 0,
        'رسوم الشحن': item.shippingCost || 0,
        'الحالة': item.status || '-'
      }));

      // Add summary rows
      const totalTransfers = this.transfers().length;
      const totalQuantity = this.transfers().reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
      const totalShippingCost = this.transfers().reduce((sum, item) => sum + (item.shippingCost || 0), 0);

      data.push({} as any); // Empty row
      data.push({
        'م': '',
        'تاريخ التحويل': 'الإجماليات',
        'رقم المرجع': '',
        'من المخزن': '',
        'إلى المخزن': '',
        'الأصناف': '',
        'الكمية': '',
        'رسوم الشحن': '',
        'الحالة': ''
      } as any);
      data.push({
        'م': '',
        'تاريخ التحويل': 'إجمالي عمليات النقل',
        'رقم المرجع': totalTransfers.toString(),
        'من المخزن': '',
        'إلى المخزن': '',
        'الأصناف': '',
        'الكمية': '',
        'رسوم الشحن': '',
        'الحالة': ''
      } as any);
      data.push({
        'م': '',
        'تاريخ التحويل': 'إجمالي الكمية المنقولة',
        'رقم المرجع': totalQuantity.toLocaleString('ar-SA'),
        'من المخزن': '',
        'إلى المخزن': '',
        'الأصناف': '',
        'الكمية': '',
        'رسوم الشحن': '',
        'الحالة': ''
      } as any);
      data.push({
        'م': '',
        'تاريخ التحويل': 'إجمالي رسوم الشحن',
        'رقم المرجع': totalShippingCost.toLocaleString('ar-SA'),
        'من المخزن': '',
        'إلى المخزن': '',
        'الأصناف': '',
        'الكمية': '',
        'رسوم الشحن': '',
        'الحالة': ''
      } as any);

      this.pdfUtils.exportToExcel(data, `تقرير_نقل_المخزون_${this.formatDateForFileName(new Date())}`);
      
      this.messageService.add({
        severity: 'success',
        summary: 'نجح التصدير',
        detail: 'تم تصدير الملف بنجاح'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير الملف'
      });
    }
  }

  async exportToPdf(): Promise<void> {
    if (!this.transfers() || this.transfers().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للتصدير'
      });
      return;
    }

    try {
      const fileName = `تقرير_نقل_المخزون_${this.formatDateForFileName(new Date())}.pdf`;
      const url = `${this.baseApi}inventoryPermit/Report/store-transfer-document`;
      
      this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (response: Blob) => {
          this.pdfUtils.downloadFile(response, fileName);
          this.messageService.add({
            severity: 'success',
            summary: 'نجح التصدير',
            detail: 'تم تصدير التقرير بنجاح'
          });
        },
        error: (error) => {
          console.error('Error exporting PDF:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ في التصدير',
            detail: 'فشل في تصدير التقرير'
          });
        }
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في التصدير',
        detail: 'فشل في تصدير التقرير'
      });
    }
  }

  printPDF(): void {
    if (!this.transfers() || this.transfers().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للطباعة'
      });
      return;
    }

    try {
      const url = `${this.baseApi}inventoryPermit/Report/store-transfer-document`;
      
      this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (response: Blob) => {
          this.pdfUtils.printBlob(response);
        },
        error: (error) => {
          console.error('Print error:', error);
          this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل طباعة التقرير' });
        }
      });
    } catch (error) {
      console.error('Print error', error);
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل طباعة التقرير' });
    }
  }

  // Share Functions
  openShareDialog(): void {
    if (!this.transfers() || this.transfers().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'لا توجد بيانات للمشاركة'
      });
      return;
    }
    
    this.shareDialogVisible = true;
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.shareForm.reset();
  }

  async shareReport(): Promise<void> {
    if (!this.shareForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'بيانات غير صحيحة',
        detail: 'يرجى التحقق من البيانات المدخلة'
      });
      return;
    }

    try {
      this.shareBusy = true;
      const formData = this.shareForm.value;

      const shareData = {
        method: this.shareActiveTabIndex === 0 ? 'email' : 'whatsapp',
        receiver: this.shareActiveTabIndex === 0 ? formData.email : formData.whatsappNumber
      };

      const response = await this.http.post(
        `${this.baseApi}inventoryPermit/Report/store-transfer-share`,
        shareData
      ).toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'تم إرسال التقرير',
        detail: this.shareActiveTabIndex === 0 
          ? 'تم إرسال التقرير على البريد الإلكتروني'
          : 'تم إرسال التقرير على الواتساب'
      });

      if (this.shareActiveTabIndex === 1) {
        const links = this.extractWhatsAppLinks(response);
        if (links.length > 0) {
          setTimeout(() => {
            links.forEach(link => this.openWhatsAppLink(link));
          }, 500);
        }
      }

      this.closeShareDialog();
    } catch (error) {
      console.error('Error sharing report:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ في المشاركة',
        detail: 'فشل في إرسال التقرير'
      });
    } finally {
      this.shareBusy = false;
    }
  }

  // ====================================
  // Helper Functions
  // ====================================

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateForFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}`;
  }

  private openWhatsAppLink(url: string) {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.location.href = url;
    }
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

    const bags = [res?.responses, res?.items, res?.data]?.filter(Array.isArray);
    if (bags?.length) {
      bags.forEach((arr: any[]) => {
        arr.forEach((item) => {
          const link = item?.response?.whatsAppLink || item?.whatsAppLink;
          if (link) links.push(link);
        });
      });
    }

    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    return Array.from(new Set(links.filter(Boolean)));
  }
}
