import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  LOCALE_ID,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import FormsModule
import { SharedModule } from '../../../_metronic/shared/shared.module';
import { PERMISSIONS } from 'src/app/config/permissions';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InvoiceShareModalComponent } from '../../../shared-components/invoice-share-modal/invoice-share-modal.component';
import {
  SalesInvoiceImportResult,
  SalesInvoiceService,
} from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from 'src/app/modules/i18n';
import { InvoicePaymentStatus } from 'src/app/models/invoicePaymentStatus';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TooltipModule } from 'primeng/tooltip';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import * as XLSX from 'xlsx';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { formatDateToUTCString, parseDateOnly } from 'src/app/utils/dateUtils';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { OverlayPanel } from 'primeng/overlaypanel';
import { forkJoin, Subject, from, firstValueFrom, of, Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import {
  finalize,
  debounceTime,
  switchMap,
  takeUntil,
  concatMap,
  reduce,
  map,
  catchError,
} from 'rxjs/operators';
import { PrintDocumentComponent } from '../../../shared-components/print-document/print-document.component';
import { QRCodeModule } from 'angularx-qrcode';
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { StickyHorizontalScrollDirective } from '../../../shared-components/directives/sticky-horizontal-scroll.directive';

interface IgnoredInvoiceInfo {
  row?: number;
  errorCode?: string;
  refNo: string;
  customerName: string;
  invoiceDate: string;
  reason: string;
  missingItems?: string[];
}

interface TempParsedItem {
  itemName: string;
  quantity: number;
  price: number;
}
interface TempParsedInvoice {
  refNo: string;
  customerName: string;
  dateStr: string;
  items: TempParsedItem[];
}
interface ImportPreviewInvoice {
  refNo: string;
  customerName: string;
  invoiceDate: string;
  itemsCount: number;
  total: number;
}

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-sales-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    RadioButtonModule,
    InputSwitchModule,
    SharedModule,
    TranslateModule,
    FormsModule,
    RouterLink,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    OverlayPanelModule,
    FormatDecimalPipe,
    ConfirmDialogModule,
    DialogModule,
    ToastModule,
    TooltipModule,
    CustomDatePipe,
    TabViewModule,
    ReactiveFormsModule,
    DropdownModule,
    PrintDocumentComponent,
    InvoiceShareModalComponent,
    QRCodeModule,
    StickyHorizontalScrollDirective,
  ], // Add FormsModule here
  templateUrl: './sales-invoice-list.component.html',
  styleUrl: './sales-invoice-list.component.scss',
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class SalesInvoiceListComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  InvoicePaymentStatus = InvoicePaymentStatus;
  get isRtlLanguage(): boolean {
    return this.activeLanguage === 'ar';
  }

  invoicesSignal = signal<SalesInvoice[]>([]);
  get invoices() {
    return this.invoicesSignal();
  }
  set invoices(value: SalesInvoice[]) {
    this.invoicesSignal.set(value);
  }

  // Arabic Comments: خصائص داياليج التحقق من بيانات زاتكا قبل الإرسال
  zatcaPreCheckDialogVisible = false;
  zatcaPreCheck: {
    invoiceType: 'standard' | 'simplified';
    invoiceId: number | null;
    customerId?: string;
    companyErrors: string[];
    customerErrors: string[];
    warnings: string[];
    hasBlockingErrors: boolean;
  } = {
      invoiceType: 'simplified',
      invoiceId: null,
      customerId: undefined,
      companyErrors: [],
      customerErrors: [],
      warnings: [],
      hasBlockingErrors: false
    };

  // Keep old props for bulk-send errors dialog
  zatcaErrorDialogVisible = false;
  zatcaErrors: { invoiceNo: string, errorMsg: string, customerId?: string, isCompanyError: boolean, isCustomerError: boolean }[] = [];

  // Arabic Comments: خصائص داياليج التحقق الجماعي لإرسال فواتير متعددة لزاتكا
  readonly BULK_ZATCA_MAX = 20;
  bulkZatcaPreCheckDialogVisible = false;
  bulkZatcaValidating = false;
  bulkZatcaValidationResults: {
    invoiceId: number;
    invoiceNo: string;
    invoiceType: 'standard' | 'simplified';
    customerId?: string;
    status: 'ready' | 'warnings' | 'error';
    companyErrors: string[];
    customerErrors: string[];
    warnings: string[];
  }[] = [];

  get bulkReadyCount() { return this.bulkZatcaValidationResults.filter(r => r.status === 'ready' || r.status === 'warnings').length; }
  get bulkWarningsCount() { return this.bulkZatcaValidationResults.filter(r => r.status === 'warnings').length; }
  get bulkErrorCount() { return this.bulkZatcaValidationResults.filter(r => r.status === 'error').length; }

  goToCustomer(customerId?: string) {
    if (customerId) {
      const url = this.router.serializeUrl(this.router.createUrlTree(['/accounting/customer-profile', customerId]));
      window.open(url, '_blank');
    }
  }

  goToCompanySettings() {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/company-details']));
    window.open(url, '_blank');
  }

  /** إنشاء سند قبض للفاتورة المحددة */
  createReceiptForInvoice(invoiceId?: number) {
    let id = invoiceId;
    if (!id) {
      const selected = this.selectedInvoices && this.selectedInvoices.length ? this.selectedInvoices[0] : null;
      id = selected?.id;
    }
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'يجب اختيار فاتورة واحدة على الأقل'
      });
      return;
    }
    // راوت صفحة إضافة سند قبض جديد مع كويري برامتر
    this.router.navigate(['/receipts/paycheck-receipts/new'], {
      queryParams: { connectedSalesInvoiceId: id }
    });
  }
  // 📨 مشاركة فواتير
  invoiceShareDialogVisible = false;
  invoiceShareActiveTabIndex = 0;
  invoiceShareTarget: any | null = null;  // فاتورة واحدة
  shareBulkMode = false;                  // لو true → إرسال جماعي
  shareBulkIds: number[] = [];            // IDs للفواتير المختارة
  shareBusy = false;
  showTopSettingsPanel = false;
  showStamp: boolean = true;
  anyPolicyChecked: boolean = true;
  anyBankChecked: boolean = true;
  policiesCollapsed: boolean = true;
  bankAccountCollapsed: boolean = true;
  selectedPolicies: { id: string, name: string, nameEn: string, checked: boolean }[] = [];
  selectedBanks: { id: string, bankName: string, bankNameEn: string, accountNumber: string, iban: string, accountName: string, swiftCode?: string, checked: boolean }[] = [];
  totalRecords: number = 0;
  rowsPerPageOptions: number[] = [10, 25, 50, 100]; // خيارات ثابتة معتادة

  @ViewChild('printComponent2') printComponent2!: PrintDocumentComponent;
  @ViewChild('printComponent3') printComponent3!: PrintDocumentComponent;
  activePrintMode: 'print2' | 'print3' = 'print2';
  docData: any[] = [];
  sellerName: string = '';
  useLandscape: boolean = false;
  descriptionRowsPerPage: number = 8;

  pageSize: number = 10;     // هتتحكم فيها من [rows] و [rowsPerPageOptions]
  currentPage: number = 1;
  private destroy$ = new Subject<void>();
  private lazyLoad$ = new Subject<any>();
  sortField: string = 'issueDate';
  sortOrder: number = -1;
  // Reactive form للتبويبين
  invoiceShareForm!: FormGroup;

  /** إعادة تهيئة آمنة للفورم */
  private resetShareForm(
    initial?: Partial<{ email: string; whatsappNumber: string }>
  ) {
    if (!this.invoiceShareForm) return;
    this.invoiceShareForm.reset({
      email: initial?.email ?? '',
      whatsappNumber: initial?.whatsappNumber ?? '',
    });

    // تنظيف الحالة بالكامل:
    this.invoiceShareForm.markAsPristine();
    this.invoiceShareForm.markAsUntouched();
    this.invoiceShareForm.updateValueAndValidity({ emitEvent: false });

    // لو حصل disable قبل كده بسبب shareBusy:
    this.invoiceShareForm.enable({ emitEvent: false });
  }

  /** إعادة تهيئة حالة المشاركة بالكامل */
  private resetShareState() {
    this.shareBusy = false;
    this.shareBulkMode = false;
    this.shareBulkIds = [];
    this.invoiceShareTarget = null;
    this.invoiceShareActiveTabIndex = 0;
    this.resetShareForm();
  }
  copyInvoice(entry: any) {
    const id = typeof entry === 'number' ? entry : entry?.id;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'لا يوجد رقم فاتورة لنسخه.',
      });
      return;
    }

    // لو القائمة الحالية “Frontal” استخدم مسار frontal-new، غير كده /invoices/new
    const route = this.isFrontal
      ? ['/invoices/frontal-new']
      : ['/invoices/new'];

    this.router.navigate(route, {
      queryParams: { copyId: id },
    });

    // اقفل البانل بعد الضغط
    try {
      this.opInvoice?.hide();
    } catch (error) {
      console.warn('Unable to close invoice overlay', error);
    }
  }

  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal = signal<any[]>([]);
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }
  private formatDateForExcel(d: any): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private tYesNo(v: boolean): string {
    return this.activeLanguage === 'ar' ? (v ? 'نعم' : 'لا') : v ? 'Yes' : 'No';
  }
  private invoiceTypeLabel(inv: SalesInvoice): string {
    const isReservation =
      inv?.saleInvoiceType === 1 || inv?.invoiceType === 'reservation';
    if (this.activeLanguage === 'ar') {
      return isReservation ? 'فاتورة حجز يدوي' : 'فاتورة مبيعات';
    }
    return isReservation ? 'Reservation Invoice' : 'Sales Invoice';
  }
  private exportInvoicesToExcel(
    invoices: SalesInvoice[],
    fileName?: string
  ): void {
    try {
      const isAr = this.activeLanguage === 'ar';
      const header = isAr
        ? [
          'رقم الفاتورة (ID)',
          'رقم الفاتورة',
          'نوع الفاتورة',
          'تاريخ الإصدار',
          'تاريخ الاستحقاق',
          'العميل',
          'الرقم الضريبي للعميل',
          'الوصف',
          'مُرحلة؟',
          'رقم القيد',
          'خصم الفاتورة',
          'صافي الفاتورة',
          'ضريبة الفاتورة',
          'إجمالي الفاتورة',
          // تفاصيل الصنف
          'رقم البند',
          'كود الصنف',
          'اسم الصنف',
          'الوحدة',
          'الكمية',
          'السعر',
          'صافي البند',
          'ضريبة البند',
          'إجمالي البند',
        ]
        : [
          'Invoice ID',
          'Invoice No',
          'Invoice Type',
          'Issue Date',
          'Due Date',
          'Customer',
          'Customer Tax No',
          'Description',
          'Cleared?',
          'Transaction Id',
          'Invoice Discount',
          'Invoice Net',
          'Invoice Tax',
          'Invoice Total',
          // Item
          'Item No',
          'Item Code',
          'Item Name',
          'Unit',
          'Quantity',
          'Price',
          'Item Net',
          'Item Tax',
          'Item Total',
        ];

      const rows: any[][] = [header];

      // سنحتاج merges لدمج خلايا الهيدر عبر صفوف البنود
      const merges: XLSX.Range[] = [];

      // مؤشر الصف الحالي داخل الـ sheet (0-based)، 0 للهيدر، فالبيانات تبدأ من 1
      let currentRow = 1;

      // helper لتقريب الأرقام لرقمين عشريين
      const to2 = (v: any): number => {
        const n = Number(v ?? 0);
        return Math.round(n * 100) / 100;
      };

      invoices.forEach((inv) => {
        const customerName =
          this.activeLanguage === 'en'
            ? inv?.customerProfile?.englishName
            : inv?.customerProfile?.arabicName;

        // أعمدة الفاتورة (الهيدر) — لاحظ الأرقام مُقربة لرقمين
        const baseCols = [
          inv?.id ?? '',
          inv?.invoiceNo ?? '',
          this.invoiceTypeLabel(inv),
          this.formatDateForExcel(inv?.issueDate),
          this.formatDateForExcel(inv?.dueDate),
          customerName ?? '',
          inv?.customerProfile?.taxNumber ?? '',
          inv?.description ?? '',
          this.tYesNo(!!inv?.isCleared),
          inv?.transactionId ?? '',
          to2(inv?.discountAmount ?? 0),
          to2(this.getNetPrice(inv)),
          to2(this.getTaxAmount(inv)),
          to2(this.getTotalPrice(inv)),
        ];

        const items = Array.isArray(inv?.saleItems) ? inv.saleItems : [];

        if (!items.length) {
          // فاتورة بدون عناصر: صف واحد ونعمل أعمدة العناصر فاضية
          rows.push([
            ...baseCols,
            '',
            '',
            '',
            '',
            to2(0),
            to2(0),
            to2(0),
            to2(0),
            to2(0),
          ]);
          // لا حاجة للدمج هنا لأن عدد صفوف البنود = 1 فقط
          currentRow += 1;
          return;
        }

        // اول بند: نحط الهيدر + البند
        items.forEach((item, idx) => {
          const unitSymbol =
            this.activeLanguage === 'en'
              ? item?.mainSalesClass?.measurementUnit?.englishSymbol ?? ''
              : item?.mainSalesClass?.measurementUnit?.arabicSymbol ?? '';

          const itemName =
            this.activeLanguage === 'en'
              ? item?.mainSalesClass?.englishName ?? ''
              : item?.mainSalesClass?.arabicName ?? '';

          // صف البند الحالي
          const itemCols = [
            item?.itemNo ?? idx + 1,
            item?.mainSalesClass?.referenceCode ?? '',
            itemName,
            unitSymbol,
            to2(item?.quantity ?? 0),
            to2(item?.price ?? 0),
            to2(this.getItemNetPrice(item)),
            to2(this.getItemTaxAmount(item)),
            to2(this.getItemTotalPrice(item)),
          ];

          if (idx === 0) {
            // صف أول بند: نحط الهيدر
            rows.push([...baseCols, ...itemCols]);
          } else {
            // صفوف البنود التالية: نترك أعمدة الهيدر فاضية
            rows.push([...Array(baseCols.length).fill(''), ...itemCols]);
          }
        });

        // دمج أعمدة الهيدر (0..baseCols.length-1) عبر صفوف البنود لهذه الفاتورة
        const itemsCount = Math.max(1, items.length);
        for (let c = 0; c < baseCols.length; c++) {
          merges.push({
            s: { r: currentRow + 0, c }, // بداية الدمج عند أول صف بند
            e: { r: currentRow + itemsCount - 1, c }, // نهاية الدمج عند آخر صف بند
          });
        }

        // حدث مؤشر الصف الحالي
        currentRow += itemsCount;
      });

      // إنشاء الشيت
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // إضافة الدمج
      (ws as any)['!merges'] = merges;

      // ضبط عرض الأعمدة تلقائيًا
      const colWidths = rows[0].map((_, colIdx) => ({
        wch:
          Math.max(
            ...rows.map((r) => (r[colIdx] ? String(r[colIdx]).length : 0))
          ) + 2,
      }));
      (ws as any)['!cols'] = colWidths;

      // ضبط تنسيق الأرقام إلى 0.00 للأعمدة الرقمية
      // الأعمدة الرقمية حسب الترتيب:
      // 10: Invoice Discount, 11: Invoice Net, 12: Invoice Tax, 13: Invoice Total
      // 18: Quantity, 19: Price, 20: Item Net, 21: Item Tax, 22: Item Total
      const numericCols = [10, 11, 12, 13, 18, 19, 20, 21, 22];
      for (let r = 1; r < rows.length; r++) {
        // من بعد الهيدر
        for (const c of numericCols) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = (ws as any)[addr];
          if (!cell) continue;
          // لو القيمة رقمية، نضمن تنسيق العرض 0.00
          if (typeof cell.v === 'number') {
            cell.z = '0.00';
            // نضمن تقريـب القيمة نفسها لرقمين
            cell.v = Math.round(cell.v * 100) / 100;
          } else if (typeof cell.v === 'string' && cell.v.trim() !== '') {
            // محاولة تحويل النص لرقم مع تنسيق — في حال وصلتنا قيمة كـ string
            const num = Number(cell.v.replace(/,/g, ''));
            if (!isNaN(num)) {
              cell.v = Math.round(num * 100) / 100;
              cell.t = 'n';
              cell.z = '0.00';
            }
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

      const finalFileName =
        fileName ||
        (isAr ? 'الفواتير_مع_التفاصيل.xlsx' : 'Invoices_With_Items.xlsx');
      setTimeout(() => {
        XLSX.writeFile(wb, finalFileName);
        this.loading = false;
        this.cdr.detectChanges();
      }, 0);
    } catch (err) {
      console.error(err);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
        detail: 'فشل إنشاء ملف التصدير',
      });
    } finally {
      this.loading = false;
    }
  }

  private fetchInvoicesByIds(ids: number[], chunkSize: number = 50) {
    const uniqueIds = Array.from(new Set(ids.filter((v) => v != null)));
    const chunks: number[][] = [];
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      chunks.push(uniqueIds.slice(i, i + chunkSize));
    }
    return from(chunks).pipe(
      concatMap((chunk) =>
        forkJoin(chunk.map((id) => this.salesInvoiceService.getInvoiceById(id)))
      ),
      reduce(
        (all, chunkInvoices) => all.concat(chunkInvoices),
        [] as SalesInvoice[]
      )
    );
  }

  exportAllInvoicesToExcel(): void {
    this.loading = true;
    const list$ = this.isFrontal
      ? this.salesInvoiceService.getAllFrontalInvoices()
      : this.salesInvoiceService.getAllInvoices();

    list$.subscribe({
      next: (list) => {
        const ids = (list || [])
          .map((inv) => inv?.id)
          .filter((v: any) => v != null);

        if (!ids.length) {
          this.loading = false;
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
            detail:
              this.translate.instant('INVOICE.NO_INVOICES') ||
              'لا توجد فواتير للتصدير',
          });
          return;
        }

        this.fetchInvoicesByIds(ids).subscribe({
          next: (invoices) => {
            const fileName =
              this.activeLanguage === 'ar'
                ? 'كل_فواتير_المبيعات_بالتفاصيل.xlsx'
                : 'All_Sales_Invoices_With_Items.xlsx';
            this.exportInvoicesToExcel(invoices, fileName);
          },
          error: (err) => {
            console.error(err);
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
              detail: 'فشل تحميل بيانات كل الفواتير',
            });
          },
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: 'فشل تحميل قائمة الفواتير',
        });
      },
    });
  }
  exportSelectedInvoicesToExcel(): void {
    // لازم يكون فيه فواتير محددة بالـ checkbox
    const selected = (this.selectedInvoices || [])
      .map((i) => i?.id)
      .filter((v: any) => v != null);
    if (!selected.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'من فضلك اختر فاتورة واحدة على الأقل',
      });
      return;
    }

    this.loading = true;

    forkJoin(
      selected.map((id) => this.salesInvoiceService.getInvoiceById(id))
    ).subscribe({
      next: (invoices) => {
        this.exportInvoicesToExcel(invoices);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: 'فشل تحميل بيانات الفواتير المختارة',
        });
      },
    });
  }


  transactionsFilterTypeSignal = signal<string>('all');
  get transactionsFilterType() {
    return this.transactionsFilterTypeSignal();
  }
  set transactionsFilterType(value: string) {
    this.transactionsFilterTypeSignal.set(value);
  }

  showCompanySignatureSignal = signal<boolean>(true);
  get showCompanySignature(): boolean {
    return this.showCompanySignatureSignal();
  }
  set showCompanySignature(value: boolean) {
    this.showCompanySignatureSignal.set(value);
  }

  showCustomerSignatureSignal = signal<boolean>(true);
  get showCustomerSignature(): boolean {
    return this.showCustomerSignatureSignal();
  }
  set showCustomerSignature(value: boolean) {
    this.showCustomerSignatureSignal.set(value);
  }

  /** ZATCA filter: 'all' | 'sent' | 'notSent' */
  zatcaFilterSignal = signal<'all' | 'sent' | 'notSent'>('all');
  get zatcaFilter() {
    return this.zatcaFilterSignal();
  }
  set zatcaFilter(value: 'all' | 'sent' | 'notSent') {
    this.zatcaFilterSignal.set(value);
  }

  filteredInvoicesSignal = signal<SalesInvoice[]>([]);

  get filteredInvoices() {
    return this.filteredInvoicesSignal();
  }
  set filteredInvoices(value: SalesInvoice[]) {
    this.filteredInvoicesSignal.set(value);
  }
  columns!: Column[];

  selectedInvoices: any[] = [];
  isOpen: { [key: string]: boolean } = {};

  searchText: string = ''; // Search text entered by the user
  get activeLanguage() {
    const lang = this.translationService.getSelectedLanguage() || 'en';
    return lang.startsWith('ar') ? 'ar' : 'en';
  }
  translate: TranslateService;

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }
  isAdminSignal = signal<boolean>(false);
  get isAdmin() {
    return this.isAdminSignal();
  }
  set isAdmin(value: boolean) {
    this.isAdminSignal.set(value);
  }
  // Upload dialog state & data
  uploadDialogVisibleSignal = signal<boolean>(false);
  get uploadDialogVisible() {
    return this.uploadDialogVisibleSignal();
  }
  set uploadDialogVisible(v: boolean) {
    this.uploadDialogVisibleSignal.set(v);
  }

  processingUploadSignal = signal<boolean>(false);
  get processingUpload() {
    return this.processingUploadSignal();
  }
  set processingUpload(v: boolean) {
    this.processingUploadSignal.set(v);
  }

  uploadProgressSignal = signal<number>(0);
  get uploadProgress() {
    return this.uploadProgressSignal();
  }
  set uploadProgress(v: number) {
    this.uploadProgressSignal.set(v);
  }

  ignoredInvoicesSignal = signal<IgnoredInvoiceInfo[]>([]);
  get ignoredInvoices() {
    return this.ignoredInvoicesSignal();
  }
  set ignoredInvoices(v: IgnoredInvoiceInfo[]) {
    this.ignoredInvoicesSignal.set(v);
  }

  previewInvoicesSignal = signal<ImportPreviewInvoice[]>([]);
  get previewInvoices() {
    return this.previewInvoicesSignal();
  }
  set previewInvoices(v: ImportPreviewInvoice[]) {
    this.previewInvoicesSignal.set(v);
  }

  importSummarySignal = signal<SalesInvoiceImportResult | null>(null);
  get importSummary() {
    return this.importSummarySignal();
  }
  set importSummary(v: SalesInvoiceImportResult | null) {
    this.importSummarySignal.set(v);
  }

  importFailuresDialogVisibleSignal = signal<boolean>(false);
  get importFailuresDialogVisible() {
    return this.importFailuresDialogVisibleSignal();
  }
  set importFailuresDialogVisible(v: boolean) {
    this.importFailuresDialogVisibleSignal.set(v);
  }

  needCheckInvoicesSignal = signal<any[]>([]);
  get needCheckInvoices() {
    return this.needCheckInvoicesSignal();
  }
  set needCheckInvoices(v: any[]) {
    this.needCheckInvoicesSignal.set(v);
  }

  private lastInvoiceNoUsed: string | null = null;
  private selectedImportFile: File | null = null;

  createdCountSignal = signal<number>(0);
  get createdCount() {
    return this.createdCountSignal();
  }
  set createdCount(v: number) {
    this.createdCountSignal.set(v);
  }

  totalToCreateSignal = signal<number>(0);
  get totalToCreate() {
    return this.totalToCreateSignal();
  }
  set totalToCreate(v: number) {
    this.totalToCreateSignal.set(v);
  }

  missingItemNamesSignal = signal<string[]>([]);
  get missingItemNames() {
    return this.missingItemNamesSignal();
  }
  set missingItemNames(v: string[]) {
    this.missingItemNamesSignal.set(v);
  }

  selectedFileNameSignal = signal<string>('');
  get selectedFileName() {
    return this.selectedFileNameSignal();
  }
  set selectedFileName(v: string) {
    this.selectedFileNameSignal.set(v);
  }

  mainSalesClassesSignal = signal<any[]>([]);
  get mainSalesClasses() {
    return this.mainSalesClassesSignal();
  }
  set mainSalesClasses(v: any[]) {
    this.mainSalesClassesSignal.set(v);
  }

  customersSignal = signal<any[]>([]);
  get customers() {
    return this.customersSignal();
  }
  set customers(v: any[]) {
    this.customersSignal.set(v);
  }

  private lastParsedInvoices: TempParsedInvoice[] = [];

  constructor(
    private companyDataService: CompanyDetailsService,
    private salesInvoiceService: SalesInvoiceService,
    private mainSalesClassService: MainSalesClassService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private customerProfileService: CustomerProfileService,
    private authService: AuthService,
    private printSettingsService: PrintSettingsService,
    private pdfUtilsService: PdfUtilsService
  ) {
    this.translate = translateService;
    this.docColumns = [
      { field: 'mainSalesClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO") },
      { field: 'itemName', label: this.translate.instant("INVOICE.ITEMNAME") },
      { field: 'mainSalesClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT") },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE"), pipe: 'number' },
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL"), pipe: 'number' },
    ];
    this.invoiceShareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)],
      ],
    });

    // check router url to see if it contains 'frontal-list'
    this.isFrontal = this.router.url.includes('frontal');

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (!res?.userRoles?.length) {
        this.isAdmin = false;
        return;
      }
      const roleNames = res.userRoles
        .map((ur) => ur?.role?.name)
        .filter((n): n is string => !!n);
      this.isAdmin = roleNames.some(
        (name) =>
          name === 'System.Admin' ||
          name === 'Admin' ||
          name === 'Administrator'
      );
    });

    this.columns = [
      {
        field: 'invoiceNo',
        header: this.translate.instant('INVOICE.INVOICENO'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'customerProfileName',
        header: this.translate.instant('FINANCE.CUSTOMER_PROFILE'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'description',
        header: this.translate.instant('INVOICE.DESCRIPTION'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'isCleared',
        header: this.translate.instant('INVOICE.IS_CLEARED'),
        filter: true,
        filterType: 'boolean',
      },
      {
        field: 'issueDate',
        header: this.translate.instant('INVOICE.ISSUE_DATE'),
        filter: true,
        filterType: 'date',
      },
      {
        field: 'totalAmount',
        header: this.translate.instant('INVOICE.TOTAL'),
        filter: true,
        filterType: 'number',
      },
      {
        field: 'totalAmountAfterTax',
        header: this.translate.instant('INVOICE.TOTALWITHTAX'),
        filter: true,
        filterType: 'number',
      },
    ];


    // Note: We handle filter changes via signal-based reactive reload
    // The zatcaFilter signal is watched and passed to API calls automatically
    // No explicit effect needed - the filter is applied when loadInvoicesLazy is called
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  /** Called when ZATCA filter radio button changes */
  onZatcaFilterChange(): void {
    // Reset to first page and reload with new filter
    this.loadInvoicesLazy({
      first: 0,
      rows: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    });
  }

  /** Called when Transactions filter (المعاملات المرحلة/الغير مرحلة) changes */
  onTransactionsFilterChange(): void {
    // Reset to first page and reload with new filter
    this.loadInvoicesLazy({
      first: 0,
      rows: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    });
  }

  /** Map transactions filter to API value */
  private mapTransactionFilter(): boolean | null {
    switch (this.transactionsFilterType) {
      case 'connected':
        return true;
      case 'notconnected':
        return false;
      case 'all':
      default:
        return null;
    }
  }
  openInvoiceShareDialog(entry: any) {
    // فردي
    this.resetShareState();
    this.shareBulkMode = false;
    this.invoiceShareTarget = entry;
    this.invoiceShareDialogVisible = true; // *ngIf هيبني المحتوى من جديد
  }

  /** مشاركة فاتورة مباشرة عبر Web Share API أو نسخ الرابط */
  shareInvoiceDirect(invoice: any): void {
    const invoiceUrl = `${window.location.origin}/invoices/${invoice.id}`;
    const title = this.translate.instant('INVOICE.SALES_INVOICE');
    const text = `${this.translate.instant('INVOICE.INVOICENO')}: ${invoice.invoiceNo}`;

    // Try Web Share API first (available on modern browsers including desktop)
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: invoiceUrl
      }).then(() => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: this.translate.instant('INVOICE.SHARED_SUCCESSFULLY')
        });
      }).catch((error) => {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.log('Error sharing:', error);
        }
      });
    } else {
      // Fallback: copy link to clipboard if Web Share API not available
      navigator.clipboard.writeText(invoiceUrl).then(() => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: this.translate.instant('INVOICE.LINK_COPIED')
        });
      }).catch((error) => {
        console.error('Error copying to clipboard:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: 'Failed to copy link'
        });
      });
    }
  }

  openBulkShareDialog() {
    const ids = (this.selectedInvoices || [])
      .map((x: any) => x?.id)
      .filter((x: any) => x != null);

    if (!ids.length) {
      this.messageService.add({
        severity: 'info',
        summary: 'معلومة',
        detail: 'اختر فواتير للمشاركة',
      });
      return;
    }

    this.resetShareState();
    this.shareBulkMode = true;
    this.shareBulkIds = ids;
    this.invoiceShareDialogVisible = true;
  }

  closeInvoiceShareDialog() {
    // أقفل وارجع الحالة نظيفة
    this.invoiceShareDialogVisible = false;
    this.resetShareState();
  }
  submitInvoiceShareEmail() {
    const email = (this.invoiceShareForm.get('email')?.value || '').trim();
    if (!email || this.invoiceShareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.shareBusy = true;
    // اختياري: اقفل الفورم أثناء الإرسال
    this.invoiceShareForm.disable({ emitEvent: false });

    if (this.shareBulkMode) {
      this.salesInvoiceService
        .shareInvoicesByEmail(this.shareBulkIds, email)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.invoiceShareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: `تم إرسال ${this.shareBulkIds.length} فاتورة على البريد.`,
            });
            this.closeInvoiceShareDialog();
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذّر مشاركة الفواتير.',
            });
          },
        });
    } else {
      if (!this.invoiceShareTarget?.id) {
        this.messageService.add({
          severity: 'warn',
          summary: 'تحذير',
          detail: 'لا توجد فاتورة محددة.',
        });
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        return;
      }

      this.salesInvoiceService
        .shareInvoiceByEmail(this.invoiceShareTarget.id, email)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.invoiceShareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إرسال الفاتورة على البريد.',
            });
            this.closeInvoiceShareDialog();
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذّر مشاركة الفاتورة.',
            });
          },
        });
    }
  }
  /** شيل المسافات و + من رقم الجوال قبل الإرسال للباك إند */
  private normalizePhoneForApi(input: string): string {
    return String(input || '')
      .replace(/\s+/g, '')
      .replace(/^\+/, '');
  }
  /** فتح لينك واتساب بأمان */
  private openWhatsAppLink(url: string) {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener'); // أقل حجبًا من popups
    } catch {
      window.location.href = url; // fallback
    }
  }

  /** افتح عدة روابط واتساب (للجماعي) مع تأخير بسيط لتقليل حجب المتصفح */
  private openMultipleWhatsAppLinks(urls: string[]) {
    if (!Array.isArray(urls) || !urls.length) return;
    this.openWhatsAppLink(urls[0]);
    const rest = urls.slice(1);
    rest.forEach((u, i) =>
      setTimeout(() => this.openWhatsAppLink(u), (i + 1) * 400)
    );
  }

  /** استخرج روابط واتساب من أي شكل محتمل للريسبونس (مرن لفردي/جماعي) */
  private extractWhatsAppLinks(res: any): string[] {
    if (!res) return [];

    // شكل مفرد: { response: { whatsAppLink } } أو { whatsAppLink }
    if (res?.response?.whatsAppLink) return [res.response.whatsAppLink];
    if (res?.whatsAppLink) return [res.whatsAppLink];

    const links: string[] = [];

    // Array من الردود
    if (Array.isArray(res)) {
      res.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    // حقول شائعة للجماعي: responses/items/data
    const bags = [res?.responses, res?.items, res?.data].filter(Array.isArray);
    bags.forEach((arr: any[]) => {
      arr.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    });

    // قاموسي { id: { response: { whatsAppLink } } }
    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    return Array.from(new Set(links.filter(Boolean)));
  }

  /** إرسال واتساب (يتصرف حسب الوضع: فردي/جماعي) */
  /** إرسال واتساب (يفتح لينك الواتساب من الريسبونس تلقائيًا) */
  submitInvoiceShareWhatsapp(): void {
    const ctrl = this.invoiceShareForm.get('whatsappNumber');
    const raw = ctrl?.value || '';
    const phone = this.normalizePhoneForApi(raw);

    if (!phone || ctrl?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء إدخال رقم صحيح (8–15 رقم).',
      });
      return;
    }

    // تحقق من وضع المشاركة
    if (this.shareBulkMode && !this.shareBulkIds?.length) {
      this.messageService.add({
        severity: 'info',
        summary: 'معلومة',
        detail: 'اختر فواتير للمشاركة',
      });
      return;
    }
    if (!this.shareBulkMode && !this.invoiceShareTarget?.id) {
      this.messageService.add({
        severity: 'info',
        summary: 'معلومة',
        detail: 'لا توجد فاتورة محددة.',
      });
      return;
    }

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    if (this.shareBulkMode) {
      // مشاركة جماعية
      this.salesInvoiceService
        .shareInvoicesByWhatsapp(this.shareBulkIds, phone)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.invoiceShareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: (res: any) => {
            const links = this.extractWhatsAppLinks(res);
            if (links.length) {
              this.openMultipleWhatsAppLinks(links);
              this.messageService.add({
                severity: 'success',
                summary: 'تم',
                detail: `تم فتح ${links.length} رابط واتساب.`,
              });
              this.closeInvoiceShareDialog();
              this.selectedInvoices = []; // فضِ الاختيارات بعد الإرسال
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: 'تنبيه',
                detail: 'لم يتم العثور على روابط واتساب في الاستجابة.',
              });
            }
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذّر مشاركة الفواتير عبر واتساب.',
            });
          },
        });
    } else {
      // مشاركة مفردة
      this.salesInvoiceService
        .shareInvoiceByWhatsapp(this.invoiceShareTarget.id, phone)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.invoiceShareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: (res: any) => {
            const links = this.extractWhatsAppLinks(res);
            if (links.length) {
              this.openWhatsAppLink(links[0]);
              this.messageService.add({
                severity: 'success',
                summary: 'تم',
                detail: 'تم فتح واتساب بالرسالة الجاهزة.',
              });
              this.closeInvoiceShareDialog();
            } else {
              this.messageService.add({
                severity: 'warn',
                summary: 'تنبيه',
                detail: 'لم يتم العثور على رابط واتساب في الاستجابة.',
              });
            }
          },
          error: (err) => {
            console.error(err);
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذّر مشاركة الفاتورة عبر واتساب.',
            });
          },
        });
    }
  }
  loadInvoicesLazy(event: any) {
    this.lazyLoad$.next(event);
  }


  onPageChange(event: any) {
    const newSize = event.rows ?? this.pageSize;

    if (!newSize || newSize <= 0) return;

    // أضف الرقم الجديد للقائمة إن لم يكن موجودًا
    if (!this.rowsPerPageOptions.includes(newSize)) {
      this.rowsPerPageOptions = [...this.rowsPerPageOptions, newSize].sort((a, b) => a - b);
    }

    // حدّث الحجم الحالي وأعد التحميل
    this.pageSize = newSize;
    this.loadInvoicesLazy({
      first: event.first ?? 0,
      rows: newSize,
      sortField: 'issueDate',
      sortOrder: -1,
    });
  }

  customRows: number | null = null;

  applyCustomRows() {
    const newSize = Number(this.customRows);
    if (!newSize || newSize <= 0) return;

    // ✅ أضفه للقائمة لو مش موجود
    if (!this.rowsPerPageOptions.includes(newSize)) {
      this.rowsPerPageOptions = [...this.rowsPerPageOptions, newSize].sort((a, b) => a - b);
    }

    // ✅ حدث قيمة الصفحة
    this.pageSize = newSize;

    // ✅ أعد تحميل البيانات
    this.loadInvoicesLazy({
      first: 0,
      rows: newSize,
      sortField: 'issueDate',
      sortOrder: -1,
    });
  }

  ngOnInit(): void {
    void this.processWorksheetRows;
    this.selectedBatchFormat = this.readStoredBatchFormat();
    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();
    this.setSellerName();

    setTimeout(() => {
      let toastShown = false;
      try {
        const pendingToastStr = sessionStorage.getItem('pendingToastMessage');
        if (pendingToastStr) {
          sessionStorage.removeItem('pendingToastMessage');
          const pendingToast = JSON.parse(pendingToastStr);
          this.messageService.add({
            severity: pendingToast.severity || 'success',
            summary: pendingToast.summary || (this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success'),
            detail: pendingToast.detail,
            life: 5000,
          });
          toastShown = true;
        }
      } catch (e) {
        console.error('Error reading pending toast:', e);
      }

      if (!toastShown && history.state?.message) {
        const msg = history.state.message;
        history.replaceState({ ...history.state, message: null }, '');
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
          detail: msg,
          life: 5000,
        });
      }
      this.cdr.detectChanges();
    }, 200);
    // إعداد ستريم التحميل المؤجل مع إلغاء الطلبات السابقة
    this.lazyLoad$
      .pipe(
        debounceTime(150),
        switchMap((event: any) => {
          const pageNumber = Math.floor((event?.first ?? 0) / (event?.rows ?? this.pageSize)) + 1;
          const pageSize = event?.rows ?? this.pageSize;
          this.pageSize = pageSize;
          this.currentPage = pageNumber;
          this.tableLoading = true;
          this.loading = true;

          // Convert zatcaFilter to boolean or null for API
          const zatcaApiValue = this.zatcaFilter === 'sent' ? true : (this.zatcaFilter === 'notSent' ? false : null);

          const globalFilter = event?.filters?.['global']?.value || this.searchValue;

          return this.salesInvoiceService
            .getInvoicesPaged(pageNumber, pageSize, {
              isFrontal: this.isFrontal,
              isSentToZatca: zatcaApiValue,
              keyword: globalFilter,
              hasTransaction: this.mapTransactionFilter(),
            })
            .pipe(finalize(() => {
              this.tableLoading = false;
              this.loading = false;
            }));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          const rawInvoices = res?.items || [];

          // Debug: Log first invoice to check structure
          if (rawInvoices.length > 0) {
            console.log('Sample invoice from API:', rawInvoices[0]);
            console.log('originalQuotationNo in sample:', rawInvoices[0].originalQuotationNo);
            // Check for PascalCase version (from API)
            const sampleInvoice = rawInvoices[0] as any;
            if (sampleInvoice.OriginalQuotationNo) {
              console.log('OriginalQuotationNo (PascalCase) in sample:', sampleInvoice.OriginalQuotationNo);
            }
          }

          let mapped = rawInvoices.map((invoice: any) => {
            const totalAmount = Math.round(
              (invoice.saleItems || []).reduce(
                (total: number, item: any) =>
                  total + (item.price || 0) * (item.quantity || 0) * (item.noOfNights || 1),
                0
              ) * 100
            ) / 100;

            // Handle both camelCase and PascalCase
            const originalQuotationNo = invoice.originalQuotationNo || invoice.OriginalQuotationNo;

            // Debug: Check if originalQuotationNo exists
            if (originalQuotationNo) {
              console.log('Found originalQuotationNo:', originalQuotationNo, 'for invoice:', invoice.invoiceNo);
            }

            // Handle both camelCase and PascalCase (API may return either)
            const isSentToZatca = invoice.isSentToZatca ?? (invoice as any).IsSentToZatca;

            return {
              ...invoice,
              originalQuotationNo: originalQuotationNo, // Ensure it's preserved in camelCase
              isSentToZatca: isSentToZatca,
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              totalAmount,
              totalAmountAfterTax:
                invoice.taxAmount > 0
                  ? totalAmount + Math.round(totalAmount * 0.15 * 100) / 100
                  : totalAmount,
              customerProfileName:
                this.activeLanguage == 'en'
                  ? invoice.customerProfile?.englishName
                  : invoice.customerProfile?.arabicName,
            };
          });
          this.invoices = mapped;
          // Use server's total count for pagination
          this.totalRecords = res.total;
          // Ensure standard page sizes
          this.rowsPerPageOptions = [10, 25, 50, 100];
        },
        error: (err) => {
          console.error('Error loading invoices (paged):', err);
        },
      });

    // Load all invoices on component initialization
    this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
    this.cdr.detectChanges();

    // Fetch company details
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        this.companyDetails = companyData[0];

        // Load default policies and banks
        const uncheckedPolicies = this.printSettingsService.getUncheckedPolicies();
        if (this.companyDetails?.policies) {
          this.selectedPolicies = this.companyDetails.policies
            .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
            .map(p => {
              const idStr = String(p.id || '');
              return {
                id: idStr,
                name: p.policyParagraph || '',
                nameEn: p.policyParagraph || '',
                checked: !uncheckedPolicies.includes(idStr)
              };
            });
          this.anyPolicyChecked = this.selectedPolicies.some(p => p.checked);
        }

        const uncheckedBanks = this.printSettingsService.getUncheckedBanks();
        if (this.companyDetails?.bankAccounts) {
          this.selectedBanks = this.companyDetails.bankAccounts
            .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
            .map(b => {
              const idStr = String(b.id || '');
              return {
                id: idStr,
                bankName: b.bankName || '',
                bankNameEn: b.bankName || '',
                accountName: b.accountName || '',
                accountNumber: b.bankAccountNumber || '',
                iban: b.iban || '',
                swiftCode: b.swiftCode || '',
                checked: !uncheckedBanks.includes(idStr)
              };
            });
          this.anyBankChecked = this.selectedBanks.some(b => b.checked);
        }
      },
      error: (error) => {
        console.error('Error fetching company details:', error);
      },
    });
  }

  onPolicyToggle() {
    this.selectedPolicies = [...this.selectedPolicies];
    this.anyPolicyChecked = this.selectedPolicies.some(p => p.checked);
    const uncheckedIds = this.selectedPolicies.filter(p => !p.checked).map(p => p.id);
    this.printSettingsService.setUncheckedPolicies(uncheckedIds);
  }

  onBankToggle() {
    this.selectedBanks = [...this.selectedBanks];
    this.anyBankChecked = this.selectedBanks.some(b => b.checked);
    const uncheckedIds = this.selectedBanks.filter(b => !b.checked).map(b => b.id);
    this.printSettingsService.setUncheckedBanks(uncheckedIds);
  }

  getSupplierEmail(): string {
    return this.companyDetails?.email || '';
  }

  getSupplierWebsite(): string {
    return this.companyDetails?.website || '';
  }

  getSupplierBankName(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      const bank = this.companyDetails.bankAccounts[0];
      return bank.bankName || '';
    }
    return '';
  }

  getSupplierBankAccountNumber(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      return this.companyDetails.bankAccounts[0].bankAccountNumber || '';
    }
    return '';
  }

  getSupplierIBAN(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      return this.companyDetails.bankAccounts[0].iban || '';
    }
    return '';
  }

  getSupplierDistrict(): string {
    return this.companyDetails?.district || '';
  }

  getSupplierBuildingNumber(): string {
    return this.companyDetails?.buildingNumber || '';
  }

  getSupplierGaztNumber(): string {
    return this.companyDetails?.gaztNumber || '';
  }

  getCustomerAddress(): string {
    const p = this.selectedInvoice?.customerProfile;
    if (!p) return '';
    const parts = [
      p.buildingNumber,
      p.street,
      p.district,
      p.city,
      p.country,
      p.postalCode
    ].filter(Boolean);
    return parts.join(', ');
  }

  onShowCompanySignatureChange(value: boolean): void {
    this.showCompanySignature = value;
    this.printSettingsService.setShowCompanySignature(value);
  }

  onShowCustomerSignatureChange(value: boolean): void {
    this.showCustomerSignature = value;
    this.printSettingsService.setShowCustomerSignature(value);
  }

  onShowStampChange(value: boolean): void {
    this.showStamp = value;
    this.printSettingsService.setShowStamp(value);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  customSort(event: any) {
    event.data.sort((a: any, b: any) => {
      let value1 = a[event.field];
      let value2 = b[event.field];

      if (event.field === 'invoiceNo') {
        value1 = this.extractInvoiceNumber(value1);
        value2 = this.extractInvoiceNumber(value2);
      }

      let result = 0;
      if (value1 < value2) result = -1;
      else if (value1 > value2) result = 1;

      return event.order * result;
    });
  }

  extractInvoiceNumber(invoiceNo: string): number {
    if (!invoiceNo) return 0;
    const parts = invoiceNo.split('-');
    return parts.length > 1 ? parseInt(parts[1], 10) : 0;
  }

  loadInvoices(): void {
    this.loading = true;
    if (!this.isFrontal) {
      this.salesInvoiceService.getAllInvoices().subscribe((invoices) => {
        if (invoices) {
          this.invoices = invoices.map((invoice) => {
            const totalAmount =
              Math.round(
                invoice.saleItems.reduce(
                  (total, item) =>
                    total + item.price * item.quantity * item.noOfNights,
                  0
                ) * 100
              ) / 100;
            return {
              ...invoice,
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              totalAmount: totalAmount,
              totalAmountAfterTax:
                invoice.taxAmount > 0
                  ? totalAmount + Math.round(totalAmount * 0.15 * 100) / 100
                  : totalAmount,
              customerProfileName:
                this.activeLanguage == 'en'
                  ? invoice.customerProfile?.englishName
                  : invoice.customerProfile?.arabicName,
            };
          });
        }
        this.loading = false;
        this.filteredInvoices = this.invoices; // Initialize filtered invoices
        this.cdr.detectChanges();
      });
    } else {
      this.salesInvoiceService.getAllFrontalInvoices().subscribe((invoices) => {
        if (invoices) {
          this.invoices = invoices.map((invoice) => {
            const totalAmount =
              Math.round(
                invoice.saleItems.reduce(
                  (total, item) =>
                    total + item.price * item.quantity * item.noOfNights,
                  0
                ) * 100
              ) / 100;
            return {
              ...invoice,
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              totalAmount: totalAmount,
              totalAmountAfterTax:
                invoice.taxAmount > 0
                  ? totalAmount + Math.round(totalAmount * 0.15 * 100) / 100
                  : totalAmount,
              customerProfileName:
                this.activeLanguage == 'en'
                  ? invoice.customerProfile?.englishName
                  : invoice.customerProfile?.arabicName,
            };
          });
        }
        this.loading = false;
        this.filteredInvoices = this.invoices; // Initialize filtered invoices
        this.cdr.detectChanges();
      });
    }
  }

  // Method to filter invoices based on the search input
  filterInvoices(
    transactionsFilterType: string
  ): void {
    // Note: ZATCA filtering is now handled server-side via API params
    // This method now only handles transaction filter (client-side for current page)
    let list = this.invoices;

    if (transactionsFilterType === 'connected') {
      list = list.filter((invoice) => invoice.transactionId != null);
    } else if (transactionsFilterType === 'notconnected') {
      list = list.filter((invoice) => invoice.transactionId == null);
    }

    this.filteredInvoices = list;
  }

  deleteInvoice(id?: number): void {
    if (!id || this.loadingStates[id]) return;

    this.confirmationService.confirm({
      message: this.activeLanguage === 'ar'
        ? 'هل أنت متأكد من حذف هذه الفاتورة؟'
        : 'Are you sure you want to delete this invoice?',
      header: this.activeLanguage === 'ar' ? 'تأكيد الحذف' : 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.activeLanguage === 'ar' ? 'حذف' : 'Delete',
      rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
      acceptButtonStyleClass: 'p-button-danger rounded-md',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined rounded-md',
      accept: () => {
        if (this.loadingStates[id]) return;
        this.loadingStates[id] = true;
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'info',
          summary: this.activeLanguage === 'ar' ? 'جاري الحذف' : 'Deleting',
          detail: this.activeLanguage === 'ar'
            ? 'جاري حذف الفاتورة...'
            : 'Deleting invoice...',
          life: 4000
        });

        this.salesInvoiceService.deleteInvoice(id).subscribe({
          next: () => {
            this.loadingStates[id] = false;
            this.invoices = this.invoices.filter((invoice) => invoice.id !== id);
            this.filteredInvoices = this.filteredInvoices.filter(
              (invoice) => invoice.id !== id
            );
            this.selectedInvoices = this.selectedInvoices.filter(
              (invoice) => invoice.id !== id
            );
            this.messageService.add({
              severity: 'success',
              summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
              detail: this.activeLanguage === 'ar' ? 'تم حذف الفاتورة بنجاح' : 'Invoice deleted successfully',
            });
            this.opInvoice?.hide();
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.loadingStates[id] = false;
            this.cdr.detectChanges();
            console.error('Error deleting invoice:', err);
            const errorDetail = typeof err?.error === 'string'
              ? err.error
              : (err?.error?.message || err?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء حذف الفاتورة' : 'Error deleting invoice'));
            this.messageService.add({
              severity: 'error',
              summary: this.activeLanguage === 'ar' ? 'خطأ في الحذف' : 'Error',
              detail: errorDetail,
              life: 6000
            });
          },
        });
      },
    });
  }

  viewInvoice(id?: number): void {
    this.router.navigate(['/invoices', id]);
  }

  onRowClick(event: Event, invoice: any): void {
    // تجاهل النقر إذا كان على checkbox أو button
    const target = event.target as HTMLElement;
    if (target.closest('.p-checkbox') ||
      target.closest('button') ||
      target.closest('p-button') ||
      target.closest('.pi') ||
      target.tagName.toLowerCase() === 'button') {
      return;
    }

    // نقل للعرض عند النقر على الصف
    this.viewInvoice(invoice.id);
  }

  editInvoice(id?: number): void {
    if (id) {
      this.router.navigate(['/invoices/edit', id]);
    }
  }

  addInvoice() {
    if (this.isFrontal) {
      this.router.navigate(['/invoices/frontal-new']);
    } else {
      this.router.navigate(['/invoices/new']);
    }
  }

  loadingStates: { [id: number]: boolean } = {}; // Track loading states by invoice ID
  sendingFrontalStates: { [id: number]: boolean } = {};
  isDeletingBulk: boolean = false;

  createTransaction(id: number) {
    this.loadingStates[id] = true;

    this.salesInvoiceService.createInvoiceTransaction(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('INVOICE.TRANSACTION_CREATED'),
          life: 3000,
        });
        this.loadInvoices();
      },
      error: () => {
        alert(this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));
      },
      complete: () => {
        // Set the loading state to false after the request finishes
        this.loadingStates[id] = false;
      },
    });
  }
  loading: boolean = true;
  zatcaSending: boolean = false;
  zatcaSendingStatus: 'validating' | 'sending' = 'sending';
  sendingZatcaStates: { [id: number]: boolean } = {};

  isSendingZatca(id?: number): boolean {
    if (!id) return this.zatcaSending;
    return !!this.sendingZatcaStates[id] || (this.zatcaSending && this.zatcaSendingStatus === 'sending');
  }
  tableLoading: boolean = false; // تحميل الجدول فقط
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }

  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  trimSearchValue() {
    this.searchValue = this.searchValue.trim();
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value.trim(), 'contains');
  }


  getVatAmountFromNet(net: number) {
    return Math.round(net * 0.15 * 100) / 100;
  }

  getTotalWithVat(net: number) {
    return Math.round((net + this.getVatAmountFromNet(net)) * 100) / 100;
  }

  getInvoiceTaxAmount() {
    return this.getTaxAmount(this.selectedInvoice);
  }

  getInvoiceNetPrice() {
    return this.getNetPrice(this.selectedInvoice);
  }

  getInvoiceTotalPrice() {
    return this.getTotalPrice(this.selectedInvoice);
  }

  getCustomerName(): string {
    const inv = this.selectedInvoice;
    if (!inv) return '-';
    if (inv.customerProfile) {
      return this.activeLanguage === 'en'
        ? inv.customerProfile.englishName
        : inv.customerProfile.arabicName;
    }
    return inv.customerProfileName || '-';
  }

  getCustomerPhone(): string {
    return this.selectedInvoice?.customerProfile?.contactNumber || '';
  }

  getCustomerEmail(): string {
    return this.selectedInvoice?.customerProfile?.email || '';
  }

  getCustomerTaxNumber(): string {
    return this.selectedInvoice?.customerProfile?.taxNumber || '';
  }

  getCustomerOtherId(): string {
    return this.selectedInvoice?.customerProfile?.otherId || '';
  }

  getCustomerGaztNumber(): string {
    return this.selectedInvoice?.customerProfile?.gaztNumber || '';
  }

  getCustomerBankName(): string {
    return this.selectedInvoice?.customerProfile?.bankName || '';
  }

  getCustomerBankAccountNumber(): string {
    return this.selectedInvoice?.customerProfile?.bankAccountNumber || '';
  }

  getCustomerIBAN(): string {
    return this.selectedInvoice?.customerProfile?.iban || '';
  }

  getSellerName(invoice?: any): string {
    const inv = invoice || this.selectedInvoice;
    return inv?.cashierName || inv?.sellerName || inv?.createdBy || this.sellerName || '';
  }

  setSellerName() {
    this.authService.getUserByToken().subscribe({
      next: (res: any) => {
        this.sellerName = res?.fullName || (res as any)?.name || '';
      },
      error: () => { }
    });
  }

  isSameDate(date1: any, date2: any): boolean {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  printInvoice2(id: number) {
    this.activePrintMode = 'print2';
    this.loading = true;
    this.salesInvoiceService.getInvoiceById(id).subscribe({
      next: (res) => {
        this.selectedInvoice = res;
        this.docData = res.saleItems.map(item => ({
          ...item,
          mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode,
          mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass?.measurementUnit?.englishName : item.mainSalesClass?.measurementUnit?.arabicName,
          totalPreTax: this.getItemNetPrice(item),
          taxAmount: this.getItemTaxAmount(item),
          totalPrice: this.getItemTotalPrice(item),
          itemName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          description: '-',
          netPrice: this.getItemNetPrice(item),
        }));
        this.useLandscape = (this.docData?.length || 0) > this.descriptionRowsPerPage;

        this.loading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.printComponent2) {
            this.printComponent2.triggerPrint();
          }
        }, 300);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل بيانات الفاتورة للطباعة',
        });
      }
    });
  }

  printInvoice3(id: number) {
    this.activePrintMode = 'print3';
    this.loading = true;
    this.salesInvoiceService.getInvoiceById(id).subscribe({
      next: (res) => {
        this.selectedInvoice = res;
        this.docData = res.saleItems.map(item => ({
          ...item,
          mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode,
          mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass?.measurementUnit?.englishName : item.mainSalesClass?.measurementUnit?.arabicName,
          totalPreTax: this.getItemNetPrice(item),
          taxAmount: this.getItemTaxAmount(item),
          totalPrice: this.getItemTotalPrice(item),
          itemName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          description: '-',
          netPrice: this.getItemNetPrice(item),
        }));

        this.loading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.printComponent3) {
            this.printComponent3.triggerPrint();
          }
        }, 300);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل بيانات الفاتورة للطباعة',
        });
      }
    });
  }


  printServerInvoice(id: number) {
    // Close overlay panel before opening dialog
    if (this.opInvoice) {
      this.opInvoice.hide();
    }
    this.showPrintOrientationDialog(id, true);
  }

  /**
   * "طباعة واحد من السيرفر" — server-side replica of frontend Print 1
   * (InvoicePrintType.Format1Server = 4). Same layout as Print 1, generated by
   * QuestPDF on the server. Opens the print-type dialog in A4-only mode (A4 عمودي /
   * A4 أفقي) so the user controls the PDF orientation; the chosen orientation is
   * sent to the server via `&orientation=portrait|landscape` (omitted → server
   * auto-detects items > 8 → landscape).
   */
  printServerInvoiceFormat1(id: number) {
    if (this.opInvoice) {
      this.opInvoice.hide();
    }
    this.showPrintOrientationDialog(id, true, true);
  }

  /** Builds the parity query-string for the server Print-1 replica from print settings + language. */
  private buildPrint1ServerParams(): string {
    return this.salesInvoiceService.buildPrint1Params({
      lang: this.activeLanguage,
      showStamp: this.printSettingsService.getShowStamp(),
      showCompanySignature: this.printSettingsService.getShowCompanySignature(),
      showCustomerSignature: this.printSettingsService.getShowCustomerSignature(),
      uncheckedPolicies: this.printSettingsService.getUncheckedPolicies(),
      uncheckedBanks: this.printSettingsService.getUncheckedBanks(),
    });
  }

  downloadServerInvoice(id: number) {
    // Close overlay panel before opening dialog
    if (this.opInvoice) {
      this.opInvoice.hide();
    }
    this.showPrintOrientationDialog(id, false);
  }

  printOrientationDialogVisible = false;
  pendingInvoiceId: number | null = null;
  pendingIsPrint: boolean = false;
  selectedPrintType: 'A4Portrait' | 'A4Landscape' | 'Thermal80mm' | 'Thermal58mm' = 'A4Portrait';
  mergedOrientationMode = false;
  /** A4-only mode of the print-type dialog, used by "طباعة واحد من السيرفر" (server Print-1 replica). */
  print1OrientationMode = false;

  batchProcessing = false;
  batchProcessingMessage = '';

  selectedBatchFormat: 'format1' | 'format2' | 'format3' | 'format1-server' = 'format1-server';
  pendingBatchAction: {
    action: 'printSelected' | 'downloadSelected' | 'downloadMergedSelected' | 'downloadMergedAll';
    ids: number[];
  } | null = null;
  formatDialogVisible = false;
  private readonly batchFormatStorageKey = 'salesInvoicePrintFormat';

  private readStoredBatchFormat(): 'format1' | 'format2' | 'format3' | 'format1-server' {
    if (typeof localStorage === 'undefined') return 'format1-server';
    const stored = localStorage.getItem(this.batchFormatStorageKey);
    return stored === 'format1' || stored === 'format2' || stored === 'format3' || stored === 'format1-server'
      ? (stored as any)
      : 'format1-server';
  }

  private persistBatchFormat(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.batchFormatStorageKey, this.selectedBatchFormat);
    }
  }

  openBatchFormatDialog(
    action: 'printSelected' | 'downloadSelected' | 'downloadMergedSelected' | 'downloadMergedAll'
  ): void {
    this.selectedBatchFormat = 'format1-server';
    if (action === 'downloadMergedAll') {
      this.loading = true;
      const list$ = this.isFrontal
        ? this.salesInvoiceService.getAllFrontalInvoices()
        : this.salesInvoiceService.getAllInvoices();

      list$.subscribe({
        next: (allInvoices) => {
          const ids = (allInvoices || [])
            .map((invoice) => invoice?.id)
            .filter((id): id is number => id != null);
          this.loading = false;
          if (!ids.length) {
            this.messageService.add({
              severity: 'warn',
              summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
              detail: this.activeLanguage === 'ar' ? 'لا توجد فواتير للتحميل' : 'No invoices available for download'
            });
            return;
          }
          this.pendingBatchAction = { action, ids };
          this.formatDialogVisible = true;
        },
        error: (err) => {
          console.error('Error fetching all invoices for batch PDF download:', err);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.activeLanguage === 'ar' ? 'فشل تحميل قائمة الفواتير' : 'Failed to load invoices'
          });
        }
      });
      return;
    }

    const ids = (this.selectedInvoices || [])
      .map((invoice) => invoice?.id)
      .filter((id): id is number => id != null);
    if (!ids.length) return;

    this.pendingBatchAction = { action, ids };
    this.formatDialogVisible = true;
  }

  confirmBatchFormat(): void {
    if (!this.pendingBatchAction) {
      this.formatDialogVisible = false;
      return;
    }

    this.persistBatchFormat();
    this.formatDialogVisible = false;
    const pending = this.pendingBatchAction;
    this.pendingBatchAction = null;

    if (this.selectedBatchFormat === 'format1-server') {
      // Server-side Print 1 replica — open the A4-only orientation dialog so the
      // user chooses portrait/landscape before printing/downloading (batch default
      // is landscape since batches print many invoices).
      this.openBatchOrientationDialog(pending, true);
      return;
    }

    if (this.selectedBatchFormat === 'format2') {
      this.openBatchOrientationDialog(pending);
      return;
    }

    const outputMode = pending.action === 'downloadMergedSelected' || pending.action === 'downloadMergedAll'
      ? 'mergedPdf'
      : pending.action === 'downloadSelected'
        ? 'selectedZip'
        : 'selectedPrint';
    void this.renderWithFrontendTemplate(pending.ids, this.selectedBatchFormat, outputMode);
  }

  private openBatchOrientationDialog(action: {
    action: 'printSelected' | 'downloadSelected' | 'downloadMergedSelected' | 'downloadMergedAll';
    ids: number[];
  }, print1Mode: boolean = false): void {
    this.pendingBatchAction = action;
    this.pendingInvoiceId = null;
    this.pendingIsPrint = action.action === 'printSelected';
    this.mergedOrientationMode = action.action === 'downloadMergedSelected' || action.action === 'downloadMergedAll';
    this.print1OrientationMode = print1Mode;
    this.selectedPrintType = 'A4Portrait';
    this.printOrientationDialogVisible = true;
  }

  showPrintOrientationDialog(invoiceId: number, isPrint: boolean, print1Mode: boolean = false) {
    this.pendingInvoiceId = invoiceId;
    this.pendingBatchAction = null;
    this.pendingIsPrint = isPrint;
    this.mergedOrientationMode = false;
    this.print1OrientationMode = print1Mode;
    this.selectedPrintType = 'A4Portrait';
    this.printOrientationDialogVisible = true;
  }

  /** Builds query-string for server Print-2 with terms/banks settings. */
  private buildPrint2Params(): string {
    return this.salesInvoiceService.buildPrint2Params({
      lang: this.activeLanguage,
      showTermsInPrint2: this.printSettingsService.getShowTermsInPrint2(),
      showBanksInPrint2: this.printSettingsService.getShowBanksInPrint2(),
      uncheckedPolicies: this.printSettingsService.getUncheckedPolicies(),
      uncheckedBanks: this.printSettingsService.getUncheckedBanks(),
    });
  }

  confirmPrintOrientation() {
    if (this.print1OrientationMode) {
      this.confirmPrint1Orientation();
      return;
    }
    const params = this.buildPrint2Params();
    if (this.pendingBatchAction) {
      const pending = this.pendingBatchAction;
      this.batchProcessing = true;
      this.batchProcessingMessage = pending.action === 'printSelected'
        ? (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات الطباعة...' : 'Preparing print files...')
        : (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات التنزيل...' : 'Preparing download files...');
      const done = () => { this.batchProcessing = false; };
      if (pending.action === 'printSelected') {
        this.salesInvoiceService.printDocuments(pending.ids, this.selectedPrintType, done, params);
      } else if (pending.action === 'downloadSelected') {
        this.salesInvoiceService.downloadDocuments(pending.ids, this.selectedPrintType, done, params);
      } else if (pending.action === 'downloadMergedSelected') {
        this.salesInvoiceService.downloadMerged(pending.ids, this.selectedPrintType, done, params);
      } else {
        this.salesInvoiceService.downloadAllMerged(this.selectedPrintType, done, params);
      }
    } else if (this.pendingInvoiceId !== null) {
      if (this.pendingIsPrint) {
        this.salesInvoiceService.printDocument(this.pendingInvoiceId, this.selectedPrintType, params);
      } else {
        this.salesInvoiceService.downloadDocument(this.pendingInvoiceId, this.selectedPrintType, params);
      }
    }
    this.printOrientationDialogVisible = false;
    this.pendingInvoiceId = null;
    this.pendingBatchAction = null;
    this.mergedOrientationMode = false;
  }

  /**
   * "طباعة واحد من السيرفر" confirm: routes to the server Print-1 replica
   * (Format1Server) with the user-chosen orientation appended to the parity params.
   */
  private confirmPrint1Orientation(): void {
    const o = this.selectedPrintType === 'A4Landscape' ? 'landscape' : 'portrait';
    const params = this.buildPrint1ServerParams() + '&orientation=' + o;
    if (this.pendingBatchAction) {
      const pending = this.pendingBatchAction;
      this.batchProcessing = true;
      this.batchProcessingMessage = pending.action === 'printSelected'
        ? (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات الطباعة...' : 'Preparing print files...')
        : (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات التنزيل...' : 'Preparing download files...');
      const done = () => { this.batchProcessing = false; };
      if (pending.action === 'printSelected') {
        this.salesInvoiceService.printDocuments(pending.ids, 'Format1Server', done, params);
      } else if (pending.action === 'downloadSelected') {
        this.salesInvoiceService.downloadDocuments(pending.ids, 'Format1Server', done, params);
      } else if (pending.action === 'downloadMergedSelected') {
        this.salesInvoiceService.downloadMerged(pending.ids, 'Format1Server', done, params);
      } else {
        this.salesInvoiceService.downloadAllMerged('Format1Server', done, params);
      }
    } else if (this.pendingInvoiceId !== null) {
      if (this.pendingIsPrint) {
        this.salesInvoiceService.printDocument(this.pendingInvoiceId, 'Format1Server', params);
      } else {
        this.salesInvoiceService.downloadDocument(this.pendingInvoiceId, 'Format1Server', params);
      }
    }
    this.printOrientationDialogVisible = false;
    this.pendingInvoiceId = null;
    this.pendingBatchAction = null;
    this.mergedOrientationMode = false;
    this.print1OrientationMode = false;
  }

  printSelectedServerInvoices() {
    this.openBatchFormatDialog('printSelected');
  }

  downloadSelectedServerInvoices() {
    this.openBatchFormatDialog('downloadSelected');
  }

  downloadAllInvoicesPdf() {
    this.salesInvoiceService.downloadAllDocuments();
  }

  downloadMergedSelected() {
    this.openBatchFormatDialog('downloadMergedSelected');
  }

  downloadAllMergedInvoicesPdf() {
    this.openBatchFormatDialog('downloadMergedAll');
  }

  private mapInvoiceItemsForFrontendPrint(invoice: any): any[] {
    return (invoice?.saleItems || []).map(item => ({
      ...item,
      mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode,
      mainSalesClassName: this.activeLanguage === 'en' ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
      mainSalesClasMeasurementUnitName: this.activeLanguage === 'en' ? item.mainSalesClass?.measurementUnit?.englishName : item.mainSalesClass?.measurementUnit?.arabicName,
      totalPreTax: this.getItemNetPrice(item),
      taxAmount: this.getItemTaxAmount(item),
      totalPrice: this.getItemTotalPrice(item),
      itemName: this.activeLanguage === 'en' ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
      description: '-',
      netPrice: this.getItemNetPrice(item),
    }));
  }

  private waitForFrontendPrintRender(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 250));
  }

  private async renderWithFrontendTemplate(
    ids: number[],
    format: 'format1' | 'format3',
    outputMode: 'mergedPdf' | 'selectedZip' | 'selectedPrint'
  ): Promise<void> {
    if (!ids.length) return;

    this.loading = true;
    this.batchProcessing = true;
    this.batchProcessingMessage = outputMode === 'selectedPrint'
      ? (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات الطباعة...' : 'Preparing print files...')
      : (this.activeLanguage === 'ar' ? 'جاري تجهيز ملفات التنزيل...' : 'Preparing download files...');
    const files: { name: string; blob: Blob }[] = [];
    const allCanvases: HTMLCanvasElement[] = [];
    const orientations: ('portrait' | 'landscape')[] = [];
    let hasLandscapePage = false;

    try {
      for (const id of ids) {
        const invoice = await firstValueFrom(this.salesInvoiceService.getInvoiceById(id));
        this.selectedInvoice = invoice;
        this.activePrintMode = format === 'format1' ? 'print2' : 'print3';
        this.docData = this.mapInvoiceItemsForFrontendPrint(invoice);
        this.useLandscape = format === 'format1' && this.docData.length > this.descriptionRowsPerPage;
        this.showStamp = format === 'format3' ? this.printSettingsService.getShowStamp() : this.showStamp;
        hasLandscapePage = hasLandscapePage || this.useLandscape;
        this.cdr.detectChanges();
        await this.waitForFrontendPrintRender();

        const component = format === 'format1' ? this.printComponent2 : this.printComponent3;
        if (!component) throw new Error('Frontend print component is unavailable');
        const canvases = await component.captureRenderedPages(this.useLandscape ? 'landscape' : 'portrait');
        if (!canvases.length) throw new Error(`No printable pages were rendered for invoice ${invoice?.invoiceNo || id}`);

        const invoiceOrientation = this.useLandscape ? 'landscape' : 'portrait';
        if (outputMode === 'mergedPdf') {
          allCanvases.push(...canvases);
          canvases.forEach(() => orientations.push(invoiceOrientation));
        } else {
          const blob = this.pdfUtilsService.canvasesToPdfBlob(canvases, invoiceOrientation, [invoiceOrientation]);
          files.push({ name: `${invoice?.invoiceNo || `invoice-${id}`}.pdf`, blob });
        }
      }

      if (outputMode === 'mergedPdf') {
        const blob = this.pdfUtilsService.canvasesToPdfBlob(
          allCanvases,
          hasLandscapePage ? 'landscape' : 'portrait',
          orientations
        );
        this.pdfUtilsService.downloadFile(blob, `invoices-merged-${format}.pdf`);
      } else if (outputMode === 'selectedZip') {
        this.pdfUtilsService.downloadBlobsAsZip(files, `invoices-${format}.zip`);
      } else {
        await this.pdfUtilsService.printBlobsSequentially(files.map(file => file.blob));
      }
    } catch (error) {
      console.error('Error rendering frontend invoice documents:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
        detail: this.activeLanguage === 'ar' ? 'فشل تجهيز فواتير الطباعة أو التنزيل' : 'Failed to prepare invoice documents'
      });
    } finally {
      this.loading = false;
      this.batchProcessing = false;
      this.docData = [];
      this.selectedInvoice = null;
      this.cdr.detectChanges();
    }
  }

  getItemNetPrice(item) {
    // calculate from items
    const netTotal = item.quantity * item.noOfNights * item.price;
    return Math.round(netTotal * 100) / 100;
  }

  getItemTaxAmount(item) {
    const isExempt = item.mainSalesClass?.isTaxExempted;
    const taxRate = isExempt ? 0 : 0.15;
    const subtotal = this.getItemNetPrice(item);
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  getItemTotalPrice(item) {
    // calculate from items
    return (
      Math.round(this.getItemNetPrice(item) * 100) / 100 +
      Math.round(this.getItemTaxAmount(item) * 100) / 100
    );
  }


  deleteAll(): void {
    const targets = (this.selectedInvoices || []).filter((inv) => !inv.isCleared);
    if (targets.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Notice',
        detail: this.activeLanguage === 'ar' ? 'لا توجد فواتير قابلة للحذف' : 'No deletable invoices selected',
      });
      return;
    }

    this.confirmationService.confirm({
      message: this.activeLanguage === 'ar'
        ? `هل أنت متأكد من حذف الفواتير المحددة (${targets.length} فاتورة)؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete the selected invoices (${targets.length} invoices)? This action cannot be undone.`,
      header: this.activeLanguage === 'ar' ? 'تأكيد الحذف الجماعي' : 'Bulk Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.activeLanguage === 'ar' ? 'حذف' : 'Delete',
      rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
      acceptButtonStyleClass: 'p-button-danger rounded-md',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined rounded-md',
      accept: () => {
        if (this.isDeletingBulk) return;
        this.isDeletingBulk = true;
        targets.forEach(t => this.loadingStates[t.id] = true);
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'info',
          summary: this.activeLanguage === 'ar' ? 'جاري الحذف' : 'Deleting',
          detail: this.activeLanguage === 'ar'
            ? `جاري حذف ${targets.length} فاتورة...`
            : `Deleting ${targets.length} invoices...`,
          life: 4000
        });

        const deleteObservables = targets.map(inv =>
          this.salesInvoiceService.deleteInvoice(inv.id).pipe(
            finalize(() => {
              this.loadingStates[inv.id] = false;
            })
          )
        );

        forkJoin(deleteObservables).subscribe({
          next: () => {
            const targetIds = new Set(targets.map(t => t.id));
            this.invoices = this.invoices.filter((inv) => !targetIds.has(inv.id));
            this.filteredInvoices = this.filteredInvoices.filter(
              (inv) => !targetIds.has(inv.id)
            );
            this.selectedInvoices = [];
            this.isDeletingBulk = false;
            this.messageService.add({
              severity: 'success',
              summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
              detail: this.activeLanguage === 'ar' ? 'تم حذف الفواتير المحددة بنجاح' : 'Selected invoices deleted successfully',
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isDeletingBulk = false;
            targets.forEach(t => this.loadingStates[t.id] = false);
            this.cdr.detectChanges();
            console.error('Error bulk deleting invoices:', err);
            const errorDetail = typeof err?.error === 'string'
              ? err.error
              : (err?.error?.message || err?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting invoices'));
            this.messageService.add({
              severity: 'error',
              summary: this.activeLanguage === 'ar' ? 'خطأ في الحذف' : 'Error',
              detail: errorDetail,
              life: 6000
            });
          }
        });
      }
    });
  }

  createTransactionForAll(): void {
    const ids = (this.selectedInvoices || [])
      .filter((inv) => inv.transactionId == null || inv.transactionId === '')
      .map((inv) => inv.id);

    if (ids.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('INVOICE.INFO'),
        detail: this.translate.instant('INVOICE.NO_INVOICES_SELECTED_FOR_TRANSACTION'),
      });
      return;
    }

    this.tableLoading = true;
    this.salesInvoiceService.bulkCreateTransactionsOptimized(ids).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('INVOICE.BULK_TRANSACTIONS_CREATED', { count: ids.length }),
          life: 3000,
        });
        this.selectedInvoices = [];
        this.loadInvoicesLazy({
          first: 0,
          rows: this.pageSize,
          sortField: 'issueDate',
          sortOrder: -1
        });
      },
      error: (err) => {
        console.error('Bulk transaction error:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('INVOICE.ERROR'),
          detail: this.translate.instant('INVOICE.BULK_TRANSACTION_ERROR'),
        });
        this.tableLoading = false;
      },
      complete: () => {
        this.tableLoading = false;
      }
    });
  }

  // Arabic Comments: الإرسال الجماعي لزاتكا - مرحلة 1: التحقق من بيانات كل الفواتير وعرض ديالوج موجز
  clearSelectedInvoices(): void {
    const alreadyCleared = this.selectedInvoices.filter((inv) => inv.isCleared);
    const targets = this.selectedInvoices.filter((inv) => !inv.isCleared);

    if (alreadyCleared.length > 0 && targets.length > 0) {
      const alreadyClearedInvoicesStr = alreadyCleared.map(i => i.invoiceNo).join(' , ');
      this.confirmationService.confirm({
        message: this.activeLanguage === 'ar'
          ? `الفواتير التالية أُرسلت بالفعل إلى زاتكا ولن يتم إرسالها مرة أخرى: [${alreadyClearedInvoicesStr}].\n\nهل تريد متابعة إرسال باقي الفواتير غير المُرسلة (${targets.length} فاتورة)؟`
          : `The following invoices have already been sent to ZATCA and will not be sent again: [${alreadyClearedInvoicesStr}].\n\nDo you want to continue sending the remaining unsent invoices (${targets.length})?`,
        header: this.activeLanguage === 'ar' ? 'تأكيد الإرسال الجماعي' : 'Bulk Send Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.activeLanguage === 'ar' ? 'متابعة الإرسال' : 'Continue Sending',
        rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
        accept: () => {
          this.executeBulkZatcaPreCheck(targets);
        }
      });
    } else if (targets.length === 0 && alreadyCleared.length > 0) {
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'معلومة' : 'Info',
        detail: this.activeLanguage === 'ar' ? 'جميع الفواتير المحددة تم إرسالها مسبقاً إلى زاتكا' : 'All selected invoices have already been sent to ZATCA'
      });
    } else {
      this.executeBulkZatcaPreCheck(targets);
    }
  }

  private executeBulkZatcaPreCheck(targets: SalesInvoice[]) {
    if (!targets.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
        detail: this.activeLanguage === 'ar' ? 'لا توجد فواتير لإرسالها' : 'No invoices to send'
      });
      return;
    }

    if (targets.length > this.BULK_ZATCA_MAX) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
        detail: this.activeLanguage === 'ar'
          ? `يمكن إرسال ${this.BULK_ZATCA_MAX} فاتورة كحد أقصى في المرة الواحدة. الرجاء تقليل عدد الفواتير المحددة.`
          : `Maximum ${this.BULK_ZATCA_MAX} invoices can be sent at once. Please reduce your selection.`
      });
      return;
    }

    this.bulkZatcaValidating = true;
    this.bulkZatcaValidationResults = [];
    this.zatcaSendingStatus = 'validating';
    this.zatcaSending = true; this.cdr.detectChanges();

    let i = 0;
    const validateNext = () => {
      if (i >= targets.length) {
        this.zatcaSending = false;
        this.bulkZatcaValidating = false;
        this.bulkZatcaValidationResults.sort((a, b) => {
          const order = { error: 0, warnings: 1, ready: 2 };
          return order[a.status] - order[b.status];
        });
        this.bulkZatcaPreCheckDialogVisible = true;
        this.cdr.detectChanges();
        return;
      }

      const inv = targets[i++];
      this.salesInvoiceService.validateZatcaInvoice(inv.id).subscribe({
        next: (res) => {
          const companyErrors = res.companyErrors || [];
          const customerErrors = res.customerErrors || [];
          const warnings = res.warnings || [];
          const hasBlocking = companyErrors.length > 0 || customerErrors.length > 0;
          this.bulkZatcaValidationResults.push({
            invoiceId: inv.id,
            invoiceNo: inv.invoiceNo,
            invoiceType: res.invoiceType || 'standard',
            customerId: inv.customerProfileId?.toString(),
            status: hasBlocking ? 'error' : (warnings.length > 0 ? 'warnings' : 'ready'),
            companyErrors,
            customerErrors,
            warnings
          });
          validateNext();
        },
        error: () => {
          this.bulkZatcaValidationResults.push({
            invoiceId: inv.id,
            invoiceNo: inv.invoiceNo,
            invoiceType: 'standard',
            customerId: inv.customerProfileId?.toString(),
            status: 'error',
            companyErrors: [this.activeLanguage === 'ar' ? 'فشل التحقق من البيانات' : 'Validation failed'],
            customerErrors: [],
            warnings: []
          });
          validateNext();
        }
      });
    };
    validateNext();
  }

  // Arabic Comments: مرحلة 2: تنفيذ الإرسال الجماعي بعد تأكيد المستخدم

  confirmBulkSend(onlyReady: boolean = false): void {
    this.bulkZatcaPreCheckDialogVisible = false;
    const toSend = onlyReady
      ? this.bulkZatcaValidationResults.filter(r => r.status === 'ready' || r.status === 'warnings')
      : this.bulkZatcaValidationResults.filter(r => r.status !== 'error');

    if (!toSend.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.activeLanguage === 'ar' ? 'معلومة' : 'Info',
        detail: this.activeLanguage === 'ar' ? 'لا توجد فواتير يمكن إرسالها' : 'No invoices available to send'
      });
      return;
    }

    this.zatcaErrors = [];
    this.zatcaSendingStatus = 'sending';
    this.zatcaSending = true; this.cdr.detectChanges();
    let i = 0;

    const processNext = () => {
      if (i >= toSend.length) {
        this.zatcaSending = false; this.cdr.detectChanges();
        this.loadInvoices();
        if (this.zatcaErrors.length > 0) {
          this.zatcaErrorDialogVisible = true; this.cdr.detectChanges();
        } else {
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
            detail: this.activeLanguage === 'ar'
              ? `تم إرسال ${toSend.length} فاتورة إلى زاتكا بنجاح`
              : `${toSend.length} invoice(s) sent to ZATCA successfully`,
            life: 5000
          });
        }
        return;
      }

      const item = toSend[i++];
      this.salesInvoiceService.clearSalesInvoice(item.invoiceId).subscribe({
        next: () => processNext(),
        error: (e) => {
          if (e === 'OK') { processNext(); return; }
          const rawMessage = e?.error?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error during send');
          let finalMessage = rawMessage;
          if (rawMessage.includes('validationResults')) {
            try {
              const jsonStr = rawMessage.substring(rawMessage.indexOf('{'));
              const zatcaErr = JSON.parse(jsonStr);
              const errors = zatcaErr.validationResults?.errorMessages;
              const warnings = zatcaErr.validationResults?.warningMessages;
              if (errors?.length > 0) finalMessage = errors.map((e: any) => e.message).join('\n');
              else if (warnings?.length > 0) finalMessage = warnings.map((w: any) => w.message).join('\n');
            } catch (error) {
              console.warn('Unable to parse ZATCA validation response', error);
            }
          } else if (rawMessage.includes('|')) {
            const parts = rawMessage.split('|').map((p: string) => p.trim());
            finalMessage = this.activeLanguage !== 'ar' && parts.length > 1 ? parts[1] : parts[0];
          }
          const isCompanyError = /شرك|company/i.test(rawMessage);
          const isCustomerError = /عميل|customer/i.test(rawMessage);
          this.zatcaErrors.push({
            invoiceNo: item.invoiceNo,
            errorMsg: finalMessage,
            customerId: item.customerId,
            isCompanyError,
            isCustomerError
          });
          processNext();
        }
      });
    };
    processNext();
  }

  getTaxAmount(invoice) {
    // If there was explicitly no tax to collect, bail early
    if (invoice.taxAmount === 0) return 0;

    // 1) Compute each item's raw subtotal and the grand total
    const subtotals = invoice.saleItems.map(
      (item) => item.price * item.quantity * item.noOfNights
    );
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    // 2) Pull in the discount
    const discount = invoice.discountAmount || 0;

    // 3) For each item: compute its share of discount, then its tax
    let totalTax = 0;
    invoice.saleItems.forEach((item, idx) => {
      const itemSubtotal = subtotals[idx];

      // Determine tax rate based on mainSalesClass
      const isExempt = item.mainSalesClass?.isTaxExempted;
      const taxRate = isExempt ? 0 : 0.15;

      // Allocate discount proportionally
      const itemDiscount =
        grossTotal > 0 ? (itemSubtotal / grossTotal) * discount : 0;

      // Taxable base = remaining after discount
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);

      totalTax += taxableBase * taxRate;
    });

    // 4) Round and return
    return Math.round(totalTax * 100) / 100;
  }

  getNetPrice(invoice) {
    // calculate from items
    const netTotal = invoice.saleItems.reduce(
      (total, item) => total + item.price * item.quantity * item.noOfNights,
      0
    );
    const discount = invoice.discountAmount || 0;
    const discountedTotal = netTotal - discount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getTotalPrice(invoice) {
    // calculate from items
    return (
      Math.round(this.getNetPrice(invoice) * 100) / 100 +
      Math.round(this.getTaxAmount(invoice) * 100) / 100
    );
  }

  getPaymentStatusText(status: InvoicePaymentStatus | undefined | null): string {
    if (status === null || status === undefined) return '-';
    switch (status) {
      case InvoicePaymentStatus.Paid:
        const t1 = this.translate.instant('FINANCE.STATUS_FULLY_PAID');
        return t1 !== 'FINANCE.STATUS_FULLY_PAID' ? t1 : 'مدفوعة بالكامل';
      case InvoicePaymentStatus.PartiallyPaid:
        const t2 = this.translate.instant('FINANCE.STATUS_PARTIALLY_PAID');
        return t2 !== 'FINANCE.STATUS_PARTIALLY_PAID' ? t2 : 'مدفوعة جزئياً';
      case InvoicePaymentStatus.Unpaid:
        const t3 = this.translate.instant('FINANCE.STATUS_UNPAID');
        return t3 !== 'FINANCE.STATUS_UNPAID' ? t3 : 'غير مدفوعة';
      default:
        return '-';
    }
  }

  getPaymentStatusClass(status: InvoicePaymentStatus | undefined | null): string {
    if (status === null || status === undefined) return 'bg-gray-500 text-white';
    switch (status) {
      case InvoicePaymentStatus.Paid:
        return 'bg-green-500 text-white';
      case InvoicePaymentStatus.PartiallyPaid:
        return 'bg-yellow-500 text-white';
      case InvoicePaymentStatus.Unpaid:
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  confirmClearInvoice(_event: any, invoiceId: number) {
    if (!invoiceId || this.isSendingZatca(invoiceId)) {
      return;
    }

    this.sendingZatcaStates[invoiceId] = true;
    this.zatcaSendingStatus = 'validating';
    this.zatcaSending = true;
    this.cdr.detectChanges();

    // Show immediate progress toast
    this.messageService.add({
      severity: 'info',
      summary: this.activeLanguage === 'ar' ? 'جاري الإرسال' : 'Sending',
      detail: this.activeLanguage === 'ar'
        ? 'جاري إرسال الفاتورة إلى هيئة الزكاة والضريبة والجمارك (ZATCA)...'
        : 'Sending invoice to ZATCA...',
      life: 4000
    });

    this.salesInvoiceService.validateZatcaInvoice(invoiceId).subscribe({
      next: (res) => {
        const companyErrors = res.companyErrors || [];
        const customerErrors = res.customerErrors || [];
        const warnings = res.warnings || [];
        const hasBlockingErrors = companyErrors.length > 0 || customerErrors.length > 0;

        if (!hasBlockingErrors && warnings.length === 0) {
          // If perfectly clean, just send it directly
          this.clearInvoice(invoiceId);
          return;
        }

        // Needs dialog - release zatcaSending so user can interact with dialog
        this.zatcaSending = false;
        this.sendingZatcaStates[invoiceId] = false;

        const inv = this.invoices?.find(i => i.id === invoiceId);

        // Otherwise, show the dialog
        this.zatcaPreCheck = {
          invoiceType: res.invoiceType || 'standard',
          invoiceId: invoiceId,
          customerId: inv?.customerProfileId?.toString() || '',
          companyErrors,
          customerErrors,
          warnings,
          hasBlockingErrors
        };
        this.zatcaPreCheckDialogVisible = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.zatcaSending = false;
        this.sendingZatcaStates[invoiceId] = false;
        this.cdr.detectChanges();
        const errDetail = err?.error?.message || err?.message || (this.activeLanguage === 'ar' ? 'فشل التحقق من بيانات الفاتورة قبل الإرسال لزاتكا' : 'Failed to validate invoice data before sending to ZATCA');
        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'فشل الإرسال' : 'Error',
          detail: errDetail,
          life: 6000
        });
      }
    });
  }

  confirmZatcaSend(): void {
    if (this.zatcaSending) return;
    this.zatcaPreCheckDialogVisible = false;
    if (this.zatcaPreCheck && this.zatcaPreCheck.invoiceId) {
      this.clearInvoice(this.zatcaPreCheck.invoiceId);
    }
  }

  clearInvoice(id: number) {
    if (this.zatcaSending && this.zatcaSendingStatus === 'sending') {
      return;
    }
    this.zatcaSendingStatus = 'sending';
    this.zatcaSending = true;
    this.sendingZatcaStates[id] = true;
    if (this.loadingStates) {
      this.loadingStates[id] = true;
    }
    this.cdr.detectChanges();

    // Ensure immediate sending toast is shown
    this.messageService.add({
      severity: 'info',
      summary: this.activeLanguage === 'ar' ? 'جاري الإرسال' : 'Sending',
      detail: this.activeLanguage === 'ar'
        ? 'جاري إرسال الفاتورة إلى هيئة الزكاة والضريبة والجمارك (ZATCA)...'
        : 'Sending invoice to ZATCA...',
      life: 4000
    });

    this.salesInvoiceService.clearSalesInvoice(id).subscribe({
      next: (res: any) => {
        this.zatcaSending = false;
        this.sendingZatcaStates[id] = false;
        if (this.loadingStates) {
          this.loadingStates[id] = false;
        }

        let resultObj: any = res;
        if (typeof res === 'string') {
          try {
            resultObj = JSON.parse(res);
          } catch {
            resultObj = { isCleared: res.includes('cleared'), message: res };
          }
        }

        const isCleared = resultObj?.isCleared === true || resultObj?.status === 'CLEARED' || resultObj?.status === 'ALREADY_CLEARED';

        if (isCleared) {
          const detailMsg = resultObj?.status === 'ALREADY_CLEARED'
            ? (this.activeLanguage === 'ar' ? 'الفاتورة مرسلة ومسجلة بالفعل لدى زاتكا' : 'Invoice is already cleared with ZATCA')
            : (this.activeLanguage === 'ar'
                ? (resultObj?.message && resultObj.message !== 'Invoice cleared successfully.' ? resultObj.message : 'تم إرسال الفاتورة إلى زاتكا بنجاح وتأكيدها')
                : (resultObj?.message || 'Invoice sent to ZATCA successfully and confirmed'));

          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم الإرسال بنجاح' : 'Success',
            detail: detailMsg,
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
            detail: resultObj?.message || (this.activeLanguage === 'ar' ? 'لم تكتمل عملية الإرسال لزاتكا' : 'ZATCA submission incomplete'),
            life: 6000
          });
        }
        this.loadInvoices();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.zatcaSending = false;
        this.sendingZatcaStates[id] = false;
        if (this.loadingStates) {
          this.loadingStates[id] = false;
        }

        if (e === 'OK' || (typeof e?.error?.text === 'string' && e.error.text.includes('cleared'))) {
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم الإرسال بنجاح' : 'Success',
            detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى زاتكا بنجاح' : 'Invoice sent to ZATCA successfully',
            life: 5000
          });
          this.loadInvoices();
          this.cdr.detectChanges();
          return;
        }

        // On error or timeout: verify backend status before deciding failure
        this.salesInvoiceService.getInvoiceById(id).subscribe({
          next: (inv) => {
            if (inv?.isCleared) {
              this.messageService.add({
                severity: 'success',
                summary: this.activeLanguage === 'ar' ? 'تم التأكيد' : 'Confirmed',
                detail: this.activeLanguage === 'ar' ? 'تم التحقق: الفاتورة معتمدة ومسجلة في النظام لدى زاتكا' : 'Verified: Invoice is cleared with ZATCA in the system',
                life: 5000
              });
              this.loadInvoices();
            } else {
              this.handleZatcaClearError(id, e);
            }
            this.cdr.detectChanges();
          },
          error: () => {
            this.handleZatcaClearError(id, e);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  private handleZatcaClearError(id: number, e: any): void {
    const rawMessage: string = e?.error?.message || e?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error sending to ZATCA');
    const isAr = this.activeLanguage === 'ar';

    let finalMessage = rawMessage;
    if (rawMessage.includes('validationResults')) {
      try {
        const jsonStr = rawMessage.substring(rawMessage.indexOf('{'));
        const zatcaErr = JSON.parse(jsonStr);
        const errors = zatcaErr.validationResults?.errorMessages;
        const warnings = zatcaErr.validationResults?.warningMessages;
        if (errors?.length > 0) finalMessage = errors.map((errItem: any) => errItem.message).join('\n');
        else if (warnings?.length > 0) finalMessage = warnings.map((w: any) => w.message).join('\n');
      } catch (error) {
        console.warn('Unable to parse ZATCA validation response', error);
      }
    } else if (rawMessage.includes('|')) {
      const parts = rawMessage.split('|').map((p: string) => p.trim());
      finalMessage = !isAr && parts.length > 1 ? parts[1] : parts[0];
    }

    // Always show error message toast so user gets clear feedback!
    this.messageService.add({
      severity: 'error',
      summary: this.activeLanguage === 'ar' ? 'فشل الإرسال لزاتكا' : 'ZATCA Submission Failed',
      detail: finalMessage,
      life: 7000
    });

    const isCompanyError = /شرك|شركة|company/i.test(rawMessage);
    const isCustomerError = /عميل|customer/i.test(rawMessage);
    const inv = this.invoices.find(i => i.id === id);

    this.zatcaPreCheck = {
      ...this.zatcaPreCheck,
      invoiceId: id,
      customerId: inv?.customerProfileId?.toString() || '',
      companyErrors: isCompanyError ? [finalMessage] : [],
      customerErrors: isCustomerError && !isCompanyError ? [finalMessage] : [],
      warnings: !isCompanyError && !isCustomerError ? [finalMessage] : [],
      hasBlockingErrors: isCompanyError || isCustomerError
    };
    this.zatcaPreCheckDialogVisible = true;
    this.loadInvoices();
    this.cdr.detectChanges();
  }

  createSalesCreditNote(id: string) {
    // navigate to the new sales credit note page with query params invoiceId
    this.router.navigate(['/sales-credit-notes/new'], {
      queryParams: { invoiceId: id },
    });
  }

  sendToFrontal(invoice: SalesInvoice) {
    if (!invoice || this.isInvoiceFrontal(invoice) || this.sendingFrontalStates[invoice.id]) return;

    this.confirmationService.confirm({
      message: this.activeLanguage === 'ar'
        ? 'هل أنت متأكد من إرسال هذه الفاتورة إلى الواجهة؟'
        : 'Are you sure you want to send this invoice to Frontal?',
      header: this.activeLanguage === 'ar' ? 'تأكيد الإرسال' : 'Confirmation',
      icon: 'pi pi-question-circle',
      acceptLabel: this.activeLanguage === 'ar' ? 'نعم' : 'Yes',
      rejectLabel: this.activeLanguage === 'ar' ? 'لا' : 'No',
      acceptButtonStyleClass: 'p-button-primary rounded-md',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined rounded-md',
      accept: () => {
        if (this.sendingFrontalStates[invoice.id]) return;
        this.sendingFrontalStates[invoice.id] = true;
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'info',
          summary: this.activeLanguage === 'ar' ? 'جاري الإرسال' : 'Sending',
          detail: this.activeLanguage === 'ar'
            ? 'جاري إرسال الفاتورة إلى الواجهة...'
            : 'Sending invoice to Frontal...',
          life: 4000
        });

        this.salesInvoiceService.makeFrontal(invoice.id).subscribe({
          next: () => {
            this.sendingFrontalStates[invoice.id] = false;
            invoice.isFrontal = true;
            if (this.selectedInvoice && this.selectedInvoice.id === invoice.id) {
              this.selectedInvoice.isFrontal = true;
            }
            this.messageService.add({
              severity: 'success',
              summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
              detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى الواجهة بنجاح' : 'Invoice sent to Frontal successfully',
            });
            this.loadInvoicesLazy({
              first: (this.currentPage - 1) * this.pageSize,
              rows: this.pageSize
            });
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.sendingFrontalStates[invoice.id] = false;
            this.cdr.detectChanges();
            console.error('Error making invoice frontal:', error);
            this.messageService.add({
              severity: 'error',
              summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
              detail: this.activeLanguage === 'ar' ? 'حدث خطأ أثناء إرسال الفاتورة إلى الواجهة' : 'Error sending invoice to Frontal',
            });
          },
        });
      }
    });
  }

  isInvoiceFrontal(invoice: any): boolean {
    if (!invoice) return false;
    return (
      invoice.isFrontal === true ||
      invoice.isFrontal === 'true' ||
      invoice.isFrontal === 1 ||
      invoice.IsFrontal === true ||
      invoice.IsFrontal === 'true' ||
      invoice.IsFrontal === 1 ||
      (typeof invoice.invoiceNo === 'string' && invoice.invoiceNo.startsWith('FINV-'))
    );
  }

  getFrontalText(): string {
    if (this.activeLanguage === 'ar') {
      return 'في الواجهة الأمامية';
    } else {
      return 'In Frontal';
    }
  }

  getFrontalStatusText(): string {
    if (this.activeLanguage === 'ar') {
      return 'في الواجهة الأمامية';
    } else {
      return 'In Frontal';
    }
  }

  // ================= Upload & Excel Parsing =================
  openUploadDialog() {
    this.resetUploadState();
    this.uploadDialogVisible = true;
  }

  resetUploadState() {
    this.processingUpload = false;
    this.uploadProgress = 0;
    this.ignoredInvoices = [];
    this.previewInvoices = [];
    this.createdCount = 0;
    this.totalToCreate = 0;
    this.selectedFileName = '';
    this.missingItemNames = [];
    this.importSummary = null;
    this.importFailuresDialogVisible = false;
    this.selectedImportFile = null;
  }

  /** تحمـيل تصنيفات المبيعات والعملاء عند الحاجة فقط لاستيراد الإكسيل */
  ensureImportDependenciesLoaded(): Observable<boolean> {
    const needClasses = !this.mainSalesClasses || this.mainSalesClasses.length === 0;
    const needCustomers = !this.customers || this.customers.length === 0;

    if (!needClasses && !needCustomers) {
      return of(true);
    }

    const sources: Observable<any>[] = [];
    if (needClasses) {
      sources.push(
        this.mainSalesClassService.getAll().pipe(
          map((cls) => {
            this.mainSalesClasses = cls || [];
            return cls;
          })
        )
      );
    }
    if (needCustomers) {
      sources.push(
        this.customerProfileService.getAll().pipe(
          map((custs) => {
            this.customers = custs || [];
            return custs;
          })
        )
      );
    }

    return forkJoin(sources).pipe(
      map(() => true),
      catchError((err) => {
        console.error('Error loading import dependencies', err);
        return of(false);
      })
    );
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedImportFile = file;
    this.selectedFileName = file.name;
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (
      !allowed.includes(file.type) &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls')
    ) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('INVOICE.WARNING'),
        detail: this.translate.instant('INVOICE.IMPORT_INVALID_FILE_TYPE'),
      });
      return;
    }
    this.ensureImportDependenciesLoaded().subscribe(() => {
      this.readExcelPreview(file);
    });
  }

  private readExcelPreview(file: File) {
    this.processingUpload = true;
    this.uploadProgress = 20;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: true,
        });
        this.processPreviewRows(rows);
        this.uploadProgress = 100;
      } catch (err) {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('INVOICE.ERROR'),
          detail: this.translate.instant('INVOICE.IMPORT_PARSE_FAILED'),
        });
      } finally {
        this.processingUpload = false;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private processPreviewRows(rows: any[][]) {
    const nonEmptyRows = rows.filter((r) =>
      (r || []).some(
        (c) => c !== undefined && c !== null && String(c).trim() !== ''
      )
    );

    if (!nonEmptyRows.length) {
      this.previewInvoices = [];
      this.totalToCreate = 0;
      return;
    }

    const headerRow = nonEmptyRows[0];
    const headerIndex = rows.indexOf(headerRow);
    const normalizedHeaders = (headerRow || []).map((h) =>
      this.normalizeHeaderForImport(String(h ?? ''))
    );

    const colIndex = {
      refNo: this.findImportColIndex(normalizedHeaders, ['refno', 'ref no', 'reference', 'reference no']),
      customerName: this.findImportColIndex(normalizedHeaders, ['customername', 'customer name', 'customer']),
      invoiceDate: this.findImportColIndex(normalizedHeaders, ['invoicedate', 'invoice date', 'date']),
      itemName: this.findImportColIndex(normalizedHeaders, ['itemname', 'item name', 'item', 'product']),
      quantity: this.findImportColIndex(normalizedHeaders, ['quantity', 'qty']),
      price: this.findImportColIndex(normalizedHeaders, ['price', 'unitprice', 'unit price']),
    };

    if (
      colIndex.customerName < 0 ||
      colIndex.invoiceDate < 0 ||
      colIndex.itemName < 0 ||
      colIndex.quantity < 0 ||
      colIndex.price < 0
    ) {
      this.previewInvoices = [];
      this.totalToCreate = 0;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('INVOICE.IMPORT_INVALID_HEADER'),
      });
      return;
    }

    const dataRows = rows
      .slice(headerIndex + 1)
      .filter((r) =>
        (r || []).some(
          (c) => c !== undefined && c !== null && String(c).trim() !== ''
        )
      );

    let currentRefNo: string | null = null;
    let currentCustomer: string | null = null;
    let currentDate: string | null = null;
    const invoiceMap = new Map<string, TempParsedInvoice>();

    for (let idx = 0; idx < dataRows.length; idx++) {
      const row = dataRows[idx];
      const refCell = colIndex.refNo >= 0 ? row[colIndex.refNo] : null;
      const customerCell = row[colIndex.customerName];
      const dateCell = row[colIndex.invoiceDate];
      const itemCell = row[colIndex.itemName];
      const qtyCell = row[colIndex.quantity];
      const priceCell = row[colIndex.price];

      if (refCell && String(refCell).trim()) {
        currentRefNo = String(refCell).trim();
        currentCustomer = null;
        currentDate = null;
      }
      if (customerCell && String(customerCell).trim()) {
        currentCustomer = String(customerCell).trim();
      }
      if (dateCell !== null && dateCell !== undefined && String(dateCell).trim()) {
        currentDate = this.normalizeDate(dateCell);
      }

      const itemName = itemCell ? String(itemCell).trim() : '';
      const quantity = this.toNumber(qtyCell);
      const price = this.toNumber(priceCell);

      if (!itemName || quantity <= 0 || price < 0) {
        continue;
      }

      if (!currentCustomer || !currentDate) {
        continue;
      }

      const effectiveRef = currentRefNo || `ROW-${idx + 1}`;
      const key = `${effectiveRef}|${currentCustomer}|${currentDate}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, {
          refNo: effectiveRef,
          customerName: currentCustomer,
          dateStr: currentDate,
          items: [],
        });
      }

      invoiceMap.get(key)!.items.push({
        itemName,
        quantity,
        price,
      });
    }

    this.lastParsedInvoices = Array.from(invoiceMap.values());
    this.previewInvoices = this.lastParsedInvoices.map((inv) => ({
      refNo: inv.refNo,
      customerName: inv.customerName,
      invoiceDate: inv.dateStr,
      itemsCount: inv.items.length,
      total: this.round(
        inv.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
      ),
    }));
    this.totalToCreate = this.previewInvoices.length;
  }

  startServerImport() {
    if (!this.selectedImportFile) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('INVOICE.WARNING'),
        detail: this.translate.instant('INVOICE.IMPORT_SELECT_FILE_FIRST'),
      });
      return;
    }

    this.processingUpload = true;
    this.uploadProgress = 25;
    this.importSummary = null;
    this.ignoredInvoices = [];
    this.createdCount = 0;

    this.salesInvoiceService
      .importFromExcel(this.selectedImportFile)
      .pipe(
        finalize(() => {
          this.processingUpload = false;
          this.uploadProgress = 100;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          const failed = res?.failed || [];
          this.importSummary = {
            imported: res?.imported || 0,
            updated: res?.updated || 0,
            failed,
          };
          this.createdCount = (res?.imported || 0) + (res?.updated || 0);
          this.ignoredInvoices = failed.map((f) => ({
            row: f.row,
            errorCode: f.errorCode,
            refNo: f.invoiceNo || `Row ${f.row}`,
            customerName: f.customerName || '-',
            invoiceDate: '-',
            reason: f.reason || f.errorCode || 'Import failed',
          }));

          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('INVOICE.IMPORT_COMPLETED'),
            detail: this.translate.instant('INVOICE.IMPORT_RESULT_TOAST_LINE', {
              imported: res?.imported || 0,
              failed: failed.length,
            }),
          });

          if ((res?.imported || 0) > 0 || (res?.updated || 0) > 0) {
            this.loadInvoices();
          }
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('INVOICE.IMPORT_FAILED'),
            detail:
              err?.error?.message ||
              err?.message ||
              this.translate.instant('INVOICE.IMPORT_FAILED_GENERIC'),
          });
        },
      });
  }

  openImportFailuresDialog() {
    if (!this.ignoredInvoices.length) return;
    this.importFailuresDialogVisible = true;
  }

  private processWorksheetRows(rows: any[][]) {
    // find header row (first non-empty row)
    const headerRow =
      rows.find(
        (r) =>
          (r || []).filter(
            (c) => c !== undefined && c !== null && String(c).trim() !== ''
          ).length > 0
      ) || [];
    const expectedHeaders = [
      'Ref No.',
      'Customer name',
      'Invoice Date',
      'Item Name',
      'Quantity',
      'Price',
    ];
    if (
      headerRow.length < expectedHeaders.length ||
      !expectedHeaders.every(
        (h, i) => (headerRow[i] || '').toString().trim() === h
      )
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid header row. Expected: ' + expectedHeaders.join(', '),
      });
      this.processingUpload = false;
      return;
    }
    const headerIndex = rows.indexOf(headerRow);
    const dataRows = rows
      .slice(headerIndex + 1)
      .filter((r) =>
        (r || []).some(
          (c) => c !== undefined && c !== null && String(c).trim() !== ''
        )
      );

    let currentRef: string = null,
      currentCustomer: string = null,
      currentDateStr: string = null;
    const invoiceMap = new Map<string, TempParsedInvoice>();
    const ignored: IgnoredInvoiceInfo[] = [];
    const missingFieldSet = new Set<string>();

    for (const row of dataRows) {
      const refCell = row[0];
      const custCell = row[1];
      const dateCell = row[2];
      const itemNameCell = row[3];
      const qtyCell = row[4];
      const priceCell = row[5];
      // Detect start of a new invoice by presence of a new Ref No.
      if (refCell && String(refCell).trim()) {
        currentRef = String(refCell).trim();
        // Reset carried-forward values so blanks do not inherit previous invoice's customer/date
        currentCustomer = null;
        currentDateStr = null;
      }
      if (custCell && String(custCell).trim()) {
        currentCustomer = String(custCell).trim();
      }
      if (dateCell && String(dateCell).trim()) {
        currentDateStr = this.normalizeDate(dateCell);
      }

      const itemPresent =
        (itemNameCell && String(itemNameCell).trim()) ||
        this.toNumber(qtyCell) > 0 ||
        this.toNumber(priceCell) > 0;
      if (itemPresent && (!currentRef || !currentCustomer || !currentDateStr)) {
        const missingFields: string[] = [];
        if (!currentRef) missingFields.push('Ref No.');
        if (!currentCustomer) missingFields.push('Customer name');
        if (!currentDateStr) missingFields.push('Invoice Date');
        const reason = 'Missing required field(s): ' + missingFields.join(', ');
        const keyMissing = `${currentRef || String(refCell || '')}|${currentCustomer || String(custCell || '')
          }|${currentDateStr || String(dateCell || '')}`;
        if (!missingFieldSet.has(keyMissing)) {
          ignored.push({
            refNo: currentRef || String(refCell || ''),
            customerName: currentCustomer || String(custCell || ''),
            invoiceDate: currentDateStr || String(dateCell || ''),
            reason,
          });
          missingFieldSet.add(keyMissing);
        }
        continue;
      }
      if (!currentRef || !currentCustomer || !currentDateStr) continue;

      // Validate item row presence
      const itemName = itemNameCell ? String(itemNameCell).trim() : '';
      const quantity = this.toNumber(qtyCell);
      const price = this.toNumber(priceCell);
      if (!itemName || quantity <= 0 || price <= 0) {
        // skip malformed item; may still have valid other items
        continue;
      }
      const key = `${currentRef}|${currentCustomer}|${currentDateStr}`;
      if (!invoiceMap.has(key)) {
        invoiceMap.set(key, {
          refNo: currentRef,
          customerName: currentCustomer,
          dateStr: currentDateStr,
          items: [],
        });
      }
      invoiceMap.get(key).items.push({ itemName, quantity, price });
    }

    // Build invoices & filter (append to any ignored already collected)
    const prepared = [] as any[]; // will hold objects ready to create
    const taxRate = 0.15;
    const globalMissing = new Set<string>();
    this.lastParsedInvoices = Array.from(invoiceMap.values());
    invoiceMap.forEach((inv) => {
      if (!inv.items.length) {
        ignored.push({
          refNo: inv.refNo,
          customerName: inv.customerName,
          invoiceDate: inv.dateStr,
          reason: 'No valid items',
        });
        return;
      }
      // Check all items have existing mainSalesClass
      const missingItems: string[] = [];
      const itemDtos = inv.items.map((it, idx) => {
        const cls = this.findMainSalesClassByName(it.itemName);
        if (!cls) {
          missingItems.push(it.itemName);
        }
        const netPrice = this.round(it.price * it.quantity * 1);
        const isExempt = cls?.isTaxExempted;
        const itemTaxRate = isExempt ? 0 : taxRate;
        const taxAmount = this.round(netPrice * itemTaxRate);
        const totalPrice = this.round(netPrice + taxAmount);
        return {
          id: null,
          itemNo: String(idx + 1),
          mainSalesClassId: cls?.id || null,
          price: it.price,
          quantity: it.quantity,
          noOfNights: 1,
          tax: itemTaxRate * 100, // keeping percentage maybe? existing form stores 15
          taxAmount: taxAmount,
          discount: 0,
          discountAmount: 0,
          totalPrice: totalPrice,
          netPrice: netPrice,
          saleInvoiceId: null,
        };
      });
      if (missingItems.length) {
        missingItems.forEach((m) => globalMissing.add(m));
        ignored.push({
          refNo: inv.refNo,
          customerName: inv.customerName,
          invoiceDate: inv.dateStr,
          reason: 'Missing item classes',
          missingItems,
        });
        return; // skip whole invoice
      }
      // compute invoice totals
      const netPriceSum = this.round(
        itemDtos.reduce((s, i) => s + (i.netPrice || 0), 0)
      );
      const taxAmountSum = this.round(
        itemDtos.reduce((s, i) => s + (i.taxAmount || 0), 0)
      );
      const totalPriceSum = this.round(
        itemDtos.reduce((s, i) => s + (i.totalPrice || 0), 0)
      );
      const issue = this.parseDateStringToDate(inv.dateStr);
      const customer = this.findCustomerByName(inv.customerName);
      prepared.push({
        invoiceNo: null, // will be generated sequentially
        currency: 'SAR',
        customerProfileId: customer ? customer.id : null,
        customerProfileName: inv.customerName,
        description: '',
        issueDate: issue,
        dueDate: issue,
        tax: taxRate * 100,
        taxAmount: taxAmountSum,
        discount: 0,
        discountAmount: 0,
        totalPrice: totalPriceSum,
        netPrice: netPriceSum,
        saleItems: itemDtos,
        isQuotation: false,
        parsedRefNo: inv.refNo,
        parsedCustomerName: inv.customerName,
        parsedDateStr: inv.dateStr,
      });
    });

    this.missingItemNames = Array.from(globalMissing).sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
    this.ignoredInvoices = ignored;
    this.totalToCreate = prepared.length;
    if (!prepared.length) {
      this.processingUpload = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Info',
        detail: 'No invoices to create (all ignored).',
      });
      return;
    }
    this.assignInvoiceNumbersAndCreate(prepared);
  }

  private assignInvoiceNumbersAndCreate(invoices: any[]) {
    const { nonDuplicates, duplicates } =
      this.detectDuplicateInvoices(invoices);
    if (duplicates.length) {
      this.needCheckInvoices = duplicates;
    }
    const toCreateNow = nonDuplicates;
    this.totalToCreate = toCreateNow.length;
    if (!toCreateNow.length) {
      this.processingUpload = false;
      if (this.needCheckInvoices.length) {
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: 'لا توجد فواتير لإنشائها حالياً. يوجد فواتير تحتاج تأكيد.',
        });
      }
    }
    // Fetch first invoice number from backend then increment locally
    this.salesInvoiceService.getInvoiceNo().subscribe({
      next: (res) => {
        let current = res?.invoiceNo || 'Inv-1';
        toCreateNow.forEach((inv, idx) => {
          if (idx === 0) {
            inv.invoiceNo = current;
          } else {
            current = this.incrementInvoiceNo(current);
            inv.invoiceNo = current;
          }
        });
        this.lastInvoiceNoUsed = toCreateNow.length
          ? toCreateNow[toCreateNow.length - 1].invoiceNo
          : current;
        if (toCreateNow.length) {
          this.createInvoicesSequentially(toCreateNow);
        }
      },
      error: (err) => {
        console.error('Failed to get starting invoice number', err);
        // Fallback: assign simple incremental numbers starting at Inv-1
        let current = 'Inv-1';
        toCreateNow.forEach((inv, idx) => {
          if (idx === 0) {
            inv.invoiceNo = current;
          } else {
            current = this.incrementInvoiceNo(current);
            inv.invoiceNo = current;
          }
        });
        this.lastInvoiceNoUsed = toCreateNow.length
          ? toCreateNow[toCreateNow.length - 1].invoiceNo
          : current;
        if (toCreateNow.length) {
          this.createInvoicesSequentially(toCreateNow);
        }
      },
    });
  }

  private incrementInvoiceNo(value: string): string {
    const match = value.match(/^(.*?)(\d+)$/);
    if (!match) {
      return value + '-1';
    }
    const prefix = match[1];
    const num = match[2];
    const next = (parseInt(num, 10) + 1).toString().padStart(num.length, '0');
    return prefix + next;
  }

  private createInvoicesSequentially(invoices: any[], index: number = 0) {
    if (index >= invoices.length) {
      this.processingUpload = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Done',
        detail: `Created ${this.createdCount} invoices. Ignored ${this.ignoredInvoices.length}.`,
      });
      this.loadInvoices();
      return;
    }
    const inv = invoices[index];
    // Format dates to UTC ISO
    const payload = {
      ...inv,
      issueDate: formatDateToUTCString(inv.issueDate),
      dueDate: formatDateToUTCString(inv.dueDate),
    };
    this.salesInvoiceService.createInvoice(payload).subscribe({
      next: () => {
        this.createdCount = this.createdCount + 1;
      },
      error: (err) => {
        console.error('Create invoice failed', err);
        const msg =
          (err && (err.error?.message || err.message || err.statusText)) ||
          'API error';
        this.ignoredInvoices = [
          ...this.ignoredInvoices,
          {
            refNo: inv.parsedRefNo || inv.invoiceNo,
            customerName: inv.parsedCustomerName || inv.customerProfileName,
            invoiceDate: inv.parsedDateStr || String(inv.issueDate),
            reason: msg,
          },
        ];
      },
      complete: () => {
        this.uploadProgress = Math.round(
          ((index + 1) / this.totalToCreate) * 100
        );
        this.createInvoicesSequentially(invoices, index + 1);
        this.cdr.detectChanges();
      },
    });
  }

  exportIgnoredInvoices() {
    if (!this.ignoredInvoices.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('INVOICE.INFO'),
        detail: this.translate.instant('INVOICE.IMPORT_NO_ERRORS_TO_EXPORT'),
      });
      return;
    }
    const header = [
      this.translate.instant('INVOICE.ROW'),
      this.translate.instant('INVOICE.REF_NO'),
      this.translate.instant('INVOICE.CUSTOMER'),
      this.translate.instant('INVOICE.INVOICE_DATE'),
      this.translate.instant('INVOICE.ITEM'),
      this.translate.instant('INVOICE.QUANTITY'),
      this.translate.instant('INVOICE.PRICE'),
      this.translate.instant('INVOICE.ERROR_CODE'),
      this.translate.instant('INVOICE.REASON'),
    ];
    const rows: any[] = [header];
    this.ignoredInvoices.forEach((ig) => {
      let inv = this.lastParsedInvoices.find(
        (p) =>
          p.refNo === ig.refNo &&
          p.customerName === ig.customerName &&
          p.dateStr === ig.invoiceDate
      );
      if (!inv) {
        inv = this.lastParsedInvoices.find((p) => p.refNo === ig.refNo);
      }
      if (inv && inv.items.length) {
        inv.items.forEach((it, idx) => {
          rows.push([
            idx === 0 ? ig.row ?? '' : '',
            idx === 0 ? inv.refNo : '',
            idx === 0 ? inv.customerName : '',
            idx === 0 ? inv.dateStr : '',
            it.itemName,
            it.quantity,
            it.price,
            idx === 0 ? ig.errorCode ?? '' : '',
            idx === 0 ? ig.reason : '',
          ]);
        });
      } else {
        rows.push([
          ig.row ?? '',
          ig.refNo,
          ig.customerName,
          ig.invoiceDate,
          '',
          '',
          '',
          ig.errorCode ?? '',
          ig.reason,
        ]);
      }
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.translate.instant('INVOICE.IMPORT_ERROR_DETAILS_TITLE'));
    XLSX.writeFile(wb, 'IgnoredInvoices.xlsx');
  }

  approveNeedCheckInvoice(inv: any) {
    if (!inv.invoiceNo) {
      if (!this.lastInvoiceNoUsed) {
        this.lastInvoiceNoUsed = 'Inv-0';
      }
      inv.invoiceNo = this.incrementInvoiceNo(this.lastInvoiceNoUsed);
      this.lastInvoiceNoUsed = inv.invoiceNo;
    }
    const payload = {
      ...inv,
      issueDate: formatDateToUTCString(inv.issueDate),
      dueDate: formatDateToUTCString(inv.dueDate),
    };
    this.processingUpload = true;
    this.salesInvoiceService.createInvoice(payload).subscribe({
      next: () => {
        this.createdCount = this.createdCount + 1;
      },
      error: (err) => {
        const msg =
          (err && (err.error?.message || err.message || err.statusText)) ||
          'API error';
        this.ignoredInvoices = [
          ...this.ignoredInvoices,
          {
            refNo: inv.parsedRefNo || inv.invoiceNo,
            customerName: inv.parsedCustomerName || inv.customerProfileName,
            invoiceDate: inv.parsedDateStr || String(inv.issueDate),
            reason: msg,
          },
        ];
      },
      complete: () => {
        this.needCheckInvoices = this.needCheckInvoices.filter(
          (n) => n !== inv
        );
        this.processingUpload = false;
        this.cdr.detectChanges();
      },
    });
  }

  approveAllNeedCheckInvoices() {
    const list = [...this.needCheckInvoices];
    if (!list.length) return;
    const processNext = (i: number) => {
      if (i >= list.length) {
        return;
      }
      const inv = list[i];
      if (!inv.invoiceNo) {
        if (!this.lastInvoiceNoUsed) {
          this.lastInvoiceNoUsed = 'Inv-0';
        }
        inv.invoiceNo = this.incrementInvoiceNo(this.lastInvoiceNoUsed);
        this.lastInvoiceNoUsed = inv.invoiceNo;
      }
      const payload = {
        ...inv,
        issueDate: formatDateToUTCString(inv.issueDate),
        dueDate: formatDateToUTCString(inv.dueDate),
      };
      this.processingUpload = true;
      this.salesInvoiceService.createInvoice(payload).subscribe({
        next: () => {
          this.createdCount = this.createdCount + 1;
        },
        error: (err) => {
          const msg =
            (err && (err.error?.message || err.message || err.statusText)) ||
            'API error';
          this.ignoredInvoices = [
            ...this.ignoredInvoices,
            {
              refNo: inv.parsedRefNo || inv.invoiceNo,
              customerName: inv.parsedCustomerName || inv.customerProfileName,
              invoiceDate: inv.parsedDateStr || String(inv.issueDate),
              reason: msg,
            },
          ];
        },
        complete: () => {
          this.needCheckInvoices = this.needCheckInvoices.filter(
            (n) => n !== inv
          );
          this.processingUpload = false;
          this.cdr.detectChanges();
          processNext(i + 1);
        },
      });
    };
    processNext(0);
  }

  private detectDuplicateInvoices(invoices: any[]) {
    const existingMap = new Map<string, { id: number; invoiceNo: string }>();
    (this.invoices || []).forEach((inv) => {
      const dateOnly = inv.issueDate ? new Date(inv.issueDate) : null;
      const dStr = dateOnly
        ? `${dateOnly.getFullYear()}-${(dateOnly.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${dateOnly
            .getDate()
            .toString()
            .padStart(2, '0')}`
        : '';
      const customerKey = inv.customerProfile?.id
        ? `ID:${inv.customerProfile.id}`
        : `NAME:${this.normalizeNameForMatch(inv.customerProfileName || '')}`;
      const signature = this.buildItemsSignature(
        inv.saleItems?.map((si) => ({
          mainSalesClassId: si.mainSalesClass?.id,
          quantity: si.quantity,
          price: si.price,
        })) || []
      );
      const key = this.normalizeDuplicateKey(
        `${customerKey}|${dStr}|${signature}`
      );
      if (!existingMap.has(key))
        existingMap.set(key, { id: inv.id, invoiceNo: inv.invoiceNo });
    });
    const nonDuplicates: any[] = [];
    const duplicates: any[] = [];
    invoices.forEach((inv) => {
      const d =
        inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      const dStr = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      const customerKey = inv.customerProfileId
        ? `ID:${inv.customerProfileId}`
        : `NAME:${this.normalizeNameForMatch(inv.customerProfileName || '')}`;
      const signature = this.buildItemsSignature(
        inv.saleItems.map((si) => ({
          mainSalesClassId: si.mainSalesClassId,
          quantity: si.quantity,
          price: si.price,
        }))
      );
      const key = this.normalizeDuplicateKey(
        `${customerKey}|${dStr}|${signature}`
      );
      if (existingMap.has(key)) {
        const meta = existingMap.get(key);
        duplicates.push({
          ...inv,
          duplicateKey: key,
          existingInvoiceId: meta.id,
          existingInvoiceNo: meta.invoiceNo,
        });
      } else {
        nonDuplicates.push(inv);
      }
    });
    return { nonDuplicates, duplicates };
  }

  private buildItemsSignature(items: any[]) {
    const parts = items
      .map((i) => `${i.mainSalesClassId || ''}:${i.quantity}:${i.price}`)
      .sort();
    return parts.join(';');
  }

  private normalizeDuplicateKey(v: string) {
    return v.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private findMainSalesClassByName(name: string) {
    if (!name) return null;
    const target = this.normalizeNameForMatch(name);
    return this.mainSalesClasses.find((cls) => {
      const en = cls.englishName
        ? this.normalizeNameForMatch(cls.englishName)
        : null;
      const ar = cls.arabicName
        ? this.normalizeNameForMatch(cls.arabicName)
        : null;
      return en === target || ar === target;
    });
  }

  private normalizeNameForMatch(v: string) {
    return v ? v.trim().toLowerCase().replace(/\s+/g, ' ') : '';
  }

  private normalizeHeaderForImport(v: string): string {
    return this.normalizeNameForMatch(v).replace(/[^\w\u0600-\u06FF ]/g, '');
  }

  private findImportColIndex(headers: string[], aliases: string[]): number {
    for (const alias of aliases) {
      const normalizedAlias = this.normalizeHeaderForImport(alias);
      const idx = headers.findIndex((h) => h === normalizedAlias);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  private findCustomerByName(name: string) {
    if (!name) return null;
    const target = this.normalizeNameForMatch(name);
    // exact match on normalized english or arabic names
    let found = this.customers.find((c) => {
      const en = c.englishName ? this.normalizeNameForMatch(c.englishName) : '';
      const ar = c.arabicName ? this.normalizeNameForMatch(c.arabicName) : '';
      return en === target || ar === target;
    });
    if (found) return found;
    // contains fallback (normalized)
    found = this.customers.find((c) => {
      const en = c.englishName ? this.normalizeNameForMatch(c.englishName) : '';
      const ar = c.arabicName ? this.normalizeNameForMatch(c.arabicName) : '';
      return (en && en.includes(target)) || (ar && ar.includes(target));
    });
    return found || null;
  }

  private toNumber(v: any) {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  private normalizeDate(cell: any): string {
    // Excel serial date
    if (typeof cell === 'number') {
      const date = XLSX.SSF.parse_date_code(cell);
      if (date) {
        return `${date.d.toString().padStart(2, '0')}/${date.m
          .toString()
          .padStart(2, '0')}/${date.y}`;
      }
    }
    return String(cell).trim();
  }

  private parseDateStringToDate(str: string): Date {
    // try dd/MM/yyyy via parseDateOnly
    if (/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(str)) {
      return parseDateOnly(str);
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    return new Date();
  }

  private round(v: number) {
    return Math.round(v * 100) / 100;
  }
  @ViewChild('opInvoice') opInvoice!: OverlayPanel;
  selectedInvoice: any;

  openOverlayInvoice(event: MouseEvent, entry: any) {
    event.preventDefault();
    const isVisible = this.opInvoice.overlayVisible;
    const isDifferent = this.selectedInvoice?.id !== entry.id;
    this.selectedInvoice = entry;
    if (isVisible && isDifferent) {
      this.opInvoice.show(event);
    } else {
      this.opInvoice.toggle(event);
    }
    // خليه يظهر عند الماوس
    setTimeout(() => {
      const panelEl = this.opInvoice.container as HTMLElement;
      if (panelEl) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 10; // 10px margin
        }
        if (left < 10) {
          left = 10;
        }

        if (top + panelRect.height > viewportHeight) {
          top = viewportHeight - panelRect.height - 10; // 10px margin
        }
        if (top < 10) {
          top = 10;
        }

        const buttonRect = (
          event.target as HTMLElement
        ).getBoundingClientRect();
        left = buttonRect.left;
        top = buttonRect.bottom + 5;

        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 10;
        }
        if (top + panelRect.height > viewportHeight) {
          top = buttonRect.top - panelRect.height - 5;
        }

        panelEl.style.position = 'fixed';
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        panelEl.style.zIndex = '9999';
      }
    });
  }
}
