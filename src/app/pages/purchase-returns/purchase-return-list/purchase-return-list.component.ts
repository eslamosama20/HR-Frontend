import { CommonModule } from '@angular/common';
import {ChangeDetectorRef, Component, effect, OnInit, signal, ViewChild} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { FormsModule } from '@angular/forms';  // Import FormsModule
import { SharedModule } from "../../../_metronic/shared/shared.module";
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PurchaseReturnService } from 'src/app/services/purchaseReturn/purchase-return.service';
import { PurchaseReturn } from 'src/app/models/purchaseReturn/purchaseReturn';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { TranslationService } from 'src/app/modules/i18n';
import {SalesReturn} from "../../../models/salesReturn/salesReturn";
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
import {OverlayPanel} from "primeng/overlaypanel";
import { InventoryStocksService } from "../../../services/reports/inventory-stocks.service";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { AuthService } from '../../../modules/auth/services/auth.service';
import { PERMISSIONS } from '../../../config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-purchase-return-list',
  standalone: true,
    imports: [CommonModule, RadioButtonModule, SharedModule, TranslateModule, PrintDocumentComponent, FormsModule, RouterLink, TableModule, ButtonModule, InputTextModule, OverlayPanelModule, FormatDecimalPipe, CustomDatePipe, ToastModule,
    ],  // Add FormsModule here
  providers: [MessageService],
  templateUrl: './purchase-return-list.component.html',
  styleUrl: './purchase-return-list.component.scss'
})
export class PurchaseReturnListComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  purchaseReturnsSignal = signal<PurchaseReturn[]>([]);
  get purchaseReturns() {
    return this.purchaseReturnsSignal();
  }
  set purchaseReturns(value: PurchaseReturn[]) {
    this.purchaseReturnsSignal.set(value);
  }

  purchaseReturnSignal = signal<PurchaseReturn>(null)
  get purchaseReturn() {
    return this.purchaseReturnSignal()
  }
  set purchaseReturn(value: PurchaseReturn) {
    this.purchaseReturnSignal.set(value);
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

  filteredReturnsSignal = signal<PurchaseReturn[]>([]);

  get filteredReturns() {
    return this.filteredReturnsSignal();
  }
  set filteredReturns(value: PurchaseReturn[]) {
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
    private purchaseReturnService: PurchaseReturnService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierDetailsService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private inventoryStocksService: InventoryStocksService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.translate = translateService;

    this.columns = [
      {field: 'purchaseReturnNo', header: this.translate.instant('RETURN.RETURNNO'), filter: true , filterType: 'text'},
      {field: 'supplierDetailsName', header: this.translate.instant('RETURN.SUPPLIERNAME'), filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('RETURN.DESCRIPTION'), filter: true , filterType: 'text'},
      {field: 'issueDate', header: this.translate.instant('RETURN.ISSUE_DATE'), filter: true , filterType: 'date'},
      {field: 'totalAmount', header: this.translate.instant('RETURN.TOTAL'), filter: true , filterType: 'number'},
      {field: 'totalAmountAfterTax', header: this.translate.instant('RETURN.TOTALWITHTAX'), filter: true , filterType: 'number'},
    ];

    this.docColumns = [
      { field: 'mainPurchaseClassReferenceCode', label: this.translate.instant("RETURN.ITEMNO") },
      { field: 'mainPurchaseClassName', label: this.translate.instant("RETURN.ITEMNAME") },
      { field: 'storeDetailsName', label: this.translate.instant("RETURN.INVENTORY") },
      { field: 'mainPurchaseClasMeasurementUnitName', label: this.translate.instant("RETURN.UNIT") },
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
    // Load all purchaseReturns on component initialization
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
    this.purchaseReturnService.getAllReturns().subscribe({
      next: (purchaseReturns) => {
        console.log('purchaseReturns', purchaseReturns)
        if (purchaseReturns) {
          this.purchaseReturns = purchaseReturns?.map(purchaseReturn => {
            const totalAmount =Math.round(purchaseReturn.purchaseReturnItems.reduce(
              (total, item) =>
                total + (item.price * item.quantity),
              0
            ) * 100) / 100
            return{
              ...purchaseReturn,
              issueDate: new Date(purchaseReturn.issueDate),
              dueDate: new Date(purchaseReturn.dueDate),
              totalAmount: totalAmount,
              totalAmountAfterTax: purchaseReturn.taxAmount > 0 ? totalAmount + Math.round((totalAmount * 0.15) * 100) / 100: totalAmount,
              supplierDetailsName:this.activeLanguage=="en"?purchaseReturn.supplierDetails.englishName:purchaseReturn.supplierDetails.arabicName,
            }
          });
        }
        this.loading = false;
        this.filteredReturns = this.purchaseReturns;  // Initialize filtered purchaseReturns
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading purchase returns:', err);
        this.loading = false;
        this.purchaseReturns = [];
        this.filteredReturns = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Method to filter purchaseReturns based on the search input
  filterReturns(transactionsFilterType: string): void {
    if (transactionsFilterType === 'all') {
      this.filteredReturns = this.purchaseReturns;
    }
    else if (transactionsFilterType === 'connected') {
      this.filteredReturns = this.purchaseReturns.filter(purchaseReturn =>
        purchaseReturn.transactionId !== null
      );
    }
    else if (transactionsFilterType === 'notconnected') {
      this.filteredReturns = this.purchaseReturns.filter(purchaseReturn =>
        purchaseReturn.transactionId === null
      );
    }
  }

  deleteReturn(id?: number): void {
    if (id) {
      this.purchaseReturnService.deleteReturn(id).subscribe({
        next: () => {
          this.purchaseReturns = this.purchaseReturns.filter(purchaseReturn => purchaseReturn.id !== id);
          this.filteredReturns = this.filteredReturns.filter(purchaseReturn => purchaseReturn.id !== id);  // Update filteredReturns
          this.cdr.detectChanges();
        },
        error: (err) => console.log('Error deleting purchaseReturn:', err)
      });
    }
  }

  viewReturn(id?: number): void {
    this.router.navigate(['/purchase-returns', id]);
  }

  editReturn(id?: number): void {
    if (id) {
      this.router.navigate(['/purchase-returns/edit', id]);
    }
  }

  addReturn() {
    this.router.navigate(['/purchase-returns/new']);
  }

  loadingStates: { [id: number]: boolean } = {}; // Track loading states by purchaseReturn ID

  async createTransaction(id: number) {
    this.loadingStates[id] = true;

    try {
      // Get purchase return details first
      const purchaseReturn = await this.purchaseReturnService.getReturnById(id).toPromise();
      
      if (!purchaseReturn || !purchaseReturn.purchaseReturnItems) {
        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'خطأ في البيانات' : 'Data Error',
          detail: this.activeLanguage === 'ar' ? 'لم يتم العثور على بيانات المرتجع أو العناصر المطلوبة' : 'Purchase return data or items not found'
        });
        this.loadingStates[id] = false;
        return;
      }

      // Validate inventory for each item
      const validationResults = [];
      for (const item of purchaseReturn.purchaseReturnItems) {
        if (item.storeDetailsId && item.mainPurchaseClassId && item.quantity > 0) {
          const validation = await this.validateInventoryQuantity(item.storeDetailsId, item.mainPurchaseClassId, item.quantity);
          if (!validation.isValid) {
            validationResults.push({
              productName: this.activeLanguage === 'ar' ? item.mainPurchaseClass.arabicName : item.mainPurchaseClass.englishName,
              storeName: this.activeLanguage === 'ar' ? item.storeDetails.arabicName : item.storeDetails.englishName,
              requestedQuantity: item.quantity,
              availableQuantity: validation.availableQuantity,
              message: validation.message
            });
          }
        }
      }

      // If there are validation errors, show notification and stop
      if (validationResults.length > 0) {
        let errorMessage = '';
        
        validationResults.forEach((result, index) => {
          if (this.activeLanguage === 'ar') {
            errorMessage += `الكمية من المنتج (${result.productName}) تتجاوز الكمية الموجودة في المخزن (${result.storeName})\n`;
          } else {
            errorMessage += `Quantity of product (${result.productName}) exceeds available quantity in store (${result.storeName})\n`;
          }
        });

        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'خطأ في التحقق من المخزون' : 'Inventory Validation Error',
          detail: errorMessage
        });
        
        this.loadingStates[id] = false;
        return;
      }

      // If validation passes, create the transaction
      this.purchaseReturnService.createReturnTransaction(id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.activeLanguage === 'ar' ? 'تم إنشاء القيد بنجاح' : 'Transaction Created Successfully',
            detail: this.activeLanguage === 'ar' 
              ? `تم إنشاء القيد بنجاح لمرتجع المشتريات رقم ${purchaseReturn.id}`
              : `Transaction created successfully for purchase return ${purchaseReturn.id}`
          });
          this.loadReturns();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.activeLanguage === 'ar' ? 'خطأ في إنشاء القيد' : 'Error Creating Transaction',
            detail: this.translate.instant('RETURN.CHECK_ACCOUNTS_PURCHASE_RETURN')
          });
        },
        complete: () => {
          this.loadingStates[id] = false;
        }
      });

    } catch (error) {
      console.error('Error validating inventory:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.activeLanguage === 'ar' ? 'خطأ في النظام' : 'System Error',
        detail: this.activeLanguage === 'ar' ? 'حدث خطأ غير متوقع أثناء التحقق من المخزون. يرجى المحاولة مرة أخرى' : 'An unexpected error occurred while validating inventory. Please try again'
      });
      this.loadingStates[id] = false;
    }
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

  printReturn(purchaseReturnId: number): void {
    this.loading = true;

    this.purchaseReturnService.getReturnById(purchaseReturnId).subscribe((purchaseReturnData) => {
      this.docData = purchaseReturnData.purchaseReturnItems.map(item => ({
        ...item,
        mainPurchaseClassReferenceCode: item.mainPurchaseClass.referenceCode,
        mainPurchaseClassName: this.activeLanguage == "en" ? item.mainPurchaseClass.englishName : item.mainPurchaseClass.arabicName,
        mainPurchaseClasMeasurementUnitName: this.activeLanguage == "en" ? item.mainPurchaseClass.measurementUnit.englishName : item.mainPurchaseClass.measurementUnit.arabicName,
        storeDetailsName: this.activeLanguage == "en" ? item.storeDetails.englishName : item.storeDetails.arabicName,
        totalPreTax: item.quantity * item.price,
      }));

      console.log(this.docData);

      this.purchaseReturn = purchaseReturnData;
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
    // Logic to delete all selected purchaseReturns
    this.selectedReturns.forEach((purchaseReturn) => {
      this.deleteReturn(purchaseReturn.id);
    });
    this.selectedReturns = [];
  }

  createTransactionForAll(): void {
    // Logic to create transactions for all selected purchaseReturns
    this.selectedReturns.forEach((purchaseReturn) => {
      this.createTransaction(purchaseReturn?.id);
    });
  }

  getTaxAmount() {
    if (this.purchaseReturn.taxAmount == 0) return 0

    return Math.round(this.purchaseReturn.purchaseReturnItems.reduce(
      (total, item) =>
        total + ((item.price * item.quantity) * 0.15),
      0
    ) * 100) / 100
  }

  getNetPrice() {
    // calculate from items

    return Math.round(this.purchaseReturn.purchaseReturnItems.reduce(
      (total, item) =>
        total + (item.price * item.quantity),
      0
    ) * 100) / 100
  }

  getTotalPrice() {
    // calculate from items
    return Math.round(this.getNetPrice() * 100) / 100 + Math.round(this.getTaxAmount() * 100) / 100
  }
@ViewChild('opReturn') opReturn!: OverlayPanel;
selectedReturn: any;

  async validateInventoryQuantity(storeDetailsId: string, mainPurchaseClassId: string, requestedQuantity: number): Promise<{isValid: boolean, availableQuantity: number, message: string}> {
    try {
      const inventoryStocks = await this.inventoryStocksService.getInventoryStocks(storeDetailsId).toPromise();
      
      if (!inventoryStocks || inventoryStocks.length === 0) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? 'لا توجد بيانات مخزون متاحة للمخزن المحدد' 
            : 'No inventory data available for the selected store'
        };
      }

      const storeStock = inventoryStocks.find(stock => stock.storeDetailsId === storeDetailsId);
      
      if (!storeStock || !storeStock.storedItems) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? 'لا توجد منتجات في المخزن المحدد' 
            : 'No products found in the selected store'
        };
      }

      const productStock = storeStock.storedItems.find(item => item.mainPurchaseClassId === mainPurchaseClassId);
      
      if (!productStock) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? `المنتج غير موجود في المخزن. الكمية المتاحة: 0` 
            : `Product not found in store. Available quantity: 0`
        };
      }

      const availableQuantity = productStock.quantity || 0;
      
      if (availableQuantity === 0) {
        return {
          isValid: false,
          availableQuantity: 0,
          message: this.activeLanguage === 'ar' 
            ? `المنتج غير متوفر في المخزن. الكمية المتاحة: ${availableQuantity}` 
            : `Product not available in store. Available quantity: ${availableQuantity}`
        };
      }

      if (requestedQuantity > availableQuantity) {
        return {
          isValid: false,
          availableQuantity: availableQuantity,
          message: this.activeLanguage === 'ar' 
            ? `الكمية المطلوبة (${requestedQuantity}) أكبر من الكمية المتاحة (${availableQuantity})` 
            : `Requested quantity (${requestedQuantity}) exceeds available quantity (${availableQuantity})`
        };
      }

      return {
        isValid: true,
        availableQuantity: availableQuantity,
        message: this.activeLanguage === 'ar' 
          ? `الكمية متاحة. الكمية المتاحة: ${availableQuantity}` 
          : `Quantity available. Available quantity: ${availableQuantity}`
      };

    } catch (error) {
      console.error('Error validating inventory quantity:', error);
      return {
        isValid: false,
        availableQuantity: 0,
        message: this.activeLanguage === 'ar' 
          ? 'خطأ في التحقق من المخزون' 
          : 'Error validating inventory'
      };
    }
  }

  openOverlayReturn(event: MouseEvent, entry: any) {
  event.preventDefault(); // منع القائمة السياقية الافتراضية
  this.selectedReturn = entry;
  this.opReturn.toggle(event);

  // خليه يظهر عند الماوس
  setTimeout(() => {
    const panelEl = this.opReturn.container as HTMLElement;
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

