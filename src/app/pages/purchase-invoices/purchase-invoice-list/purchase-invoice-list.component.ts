import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  effect,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { SharedModule } from '../../../_metronic/shared/shared.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { PurchaseInvoice } from 'src/app/models/purchaseInvoice/purchaseInvoice';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { TranslationService } from 'src/app/modules/i18n';
import { SalesInvoice } from '../../../models/salesInvoice/salesInvoice';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../../config/permissions';
import { InputNumberModule } from 'primeng/inputnumber';
import { SliderModule } from 'primeng/slider';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MessageService, PrimeNGConfig } from 'primeng/api';
import primengArTranslations from '../../../utils/primengArTranslations';
import { ToastModule } from 'primeng/toast';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
  matchModeOptions?: { label: string; value: string }[];
}
@Component({
  selector: 'app-purchase-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    RadioButtonModule,
    SharedModule,
    TranslateModule,
    PrintDocumentComponent,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    OverlayPanelModule,
    DropdownModule,
    CalendarModule,
    InputNumberModule,
    SliderModule,
    FormatDecimalPipe,
    CustomDatePipe,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './purchase-invoice-list.component.html',
  styleUrl: './purchase-invoice-list.component.scss',
})
export class PurchaseInvoiceListComponent implements OnInit {
  rows = 10;               // عدد العناصر الافتراضي في أول صفحة
  pageNumber = 1;          // رقم الصفحة (1-based)
  totalRecords = 0;        // هيتم تحديثه بعد أول طلب من السيرفر
  
  rowsPerPageOptions: number[] = [];   // هنا هنحط [1..totalRecords]
  
  // دالة توليد خيارات عدد الصفوف من 1 إلى إجمالي السجلات
  private buildRowsPerPageOptions(total: number): void {
    const t = Math.max(total, 1); // لو 0 خليه 1 عشان الdropdown يشتغل
    this.rowsPerPageOptions = Array.from({ length: t }, (_, i) => i + 1);
  
    // لو الrows الحالي أكبر من الإجمالي، نزبطه
    if (this.rows > t) {
      this.rows = t;
    }
  }
  @ViewChild('printComponent', { static: false })
  printComponent: PrintDocumentComponent;
  invoicesSignal = signal<PurchaseInvoice[]>([]);
  get invoices() {
    return this.invoicesSignal();
  }
  set invoices(value: PurchaseInvoice[]) {
    this.invoicesSignal.set(value);
  }

  // Cache for quotation invoice numbers to avoid repeated API calls
  private quotationInvoiceNoCache = new Map<number, string>();

  invoiceSignal = signal<PurchaseInvoice>(null);
  get invoice() {
    return this.invoiceSignal();
  }
  set invoice(value: PurchaseInvoice) {
    this.invoiceSignal.set(value);
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

  docDataSignal = signal<any>(null);
  get docData(): any {
    return this.docDataSignal();
  }
  set docData(value: any) {
    this.docDataSignal.set(value);
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

  private sortList(items: any[], field: string, order: number): any[] {
    if (!items?.length || !field) return items || [];
    const sorted = [...items].sort((a, b) => {
      let v1: any = a[field];
      let v2: any = b[field];
      if (field === 'invoiceNo') {
        v1 = this.extractInvoiceNumber(v1);
        v2 = this.extractInvoiceNumber(v2);
      }
      if (v1 == null && v2 == null) return 0;
      if (v1 == null) return -1;
      if (v2 == null) return 1;
      if (v1 < v2) return -1;
      if (v1 > v2) return 1;
      return 0;
    });
    return (order || 1) > 0 ? sorted : sorted.reverse();
  }

  extractInvoiceNumber(invoiceNo: string): number {
    if (!invoiceNo) return 0;
    const parts = invoiceNo.split('-');
    return parts.length > 1 ? parseInt(parts[1], 10) : 0;
  }

  transactionsFilterTypeSignal = signal<string>('all');
  get transactionsFilterType() {
    return this.transactionsFilterTypeSignal();
  }
  set transactionsFilterType(value: string) {
    this.transactionsFilterTypeSignal.set(value);
  }

  filteredInvoicesSignal = signal<PurchaseInvoice[]>([]);

  get filteredInvoices() {
    return this.filteredInvoicesSignal();
  }
  set filteredInvoices(value: PurchaseInvoice[]) {
    this.filteredInvoicesSignal.set(value);
  }
  columns!: Column[];

  selectedInvoices: any[] = [];
  isOpen: { [key: string]: boolean } = {};

  searchText: string = ''; // Search text entered by the user
  activeLanguage: string; // Language setting
  translate: TranslateService;

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  constructor(
    private companyDataService: CompanyDetailsService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierDetailsService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;
    this.isFrontal = this.router.url.includes('frontal');
    this.columns = [
      {
        field: 'invoiceNo',
        header: this.translate.instant('INVOICE.INVOICENO'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'supplierDetailsName',
        header: this.translate.instant('INVOICE.SUPPLIERNAME'),
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
        field: 'issueDate',
        header: this.translate.instant('INVOICE.ISSUE_DATE'),
        filter: true,
        filterType: 'date',
      },
      {
        field: 'totalAmount',
        header: this.translate.instant('INVOICE.TOTAL'),
        filter: true,
        filterType: 'numeric',
        matchModeOptions: [
          {
            label: this.activeLanguage === 'ar' ? 'يساوي' : 'Equals',
            value: 'equals',
          },
          {
            label: this.activeLanguage === 'ar' ? 'لا يساوي' : 'Not Equals',
            value: 'notEquals',
          },
          {
            label: this.activeLanguage === 'ar' ? 'أقل من' : 'Less Than',
            value: 'lt',
          },
          {
            label:
              this.activeLanguage === 'ar'
                ? 'أقل من أو يساوي'
                : 'Less Than or Equal To',
            value: 'lte',
          },
          {
            label: this.activeLanguage === 'ar' ? 'أكبر من' : 'Greater Than',
            value: 'gt',
          },
          {
            label:
              this.activeLanguage === 'ar'
                ? 'أكبر من أو يساوي'
                : 'Greater Than or Equal To',
            value: 'gte',
          },
        ],
      },
      {
        field: 'totalAmountAfterTax',
        header: this.translate.instant('INVOICE.TOTALWITHTAX'),
        filter: true,
        filterType: 'numeric',
        matchModeOptions: [
          {
            label: this.activeLanguage === 'ar' ? 'يساوي' : 'Equals',
            value: 'equals',
          },
          {
            label: this.activeLanguage === 'ar' ? 'لا يساوي' : 'Not Equals',
            value: 'notEquals',
          },
          {
            label: this.activeLanguage === 'ar' ? 'أقل من' : 'Less Than',
            value: 'lt',
          },
          {
            label:
              this.activeLanguage === 'ar'
                ? 'أقل من أو يساوي'
                : 'Less Than or Equal To',
            value: 'lte',
          },
          {
            label: this.activeLanguage === 'ar' ? 'أكبر من' : 'Greater Than',
            value: 'gt',
          },
          {
            label:
              this.activeLanguage === 'ar'
                ? 'أكبر من أو يساوي'
                : 'Greater Than or Equal To',
            value: 'gte',
          },
        ],
      },
    ];

    this.docColumns = [
      { field: 'mainPurchaseClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO"), cellClass: 'text-center' },
      { field: 'mainPurchaseClassName', label: this.translate.instant("INVOICE.ITEMNAME"), width: '220px', cellClass: 'small-text', headerClass: 'small-header' },
      { field: 'storeDetailsName', label: this.translate.instant("INVOICE.INVENTORY"), width: '80px', cellClass: 'text-center' },
      { field: 'mainPurchaseClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT"), cellClass: 'text-center' },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE") , pipe: 'number'},
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number', width: '90px' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL"), pipe: 'number' },
    ];

    effect(
      () => {
        this.filterInvoices(this.transactionsFilterTypeSignal());
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // Load all invoices on component initialization
    this.loadInvoices();
    this.cdr.detectChanges();

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // Fetch company details
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        this.companyDetails = companyData[0];
      },
      error: (error) => {
        console.error('Error fetching company details:', error);
      },
    });
  }
  onTableLazyLoad(e: any) {
    const first = e.first ?? 0;
    const rows = e.rows ?? this.rows;
    const sortField = e.sortField ?? 'issueDate';
    const sortOrder = e.sortOrder ?? -1;
    const filters = e.filters ?? {};
    const globalFilter = this.searchValueSignal(); // البحث العام

    this.rows = rows;
    this.pageNumber = Math.floor(first / rows) + 1; // 1-based

    this.loadInvoices(this.pageNumber, this.rows, sortField, sortOrder, filters, globalFilter);
  }

  // دعم الباجينشن + السورت + الفلاتر
 // دعم الباجينشن + السورت + الفلاتر + البحث
loadInvoices(
  page: number = this.pageNumber,
  size: number = this.rows,
  sortField: string = 'issueDate',
  sortOrder: number = -1,
  filters: any = {},
  globalFilter: string = ''
): void {
  this.loading = true;

  if (this.isFrontal) {
    // 💡 فرونتال: بنجيب الكل مرة واحدة ونعمل فلترة وباجينشن على الفرونت
    this.purchaseInvoiceService.getAllFrontalInvoices().subscribe({
      next: (invoices) => {
        let list = invoices ?? [];

        // 🔍 لو فيه بحث عام - فلترة على الفرونت
        if (globalFilter && globalFilter.trim()) {
          const term = globalFilter.trim().toLowerCase();

          list = list.filter((inv: any) =>
            containsStringInObject(inv, term)
          );
        }

        this.totalRecords = list.length;
        this.buildRowsPerPageOptions(this.totalRecords);

        this.pageNumber = page;
        this.rows = size;

        const mapped = list.map((invoice) => {
          const totalAmount =
            Math.round(
              invoice.purchaseItems.reduce(
                (total, item) => total + item.price * item.quantity,
                0
              ) * 100
            ) / 100;

          // Handle both camelCase and PascalCase (API may return either)
          const originalQuotationNo = invoice.originalQuotationNo || (invoice as any).OriginalQuotationNo;
          const purchaseQuotationId = invoice.purchaseQuotationId || (invoice as any).PurchaseQuotationId;

          return {
            ...invoice,
            originalQuotationNo: originalQuotationNo, // Ensure it's preserved in camelCase
            purchaseQuotationId: purchaseQuotationId, // Preserve the quotation ID for navigation
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
            totalAmount: totalAmount,
            totalAmountAfterTax:
              invoice.taxAmount > 0
                ? totalAmount + Math.round(totalAmount * 0.15 * 100) / 100
                : totalAmount,
            supplierDetailsName:
              this.activeLanguage == 'en'
                ? invoice.supplierDetails?.englishName
                : invoice.supplierDetails?.arabicName,
            quotationNo: originalQuotationNo || null, // Will be populated by fetchQuotationInvoiceNumbers
          } as any;
        });

        // Sort client-side by date (fallback) then slice for pagination
        const sorted = this.sortList(mapped, sortField, sortOrder);
        const start = (page - 1) * size;
        const end = start + size;
        
        // Fetch quotation invoice numbers before setting invoices
        this.fetchQuotationInvoiceNumbers(sorted.slice(start, end)).then((invoicesWithQuotations) => {
          this.invoices = invoicesWithQuotations;
          this.filteredInvoices = this.invoices;
          this.loading = false;
          this.cdr.detectChanges();
        }).catch((error) => {
          console.error('Error fetching quotation numbers:', error);
          this.invoices = sorted.slice(start, end);
          this.filteredInvoices = this.invoices;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },

      error: (err) => {
        console.error('Error loading frontal invoices', err);
        this.loading = false;
      },
    });
  } else {
    // 🟢 عادي: بنستخدم الباجينشن من السيرفر + globalFilter
    this.purchaseInvoiceService
      .getPagedInvoices(page, size, sortField, sortOrder, filters, globalFilter)
      .subscribe({
        next: ({ invoices, totalRecords }) => {
          this.totalRecords = totalRecords ?? 0;
          this.buildRowsPerPageOptions(this.totalRecords);

          this.pageNumber = page;
          // لو totalRecords أقل من size، نخلي rows = totalRecords بس ما تكونش 0
          this.rows =
            this.totalRecords === 0
              ? size
              : Math.min(size, this.totalRecords);

          const list = invoices || [];

          const mapped = list.map((invoice) => {
            const totalAmount =
              Math.round(
                (invoice.purchaseItems || []).reduce(
                  (total, item) => total + item.price * item.quantity,
                  0
                ) * 100
              ) / 100;

            // Handle both camelCase and PascalCase (API may return either)
            const originalQuotationNo = invoice.originalQuotationNo || (invoice as any).OriginalQuotationNo;
            const purchaseQuotationId = invoice.purchaseQuotationId || (invoice as any).PurchaseQuotationId;

            return {
              ...invoice,
              originalQuotationNo: originalQuotationNo, // Ensure it's preserved in camelCase
              purchaseQuotationId: purchaseQuotationId, // Preserve the quotation ID for navigation
              issueDate: new Date(invoice.issueDate),
              dueDate: new Date(invoice.dueDate),
              totalAmount,
              totalAmountAfterTax:
                invoice.taxAmount > 0
                  ? totalAmount +
                    Math.round(totalAmount * 0.15 * 100) / 100
                  : totalAmount,
              supplierDetailsName:
                this.activeLanguage == 'en'
                  ? invoice.supplierDetails?.englishName
                  : invoice.supplierDetails?.arabicName,
              quotationNo: originalQuotationNo || null, // Will be populated by fetchQuotationInvoiceNumbers
            } as any;
          });

          const sorted = this.sortList(mapped, sortField, sortOrder);
          
          // Fetch quotation invoice numbers before setting invoices
          this.fetchQuotationInvoiceNumbers(sorted).then((invoicesWithQuotations) => {
            this.invoices = invoicesWithQuotations;
            this.filteredInvoices = invoicesWithQuotations;
            this.loading = false;
            this.cdr.detectChanges();
          }).catch((error) => {
            console.error('Error fetching quotation numbers:', error);
            this.invoices = sorted;
            this.filteredInvoices = sorted;
            this.loading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error loading paged invoices', err);
          this.loading = false;
        },
      });
  }
}


  // Method to filter invoices based on the search input
  filterInvoices(transactionsFilterType: string): void {
    if (transactionsFilterType === 'all') {
      this.filteredInvoices = this.invoices;
    } else if (transactionsFilterType === 'connected') {
      this.filteredInvoices = this.invoices.filter(
        (invoice) => invoice.transactionId !== null
      );
    } else if (transactionsFilterType === 'notconnected') {
      this.filteredInvoices = this.invoices.filter(
        (invoice) => invoice.transactionId === null
      );
    }
  }

  deleteInvoice(id?: number): void {
    if (id) {
      this.purchaseInvoiceService.deleteInvoice(id).subscribe({
        next: () => {
          if (this.opInvoice?.overlayVisible) {
            this.opInvoice.hide();
          }
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('INVOICE.SUCCESS'),
            detail: this.translate.instant('INVOICE.INVOICE_DELETED_SUCCESS'),
          });
          this.loadInvoices();
        },
        error: (err) => {
          console.log('Error deleting invoice:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('INVOICE.ERROR'),
            detail: this.translate.instant('INVOICE.INVOICE_DELETE_ERROR'),
          });
        },
      });
    }
  }

  viewInvoice(id?: number): void {
    // Always enable navigation mode when viewing an invoice
    this.router.navigate(['/purchase-invoices', id], {
      queryParams: { navigationMode: 'true' }
    });
  }

  openViewDialog(): void {
    // Navigate to first invoice with navigation mode enabled
    if (this.filteredInvoices.length > 0) {
      const firstInvoiceId = this.filteredInvoices[0].id;
      this.router.navigate(['/purchase-invoices', firstInvoiceId], {
        queryParams: { navigationMode: 'true' }
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('INVOICE.WARNING'),
        detail: this.translate.instant('INVOICE.NO_INVOICES')
      });
    }
  }

  editInvoice(id?: number): void {
    if (id) {
      if (this.isFrontal) {
        this.router.navigate(['/purchase-invoices/frontal-edit', id]);
      } else {
        this.router.navigate(['/purchase-invoices/edit', id]);
      }
    }
  }
  copyInvoice(id?: number): void {
    if (!id) return;
    // اقفل الـ Overlay بعد ما تختار النسخ
    this.opInvoice?.hide();

    // اختار مسار صفحة الإنشاء بناءً على حالة frontal
    const route = this.isFrontal
      ? '/purchase-invoices/frontal-new'
      : '/purchase-invoices/new';

    // روح لصفحة الإنشاء ومعاك copyId كـ query param
    this.router.navigate([route], { queryParams: { copyId: id } });
  }

  addInvoice() {
    if (this.isFrontal) {
      this.router.navigate(['/purchase-invoices/frontal-new']);
    } else {
      this.router.navigate(['/purchase-invoices/new']);
    }
  }

  loadingStates: { [id: number]: boolean } = {}; // Track loading states by invoice ID

  createTransaction(id: number) {
    this.loadingStates[id] = true;

    this.purchaseInvoiceService.createInvoiceTransaction(id).subscribe({
      next: () => {
        this.loadInvoices();
      },
      error: () => {
        alert(
          this.translate.instant('INVOICE.CHECK_ACCOUNTS_PURCHASE_INVOICE')
        );
      },
      complete: () => {
        // Set the loading state to false after the request finishes
        this.loadingStates[id] = false;
      },
    });
  }
  loading: boolean = true;
  searchValueSignal = signal('');
get searchValue() {
  return this.searchValueSignal();
}

set searchValue(value: string) {
  this.searchValueSignal.set(value);

  // لما البحث يتغيّر، نرجّع لأول صفحة
  this.pageNumber = 1;

  // نمرّر قيمة البحث كـ globalFilter
  this.loadInvoices(
    1,                // الصفحة الأولى
    this.rows,        // عدد الصفوف الحالي
    'invoiceNo',      // تقدر تغيره لو عايز سورت افتراضي تاني
    1,                // sortOrder (تصاعدي)
    {},               // filters الخاصة بالأعمدة (لو حبيت تستخدمها بعدين)
    value.trim()      // 🟢 ده اللي هيوصل للسيرفر / يتطبق في الفرونتال
  );
}
  

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value.trim(), 'contains');
  }

  printInvoice(invoiceId: number): void {
    this.loading = true;

    this.purchaseInvoiceService
      .getInvoiceById(invoiceId)
      .subscribe((invoiceData) => {
        this.docData = invoiceData.purchaseItems.map((item) => ({
          ...item,
          mainPurchaseClassReferenceCode: item.mainPurchaseClass.referenceCode,
          mainPurchaseClassName:
            this.activeLanguage == 'en'
              ? item.mainPurchaseClass.englishName
              : item.mainPurchaseClass.arabicName,
          mainPurchaseClasMeasurementUnitName:
            this.activeLanguage == 'en'
              ? item.mainPurchaseClass.measurementUnit.englishName
              : item.mainPurchaseClass.measurementUnit.arabicName,
          storeDetailsName:
            this.activeLanguage == 'en'
              ? item.storeDetails.englishName
              : item.storeDetails.arabicName,
          totalPreTax: item.quantity * item.price,
        }));

        console.log(this.docData);

        this.invoice = invoiceData;
        this.getTaxAmount();
        this.getNetPrice();

        // Ensure the DOM is updated before printing
        this.cdr.detectChanges();
        setTimeout(() => {
          this.printComponent.triggerPrint();
          this.loading = false;
          this.cdr.detectChanges();
        }, 0); // Allow DOM updates to complete
      });
  }

  generatePrintContent(): string {
    const printingSection = document.getElementById('printSection');
    if (!printingSection) {
      console.error('Element with ID "printContent" not found.');
      return '';
    }

    const printContent = printingSection.innerHTML;
    const originalContents = document.body.innerHTML;
    console.log(
      Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
    );
    const stylesheetLink = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"]')
    )
      .map((link: any) => `<link href="${link.href}" rel="stylesheet">`)
      .join('');
    if (this.activeLanguage === 'ar') {
      document.body.dir = 'rtl'; // Set direction to RTL if language is Arabic
    }
    const newDocument =
      document.implementation.createHTMLDocument('Print Document');
    newDocument.write(document.documentElement.outerHTML);
    newDocument.close();
    newDocument.body.innerHTML = printContent || '';
    newDocument.head.innerHTML = stylesheetLink;

    return newDocument.documentElement.outerHTML;
  }

  deleteAll(): void {
    // Logic to delete all selected invoices
    this.selectedInvoices.forEach((invoice) => {
      this.deleteInvoice(invoice.id);
    });
    this.selectedInvoices = [];
  }

  createTransactionForAll(): void {
    // Logic to create transactions for all selected invoices
    this.selectedInvoices.forEach((invoice) => {
      this.createTransaction(invoice?.id);
    });
  }

  getTaxAmount() {
    if (this.invoice.taxAmount == 0) return 0;

    return (
      Math.round(
        this.invoice.purchaseItems.reduce(
          (total, item) => total + item.price * item.quantity * 0.15,
          0
        ) * 100
      ) / 100
    );
  }

  getNetPrice() {
    // calculate from items

    return (
      Math.round(
        this.invoice.purchaseItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        ) * 100
      ) / 100
    );
  }

  getTotalPrice() {
    // calculate from items
    return (
      Math.round(this.getNetPrice() * 100) / 100 +
      Math.round(this.getTaxAmount() * 100) / 100
    );
  }

  makeFrontal(invoice: PurchaseInvoice): void {
    this.purchaseInvoiceService.makeFrontal(invoice.id.toString()).subscribe({
      next: (data) => {
        this.loadInvoices();
      },
      error: (err) => {
        console.error('Error making invoice frontal:', err);
      },
    });
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
      return 'حالة الواجهة الأمامية';
    } else {
      return 'Frontal Status';
    }
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

  /**
   * Navigate to the quotation view page
   * @param purchaseQuotationId - The ID of the purchase quotation
   * @param event - Mouse event to stop propagation
   */
  navigateToQuotation(purchaseQuotationId: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent row click event
    }
    
    if (purchaseQuotationId) {
      this.router.navigate(['/purchase-invoices/request-quotation/view', purchaseQuotationId]);
    }
  }

  /**
   * Get the tooltip text for quotation badge in the correct language
   * @param quotationNo - The quotation number to display
   * @returns Localized tooltip text
   */
  getQuotationBadgeTooltip(quotationNo: string): string {
    if (this.activeLanguage === 'ar') {
      return `تم إنشاء هذه الفاتورة من طلب عرض سعر ${quotationNo}`;
    } else {
      return `This invoice was created from quotation ${quotationNo}`;
    }
  }

  /**
   * Handle keyboard events for quotation badge accessibility
   * @param purchaseQuotationId - The ID of the purchase quotation
   * @param event - Keyboard event
   */
  onQuotationBadgeKeydown(purchaseQuotationId: number, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.navigateToQuotation(purchaseQuotationId);
    }
  }

  /**
   * Fetch quotation invoice numbers for all invoices with purchaseQuotationId
   * This is called after invoices are loaded to populate the quotationNo field
   */
  private async fetchQuotationInvoiceNumbers(invoices: any[]): Promise<any[]> {
    const invoicesWithQuotations = invoices.filter(inv => inv.purchaseQuotationId && !inv.quotationNo);
    
    if (invoicesWithQuotations.length === 0) {
      return invoices;
    }

    // Fetch quotation details for invoices that need them
    const fetchPromises = invoicesWithQuotations.map(async (invoice) => {
      const quotationId = invoice.purchaseQuotationId;
      
      // Check cache first
      if (this.quotationInvoiceNoCache.has(quotationId)) {
        invoice.quotationNo = this.quotationInvoiceNoCache.get(quotationId);
        return;
      }

      // Fetch from API
      try {
        const quotation = await this.purchaseInvoiceService.getQuotationById(quotationId).toPromise();
        const invoiceNo = quotation?.invoiceNo || `#${quotationId}`;
        
        // Cache the result
        this.quotationInvoiceNoCache.set(quotationId, invoiceNo);
        invoice.quotationNo = invoiceNo;
      } catch (error) {
        console.error(`Error fetching quotation ${quotationId}:`, error);
        // Fallback to ID if fetch fails
        invoice.quotationNo = `#${quotationId}`;
      }
    });

    await Promise.all(fetchPromises);
    return invoices;
  }
}

function containsStringInObject(obj: any, searchString: string): boolean {
  if (!obj || typeof obj !== 'object') return false; // Ensure obj is valid
  return Object.values(obj).some(
    (value) =>
      typeof value === 'string' && value.toLowerCase().includes(searchString)
  );
}

