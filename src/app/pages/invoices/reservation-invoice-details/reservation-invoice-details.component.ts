import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  LOCALE_ID,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../_metronic/shared/shared.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from 'src/app/modules/i18n';
import { ReservationService } from 'src/app/services/reservations/reservation.service';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { ReservationCompanyService } from 'src/app/services/reservations/reservation-company.service';
import { ReservationModel } from 'src/app/models/accounting/reservation-model';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import { ReservationMealService } from 'src/app/services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import { ReservationSupplierService } from 'src/app/services/ReservationSupplier/reservation-supplier.service';
import { forkJoin } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { QRCodeModule } from 'angularx-qrcode';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { PrintSettingsService } from 'src/app/services/print-settings.service';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceShareModalComponent } from '../../../shared-components/invoice-share-modal/invoice-share-modal.component';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'app-reservation-invoice-details',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    TranslateModule,
    PrintDocumentComponent,
    FormsModule,
    ReactiveFormsModule,
    InvoiceShareModalComponent,
    RouterModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TagModule,
    DividerModule,
    QRCodeModule,
    FormatDecimalPipe,
    CustomDatePipe,
    DialogModule,
    RadioButtonModule,
  ],
  templateUrl: './reservation-invoice-details.component.html',
  styleUrls: ['./reservation-invoice-details.component.scss'],
  providers: [
    MessageService,
    ConfirmationService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class ReservationInvoiceDetailsComponent implements OnInit {
  @ViewChild('printComponent', { static: false })
  printComponent: PrintDocumentComponent;
  @ViewChild('printComponent3', { static: false })
  printComponent3: PrintDocumentComponent;
  descriptionRowsPerPage: number = 8;
  docColumnsSignal = signal<any[]>([]);
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  docDataSignal = signal<any[]>([]);
  get docData(): any[] {
    return this.docDataSignal();
  }
  set docData(value: any[]) {
    this.docDataSignal.set(value);
  }

  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  invoiceSignal = signal<SalesInvoice>(null);
  get invoice() {
    return this.invoiceSignal();
  }
  set invoice(value: SalesInvoice) {
    this.invoiceSignal.set(value);
  }

  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  translate: TranslateService;
  activeLanguage: string = 'en';

  // Lookup maps
  hotelsMap = new Map<string, any>();
  reservationCompaniesMap = new Map<string, any>();
  reservationsMap = new Map<string, ReservationModel>();
  roomTypesMap = new Map<string, any>();
  mealsMap = new Map<string, any>();
  viewsMap = new Map<string, any>();
  servicesMap = new Map<string, any>();
  suppliersMap = new Map<string, any>();
  allReservations: ReservationModel[] = [];

  invoiceId: number | null = null;
  useLandscape = false;
  sellerName: string = '';
  autoPrint: boolean = false;

  // Print customization panel variables
  selectedPolicies: any[] = [];
  selectedBanks: any[] = [];
  anyPolicyChecked: boolean = false;
  anyBankChecked: boolean = false;

  showCompanySignatureSignal = signal<boolean>(true);
  get showCompanySignature(): boolean {
    return this.showCompanySignatureSignal();
  }
  set showCompanySignature(value: boolean) {
    this.showCompanySignatureSignal.set(value);
  }

  showCustomerSignatureSignal = signal<boolean>(true);
  get showCustomerSignature(): boolean {
    return this.showCustomerSignatureSignal();
  }
  set showCustomerSignature(value: boolean) {
    this.showCustomerSignatureSignal.set(value);
  }

  showStampSignal = signal<boolean>(true);
  get showStamp(): boolean {
    return this.showStampSignal();
  }
  set showStamp(value: boolean) {
    this.showStampSignal.set(value);
  }

  // Share dialog properties
  invoiceShareDialogVisible = false;
  invoiceShareActiveTabIndex = 0;
  shareBusy = false;
  invoiceShareForm!: FormGroup;

  constructor(
    private salesInvoiceService: SalesInvoiceService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private messageService: MessageService,
    private companyDataService: CompanyDetailsService,
    private reservationService: ReservationService,
    private hotelService: HotelService,
    private reservationCompanyService: ReservationCompanyService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private reservationServiceService: ReservationServiceService,
    private reservationSupplierService: ReservationSupplierService,
    private authService: AuthService,
    private printSettingsService: PrintSettingsService,
    private fb: FormBuilder
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    // Setup document columns for printing (used for pagination)
    this.docColumns = [
      { field: 'descriptionCombined', label: this.translate.instant('INVOICE.DESCRIPTION') || 'Description' },
      { field: 'quantity', label: this.translate.instant('INVOICE.QUANTITY') || 'Qty', pipe: 'number' },
      { field: 'price', label: this.translate.instant('INVOICE.PRICE') || 'Price', pipe: 'number' },
      { field: 'totalPrice', label: 'Total before VAT', pipe: 'number' },
      { field: 'vatPercent', label: 'VAT %' },
      { field: 'vatAmount', label: 'VAT', pipe: 'number' },
      { field: 'totalWithVat', label: 'Total', pipe: 'number' },
    ];
  }

  ngOnInit(): void {
    this.loading = true;
    this.setSellerName();

    this.invoiceShareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
    });

    this.route.queryParams.pipe(take(1)).subscribe(qParams => {
      if (qParams && qParams['print'] === 'true') {
        this.autoPrint = true;
      }
    });

    this.route.params.pipe(take(1)).subscribe((params) => {
      this.invoiceId = params['id'] ? +params['id'] : null;
      if (this.invoiceId) {
        this.loadInvoice();
      } else {
        this.loading = false;
      }
    });

    forkJoin({
      hotels: this.hotelService.getAll(),
      reservationCompanies: this.reservationCompanyService.getAll(),
      roomTypes: this.roomTypeService.getAll(),
      meals: this.reservationMealService.getAll(),
      views: this.reservationViewService.getAll(),
      services: this.reservationServiceService.getAll(),
      suppliers: this.reservationSupplierService.getAll(),
    }).subscribe({
      next: (res) => {
        this.hotelsMap.clear();
        this.reservationCompaniesMap.clear();
        this.roomTypesMap.clear();
        this.mealsMap.clear();
        this.viewsMap.clear();
        this.servicesMap.clear();
        this.suppliersMap.clear();

        (res.hotels || []).forEach((hotel: any) => {
          this.hotelsMap.set(String(hotel.id), hotel);
        });
        (res.reservationCompanies || []).forEach((company: any) => {
          this.reservationCompaniesMap.set(String(company.id), company);
        });
        (res.roomTypes || []).forEach((roomType: any) => {
          this.roomTypesMap.set(String(roomType.id), roomType);
        });
        (res.meals || []).forEach((meal: any) => {
          this.mealsMap.set(String(meal.id), meal);
        });
        (res.views || []).forEach((view: any) => {
          this.viewsMap.set(String(view.id), view);
        });
        (res.services || []).forEach((service: any) => {
          this.servicesMap.set(String(service.id), service);
        });
        (res.suppliers || []).forEach((supplier: any) => {
          this.suppliersMap.set(String(supplier.id), supplier);
        });

        // Update document data with proper lookup names if invoice is already loaded
        if (this.invoice) {
          this.prepareDocData();
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading lookup data:', error);
      },
    });

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
        
        this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
        this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
        this.showStamp = this.printSettingsService.getShowStamp();
      },
      error: (error) => {
        console.error('Error fetching company details:', error);
      },
    });
  }

  loadInvoice(): void {
    if (!this.invoiceId) return;

    this.loading = true;
    this.salesInvoiceService.getInvoiceById(this.invoiceId).subscribe({
      next: (invoiceData: any) => {
        this.invoice = {
          ...invoiceData,
          issueDate: new Date(invoiceData.issueDate),
          dueDate: new Date(invoiceData.dueDate),
        };

        // Use reservations from API response directly instead of fetching again
        if (invoiceData.reservations && Array.isArray(invoiceData.reservations) && invoiceData.reservations.length > 0) {
          this.reservationsMap.clear();
          this.allReservations = [];
          invoiceData.reservations.forEach((reservation: ReservationModel) => {
            if (reservation && reservation.id) {
              this.reservationsMap.set(String(reservation.id), reservation);
              this.allReservations.push(reservation);
            }
          });
        } else if (invoiceData.reservationIds && invoiceData.reservationIds.length > 0) {
          // Fallback: if reservations not in response, fetch them
          const reservationRequests = invoiceData.reservationIds.map((id: string) =>
            this.reservationService.getById(id).pipe(finalize(() => {}))
          );

          forkJoin(reservationRequests).subscribe({
            next: (reservations: ReservationModel[]) => {
              this.reservationsMap.clear();
              this.allReservations = [];
              reservations.forEach((reservation: ReservationModel) => {
                if (reservation && reservation.id) {
                  this.reservationsMap.set(String(reservation.id), reservation);
                  this.allReservations.push(reservation);
                }
              });

            // Prepare data for printing since we missed it in fallback
            this.prepareDocData();
            this.useLandscape = (this.docData?.length || 0) > this.descriptionRowsPerPage;

            this.loading = false;
            this.cdr.detectChanges();

            if (this.autoPrint) {
              setTimeout(() => this.printInvoice(), 500);
            }
            },
            error: (err) => {
              console.error('Error loading reservations:', err);
              this.loading = false;
              this.cdr.detectChanges();
            },
          });
          return; // Exit early to avoid setting loading to false twice
        }

        // Prepare data for printing
       this.prepareDocData();

// ✅ لو عدد صفوف جدول الوصف أكبر من عدد الصفوف في الصفحة الواحدة (8)
// نخلي الطباعة Landscape، غير كده تكون Portrait
this.useLandscape =
  (this.docData?.length || 0) > this.descriptionRowsPerPage;

        this.loading = false;
        this.cdr.detectChanges();

        if (this.autoPrint) {
          setTimeout(() => this.printInvoice(), 500);
        }
      },
      error: (error) => {
        console.error('Error loading invoice:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تحميل بيانات الفاتورة',
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private prepareDocData(): void {
    const items: any[] = [];

    // Add room entries
    this.getAllRoomEntries().forEach((entry) => {
      const roomTotalPrice = (entry.numberOfRooms || 0) * (entry.numberOfNights || 1) * (entry.roomRate || 0);
      const vatAmount = this.getVatAmountFromNet(roomTotalPrice);
      const totalWithVat = this.getTotalWithVat(roomTotalPrice);

      items.push({
        itemType: this.activeLanguage === 'en' ? 'Room' : 'غرفة',
        itemName: this.getRoomTypeName(entry.roomTypeId),
        description: `${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
        quantity: entry.numberOfRooms * entry.numberOfNights,
        price: entry.roomRate || 0,
        totalPrice: roomTotalPrice,
        vatPercent: '15%',
        vatAmount,
        totalWithVat,
        descriptionCombined: `${this.getRoomTypeName(entry.roomTypeId)} - ${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
      });

      if (entry.mealRate && entry.mealRate > 0) {
        const totalPrice = this.getRoomPax(entry) * entry.numberOfNights * entry.mealRate;
        const vatAmountMeal = this.getVatAmountFromNet(totalPrice);
        const totalWithVatMeal = this.getTotalWithVat(totalPrice);
        items.push({
          itemType: this.activeLanguage === 'en' ? 'Meal' : 'وجبة',
          itemName: this.getMealName(entry.reservationMealId),
          description: `${this.getRoomPax(entry)} ${this.activeLanguage === 'en' ? 'person' : 'شخص'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
          quantity: this.getRoomPax(entry) * entry.numberOfNights,
          price: entry.mealRate,
          totalPrice,
          vatPercent: '15%',
          vatAmount: vatAmountMeal,
          totalWithVat: totalWithVatMeal,
          descriptionCombined: `${this.getMealName(entry.reservationMealId)} - ${this.getRoomPax(entry)} ${this.activeLanguage === 'en' ? 'person' : 'شخص'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
        });
      }

      if (entry.viewRate && entry.viewRate > 0) {
        const totalPrice = entry.numberOfRooms * entry.numberOfNights * entry.viewRate;
        const vatAmountView = this.getVatAmountFromNet(totalPrice);
        const totalWithVatView = this.getTotalWithVat(totalPrice);
        items.push({
          itemType: this.activeLanguage === 'en' ? 'View' : 'إطلالة',
          itemName: this.getViewName(entry.reservationViewId),
          description: `${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
          quantity: entry.numberOfRooms * entry.numberOfNights,
          price: entry.viewRate,
          totalPrice,
          vatPercent: '15%',
          vatAmount: vatAmountView,
          totalWithVat: totalWithVatView,
          descriptionCombined: `${this.getViewName(entry.reservationViewId)} - ${entry.numberOfRooms} ${this.activeLanguage === 'en' ? 'room' : 'غرفة'} - ${entry.numberOfNights} ${this.activeLanguage === 'en' ? 'night' : 'ليلة'}`,
        });
      }
    });

    // Add service entries
    this.getAllServiceEntries().forEach(entry => {
      if (!entry) return;
      const saleItem = this.getInvoiceSaleItemForService(entry);
      
      let price = entry.salesPrice || 0;
      let totalPrice = this.getServiceNetPrice(entry);
      let vatAmount = this.getSalesVatAmount(entry);
      let totalWithVat = this.getServiceTotalSalesPrice(entry);
      
      if (saleItem) {
         price = saleItem.price || 0;
         totalPrice = saleItem.netPrice || 0;
         vatAmount = saleItem.taxAmount || 0;
         totalWithVat = saleItem.totalPrice || 0;
      }

      items.push({
        itemType: this.activeLanguage === 'en' ? 'Service' : 'خدمة',
        itemName: this.getServiceName(entry.reservationServiceId),
        description: entry.description || '-',
        quantity: entry.quantity || 0,
        price: price,
        totalPrice: totalPrice,
        vatPercent: '15%',
        vatAmount: vatAmount,
        totalWithVat: totalWithVat,
        descriptionCombined: `${this.getServiceName(entry.reservationServiceId)} - ${entry.description || '-'}`,
      });
    });

    this.docData = items;
  }

  // Get the customer company from the first reservation or fall back to invoice customer profile
  private getClientCompany(): any {
    if (!this.invoice || !this.invoice.reservationIds || this.invoice.reservationIds.length === 0) {
      return null;
    }
    const firstId = this.invoice.reservationIds[0];
    const reservation = this.reservationsMap.get(firstId);
    if (!reservation || !reservation.reservationClientCompanyId) {
      return null;
    }
    return this.reservationCompaniesMap.get(reservation.reservationClientCompanyId);
  }

  getCustomerName(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany) {
      return this.activeLanguage === 'en'
        ? clientCompany.englishName
        : clientCompany.arabicName;
    }

    // Fallback: use customerProfile from API if available
    if (this.invoice?.customerProfile) {
      return this.activeLanguage === 'en'
        ? this.invoice.customerProfile.englishName
        : this.invoice.customerProfile.arabicName;
    }

    return '-';
  }

  getCustomerPhone(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.contactNumber) {
      return clientCompany.contactNumber;
    }
    return this.invoice?.customerProfile?.contactNumber || '';
  }

  getCustomerEmail(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.email) {
      return clientCompany.email;
    }
    return this.invoice?.customerProfile?.email || '';
  }

  getCustomerTaxNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.taxNumber) {
      return clientCompany.taxNumber;
    }
    return this.invoice?.customerProfile?.taxNumber || '';
  }

  getCustomerOtherId(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.otherId) {
      return clientCompany.otherId;
    }
    return this.invoice?.customerProfile?.otherId || '';
  }

  getCustomerBuildingNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.buildingNumber) {
      return clientCompany.buildingNumber;
    }
    return this.invoice?.customerProfile?.buildingNumber || '';
  }

  getCustomerStreet(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.street) {
      return clientCompany.street;
    }
    return this.invoice?.customerProfile?.street || '';
  }

  getCustomerDistrict(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.district) {
      return clientCompany.district;
    }
    return this.invoice?.customerProfile?.district || '';
  }

  getCustomerCity(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.city) {
      return clientCompany.city;
    }
    return this.invoice?.customerProfile?.city || '';
  }

  getCustomerCountry(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.country) {
      return clientCompany.country;
    }
    return this.invoice?.customerProfile?.country || '';
  }

  getCustomerZipCode(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.postalCode) {
      return clientCompany.postalCode;
    }
    if (clientCompany && clientCompany.zipCode) {
      return clientCompany.zipCode;
    }
    return this.invoice?.customerProfile?.postalCode || (this.invoice?.customerProfile as any)?.zipCode || '';
  }

  getCustomerAdditionalContactNumber(): string {
    const clientCompany = this.getClientCompany();
    if (clientCompany && clientCompany.additionalContactNumber) {
      return clientCompany.additionalContactNumber;
    }
    return this.invoice?.customerProfile?.additionalContactNumber || '';
  }

  getName(item: any): string {
    if (!item) return '-';
    return this.activeLanguage === 'en'
      ? (item.englishName || '-')
      : (item.arabicName || '-');
  }

  // Get all room entries from all reservations
  getAllRoomEntries(): any[] {
    const allEntries: any[] = [];
    this.allReservations.forEach((reservation) => {
      if (
        reservation.reservationRoomEntries &&
        Array.isArray(reservation.reservationRoomEntries)
      ) {
        reservation.reservationRoomEntries.forEach((entry: any) => {
          allEntries.push({
            ...entry,
            reservationId: reservation.id,
            numberOfNights: reservation.numberOfNights || 1,
          });
        });
      }
    });
    return allEntries;
  }

  // Get all service entries from all reservations
  getAllServiceEntries(): any[] {
    const allEntries: any[] = [];
    this.allReservations.forEach((reservation) => {
      if (
        reservation.reservationServiceEntries &&
        Array.isArray(reservation.reservationServiceEntries)
      ) {
        reservation.reservationServiceEntries.forEach((entry: any) => {
          allEntries.push({
            ...entry,
            reservationId: reservation.id,
          });
        });
      }
    });
    return allEntries;
  }

  // Get room type name
  getRoomTypeName(roomTypeId: string): string {
    const roomType = this.roomTypesMap.get(roomTypeId);
    return this.getName(roomType);
  }

  // Get meal name
  getMealName(mealId: string): string {
    const meal = this.mealsMap.get(mealId);
    return this.getName(meal);
  }

  // Get view name
  getViewName(viewId: string): string {
    const view = this.viewsMap.get(viewId);
    return this.getName(view);
  }

  // Get service name
  getServiceName(serviceId: string): string {
    const service = this.servicesMap.get(serviceId);
    return this.getName(service);
  }

  // Get supplier name
  getSupplierName(supplierId: string): string {
    const supplier = this.suppliersMap.get(supplierId);
    return this.getName(supplier);
  }

  // Get room pax
  getRoomPax(entry: any): number {
    if (!entry.roomTypeId || !entry.numberOfRooms) return 0;
    const roomType = this.roomTypesMap.get(entry.roomTypeId);
    const personNo = roomType?.personNo || 1;
    return (entry.numberOfRooms || 0) * personNo;
  }

  // Get room total sales price
  getRoomTotalSalesPrice(entry: any): number {
    const numberOfNights = entry.numberOfNights || 1;
    const roomRate = entry.roomRate || 0;
    const numberOfRooms = entry.numberOfRooms || 0;
    const roomPax = this.getRoomPax(entry);
    const mealRate = entry.mealRate || 0;
    const viewRate = entry.viewRate || 0;

    if (!roomRate || !roomPax || !numberOfNights || !numberOfRooms) {
      return 0;
    }

    return (
      numberOfRooms * numberOfNights * roomRate +
      roomPax * numberOfNights * mealRate +
      numberOfRooms * numberOfNights * viewRate
    );
  }

  // Get room total cost price
  getRoomTotalCostPrice(entry: any): number {
    const numberOfNights = entry.numberOfNights || 1;
    const roomCost = entry.roomCost || 0;
    const numberOfRooms = entry.numberOfRooms || 0;
    const roomPax = this.getRoomPax(entry);
    const mealCost = entry.mealCost || 0;
    const viewCost = entry.viewCost || 0;

    if (!roomCost || !roomPax || !numberOfNights || !numberOfRooms) {
      return 0;
    }

    return (
      numberOfRooms * numberOfNights * roomCost +
      roomPax * numberOfNights * mealCost +
      numberOfRooms * numberOfNights * viewCost
    );
  }

  getInvoiceSaleItemForService(entry: any): any {
    if (!entry || !this.invoice || !this.invoice.saleItems || !this.invoice.saleItems.length) return null;
    const serviceName = this.getServiceName(entry.reservationServiceId)?.trim()?.toLowerCase();
    if (!serviceName || serviceName === '-') return null;

    return this.invoice.saleItems.find((item: any) => {
      const enName = item?.mainSalesClass?.englishName?.trim()?.toLowerCase();
      const arName = item?.mainSalesClass?.arabicName?.trim()?.toLowerCase();
      const desc = item?.description?.trim()?.toLowerCase();
      
      return enName === serviceName || arName === serviceName || (desc && desc.includes(serviceName));
    });
  }

  getServicePrice(entry: any): number {
    const saleItem = this.getInvoiceSaleItemForService(entry);
    if (saleItem && saleItem.price != null) return saleItem.price;
    return entry.salesPrice || 0;
  }

  getServiceNetPrice(entry: any): number {
    const saleItem = this.getInvoiceSaleItemForService(entry);
    if (saleItem && saleItem.netPrice != null) return saleItem.netPrice;
    const quantity = entry.quantity || 0;
    const salesPrice = entry.salesPrice || 0;
    return quantity * salesPrice;
  }

  // Get service total sales price
  getServiceTotalSalesPrice(entry: any): number {
    const saleItem = this.getInvoiceSaleItemForService(entry);
    if (saleItem && saleItem.totalPrice != null) return saleItem.totalPrice;
    
    const quantity = entry.quantity || 0;
    const salesPrice = entry.salesPrice || 0;
    if (!quantity || !salesPrice) return 0;
    const net = quantity * salesPrice;
    return net + this.getSalesVatAmount(entry);
  }

  // Get service total cost price
  getServiceTotalCostPrice(entry: any): number {
    const quantity = entry.quantity || 0;
    const costPrice = entry.costPrice || 0;
    if (!quantity || !costPrice) return 0;
    return quantity * costPrice;
  }

  // Get sales VAT amount
  getSalesVatAmount(entry: any): number {
    const saleItem = this.getInvoiceSaleItemForService(entry);
    if (saleItem && saleItem.taxAmount != null) return saleItem.taxAmount;
    
    const salesPrice = entry.salesPrice || 0;
    const quantity = entry.quantity || 0;
    return salesPrice ? Math.round(salesPrice * quantity * 0.15 * 100) / 100 : 0;
  }

  // Get cost VAT amount
  getCostVatAmount(entry: any): number {
    const costPrice = entry.costPrice || 0;
    const quantity = entry.quantity || 0;
    return costPrice ? Math.round(costPrice * quantity * 0.15 * 100) / 100 : 0;
  }

  // Get room totals
  getRoomTotals(): { totalSalesPrice: number; totalCostPrice: number } {
    let totalSalesPrice = 0;
    let totalCostPrice = 0;

    this.getAllRoomEntries().forEach((entry) => {
      const salesPrice = this.getRoomTotalSalesPrice(entry);
      const costPrice = this.getRoomTotalCostPrice(entry);
      totalSalesPrice += salesPrice;
      totalCostPrice += costPrice;
    });

    return {
      totalSalesPrice: Math.round(totalSalesPrice * 100) / 100,
      totalCostPrice: Math.round(totalCostPrice * 100) / 100,
    };
  }

  // Get service totals
  getServiceTotals(): { totalSalesPrice: number; totalCostPrice: number } {
    let totalSalesPrice = 0;
    let totalCostPrice = 0;

    this.getAllServiceEntries().forEach((entry) => {
      const salesPrice = this.getServiceTotalSalesPrice(entry);
      const costPrice = this.getServiceTotalCostPrice(entry);
      totalSalesPrice += salesPrice;
      totalCostPrice += costPrice;
    });

    return {
      totalSalesPrice: Math.round(totalSalesPrice * 100) / 100,
      totalCostPrice: Math.round(totalCostPrice * 100) / 100,
    };
  }

  // Get net price - use value from API
  getNetPrice(): number {
    if (!this.invoice) return 0;
    return this.invoice.netPrice || 0;
  }

  // Get tax amount - use value from API
  getTaxAmount(): number {
    if (!this.invoice) return 0;
    return this.invoice.taxAmount || 0;
  }

  // Get total price - use value from API
  getTotalPrice(): number {
    if (!this.invoice) return 0;
    return this.invoice.totalPrice || 0;
  }

  private setSellerName(): void {
    const user: any = this.authService.currentUserValue;
    if (!user) {
      this.sellerName = '';
      return;
    }
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    this.sellerName = [first, last].filter(Boolean).join(' ');
  }

  // VAT helpers for print calculations
  getVatAmountFromNet(net: number): number {
    if (!net) return 0;
    return Math.round(net * 0.15 * 100) / 100;
  }

  getTotalWithVat(net: number): number {
    const vat = this.getVatAmountFromNet(net);
    return Math.round((net + vat) * 100) / 100;
  }


  // Go back
  goBack() {
    this.router.navigate(['/invoices/reservation-list']);
  }

  createTransaction(id: number): void {
    this.loading = true;
    this.salesInvoiceService.createInvoiceTransaction(id).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.activeLanguage === 'en' 
            ? 'Transaction created successfully' 
            : 'تم إنشاء القيد بنجاح',
        });
        this.loadInvoice();  // Reload invoice after transaction creation
      },
      error: (er) => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('INVOICE.CHECK_ACCOUNTS_SALES_INVOICE'),
        });
      }
    });
  }

  relatedReservationsOptions: any[] = [];
  selectedReservationId: string | null = null;

  viewReservations(): void {
    if (this.invoice?.reservationIds && this.invoice.reservationIds.length > 0) {
      // Always navigate to the first reservation (Dropdown will appear on that page for the rest)
      this.router.navigate(['/reservations', this.invoice.reservationIds[0]]);
    }
  }

  printInvoice(): void {
    if (this.printComponent) {
      this.cdr.detectChanges();
      setTimeout(() => {
        this.printComponent.triggerPrint();
      }, 100);
    }
  }

  printDocument() {
    const targetId = Number((this.invoice as any)?.invoiceId || this.invoice?.id);
    if (targetId) {
      this.showPrintOrientationDialog(targetId, true);
    }
  }

  printOrientationDialogVisible = false;
  pendingInvoiceId: number | null = null;
  pendingIsPrint: boolean = false;
  selectedPrintType: 'A4Portrait' | 'A4Landscape' | 'Thermal80mm' | 'Thermal58mm' = 'A4Portrait';

  showPrintOrientationDialog(invoiceId: number, isPrint: boolean) {
    this.pendingInvoiceId = invoiceId;
    this.pendingIsPrint = isPrint;
    this.selectedPrintType = 'A4Portrait';
    this.printOrientationDialogVisible = true;
  }

  confirmPrintOrientation() {
    if (this.pendingInvoiceId !== null) {
      if (this.pendingIsPrint) {
        this.salesInvoiceService.printDocument(this.pendingInvoiceId, this.selectedPrintType);
      } else {
        this.salesInvoiceService.downloadDocument(this.pendingInvoiceId, this.selectedPrintType);
      }
    }
    this.printOrientationDialogVisible = false;
    this.pendingInvoiceId = null;
  }

  printInvoice3(): void {
    if (this.printComponent3) {
      this.cdr.detectChanges();
      setTimeout(() => {
        this.printComponent3.triggerPrint();
      }, 100);
    }
  }

  // Calculate invoice totals for printing
  getInvoiceTaxAmount(): number {
    return this.getTaxAmount();
  }

  getInvoiceNetPrice(): number {
    return this.getNetPrice();
  }

  getInvoiceTotalPrice(): number {
    return this.getTotalPrice();
  }

  getInvoiceTargetId(): number {
    return Number(this.invoiceId || 0);
  }

  shareInvoice(): void {
    if (this.invoiceShareForm) {
      this.invoiceShareForm.reset({
        email: '',
        whatsappNumber: '',
      });
    }
    this.invoiceShareActiveTabIndex = 0;
    this.invoiceShareDialogVisible = true;
  }

  closeInvoiceShareDialog(): void {
    this.invoiceShareDialogVisible = false;
    this.shareBusy = false;
    if (this.invoiceShareForm) {
      this.invoiceShareForm.reset();
    }
  }

  submitInvoiceShareEmail(): void {
    const email = (this.invoiceShareForm.get('email')?.value || '').trim();
    if (!email || this.invoiceShareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('COMMON.ERROR'),
        detail: this.translate.instant('INVOICE.SHARE_ENTER_VALID_EMAIL')
      });
      return;
    }

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    this.salesInvoiceService.shareInvoiceByEmail(Number(this.invoiceId), email).subscribe({
      next: (res: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: res?.message || this.translate.instant('INVOICE.SHARED_SUCCESSFULLY')
        });
        this.closeInvoiceShareDialog();
      },
      error: (err: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: err?.error?.message || this.translate.instant('INVOICE.SHARE_FAILED')
        });
      }
    });
  }

  submitInvoiceShareWhatsapp(): void {
    const raw = this.invoiceShareForm.get('whatsappNumber')?.value || '';
    const phone = String(raw).replace(/\D/g, '').trim();

    if (!phone || this.invoiceShareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('COMMON.ERROR'),
        detail: this.translate.instant('INVOICE.SHARE_ENTER_VALID_PHONE')
      });
      return;
    }

    this.shareBusy = true;
    this.invoiceShareForm.disable({ emitEvent: false });

    this.salesInvoiceService.shareInvoiceByWhatsapp(Number(this.invoiceId), phone).subscribe({
      next: (res: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('COMMON.SUCCESS'),
          detail: res?.message || this.translate.instant('INVOICE.SHARED_SUCCESSFULLY')
        });
        if (res?.whatsappWebUrl) {
          window.open(res.whatsappWebUrl, '_blank');
        }
        this.closeInvoiceShareDialog();
      },
      error: (err: any) => {
        this.shareBusy = false;
        this.invoiceShareForm.enable({ emitEvent: false });
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('COMMON.ERROR'),
          detail: err?.error?.message || this.translate.instant('INVOICE.SHARE_FAILED')
        });
      }
    });
  }
}



