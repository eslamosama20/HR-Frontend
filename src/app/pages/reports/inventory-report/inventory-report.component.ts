import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal } from '@angular/core';
import { StoreDetailsService } from '../../../services/inventory/store-details.service';
import { InventoryReportService } from '../../../services/reports/inventory-report.service';
import { InventoryReportRecord } from '../../../models/reports/inventoryReportRecord.model';
import { StoreDetailsModel } from '../../../models/inventory/storeDetails.model';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ReuseableReportComponent } from 'src/app/shared-components/reuseable-report/reuseable-report.component';
import { PageType } from 'src/app/shared-components/reuseable-report/types/PageType';
import { TranslateModule } from '@ngx-translate/core';
import { PrintDocumentComponent } from "../../../shared-components/print-document/print-document.component";
import { CompanyDetailsService } from "../../../services/inventory/company-details.service";
import { CompanyDetailsModel } from "../../../models/inventory/companyDetails.model";
import {RadioButtonModule} from "primeng/radiobutton";
import {ActivatedRoute} from "@angular/router";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import {AuthService} from "../../../modules/auth";
import { getSystemNow } from 'src/app/utils/dateUtils';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TranslateModule,
    PrintDocumentComponent,
    NgOptimizedImage,
    RadioButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.scss']
})
export class InventoryReportComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  printDocument() {
    this.printComponent.triggerPrint();
  }

  isTotal: boolean = true; // Default to "Total" option
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
  ];

  constructor(
    private inventoryReportService: InventoryReportService,
    private storeDetailsService: StoreDetailsService,
    private cdRef: ChangeDetectorRef,
    private companyDetailsService: CompanyDetailsService,
    private route: ActivatedRoute,
    private authService: AuthService,

  ) {
    const today = getSystemNow();
    this.dateFrom = this.formatDate(new Date(today.getFullYear(), 0, 1));
    this.dateTo = this.formatDate(today);
  }

  ngOnInit(): void {
    this.loadStores();
    this.getCompanyDetails();
    this.getUserId();
    this.route.params.subscribe(params => {
      const type= params['type'];
      this.isTotal = type === 'total';
      this.isSubmitting = false;
      this.isReportLoaded = false;
      this.setReportColumns();
    });

    this.setReportColumns();
  }
  user: UserAccountModel;
  getUserId() {
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.user = res;
        }
      }
    );
  }

  setReportColumns() {

    if (this.isTotal) {
      this.reportColumns = [
        { field: 'mainPurchaseClassName', label: this.getLabel('mainPurchaseClassName') },
        { field: 'measurementUnitName', label: this.getLabel('measurementUnitName') },
        { field: 'periodQuantity', label: this.getLabel('periodQuantity') },
        { field: 'inPeriodAverageItemPrice', label: this.getLabel('inPeriodAverageItemPrice') },
        { field: 'inPeriodTotalPrice', label: this.getLabel('inPeriodTotalPrice') }
      ];

    } else {
      this.reportColumns = [
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
        { field: 'totalPrice', label: this.getLabel('totalPrice') }
      ]
    }
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
          const mockData = Array.from({ length: 100 }, (_, index) => ({
            id: index + 1,
            mainPurchaseClassEnglishName: `English Name ${index + 1}`,
            mainPurchaseClassArabicName: `Arabic Name ${index + 1}`,
            mainPurchaseClassReferenceCode: `Code-${index + 1}`,
            measurementUnitEnglishName: `Unit EN-${index + 1}`,
            measurementUnitArabicName: `Unit AR-${index + 1}`,
            beforePeriodTotalPrice: Math.random() * 1000,
            periodQuantity: Math.random() * 500,
            inPeriodTotalPrice: Math.random() * 2000,
            inPeriodAverageItemPrice: Math.random() * 50,
            totalQuantity: Math.random() * 1000,
            lastItemPrice: Math.random() * 100,
            totalPrice: Math.random() * 3000,
          }));
          // @ts-ignore
          this.reportData = value.map(x => ({
            ...x,
            mainPurchaseClassName: this.activeLanguage == "en" ? `${x.mainPurchaseClassEnglishName} | ${x.mainPurchaseClassReferenceCode}` : `${x.mainPurchaseClassArabicName} | ${x.mainPurchaseClassReferenceCode}`,
            measurementUnitName: this.activeLanguage == "en" ? x.measurementUnitEnglishName : x.measurementUnitArabicName,
            beforePeriodTotalPrice: Math.round(x.beforePeriodTotalPrice * 100) / 100,
            periodQuantity: Math.round(x.periodQuantity * 100) / 100,
            inPeriodTotalPrice: Math.round((this.priceMode === 'lastPrice' ? x.lastItemPrice * x.periodQuantity : x.inPeriodTotalPrice)* 100) / 100,
            inPeriodAverageItemPrice: Math.round((this.priceMode === 'lastPrice' ? x.lastItemPrice : x.inPeriodAverageItemPrice) * 100) / 100,
            totalQuantity: Math.round(x.totalQuantity * 100) / 100,
            lastItemPrice: Math.round(x.lastItemPrice * 100) / 100,
            totalPrice: Math.round(x.totalPrice * 100) / 100,
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

  onToggleChange(event: Event): void {

    this.setReportColumns();
    console.log('Toggle changed:', this.isTotal ? 'Total' : 'Details');
    // Perform any action when the toggle is switched
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


  priceModeSignal = signal('lastPrice');
  get priceMode() {
    return this.priceModeSignal();
  }
  set priceMode(value) {
    this.priceModeSignal.set(value);
  }

  getTotalQuantity(){
    if (this.isTotal) {
      return this.reportData.reduce((acc, item) => acc + item.periodQuantity, 0);
    }else{
      return this.reportData.reduce((acc, item) => acc + item.totalQuantity, 0);
    }
  }
  getTotalPrice(){
    if (this.isTotal) {
      return this.reportData.reduce((acc, item) => acc + item.inPeriodTotalPrice, 0);
    }else{
      return this.reportData.reduce((acc, item) => acc + item.totalPrice, 0);
    }
  }



  protected readonly PrintDocumentComponent = PrintDocumentComponent;
}
