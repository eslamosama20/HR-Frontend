import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, effect, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { FormsModule } from '@angular/forms';  // Import FormsModule
import { SharedModule } from "../../../../_metronic/shared/shared.module";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SalesCreditNotesService } from 'src/app/services/notes/sales-credit-notes.service';
import { SalesCreditNoteModel } from 'src/app/models/notes/salesCreditNote.model';
import { TranslationService } from 'src/app/modules/i18n';
import {Table, TableModule} from "primeng/table";
import {ButtonModule} from "primeng/button";
import {InputTextModule} from "primeng/inputtext";
import {RadioButtonModule} from "primeng/radiobutton";
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { faL } from '@fortawesome/free-solid-svg-icons';
import {FormatDecimalPipe} from "../../../../pipes/format-decimal.pipe";
import { ToastModule } from 'primeng/toast';
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {ConfirmationService, MessageService} from "primeng/api";
import {CustomDatePipe} from "../../../../pipes/custom-date.pipe";
import {OverlayPanel} from "primeng/overlaypanel";
import { AuthService } from 'src/app/modules/auth';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-sales-credit-note-list',
  standalone: true,
    imports: [CommonModule, RadioButtonModule, SharedModule, TranslateModule, PrintDocumentComponent, FormsModule, RouterLink, TableModule, ButtonModule, InputTextModule, OverlayPanelModule, FormatDecimalPipe,
        ConfirmDialogModule,
        ToastModule, CustomDatePipe,
    ],  // Add FormsModule here
  templateUrl: './sales-credit-note-list.component.html',
  styleUrl: './sales-credit-note-list.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class SalesCreditNoteListComponent implements OnInit {
  PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  salesCreditNotesSignal = signal<any[]>([]);
  get salesCreditNotes() {
    return this.salesCreditNotesSignal();
  }
  set salesCreditNotes(value: any[]) {
    this.salesCreditNotesSignal.set(value);
  }

  salesCreditNoteSignal = signal<SalesCreditNoteModel>(null)
  get salesCreditNote() {
    return this.salesCreditNoteSignal()
  }
  set salesCreditNote(value: SalesCreditNoteModel) {
    this.salesCreditNoteSignal.set(value);
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

  filteredSalesCreditNotesSignal = signal<SalesCreditNoteModel[]>([]);

  get filteredSalesCreditNotes() {
    return this.filteredSalesCreditNotesSignal();
  }
  set filteredSalesCreditNotes(value: SalesCreditNoteModel[]) {
    this.filteredSalesCreditNotesSignal.set(value);
  }
  columns!: Column[];

  selectedSalesCreditNotes: any[] = [];
  isOpen: { [key: string]: boolean } = {};



  searchText: string = '';  // Search text entered by the user
  activeLanguage: string;  // Language setting
  translate:TranslateService;
  constructor(
    private companyDataService: CompanyDetailsService,
    private salesCreditNoteService: SalesCreditNotesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;

    this.columns = [
      {field: 'salesCreditNoteNo', header: "رقم السند", filter: true , filterType: 'text'},
      {field: 'invoiceNo', header: "رقم الفاتورة", filter: true , filterType: 'text'},

      {field: 'customerProfileName', header: this.translate.instant('FINANCE.CUSTOMER_PROFILE'), filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('INVOICE.DESCRIPTION'), filter: true , filterType: 'text'},
      {field: 'isCleared', header: this.translate.instant('INVOICE.IS_CLEARED'), filter: true , filterType: 'boolean'},
      {field: 'issueDate', header: this.translate.instant('INVOICE.ISSUE_DATE'), filter: true , filterType: 'date'},
      {field: 'adjustmentReason', header: "سبب الإشعار", filter: true , filterType: 'text'},
      {field: 'totalAmount', header: this.translate.instant('INVOICE.TOTAL'), filter: true , filterType: 'number'},
      {field: 'totalAmountAfterTax', header: this.translate.instant('INVOICE.TOTALWITHTAX'), filter: true , filterType: 'number'},
    ];

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

    effect(() => {
      this.filterSalesCreditNotes(this.transactionsFilterTypeSignal());
    }, { allowSignalWrites: true });

  }

  ngOnInit(): void {
    // Load all salesCreditNotes on component initialization
    this.loadSalesCreditNotes();
    this.cdr.detectChanges()

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


  loadSalesCreditNotes(): void {
    this.loading = true;
    this.salesCreditNoteService.getAll().subscribe(salesCreditNotes => {
      if (salesCreditNotes) {
        this.salesCreditNotes = salesCreditNotes.map(salesCreditNote => {
          const totalAmount = this.getTotalPrice(salesCreditNote);
          const netPrice = this.getNetPrice(salesCreditNote);
          return {
            ...salesCreditNote,
            issueDate: new Date(salesCreditNote.issueDate),
            dueDate: new Date(salesCreditNote.dueDate),
            totalAmount: netPrice,
            totalAmountAfterTax: totalAmount,
            customerProfileName: this.activeLanguage == "en" ? salesCreditNote.customerProfile.englishName : salesCreditNote.customerProfile.arabicName,
            invoiceNo: salesCreditNote.saleInvoice.invoiceNo,
          }
        });
      }
      this.loading = false;
      this.filteredSalesCreditNotes = this.salesCreditNotes;  // Initialize filtered salesCreditNotes
      this.cdr.detectChanges();
    });
  }

  // Method to filter salesCreditNotes based on the search input
  filterSalesCreditNotes(transactionsFilterType: string): void {
    if (transactionsFilterType === 'all') {
      this.filteredSalesCreditNotes = this.salesCreditNotes;
    }
    else if (transactionsFilterType === 'connected') {
      this.filteredSalesCreditNotes = this.salesCreditNotes.filter(salesCreditNote =>
        salesCreditNote.transactionId !== null
      );
    }
    else if (transactionsFilterType === 'notconnected') {
      this.filteredSalesCreditNotes = this.salesCreditNotes.filter(salesCreditNote =>
        salesCreditNote.transactionId === null
      );
    }
  }

  deleteSalesCreditNote(id?: string): void {
    if (id) {
      this.salesCreditNoteService.delete(id).subscribe({
        next: () => {
          this.salesCreditNotes = this.salesCreditNotes.filter(salesCreditNote => salesCreditNote.id !== id);
          this.filteredSalesCreditNotes = this.filteredSalesCreditNotes.filter(salesCreditNote => salesCreditNote.id !== id);  // Update filteredSalesCreditNotes
          
          // Close the overlay panel after successful delete
          if (this.opSalesCreditNote) {
            this.opSalesCreditNote.hide();
          }
          
          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('COMMON.SUCCESS'),
            detail: this.translate.instant('NOTES.CREDIT_NOTE_DELETED_SUCCESSFULLY')
          });
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.log('Error deleting salesCreditNote:', err);
          
          // Close overlay even on error
          if (this.opSalesCreditNote) {
            this.opSalesCreditNote.hide();
          }
          
          // Show error message
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR'),
            detail: this.translate.instant('NOTES.CREDIT_NOTE_DELETE_FAILED')
          });
        }
      });
    }
  }

  viewSalesCreditNote(id?: string): void {
    this.router.navigate(['/sales-credit-notes', id]);
  }

  editSalesCreditNote(id?: string): void {
    if (id) {
      this.router.navigate(['/sales-credit-notes/edit', id]);
    }
  }

  addSalesCreditNote() {
    this.router.navigate(['/sales-credit-notes/new']);
  }

  onRowClick(entry: any): void {
    if (entry && entry.id) {
      this.router.navigate(['/sales-credit-notes', entry.id]);
    }
  }

  loadingStates: { [id: string]: boolean } = {}; // Track loading states by salesCreditNote ID

  createTransaction(id: string) {
    this.loadingStates[id] = true;

    this.salesCreditNoteService.createSalesCreditNoteTransaction(id).subscribe({
      next: () => {
        this.loadSalesCreditNotes();
      },
      error: () => {
        alert(this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'));
      },
      complete: () => {
        // Set the loading state to false after the request finishes
        this.loadingStates[id] = false;
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
    const trimmedValue = target.value.trim();
    dt1.filterGlobal(trimmedValue, 'contains')
  }

  printSalesCreditNote(salesCreditNoteId: string): void {
    this.loading = true;

    this.salesCreditNoteService.getById(salesCreditNoteId).subscribe((salesCreditNoteData) => {
      this.docData = salesCreditNoteData.salesCreditNoteItems.map(item => ({
        ...item,
        mainSalesClassReferenceCode: item.mainSalesClass.referenceCode,
        mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass.englishName : item.mainSalesClass.arabicName,
        mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass.measurementUnit.englishName : item.mainSalesClass.measurementUnit.arabicName,
        totalPreTax: this.getItemNetPrice(item),
        taxAmount: this.getItemTaxAmount(item),
        totalPrice: this.getItemTotalPrice(item),
      }));

      console.log(this.docData);

      this.salesCreditNote = salesCreditNoteData;
      this.getTaxAmount(salesCreditNoteData);
      this.getNetPrice(salesCreditNoteData);

      // Ensure the DOM is updated before printing
      this.cdr.detectChanges();
      setTimeout(() => {
        this.printComponent.triggerPrint();
        this.loading = false;
        this.cdr.detectChanges();

      }, 0); // Allow DOM updates to complete
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
    // Logic to delete all selected salesCreditNotes
    this.selectedSalesCreditNotes.forEach((salesCreditNote) => {
      if (salesCreditNote.isCleared) return;
      this.deleteSalesCreditNote(salesCreditNote.id);
    });
    this.selectedSalesCreditNotes = [];
  }

  createTransactionForAll(): void {
    // Logic to create transactions for all selected salesCreditNotes
    this.selectedSalesCreditNotes.forEach((salesCreditNote) => {
      if (salesCreditNote.transactionId !== null) return;
      this.createTransaction(salesCreditNote?.id);
    });
  }

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

  getTotalPrice(salesCreditNote) {
    // calculate from items
    return Math.round(this.getNetPrice(salesCreditNote) *100) / 100 + Math.round(this.getTaxAmount(salesCreditNote) *100) / 100
  }

  confirmClearSalesCreditNote(event:any,salesCreditNoteId:string) {
    this.loading = true;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: "هل أنت متأكد من الارسال الى Zatca ؟",
      header: `التأكيد`,
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      accept: () => {
        this.clearSalesCreditNote(salesCreditNoteId);
      },
    });
  }

  clearSalesCreditNote(id:string) {
    this.loading = true;
    this.salesCreditNoteService.clearSalesCreditNote(id).subscribe({
      next:()=>{
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'تم الارسال الى Zatca بنجاح'
        });
        this.loadSalesCreditNotes();
        this.loading = false;

      },
      error:(e)=>{
        if (e === "OK") {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'تم الارسال الى Zatca بنجاح'
          });
          this.loadSalesCreditNotes();
          this.loading = false;
          return
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ اثتاء الربط'
        });
        this.loadSalesCreditNotes();
        this.loading = false;

      },
      complete:()=>{
        this.loading = false;
      }
    });
  }
  @ViewChild('opSalesCreditNote') opSalesCreditNote!: OverlayPanel;
selectedSalesCreditNote: any;

openOverlaySalesCreditNote(event: MouseEvent, entry: any) {
  event.preventDefault();
  
  // Check if we're switching to a different sales credit note
  const isDifferentNote = this.selectedSalesCreditNote?.id !== entry.id;
  const isCurrentlyVisible = this.opSalesCreditNote.overlayVisible;
  
  // Update selected sales credit note
  this.selectedSalesCreditNote = entry;
  
  // If overlay is open and we're clicking a different note, keep it open and update content
  // Otherwise, toggle normally
  if (isCurrentlyVisible && isDifferentNote) {
    // Don't toggle, just reposition for the new note
    // The overlay stays open but updates content
  } else {
    // Normal toggle behavior
    this.opSalesCreditNote.toggle(event);
  }

  setTimeout(() => {
    const panelEl = this.opSalesCreditNote.container as HTMLElement;
    if (panelEl) {
      panelEl.style.position = 'fixed';
      panelEl.style.left = `${event.clientX}px`;
      panelEl.style.top = `${event.clientY}px`;
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

