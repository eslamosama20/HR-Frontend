import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DropdownModule } from 'primeng/dropdown';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';
import { InventoryReportRecord } from 'src/app/models/reports/inventoryReportRecord.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { InventoryReportService } from 'src/app/services/reports/inventory-report.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { PageType } from 'src/app/shared-components/reuseable-report/types/PageType';
import { getSystemNow } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-purchase-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TranslateModule,
    PrintDocumentComponent,
    NgOptimizedImage
  ],
  templateUrl: './purchase-report.component.html',
  styleUrl: './purchase-report.component.scss'
})
export class PurchaseReportComponent implements OnInit{
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  printDocument() {
    this.printComponent.triggerPrint();
  }

  dateFrom: string = '';
  dateTo: string = '';
  selectedStoreIdSignal = signal<string>(null)
  get selectedStoreId(){
    return this.selectedStoreIdSignal()
  }
  set selectedStoreId(value:string){
    this.selectedStoreIdSignal.set(value);
  }
  selectedStoreName: string = '';
  selectedStoreDataSignal = signal<StoreDetailsModel>(null)
  get selectedStoreData(){
    return this.selectedStoreDataSignal()
  }
  set selectedStoreData(value:StoreDetailsModel){
    this.selectedStoreDataSignal.set(value);
  }
  pageType: PageType = PageType.A4;
  isSubmittingSignal = signal<boolean>(false)
  isReportLoadedSignal= signal<boolean>(false)
  get isSubmitting(){
    return this.isSubmittingSignal()
  }
  set isSubmitting(value:boolean){
    this.isSubmittingSignal.set(value);
  }
  get isReportLoaded(){
    return this.isReportLoadedSignal()
  }
  set isReportLoaded(value:boolean){
    this.isReportLoadedSignal.set(value);
  }


  activeLanguage: string = 'ar';

  storesSignal= signal<any[]>([])
  get stores(){
    return this.storesSignal()
  }
  set stores(value:any[]){
    this.storesSignal.set(value);
  }
  reportData: InventoryReportRecord[] = [];
  reportColumns = [
    { field: 'mainPurchaseClassName', label: this.getLabel('mainPurchaseClassName') },
    { field: 'measurementUnitName', label: this.getLabel('measurementUnitName') },
    { field: 'beforePeriodQuantity', label: this.getLabel('beforePeriodQuantity') },
    { field: 'lastItemPrice', label: this.getLabel('lastItemPrice') },
    { field: 'beforePeriodTotalPrice', label: this.getLabel('beforePeriodTotalPrice') },
    { field: 'periodQuantity', label: this.getLabel('periodQuantity') },
    { field: 'inPeriodAverageItemPrice', label: this.getLabel('inPeriodAverageItemPrice') },
    { field: 'inPeriodTotalPrice', label: this.getLabel('inPeriodTotalPrice') },
    { field: 'totalQuantity', label: this.getLabel('totalQuantity') },
    { field: 'lastItemPrice', label: this.getLabel('lastItemPrice') },
    { field: 'totalPrice', label: this.getLabel('totalPrice') },

  ];

  constructor(
    private inventoryReportService: InventoryReportService,
    private storeDetailsService: StoreDetailsService,
    private cdRef: ChangeDetectorRef,
    private companyDetailsService: CompanyDetailsService,

  ) {
    const today = getSystemNow();
    this.dateFrom = this.formatDate(new Date(today.getFullYear(), 0, 1));
    this.dateTo = this.formatDate(today);
  }

  ngOnInit(): void {
    this.loadStores();
    this.getCompanyDetails();
  }

  loadStores() {
    this.storeDetailsService.getAll().subscribe(
      (stores: StoreDetailsModel[]) => {
        this.stores = stores.map(store => ({
          label: store.arabicName,
          value: store.id,
          arabicName: store.arabicName,
          englishName: store.englishName
        }));
        this.cdRef.detectChanges();
      },
      (error) => {
        console.error('Error loading stores:', error);
      }
    );
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  companyDetailsModel: CompanyDetailsModel | null = null

  getCompanyDetails() {
    this.companyDetailsService.getAll().subscribe(
      {
        next: (value) => {
          this.companyDetailsModel = value[0];
          console.log(this.companyDetailsModel)
        },
        error(err) {
          console.error('Error loading Company details', err);
        },
      }
    );
  }

  onParametersSubmit(): void {
    console.log('Date From:', this.dateFrom);
    console.log('Date To:', this.dateTo);
    console.log('Selected Store:', this.selectedStoreId);
    console.log('Page Type:', this.pageType);

    if (this.dateFrom && this.dateTo && this.selectedStoreId && this.pageType) {
      const reportParams = {
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        storeId: this.selectedStoreId
      };
      this.loadInventoryReport(reportParams);
    } else {
      console.log('Please fill in all fields');
    }
  }

  countOfSelectedStore: number = 0;

  loadInventoryReport(reportParams: any) {
    this.isReportLoaded = false;
    this.isSubmitting = true;
    this.reportData = [];

    this.inventoryReportService.getInventoryReport(reportParams.storeId, reportParams.dateFrom, reportParams.dateTo).subscribe(
      {
        next: (value) => {

          this.reportData = value.map(x => ({
            ...x,
            mainPurchaseClassName: this.activeLanguage == "en" ? `${x.mainPurchaseClassEnglishName} | ${x.mainPurchaseClassReferenceCode}` : `${x.mainPurchaseClassArabicName} | ${x.mainPurchaseClassReferenceCode}`,
            measurementUnitName: this.activeLanguage == "en" ? x.measurementUnitEnglishName : x.measurementUnitArabicName,
          }))
          this.isReportLoaded = true;
          this.isSubmitting = false;
          this.selectedStoreData = this.stores.find(s => s.value == this.selectedStoreId);
          this.reportData.forEach(element => {
            this.countOfSelectedStore += element.totalQuantity;
          })
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('Error loading inventory report', err);
          this.isReportLoaded = true;
          this.isSubmitting = false;
        }
      }
    );
  }

  onDropdownClick(event: any) {
    this.selectedStoreId = event.value;
    const selectedStore = this.stores.find(store => store.value === this.selectedStoreId);
    if (selectedStore) {
      this.selectedStoreName = selectedStore.arabicName;
    }
  }

  getLabel(field: string): string {
    const labels = {
      mainPurchaseClassReferenceCode: {
        en: 'Code',
        ar: 'رقم'
      },
      mainPurchaseClassName: {
        en: 'Name',
        ar: 'الصنف'
      },
      measurementUnitName: {
        en: 'Measurement Unit',
        ar: 'وحدة القياس'
      },
      beforePeriodQuantity: {
        en: 'Quantity',
        ar: 'الكمية'
        },
      lastItemPrice: {
        en: 'Price',
        ar: 'السعر'
        },
      beforePeriodTotalPrice: {
        en: 'Total',
        ar: 'المجموع'
        },
      periodQuantity: {
        en: 'Quantity',
        ar: 'الكمية'
        },
      inPeriodAverageItemPrice: {
        en: 'Price',
        ar: 'السعر'
        },
      inPeriodTotalPrice: {
        en: 'Total',
        ar: 'المجموع'
        },
      totalQuantity: {
        en: 'Quantity',
        ar: 'الكمية'
        },
      totalPrice: {
        en: 'Total',
        ar: 'المجموع'
      },
    };

    return labels[field][this.activeLanguage];
  }

  protected readonly PrintDocumentComponent = PrintDocumentComponent;
}
