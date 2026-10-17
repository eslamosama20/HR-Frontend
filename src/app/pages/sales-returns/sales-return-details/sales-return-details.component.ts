import {CommonModule, NgOptimizedImage} from '@angular/common';
import {ChangeDetectorRef, Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { QrcodeService } from '../../../services/qrcode/qrcode.service';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { SalesReturn } from 'src/app/models/salesReturn/salesReturn';
import { SalesReturnService } from 'src/app/services/salesReturn/sales-return.service';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import {TranslationService} from "../../../modules/i18n";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {AttachmentModel} from "../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {MessageService} from "primeng/api";
import {FileUploadModule} from "primeng/fileupload";
import {DialogModule} from "primeng/dialog";
import {AttachmentService} from "../../../services/attachments/attachment.service";
import {ToastModule} from "primeng/toast";
import {FormatDecimalPipe} from "../../../pipes/format-decimal.pipe";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent, ActionButton } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Router } from '@angular/router';
import { PdfUtilsService } from '../../../services/pdf-utils.service';

@Component({
  selector: 'app-sales-return-details',
  standalone: true,
    imports: [CommonModule, TranslateModule, PrintDocumentComponent, NgOptimizedImage, FileUploadModule, DialogModule, ToastModule, FormatDecimalPipe, CustomDatePipe, BackButtonComponent, DetailActionsMenuComponent],
  templateUrl: './sales-return-details.component.html',
  styleUrls: ['./sales-return-details.component.scss'] , // Corrected this line
  providers: [ MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]

})
export class SalesReturnDetailsComponent implements OnInit {
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
  salesReturnSignal = signal<SalesReturn>(null)
  get salesReturn(){
    return this.salesReturnSignal()
  }
  set salesReturn(value:SalesReturn) {
    this.salesReturnSignal.set(value);
  }
  qrCodeUrl: string | ArrayBuffer | null = '';


  translate:TranslateService;
  activeLanguage:string = "en";
  customButtons: ActionButton[] = [];
  
  constructor(
    private companyDataService: CompanyDetailsService,
    private salesReturnService: SalesReturnService,
    private qrcodeService: QrcodeService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
    private messageService: MessageService,
    private router: Router,
    private pdfUtils: PdfUtilsService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.docColumns = [
      { field: 'mainSalesClassReferenceCode', label: this.translate.instant("INVOICE.ITEMNO")},
      { field: 'mainSalesClassName', label: this.translate.instant("INVOICE.ITEMNAME") },
      { field: 'mainSalesClasMeasurementUnitName', label: this.translate.instant("INVOICE.UNIT") },
      { field: 'quantity', label: this.translate.instant("INVOICE.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("INVOICE.PRICE"), pipe: 'number' },
      { field: 'totalPreTax', label: this.translate.instant("INVOICE.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("INVOICE.TAX") , pipe: 'number'},
      { field: 'totalPrice', label: this.translate.instant("INVOICE.TOTAL") , pipe: 'number'},
    ];
  }

  returnId: string;
  ngOnInit(): void {
    // Subscribe to route params to get the salesReturn ID
    this.route.paramMap.subscribe(params => {
      const id = params.get('id'); // Get ID from route params
      this.returnId=id;
      if (id) {
        this.loadReturn(id)
      }
    });
  }

  loadReturn(id:string){
    this.loading = true
    this.salesReturnService.getReturnById(Number(id)).subscribe({
      next:(res)=>{
        this.salesReturn = {
          ...res,
          issueDate: new Date(res.issueDate),
          dueDate: new Date(res.dueDate)
        }
        this.docData = this.salesReturn.salesReturnItems.map(item => ({
          ...item,
          mainSalesClassReferenceCode:item.mainSalesClass.referenceCode,
          mainSalesClassName:this.activeLanguage=="en"?item.mainSalesClass.englishName:item.mainSalesClass.arabicName,
          mainSalesClasMeasurementUnitName:this.activeLanguage=="en"?item.mainSalesClass.measurementUnit.englishName:item.mainSalesClass.measurementUnit.arabicName,
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
    const el = document.getElementById('salesReturnSection');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.activeLanguage === 'ar',
        title: 'Sales Return'
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
    if (this.salesReturn.taxAmount == 0) return 0

    return Math.round(this.salesReturn.salesReturnItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice(){
    // calculate from items

    return Math.round(this.salesReturn.salesReturnItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice(){
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }





  get attachments(): AttachmentModel[] {
    return this.salesReturn?.attachments || [];
  }
  loadAttachments() {
    this.loadReturn(this.returnId)
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
    const salesReturnId = this.returnId
    if (!salesReturnId) return;
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
      requestData.salesReturnId = Number(salesReturnId);
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
    const salesReturnId = this.returnId;
    if (!salesReturnId) return;
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
      requestData.salesReturnId = Number(salesReturnId);
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
    this.salesReturnService.createReturnTransaction(id).subscribe({
      next: () => {
        this.loadReturn(id.toString());
        this.loading = false;
      },
      error: () => {
        alert(this.translate.instant('INVOICE.RETURN_SAVING_ERROR'));
        this.loading = false;
      },
    });
  }

  // Action menu handlers
  onPrintClick(): void {
    this.printDocument();
  }
  
  onEditClick(): void {
    this.router.navigate(['/sales-returns/edit', this.returnId]);
  }
  
  onCopyClick(): void {
    // Navigate to new form with the current return data for copying
    this.router.navigate(['/sales-returns/new'], { queryParams: { copyFrom: this.returnId } });
  }
  
  onDeleteClick(): void {
    if (confirm(this.translate.instant('RETURN.CONFIRM_DELETE'))) {
      this.salesReturnService.deleteReturn(Number(this.returnId)).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: this.translate.instant('COMMON.SUCCESS'), 
            detail: this.translate.instant('RETURN.DELETED_SUCCESSFULLY') 
          });
          this.router.navigate(['/sales-returns/list']);
        },
        error: (err) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: this.translate.instant('COMMON.ERROR'), 
            detail: this.translate.instant('RETURN.DELETE_FAILED') 
          });
        }
      });
    }
  }
  
  onCreateEntryClick(): void {
    this.createTransaction(Number(this.returnId));
  }
  
  // Setup custom buttons based on transaction state
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Open Transaction" button if transaction exists
    if (this.salesReturn?.transactionId) {
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
    if (this.salesReturn?.transactionId) {
      this.router.navigate(['/accounting/journal-transactions/transaction', this.salesReturn.transactionId]);
    }
  }
}
