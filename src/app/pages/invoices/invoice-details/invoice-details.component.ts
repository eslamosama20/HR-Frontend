import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { QrcodeService } from '../../../services/qrcode/qrcode.service';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Invoice } from 'src/app/models/invoice/invoice';
import { InvoiceService } from 'src/app/services/invoice/invoice-service.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { TranslationService } from "../../../modules/i18n";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { PrintDocumentComponent } from "../../../shared-components/print-document/print-document.component";
import { CompanyDetailsService } from "../../../services/inventory/company-details.service";
import { AttachmentModel } from "../../../models/Attachments/attachment.model";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { FileUploadModule } from "primeng/fileupload";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ConfirmationService, MessageService } from "primeng/api";
import { AttachmentService } from "../../../services/attachments/attachment.service";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { FormatDecimalPipe } from "../../../pipes/format-decimal.pipe";
import { QRCodeModule } from "angularx-qrcode";
import { CustomDatePipe } from "../../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { finalize, take } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { InvoiceShareModalComponent } from '../../../shared-components/invoice-share-modal/invoice-share-modal.component';
import { PdfUtilsService } from '../../../services/pdf-utils.service';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, PrintDocumentComponent, FileUploadModule, DialogModule, ButtonModule, ToastModule, ConfirmDialogModule, FormatDecimalPipe, QRCodeModule, CustomDatePipe, RouterModule, BackButtonComponent, DetailActionsMenuComponent, InvoiceShareModalComponent, ReactiveFormsModule, FormsModule, TabViewModule, InputTextModule, InputSwitchModule],
  templateUrl: './invoice-details.component.html',
  styleUrls: ['./invoice-details.component.scss'], // Corrected this line
  providers: [MessageService, ConfirmationService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class InvoiceDetailsComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  @ViewChild('printComponent2', { static: false }) printComponent2: PrintDocumentComponent;
  @ViewChild('printComponent3', { static: false }) printComponent3: PrintDocumentComponent;

  companyDetailsSignal = signal<CompanyDetailsModel>(null)
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal = signal<any[]>([])
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  docDataSignal = signal<any>(null)
  get docData(): any {
    return this.docDataSignal();
  }
  set docData(value: any) {
    this.docDataSignal.set(value);
  }

  descriptionRowsPerPage: number = 8;
  useLandscape = false;
  sellerName: string = '';

  isSameDate(date1: any, date2: any): boolean {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) &&
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  printDocument() {
    const targetId = Number((this.invoice as any)?.invoiceId || this.invoice?.id || this.invoiceId);
    if (targetId) {
      this.showPrintOrientationDialog(targetId, true);
    }
  }

  printOrientationDialogVisible = false;
  pendingInvoiceId: number | null = null;
  pendingIsPrint: boolean = false;
  selectedPrintType: 'A4Portrait' | 'A4Landscape' | 'Thermal80mm' | 'Thermal58mm' = 'A4Portrait';

  showPrintOrientationDialog(invoiceId: number, isPrint: boolean) {
    this.pendingInvoiceId = invoiceId;
    this.pendingIsPrint = isPrint;
    this.selectedPrintType = 'A4Portrait';
    this.printOrientationDialogVisible = true;
  }

  confirmPrintOrientation() {
    if (this.pendingInvoiceId !== null) {
      if (this.pendingIsPrint) {
        this.invoiceService.printDocument(this.pendingInvoiceId, this.selectedPrintType);
      } else {
        this.invoiceService.downloadDocument(this.pendingInvoiceId, this.selectedPrintType);
      }
    }
    this.printOrientationDialogVisible = false;
    this.pendingInvoiceId = null;
  }


  loadingSignal = signal<boolean>(false);

  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }
  zatcaSending: boolean = false;
  zatcaSendingStatus: 'validating' | 'sending' = 'sending';
  invoiceSignal = signal<SalesInvoice>(null)
  get invoice() {
    return this.invoiceSignal()
  }
  set invoice(value: SalesInvoice) {
    this.invoiceSignal.set(value);
  }

  get selectedInvoice(): SalesInvoice {
    return this.invoice;
  }

  showRefundAdjusted = true;
  refundStatus: 'none' | 'partial_refund' | 'refunded' = 'none';
  refundedAmount = 0;
  showOriginalInvoiceDialog = false;
  originalDocData: any[] = [];
  qrCodeUrl: string | ArrayBuffer | null = '';


  translate: TranslateService;
  get activeLanguage() {
    const lang = this.translationService.getSelectedLanguage() || 'en';
    return lang.startsWith('ar') ? 'ar' : 'en';
  }

  // Custom buttons for action menu
  customButtons: ActionButton[] = [];
  sendingToFrontal = false;

  // Navigation controls for action menu
  allInvoiceIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  isNavLoading: boolean = false;

  // Share dialog properties
  invoiceShareDialogVisible = false;
  invoiceShareActiveTabIndex = 0;
  shareBusy = false;
  invoiceShareForm!: FormGroup;

  // Arabic Comments: خصائص داياليج التحقق من زاتكا
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
      companyErrors: [],
      customerErrors: [],
      warnings: [],
      hasBlockingErrors: false
    };

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

  // Print customization panel variables
  showTopSettingsPanel: boolean = false;
  policiesCollapsed: boolean = true;
  bankAccountCollapsed: boolean = true;
  selectedPolicies: any[] = [];
  selectedBanks: any[] = [];
  anyPolicyChecked: boolean = false;
  anyBankChecked: boolean = false;
  showStamp: boolean = true;

  constructor(
    private companyDataService: CompanyDetailsService,
    private invoiceService: SalesInvoiceService,
    private qrcodeService: QrcodeService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private router: Router,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private printSettingsService: PrintSettingsService,
    private pdfUtils: PdfUtilsService
  ) {
    this.translate = translateService;

    // Initialize share form
    this.invoiceShareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
    });

    this.docColumns = [
      { field: 'mainSalesClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO") },
      { field: 'mainSalesClassName', label: this.translate.instant("INVOICE.ITEMNAME") },
      { field: 'mainSalesClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT") },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      //{ field: 'noOfNights', label: this.translate.instant("INVOICE.NO_OF_NIGHTS") },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE"), pipe: 'number' },
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL"), pipe: 'number' },
    ];
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  invoiceId: string;
  ngOnInit(): void {
    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();

    this.setSellerName();
    // Load all invoice IDs once on init for navigation
    this.loadAllInvoiceIds();

    // Subscribe to route params to get the invoice ID and position from query params
    this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId) {
        this.invoiceId = newId;
        this.loadInvoice(newId);
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['index'] && queryParams['total']) {
        const queryIdx = parseInt(queryParams['index'], 10);
        const queryTotal = parseInt(queryParams['total'], 10);
        if (!isNaN(queryIdx) && !isNaN(queryTotal)) {
          this.currentIndex = queryIdx - 1;
          this.navigationControls = {
            currentPage: queryIdx,
            totalPages: queryTotal,
            onNext: () => this.navigateToNext(),
            onPrevious: () => this.navigateToPrevious()
          };
        }
      }
    });
  }

  onShowCompanySignatureChange(value: boolean): void {
    this.showCompanySignature = value;
    this.printSettingsService.setShowCompanySignature(value);
  }

  onShowStampChange(value: boolean): void {
    this.showStamp = value;
    this.printSettingsService.setShowStamp(value);
  }

  onShowCustomerSignatureChange(value: boolean): void {
    this.showCustomerSignature = value;
    this.printSettingsService.setShowCustomerSignature(value);
  }

  loadInvoice(id: string, showLoading: boolean = true) {
    if (showLoading) {
      this.loading = true;
    }
    this.invoiceService.getInvoiceById(Number(id)).subscribe({
      next: (res) => {
        console.log("invoice", res)
        this.invoice = {
          ...res,
          issueDate: new Date(res.issueDate),
          dueDate: res.dueDate ? new Date(res.dueDate) : null
        };
        const resAny = res as any;
        if (resAny?.sellerName || resAny?.cashierName || resAny?.createdBy) {
          this.sellerName = resAny.sellerName || resAny.cashierName || resAny.createdBy;
        }
        this.refundStatus = res.refundStatus || 'none';
        this.refundedAmount = res.refundedAmount || 0;

        this.originalDocData = (res.saleItems || []).map(item => {
          const totalPreTax = item.quantity * item.noOfNights * item.price;
          const taxRate = item.mainSalesClass?.isTaxExempted ? 0 : 0.15;
          const taxAmount = totalPreTax * taxRate;
          const totalPrice = totalPreTax + taxAmount;
          return {
            ...item,
            mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode || '',
            mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
            mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass?.measurementUnit?.englishSymbol : item.mainSalesClass?.measurementUnit?.arabicSymbol,
            totalPreTax: Math.round(totalPreTax * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100,
            itemName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
            description: '-',
            netPrice: Math.round(totalPreTax * 100) / 100,
            quantity: item.quantity
          };
        });

        this.toggleRefundAdjusted(this.showRefundAdjusted);

        console.log("invoice", this.invoice.generatedQR)
        this.useLandscape = (this.docData?.length || 0) > this.descriptionRowsPerPage;
        this.setupCustomButtons(); // Setup custom buttons after invoice is loaded
        this.loading = false;
        // Trigger update to calculate exact current index in allInvoiceIds list
        this.updateNavigationControls();
      },
      error: error => alert(error)
    });
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
        console.error("Error fetching company details:", error);
      }
    });
  }

  toggleRefundAdjusted(value: boolean) {
    this.showRefundAdjusted = value;
    if (this.invoice) {
      this.docData = this.invoice.saleItems.map(item => {
        const qty = this.showRefundAdjusted ? (item.quantity - (item.returnedQuantity || 0)) : item.quantity;
        return {
          ...item,
          mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode || '',
          mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass?.measurementUnit?.englishSymbol : item.mainSalesClass?.measurementUnit?.arabicSymbol,
          totalPreTax: this.getItemNetPrice(item),
          taxAmount: this.getItemTaxAmount(item),
          totalPrice: this.getItemTotalPrice(item),
          itemName: this.activeLanguage == "en" ? item.mainSalesClass?.englishName : item.mainSalesClass?.arabicName,
          description: '-',
          netPrice: this.getItemNetPrice(item),
          quantity: qty
        };
      });
      this.cdr.detectChanges();
    }
  }
  /**
   * Get the translation key for invoice type label
   * Returns 'INVOICE.SALES_INVOICE' for sale invoices or 'INVOICE.RESERVATION_INVOICE' for reservation invoices
   * Falls back to checking saleInvoiceType, reservationId if invoiceType is not set
   */
  getInvoiceTypeLabel(): string {
    // Check invoiceType property first (frontend field)
    if (this.invoice?.invoiceType === 'reservation') {
      return 'INVOICE.RESERVATION_INVOICE';
    }

    // Check saleInvoiceType (backend field): 0 = sale, 1 = reservation
    if (this.invoice?.saleInvoiceType === 1) {
      return 'INVOICE.RESERVATION_INVOICE';
    }

    // Fallback: If neither is set, check if invoice has a reservationId
    if (this.invoice?.reservationId || (this.invoice?.reservationIds && this.invoice.reservationIds.length > 0)) {
      return 'INVOICE.RESERVATION_INVOICE';
    }

    // Default to sales invoice
    return 'INVOICE.SALES_INVOICE';
  }

  getItemNetPrice(item: any) {
    const qty = this.showRefundAdjusted ? (item.quantity - (item.returnedQuantity || 0)) : item.quantity;
    const netTotal = qty * item.noOfNights * item.price;
    return Math.round(netTotal * 100) / 100;
  }

  getItemTaxAmount(item: any) {
    const isExempt = item.mainSalesClass?.isTaxExempted;
    const taxRate = isExempt ? 0 : 0.15;
    const subtotal = this.getItemNetPrice(item);
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  getItemTotalPrice(item: any) {
    return Math.round((this.getItemNetPrice(item) + this.getItemTaxAmount(item)) * 100) / 100;
  }
  printInvoice() {
    const el = document.getElementById('invoiceSection');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.activeLanguage === 'ar',
        title: 'Invoice'
      });
    }
  }

  printInvoice2(): void {
    if (this.printComponent2) {
      this.cdr.detectChanges();
      setTimeout(() => {
        this.printComponent2.triggerPrint();
      }, 100);
    }
  }

  printInvoice3(): void {
    if (this.printComponent3) {
      this.cdr.detectChanges();
      setTimeout(() => {
        this.printComponent3.triggerPrint();
      }, 100);
    }
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

  getSellerName(): string {
    return this.sellerName || (this.invoice as any)?.cashierName || (this.invoice as any)?.sellerName || this.invoice?.createdBy || '';
  }

  setSellerName() {
    this.authService.getUserByToken().subscribe({
      next: (res: any) => {
        this.sellerName = res?.fullName || (res as any)?.name || (this.invoice as any)?.createdBy || '';
      },
      error: () => {
        this.sellerName = (this.invoice as any)?.createdBy || '';
      }
    });
  }

  // ngOnInit(): void {

  //   // this.route.paramMap.subscribe(params => {
  //   //   const id = params.get('id');
  //   //   if (id) {
  //   //     this.invoiceService.getInvoiceById(+id).subscribe(data => {
  //   //       this.invoice = data;
  //   //     });
  //   //   }
  //   // });


  //   this.route.paramMap.subscribe(params => {
  //     const id = params.get('id');
  //     if (id) {
  //       this.invoiceService.getInvoiceById(+id).subscribe(data => {
  //         this.invoice = data;
  //         this.cdr.detectChanges();
  //       })
  //       this.getQRCode(window.location.href);
  //     }
  //   })
  // }

  getQRCode(url: any): void {
    this.qrcodeService.generateQRCode(url).subscribe(response => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.qrCodeUrl = reader.result;
      };
      reader.readAsDataURL(response);
    });
  }

  getTaxAmount(invoice) {
    if (invoice.taxAmount === 0) return 0;

    const subtotals = invoice.saleItems.map(item =>
      item.price * (this.showRefundAdjusted ? (item.quantity - (item.returnedQuantity || 0)) : item.quantity) * item.noOfNights
    );
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    const discount = invoice.discountAmount || 0;
    let adjustedDiscount = discount;
    if (this.showRefundAdjusted && this.refundStatus !== 'none') {
      const originalGrossTotal = invoice.saleItems.reduce((total, item) => total + (item.price * item.quantity * item.noOfNights), 0);
      adjustedDiscount = originalGrossTotal > 0 ? (grossTotal / originalGrossTotal) * discount : 0;
    }

    let totalTax = 0;
    invoice.saleItems.forEach((item, idx) => {
      const itemSubtotal = subtotals[idx];
      const isExempt = item.mainSalesClass?.isTaxExempted;
      const taxRate = isExempt ? 0 : 0.15;

      const itemDiscount = grossTotal > 0
        ? (itemSubtotal / grossTotal) * adjustedDiscount
        : 0;

      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);
      totalTax += taxableBase * taxRate;
    });

    return Math.round(totalTax * 100) / 100;
  }


  getNetPrice(invoice) {
    const netTotal = invoice.saleItems.reduce(
      (total, item) => total + this.getItemNetPrice(item),
      0
    );
    const discount = invoice.discountAmount || 0;
    let adjustedDiscount = discount;
    if (this.showRefundAdjusted && this.refundStatus !== 'none') {
      const originalGrossTotal = invoice.saleItems.reduce((total, item) => total + (item.price * item.quantity * item.noOfNights), 0);
      const remainingGrossTotal = invoice.saleItems.reduce((total, item) => total + (item.price * (item.quantity - (item.returnedQuantity || 0)) * item.noOfNights), 0);
      adjustedDiscount = originalGrossTotal > 0 ? (remainingGrossTotal / originalGrossTotal) * discount : 0;
    }
    const discountedTotal = netTotal - adjustedDiscount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getTotalPrice(invoice) {
    const total = this.getNetPrice(invoice) + this.getTaxAmount(invoice);
    return Math.round(total * 100) / 100;
  }

  getDiscountAmount(invoice): number {
    const discount = invoice?.discountAmount || 0;
    if (this.showRefundAdjusted && this.refundStatus !== 'none') {
      const originalGrossTotal = invoice.saleItems.reduce((total, item) => total + (item.price * item.quantity * item.noOfNights), 0);
      const remainingGrossTotal = invoice.saleItems.reduce((total, item) => total + (item.price * (item.quantity - (item.returnedQuantity || 0)) * item.noOfNights), 0);
      return originalGrossTotal > 0 ? Math.round(((remainingGrossTotal / originalGrossTotal) * discount) * 100) / 100 : 0;
    }
    return discount;
  }

  getGrossTotal(invoice: any): number {
    if (!invoice || !invoice.saleItems) return 0;
    const subtotals = invoice.saleItems.map((item: any) => {
      const qty = this.showRefundAdjusted ? (item.quantity - (item.returnedQuantity || 0)) : item.quantity;
      return qty * item.noOfNights * item.price;
    });
    const gross = subtotals.reduce((sum: number, s: number) => sum + s, 0);
    return Math.round(gross * 100) / 100;
  }

  getOriginalSubtotal(invoice) {
    if (!invoice?.saleItems) return 0;
    const total = invoice.saleItems.reduce((sum, item) => sum + (item.price * item.quantity * item.noOfNights), 0);
    return Math.round(total * 100) / 100;
  }

  getOriginalTax(invoice) {
    if (!invoice?.saleItems) return 0;
    if (invoice.taxAmount === 0) return 0;

    const subtotals = invoice.saleItems.map(item => item.price * item.quantity * item.noOfNights);
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

  getOriginalTotal(invoice) {
    const subtotal = this.getOriginalSubtotal(invoice);
    const discount = invoice?.discountAmount || 0;
    const tax = this.getOriginalTax(invoice);
    return Math.round((subtotal - discount + tax) * 100) / 100;
  }

  // VAT helpers for print calculations
  getVatAmountFromNet(net: number): number {
    if (!net) return 0;
    return Math.round(net * 0.15 * 100) / 100;
  }

  getTotalWithVat(net: number): number {
    const vat = this.getVatAmountFromNet(net);
    return Math.round((net + vat) * 100) / 100;
  }

  // Calculate invoice totals for printing
  getInvoiceTaxAmount(): number {
    return this.getTaxAmount(this.invoice);
  }

  getInvoiceNetPrice(): number {
    return this.getNetPrice(this.invoice);
  }

  getInvoiceTotalPrice(): number {
    return this.getTotalPrice(this.invoice);
  }

  getCustomerName(): string {
    const cp = (this.invoice?.customerProfile || {}) as any;
    if (cp?.arabicName || cp?.englishName) {
      return this.activeLanguage === 'en'
        ? (cp.englishName || cp.arabicName)
        : (cp.arabicName || cp.englishName);
    }
    return (this.invoice as any)?.customerProfileName || (this.invoice as any)?.customerName || '-';
  }

  getCustomerAddress(): string {
    const p = this.invoice?.customerProfile;
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

  getInvoiceTargetId(): number {
    const rawId = (this.invoice as any)?.invoiceId || this.invoice?.id || this.invoiceId;
    const num = Number(rawId);
    return isNaN(num) ? 0 : num;
  }

  getCustomerPhone(): string {
    const cp = (this.invoice?.customerProfile || {}) as any;
    return cp?.contactNumber || cp?.phone || cp?.mobileNumber || (this.invoice as any)?.customerProfilePhone || (this.invoice as any)?.phone || '';
  }

  getCustomerEmail(): string {
    const cp = (this.invoice?.customerProfile || {}) as any;
    return cp?.email || (this.invoice as any)?.customerProfileEmail || (this.invoice as any)?.email || '';
  }

  getCustomerTaxNumber(): string {
    return this.invoice?.customerProfile?.taxNumber || '';
  }

  getCustomerOtherId(): string {
    return this.invoice?.customerProfile?.otherId || '';
  }

  getCustomerBankName(): string {
    return this.invoice?.customerProfile?.bankName || '';
  }

  getCustomerBankAccountNumber(): string {
    return this.invoice?.customerProfile?.bankAccountNumber || '';
  }

  getCustomerIBAN(): string {
    return this.invoice?.customerProfile?.iban || '';
  }

  getCustomerStreet(): string {
    return this.invoice?.customerProfile?.street || '';
  }

  getCustomerDistrict(): string {
    return this.invoice?.customerProfile?.district || '';
  }

  getCustomerShortAddress(): string {
    return this.invoice?.customerProfile?.shortAddress || '';
  }

  getCustomerBuildingNumber(): string {
    return this.invoice?.customerProfile?.buildingNumber || '';
  }

  getCustomerCity(): string {
    return this.invoice?.customerProfile?.city || '';
  }

  getCustomerCountry(): string {
    return this.invoice?.customerProfile?.country || '';
  }

  getCustomerZipCode(): string {
    return this.invoice?.customerProfile?.postalCode || '';
  }

  getCustomerAdditionalContactNumber(): string {
    return this.invoice?.customerProfile?.additionalContactNumber || '';
  }

  getCustomerFax(): string {
    return this.invoice?.customerProfile?.fax || '';
  }

  getCustomerWebsite(): string {
    return this.invoice?.customerProfile?.website || '';
  }

  getCustomerInstructions(): string {
    return this.invoice?.customerProfile?.instructions || '';
  }

  getCustomerGaztNumber(): string {
    return this.invoice?.customerProfile?.gaztNumber || '';
  }





  get attachments(): AttachmentModel[] {
    return this.invoice?.attachments || [];
  }
  loadAttachments() {
    this.loadInvoice(this.invoiceId)
  }



  deleteAttachment(attachmentId: string) {
    this.loading = true;
    this.attachmentService.delete(attachmentId).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.ATTACHMENT_DELETED') });
      this.loadAttachments();
    });
  }

  viewDialogSignal = signal(false);
  get viewDialog() {
    return this.viewDialogSignal();
  }
  set viewDialog(value) {
    this.viewDialogSignal.set(value);
  }
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }


  onView(pdf: AttachmentModel) {
    this.attachmentService.downloadAttachment(pdf.id).subscribe(res => {
      // Decode the Base64 string into a binary array
      const byteCharacters = atob(res.fileData); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl); // Sanitize URL

      this.viewDialog = true; // Open the dialog to view the PDF
    });
  }

  onUpdate(event: any, pdf: AttachmentModel) {
    const saleInvoiceId = this.invoiceId
    if (!saleInvoiceId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.saleInvoiceId = Number(saleInvoiceId);
      requestData.id = pdf.id;
      this.attachmentService.update(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.viewDialog = false;
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file)
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }
  onDelete(pdf: AttachmentModel) {
    this.attachmentService.delete(pdf.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File deleted successfully.',
        });
        this.loadAttachments();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete file.',
        });
      },
    });
  }
  onFileSelected(event: any) {
    const saleInvoiceId = this.invoiceId;
    if (!saleInvoiceId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.saleInvoiceId = Number(saleInvoiceId);
      this.attachmentService.create(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file); // Convert file to base64
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }

  createTransaction(id: number): void {
    this.invoiceService.createInvoiceTransaction(id).subscribe({
      next: (result) => {
        this.loadInvoice(id.toString());  // Reload invoices after transaction creation
      },
      error: (er) => {
        alert(this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));
      }
    });
  }

  // Action menu handlers
  onPrintClick(): void {
    this.printInvoice2();
  }

  onEditClick(): void {
    this.router.navigate(['/invoices/edit', this.invoiceId]);
  }

  onCopyClick(): void {
    const id = this.invoiceId || this.invoice?.id;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
        detail: this.activeLanguage === 'ar' ? 'لا يوجد رقم فاتورة لنسخه.' : 'No invoice ID to copy.',
      });
      return;
    }

    const isFrontal = this.router.url.includes('frontal');
    const route = isFrontal
      ? ['/invoices/frontal-new']
      : ['/invoices/new'];
    this.router.navigate(route, { queryParams: { copyId: id } });
  }

  isDeletingInvoice = false;

  onDeleteClick(event?: Event): void {
    const id = Number(this.invoiceId);
    if (!id || this.isDeletingInvoice) return;

    this.confirmationService.confirm({
      message: this.activeLanguage === 'ar'
        ? 'هل أنت متأكد من حذف هذه الفاتورة؟'
        : 'Are you sure you want to delete this invoice?',
      header: this.activeLanguage === 'ar' ? 'تأكيد الحذف' : 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger rounded-md',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined rounded-md',
      acceptLabel: this.activeLanguage === 'ar' ? 'حذف' : 'Delete',
      rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
      accept: () => {
        if (this.isDeletingInvoice) return;
        this.isDeletingInvoice = true;
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'info',
          summary: this.activeLanguage === 'ar' ? 'جاري الحذف' : 'Deleting',
          detail: this.activeLanguage === 'ar'
            ? 'جاري حذف الفاتورة...'
            : 'Deleting invoice...',
          life: 4000
        });

        this.invoiceService.deleteInvoice(id).subscribe({
          next: () => {
            this.isDeletingInvoice = false;
            const successMsg = this.activeLanguage === 'ar' ? 'تم حذف الفاتورة بنجاح' : 'Invoice deleted successfully';
            try {
              sessionStorage.setItem('pendingToastMessage', JSON.stringify({
                severity: 'success',
                summary: this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success',
                detail: successMsg,
              }));
            } catch (e) {
              console.error('Error saving pending toast:', e);
            }
            this.router.navigate(['/invoices/list'], {
              state: { message: successMsg }
            });
          },
          error: (err) => {
            this.isDeletingInvoice = false;
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
          }
        });
      },
    });
  }

  onCreateEntryClick(): void {
    this.createTransaction(Number(this.invoiceId));
  }

  // Custom button actions
  createReceipt(): void {
    // Navigate to create receipt page with invoice ID
    this.router.navigate(['/receipts/paycheck-receipts/new'], { queryParams: { connectedSalesInvoiceId: this.invoiceId } });
  }

  downloadPDF(): void {
    const targetId = Number((this.invoice as any)?.invoiceId || this.invoice?.id || this.invoiceId);
    if (targetId) {
      this.showPrintOrientationDialog(targetId, false);
    }
  }

  // Arabic Comments: التحقق من بيانات الفاتورة وعرض داياليج التحقق من زاتكا
  sendToZatca(event?: any): void {
    if (!this.invoiceId || this.zatcaSending || this.invoice?.isCleared) return;

    this.confirmationService.confirm({
      message: this.activeLanguage === 'ar'
        ? 'هل أنت متأكد من إرسال هذه الفاتورة إلى هيئة الزكاة والضريبة والجمارك (ZATCA)؟'
        : 'Are you sure you want to send this invoice to ZATCA?',
      header: this.activeLanguage === 'ar' ? 'تأكيد الإرسال لزاتكا' : 'Send to ZATCA Confirmation',
      icon: 'pi pi-cloud-upload',
      acceptLabel: this.activeLanguage === 'ar' ? 'إرسال' : 'Send',
      rejectLabel: this.activeLanguage === 'ar' ? 'إلغاء' : 'Cancel',
      acceptButtonStyleClass: 'p-button-success rounded-md',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined rounded-md',
      accept: () => {
        this.zatcaSendingStatus = 'validating';
        this.zatcaSending = true;
        this.setupCustomButtons();
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

        this.invoiceService.validateZatcaInvoice(Number(this.invoiceId)).subscribe({
          next: (res) => {
            const companyErrors = res?.companyErrors || [];
            const customerErrors = res?.customerErrors || [];
            const warnings = res?.warnings || [];
            const hasBlockingErrors = companyErrors.length > 0 || customerErrors.length > 0;

            if (!hasBlockingErrors && warnings.length === 0) {
              // If perfectly clean, send it directly
              this.clearInvoice();
              return;
            }

            // Dialog needed: stop sending state so user can view dialog
            this.zatcaSending = false;
            this.setupCustomButtons();

            // Otherwise, show the pre-check dialog
            this.zatcaPreCheck = {
              invoiceType: res?.invoiceType || 'standard',
              invoiceId: Number(this.invoiceId),
              customerId: this.invoice?.customerProfileId?.toString() || '',
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
            this.setupCustomButtons();
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
    });
  }

  // Arabic Comments: إرسال الفاتورة بعد تأكيد المستخدم
  confirmZatcaSend(): void {
    if (this.zatcaSending) return;
    this.zatcaPreCheckDialogVisible = false;
    this.clearInvoice();
  }

  goToCompanySettings(): void {
    const url = this.router.createUrlTree(['/company-details']);
    window.open(this.router.serializeUrl(url), '_blank');
  }

  goToCustomer(customerId?: string): void {
    if (!customerId) return;
    const url = this.router.createUrlTree(['/accounting/customer-profile', customerId]);
    window.open(this.router.serializeUrl(url), '_blank');
  }

  private clearInvoice(): void {
    if (this.zatcaSending && this.zatcaSendingStatus === 'sending') return;
    this.zatcaSendingStatus = 'sending';
    this.zatcaSending = true;
    this.setupCustomButtons();
    this.cdr.detectChanges();

    // Ensure immediate progress toast is visible
    this.messageService.add({
      severity: 'info',
      summary: this.activeLanguage === 'ar' ? 'جاري الإرسال' : 'Sending',
      detail: this.activeLanguage === 'ar'
        ? 'جاري إرسال الفاتورة إلى هيئة الزكاة والضريبة والجمارك (ZATCA)...'
        : 'Sending invoice to ZATCA...',
      life: 4000
    });

    this.invoiceService.clearSalesInvoice(Number(this.invoiceId)).subscribe({
      next: (res: any) => {
        this.zatcaSending = false;

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

        this.loadInvoice(this.invoiceId, false);
        this.setupCustomButtons();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.zatcaSending = false;

        if (e === 'OK' || (typeof e?.error?.text === 'string' && e.error.text.includes('cleared'))) {
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم الإرسال بنجاح' : 'Success',
            detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى زاتكا بنجاح' : 'Invoice sent to ZATCA successfully',
            life: 5000
          });
          this.loadInvoice(this.invoiceId, false);
          this.setupCustomButtons();
          this.cdr.detectChanges();
          return;
        }

        // Verify backend status before deciding failure
        this.invoiceService.getInvoiceById(Number(this.invoiceId)).subscribe({
          next: (inv) => {
            if (inv?.isCleared) {
              this.messageService.add({
                severity: 'success',
                summary: this.activeLanguage === 'ar' ? 'تم التأكيد' : 'Confirmed',
                detail: this.activeLanguage === 'ar' ? 'تم التحقق: الفاتورة معتمدة ومسجلة في النظام لدى زاتكا' : 'Verified: Invoice is cleared with ZATCA in the system',
                life: 5000
              });
              this.loadInvoice(this.invoiceId, false);
            } else {
              this.handleZatcaDetailError(e);
            }
            this.setupCustomButtons();
            this.cdr.detectChanges();
          },
          error: () => {
            this.handleZatcaDetailError(e);
            this.setupCustomButtons();
            this.cdr.detectChanges();
          }
        });
      },
      complete: () => {
        this.loading = false;
        this.setupCustomButtons();
      },
    });
  }

  private handleZatcaDetailError(e: any): void {
    const rawMessage: string = e?.error?.message || e?.message || (this.activeLanguage === 'ar' ? 'حدث خطأ أثناء الإرسال' : 'An error occurred while sending');
    let finalMessage = rawMessage;
    const isAr = this.activeLanguage === 'ar';

    if (rawMessage.includes('validationResults')) {
      try {
        const jsonStr = rawMessage.substring(rawMessage.indexOf('{'));
        const zatcaErr = JSON.parse(jsonStr);
        const errors = zatcaErr.validationResults?.errorMessages;
        const warnings = zatcaErr.validationResults?.warningMessages;
        if (errors?.length > 0)
          finalMessage = errors.map((errItem: any) => errItem.message).join('\n');
        else if (warnings?.length > 0)
          finalMessage = warnings.map((w: any) => w.message).join('\n');
      } catch (_) { }
    } else if (rawMessage.includes('|')) {
      const parts = rawMessage.split('|').map((p: string) => p.trim());
      finalMessage = !isAr && parts.length > 1 ? parts[1] : parts[0];
    }

    // Always display the error message toast
    this.messageService.add({
      severity: 'error',
      summary: this.activeLanguage === 'ar' ? 'فشل الإرسال لزاتكا' : 'ZATCA Submission Failed',
      detail: finalMessage,
      life: 7000
    });

    const isCompanyError = /شرك|company/i.test(rawMessage);
    const isCustomerError = /عميل|customer/i.test(rawMessage);
    this.zatcaPreCheck = {
      invoiceType: this.zatcaPreCheck?.invoiceType || 'standard',
      invoiceId: Number(this.invoiceId),
      customerId: this.invoice?.customerProfileId?.toString() || '',
      companyErrors: isCompanyError ? [finalMessage] : [],
      customerErrors: isCustomerError && !isCompanyError ? [finalMessage] : [],
      warnings: !isCompanyError && !isCustomerError ? [finalMessage] : [],
      hasBlockingErrors: isCompanyError || isCustomerError
    };
    this.zatcaPreCheckDialogVisible = true;
    this.loading = false;
    this.zatcaSending = false;
    this.setupCustomButtons();
    this.cdr.detectChanges();
  }

  createCreditNote(): void {
    // Navigate to create credit note page with invoice data
    this.router.navigate(['/sales-credit-notes/new'], { queryParams: { invoiceId: this.invoiceId } });
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

  sendToFrontal(): void {
    if (this.sendingToFrontal || this.isInvoiceFrontal(this.invoice)) {
      return;
    }

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
        if (this.sendingToFrontal) return;
        this.sendingToFrontal = true;
        this.setupCustomButtons();
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'info',
          summary: this.activeLanguage === 'ar' ? 'جاري الإرسال' : 'Sending',
          detail: this.activeLanguage === 'ar'
            ? 'جاري إرسال الفاتورة إلى الواجهة...'
            : 'Sending invoice to Frontal...',
          life: 4000
        });

        this.invoiceService.makeFrontal(Number(this.invoiceId)).subscribe({
          next: () => {
            this.sendingToFrontal = false;
            if (this.invoice) {
              this.invoice.isFrontal = true;
            }
            this.setupCustomButtons();
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('COMMON.SUCCESS'),
              detail: this.activeLanguage === 'ar' ? 'تم إرسال الفاتورة إلى الواجهة بنجاح' : 'Invoice sent to Frontal successfully'
            });
            this.loadInvoice(this.invoiceId);
          },
          error: (error) => {
            this.sendingToFrontal = false;
            this.setupCustomButtons();
            this.cdr.detectChanges();
            console.error('Error making invoice frontal:', error);
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('COMMON.ERROR'),
              detail: this.activeLanguage === 'ar' ? 'حدث خطأ أثناء إرسال الفاتورة إلى الواجهة' : 'Error sending invoice to Frontal'
            });
          }
        });
      }
    });
  }

  shareInvoice(): void {
    const email = this.getCustomerEmail() || '';
    const phone = this.getCustomerPhone() || '';
    if (this.invoiceShareForm) {
      this.invoiceShareForm.reset({
        email: email,
        whatsappNumber: phone,
      });
    }
    this.invoiceShareActiveTabIndex = 0;
    this.invoiceShareDialogVisible = true;
    this.cdr.detectChanges();
  }

  closeInvoiceShareDialog(): void {
    this.invoiceShareDialogVisible = false;
    this.shareBusy = false;
    if (this.invoiceShareForm) {
      this.invoiceShareForm.reset();
    }
    this.cdr.detectChanges();
  }

  submitInvoiceShareEmail(): void {
    const email = (this.invoiceShareForm.get('email')?.value || '').trim();
    if (!email || this.invoiceShareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('COMMON.WARNING') || 'تحذير',
        detail: this.translate.instant('VALIDATION.INVALID_EMAIL') || 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('COMMON.INFO') || 'معلومات',
      detail: this.translate.instant('INVOICE.SENDING_EMAIL'),
    });

    this.closeInvoiceShareDialog();

    this.invoiceService.shareInvoiceByEmail(Number(this.invoiceId), email)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('INVOICE.SENT_SUCCESS') || 'تم الإرسال',
            detail: this.translate.instant('INVOICE.SENT_EMAIL_SUCCESS'),
          });
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR') || 'خطأ',
            detail: this.translate.instant('INVOICE.SHARE_FAILED'),
          });
        },
      });
  }

  submitInvoiceShareWhatsapp(): void {
    const raw = this.invoiceShareForm.get('whatsappNumber')?.value || '';
    const phone = String(raw || '').replace(/\s+/g, '').replace(/^\+/, '');

    if (!phone || this.invoiceShareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('COMMON.WARNING') || 'تحذير',
        detail: 'برجاء إدخال رقم صحيح (8–15 رقم).',
      });
      return;
    }

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    this.invoiceService.shareInvoiceByWhatsapp(Number(this.invoiceId), phone)
      .pipe(finalize(() => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
      }))
      .subscribe({
        next: (res: any) => {
          const whatsAppLink = res?.response?.whatsAppLink || res?.whatsAppLink;
          if (whatsAppLink) {
            window.open(whatsAppLink, '_blank', 'noopener');
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('COMMON.SUCCESS') || 'تم',
              detail: 'تم فتح واتساب بالرسالة الجاهزة.',
            });
            this.closeInvoiceShareDialog();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.instant('COMMON.WARNING') || 'تنبيه',
              detail: 'لم يتم العثور على رابط واتساب في الاستجابة.',
            });
          }
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR') || 'خطأ',
            detail: 'تعذّر مشاركة الفاتورة عبر واتساب.',
          });
        },
      });
  }

  // Setup custom buttons based on invoice state
  setupCustomButtons(): void {
    this.customButtons = [];

    // Add "Create Receipt" button (سند قبض)
    this.customButtons.push({
      label: 'INVOICE.CREATE_RECEIPT',
      icon: 'pi pi-money-bill',
      color: 'success',
      action: () => this.createReceipt(),
      visible: true
    });

    // Add "Payments" button (الدفعات)
    this.customButtons.push({
      label: 'PAYMENTS.ACTION_BUTTON',
      icon: 'pi pi-wallet',
      color: 'info',
      action: () => this.navigateToPayments(),
      visible: true
    });

    // Add "Download PDF" button
    this.customButtons.push({
      label: 'INVOICE.DOWNLOAD_PDF',
      icon: 'pi pi-file-pdf',
      color: 'danger',
      action: () => this.downloadPDF(),
      visible: true
    });


    // Add "Send to ZATCA" button
    const isZatcaInProgress = this.zatcaSending;
    this.customButtons.push({
      label: isZatcaInProgress
        ? (this.activeLanguage === 'ar' ? 'جاري الإرسال...' : 'Sending...')
        : (this.invoice?.isCleared
          ? 'FINANCE.ZATCA_ALREADY_SENT'
          : 'FINANCE.SEND_TO_ZATCA'),
      icon: isZatcaInProgress
        ? 'pi pi-spin pi-spinner'
        : (this.invoice?.isCleared ? 'pi pi-check-circle' : 'pi pi-cloud-upload'),
      color: (this.invoice?.isCleared && !isZatcaInProgress) ? 'secondary' : 'success',
      action: (event: any) => this.sendToZatca(event),
      visible: true,
      disabled: (this.invoice?.isCleared ?? false) || isZatcaInProgress,
      tooltip: isZatcaInProgress
        ? (this.activeLanguage === 'ar' ? 'جاري إرسال الفاتورة إلى زاتكا...' : 'Sending invoice to ZATCA...')
        : (this.invoice?.isCleared
          ? this.translate.instant('FINANCE.ZATCA_ALREADY_SENT')
          : undefined),
    });

    // Add "Create Credit Note" button (إشعار دائن)
    this.customButtons.push({
      label: 'INVOICE.CREATE_CREDIT_NOTE',
      icon: 'pi pi-file-edit',
      color: 'warning',
      action: () => this.createCreditNote(),
      visible: true
    });

    // Add "Send to Frontal" button
    const isFrontal = this.isInvoiceFrontal(this.invoice);
    this.customButtons.push({
      label: this.sendingToFrontal
        ? (this.activeLanguage === 'ar' ? 'جاري الإرسال...' : 'Sending...')
        : (isFrontal
          ? (this.activeLanguage === 'ar' ? 'في الواجهة الأمامية' : 'In Frontal')
          : (this.activeLanguage === 'ar' ? 'إرسال إلى الواجهة' : 'Send To Frontal')),
      icon: this.sendingToFrontal
        ? 'pi pi-spin pi-spinner'
        : (isFrontal ? 'pi pi-check-circle' : 'pi pi-send'),
      color: isFrontal ? 'success' : 'primary',
      action: () => {
        if (!isFrontal && !this.sendingToFrontal) {
          this.sendToFrontal();
        }
      },
      visible: true,
      disabled: isFrontal || this.sendingToFrontal
    });


    // Add "Share" button (مشاركة)
    this.customButtons.push({
      label: 'INVOICE.SHARE',
      icon: 'pi pi-share-alt',
      color: 'info',
      action: () => this.shareInvoice(),
      visible: true
    });
    // Add "Print 3" button (Portrait)
    if (this.hasPermission('SalesInvoice.Print3')) {
      this.customButtons.push({
        label: this.activeLanguage === 'ar' ? 'طباعة 3' : 'Print 3',
        icon: 'pi pi-print',
        color: 'primary',
        action: () => this.printInvoice3(),
        visible: true
      });
    }

    // Add "Print 2" button
    this.customButtons.push({
      label: this.activeLanguage === 'ar' ? 'طباعة 2' : 'Print 2',
      icon: 'pi pi-print',
      color: 'primary',
      action: () => this.printDocument(),
      visible: true
    });
    // Add "View Reservation" button if invoice is linked to a reservation
    if (this.invoice?.reservationId) {
      this.customButtons.push({
        label: 'INVOICE.VIEW_RESERVATION',
        icon: 'pi pi-calendar-check',
        color: 'info',
        action: () => this.router.navigate(['/reservations', this.invoice.reservationId]),
        visible: true
      });
    }
  }

  // Navigate to Payments page
  navigateToPayments(): void {
    this.router.navigate(['/payments'], {
      queryParams: {
        invoiceId: this.invoice?.id,
        invoiceType: 3
      }
    });
  }

  // ============= Navigation Controls =============

  private static cachedInvoiceIds: string[] = [];

  serverTotalCount: number = 0;

  // Load all invoice IDs for navigation
  loadAllInvoiceIds(): void {
    if (InvoiceDetailsComponent.cachedInvoiceIds.length > 0) {
      this.allInvoiceIds = InvoiceDetailsComponent.cachedInvoiceIds;
      this.isNavLoading = false;
      this.updateNavigationControls();
      return;
    }

    this.isNavLoading = true;
    this.invoiceService.getInvoicesPaged(1, 100000).subscribe({
      next: (fullRes) => {
        if (fullRes && fullRes.items && Array.isArray(fullRes.items)) {
          this.allInvoiceIds = fullRes.items.map(inv => String(inv.id));
          InvoiceDetailsComponent.cachedInvoiceIds = this.allInvoiceIds;
          this.serverTotalCount = fullRes.total || fullRes.items.length;
        }
        this.isNavLoading = false;
        this.updateNavigationControls();
      },
      error: () => {
        this.isNavLoading = false;
        this.updateNavigationControls();
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.invoiceId) {
      return;
    }

    const targetIdStr = String(this.invoiceId);
    let matchedIndex = -1;

    if (this.allInvoiceIds.length > 0) {
      matchedIndex = this.allInvoiceIds.findIndex(id => String(id) === targetIdStr);
    }

    if (matchedIndex !== -1) {
      this.currentIndex = matchedIndex;
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allInvoiceIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    } else if (!this.isNavLoading) {
      const matchedNum = this.invoice?.invoiceNo ? this.invoice.invoiceNo.match(/\d+/) : null;
      const displayCurrent = matchedNum ? parseInt(matchedNum[0], 10) : (Number(this.invoiceId) || 1);
      const total = this.allInvoiceIds.length || this.serverTotalCount || displayCurrent;

      this.navigationControls = {
        currentPage: displayCurrent,
        totalPages: Math.max(displayCurrent, total),
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
    this.cdr.markForCheck();
  }

  // Navigate to next invoice
  navigateToNext(): void {
    if (this.allInvoiceIds.length > 0) {
      let targetIdx = this.currentIndex;
      if (targetIdx === -1 && this.invoiceId) {
        targetIdx = this.allInvoiceIds.findIndex(id => String(id) === String(this.invoiceId));
      }
      if (targetIdx !== -1 && targetIdx < this.allInvoiceIds.length - 1) {
        const nextId = this.allInvoiceIds[targetIdx + 1];
        this.router.navigate(['/invoices', nextId]);
      } else if (this.currentIndex === -1) {
        const nextNum = (Number(this.invoiceId) || 0) + 1;
        this.router.navigate(['/invoices', nextNum]);
      }
    }
  }

  // Navigate to previous invoice
  navigateToPrevious(): void {
    if (this.allInvoiceIds.length > 0) {
      let targetIdx = this.currentIndex;
      if (targetIdx === -1 && this.invoiceId) {
        targetIdx = this.allInvoiceIds.findIndex(id => String(id) === String(this.invoiceId));
      }
      if (targetIdx > 0) {
        const prevId = this.allInvoiceIds[targetIdx - 1];
        this.router.navigate(['/invoices', prevId]);
      } else if (this.currentIndex === -1 && Number(this.invoiceId) > 1) {
        const prevNum = Number(this.invoiceId) - 1;
        this.router.navigate(['/invoices', prevNum]);
      }
    }
  }
}
