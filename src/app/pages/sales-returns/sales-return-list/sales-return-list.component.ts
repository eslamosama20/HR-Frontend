import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, effect, OnInit, signal, ViewChild} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { FormsModule } from '@angular/forms';  // Import FormsModule
import { SharedModule } from "../../../_metronic/shared/shared.module";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SalesReturnService } from 'src/app/services/salesReturn/sales-return.service';
import { SalesReturn } from 'src/app/models/salesReturn/salesReturn';
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
import {FormatDecimalPipe} from "../../../pipes/format-decimal.pipe";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";

import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-sales-return-list',
  standalone: true,
    imports: [CommonModule, RadioButtonModule, SharedModule, TranslateModule, PrintDocumentComponent, FormsModule, RouterLink, TableModule, ButtonModule, InputTextModule, OverlayPanelModule, FormatDecimalPipe, CustomDatePipe,
    ],  // Add FormsModule here
  templateUrl: './sales-return-list.component.html',
  styleUrl: './sales-return-list.component.scss'
})
export class SalesReturnListComponent implements OnInit {
  PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  salesReturnsSignal = signal<SalesReturn[]>([]);
  get salesReturns() {
    return this.salesReturnsSignal();
  }
  set salesReturns(value: SalesReturn[]) {
    this.salesReturnsSignal.set(value);
  }

  salesReturnSignal = signal<SalesReturn>(null)
  get salesReturn() {
    return this.salesReturnSignal()
  }
  set salesReturn(value: SalesReturn) {
    this.salesReturnSignal.set(value);
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

  filteredReturnsSignal = signal<SalesReturn[]>([]);

  get filteredReturns() {
    return this.filteredReturnsSignal();
  }
  set filteredReturns(value: SalesReturn[]) {
    this.filteredReturnsSignal.set(value);
  }
  columns!: Column[];

  selectedReturns: any[] = [];
  isOpen: { [key: string]: boolean } = {};



  searchText: string = '';  // Search text entered by the user
  activeLanguage: string;  // Language setting
  translate:TranslateService;
  constructor(
    private companyDataService: CompanyDetailsService,
    private salesReturnService: SalesReturnService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;

    this.columns = [
      {field: 'salesReturnNo', header: this.translate.instant('RETURN.RETURNNO'), filter: true , filterType: 'text'},
      {field: 'customerProfileName', header: this.translate.instant('FINANCE.CUSTOMER_PROFILE'), filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('RETURN.DESCRIPTION'), filter: true , filterType: 'text'},
      {field: 'issueDate', header: this.translate.instant('RETURN.ISSUE_DATE'), filter: true , filterType: 'date'},
      {field: 'totalAmount', header: this.translate.instant('RETURN.TOTAL'), filter: true , filterType: 'number'},
      {field: 'totalAmountAfterTax', header: this.translate.instant('RETURN.TOTALWITHTAX'), filter: true , filterType: 'number'},
    ];

    this.docColumns = [
      { field: 'mainSalesClassReferenceCode', label: this.translate.instant("RETURN.ITEMNO") },
      { field: 'mainSalesClassName', label: this.translate.instant("RETURN.ITEMNAME") },
      { field: 'mainSalesClasMeasurementUnitName', label: this.translate.instant("RETURN.UNIT") },
      { field: 'quantity', label: this.translate.instant("RETURN.QUANTITY"), pipe: 'number' },
      { field: 'price', label: this.translate.instant("RETURN.PRICE") , pipe: 'number'},
      { field: 'totalPreTax', label: this.translate.instant("RETURN.TOTAL_PRE_TAX"), pipe: 'number' },
      { field: 'taxAmount', label: this.translate.instant("RETURN.TAX"), pipe: 'number' },
      { field: 'totalPrice', label: this.translate.instant("RETURN.TOTAL") , pipe: 'number'},
    ];

    effect(() => {
      this.filterReturns(this.transactionsFilterTypeSignal());
    }, { allowSignalWrites: true });

  }

  ngOnInit(): void {
    // Load all salesReturns on component initialization
    this.loadReturns();
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


  loadReturns(): void {
    this.loading = true;
    this.salesReturnService.getAllReturns().subscribe(salesReturns => {
      if (salesReturns) {
        this.salesReturns = salesReturns.map(salesReturn => {
          const totalAmount = Math.round(salesReturn.salesReturnItems.reduce(
            (total, item) =>
              total + (item.price * item.quantity),
            0
          ) * 100) / 100
          return {
            ...salesReturn,
            issueDate: new Date(salesReturn.issueDate),
            dueDate: new Date(salesReturn.dueDate),
            totalAmount: totalAmount,
            totalAmountAfterTax: salesReturn.taxAmount > 0 ? totalAmount + Math.round((totalAmount * 0.15) * 100) / 100 : totalAmount,
            customerProfileName: this.activeLanguage == "en" ? salesReturn.customerProfile.englishName : salesReturn.customerProfile.arabicName,
          }
        });
      }
      this.loading = false;
      this.filteredReturns = this.salesReturns;  // Initialize filtered salesReturns
      this.cdr.detectChanges();
    });
  }

  // Method to filter salesReturns based on the search input
  filterReturns(transactionsFilterType: string): void {
    if (transactionsFilterType === 'all') {
      this.filteredReturns = this.salesReturns;
    }
    else if (transactionsFilterType === 'connected') {
      this.filteredReturns = this.salesReturns.filter(salesReturn =>
        salesReturn.transactionId !== null
      );
    }
    else if (transactionsFilterType === 'notconnected') {
      this.filteredReturns = this.salesReturns.filter(salesReturn =>
        salesReturn.transactionId === null
      );
    }
  }

  deleteReturn(id?: number): void {
    if (id) {
      this.salesReturnService.deleteReturn(id).subscribe({
        next: () => {
          this.salesReturns = this.salesReturns.filter(salesReturn => salesReturn.id !== id);
          this.filteredReturns = this.filteredReturns.filter(salesReturn => salesReturn.id !== id);  // Update filteredReturns
          this.cdr.detectChanges();
        },
        error: (err) => console.log('Error deleting salesReturn:', err)
      });
    }
  }

  viewReturn(id?: number): void {
    this.router.navigate(['/sales-returns', id]);
  }

  editReturn(id?: number): void {
    if (id) {
      this.router.navigate(['/sales-returns/edit', id]);
    }
  }

  addReturn() {
    this.router.navigate(['/sales-returns/new']);
  }

  loadingStates: { [id: number]: boolean } = {}; // Track loading states by salesReturn ID

  createTransaction(id: number) {
    this.loadingStates[id] = true;

    this.salesReturnService.createReturnTransaction(id).subscribe({
      next: () => {
        this.loadReturns();
      },
      error: () => {
        alert(this.translate.instant('RETURN.CHECK_ACCOUNTS_SALES_RETURN'));
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
    dt1.filterGlobal(target.value, 'contains')
  }

  printReturn(salesReturnId: number): void {
    this.loading = true;

    this.salesReturnService.getReturnById(salesReturnId).subscribe((salesReturnData) => {
      this.docData = salesReturnData.salesReturnItems.map(item => ({
        ...item,
        mainSalesClassReferenceCode: item.mainSalesClass.referenceCode,
        mainSalesClassName: this.activeLanguage == "en" ? item.mainSalesClass.englishName : item.mainSalesClass.arabicName,
        mainSalesClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainSalesClass.measurementUnit.englishName : item.mainSalesClass.measurementUnit.arabicName,
        totalPreTax: item.quantity * item.price,
      }));

      console.log(this.docData);

      this.salesReturn = salesReturnData;
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
    // Logic to delete all selected salesReturns
    this.selectedReturns.forEach((salesReturn) => {
      this.deleteReturn(salesReturn.id);
    });
    this.selectedReturns = [];
  }

  createTransactionForAll(): void {
    // Logic to create transactions for all selected salesReturns
    this.selectedReturns.forEach((salesReturn) => {
      this.createTransaction(salesReturn?.id);
    });
  }

  getTaxAmount() {
    if (this.salesReturn.taxAmount == 0) return 0

    return Math.round(this.salesReturn.salesReturnItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice() {
    // calculate from items

    return Math.round(this.salesReturn.salesReturnItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }

}

function containsStringInObject(obj: any, searchString: string): boolean {
  if (!obj || typeof obj !== 'object') return false;  // Ensure obj is valid
  return Object.values(obj).some(value =>
    typeof value === 'string' && value.toLowerCase().includes(searchString)
  );

}

