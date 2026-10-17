import { CommonModule, NgOptimizedImage } from '@angular/common';
import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

import { QrcodeService } from '../../../services/qrcode/qrcode.service';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { PurchaseReturn } from 'src/app/models/purchaseReturn/purchaseReturn';
import { PurchaseReturnService } from 'src/app/services/purchaseReturn/purchase-return.service';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import {TranslationService} from "../../../modules/i18n";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {AttachmentModel} from "../../../models/Attachments/attachment.model";
import {TransactionEntryModel} from "../../../models/accounting/transactionEntry.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {FileUploadModule} from "primeng/fileupload";
import {ToastModule} from "primeng/toast";
import {DialogModule} from "primeng/dialog";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {AttachmentService} from "../../../services/attachments/attachment.service";
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessagesModule } from 'primeng/messages';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import {FormatDecimalPipe} from "../../../pipes/format-decimal.pipe";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { DetailActionsMenuComponent, ActionButton } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { PdfUtilsService } from '../../../services/pdf-utils.service';

@Component({
    imports: [CommonModule, TranslateModule, PrintDocumentComponent, NgOptimizedImage, FileUploadModule, ToastModule, DialogModule, ConfirmDialogModule, MessagesModule, ButtonModule, FormatDecimalPipe, CustomDatePipe, DetailActionsMenuComponent],
  selector: 'app-purchase-return-details',
  standalone: true,
  styleUrls: ['./purchase-return-details.component.scss'],
  templateUrl: './purchase-return-details.component.html',  // Corrected this line,
  providers: [ConfirmationService,MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class PurchaseReturnDetailsComponent implements OnInit {
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
  purchaseReturnSignal = signal<PurchaseReturn>(null)
  get purchaseReturn(){
    return this.purchaseReturnSignal()
  }
  set purchaseReturn(value:PurchaseReturn) {
    this.purchaseReturnSignal.set(value);
  }
  qrCodeUrl: string | ArrayBuffer | null = '';


  translate:TranslateService;
  activeLanguage:string = "en";
  purchaseRetuenID: number;

  constructor(
    private companyDataService: CompanyDetailsService,
    private purchaseReturnService: PurchaseReturnService,
    private qrcodeService: QrcodeService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private primengConfig: PrimeNGConfig,
    private pdfUtils: PdfUtilsService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.docColumns = [
      { field: 'mainPurchaseClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO")},
      { field: 'mainPurchaseClassName', label: this.translate.instant("INVOICE.ITEMNAME") },
      { field: 'storeDetailsName', label: this.translate.instant("INVOICE.INVENTORY") },
      { field: 'mainPurchaseClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT") },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE"), pipe: 'number' },
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL"), pipe: 'number' },
    ];
  }
  ngOnInit(): void {
    this.primengConfig.ripple = true;

    // Subscribe to route params to get the purchaseReturn ID
    this.route.paramMap.subscribe(params => {
      const id = params.get('id'); // Get ID from route params

      if (id) {
        this.purchaseRetuenID = Number.parseInt(id)
        this.loadReturn(Number.parseInt(id))
      }
    });
  }

  loadReturn(id:number){
    this.loading = true
    this.purchaseReturnService.getReturnById(Number(id)).subscribe({
      next:(res)=>{
        this.purchaseReturn = {
          ...res,
          issueDate: new Date(res.issueDate),
          dueDate: new Date(res.dueDate)
        }
        this.docData = this.purchaseReturn.purchaseReturnItems.map(item => ({
          ...item,
          mainPurchaseClassReferenceCode:item.mainPurchaseClass.referenceCode,
          mainPurchaseClassName:this.activeLanguage=="en"?item.mainPurchaseClass.englishName:item.mainPurchaseClass.arabicName,
          mainPurchaseClasMeasurementUnitName:this.activeLanguage=="en"?item.mainPurchaseClass.measurementUnit.englishName:item.mainPurchaseClass.measurementUnit.arabicName,
          storeDetailsName:this.activeLanguage=="en"?item.storeDetails.englishName:item.storeDetails.arabicName,
          totalPreTax:item.quantity*item.price
        }))
        this.setupCustomButtons(); // Setup custom buttons after loading return
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
  printReturn() {
    const el = document.getElementById('purchaseReturnSection');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.activeLanguage === 'ar',
        title: 'Purchase Return'
      });
    }
  }

  getQRCode(url: any): void {
    this.qrcodeService.generateQRCode(url).subscribe(response => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.qrCodeUrl = reader.result;
      };
      reader.readAsDataURL(response);
    });
  }

  getTaxAmount(){
    if (this.purchaseReturn.taxAmount == 0) return 0

    return Math.round(this.purchaseReturn.purchaseReturnItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice(){
    // calculate from items

    return Math.round(this.purchaseReturn.purchaseReturnItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice(){
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }

    // Method to calculate total quantity
    getTotalQuantity(): number {
      return this.purchaseReturn.purchaseReturnItems.reduce((sum, item) => sum + item.quantity, 0);
    }

  confirmPurchaseReturnDeletion(event: Event): void {

    if (this.purchaseRetuenID) {
      this.confirmationService.confirm({
        message: this.translate.instant('DATA.CONFIRM_ENTITY_DELETE'),
        header: this.translate.instant('DATA.ENTITY_DELETE_CONFIRMATION', { entityName: this.purchaseReturn.returnNo }),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass: "btn btn-danger  rounded-md m-4",
        rejectButtonStyleClass: "btn btn-primary rounded-md  m-4",
        acceptLabel: this.translate.instant('DATA.YES'),
        rejectLabel: this.translate.instant('DATA.NO'),
        accept: () => {
          this.purchaseReturnService.deleteReturn(this.purchaseRetuenID).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', detail: this.translate.instant('AUTH.USERS_LOADING_ERROR') })
              this.router.navigateByUrl('purchase-invoices/list');
            },
            error: (err) => {
              console.log('Error deleting invoice:', err);
              this.messageService.add({ severity: 'error', summary: this.translate.instant('AUTH.ERROR'), detail: this.translate.instant('AUTH.USERS_LOADING_ERROR') });
            }
          });
        },
      });
    }
  }

  /*confirmPurchaseReturnDeletion(): void {
    if (this.purchaseRetuenID) {
      this.purchaseReturnService.deleteReturn(this.purchaseRetuenID).subscribe({
        next:(re)=>{
          this.router.navigateByUrl('purchase-returns/list');
        },
        error:(er)=>console.log('error',er)
      });
    }
  }*/

  get attachments(): AttachmentModel[] {
    return this.purchaseReturn?.attachments || [];
  }
  loadAttachments() {
    this.loadReturn(this.purchaseRetuenID)
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
    const purchaseReturnId = this.purchaseRetuenID
    if (!purchaseReturnId) return;
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
      requestData.purchaseReturnId = purchaseReturnId;
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
    const purchaseReturnId = this.purchaseRetuenID;
    if (!purchaseReturnId) return;
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
      requestData.purchaseReturnId = purchaseReturnId;
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
    this.purchaseReturnService.createReturnTransaction(id).subscribe({
      next: () => {
        this.loadReturn(id);
        this.loading = false;
      },
      error: () => {
        alert(this.translate.instant('INVOICE.RETURN_SAVING_ERROR'));
        this.loading = false;
      },
    });
  }

  customButtons: ActionButton[] = [];

  // Action menu handlers
  onPrintClick(): void {
    this.printDocument();
  }
  
  onEditClick(): void {
    this.router.navigate(['/purchase-returns/edit', this.purchaseRetuenID]);
  }
  
  onCopyClick(): void {
    // Navigate to new form with the current return data for copying
    this.router.navigate(['/purchase-returns/new'], { queryParams: { copyFrom: this.purchaseRetuenID } });
  }
  
  onDeleteClick(): void {
    this.confirmPurchaseReturnDeletion(null);
  }
  
  onCreateEntryClick(): void {
    this.createTransaction(this.purchaseRetuenID);
  }
  
  // Setup custom buttons based on transaction state
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Open Transaction" button if transaction exists
    if (this.purchaseReturn?.transactionId) {
      this.customButtons.push({
        label: 'INVOICE.OPEN_TRANSACTION',
        icon: 'pi pi-book',
        color: 'info',
        action: () => this.openTransaction(),
        visible: true
      });
    }
  }
  
  // Open transaction in accounting module
  openTransaction(): void {
    if (this.purchaseReturn?.transactionId) {
      this.router.navigate(['/accounting/journal-transactions/transaction', this.purchaseReturn.transactionId]);
    }
  }
}
