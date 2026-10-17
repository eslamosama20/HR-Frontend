import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, signal, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { SupplierDetailsModel } from 'src/app/models/inventory/supplierDetails.model';
import { AuthService } from 'src/app/modules/auth';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { SupplierReportService } from "../../../services/reports/supplier-report.service";
import {
  ReuseableReportComponent
} from "../../../shared-components/reuseable-report/reuseable-report.component";
import { PageType } from "../../../shared-components/reuseable-report/types/PageType";
import { SupplierReportRecord } from "../../../models/reports/supplierReportRecord.model";
import { DropdownModule } from 'primeng/dropdown';
import { TranslationService } from 'src/app/modules/i18n';
import { CompanyDetailsService } from '../../../services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { filter } from 'rxjs/operators';
import { PrintDocumentComponent } from "../../../shared-components/print-document/print-document.component";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { ActivatedRoute } from '@angular/router';
import {formatDateOnlyToString, getSystemNow} from "../../../utils/dateUtils";

@Component({
  selector: 'app-supplier-report',
  standalone: true,
  imports: [CommonModule,
    FormsModule, ReuseableReportComponent, DropdownModule, PrintDocumentComponent, TranslateModule,
    NgOptimizedImage
  ],
  templateUrl: './supplier-report.component.html',
  styleUrl: './supplier-report.component.scss'
})
export class SupplierReportComponent implements OnInit {
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

  reportTypeOptions: { label: number; name: string }[] = [];
  selectedReportType: any = {};

  dateFrom: string = '';
  dateTo: string = '';
  selectedSupplierId: string | null = null;
  selectedSupplierData: SupplierDetailsModel | null = null;
  allSuppliers: SupplierDetailsModel[] | null = null;
  countOfSelectedSupplier: number = 0;
  pageType: PageType = PageType.A4;
  user: UserAccountModel;
  isSubmitting = false;
  isReportLoadedSignal = signal<boolean>(false);
  companyDetailsModel: CompanyDetailsModel | null = null

  public activeLanguage: string = "en";
  private dataSignal = signal<SupplierDetailsModel[]>([]);

  get isReportLoaded(): boolean {
    return this.isReportLoadedSignal();
  }
  set isReportLoaded(value: boolean) {
    this.isReportLoadedSignal.set(value);
  }

  get suppliers(): any[] {
    return this.dataSignal();
  }

  set data(value: any[]) {
    this.dataSignal.set(value);
  }

  printDocument() {
    this.printComponent.triggerPrint();
  }
  reportColumns = []
  constructor(
    private supplierDetailsService: SupplierDetailsService,
    private supplierReportService: SupplierReportService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private translationService: TranslationService,
    private translate: TranslateService,
    private companyDetailsService: CompanyDetailsService,
    private route: ActivatedRoute
  ) {
    const currentYear = getSystemNow().getFullYear();
    this.dateFrom = this.supplierDetailsService.formatDate(new Date(currentYear, 0, 1));
    this.dateTo = this.supplierDetailsService.formatDate(new Date(currentYear, 11, 31));
    this.activeLanguage = translationService.getSelectedLanguage();
    this.reportColumns = [
      { field: 'mainPurchaseClassEnglishName', label: this.activeLanguage === "ar" ? 'اسم الصنف بالانجليزية' : 'Product English Name' },
      { field: 'mainPurchaseClassArabicName', label: this.activeLanguage === "ar" ? 'اسم الصنف بالعربية' : 'Product Arabic Name' },
      { field: 'quantity', label: this.activeLanguage === "ar" ? 'الكمية' : 'Quantity' },
    ];
  }
  ngOnInit(): void {
    this.loadSuppliersDetails();
    this.getUserId();
    this.getCompanyDetails();

    this.route.params.subscribe(params => {
      this.selectedReportType.label = params['id'];
      console.log(this.selectedReportType.label);

      this.isSubmitting = false;
      this.isReportLoaded = false;
      this.setReportColumns();
    });

    /*const id = this.route.snapshot.paramMap.get('id');
    this.selectedReportType.label = id;*/


    this.reportTypeOptions = [
      { label: 1, name: this.translate.instant('REPORT.BY_PRODUCT') },
      { label: 2, name: this.translate.instant('REPORT.BY_RECEIPT') },
      { label: 3, name: this.translate.instant('REPORT.BY_STORE') }
    ];
  }


  setReportColumns() {

    console.log(this.selectedReportType)
    switch (Number.parseInt(this.selectedReportType?.label)) {
      case 1: // By product
        this.reportColumns = [
          { field: 'createDate', label: this.translate.instant('REPORT.DATE') },
          { field: 'receiptNo', label: this.translate.instant('REPORT.RECEIPT_NO') },
          { field: 'productNameAr', label: this.translate.instant('REPORT.PRODUCT_NAME') },
          { field: 'productPrice', label: this.translate.instant('REPORT.PRODUCT_VALUE') },
          { field: 'productQuantity', label: this.translate.instant('REPORT.QUANTITY') },
          { field: 'totalAmount', label: this.translate.instant('REPORT.TOTAL') }
        ];
        break;
      case 2: // By receipt
        this.reportColumns = [
          { field: 'createDate', label: this.translate.instant('REPORT.DATE') },
          { field: 'receiptNo', label: this.translate.instant('REPORT.RECEIPT_NO') },
          { field: 'receiptAmountBeforeVAT', label: this.translate.instant('REPORT.RECEIPT_VALUE_BEFORE_TAX') },
          { field: 'vat', label: this.translate.instant('REPORT.TAX') },
          { field: 'totalAmount', label: this.translate.instant('REPORT.RECEIPT_WITH_TAX') },
          //{ field: 'totalAmount', label: this.translate.instant('REPORT.TOTAL') },
        ];
        break;
      case 3: // By store
        this.reportColumns = [
          { field: 'createDate', label: this.translate.instant('REPORT.DATE') },
          { field: 'storeNameAr', label: this.translate.instant('REPORT.STORE_NAME') },
          { field: 'productNameAr', label: this.translate.instant('REPORT.PRODUCT_NAME') },
          { field: 'productQuantity', label: this.translate.instant('REPORT.QUANTITY') },
          { field: 'productPrice', label: this.translate.instant('REPORT.PRICE') },
          { field: 'totalAmount', label: this.translate.instant('REPORT.TOTAL') }
        ];
        break;
    }

    this.cdRef.detectChanges();
  }

  onReportTypeChange(event: any): void {
    // this.selectedReportType = event.value.label;
    this.setReportColumns();
  }

  loadSuppliersDetails() {
    this.supplierDetailsService.getAll().subscribe(
      {
        next: (value) => {
          this.allSuppliers = value;
          const suppliers = []
          for (let supplier of value) {
            suppliers.push({
              label: this.activeLanguage === "ar" ? supplier.arabicName : supplier.englishName,
              value: supplier.id
            });
          }
          this.data = suppliers;
        },
        error: (err) => {
          console.error('Error loading supplier details', err);
        }
      }
    );
  }


  getUserId() {
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.user = res;
        }
      }
    );
  }

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
    console.log(this.selectedReportType?.label)
    if (this.dateFrom && this.dateTo && this.selectedSupplierId && this.selectedReportType?.label) {
      const reportParams = {
        dateFrom: this.dateFrom,
        dateTo: this.dateTo,
        supplierId: this.selectedSupplierId,
        reportType: this.selectedReportType?.label
      };
      this.loadSupplierReport(reportParams);

    } else {
      console.log('Please fill in all fields');
    }
  }

  loadSupplierReport(reportParams: any) {
    this.isReportLoaded = false;
    this.isSubmitting = true;
    this.reportData = [];
    this.supplierReportService.getSupplierReport(
      reportParams.supplierId,
      reportParams.dateFrom,
      reportParams.dateTo,
      reportParams.reportType
    ).subscribe(
      {
        next: (value) => {
          
          if (value && value.length > 0) {
            value.slice(0, 3).forEach((item, index) => {
              const recordDate = new Date(item.createDate);
              const isWithinRange = recordDate >= new Date(reportParams.dateFrom) && 
                                  recordDate <= new Date(reportParams.dateTo);
            });
          }
          
          const filteredValue = value.filter(item => {
            const recordDate = new Date(item.createDate);
            const fromDate = new Date(reportParams.dateFrom);
            const toDate = new Date(reportParams.dateTo);
            return recordDate >= fromDate && recordDate <= toDate;
          });
          
          
          this.reportData = filteredValue.map(item => ({...item, createDate: formatDateOnlyToString(new Date(item.createDate))}))
          this.isReportLoaded = true;
          this.isSubmitting = false;
          this.getSupplierById();
          this.reportDataSignal().forEach(element => {
            this.countOfSelectedSupplier += element.quantity;
          });
          this.cdRef.detectChanges();
        },
        error: (err) => {
          console.error('Error loading supplier report', err);
          this.isSubmitting = false;
        }
      }
    )
  }

  getSupplierById() {
    this.selectedSupplierData = this.allSuppliers.find(s => s.id === this.selectedSupplierId);
  }

  reportDataSignal = signal<any[]>([]);
  get reportData(): any[] {
    return this.reportDataSignal();
  }
  set reportData(value: any[]) {
    this.reportDataSignal.set(value);
  }

  getTotalQuantity(){
    return this.reportData.reduce((acc, item) => acc + item.productQuantity, 0);
  }

  getTotalPrice(){
    return this.reportData.reduce((acc, item) => acc + item.totalAmount, 0);
  }

  getTotalNetPrice(){
    return this.reportData.reduce((acc, item) => acc + item.receiptAmountBeforeVAT, 0);
  }

  getTotalTaxAmount(){
    return this.reportData.reduce((acc, item) => acc + item.vat, 0);
  }

  getTotalPriceWithTax(){
    return this.reportData.reduce((acc, item) => acc + item.totalAmount, 0);
  }

  get selectedSupplier(){
    return this.allSuppliers.find(s => s.id == this.selectedSupplierId);
  }

}
