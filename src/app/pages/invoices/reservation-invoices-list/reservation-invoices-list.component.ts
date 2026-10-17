import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  LOCALE_ID,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../_metronic/shared/shared.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from 'src/app/modules/i18n';
import { ReservationService } from 'src/app/services/reservations/reservation.service';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { ReservationCompanyService } from 'src/app/services/reservations/reservation-company.service';
import { ReservationModel } from 'src/app/models/accounting/reservation-model';
import { forkJoin, of, firstValueFrom, from } from 'rxjs';
import { finalize, take, catchError, concatMap, reduce } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { AuthService } from 'src/app/modules/auth';
import { PERMISSIONS } from 'src/app/config/permissions';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import { ReservationMealService } from 'src/app/services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import { ReservationSupplierService } from 'src/app/services/ReservationSupplier/reservation-supplier.service';
import { QRCodeModule } from 'angularx-qrcode';
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { InvoiceShareModalComponent } from '../../../shared-components/invoice-share-modal/invoice-share-modal.component';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-invoices-list',
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
    FormatDecimalPipe,
    ConfirmDialogModule,
    DialogModule,
    ToastModule,
    CustomDatePipe,
    TabViewModule,
    ReactiveFormsModule,
    QRCodeModule,
    InvoiceShareModalComponent,
  ],
  templateUrl: './reservation-invoices-list.component.html',
  styleUrl: './reservation-invoices-list.component.scss',
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class ReservationInvoicesListComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;

  @ViewChild('printComponent', { static: false })
  printComponent: PrintDocumentComponent;
  @ViewChild('printComponent3', { static: false })
  printComponent3: PrintDocumentComponent;

  transactionsFilterTypeSignal = signal<string>('all');
  get transactionsFilterType() {
    return this.transactionsFilterTypeSignal();
  }
  set transactionsFilterType(value: string) {
    this.transactionsFilterTypeSignal.set(value);
  }

  zatcaFilterSignal = signal<'all' | 'sent' | 'notSent'>('all');
  get zatcaFilter() {
    return this.zatcaFilterSignal();
  }
  set zatcaFilter(value: 'all' | 'sent' | 'notSent') {
    this.zatcaFilterSignal.set(value);
  }

  formatDialogVisible = false;
  selectedBatchFormat: 'format1' | 'format2' | 'format3' = 'format1';
  pendingBatchAction: {
    action: 'printSelected' | 'downloadSelected' | 'downloadMergedSelected' | 'downloadMergedAll' | 'downloadZipAll';
    ids: number[];
  } | null = null;
  batchProcessing = false;
  batchProcessingMessage = '';

  uploadDialogVisibleSignal = signal<boolean>(false);
  get uploadDialogVisible() {
    return this.uploadDialogVisibleSignal();
  }
  set uploadDialogVisible(v: boolean) {
    this.uploadDialogVisibleSignal.set(v);
  }

  processingUpload = false;
  uploadProgress = 0;
  previewInvoices: any[] = [];
  selectedFileName = '';
  selectedImportFile: File | null = null;

  invoicesSignal = signal<SalesInvoice[]>([]);
  get invoices() {
    return this.invoicesSignal();
  }
  set invoices(value: SalesInvoice[]) {
    this.invoicesSignal.set(value);
  }

  totalRecords: number = 0;
  rowsPerPageOptions: number[] = [5, 10, 20, 50, 100];
  pageSize: number = 10;
  currentPage: number = 1;

  invoiceShareForm!: FormGroup;
  invoiceShareDialogVisible = false;
  invoiceShareActiveTabIndex = 0;
  invoiceShareTarget: any | null = null;
  shareBulkMode = false;
  shareBulkIds: number[] = [];
  shareBusy = false;

  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
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

  confirmZatcaSend(): void {
    this.zatcaPreCheckDialogVisible = false;
    const id = this.zatcaPreCheck.invoiceId;
    if (id) this.clearInvoice(id);
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

  invoiceSignal = signal<SalesInvoice>(null);
  get invoice() {
    return this.invoiceSignal();
  }
  set invoice(value: SalesInvoice) {
    this.invoiceSignal.set(value);
  }

  columns!: Column[];
  selectedInvoices: any[] = [];
  searchText: string = '';
  activeLanguage: string;
  translate: TranslateService;
  loading: boolean = true;
  initialLoad: boolean = true;
  zatcaSending: boolean = false;
  zatcaSendingStatus: 'validating' | 'sending' = 'sending';
  searchValueSignal = signal('');
  
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  loadingStates: { [id: number]: boolean } = {};

  // Share dialog properties
  openInvoiceShareDialog(entry: any) {
    this.resetShareState();
    this.shareBulkMode = false;
    this.invoiceShareTarget = entry;
    this.invoiceShareDialogVisible = true;
  }

  closeInvoiceShareDialog() {
    this.invoiceShareDialogVisible = false;
    this.resetShareState();
  }

  private resetShareState() {
    this.shareBusy = false;
    this.shareBulkMode = false;
    this.shareBulkIds = [];
    this.invoiceShareTarget = null;
    this.invoiceShareActiveTabIndex = 0;
    this.resetShareForm();
  }

  private resetShareForm() {
    if (!this.invoiceShareForm) return;
    this.invoiceShareForm.reset({
      email: '',
      whatsappNumber: '',
    });
    this.invoiceShareForm.markAsPristine();
    this.invoiceShareForm.markAsUntouched();
    this.invoiceShareForm.updateValueAndValidity({ emitEvent: false });
    this.invoiceShareForm.enable({ emitEvent: false });
  }

  getInvoiceShareTargetId(): number {
    return Number(this.invoiceShareTarget?.id || 0);
  }

  submitInvoiceShareEmail() {
    const email = (this.invoiceShareForm.get('email')?.value || '').trim();
    if (!email || this.invoiceShareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('COMMON.ERROR'),
        detail: this.translate.instant('INVOICE.SHARE_ENTER_VALID_EMAIL')
      });
      return;
    }

    const invoiceId = this.invoiceShareTarget?.id;
    if (!invoiceId) return;

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    this.salesInvoiceService.shareInvoiceByEmail(Number(invoiceId), email).subscribe({
      next: (res: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: res?.message || this.translate.instant('INVOICE.SHARED_SUCCESSFULLY')
        });
        this.closeInvoiceShareDialog();
      },
      error: (err: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: err?.error?.message || this.translate.instant('INVOICE.SHARE_FAILED')
        });
      }
    });
  }

  submitInvoiceShareWhatsapp() {
    const raw = this.invoiceShareForm.get('whatsappNumber')?.value || '';
    const phone = String(raw).replace(/\D/g, '').trim();

    if (!phone || this.invoiceShareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('COMMON.ERROR'),
        detail: this.translate.instant('INVOICE.SHARE_ENTER_VALID_PHONE')
      });
      return;
    }

    const invoiceId = this.invoiceShareTarget?.id;
    if (!invoiceId) return;

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    this.salesInvoiceService.shareInvoiceByWhatsapp(Number(invoiceId), phone).subscribe({
      next: (res: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: res?.message || this.translate.instant('INVOICE.SHARED_SUCCESSFULLY')
        });
        if (res?.whatsappWebUrl) {
          window.open(res.whatsappWebUrl, '_blank');
        }
        this.closeInvoiceShareDialog();
      },
      error: (err: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: err?.error?.message || this.translate.instant('INVOICE.SHARE_FAILED')
        });
      }
    });
  }

  @ViewChild('opInvoice') opInvoice!: OverlayPanel;
  selectedInvoice: any;

  printOrientationDialogVisible = false;
  pendingInvoiceId: number | null = null;
  pendingIsPrint: boolean = false;
  selectedPrintType: 'A4Portrait' | 'A4Landscape' | 'Thermal80mm' | 'Thermal58mm' = 'A4Portrait';

  descriptionRowsPerPage: number = 8;
  useLandscape: boolean = false;
  sellerName: string = '';

  // Lookup maps for hotels and reservation companies
  hotelsMap = new Map<string, any>();
  reservationCompaniesMap = new Map<string, any>();
  reservationsMap = new Map<string, ReservationModel>();

  roomTypesMap = new Map<string, any>();
  mealsMap = new Map<string, any>();
  viewsMap = new Map<string, any>();
  servicesMap = new Map<string, any>();
  suppliersMap = new Map<string, any>();
  allReservations: ReservationModel[] = [];

  // Print customization panel variables
  selectedPolicies: any[] = [];
  selectedBanks: any[] = [];
  anyPolicyChecked: boolean = false;
  anyBankChecked: boolean = false;

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

  showStampSignal = signal<boolean>(true);
  get showStamp(): boolean {
    return this.showStampSignal();
  }
  set showStamp(value: boolean) {
    this.showStampSignal.set(value);
  }

  constructor(
    private companyDataService: CompanyDetailsService,
    private salesInvoiceService: SalesInvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private reservationCompanyService: ReservationCompanyService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private reservationServiceService: ReservationServiceService,
    private reservationSupplierService: ReservationSupplierService,
    private printSettingsService: PrintSettingsService,
    private authService: AuthService,
    private pdfUtilsService: PdfUtilsService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;
    
    this.invoiceShareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
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

    this.docColumns = [
      {
        field: 'mainSalesClassReferenceCode',
        label: this.translate.instant('INVOICE.ITEMNO'),
      },
      {
        field: 'mainSalesClassName',
        label: this.translate.instant('INVOICE.ITEMNAME'),
      },
      {
        field: 'mainSalesClasMeasurementUnitName',
        label: this.translate.instant('INVOICE.UNIT'),
      },
      {
        field: 'quantity',
        label: this.translate.instant('INVOICE.QUANTITY'),
        pipe: 'number',
      },
      {
        field: 'price',
        label: this.translate.instant('INVOICE.PRICE'),
        pipe: 'number',
      },
      {
        field: 'totalPreTax',
        label: this.translate.instant('INVOICE.TOTAL_PRE_TAX'),
        pipe: 'number',
      },
      {
        field: 'taxAmount',
        label: this.translate.instant('INVOICE.TAX'),
        pipe: 'number',
      },
      {
        field: 'totalPrice',
        label: this.translate.instant('INVOICE.TOTAL'),
        pipe: 'number',
      },
    ];
  }

  ngOnInit(): void {
    setTimeout(() => {
      try {
        const pendingToastStr = sessionStorage.getItem('pendingToastMessage');
        if (pendingToastStr) {
          sessionStorage.removeItem('pendingToastMessage');
          const pendingToast = JSON.parse(pendingToastStr);
          this.messageService.add({
            severity: pendingToast.severity || 'success',
            summary: pendingToast.summary || this.translate.instant('COMMON.SUCCESS'),
            detail: pendingToast.detail,
            life: 5000,
          });
          this.cdr.detectChanges();
        }
      } catch (e) {
        console.error('Error reading pending toast:', e);
      }
    }, 200);

    // تحميل الفواتير مباشرة لتسريع عرض الصفحة
    this.loadInvoicesLazy({ first: 0, rows: this.pageSize });

    forkJoin({
      hotels: this.hotelService.getAll(),
      reservationCompanies: this.reservationCompanyService.getAll(),
      companyData: this.companyDataService.getAll(),
    }).subscribe({
      next: (res) => {
        (res.hotels || []).forEach((hotel: any) => {
          this.hotelsMap.set(String(hotel.id), hotel);
        });
        (res.reservationCompanies || []).forEach((company: any) => {
          this.reservationCompaniesMap.set(String(company.id), company);
        });
        if (res.companyData && res.companyData.length > 0) {
          this.companyDetails = res.companyData[0];

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

          this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
          this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
          this.showStamp = this.printSettingsService.getShowStamp();
        }

        // تحديث أسماء العملاء في الفواتير المحملة مسبقا بعد تحميل الشركات
        // تم الاستغناء عنها لتحسين الأداء، حيث يتم الاعتماد على بيانات العميل من الفاتورة مباشرة
      },
      error: (err) => {
        console.error('Error loading initial data:', err);
      },
    });
  }

  // Get customer name based on reservation type
  getCustomerNameByReservationType(invoice: any): string | null {
    if (!invoice.reservationIds || invoice.reservationIds.length === 0) {
      // No reservation, return null to use fallback
      return null;
    }

    // Get the first reservation ID
    const firstReservationId = invoice.reservationIds[0];
    const reservation = this.reservationsMap.get(firstReservationId);

    if (!reservation) {
      // Reservation not loaded yet, return null to use fallback
      return null;
    }

    // Always prefer reservationClientCompanyId, then reservationCompanyId
    const companyId = reservation.reservationClientCompanyId || reservation.reservationCompanyId;
    if (companyId) {
      const clientCompany = this.reservationCompaniesMap.get(String(companyId));
      if (clientCompany) {
        return this.activeLanguage === 'en' 
          ? clientCompany.englishName 
          : clientCompany.arabicName;
      }
    }

    // Fallback to guest name if no company is found
    if (reservation.guestName) {
        return reservation.guestName;
    }

    // Fallback to null to use customerProfileName
    return null;
  }

  loadInvoicesLazy(event: any) {
    // Prevent double firing if p-table calls onLazyLoad during init after ngOnInit already called it
    if (this.initialLoad && event.first === 0) {
      this.initialLoad = false;
      // It was already loaded in ngOnInit
      if (this.invoices && this.invoices.length > 0) return;
    }

    this.loading = true;

    const pageNumber = Math.floor(event.first / event.rows) + 1;
    const pageSize = event.rows ?? this.pageSize;
    const sortField = event.sortField || 'issueDate';
    const sortOrder = event.sortOrder || -1;

    this.pageSize = pageSize;
    this.currentPage = pageNumber;

    let mappedSortField = 'createdAt';
    if (sortField === 'invoiceNo') {
      mappedSortField = 'invoiceno';
    } else if (sortField === 'issueDate') {
      mappedSortField = 'issuedate';
    } else if (sortField === 'totalAmountAfterTax') {
      mappedSortField = 'totalprice';
    }

    this.salesInvoiceService.getReservationInvoicesPaged(
      pageNumber,
      pageSize,
      2,
      this.searchValue || undefined,
      mappedSortField,
      sortOrder,
      this.mapZatcaFilter(),
      this.mapTransactionFilter()
    ).subscribe({
      next: (invoicesRes) => {
        const rawInvoices = invoicesRes.items || [];
        this.processInvoices(rawInvoices, pageNumber, pageSize, invoicesRes.total);
      },
      error: (err) => {
        console.error('Error loading reservation invoices:', err);
        this.loading = false;
      },
    });
  }

  processInvoices(rawInvoices: any[], pageNumber: number, pageSize: number, total: number) {
    const mapped = rawInvoices.map((invoice: any) => {
      return {
        ...invoice,
        issueDate: new Date(invoice.issueDate),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        totalAmount: invoice.netPrice,
        totalAmountAfterTax: invoice.totalPrice,
        customerProfileName: invoice.customerProfileName || '-',
      };
    });

    this.invoices = mapped;
    this.totalRecords = total || ((pageNumber - 1) * pageSize + this.invoices.length);
    this.loading = false;
  }

  onPageChange(event: any) {
    const newSize = event.rows ?? this.pageSize;
    if (!newSize || newSize <= 0) return;

    this.pageSize = newSize;
    this.loadInvoicesLazy({
      first: event.first ?? 0,
      rows: newSize,
      sortField: 'issueDate',
      sortOrder: -1,
    });
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains');
  }

  deleteInvoice(id?: number): void {
    if (id) {
      this.salesInvoiceService.deleteInvoice(id).subscribe({
        next: () => {
          this.invoices = this.invoices.filter((invoice) => invoice.id !== id);
          
          // Close the overlay panel after successful delete
          if (this.opInvoice) {
            this.opInvoice.hide();
          }
          
          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('COMMON.SUCCESS'),
            detail: this.translate.instant('INVOICE.DELETED_SUCCESSFULLY')
          });
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.log('Error deleting invoice:', err);
          
          // Close overlay even on error
          if (this.opInvoice) {
            this.opInvoice.hide();
          }
          
          // Show error message
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR'),
            detail: this.translate.instant('INVOICE.DELETE_FAILED')
          });
        },
      });
    }
  }

  viewInvoice(id?: number): void {
    if (id) {
      this.loading = true;
      setTimeout(() => {
        this.router.navigate(['/invoices/reservation-details', id]);
        this.loading = false;
      }, 100);
    }
  }

  openTransaction(transactionId: any): void {
    if (!transactionId) return;
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/accounting/journal-transactions/transaction', transactionId])
    );
    window.open(url, '_blank');
  }

  onRowClick(event: Event, invoice: any): void {
    const target = event.target as HTMLElement;
    if (target.closest('.p-checkbox') || 
        target.closest('button') || 
        target.closest('p-button') ||
        target.closest('.pi') ||
        target.tagName.toLowerCase() === 'button') {
      return;
    }
    this.viewInvoice(invoice.id);
  }

  editInvoice(id?: number): void {
    if (id) {
      this.router.navigate(['/invoices/edit', id]);
    }
  }

  createTransaction(id: number) {
    this.loadingStates[id] = true;
    this.salesInvoiceService.createInvoiceTransaction(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
          detail: this.activeLanguage === 'ar' ? 'تم إنشاء القيد المحاسبي بنجاح' : 'Transaction created successfully'
        });
        this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
      },
      error: (err: any) => {
        const detailMsg = typeof err?.error === 'string' && err.error.trim().length > 0 
          ? err.error 
          : (err?.error?.message || this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));

        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'خطأ في إنشاء القيد' : 'Error',
          detail: detailMsg
        });
      },
      complete: () => {
        this.loadingStates[id] = false;
      },
    });
  }

  printInvoice(invoiceId: number): void {
    this.loading = true;
    this.salesInvoiceService.getInvoiceById(invoiceId).subscribe({
      next: (invoiceData) => {
        this.invoice = invoiceData;

        const lookups$ = [
          this.roomTypeService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationMealService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationViewService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationServiceService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationSupplierService.getAll().pipe(take(1), catchError(() => of([])))
        ];

        let reservationRequests$: any;
        if (invoiceData.reservationIds && invoiceData.reservationIds.length > 0) {
          reservationRequests$ = forkJoin(
            invoiceData.reservationIds.map((id: string) =>
              this.reservationService.getById(id).pipe(take(1), catchError(() => of(null)))
            )
          );
        } else {
          reservationRequests$ = of([]);
        }

        forkJoin({ lookups: forkJoin(lookups$), reservations: reservationRequests$ }).subscribe({
          next: ({ lookups, reservations }) => {
            const [roomTypes, meals, views, services, suppliers] = lookups as any[];
            
            this.roomTypesMap.clear();
            this.mealsMap.clear();
            this.viewsMap.clear();
            this.servicesMap.clear();
            this.suppliersMap.clear();

            (roomTypes as any[] || []).forEach(r => this.roomTypesMap.set(String(r.id), r));
            (meals as any[] || []).forEach(m => this.mealsMap.set(String(m.id), m));
            (views as any[] || []).forEach(v => this.viewsMap.set(String(v.id), v));
            (services as any[] || []).forEach(s => this.servicesMap.set(String(s.id), s));
            (suppliers as any[] || []).forEach(s => this.suppliersMap.set(String(s.id), s));

            this.allReservations = [];
            (reservations as any[] || []).forEach((reservation: any) => {
              if (reservation && reservation.id) {
                this.reservationsMap.set(String(reservation.id), reservation);
                this.allReservations.push(reservation);
              }
            });

            this.prepareDocData();
            this.useLandscape = (this.docData?.length || 0) > this.descriptionRowsPerPage;
            this.loading = false;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.printComponent) {
                this.printComponent.triggerPrint();
              } else {
                console.error('PrintComponent is not available after rendering.');
              }
            }, 300);
          },
          error: (err) => {
            console.error('Error fetching print details', err);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error fetching invoice', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  printInvoice3(invoiceId: number): void {
    this.loading = true;
    this.salesInvoiceService.getInvoiceById(invoiceId).subscribe({
      next: (invoiceData) => {
        this.invoice = invoiceData;

        const lookups$ = [
          this.roomTypeService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationMealService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationViewService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationServiceService.getAll().pipe(take(1), catchError(() => of([]))),
          this.reservationSupplierService.getAll().pipe(take(1), catchError(() => of([])))
        ];

        let reservationRequests$: any;
        if (invoiceData.reservationIds && invoiceData.reservationIds.length > 0) {
          reservationRequests$ = forkJoin(
            invoiceData.reservationIds.map((id: string) =>
              this.reservationService.getById(id).pipe(take(1), catchError(() => of(null)))
            )
          );
        } else {
          reservationRequests$ = of([]);
        }

        forkJoin({ lookups: forkJoin(lookups$), reservations: reservationRequests$ }).subscribe({
          next: ({ lookups, reservations }) => {
            const [roomTypes, meals, views, services, suppliers] = lookups as any[];
            
            this.roomTypesMap.clear();
            this.mealsMap.clear();
            this.viewsMap.clear();
            this.servicesMap.clear();
            this.suppliersMap.clear();

            (roomTypes as any[] || []).forEach(r => this.roomTypesMap.set(String(r.id), r));
            (meals as any[] || []).forEach(m => this.mealsMap.set(String(m.id), m));
            (views as any[] || []).forEach(v => this.viewsMap.set(String(v.id), v));
            (services as any[] || []).forEach(s => this.servicesMap.set(String(s.id), s));
            (suppliers as any[] || []).forEach(s => this.suppliersMap.set(String(s.id), s));

            this.allReservations = [];
            (reservations as any[] || []).forEach((reservation: any) => {
              if (reservation && reservation.id) {
                this.reservationsMap.set(String(reservation.id), reservation);
                this.allReservations.push(reservation);
              }
            });

            this.prepareDocData();
            this.loading = false;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.printComponent3) {
                this.printComponent3.triggerPrint();
              }
            }, 300);
          },
          error: (err) => {
            console.error('Error fetching print details', err);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error fetching invoice', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  showPrintOrientationDialog(invoiceId: number, isPrint: boolean) {
    this.pendingInvoiceId = invoiceId;
    this.pendingIsPrint = isPrint;
    this.selectedPrintType = 'A4Portrait';
    this.printOrientationDialogVisible = true;
  }

  confirmPrintOrientation() {
    if (this.pendingInvoiceId !== null) {
      if (this.pendingIsPrint) {
        this.salesInvoiceService.printDocument(this.pendingInvoiceId, this.selectedPrintType);
      } else {
        this.salesInvoiceService.downloadDocument(this.pendingInvoiceId, this.selectedPrintType);
      }
    }
    this.printOrientationDialogVisible = false;
    this.pendingInvoiceId = null;
  }

  printServerInvoice(id: number) {
    if (this.opInvoice) {
      this.opInvoice.hide();
    }
    this.showPrintOrientationDialog(id, true);
  }

  downloadServerInvoice(id: number) {
    if (this.opInvoice) {
      this.opInvoice.hide();
    }
    this.showPrintOrientationDialog(id, false);
  }

  getName(entity: any, nameKey: string = 'name'): string {
    if (!entity) return '-';
    // first try englishName / arabicName conventions
    if (this.activeLanguage === 'en' && entity.englishName) return entity.englishName;
    if (this.activeLanguage !== 'en' && entity.arabicName) return entity.arabicName;

    // fallback to generic name fields
    if (entity.name && typeof entity.name === 'string') return entity.name;
    if (entity[nameKey] && typeof entity[nameKey] === 'string') return entity[nameKey];

    return '-';
  }

  private prepareDocData(): void {
    const items: any[] = [];
  
    // Add room entries
    this.getAllRoomEntries().forEach((entry) => {
      const roomTotalPrice = (entry.numberOfRooms || 0) * (entry.numberOfNights || 1) * (entry.roomRate || 0);
      const vatAmount = this.getVatAmountFromNet(roomTotalPrice);
      const totalWithVat = this.getTotalWithVat(roomTotalPrice);
  
      items.push({
        itemType: this.activeLanguage === 'en' ? 'Room' : 'غرفة',
        itemName: this.getRoomTypeName(entry.roomTypeId),
        description: `${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
        quantity: entry.numberOfRooms * entry.numberOfNights,
        price: entry.roomRate || 0,
        totalPrice: roomTotalPrice,
        vatPercent: '15%',
        vatAmount,
        totalWithVat,
      });
  
      if (entry.mealRate && entry.mealRate > 0) {
        const totalPrice = this.getRoomPax(entry) * entry.numberOfNights * entry.mealRate;
        const vatAmountMeal = this.getVatAmountFromNet(totalPrice);
        const totalWithVatMeal = this.getTotalWithVat(totalPrice);
        items.push({
          itemType: this.activeLanguage === 'en' ? 'Meal' : 'وجبة',
          itemName: this.getMealName(entry.reservationMealId),
          description: `${this.getRoomPax(entry)} ${this.activeLanguage === 'en' ? 'person' : 'شخص'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
          quantity: this.getRoomPax(entry) * entry.numberOfNights,
          price: entry.mealRate,
          totalPrice,
          vatPercent: '15%',
          vatAmount: vatAmountMeal,
          totalWithVat: totalWithVatMeal,
        });
      }
  
      if (entry.viewRate && entry.viewRate > 0) {
        const totalPrice = entry.numberOfRooms * entry.numberOfNights * entry.viewRate;
        const vatAmountView = this.getVatAmountFromNet(totalPrice);
        const totalWithVatView = this.getTotalWithVat(totalPrice);
        items.push({
          itemType: this.activeLanguage === 'en' ? 'View' : 'إطلالة',
          itemName: this.getViewName(entry.reservationViewId),
          description: `${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
          quantity: entry.numberOfRooms * entry.numberOfNights,
          price: entry.viewRate,
          totalPrice,
          vatPercent: '15%',
          vatAmount: vatAmountView,
          totalWithVat: totalWithVatView,
        });
      }
    });
  
    // Add service entries
    this.getAllServiceEntries().forEach(entry => {
      const totalPrice = this.getServiceTotalSalesPrice(entry);
      const vatAmount = this.getVatAmountFromNet(totalPrice);
      const totalWithVat = this.getTotalWithVat(totalPrice);
      items.push({
        itemType: this.activeLanguage === 'en' ? 'Service' : 'خدمة',
        itemName: this.getServiceName(entry.reservationServiceId),
        description: entry.description || '-',
        quantity: entry.quantity || 0,
        price: entry.salesPrice || 0,
        totalPrice,
        vatPercent: '15%',
        vatAmount,
        totalWithVat,
      });
    });
  
    this.docData = items;
  }

  getAllRoomEntries(): any[] {
    const allEntries: any[] = [];
    this.allReservations.forEach((reservation) => {
      if (
        reservation.reservationRoomEntries &&
        Array.isArray(reservation.reservationRoomEntries)
      ) {
        reservation.reservationRoomEntries.forEach((entry: any) => {
          allEntries.push({
            ...entry,
            reservationId: reservation.id,
            numberOfNights: reservation.numberOfNights || 1,
          });
        });
      }
    });
    return allEntries;
  }

  getAllServiceEntries(): any[] {
    const allEntries: any[] = [];
    this.allReservations.forEach((reservation) => {
      if (
        reservation.reservationServiceEntries &&
        Array.isArray(reservation.reservationServiceEntries)
      ) {
        reservation.reservationServiceEntries.forEach((entry: any) => {
          allEntries.push({
            ...entry,
            reservationId: reservation.id,
          });
        });
      }
    });
    return allEntries;
  }

  getRoomTypeName(roomTypeId: string): string {
    const roomType = this.roomTypesMap.get(roomTypeId);
    return this.getName(roomType);
  }

  getMealName(mealId: string): string {
    const meal = this.mealsMap.get(mealId);
    return this.getName(meal);
  }

  getViewName(viewId: string): string {
    const view = this.viewsMap.get(viewId);
    return this.getName(view);
  }

  getServiceName(serviceId: string): string {
    const service = this.servicesMap.get(serviceId);
    return this.getName(service);
  }

  getRoomPax(entry: any): number {
    if (!entry.roomTypeId || !entry.numberOfRooms) return 0;
    const roomType = this.roomTypesMap.get(entry.roomTypeId);
    const personNo = roomType?.personNo || 1;
    return (entry.numberOfRooms || 0) * personNo;
  }

  getServiceTotalSalesPrice(entry: any): number {
    const quantity = entry.quantity || 0;
    const salesPrice = entry.salesPrice || 0;
    if (!quantity || !salesPrice) return 0;
    return quantity * salesPrice;
  }


  // --- Print Helpers ---
  private getClientCompany(): any {
    if (!this.invoice || !this.invoice.reservationIds || this.invoice.reservationIds.length === 0) {
      return null;
    }
    const firstId = this.invoice.reservationIds[0];
    const reservation = this.reservationsMap.get(String(firstId));
    if (!reservation || !reservation.reservationClientCompanyId) {
      return null;
    }
    return this.reservationCompaniesMap.get(String(reservation.reservationClientCompanyId));
  }

  getCustomerName(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany) {
      return this.activeLanguage === 'en'
        ? clientCompany.englishName
        : clientCompany.arabicName;
    }
    if (this.invoice?.customerProfile) {
      return this.activeLanguage === 'en'
        ? this.invoice.customerProfile.englishName
        : this.invoice.customerProfile.arabicName;
    }
    return '-';
  }

  getCustomerPhone(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.contactNumber) {
      return clientCompany.contactNumber;
    }
    return this.invoice?.customerProfile?.contactNumber || '';
  }

  getCustomerEmail(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.email) {
      return clientCompany.email;
    }
    return this.invoice?.customerProfile?.email || '';
  }

  getCustomerTaxNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.taxNumber) {
      return clientCompany.taxNumber;
    }
    return this.invoice?.customerProfile?.taxNumber || '';
  }

  getCustomerOtherId(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.otherId) {
      return clientCompany.otherId;
    }
    return this.invoice?.customerProfile?.otherId || '';
  }

  getCustomerBuildingNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.buildingNumber) {
      return clientCompany.buildingNumber;
    }
    return this.invoice?.customerProfile?.buildingNumber || '';
  }

  getCustomerStreet(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.street) {
      return clientCompany.street;
    }
    return this.invoice?.customerProfile?.street || '';
  }

  getCustomerDistrict(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.district) {
      return clientCompany.district;
    }
    return this.invoice?.customerProfile?.district || '';
  }

  getCustomerCity(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.city) {
      return clientCompany.city;
    }
    return this.invoice?.customerProfile?.city || '';
  }

  getCustomerCountry(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.country) {
      return clientCompany.country;
    }
    return this.invoice?.customerProfile?.country || '';
  }

  getCustomerZipCode(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.postalCode) {
      return clientCompany.postalCode;
    }
    if (clientCompany && clientCompany.zipCode) {
      return clientCompany.zipCode;
    }
    return this.invoice?.customerProfile?.postalCode || (this.invoice?.customerProfile as any)?.zipCode || '';
  }

  getCustomerAdditionalContactNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.additionalContactNumber) {
      return clientCompany.additionalContactNumber;
    }
    return this.invoice?.customerProfile?.additionalContactNumber || '';
  }

  getVatAmountFromNet(net: number): number {
    if (!net) return 0;
    return Math.round(net * 0.15 * 100) / 100;
  }

  getTotalWithVat(net: number): number {
    const vat = this.getVatAmountFromNet(net);
    return Math.round((net + vat) * 100) / 100;
  }

  getInvoiceNetPrice(): number {
    return this.invoice?.netPrice || 0;
  }

  getInvoiceTaxAmount(): number {
    return this.invoice?.taxAmount || 0;
  }

  getInvoiceTotalPrice(): number {
    return this.invoice?.totalPrice || 0;
  }



  getItemNetPrice(item) {
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
    return (
      Math.round(this.getItemNetPrice(item) * 100) / 100 +
      Math.round(this.getItemTaxAmount(item) * 100) / 100
    );
  }

  getTaxAmount(invoice) {
    if (invoice.taxAmount === 0) return 0;

    const subtotals = invoice.saleItems.map(
      (item) => item.price * item.quantity * item.noOfNights
    );
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);
    const discount = invoice.discountAmount || 0;

    let totalTax = 0;
    invoice.saleItems.forEach((item, idx) => {
      const itemSubtotal = subtotals[idx];
      const isExempt = item.mainSalesClass?.isTaxExempted;
      const taxRate = isExempt ? 0 : 0.15;
      const itemDiscount = grossTotal > 0 ? (itemSubtotal / grossTotal) * discount : 0;
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);
      totalTax += taxableBase * taxRate;
    });

    return Math.round(totalTax * 100) / 100;
  }

  getNetPrice(invoice) {
    const netTotal = invoice.saleItems.reduce(
      (total, item) => total + item.price * item.quantity * item.noOfNights,
      0
    );
    const discount = invoice.discountAmount || 0;
    const discountedTotal = netTotal - discount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getTotalPrice(invoice) {
    return (
      Math.round(this.getNetPrice(invoice) * 100) / 100 +
      Math.round(this.getTaxAmount(invoice) * 100) / 100
    );
  }

  confirmClearInvoice(event: any, invoiceId: number) {
    this.zatcaSendingStatus = 'validating';
    this.zatcaSending = true; this.cdr.detectChanges();
    this.salesInvoiceService.validateZatcaInvoice(invoiceId).subscribe({
      next: (res) => {
        this.zatcaSending = false; this.cdr.detectChanges();
        
        const companyErrors = res.companyErrors || [];
        const customerErrors = res.customerErrors || [];
        const warnings = res.warnings || [];
        const hasBlockingErrors = companyErrors.length > 0 || customerErrors.length > 0;

        if (!hasBlockingErrors && warnings.length === 0) {
          // If perfectly clean, just send it directly
          this.clearInvoice(invoiceId);
          return;
        }

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
        this.zatcaPreCheckDialogVisible = true; this.cdr.detectChanges();
      },
      error: (err) => {
        this.zatcaSending = false; this.cdr.detectChanges();
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to validate invoice' });
      }
    });
  }

  clearInvoice(id: number) {
    this.zatcaSendingStatus = 'sending';
    this.zatcaSending = true; this.cdr.detectChanges();
    this.salesInvoiceService.clearSalesInvoice(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
          detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى زاتكا بنجاح' : 'Invoice sent to ZATCA successfully',
          life: 5000
        });
        this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
        this.loading = false;
      },
      error: (e) => {
        if (e === 'OK') {
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
            detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى زاتكا بنجاح' : 'Invoice sent to ZATCA successfully',
            life: 5000
          });
          this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
          this.zatcaSending = false; this.cdr.detectChanges();
          return;
        }
        // Arabic Comments: تحليل رسالة الخطأ وعرضها في داياليج التحقق
        const rawMessage: string = e?.error?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'Error occurred while sending');
        const isAr = this.activeLanguage === 'ar';
        let finalMessage = rawMessage;
        if (rawMessage.includes('validationResults')) {
          try {
            const jsonStr = rawMessage.substring(rawMessage.indexOf('{'));
            const zatcaErr = JSON.parse(jsonStr);
            const errors = zatcaErr.validationResults?.errorMessages;
            const warnings = zatcaErr.validationResults?.warningMessages;
            if (errors?.length > 0) finalMessage = errors.map((e: any) => e.message).join('\n');
            else if (warnings?.length > 0) finalMessage = warnings.map((w: any) => w.message).join('\n');
          } catch (_) {}
        } else if (rawMessage.includes('|')) {
          const parts = rawMessage.split('|').map((p: string) => p.trim());
          finalMessage = !isAr && parts.length > 1 ? parts[1] : parts[0];
        }
        const isCompanyError = /شرك|شركة|company/i.test(rawMessage);
        const isCustomerError = /عميل|customer/i.test(rawMessage);
        const inv = this.invoices.find(i => i.id === id);
        this.zatcaPreCheck = {
          ...this.zatcaPreCheck,
          invoiceId: id,
          customerId: inv?.customerProfileId,
          companyErrors: isCompanyError ? [finalMessage] : [],
          customerErrors: isCustomerError && !isCompanyError ? [finalMessage] : [],
          warnings: !isCompanyError && !isCustomerError ? [finalMessage] : [],
          hasBlockingErrors: isCompanyError || isCustomerError
        };
        this.zatcaPreCheckDialogVisible = true; this.cdr.detectChanges();
        this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
        this.loading = false;
        this.zatcaSending = false; this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.zatcaSending = false; this.cdr.detectChanges();
      },
    });
  }

  createSalesCreditNote(id: string) {
    this.router.navigate(['/sales-credit-notes/new'], {
      queryParams: { invoiceId: id },
    });
  }

  openOverlayInvoice(event: MouseEvent, entry: any) {
    event.preventDefault();
    
    // Check if we're switching to a different invoice
    const isDifferentInvoice = this.selectedInvoice?.id !== entry.id;
    const isCurrentlyVisible = this.opInvoice.overlayVisible;
    
    // Update selected invoice
    this.selectedInvoice = entry;
    
    // If overlay is open and we're clicking a different invoice, just show it for the new invoice
    // Otherwise, toggle normally
    if (isCurrentlyVisible && isDifferentInvoice) {
      // Don't toggle, just reposition for the new invoice
      // The overlay stays open but updates content
    } else {
      // Normal toggle behavior
      this.opInvoice.toggle(event);
    }

    setTimeout(() => {
      const panelEl = this.opInvoice.container as HTMLElement;
      if (panelEl) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 10;
        }
        if (left < 10) {
          left = 10;
        }

        if (top + panelRect.height > viewportHeight) {
          top = viewportHeight - panelRect.height - 10;
        }
        if (top < 10) {
          top = 10;
        }

        const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
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
    this.router.navigate(['/receipts/paycheck-receipts/new'], {
      queryParams: { connectedSalesInvoiceId: id }
    });
  }

  deleteAll(): void {
    this.selectedInvoices.forEach((invoice) => {
      if (invoice.isCleared) return;
      this.deleteInvoice(invoice.id);
    });
    this.selectedInvoices = [];
  }

  createTransactionForAll(): void {
    this.selectedInvoices.forEach((invoice) => {
      if (invoice.transactionId !== null) return;
      this.createTransaction(invoice?.id);
    });
  }

  clearSelectedInvoices(): void {
    const targets = this.selectedInvoices.filter((inv) => !inv.isCleared);
    if (!targets.length) return;
    let i = 0;
    const processNext = () => {
      if (i >= targets.length) {
        this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
        return;
      }
      const inv = targets[i++];
      this.salesInvoiceService.clearSalesInvoice(inv.id).subscribe({
        next: () => {},
        error: () => {},
        complete: () => {
          processNext();
        },
      });
    };
    processNext();
  }

  hasPermission(permission: string): boolean {
    return this.authService ? this.authService.hasPermission(permission) : true;
  }

  addInvoice(): void {
    this.router.navigate(['/invoices/new']);
  }

  onTransactionsFilterChange(): void {
    this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
  }

  onZatcaFilterChange(): void {
    this.loadInvoicesLazy({ first: 0, rows: this.pageSize });
  }

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

  private mapZatcaFilter(): boolean | null {
    switch (this.zatcaFilter) {
      case 'sent':
        return true;
      case 'notSent':
        return false;
      case 'all':
      default:
        return null;
    }
  }

  downloadAllInvoicesPdf() {
    this.openBatchFormatDialog('downloadZipAll');
  }

  openBatchFormatDialog(
    action: 'printSelected' | 'downloadSelected' | 'downloadMergedSelected' | 'downloadMergedAll' | 'downloadZipAll'
  ): void {
    if (action === 'downloadMergedAll' || action === 'downloadZipAll') {
      this.loading = true;
      this.salesInvoiceService.getReservationInvoicesPaged(1, 1000, 2, undefined, 'issuedate', -1, this.mapZatcaFilter(), this.mapTransactionFilter()).subscribe({
        next: (res) => {
          const ids = (res.items || [])
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
          console.error('Error fetching invoices for batch PDF:', err);
          this.loading = false;
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

    this.formatDialogVisible = false;
    const pending = this.pendingBatchAction;
    this.pendingBatchAction = null;

    const outputMode = pending.action === 'downloadMergedSelected' || pending.action === 'downloadMergedAll'
      ? 'mergedPdf'
      : (pending.action === 'downloadSelected' || pending.action === 'downloadZipAll')
        ? 'selectedZip'
        : 'selectedPrint';
    void this.renderWithFrontendTemplate(pending.ids, this.selectedBatchFormat, outputMode);
  }

  private mapInvoiceItemsForFrontendPrint(invoice: any): any[] {
    return (invoice?.saleItems || []).map((item: any) => ({
      ...item,
      mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode,
      mainSalesClassName: this.activeLanguage === 'en' ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
      mainSalesClasMeasurementUnitName: this.activeLanguage === 'en' ? item.mainSalesClass?.measurementUnit?.englishName : item.mainSalesClass?.measurementUnit?.arabicName,
      totalPreTax: item.netPrice || 0,
      taxAmount: item.taxAmount || 0,
      totalPrice: item.totalPrice || 0,
      itemName: this.activeLanguage === 'en' ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
      description: item.description || '-',
      netPrice: item.netPrice || 0,
    }));
  }

  private waitForFrontendPrintRender(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 250));
  }

  private async renderWithFrontendTemplate(
    ids: number[],
    format: 'format1' | 'format2' | 'format3',
    outputMode: 'mergedPdf' | 'selectedZip' | 'selectedPrint'
  ): Promise<void> {
    if (!ids.length) return;

    this.loading = true;
    this.batchProcessing = true;
    const files: { name: string; blob: Blob }[] = [];
    const allCanvases: HTMLCanvasElement[] = [];
    const orientations: ('portrait' | 'landscape')[] = [];

    try {
      for (const id of ids) {
        const invoice = await firstValueFrom(this.salesInvoiceService.getInvoiceById(id));
        this.selectedInvoice = invoice;
        this.docData = this.mapInvoiceItemsForFrontendPrint(invoice);
        this.cdr.detectChanges();
        await this.waitForFrontendPrintRender();

        const component = format === 'format1' ? this.printComponent : this.printComponent3;
        if (component) {
          const canvases = await component.captureRenderedPages('portrait');
          if (!canvases.length) continue;

          if (outputMode === 'mergedPdf') {
            allCanvases.push(...canvases);
            canvases.forEach(() => orientations.push('portrait'));
          } else {
            const blob = this.pdfUtilsService.canvasesToPdfBlob(canvases, 'portrait', ['portrait']);
            files.push({ name: `Invoice_${invoice?.invoiceNo || id}.pdf`, blob });
          }
        }
      }

      if (outputMode === 'mergedPdf' && allCanvases.length) {
        const blob = this.pdfUtilsService.canvasesToPdfBlob(allCanvases, 'portrait', orientations);
        this.pdfUtilsService.downloadFile(blob, 'Merged_Reservation_Invoices.pdf');
      } else if (outputMode === 'selectedZip' && files.length) {
        this.pdfUtilsService.downloadBlobsAsZip(files, 'Selected_Reservation_Invoices.zip');
      } else if (outputMode === 'selectedPrint' && files.length) {
        await this.pdfUtilsService.printBlobsSequentially(files.map(f => f.blob));
      }
    } catch (err) {
      console.error('Error rendering frontend PDF batch:', err);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
        detail: 'فشل إعداد ملفات PDF'
      });
    } finally {
      this.loading = false;
      this.batchProcessing = false;
      this.cdr.detectChanges();
    }
  }

  exportAllInvoicesToExcel(): void {
    this.loading = true;
    this.salesInvoiceService.getReservationInvoicesPaged(1, 1000, 2, undefined, 'issuedate', -1, this.mapZatcaFilter(), this.mapTransactionFilter()).subscribe({
      next: (res) => {
        const ids = (res.items || []).map((inv: any) => inv?.id).filter((v: any) => v != null);
        if (!ids.length) {
          this.loading = false;
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
            detail: 'لا توجد فواتير للتصدير',
          });
          return;
        }

        this.fetchInvoicesByIds(ids).subscribe({
          next: (invoices) => {
            const fileName = this.activeLanguage === 'ar' ? 'فواتير_الحجوزات.xlsx' : 'Reservation_Invoices.xlsx';
            this.exportInvoicesToExcel(invoices, fileName);
          },
          error: (err) => {
            console.error(err);
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  exportSelectedInvoicesToExcel(): void {
    const selected = (this.selectedInvoices || []).map((i) => i?.id).filter((v: any) => v != null);
    if (!selected.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'من فضلك اختر فاتورة واحدة على الأقل',
      });
      return;
    }

    this.loading = true;
    forkJoin(selected.map((id) => this.salesInvoiceService.getInvoiceById(id))).subscribe({
      next: (invoices) => {
        this.exportInvoicesToExcel(invoices);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
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

  private exportInvoicesToExcel(invoices: SalesInvoice[], fileName?: string): void {
    try {
      const isAr = this.activeLanguage === 'ar';
      const header = isAr
        ? ['رقم الفاتورة (ID)', 'رقم الفاتورة', 'تاريخ الإصدار', 'العميل', 'الوصف', 'مُرحلة؟', 'إجمالي الفاتورة']
        : ['Invoice ID', 'Invoice No', 'Issue Date', 'Customer', 'Description', 'Cleared?', 'Invoice Total'];

      const rows: any[][] = [header];
      invoices.forEach((inv) => {
        const customerName = this.activeLanguage === 'en' ? inv?.customerProfile?.englishName : inv?.customerProfile?.arabicName;
        rows.push([
          inv?.id ?? '',
          inv?.invoiceNo ?? '',
          inv?.issueDate ?? '',
          customerName ?? '',
          inv?.description ?? '',
          inv?.transactionId ? 'نعم' : 'لا',
          inv?.totalPrice || 0
        ]);
      });

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(rows);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isAr ? 'فواتير الحجوزات' : 'Reservation Invoices');
      XLSX.writeFile(wb, fileName || (isAr ? 'فواتير_الحجوزات_المختارة.xlsx' : 'Selected_Reservation_Invoices.xlsx'));
    } catch (err) {
      console.error('Excel Export Error:', err);
    } finally {
      this.loading = false;
    }
  }

  openUploadDialog() {
    this.resetUploadState();
    this.uploadDialogVisible = true;
  }

  resetUploadState() {
    this.processingUpload = false;
    this.uploadProgress = 0;
    this.previewInvoices = [];
    this.selectedFileName = '';
    this.selectedImportFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.selectedImportFile = file;
    this.selectedFileName = file.name;
    this.processingUpload = true;
    this.uploadProgress = 100;
    setTimeout(() => {
      this.processingUpload = false;
      this.messageService.add({
        severity: 'info',
        summary: 'معلومة',
        detail: 'تم اختيار ملف Excel بنجاح',
      });
    }, 500);
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

    this.shareBulkMode = true;
    this.shareBulkIds = ids;
    this.invoiceShareDialogVisible = true;
  }
}

