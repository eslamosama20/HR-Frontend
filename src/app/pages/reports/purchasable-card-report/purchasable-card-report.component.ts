import {Component, signal, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef} from '@angular/core';

import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {TrailBalanceService} from "../../../services/accounting/trail-balance.service";
import {formatDateOnlyToString, formatDisplayDate, getSystemNow} from "../../../utils/dateUtils";
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {FormsModule, ReactiveFormsModule } from '@angular/forms';
import {ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import {CardModule} from "primeng/card";
import {ToastModule } from 'primeng/toast';
import {TableModule} from "primeng/table";
import {DropdownModule} from "primeng/dropdown";
import {MultiSelectModule} from "primeng/multiselect";
import {CalendarModule} from "primeng/calendar";
import {PanelModule} from "primeng/panel";
import { InputSwitchModule } from 'primeng/inputswitch';
import {AbsoluteValuePipe} from "../../../pipes/absolute-value.pipe";
import { TabMenuModule } from 'primeng/tabmenu';
import { PurchasableCardReportModel } from 'src/app/models/reports/purchasableCardReport/purchasableCardReport.model';
import {PurchasableCardReportService} from "../../../services/reports/purchasable-card-report.service";
import {MainPurchaseClassService} from "../../../services/purchase-classes-tree/main-purchase-class.service";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { CompanyDetailsService } from "../../../services/inventory/company-details.service";
import { CompanyDetailsModel } from "../../../models/inventory/companyDetails.model";
@Component({
  selector: 'app-purchasable-card-report',
  templateUrl: './purchasable-card-report.component.html',
  styleUrl: './purchasable-card-report.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ToastModule,
    TableModule,
    DropdownModule,
    MultiSelectModule,
    TranslateModule,
    FormsModule,
    CalendarModule,
    PanelModule,
    InputSwitchModule,
    AbsoluteValuePipe,
    NgOptimizedImage,
    TabMenuModule,
    CustomDatePipe,
  ],
  providers: [ConfirmationService, MessageService]
})
export class PurchasableCardReportComponent implements OnInit {

  loadingSignal = signal(false);
  selectedMainPurchaseClassIdSignal = signal<string>('');
  get selectedMainPurchaseClassId(): string {
    return this.selectedMainPurchaseClassIdSignal()
  }
  set selectedMainPurchaseClassId(value: string) {
    this.selectedMainPurchaseClassIdSignal.set(value);
  }
  mainPurchaseClassOptionsSignal = signal<any[]>([]);
  get mainPurchaseClassOptions(): any[] {
    return this.mainPurchaseClassOptionsSignal()
  }
  set mainPurchaseClassOptions(options: any[]) {
    this.mainPurchaseClassOptionsSignal.set(options);
  }

  startDate;
  endDate;

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }

  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  purchasableCardReportSignal = signal<PurchasableCardReportModel[]>([]);
  get purchasableCardReport(): PurchasableCardReportModel[] {
    return this.purchasableCardReportSignal()
  }
  set purchasableCardReport(purchasableCardReport: PurchasableCardReportModel[]) {
    this.purchasableCardReportSignal.set(purchasableCardReport);
  }

  reportColumns = [];
  flattenedReportData: any[] = [];
  companyDetailsModel: CompanyDetailsModel | null = null;
  user: any = null;

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;

  constructor(
              private authService: AuthService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private trailBalanceService: TrailBalanceService,
              private mainPurchaseClassService: MainPurchaseClassService,
              private purchasableCardReportService: PurchasableCardReportService,
              private companyDetailsService: CompanyDetailsService,
              private cdr: ChangeDetectorRef,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.user = res;
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }


  ngOnInit(): void {
    const currentYear = getSystemNow().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);
    this.loadMainPurchaseClasses();
    this.getCompanyDetails();
  }


  loadMainPurchaseClasses() {
    this.mainPurchaseClassService.getAll().subscribe({
      next: res => {
        if (res.length === 0) {
          this.loading = false;
          return;
        }
        this.mainPurchaseClassOptions = res.map(x => ({
          label: this.activeLanguage === 'ar' ? x.arabicName : x.englishName,
          value: x.id
        }));
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Main Purchase Classes', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
      });
  }

  getCompanyDetails() {
    this.companyDetailsService.getAll().subscribe({
      next: (value) => {
        this.companyDetailsModel = value[0];
      },
      error: (err) => {
        console.error('Error loading Company details', err);
      }
    });
  }

  handleSubmit() {
    this.loading = true;
    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.purchasableCardReportService.getPurchasableCardReport(this.selectedMainPurchaseClassId,startDate, endDate).subscribe({
      next: (res : PurchasableCardReportModel[]) => {
        if (res === null) {
          this.loading = false;
          return;
        }
        console.log('Purchasable Card Report', res);
        this.purchasableCardReport = res;
        
        // Flatten data for printing
        this.flattenReportData();
        
        // Define columns for printing
        this.reportColumns = [
          { field: 'operationReferenceNumber', label: this.getLabel('operationReferenceNumber') },
          { field: 'operationDate', label: this.getLabel('operationDate'), pipe: 'date' },
          { field: 'operationSource', label: this.getLabel('operationSource') },
          { field: 'supplierDetails', label: this.getLabel('supplierDetails') },
          { field: 'description', label: this.getLabel('description') },
          { field: 'storeDetails', label: this.getLabel('storeDetails') },
          { field: 'measurementUnit', label: this.getLabel('measurementUnit') },
          { field: 'quantity', label: this.getLabel('quantity'), pipe: 'number' },
          { field: 'unitPrice', label: this.getLabel('unitPrice'), pipe: 'number' },
          { field: 'totalPrice', label: this.getLabel('totalPrice'), pipe: 'number' }
        ];
        
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Data', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });

    this.loading = false;
  }


  get totalQuantity() {
    if (this.purchasableCardReport && this.purchasableCardReport.length > 0) {
      return this.purchasableCardReport.reduce((acc, item) => {
        return acc + item.purchasableCardReportItems?.reduce((subAcc, cItem) => subAcc + cItem.quantity, 0);
      }, 0);
    }
    return 0;
  }

  get averageUnitPrice() {
    if (this.purchasableCardReport && this.purchasableCardReport.length > 0) {
      const totalPrice = this.purchasableCardReport.reduce((acc, item) => {
        return acc + item.purchasableCardReportItems?.reduce((subAcc, cItem) => subAcc + (cItem.unitPrice * cItem.quantity), 0);
      }, 0);
      const totalQuantity = this.totalQuantity;
      return totalQuantity > 0 ? totalPrice / totalQuantity : 0;
    }
    return 0;
  }

  get totalPrice() {
    if (this.purchasableCardReport && this.purchasableCardReport.length > 0) {
      return this.purchasableCardReport.reduce((acc, item) => {
        return acc + item.purchasableCardReportItems?.reduce((subAcc, cItem) => subAcc + cItem.totalPrice, 0);
      }, 0);
    }
    return 0;
  }

  get selectedMainPurchaseClassName(): string {
    if (!this.selectedMainPurchaseClassId) return '-';
    const option = this.mainPurchaseClassOptions.find(x => x.value === this.selectedMainPurchaseClassId);
    return option ? option.label : '-';
  }

  getLabel(field: string): string {
    const labels = {
      'operationReferenceNumber': this.translate.instant('FINANCE.OPERATION_REFERENCE_NUMBER'),
      'operationDate': this.translate.instant('FINANCE.OPERATION_DATE'),
      'operationSource': this.translate.instant('FINANCE.OPERATION_SOURCE'),
      'supplierDetails': this.translate.instant('DATA.SUPPLIER_DETAILS'),
      'description': this.translate.instant('FINANCE.DESCRIPTION'),
      'storeDetails': this.translate.instant('FINANCE.STORE_DETAILS'),
      'measurementUnit': this.translate.instant('DATA.MEASUREMENT_UNIT'),
      'quantity': this.translate.instant('DATA.QUANTITY'),
      'unitPrice': this.translate.instant('DATA.UNIT_PRICE'),
      'totalPrice': this.translate.instant('FINANCE.TOTAL_AMOUNT')
    };
    return labels[field] || field;
  }

  translateOperationSource(source: string): string {
    const translations = {
      'PurchaseInvoice': this.translate.instant('INVOICE.PURCHASE_INVOICE'),
      'PurchaseReturn': this.translate.instant('RETURN.PURCHASE_RETURN'),
      'EntryPermit': this.translate.instant('FINANCE.ENTRY_PERMIT'),
      'ExitPermit': this.translate.instant('FINANCE.EXIT_PERMIT')
    };
    return translations[source] || source;
  }

  flattenReportData(): void {
    this.flattenedReportData = [];
    
    this.purchasableCardReport.forEach(operation => {
      if (operation.purchasableCardReportItems && operation.purchasableCardReportItems.length > 0) {
        operation.purchasableCardReportItems.forEach(item => {
          const flattenedItem = {
            operationReferenceNumber: operation.operationReferenceNumber,
            operationDate: operation.operationDate,
            operationSource: this.translateOperationSource(operation.operationSource),
            supplierDetails: this.activeLanguage === 'ar' ? operation.supplierDetailsArabicName : operation.supplierDetailsEnglishName,
            description: operation.description,
            storeDetails: this.activeLanguage === 'ar' ? item.storeDetailsArabicName : item.storeDetailsEnglishName,
            measurementUnit: item.unitMeasurementName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          };
          this.flattenedReportData.push(flattenedItem);
        });
      } else {
        // If no items, add the operation with empty item details
        const flattenedItem = {
          operationReferenceNumber: operation.operationReferenceNumber,
          operationDate: operation.operationDate,
          operationSource: this.translateOperationSource(operation.operationSource),
          supplierDetails: this.activeLanguage === 'ar' ? operation.supplierDetailsArabicName : operation.supplierDetailsEnglishName,
          description: operation.description,
          storeDetails: '-',
          measurementUnit: '-',
          quantity: 0,
          unitPrice: 0,
          totalPrice: 0
        };
        this.flattenedReportData.push(flattenedItem);
      }
    });
    
    console.log('Flattened data for printing:', this.flattenedReportData);
  }

  printReport() {
    const printContents = document.getElementById('printSection')?.innerHTML;

    if (printContents) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.open();
        
        const direction = this.activeLanguage === 'ar' ? 'rtl' : 'ltr';
        const title = this.translate.instant('FINANCE.PURCHASABLE_CARD_REPORT');
        const mainClassLabel = this.translate.instant('FINANCE.MAIN_PURCHASE_CLASS');
        const startDateLabel = this.translate.instant('FINANCE.START_DATE');
        const endDateLabel = this.translate.instant('FINANCE.END_DATE');
        const totalsLabel = this.translate.instant('FINANCE.TOTALS');
        const quantityLabel = this.translate.instant('DATA.QUANTITY');
        const unitPriceLabel = this.translate.instant('DATA.UNIT_PRICE');
        const totalAmountLabel = this.translate.instant('FINANCE.TOTAL_AMOUNT');
        
        const startDate = formatDisplayDate(this.startDate);
        const endDate = formatDisplayDate(this.endDate);
        
        const html = `
          <html>
            <head>
              <title>Purchasable Card Report</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  direction: ${direction};
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin-top: 20px;
                }
                th, td { 
                  border: 1px solid black; 
                  padding: 8px; 
                  text-align: center; 
                  font-size: 12px;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                h1 { 
                  text-align: center; 
                  margin-bottom: 20px;
                }
                .totals-row {
                  background-color: #f0f0f0;
                  font-weight: bold;
                }
                .text-rose-500 {
                  color: #ef4444;
                }
                @media print {
                  body { margin: 0; }
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                }
              </style>
            </head>
            <body>
              ${this.companyDetailsModel ? `
                <div style="width: 100%; padding: 10px; margin-bottom: 15px; overflow: visible;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: nowrap;">
                    <div style="flex: 1; min-width: 200px; text-align: ${this.activeLanguage === 'ar' ? 'right' : 'left'}; padding-right: 10px;">
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.arabicName || ''}</p>
                      ${this.companyDetailsModel.city ? `<p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.city}</p>` : ''}
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.phone || ''}</p>
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.translate.instant('INVOICE.TAXNUMBER')}: ${this.companyDetailsModel.taxNumber || ''}</p>
                    </div>
                    <div style="flex: 0 0 auto; display: flex; justify-content: center; align-items: center; padding: 0 10px;">
                      ${this.companyDetailsModel.logoUrl ? `<img src="${this.companyDetailsModel.logoUrl}" alt="company-logo" width="80" height="80" style="object-fit: contain;">` : ''}
                    </div>
                    <div style="flex: 1; min-width: 200px; text-align: ${this.activeLanguage === 'ar' ? 'left' : 'right'}; padding-left: 10px;">
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.englishName || ''}</p>
                      ${this.companyDetailsModel.city ? `<p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.city}</p>` : ''}
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">${this.companyDetailsModel.phone || ''}</p>
                      <p style="font-weight: 600; font-size: 11px; margin: 2px 0; padding: 0; white-space: nowrap; overflow: visible;">TAX No: ${this.companyDetailsModel.taxNumber || ''}</p>
                    </div>
                  </div>
                </div>
              ` : ''}
              
              <h1>${title}</h1>
              <div style="text-align: center; margin-bottom: 20px;">
                <p><strong>${this.translate.instant('REPORT.EMPLOYEE')}:</strong> ${this.user ? (this.user.firstName + ' ' + (this.user.middleName || '') + ' ' + this.user.lastName) : ''}</p>
                <p><strong>${mainClassLabel}:</strong> ${this.selectedMainPurchaseClassName}</p>
                <p><strong>${startDateLabel}:</strong> ${startDate} | 
                   <strong>${endDateLabel}:</strong> ${endDate}</p>
              </div>
              ${printContents}
              <div style="margin-top: 20px; border-top: 2px solid black; padding-top: 10px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>${totalsLabel}</span>
                  <span>${quantityLabel}: ${this.totalQuantity.toFixed(2)}</span>
                  <span>${unitPriceLabel}: ${this.averageUnitPrice.toFixed(2)}</span>
                  <span>${totalAmountLabel}: ${this.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </body>
          </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  }
}
