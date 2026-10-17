import {CommonModule, NgOptimizedImage} from '@angular/common';
import {ChangeDetectorRef, Component, OnInit, signal, ViewChild} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { QrcodeService } from '../../../services/qrcode/qrcode.service';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { Invoice } from 'src/app/models/invoice/invoice';
import { InvoiceService } from 'src/app/services/invoice/invoice-service.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import {TranslationService} from "../../../modules/i18n";
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { PdfUtilsService } from '../../../services/pdf-utils.service';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quotation-details',
  standalone: true,
  imports: [CommonModule, TranslateModule, PrintDocumentComponent, NgOptimizedImage, CustomDatePipe, BackButtonComponent, DetailActionsMenuComponent, ToastModule, ConfirmDialogModule, FormsModule],
  templateUrl: './quotation-details.component.html',
  styleUrls: ['./quotation-details.component.scss'],  // Corrected this line
  providers: [MessageService, ConfirmationService]
})
export class QuotationDetailsComponent implements OnInit {
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
  invoiceSignal = signal<SalesInvoice>(null)
  get invoice(){
    return this.invoiceSignal()
  }
  set invoice(value:SalesInvoice) {
    this.invoiceSignal.set(value);
  }
  qrCodeUrl: string | ArrayBuffer | null = '';


  translate:TranslateService;
  activeLanguage:string = "en";
  showStamp: boolean = true;
  showPolicies: boolean = true;
  showBankAccount: boolean = true;
  stampCollapsed: boolean = true;
  policiesCollapsed: boolean = true;
  bankAccountCollapsed: boolean = true;
  signaturesCollapsed: boolean = true;
  anyPolicyChecked: boolean = true;
  anyBankChecked: boolean = true;
  selectedPolicies: { id: string, name: string, nameEn: string, checked: boolean }[] = [];
  selectedBanks: { id: string, bankName: string, bankNameEn: string, accountName: string, accountNumber: string, iban: string, swiftCode?: string, checked: boolean }[] = [];
  showCompanySignature: boolean = true;
  showCustomerSignature: boolean = true;
  customButtons: ActionButton[] = [];
  quotationId: string;
  
  // Navigation controls for action menu
  allQuotationIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  
  constructor(
    private companyDataService: CompanyDetailsService,
    private invoiceService: SalesInvoiceService,
    private qrcodeService: QrcodeService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private printSettingsService: PrintSettingsService,
    private pdfUtils: PdfUtilsService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.docColumns = [
      { field: 'printRowNo',                  header: 'م',          headerEn: 'No',        width: '30px', cellClass: 'text-center' },
      { field: 'mainSalesClassName',          header: 'الصنف',      headerEn: 'Item Name', width: '50%' },
      { field: 'mainSalesClasMeasurementUnitName', header: 'الوحدة', headerEn: 'Unit',     width: '45px', cellClass: 'text-center' },
      { field: 'quantity',  header: 'الكمية',     headerEn: 'Qty',       width: '45px', pipe: 'number', cellClass: 'text-center' },
      { field: 'price',     header: 'السعر',      headerEn: 'Price',     width: '65px', pipe: 'number', cellClass: 'text-center' },
      { field: 'totalPreTax', header: 'إجمالي قبل الضريبة', headerEn: 'Total Before Tax', width: '80px', pipe: 'number', cellClass: 'text-center' },
      { field: 'taxAmount', header: 'الضريبة',    headerEn: 'Tax',       width: '65px', pipe: 'number', cellClass: 'text-center' },
      { field: 'totalPrice',header: 'الإجمالي',   headerEn: 'Total',     width: '80px', pipe: 'number', cellClass: 'text-center' },
    ];
  }
  ngOnInit(): void {
    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();

    // Load all quotation IDs once on init for navigation
    this.loadAllQuotationIds();
    
    // Subscribe to route params to get the quotation ID
    this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId) {
        this.quotationId = newId;
        this.loadInvoice(newId);
        // Update navigation controls when route changes
        this.updateNavigationControls();
      }
    });
    this.setupCustomButtons(); // Setup custom buttons
  }

  loadInvoice(id:string){
    this.loading = true
    this.invoiceService.getInvoiceById(Number(id)).subscribe({
      next:(res)=>{
        this.invoice = res;
        this.docData = res.saleItems.map(item => ({
          ...item,
          mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode || '',
          mainSalesClassName: (item.mainSalesClass?.referenceCode ? item.mainSalesClass.referenceCode + ' - ' : '') + 
            (this.activeLanguage === 'en' ? item.mainSalesClass?.englishName || '' : item.mainSalesClass?.arabicName || ''),
          mainSalesClasMeasurementUnitName: this.activeLanguage === 'en'
            ? item.mainSalesClass?.measurementUnit?.englishSymbol || ''
            : item.mainSalesClass?.measurementUnit?.arabicSymbol || '',
          totalPreTax: item.netPrice ?? (item.quantity * item.price)
        }))
        this.setupCustomButtons(); // Refresh buttons after loading data
        this.loading = false;
      },
      error: error => alert(error)
    });
      this.companyDataService.getAll().subscribe({
        next:(companyData) => {
         this.companyDetails = companyData[0];
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
        error:(error) => {
          console.error("Error fetching company details:", error);
        }
     });
  }

  getDepartmentName(): string {
    if (!this.invoice || !this.invoice.customerProfile || !this.invoice.customerDepartmentId) return '';
    const dept = this.invoice.customerProfile.departments?.find(d => d.id === this.invoice.customerDepartmentId);
    if (!dept) return '';
    return this.activeLanguage === 'en' ? (dept.nameEn || dept.nameAr) : dept.nameAr;
  }

  onPolicyToggle() {
    this.selectedPolicies = [...this.selectedPolicies];
    this.anyPolicyChecked = this.selectedPolicies.some(p => p.checked);
    const uncheckedIds = this.selectedPolicies.filter(p => !p.checked).map(p => p.id);
    this.printSettingsService.setUncheckedPolicies(uncheckedIds);
    setTimeout(() => {
      this.printComponent?.paginateTable();
    }, 100);
  }

  onBankToggle() {
    this.selectedBanks = [...this.selectedBanks];
    this.anyBankChecked = this.selectedBanks.some(b => b.checked);
    const uncheckedIds = this.selectedBanks.filter(b => !b.checked).map(b => b.id);
    this.printSettingsService.setUncheckedBanks(uncheckedIds);
    setTimeout(() => {
      this.printComponent?.paginateTable();
    }, 100);
  }

  onShowStampChange(value: boolean): void {
    this.showStamp = value;
    this.printSettingsService.setShowStamp(value);
  }

  onShowCompanySignatureChange(value: boolean): void {
    this.showCompanySignature = value;
    this.printSettingsService.setShowCompanySignature(value);
  }

  onShowCustomerSignatureChange(value: boolean): void {
    this.showCustomerSignature = value;
    this.printSettingsService.setShowCustomerSignature(value);
  }

  printInvoice() {
    const el = document.getElementById('invoiceSection');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.activeLanguage === 'ar',
        title: 'Quotation'
      });
    }
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

  // Action menu handlers
  onPrintClick(): void {
    this.printDocument();
  }
  
  onEditClick(): void {
    this.router.navigate(['/quotations/edit', this.quotationId]);
  }
  
  onCopyClick(): void {
    // Navigate to new form with the current quotation data for copying
    this.router.navigate(['/quotations/frontal-new'], { queryParams: { copyFrom: this.quotationId } });
  }
  
  onDeleteClick(event?: Event): void {
    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: this.translate.instant('INVOICE.QUOTATION_CONFIRM_DELETE'),
      header: this.translate.instant('INVOICE.QUOTATION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.invoiceService.deleteInvoice(Number(this.quotationId)).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: this.translate.instant('COMMON.SUCCESS'), 
              detail: this.translate.instant('INVOICE.QUOTATION_DELETED_SUCCESSFULLY') 
            });
            this.router.navigate(['/quotations/list']);
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: this.translate.instant('COMMON.ERROR'), 
              detail: this.translate.instant('INVOICE.QUOTATION_DELETE_FAILED') 
            });
          }
        });
      },
    });
  }
  
  // Setup custom buttons
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Create Invoice" button only if quotation hasn't been converted yet
    const hasBeenConverted = this.invoice?.convertedToInvoiceId;
    
    if (!hasBeenConverted) {
      this.customButtons.push({
        label: 'INVOICE.CREATE_INVOICE',
        icon: 'pi pi-file-plus',
        color: 'success',
        action: () => this.createInvoiceFromQuotation(),
        visible: true
      });
    }
  }
  
  // Create Invoice from Quotation
  createInvoiceFromQuotation(): void {
    if (!this.quotationId) return;
    
    this.loading = true;
    this.invoiceService.convertQuotationToInvoice(Number(this.quotationId)).subscribe({
      next: (invoice) => {
        this.loading = false;
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: `تم تحويل عرض السعر إلى فاتورة مبيعات رقم ${invoice.invoiceNo}`
        });
        // Navigate to the newly created invoice
        this.router.navigate(['/invoices', invoice.id]);
      },
      error: (error) => {
        this.loading = false;
        console.error('فشل تحويل عرض السعر إلى فاتورة:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: 'فشل تحويل عرض السعر إلى فاتورة'
        });
      }
    });
  }
  
  // ============= Navigation Controls =============
  
  // Load all quotation IDs for navigation
  loadAllQuotationIds(): void {
    this.invoiceService.getAllQuotationInvoices().subscribe({
      next: (quotations) => {
        this.allQuotationIds = quotations.map(q => q.id.toString());
        this.updateNavigationControls();
        this.cdr.detectChanges(); // Trigger change detection
      },
      error: (err) => {
        console.error('Error loading quotation IDs', err);
      }
    });
  }
  
  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.quotationId || this.allQuotationIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }
    
    this.currentIndex = this.allQuotationIds.indexOf(this.quotationId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allQuotationIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
      this.cdr.detectChanges(); // Trigger change detection after updating controls
    }
  }
  
  // Navigate to next quotation
  navigateToNext(): void {
    if (this.currentIndex < this.allQuotationIds.length - 1) {
      const nextId = this.allQuotationIds[this.currentIndex + 1];
      this.router.navigate(['/quotations', nextId]);
    }
  }
  
  // Navigate to previous quotation
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allQuotationIds[this.currentIndex - 1];
      this.router.navigate(['/quotations', prevId]);
    }
  }
}
