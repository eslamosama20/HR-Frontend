import {CommonModule, NgOptimizedImage} from '@angular/common';
import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';

import { QrcodeService } from '../../../../services/qrcode/qrcode.service';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { SalesCreditNoteModel } from 'src/app/models/notes/salesCreditNote.model';
import { SalesCreditNotesService } from 'src/app/services/notes/sales-credit-notes.service';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import {TranslationService} from "../../../../modules/i18n";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PrintDocumentComponent} from "../../../../shared-components/print-document/print-document.component";
import {CompanyDetailsService} from "../../../../services/inventory/company-details.service";
import {AttachmentModel} from "../../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {FileUploadModule} from "primeng/fileupload";
import {DialogModule} from "primeng/dialog";
import {ConfirmationService, MessageService} from "primeng/api";
import {AttachmentService} from "../../../../services/attachments/attachment.service";
import {ToastModule} from "primeng/toast";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {FormatDecimalPipe} from "../../../../pipes/format-decimal.pipe";
import {QRCodeModule} from "angularx-qrcode";
import {SalesInvoiceService} from "../../../../services/salesInvoice/sales-invoice.service";
import {CustomDatePipe} from "../../../../pipes/custom-date.pipe";
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Router } from '@angular/router';
import {BackButtonComponent} from "../../../../shared-components/back-button/back-button.component";

@Component({
  selector: 'app-sales-credit-note-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, PrintDocumentComponent, FileUploadModule, DialogModule, ToastModule, ConfirmDialogModule, FormatDecimalPipe, QRCodeModule, RouterLink, CustomDatePipe, DetailActionsMenuComponent, BackButtonComponent],
  templateUrl: './sales-credit-note-details.component.html',
  styleUrls: ['./sales-credit-note-details.component.scss'] , // Corrected this line
  providers: [ MessageService, ConfirmationService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class SalesCreditNoteDetailsComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

  companyDetailsSignal = signal<CompanyDetailsModel>(null)
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal=signal<any[]>([])
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  docDataSignal=signal<any>(null)
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

  get loading(){
    return this.loadingSignal()
  }
  set loading(value:boolean){
    this.loadingSignal.set(value)
  }
  salesCreditNoteSignal = signal<SalesCreditNoteModel>(null)
  get salesCreditNote(){
    return this.salesCreditNoteSignal()
  }
  set salesCreditNote(value:SalesCreditNoteModel) {
    this.salesCreditNoteSignal.set(value);
  }
  qrCodeUrl: string | ArrayBuffer | null = '';

  // Custom buttons for action menu
  customButtons: ActionButton[] = [];
  
  // Navigation controls for action menu
  allCreditNoteIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;

  translate:TranslateService;
  activeLanguage:string = "en";
  constructor(
    private companyDataService: CompanyDetailsService,
    private salesCreditNoteService: SalesCreditNotesService,
    private salesInvoiceService: SalesInvoiceService,
    private qrcodeService: QrcodeService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.docColumns = [
      { field: 'mainSalesClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO") },
      { field: 'mainSalesClassName', label: this.translate.instant("INVOICE.ITEMNAME") },
      { field: 'mainSalesClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT") },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      //{ field: 'noOfNights', label: this.translate.instant("INVOICE.NO_OF_NIGHTS"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE") , pipe: 'number'},
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL") , pipe: 'number'},
    ];
  }

  salesCreditNoteId: string;
  ngOnInit(): void {
    // Load all credit note IDs once on init for navigation
    this.loadAllCreditNoteIds();
    
    // Subscribe to route params to get the salesCreditNote ID
    this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId) {
        this.salesCreditNoteId = newId;
        this.loadSalesCreditNote(newId);
        // Update navigation controls when route changes
        this.updateNavigationControls();
      }
    });
  }

  loadSalesCreditNote(id:string){
    this.loading = true
    this.salesCreditNoteService.getById(id).subscribe({
      next:(res)=>{
        console.log("salesCreditNote",res)
        res.issueDate = new Date(res.issueDate);
        res.dueDate = new Date(res.dueDate);
        this.salesCreditNote = res
        this.loadSaleInvoice(res.saleInvoiceId)

        this.docData = res.salesCreditNoteItems.map(item => ({
          ...item,
          mainSalesClassReferenceCode:item.mainSalesClass.referenceCode,
          mainSalesClassName:this.activeLanguage=="en"?item.mainSalesClass.englishName:item.mainSalesClass.arabicName,
          mainSalesClasMeasurementUnitName:this.activeLanguage=="en"?item.mainSalesClass.measurementUnit.englishName:item.mainSalesClass.measurementUnit.arabicName,
          totalPreTax: this.getItemTotalPrice(item),
          taxAmount: this.getItemTaxAmount(item),
          totalPrice: this.getItemTotalPrice(item),
        }))
        this.setupCustomButtons(); // Setup custom buttons after credit note is loaded
        this.loading = false;
      },
      error: error => alert(error)
    });
     // Fetch company details
     this.companyDataService.getAll().subscribe({
       next:(companyData) => {
        this.companyDetails = companyData[0];
        },
        error:(error) => {
          console.error("Error fetching company details:", error);
        }
     });
  }
  saleInvoiceSignal = signal<any>(null)
  get saleInvoice(){
    return this.saleInvoiceSignal()
  }
  set saleInvoice(value:any) {
    this.saleInvoiceSignal.set(value);
  }
  loadSaleInvoice(id:number){
    this.loading = true
    this.salesInvoiceService.getInvoiceById(id).subscribe({
      next:(res)=>{
        console.log("saleInvoice",res)
        this.saleInvoice = res
        this.cdr.detectChanges();
      },
      error: error => {
        console.log('Error Loading Sale Invoice', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('INVOICE.ERROR'), detail: this.translate.instant('INVOICE.SALESINVOICES_LOADING_ERROR') });
        this.loading = false;
      }
    });
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
    return Math.round(this.getItemNetPrice(item) * 100) / 100 + Math.round(this.getItemTaxAmount(item) * 100) / 100
  }


  // ngOnInit(): void {

  //   // this.route.paramMap.subscribe(params => {
  //   //   const id = params.get('id');
  //   //   if (id) {
  //   //     this.salesCreditNoteService.getSalesCreditNoteById(+id).subscribe(data => {
  //   //       this.salesCreditNote = data;
  //   //     });
  //   //   }
  //   // });


  //   this.route.paramMap.subscribe(params => {
  //     const id = params.get('id');
  //     if (id) {
  //       this.salesCreditNoteService.getSalesCreditNoteById(+id).subscribe(data => {
  //         this.salesCreditNote = data;
  //         this.cdr.detectChanges();
  //       })
  //       this.getQRCode(window.location.href);
  //     }
  //   })
  // }



  getTaxAmount(salesCreditNote) {
    // If there was explicitly no tax to collect, bail early
    if (salesCreditNote.taxAmount === 0) return 0;

    // 1) Compute each item's raw subtotal and the grand total
    const subtotals = salesCreditNote.salesCreditNoteItems.map(item =>
      item.price * item.quantity * item.noOfNights
    );
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    // 2) Pull in the discount
    const discount = salesCreditNote.discountAmount || 0;

    // 3) For each item: compute its share of discount, then its tax
    let totalTax = 0;
    salesCreditNote.salesCreditNoteItems.forEach((item, idx) => {
      const itemSubtotal = subtotals[idx];

      // Determine tax rate based on mainSalesClass
      const isExempt = item.mainSalesClass?.isTaxExempted;
      const taxRate = isExempt ? 0 : 0.15;

      // Allocate discount proportionally
      const itemDiscount = grossTotal > 0
        ? (itemSubtotal / grossTotal) * discount
        : 0;

      // Taxable base = remaining after discount
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);

      totalTax += taxableBase * taxRate;
    });

    // 4) Round and return
    return Math.round(totalTax * 100) / 100;
  }


  getNetPrice(salesCreditNote) {
    // calculate from items
    const netTotal = salesCreditNote.salesCreditNoteItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity * item.noOfNights),
      0
    );
    const discount = salesCreditNote.discountAmount || 0;
    const discountedTotal = netTotal - discount;
    return Math.round(discountedTotal * 100) / 100;
  }

  getTotalPrice(salesCreditNote){
    // calculate from items
    return Math.round(this.getNetPrice(salesCreditNote) * 100) / 100 + Math.round(this.getTaxAmount(salesCreditNote) * 100) / 100
  }



/*
  get attachments(): AttachmentModel[] {
    return this.salesCreditNote?.attachments || [];
  }
  loadAttachments() {
    this.loadSalesCreditNote(this.salesCreditNoteId)
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
  }*/


  /*onView(pdf: AttachmentModel) {
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
    const saleSalesCreditNoteId = this.salesCreditNoteId
    if (!saleSalesCreditNoteId) return;
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
      requestData.saleSalesCreditNoteId = Number(saleSalesCreditNoteId);
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
    const saleSalesCreditNoteId = this.salesCreditNoteId;
    if (!saleSalesCreditNoteId) return;
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
      requestData.saleSalesCreditNoteId = Number(saleSalesCreditNoteId);
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
  }*/

  createTransaction(id: string): void {
    this.salesCreditNoteService.createSalesCreditNoteTransaction(id).subscribe({
      next: (result) => {
        this.loadSalesCreditNote(id.toString());  // Reload salesCreditNotes after transaction creation
      },
      error: (er) => {
        alert(this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));
      }
    });
  }

  // Setup custom buttons
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Open Transaction" button if transaction exists
    if (this.salesCreditNote?.transactionId) {
      this.customButtons.push({
        label: 'INVOICE.OPEN_TRANSACTION',
        icon: 'pi pi-book',
        color: 'info',
        action: () => this.openTransaction(),
        visible: true
      });
    }
    
    // Add "Open Invoice" button if linked to an invoice
    if (this.salesCreditNote?.saleInvoiceId) {
      this.customButtons.push({
        label: 'INVOICE.OPEN_INVOICE',
        icon: 'pi pi-file',
        color: 'primary',
        action: () => this.openInvoice(),
        visible: true
      });
    }
    
    // Add "Send to ZATCA" button
    this.customButtons.push({
      label: 'INVOICE.SEND_TO_ZATCA',
      icon: 'pi pi-cloud-upload',
      color: 'success',
      action: () => this.sendToZatca(),
      visible: true
    });
  }

  // Action menu handlers
  onPrintClick(): void {
    this.printDocument();
  }
  
  onEditClick(): void {
    this.router.navigate(['/sales-credit-notes/edit', this.salesCreditNoteId]);
  }
  
  onCopyClick(): void {
    this.router.navigate(['/sales-credit-notes/new'], { queryParams: { copyFrom: this.salesCreditNoteId } });
  }
  
  onDeleteClick(event?: Event): void {
    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: this.translate.instant('INVOICE.CONFIRM_DELETE'),
      header: this.translate.instant('INVOICE.DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.loading = true;
        
        this.salesCreditNoteService.delete(this.salesCreditNoteId).subscribe({
          next: () => {
            // WORKAROUND: Store deleted ID in localStorage since backend doesn't set isActive=false
            const deletedIds = JSON.parse(localStorage.getItem('deletedCreditNotes') || '[]');
            if (!deletedIds.includes(this.salesCreditNoteId)) {
              deletedIds.push(this.salesCreditNoteId);
              localStorage.setItem('deletedCreditNotes', JSON.stringify(deletedIds));
            }
            
            this.messageService.add({ 
              severity: 'success', 
              summary: this.translate.instant('COMMON.SUCCESS'), 
              detail: this.translate.instant('NOTES.CREDIT_NOTE_DELETED_SUCCESSFULLY') 
            });
            
            this.loading = false;
            
            // Force full page reload to bypass Angular's component caching
            setTimeout(() => {
              window.location.href = '/sales-credit-notes/list';
            }, 500);
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: this.translate.instant('COMMON.ERROR'), 
              detail: this.translate.instant('NOTES.CREDIT_NOTE_DELETE_FAILED') 
            });
            this.loading = false;
          }
        });
      }
    });
  }
  
  onCreateEntryClick(): void {
    this.createTransaction(this.salesCreditNoteId);
  }
  
  // Custom button actions
  openTransaction(): void {
    if (this.salesCreditNote?.transactionId) {
      this.router.navigate(['/accounting/journal-transactions/transaction', this.salesCreditNote.transactionId]);
    }
  }
  
  openInvoice(): void {
    if (this.salesCreditNote?.saleInvoiceId) {
      this.router.navigate(['/invoices', this.salesCreditNote.saleInvoiceId]);
    }
  }
  
  sendToZatca(): void {
    // TODO: Implement ZATCA integration
    this.messageService.add({ 
      severity: 'info', 
      summary: this.translate.instant('COMMON.INFO'), 
      detail: 'ZATCA integration coming soon' 
    });
  }
  
  // ============= Navigation Controls =============
  
  // Load all credit note IDs for navigation
  loadAllCreditNoteIds(): void {
    this.salesCreditNoteService.getAll().subscribe({
      next: (creditNotes) => {
        this.allCreditNoteIds = creditNotes.map(note => note.id.toString());
        this.updateNavigationControls();
        this.cdr.detectChanges(); // Trigger change detection
      },
      error: (err) => {
        console.error('Error loading credit note IDs', err);
      }
    });
  }
  
  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.salesCreditNoteId || this.allCreditNoteIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }
    
    this.currentIndex = this.allCreditNoteIds.indexOf(this.salesCreditNoteId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allCreditNoteIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
      this.cdr.detectChanges(); // Trigger change detection after updating controls
    }
  }
  
  // Navigate to next credit note
  navigateToNext(): void {
    if (this.currentIndex < this.allCreditNoteIds.length - 1) {
      const nextId = this.allCreditNoteIds[this.currentIndex + 1];
      this.router.navigate(['/sales-credit-notes', nextId]);
    }
  }
  
  // Navigate to previous credit note
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allCreditNoteIds[this.currentIndex - 1];
      this.router.navigate(['/sales-credit-notes', prevId]);
    }
  }
}



