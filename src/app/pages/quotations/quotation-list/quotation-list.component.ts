import {CommonModule, NgOptimizedImage} from '@angular/common';
import {ChangeDetectorRef, Component, effect, OnInit, signal, ViewChild} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { FormsModule } from '@angular/forms';  // Import FormsModule
import { SharedModule } from "../../../_metronic/shared/shared.module";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from 'src/app/modules/i18n';
import {Table, TableModule} from "primeng/table";
import {ButtonModule} from "primeng/button";
import {InputTextModule} from "primeng/inputtext";
import {RadioButtonModule} from "primeng/radiobutton";
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DialogModule } from 'primeng/dialog';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { faL } from '@fortawesome/free-solid-svg-icons';
import {FormatDecimalPipe} from "../../../pipes/format-decimal.pipe";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import {OverlayPanel} from "primeng/overlaypanel";
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-quotation-list',
  standalone: true,
    imports: [CommonModule, RadioButtonModule, SharedModule, TranslateModule, PrintDocumentComponent, FormsModule, TableModule, ButtonModule, InputTextModule, OverlayPanelModule, DialogModule, NgOptimizedImage, FormatDecimalPipe, CustomDatePipe,
    ],  // Add FormsModule here
  templateUrl: './quotation-list.component.html',
  styleUrl: './quotation-list.component.scss'
})
export class QuotationListComponent implements OnInit {
  PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  @ViewChild('printComponent') printComponent: PrintDocumentComponent;
  quotationsSignal = signal<SalesInvoice[]>([]);
  get quotations() {
    return this.quotationsSignal();
  }
  set quotations(value: SalesInvoice[]) {
    this.quotationsSignal.set(value);
  }

  quotationSignal = signal<SalesInvoice>(null)
  get quotation() {
    return this.quotationSignal()
  }
  set quotation(value: SalesInvoice) {
    this.quotationSignal.set(value);
  }

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


  transactionsFilterTypeSignal = signal<string>("all");
  get transactionsFilterType() {
    return this.transactionsFilterTypeSignal();
  }
  set transactionsFilterType(value: string) {
    this.transactionsFilterTypeSignal.set(value);
  }

  filteredQuotationsSignal = signal<SalesInvoice[]>([]);

  get filteredQuotations() {
    return this.filteredQuotationsSignal();
  }
  set filteredQuotations(value: SalesInvoice[]) {
    this.filteredQuotationsSignal.set(value);
  }
  columns!: Column[];

  selectedQuotations: any[] = [];
  isOpen: { [key: string]: boolean } = {};
  showStamp: boolean = true;
  anyPolicyChecked: boolean = true;
  anyBankChecked: boolean = true;
  selectedPolicies: { id: string, name: string, nameEn: string, checked: boolean }[] = [];
  selectedBanks: { id: string, bankName: string, bankNameEn: string, accountNumber: string, iban: string, accountName: string, swiftCode?: string, checked: boolean }[] = [];
  showCompanySignature: boolean = true;
  showCustomerSignature: boolean = true;



  searchText: string = '';  // Search text entered by the user
  activeLanguage: string;  // Language setting
  translate:TranslateService;
  constructor(
    private companyDataService: CompanyDetailsService,
    private salesInvoiceService: SalesInvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private printSettingsService: PrintSettingsService,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;

    this.columns = [
      {field: 'quotationNo', header: this.translate.instant('INVOICE.QUOTATION_NO'), filter: true , filterType: 'text'},
      {field: 'customerProfileName', header: this.translate.instant('FINANCE.CUSTOMER_PROFILE'), filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('INVOICE.DESCRIPTION'), filter: true , filterType: 'text'},
      {field: 'issueDate', header: this.translate.instant('INVOICE.ISSUE_DATE'), filter: true , filterType: 'date'},
      {field: 'totalAmount', header: this.translate.instant('INVOICE.TOTAL'), filter: true , filterType: 'number'},
      {field: 'totalAmountAfterTax', header: this.translate.instant('INVOICE.TOTALWITHTAX'), filter: true , filterType: 'number'},
    ];

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

    // Load all quotations on component initialization
    this.loadQuotations();
    this.cdr.detectChanges()

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


  loadQuotations(): void {
    this.loading = true;
    this.salesInvoiceService.getAllQuotationInvoices().subscribe(quotations => {
      if (quotations) {
        this.quotations = quotations.map(quotation => {
          const totalAmount = Math.round(quotation.saleItems.reduce(
            (total, item) =>
              total + (item.price * item.quantity),
            0
          ) * 100) / 100
          return {
            ...quotation,
            issueDate: new Date(quotation.issueDate),
            dueDate: new Date(quotation.dueDate),
            totalAmount: totalAmount,
            totalAmountAfterTax: quotation.taxAmount > 0 ? totalAmount + Math.round((totalAmount * 0.15) * 100) / 100 : totalAmount,
            customerProfileName: this.activeLanguage == "en" ? quotation.customerProfile.englishName : quotation.customerProfile.arabicName,
          }
        });
      }
      this.loading = false;
      this.filteredQuotations = this.quotations;  // Initialize filtered quotations
      this.cdr.detectChanges();
    });
  }


  deleteQuotation(id?: number): void {
    if (id) {
      this.salesInvoiceService.deleteInvoice(id).subscribe({
        next:(re)=>{
          this.quotations = this.quotations.filter(invoice => invoice.id !== id);
          this.filteredQuotations = this.filteredQuotations.filter(invoice => invoice.id !== id);  // Update filteredInvoices
          this.opQuotation.hide();
          this.cdr.detectChanges();
        },
        error:(er)=>console.log('error',er)
      });
    }
  }

  viewQuotation(id?: number): void {
    this.router.navigate(['/quotations', id]);
  }

  editQuotation(id?: number): void {
    if (id) {
      this.router.navigate(['/quotations/edit', id]);
    }
  }

  addQuotation() {
    this.router.navigate(['/quotations/new']);
  }

  onRowClick(entry: any): void {
    if (entry && entry.id) {
      this.router.navigate(['/quotations', entry.id]);
    }
  }

  loadingStates: { [id: number]: boolean } = {}; // Track loading states by quotation ID
  createInvoice(id: number): void {
    if (!id) return;
    
    this.loadingStates[id] = true;
    this.salesInvoiceService.convertQuotationToInvoice(id).subscribe({
      next: (invoice) => {
        this.loadingStates[id] = false;
        console.log('تم تحويل عرض السعر إلى فاتورة مبيعات رقم', invoice.invoiceNo);
        // Refresh the list to show the updated quotation with the converted indicator
        this.loadQuotations();
      },
      error: (error) => {
        this.loadingStates[id] = false;
        console.error('فشل تحويل عرض السعر إلى فاتورة:', error);
      }
    });
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }

  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains')
  }

  printQuotationId: number | null = null;

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

  printInvoice(quotationId: number): void {
    this.loading = true;
    this.printQuotationId = quotationId;
    this.cdr.detectChanges();

    this.salesInvoiceService.getInvoiceById(quotationId).subscribe((quotationData) => {
      this.docData = quotationData.saleItems.map(item => ({
        ...item,
        mainSalesClassReferenceCode: item.mainSalesClass?.referenceCode || '',
        mainSalesClassName: (item.mainSalesClass?.referenceCode ? item.mainSalesClass.referenceCode + ' - ' : '') + 
          (this.activeLanguage === 'en' ? item.mainSalesClass?.englishName || '' : item.mainSalesClass?.arabicName || ''),
        mainSalesClasMeasurementUnitName: this.activeLanguage === 'en'
          ? item.mainSalesClass?.measurementUnit?.englishSymbol || ''
          : item.mainSalesClass?.measurementUnit?.arabicSymbol || '',
        totalPreTax: item.quantity * item.price,
        totalPrice: item.totalPrice
      }));

      this.quotation = quotationData;
      this.getTaxAmount();
      this.getNetPrice();

      this.cdr.detectChanges();
      
      // Execute fast print immediately using top panel settings
      setTimeout(() => {
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.printComponent.triggerPrint();
        }, 50);
      }, 300); // Allow DOM updates to complete and render HTML safely in background
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
    console.log( Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')))
    const stylesheetLink = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
      .map((link:any) => `<link href="${link.href}" rel="stylesheet">`)
      .join('');
    if (this.activeLanguage === 'ar') {
      document.body.dir = 'rtl'; // Set direction to RTL if language is Arabic
    }
    const newDocument = document.implementation.createHTMLDocument('Print Document');
    newDocument.write(document.documentElement.outerHTML);
    newDocument.close();
    newDocument.body.innerHTML = printContent || '';
    newDocument.head.innerHTML = stylesheetLink;

    return newDocument.documentElement.outerHTML;
  }



  deleteAll(): void {
    // Logic to delete all selected quotations
    this.selectedQuotations.forEach((quotation) => {
      this.deleteQuotation(quotation.id);
    });
    this.selectedQuotations = [];
  }


  getTaxAmount() {
    if (this.quotation.taxAmount == 0) return 0

    return Math.round(this.quotation.saleItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice() {
    // calculate from items

    return Math.round(this.quotation.saleItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }
  @ViewChild('opQuotation') opQuotation!: OverlayPanel;
selectedQuotation: any;

  openOverlayQuotation(event: MouseEvent, entry: any) {
    event.preventDefault();
    const isVisible = this.opQuotation.overlayVisible;
    const isDifferent = this.selectedQuotation?.id !== entry.id;
    this.selectedQuotation = entry;

    if (isVisible && isDifferent) {
      this.opQuotation.show(event);
    } else {
      this.opQuotation.toggle(event);
    }

    setTimeout(() => {
      const panelEl = this.opQuotation.container as HTMLElement;
      if (panelEl) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        // Prevent overflowing the right edge
        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 10;
        }
        // Prevent overflowing the left edge
        if (left < 10) {
          left = 10;
        }

        // Prevent overflowing the bottom edge
        if (top + panelRect.height > viewportHeight) {
          top = viewportHeight - panelRect.height - 10;
        }
        // Prevent overflowing the top edge
        if (top < 10) {
          top = 10;
        }

        panelEl.style.position = 'fixed';
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
      }
    });
  }


}

function containsStringInObject(obj: any, searchString: string): boolean {
  if (!obj || typeof obj !== 'object') return false;  // Ensure obj is valid
  return Object.values(obj).some(value =>
    typeof value === 'string' && value.toLowerCase().includes(searchString)
  );

}

