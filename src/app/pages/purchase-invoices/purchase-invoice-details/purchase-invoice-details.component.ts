import { CommonModule, NgOptimizedImage } from '@angular/common';
import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PurchaseInvoice } from 'src/app/models/purchaseInvoice/purchaseInvoice';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { ConfirmationService, MessageService } from "primeng/api";
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {TranslationService} from "../../../modules/i18n";
import {AttachmentModel} from "../../../models/Attachments/attachment.model";
import {TransactionEntryModel} from "../../../models/accounting/transactionEntry.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import { FileUploadModule } from 'primeng/fileupload';
import {AttachmentService} from "../../../services/attachments/attachment.service";
import {ToastModule} from "primeng/toast";
import {DialogModule} from "primeng/dialog";
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessagesModule } from 'primeng/messages';
import { TooltipModule } from 'primeng/tooltip';
import {FormatDecimalPipe} from "../../../pipes/format-decimal.pipe";
import { CustomDatePipe } from "../../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { PdfUtilsService } from '../../../services/pdf-utils.service';


@Component({
  selector: 'app-purchase-invoice-details',
  standalone: true,
    imports: [CommonModule, TranslateModule, PrintDocumentComponent, FileUploadModule, ToastModule, DialogModule, ConfirmDialogModule, MessagesModule, ButtonModule, FormatDecimalPipe, CustomDatePipe, BackButtonComponent, TooltipModule],
  templateUrl: './purchase-invoice-details.component.html',
  styleUrls: ['./purchase-invoice-details.component.scss'],
  providers: [ConfirmationService,MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class PurchaseInvoiceDetailsComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

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

  printDocument() {
    this.printComponent.triggerPrint();
  }


  loadingSignal = signal<boolean>(false);

  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }

  invoiceSignal = signal<PurchaseInvoice>(null)
  get invoice() {
    return this.invoiceSignal()
  }
  set invoice(value: PurchaseInvoice) {
    this.invoiceSignal.set(value);
  }
  translate: TranslateService;
  activeLanguage: string = "en";

  invoiceID: number
  
  // Navigation properties
  allInvoices: PurchaseInvoice[] = [];
  currentInvoiceIndex = signal(0);
  viewSingleInvoice = signal(false);
  isFrontal = false;
  constructor(
    private companyDataService: CompanyDetailsService,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer,
    private confirmationService: ConfirmationService,
    private pdfUtils: PdfUtilsService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    this.docColumns = [
      { field: 'mainPurchaseClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO"), cellClass: 'text-center' },
      { field: 'mainPurchaseClassName', label: this.translate.instant("INVOICE.ITEMNAME"), width: '220px' },
      { field: 'storeDetailsName', label: this.translate.instant("INVOICE.INVENTORY"), width: '80px', cellClass: 'text-center' },
      { field: 'mainPurchaseClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT"), cellClass: 'text-center' },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE") , pipe: 'number'},
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number', width: '90px' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL"), pipe: 'number' },
    ];
  }

  ngOnInit(): void {
    this.loading = true
    
    // Check if navigation mode is disabled via query params (default is enabled)
    this.route.queryParamMap.subscribe(queryParams => {
      const navigationMode = queryParams.get('navigationMode');
      
      // Navigation mode is now the default (enabled unless explicitly disabled)
      if (navigationMode === 'false') {
        // Single invoice view (explicitly disabled navigation)
        this.viewSingleInvoice.set(true);
        this.route.paramMap.subscribe(params => {
          const id = params.get('id');
          if (id) {
            this.loadInvoice(Number.parseInt(id))
          }
        });
      } else {
        // Load all invoices for navigation (default behavior)
        this.viewSingleInvoice.set(false);
        this.loadAllInvoices();
      }
    });
    
    // Fetch company details
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        this.companyDetails = companyData[0];
      },
      error: (error) => {
        console.error("Error fetching company details:", error);
      }
    });
  }

  loadInvoice(id:number) {
    this.invoiceID = id
    this.purchaseInvoiceService.getInvoiceById(+id).subscribe(
      invoiceData => {
        this.invoice = {
          ...invoiceData,
          issueDate: new Date(invoiceData.issueDate),
          dueDate: new Date(invoiceData.dueDate)
        }
        console.log("Invoice Data:", this.invoice); // Add this log to debug
        this.docData = invoiceData.purchaseItems.map(item => ({
          ...item,
          mainPurchaseClassReferenceCode: item.mainPurchaseClass.referenceCode,
          mainPurchaseClassName: this.activeLanguage == "en" ? item.mainPurchaseClass.englishName : item.mainPurchaseClass.arabicName,
          mainPurchaseClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainPurchaseClass.measurementUnit.englishName : item.mainPurchaseClass.measurementUnit.arabicName,
          storeDetailsName: this.activeLanguage == "en" ? item.storeDetails.englishName : item.storeDetails.arabicName,
          totalPreTax: item.quantity * item.price,
        }))
        console.log("Invoice Data:", this.invoice); // Add this log to debug
        this.loading = false
      },
      error => {
        console.error("Error fetching invoice:", error); // Log the error
      }
    );
  }

  // Load all invoices for navigation
  loadAllInvoices(): void {
    this.loading = true;
    const loadMethod = this.isFrontal 
      ? this.purchaseInvoiceService.getAllFrontalInvoices()
      : this.purchaseInvoiceService.getAllInvoices();
    
    loadMethod.subscribe({
      next: (invoices) => {
        this.allInvoices = invoices || [];
        
        if (this.allInvoices.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('INVOICE.WARNING'),
            detail: this.translate.instant('INVOICE.NO_INVOICES')
          });
          this.loading = false;
          this.router.navigate([this.isFrontal ? '/purchase-invoices/frontal-list' : '/purchase-invoices/list']);
          return;
        }
        
        // Check if there's a specific invoice ID in the route params
        this.route.paramMap.subscribe(params => {
          const id = params.get('id');
          if (id) {
            const index = this.allInvoices.findIndex(inv => inv.id === Number.parseInt(id));
            if (index >= 0) {
              this.currentInvoiceIndex.set(index);
            } else {
              this.currentInvoiceIndex.set(0);
            }
          } else {
            this.currentInvoiceIndex.set(0);
          }
          
          this.loadInvoice(this.allInvoices[this.currentInvoiceIndex()].id);
        });
      },
      error: (err) => {
        console.error('Error loading invoices', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('INVOICE.ERROR'),
          detail: this.translate.instant('INVOICE.ERROR_LOADING_INVOICES')
        });
        this.loading = false;
      }
    });
  }

  // Navigation methods
  canGoNext(): boolean {
    if (this.viewSingleInvoice()) return false;
    return this.currentInvoiceIndex() < this.allInvoices.length - 1;
  }

  canGoPrevious(): boolean {
    if (this.viewSingleInvoice()) return false;
    return this.currentInvoiceIndex() > 0;
  }

  nextInvoice(): void {
    if (this.viewSingleInvoice()) return;
    const current = this.currentInvoiceIndex();
    if (current < this.allInvoices.length - 1) {
      this.currentInvoiceIndex.set(current + 1);
      this.loadInvoice(this.allInvoices[current + 1].id);
    }
  }

  previousInvoice(): void {
    if (this.viewSingleInvoice()) return;
    const current = this.currentInvoiceIndex();
    if (current > 0) {
      this.currentInvoiceIndex.set(current - 1);
      this.loadInvoice(this.allInvoices[current - 1].id);
    }
  }

  getCurrentInvoiceNumber(): string {
    if (this.viewSingleInvoice()) return `1 / 1`;
    return `${this.currentInvoiceIndex() + 1} / ${this.allInvoices.length}`;
  }

  printInvoice() {
    const el = document.getElementById('invoiceSection');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.activeLanguage === 'ar',
        title: 'Purchase Invoice'
      });
    }
  }

  editInvoice(): void {
    if (this.invoiceID) {
      if (this.isFrontal) {
        this.router.navigate(['/purchase-invoices/frontal-edit', this.invoiceID]);
      } else {
        this.router.navigate(['/purchase-invoices/edit', this.invoiceID]);
      }
    }
  }

  copyInvoice(): void {
    if (!this.invoiceID) return;
    
    const route = this.isFrontal
      ? '/purchase-invoices/frontal-new'
      : '/purchase-invoices/new';
    
    this.router.navigate([route], { queryParams: { copyId: this.invoiceID } });
  }

  makeFrontal(): void {
    if (!this.invoiceID || this.invoice.isFrontal) return;
    
    this.loading = true;
    this.purchaseInvoiceService.makeFrontal(this.invoiceID.toString()).subscribe({
      next: (data) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('INVOICE.SUCCESS'),
          detail: this.translate.instant('INVOICE.SENT_TO_FRONTAL')
        });
        this.loadInvoice(this.invoiceID);
      },
      error: (err) => {
        console.error('Error making invoice frontal:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('INVOICE.ERROR'),
          detail: this.translate.instant('INVOICE.ERROR_SENDING_TO_FRONTAL')
        });
        this.loading = false;
      }
    });
  }

  getFrontalText(): string {
    return this.translate.instant('INVOICE.IN_FRONTAL');
  }

  viewTransaction(): void {
    if (this.invoice.transactionId) {
      window.open(`/accounting/journal-transactions/transaction/${this.invoice.transactionId}`, '_blank');
    }
  }

  getTaxAmount() {
    if (this.invoice.taxAmount == 0) return 0

    return Math.round(this.invoice.purchaseItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice() {
    // calculate from items

    return Math.round(this.invoice.purchaseItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }

  confirmInvoiceDeletion(event: Event): void {
    if (this.invoiceID) {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('DATA.CONFIRM_ENTITY_DELETE'),
        header: this.translate.instant('DATA.ENTITY_DELETE_CONFIRMATION', { entityName: this.invoice.invoiceNo }),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass: "btn btn-primary rounded-md m-4",
        rejectButtonStyleClass: "btn btn-danger rounded-md m-4",
        acceptLabel: this.translate.instant('DATA.YES'),
        rejectLabel: this.translate.instant('DATA.NO'),
        accept: () => {
          this.purchaseInvoiceService.deleteInvoice(this.invoiceID).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('INVOICE.SUCCESS'),
                detail: this.translate.instant('INVOICE.INVOICE_DELETED_SUCCESS'),
              });
              // Navigate to list page after a short delay to show the message
              setTimeout(() => {
                this.router.navigateByUrl('purchase-invoices/list');
              }, 1000);
            },
            error: (err) => {
              console.log('Error deleting invoice:', err);
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('INVOICE.ERROR'),
                detail: this.translate.instant('INVOICE.INVOICE_DELETE_ERROR'),
              });
            }
          });
        },
      });
    }
  }


  get attachments(): AttachmentModel[] {
    return this.invoice?.attachments || [];
  }
  loadAttachments() {
    this.loadInvoice(this.invoiceID);
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

  onUpdate(event: any,pdf: AttachmentModel) {
    const purchaseInvoiceId = this.invoiceID;
    if (!purchaseInvoiceId) return;
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
      requestData.purchaseInvoiceId = purchaseInvoiceId;
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
    const purchaseInvoiceId = this.invoiceID;
    if (!purchaseInvoiceId) return;
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
      requestData.purchaseInvoiceId = purchaseInvoiceId;
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

  createTransaction(id: number) {
    this.loading = true;
    this.purchaseInvoiceService.createInvoiceTransaction(id).subscribe({
      next: () => {
        this.loadInvoice(id);
        this.loading = false;
      },
      error: () => {
        alert(this.translate.instant('INVOICE.INVOICE_SAVING_ERROR'));
        this.loading = false;
      },
    });
  }
}



// private fetchProductAndUnitNames(): void {
//   // Assuming there's only one item for simplicity. Adjust this if you have multiple items
//   const item = this.invoice?.purchaseItems[0]; // Get the first item; change as needed

//   if (item && item.mainPurchaseClassId) {
//     // Fetch product details using the purchase class ID
//     this.purchaseClassService.getById(item.mainPurchaseClassId).subscribe((product: MainPurchaseClassModel) => {
//       this.productName = product.arabicName; // Get product name
//       this.unitName = product.measurementUnit?.arabicSymbol || 'Unknown'; // Get unit name

//       this.cdr.detectChanges(); // Trigger change detection
//     }, error => {
//       console.error('Error fetching product data', error);
//     });
//   }
// }



