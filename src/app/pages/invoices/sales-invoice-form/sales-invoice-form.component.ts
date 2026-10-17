import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormArray,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Modal } from 'bootstrap';
import { InvoiceNo } from 'src/app/models/invoice/invoiceNo';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';

import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { MainSalesClassService } from 'src/app/services/sales-classes-tree/main-sales-class.service';
import { RootSalesClassService } from 'src/app/services/sales-classes-tree/root-sales-class.service';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { SalesItem } from 'src/app/models/salesInvoice/salesItem';
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslationService } from '../../../modules/i18n';
import { Observable, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
  AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { FormatDecimalPipe } from '../../../pipes/format-decimal.pipe';
import { formatDateToUTCString, getSystemNow } from 'src/app/utils/dateUtils';
import { ReservationService } from 'src/app/services/reservations/reservation.service';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import { ReservationMealService } from 'src/app/services/reservation-meal/reservation-meal.service';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { ReservationCompanyService } from 'src/app/services/reservations/reservation-company.service';
import { NotificationService } from 'src/app/services/notification.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BackButtonComponent } from '../../../shared-components/back-button/back-button.component';
import { PrintDocumentComponent } from '../../../shared-components/print-document/print-document.component';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { QRCodeModule } from 'angularx-qrcode';
import { QrcodeService } from 'src/app/services/qrcode/qrcode.service';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';
import { BarcodeFailedEvent, BarcodeResolvedEvent } from '../../../_metronic/shared/barcode-input/barcode-input.component';
import { BarcodeService } from '../../../services/barcode/barcode.service';
import { SharedModule } from '../../../_metronic/shared/shared.module';
import { StoreDetailsService } from '../../../services/inventory/store-details.service';
import { SystemSettingService } from '../../../services/system-setting.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { PrintSettingsService } from 'src/app/services/print-settings.service';
import { InvoiceLookupCacheService } from 'src/app/services/salesInvoice/invoice-lookup-cache.service';

@Component({
  selector: 'app-sales-invoice-form',
  standalone: true,
  imports: [
    FormatDecimalPipe,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    TranslateModule,
    DropdownModule,
    InputNumberModule,
    CalendarModule,
    ConfirmDialogModule,
    MessagesModule,
    ToastModule,
    ButtonModule,
    AutoCompleteModule,
    BackButtonComponent,
    PrintDocumentComponent,
    QRCodeModule,
    CustomDatePipe,
    SharedModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],

  templateUrl: './sales-invoice-form.component.html',
  styleUrls: ['./sales-invoice-form.component.scss'],
})
export class SalesInvoiceFormComponent implements OnInit {
  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }
  copyId: number | null = null;
  copyLoaded: boolean = false;
  lookupDataLoaded: boolean = false; // cached flag – skip forkJoin on repeat visits
  loadError: boolean = false;
  loadErrorMessage: string = '';
  retryLoad(): void {
    this.loadError = false;
    this.loading = true;
    this.ngOnInit();
  }
  private preloadedInvoice$?: Observable<any>;

  @ViewChild('invoiceModal') invoiceModal: ElementRef | undefined;
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  @ViewChild('barcodeInputHost') barcodeInputHost: ElementRef | undefined;
  private modalInstance: Modal | undefined;

  // Company details for printing
  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  // QR Code for print
  qrImageUrl: string | null = null;

  // Print-related properties
  printDataColumns: any[] = [];
  printDataRows: any[] = [];
  sellerName: string = '';
  showCompanySignature = true;
  showCustomerSignature = true;
  showStamp = true;
  useLandscape = false;
  descriptionRowsPerPage = 8;
  selectedPolicies: any[] = [];
  selectedBanks: any[] = [];
  anyPolicyChecked: boolean = false;
  anyBankChecked: boolean = false;

  invoiceForm: FormGroup;
  invoiceId: number;
  invoiceNo: InvoiceNo | null = null;
  isMinimized = false;
  isMaximized = false;
  customers: any[] = [];
  allCustomers: any[] = []; // unfiltered, used for lookup in edit mode
  mainSalesArray: any[] = [];
  rawMainSalesArray: any[] = []; // unfiltered master list of sales classes
  stores: Array<{ label: string; value: string }> = [];
  isLinkedToInventory = false;

  // Quick-add customer state
  isNewCustomer: boolean = false;
  newCustomerType: 'individual' | 'company' = 'individual';
  newCustomerName: string = '';
  newCustomerPhone: string = '';
  newCustomerTaxNumber: string = '';
  isCreatingCustomer: boolean = false;
  isDueDateManuallyEdited: boolean = false;

  // Lookup maps for hotels and reservation companies
  hotelsMap = new Map<string, any>();
  reservationCompaniesMap = new Map<string, any>();

  translate: TranslateService;
  activeLanguage: string = 'en';
  isEditMode: boolean = false;

  get dynamicInvoiceTypeOptions(): Array<{ label: string; value: string }> {
    return [
      { label: this.translateService.instant('INVOICE.SALE_INVOICE'), value: 'sale' },
      {
        label: this.isReservationLocked
          ? (this.activeLanguage === 'ar' ? 'فاتورة حجز آلي' : 'Automatic Reservation Invoice')
          : this.translateService.instant('INVOICE.RESERVATION_INVOICE'),
        value: 'reservation'
      }
    ];
  }

  get isReservationLocked(): boolean {
    const isReservation = this.invoiceForm?.get('invoiceType')?.value === 'reservation';
    const hasReservationIds = this.invoiceForm?.get('reservationIds')?.value?.length > 0;
    const saleInvoiceType = this.invoiceForm?.get('saleInvoiceType')?.value;
    return (isReservation && hasReservationIds) || saleInvoiceType === 2;
  }

  applyFilterByInvoiceType(isAutoReservationMode?: boolean): void {
    const isAutoRes = isAutoReservationMode !== undefined
      ? isAutoReservationMode
      : this.isReservationLocked || this.invoiceForm?.get('saleInvoiceType')?.value === 2;

    if (isAutoRes) {
      // 1) فاتورة حجز آلي (نوع 2): تظهر شركات الحجز وجميع العملاء
      this.customers = (this.allCustomers || []).filter((customer) => !!customer.mainAccountId);
      this.mainSalesArray = [...(this.rawMainSalesArray || [])];
    } else {
      // 2) فاتورة مبيعات عادية (نوع 0) أو حجز يدوي (نوع 1): استبعاد شركات الحجز وأصناف الحجز
      this.customers = (this.allCustomers || []).filter((customer) => !!customer.mainAccountId && !customer.isReservationCompany);
      this.mainSalesArray = (this.rawMainSalesArray || []).filter((item) => !item.isReservationItem);
    }

    // الحفاظ على العميل المحدد حالياً إن وجد
    const currentCustomerId = this.invoiceForm?.get('customerProfileId')?.value;
    if (currentCustomerId) {
      const normCurId = String(currentCustomerId).toLowerCase().trim();
      const existingInFiltered = this.customers.find((c) => c?.id && String(c.id).toLowerCase().trim() === normCurId);
      if (!existingInFiltered) {
        const matched = (this.allCustomers || []).find((c) => c?.id && String(c.id).toLowerCase().trim() === normCurId);
        if (matched) {
          this.customers = [matched, ...this.customers];
          this.invoiceForm.get('customerProfileId')?.setValue(String(matched.id), { emitEvent: false });
        }
      } else {
        this.invoiceForm.get('customerProfileId')?.setValue(String(existingInFiltered.id), { emitEvent: false });
      }
    }

    this.updateCustomerOptions();
    this.updateMainSalesClassOptions();
  }

  applyLockIfReservation(): void {
    this.applyFilterByInvoiceType();
    if (this.isReservationLocked) {
      this.invoiceForm.get('customerProfileId')?.disable({ emitEvent: false });
      this.invoiceForm.get('invoiceType')?.disable({ emitEvent: false });
      this.invoiceForm.get('storeDetailsId')?.disable({ emitEvent: false });

      this.saleItems.controls.forEach(item => {
        item.get('mainSalesClassId')?.disable({ emitEvent: false });
        item.get('quantity')?.disable({ emitEvent: false });
        item.get('price')?.disable({ emitEvent: false });
        item.get('noOfNights')?.disable({ emitEvent: false });
        item.get('discount')?.disable({ emitEvent: false });
      });
    } else {
      this.invoiceForm.get('customerProfileId')?.enable({ emitEvent: false });
      this.invoiceForm.get('invoiceType')?.enable({ emitEvent: false });
      this.invoiceForm.get('storeDetailsId')?.enable({ emitEvent: false });

      this.saleItems.controls.forEach(item => {
        item.get('mainSalesClassId')?.enable({ emitEvent: false });
        item.get('quantity')?.enable({ emitEvent: false });
        item.get('price')?.enable({ emitEvent: false });
        item.get('noOfNights')?.enable({ emitEvent: false });
        item.get('discount')?.enable({ emitEvent: false });
      });
    }
  }

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  constructor(
    private salesClassService: MainSalesClassService,
    private rootSalesClassService: RootSalesClassService,
    private fb: FormBuilder,
    private salesInvoiceService: SalesInvoiceService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private customerService: CustomerProfileService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private notifications: NotificationService,
    private reservationService: ReservationService,
    private roomTypeService: RoomTypeService,
    private reservationMealService: ReservationMealService,
    private reservationViewService: ReservationViewService,
    private reservationServiceService: ReservationServiceService,
    private hotelService: HotelService,
    private reservationCompanyService: ReservationCompanyService,
    private companyDataService: CompanyDetailsService,
    private qrcodeService: QrcodeService,
    private barcodeService: BarcodeService,
    private storeDetailsService: StoreDetailsService,
    private systemSettingService: SystemSettingService,
    private authService: AuthService,
    private printSettingsService: PrintSettingsService,
    private lookupCache: InvoiceLookupCacheService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    this.route.paramMap.subscribe((params) => {
      this.invoiceId = params.get('id')
        ? parseInt(params.get('id')!, 10)
        : null;

      if (this.invoiceId) this.isEditMode = true;
    });

    this.initiateForm();
  }

  initiateForm() {
    this.invoiceForm = this.fb.group({
      id: [this.invoiceId],
      invoiceNo: [],
      currency: ['SAR'],
      customerProfileId: [''],
      customerProfileName: [''],
      invoiceType: ['sale'], // Default to 'sale'
      referenceNumber: [],
      description: ['', [Validators.maxLength(1000)]],
      notes: [],
      issueDate: [getSystemNow(), [Validators.required]],
      dueDate: [getSystemNow()],
      tax: [null],
      taxAmount: [null],
      discountType: ['amount'],
      discount: [null, [Validators.min(0)]],
      discountAmount: [null, [Validators.min(0)]],
      storeDetailsId: [null],
      totalPrice: [null],
      netPrice: [null],
      // reservationId: [null],
      saleItems: this.fb.array<FormGroup>([]),
      isQuotation: [false],
      isFrontal: [this.isFrontal],
      saleInvoiceType: [null],

      reservationIds: [[]],
    });

    this.isDueDateManuallyEdited = false;

    this.invoiceForm.get('issueDate')?.valueChanges.subscribe((newIssueDate) => {
      if (!this.isDueDateManuallyEdited) {
        if (newIssueDate) {
          this.invoiceForm.get('dueDate')?.setValue(newIssueDate, { emitEvent: false });
        }
      }
    });

    this.invoiceForm.get('dueDate')?.valueChanges.subscribe(() => {
      this.isDueDateManuallyEdited = true;
    });

    this.invoiceForm.get('invoiceType')?.valueChanges.subscribe(() => {
      this.applyFilterByInvoiceType();
    });
  }

  //#region Modal
  toggleModalSize() {
    if (this.invoiceModal) {
      const modalElement =
        this.invoiceModal.nativeElement.querySelector('.modal-dialog'); // Target the modal dialog

      if (this.isMaximized) {
        this.isMaximized = false;
        this.isMinimized = false;
        modalElement.classList.remove('modal-lg');
      } else if (this.isMinimized) {
        this.isMinimized = false;
        this.isMaximized = true;
        modalElement.classList.add('modal-lg');
      } else {
        // Minimize the modal by resetting classes
        this.isMinimized = true;
        this.isMaximized = false;
        modalElement.classList.remove('modal-lg'); // Ensure it's at default size when minimized
      }
    }
  }

  openModal() {
    if (this.invoiceModal) {
      this.modalInstance = new Modal(this.invoiceModal.nativeElement);
      this.modalInstance.show();
    }
  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  //#endregion
  ngOnInit(): void {
    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();
    this.setSellerName();


    // Load company details for printing
    this.loadCompanyDetails();

    // Setup print columns
    this.setupPrintColumns();

    // ⬅️ خُد copyId و reservationId و reservationIds[] من الـ query params
    this.route.queryParamMap.subscribe((params) => {
      const cid = params.get('copyId') || params.get('copyFrom');
      const newCopyId = cid ? +cid : null;

      // لو نفس الكوبي ID اللي اتحمل قبل كده – تجاهله
      if (newCopyId && newCopyId === this.copyId && this.copyLoaded) {
        return;
      }

      // كوبي جديد: reset copyLoaded عشان نقبل الداتا الجديدة
      if (newCopyId && newCopyId !== this.copyId) {
        this.copyLoaded = false;
      }

      this.copyId = newCopyId;

      if (this.copyId && !this.invoiceId) {
        this.loading = true;

        // لو الـ lookup data اتحملت قبل كده، نروح للـ copy مباشرة بدون forkJoin
        if (this.lookupDataLoaded) {
          this.salesInvoiceService.getCopyTemplate(this.copyId).subscribe({
            next: (template) => {
              if (template && !this.copyLoaded) {
                this.loadError = false;
                this.applyCopyToForm(template);
              }
            },
            error: (err: any) => {
              console.error('Error fetching copy template:', err);
              this.salesInvoiceService.getInvoiceById(this.copyId).subscribe({
                next: (original) => {
                  if (original && !this.copyLoaded) {
                    this.loadError = false;
                    this.applyCopyToForm(original);
                  }
                },
                error: () => {
                  this.loadError = true;
                  this.loadErrorMessage = this.activeLanguage === 'ar'
                    ? 'تعذر جلب بيانات الفاتورة الأصلية لنسخها.'
                    : 'Failed to retrieve original invoice data for copying.';
                  this.loading = false;
                  this.cdr.detectChanges();
                }
              });
            }
          });
          return; // skip loadData / loadInventoryLinkingContext
        }

        this.salesInvoiceService.getCopyTemplate(this.copyId).subscribe({
          next: (template) => {
            if (template && !this.copyLoaded) {
              this.loadError = false;
              this.applyCopyToForm(template);
            }
          },
          error: (err: any) => {
            console.error('Error fetching copy template:', err);
            // Fallback to getInvoiceById if copy-template is unavailable
            this.salesInvoiceService.getInvoiceById(this.copyId).subscribe({
              next: (original) => {
                if (original && !this.copyLoaded) {
                  this.loadError = false;
                  this.applyCopyToForm(original);
                }
              },
              error: () => {
                this.loadError = true;
                this.loadErrorMessage = this.activeLanguage === 'ar'
                  ? 'تعذر جلب بيانات الفاتورة الأصلية لنسخها.'
                  : 'Failed to retrieve original invoice data for copying.';
                this.loading = false;
                this.cdr.detectChanges();
              }
            });
          }
        });
      } else if (this.invoiceId) {
        this.loading = true;
        this.initInvoiceForm();
      }

      const singleId = params.get('reservationId');
      const manyIds = params.getAll('reservationIds'); // 👈 مهم: يدعم تكرار البرامز

      this.loadInventoryLinkingContext(() => {
        // نولّد رقم فاتورة لو جديد فقط وليس في وضع النسخ (لأن النسخ يجلب رقم الفاتورة)
        if (!this.invoiceId && !this.copyId && !this.invoiceNo?.invoiceNo) {
          this.generateInvoiceNum();
        }

        // نحمل الداتا الأساسية (العملاء + شجر المبيعات)، وبعدها نحمّل الحجوزات
        if (manyIds && manyIds.length) {
          this.loadData(undefined, manyIds);
        } else if (singleId) {
          this.loadData(singleId);
        } else if (this.copyId) {
          setTimeout(() => {
            this.loadData();
          }, 100);
        } else {
          this.loadData(); // بدون حجز
        }
      });
    });
  }

  private loadInventoryLinkingContext(onDone: () => void): void {
    this.systemSettingService.getAll().subscribe({
      next: (settings) => {
        this.isLinkedToInventory = !!settings?.[0]?.isLinkedToInventory;
        const storeControl = this.invoiceForm.get('storeDetailsId');

        if (this.isLinkedToInventory) {
          storeControl?.setValidators([Validators.required]);
          storeControl?.updateValueAndValidity({ emitEvent: false });
          this.loadStores(onDone);
          return;
        }

        storeControl?.clearValidators();
        storeControl?.setValue(null, { emitEvent: false });
        storeControl?.updateValueAndValidity({ emitEvent: false });
        onDone();
      },
      error: () => {
        this.isLinkedToInventory = false;
        const storeControl = this.invoiceForm.get('storeDetailsId');
        storeControl?.clearValidators();
        storeControl?.setValue(null, { emitEvent: false });
        storeControl?.updateValueAndValidity({ emitEvent: false });
        onDone();
      },
    });
  }

  private loadStores(onDone: () => void): void {
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.stores = (stores || [])
          .filter((store) => store.mainAccountId)
          .map((store) => ({
            label:
              this.activeLanguage === 'en'
                ? store.englishName || store.arabicName
                : store.arabicName || store.englishName,
            value: store.id,
          }));
        onDone();
      },
      error: () => {
        this.stores = [];
        onDone();
      },
    });
  }


  initInvoiceForm() {
    if (this.invoiceId) {
      // ===== وضع تعديل =====
      this.salesInvoiceService
        .getInvoiceById(this.invoiceId)
        .subscribe((invoice) => {
          const rawCustomerId = invoice.customerProfileId
            ? String(invoice.customerProfileId)
            : null;

          // Patch all invoice fields first
          this.invoiceForm.patchValue({
            ...invoice,
            customerProfileId: rawCustomerId,
            storeDetailsId: (invoice as any).storeDetailsId ?? null,
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
          });

          // Resolve customer name: first try local list, else fetch from server
          if (rawCustomerId) {
            const localCustomer = [...(this.allCustomers || []), ...(this.customers || [])]
              .find((c) => String(c.id) === rawCustomerId);

            if (localCustomer) {
              const displayName = this.activeLanguage === 'en'
                ? localCustomer.englishName
                : localCustomer.arabicName;
              this.invoiceForm.get('customerProfileId')?.setValue(String(localCustomer.id));
              this.invoiceForm.get('customerProfileName')?.setValue(displayName);
            } else {
              // Fallback: fetch directly from server
              this.customerService.getById(rawCustomerId).subscribe({
                next: (customer) => {
                  if (customer) {
                    const displayName = this.activeLanguage === 'en'
                      ? customer.englishName
                      : customer.arabicName;
                    this.invoiceForm.get('customerProfileId')?.setValue(String(customer.id));
                    this.invoiceForm.get('customerProfileName')?.setValue(displayName);
                    // Add to customers list so dropdown shows it
                    if (!this.customers.find(c => String(c.id) === String(customer.id))) {
                      this.customers = [customer, ...this.customers];
                      this.updateCustomerOptions();
                    }
                    this.cdr.detectChanges();
                  }
                },
                error: () => { }
              });
            }
          }

          if (!this.customerOptionsFiltered?.length) {
            this.customerOptionsFiltered = this.customerOptions;
          }

          const isFrontalInv = !!(
            invoice.isFrontal === true ||
            (invoice as any).isFrontal === 'true' ||
            (invoice as any).isFrontal === 1 ||
            (invoice as any).IsFrontal === true ||
            (invoice as any).IsFrontal === 'true' ||
            (invoice as any).IsFrontal === 1 ||
            (typeof invoice.invoiceNo === 'string' && invoice.invoiceNo.startsWith('FINV-'))
          );
          if (isFrontalInv) {
            this.isFrontal = true;
            this.invoiceForm.get('isFrontal')?.setValue(true);
          }

          invoice.saleItems?.forEach((item) => this.addItem(item));

          if (invoice.isQuotation) {
            this.generateInvoiceNum();
            this.invoiceForm.get('isQuotation')?.setValue(false);
          }

          this.updateInvoiceTotals();
          this.applyLockIfReservation();
          this.loading = false;
          this.cdr.detectChanges();
        });
    } else {
      // ===== وضع إنشاء جديد =====
      if (this.copyId) {
        if (this.copyLoaded) {
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        // ←← منطق النسخ: نجيب التمبلت ونطبّقه
        this.salesInvoiceService
          .getCopyTemplate(this.copyId)
          .subscribe({
            next: (template) => {
              this.loadError = false;
              this.applyCopyToForm(template);
            },
            error: (err: any) => {
              console.error('Error fetching copy template in initInvoiceForm:', err);
              this.salesInvoiceService.getInvoiceById(this.copyId).subscribe({
                next: (original) => {
                  this.loadError = false;
                  this.applyCopyToForm(original);
                },
                error: () => {
                  this.loadError = true;
                  this.loadErrorMessage = this.activeLanguage === 'ar'
                    ? 'تعذر جلب بيانات الفاتورة الأصلية لنسخها.'
                    : 'Failed to retrieve original invoice data for copying.';
                  this.loading = false;
                  this.cdr.detectChanges();
                }
              });
            }
          });
      } else {
        // الحالة القديمة: 10 صفوف فاضية
        for (let i = 0; i < 10; i++) {
          this.addItem({
            id: null,
            itemNo: '',
            mainSalesClassId: null,
            price: null,
            quantity: null,
            noOfNights: 1,
            tax: 15,
            taxAmount: null,
            discount: null,
            discountAmount: null,
            totalPrice: null,
            netPrice: null,
            saleInvoiceId: this.invoiceId,
          });
        }
        this.cdr.detectChanges();
        this.updateInvoiceTotals();
        this.applyLockIfReservation();
        this.loading = false;
      }
    }
  }
  private applyCopyToForm(source: SalesInvoice): void {
    if (!source) return;
    this.copyLoaded = true;

    // الهيدر
    const rawCustomerId = source.customerProfileId ? String(source.customerProfileId) : null;
    let customerName = (source as any).customerProfileName || '';

    if (source.customerProfile) {
      customerName = this.activeLanguage === 'en'
        ? (source.customerProfile.englishName || source.customerProfile.arabicName)
        : (source.customerProfile.arabicName || source.customerProfile.englishName);
    }

    // Ensure customer is present in this.customers so the dropdown can show and select it immediately
    if (rawCustomerId) {
      const existing = (this.customers || []).find((c) => String(c.id) === rawCustomerId);
      if (!existing) {
        const custObj = {
          ...(source.customerProfile || {}),
          id: rawCustomerId,
          arabicName: source.customerProfile?.arabicName || customerName,
          englishName: source.customerProfile?.englishName || customerName,
          mainAccountId: source.customerProfile?.mainAccountId || 'temp'
        };
        this.customers = [custObj, ...(this.customers || [])];
        this.allCustomers = [custObj, ...(this.allCustomers || [])];
      } else if (!customerName) {
        customerName = this.activeLanguage === 'en' ? (existing.englishName || existing.arabicName) : (existing.arabicName || existing.englishName);
      }
    }

    let targetStoreId = (source as any).storeDetailsId ?? this.invoiceForm.get('storeDetailsId')?.value ?? null;
    if (!targetStoreId && this.isLinkedToInventory && this.stores && this.stores.length > 0) {
      targetStoreId = this.stores[0].value;
    }

    this.invoiceForm.patchValue({
      id: null,
      invoiceNo: null,
      currency: source.currency || 'SAR',
      customerProfileId: rawCustomerId,
      customerProfileName: customerName,
      description: source.description || '',
      notes: source.notes || '',
      referenceNumber: null,
      issueDate: new Date(),
      dueDate: new Date(),
      tax: source.tax ?? null,
      taxAmount: source.taxAmount ?? null,
      discountType: (source as any).discountType || 'amount',
      discount: source.discount ?? null,
      discountAmount: source.discountAmount ?? null,
      storeDetailsId: targetStoreId,
      totalPrice: null,
      netPrice: null,
      isQuotation: false,
    });

    this.invoiceNo = null;
    this.generateInvoiceNum();

    // العناصر: امسح القديم وابني الجديد
    this.saleItems.clear();

    (source.saleItems || []).forEach((it: any) => {
      const rawClassId = it.mainSalesClassId || it?.mainSalesClass?.id || null;
      const mainSalesClassId = rawClassId ? String(rawClassId) : null;

      let mainSalesClass = mainSalesClassId
        ? (this.mainSalesArray || []).find((x) => String(x.id) === mainSalesClassId)
        : null;

      if (!mainSalesClass && (it.mainSalesClass || mainSalesClassId)) {
        const name = this.activeLanguage === 'en'
          ? (it.mainSalesClass?.englishName || it.mainSalesClass?.arabicName || '')
          : (it.mainSalesClass?.arabicName || it.mainSalesClass?.englishName || '');
        mainSalesClass = {
          ...(it.mainSalesClass || {}),
          id: mainSalesClassId,
          displayName: name,
          arabicName: it.mainSalesClass?.arabicName || '',
          englishName: it.mainSalesClass?.englishName || '',
          measurementUnit: it.mainSalesClass?.measurementUnit || null,
        };
        this.mainSalesArray = [...(this.mainSalesArray || []), mainSalesClass];
      }

      const fg = this.fb.group({
        id: [null],
        itemNo: [{ value: '', disabled: true }],
        mainSalesClassId: [mainSalesClassId],
        price: [
          it.price,
          [Validators.required, Validators.min(0), Validators.max(999999999)],
        ],
        quantity: [
          it.quantity ?? 0,
          [Validators.required, Validators.min(0.0001)],
        ],
        noOfNights: [
          it.noOfNights ?? 1,
          [
            Validators.required,
            Validators.min(1),
            Validators.pattern('^[0-9]*$'),
          ],
        ],
        discount: [it.discount ?? 0, [Validators.min(0)]],
        discountAmount: [it.discountAmount ?? 0],
        netPrice: [it.netPrice ?? 0],
        tax: [it.tax ?? 15],
        taxAmount: [it.taxAmount ?? 0],
        totalPrice: [it.totalPrice ?? 0],
        saleInvoiceId: [null],
        storeDetailsId: [this.invoiceForm.get('storeDetailsId')?.value ?? null],
        availableQuantity: [null],
        unit: [
          it.unit || (mainSalesClass
            ? this.activeLanguage === 'en'
              ? mainSalesClass.measurementUnit?.englishSymbol
              : mainSalesClass.measurementUnit?.arabicSymbol
            : ''),
        ],
      });

      // نفس اشتراكات addItem
      fg.get('price')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.safeUpdateInvoiceTotals());
      fg.get('quantity')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.safeUpdateInvoiceTotals());
      fg.get('noOfNights')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.safeUpdateInvoiceTotals());
      fg.get('discount')
        ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.safeUpdateInvoiceTotals());

      this.saleItems.push(fg);
    });

    this.updateCustomerOptions();
    this.updateMainSalesClassOptions();

    this.invoiceForm.markAsDirty();
    this.invoiceForm.updateValueAndValidity();
    this.updateInvoiceTotals();
    this.loading = false;
    this.cdr.detectChanges();
  }

  private generateInvoiceNum() {
    this.salesInvoiceService.getInvoiceNo().subscribe({
      next: (val) => {
        this.invoiceNo = val;
        this.invoiceForm.controls['invoiceNo'].setValue(
          this.invoiceNo?.invoiceNo
        );
      },
      error: (err) => {
        console.error('Error generating invoice number', err);
      },
    });
  }

  private filterValidItems(): any[] {
    return this.saleItems.controls
      .filter((item) => {
        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;
        const noOfNights = item.get('noOfNights')?.value;

        return (
          price !== null &&
          price !== undefined &&
          quantity &&
          noOfNights &&
          price >= 0 &&
          quantity > 0 &&
          noOfNights > 0
        );
      })
      .map((item) => {
        this.updateItemValues(item as FormGroup);
        return item.value;
      });
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  normalizeControlDecimals(
    group: AbstractControl,
    controlName: string,
    fractionDigits: number
  ): void {
    const control = (group as FormGroup).get(controlName);
    if (!control) return;

    const rawValue = control.value;
    if (rawValue === null || rawValue === undefined || rawValue === '') return;

    const numericValue = parseFloat(rawValue);
    if (Number.isNaN(numericValue)) return;

    const factor = Math.pow(10, fractionDigits);
    control.setValue(Math.round(numericValue * factor) / factor);
  }

  updateItemValues(item: FormGroup): void {
    const price = parseFloat(item.get('price')?.value) || 0;
    const quantity = parseFloat(item.get('quantity')?.value) || 0;
    const noOfNights = parseFloat(item.get('noOfNights')?.value) || 1;
    const itemDiscount = parseFloat(item.get('discount')?.value) || 0;
    const mainSalesClassId = item.get('mainSalesClassId')?.value;
    let taxRate = 0.15;

    if (mainSalesClassId) {
      const mainSalesClass = this.mainSalesArray.find(
        (x) => x.id === mainSalesClassId
      );
      taxRate = (mainSalesClass && (mainSalesClass.isTaxExempted || (mainSalesClass as any).isTaxExempt)) ? 0 : 0.15;
    }

    const grossPrice = price * quantity * noOfNights; // Calculate Gross Price
    const discountAmount = (grossPrice * itemDiscount) / 100; // Calculate Discount
    const netPrice = grossPrice - discountAmount; // Calculate Net Price
    const taxAmount = netPrice * taxRate;
    const totalPrice = netPrice + taxAmount; // Calculate Total Price

    // Patch the form values with calculated amounts
    // item.patchValue({
    //   netPrice: parseFloat(netPrice.toFixed(2)),
    //   discountAmount: parseFloat(discountAmount.toFixed(2)),
    //   taxAmount: parseFloat(taxAmount.toFixed(2)),
    //   totalPrice: parseFloat(totalPrice.toFixed(2)),
    // });

    item.get('netPrice').setValue(this.roundToTwo(netPrice));
    item.get('discountAmount').setValue(this.roundToTwo(discountAmount));
    item.get('taxAmount').setValue(this.roundToTwo(taxAmount));
    item.get('totalPrice').setValue(this.roundToTwo(totalPrice));
  }

  updateInvoiceTotals(): void {
    const filteredItems = this.filterValidItems();

    const totalInvoicePrice = filteredItems.reduce(
      (total, item) => total + (item.totalPrice || 0),
      0
    );
    const totalNetPrice = filteredItems.reduce(
      (total, item) => total + (item.netPrice || 0),
      0
    );
    const totalTaxAmount = filteredItems.reduce(
      (total, item) => total + (item.taxAmount || 0),
      0
    );

    const discountType = this.invoiceForm.get('discountType')?.value;
    const invoiceDiscountValue =
      parseFloat(this.invoiceForm.get('discount')?.value) || 0;

    let invoiceDiscountAmount = 0;

    if (discountType === 'percentage') {
      invoiceDiscountAmount = (totalInvoicePrice * invoiceDiscountValue) / 100;
    } else if (discountType === 'amount') {
      invoiceDiscountAmount = invoiceDiscountValue;
    }

    const netPriceAfterDiscount = totalNetPrice - invoiceDiscountAmount;
    const totalPriceAfterDiscount =
      totalNetPrice + totalTaxAmount - invoiceDiscountAmount;

    this.invoiceForm
      .get('totalPrice')
      .setValue(this.roundToTwo(totalPriceAfterDiscount));
    this.invoiceForm
      .get('netPrice')
      .setValue(this.roundToTwo(netPriceAfterDiscount));
    this.invoiceForm
      .get('taxAmount')
      .setValue(this.roundToTwo(totalTaxAmount));

    this.cdr.detectChanges();
  }

  onDiscountTypeChange(event: any): void {
    const discountType = event.target.value;

    this.invoiceForm.patchValue({ discount: 0 });

    this.updateInvoiceTotals();
  }

  get saleItems(): FormArray<FormGroup> {
    return this.invoiceForm.get('saleItems') as FormArray<FormGroup>;
  }

  private itemCounter = 1;

  private getUnitForSalesItem(salesItem: SalesItem | null): string {
    if (!salesItem?.mainSalesClassId) {
      return '';
    }

    // If the salesItem has the full mainSalesClass object with measurementUnit
    if (salesItem.mainSalesClass?.measurementUnit) {
      return this.activeLanguage === 'en'
        ? salesItem.mainSalesClass.measurementUnit.englishSymbol
        : salesItem.mainSalesClass.measurementUnit.arabicSymbol;
    }

    // Otherwise, look up the mainSalesClass from mainSalesArray
    const mainSalesClass = this.mainSalesArray?.find(
      (ms) => ms.id === salesItem.mainSalesClassId
    );

    if (mainSalesClass?.measurementUnit) {
      return this.activeLanguage === 'en'
        ? mainSalesClass.measurementUnit.englishSymbol
        : mainSalesClass.measurementUnit.arabicSymbol;
    }

    return '';
  }

  addItem(salesItem: SalesItem = null): void {
    const itemFormGroup = this.fb.group({
      id: [salesItem?.id ?? null],
      itemNo: [{ value: '', disabled: true }], // Set itemNo as a disabled field if it's auto-generated
      mainSalesClassId: [salesItem?.mainSalesClassId],
      price: [
        salesItem?.price ?? null,
        [Validators.min(0), Validators.max(999999999)],
      ],
      quantity: [
        salesItem?.quantity ?? null,
        [Validators.required, Validators.min(0.0001)],
      ],
      noOfNights: [
        salesItem?.noOfNights ?? 1,
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern('^[0-9]*$'),
        ],
      ],
      discount: [salesItem?.discount ?? 0, [Validators.min(0)]],
      discountAmount: [salesItem?.discountAmount ?? 0],
      netPrice: [salesItem?.netPrice ?? null],
      tax: [salesItem?.tax ?? 15],
      taxAmount: [salesItem?.taxAmount ?? null],
      totalPrice: [salesItem?.totalPrice ?? null],
      saleInvoiceId: [this.invoiceId],
      storeDetailsId: [(salesItem as any)?.storeDetailsId ?? this.invoiceForm.get('storeDetailsId')?.value ?? null],
      availableQuantity: [(salesItem as any)?.availableQuantity ?? null],
      unit: this.getUnitForSalesItem(salesItem),
    });

    // Add the form group to the form array
    this.saleItems.push(itemFormGroup);

    // Subscribe to value changes with debounce and distinctUntilChanged
    itemFormGroup
      .get('price')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.safeUpdateInvoiceTotals());

    itemFormGroup
      .get('quantity')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.safeUpdateInvoiceTotals();
      });

    itemFormGroup
      .get('noOfNights')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.safeUpdateInvoiceTotals());

    itemFormGroup
      .get('discount')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.safeUpdateInvoiceTotals());

    // Update totals initially
    if (this.isLinkedToInventory && itemFormGroup.get('mainSalesClassId')?.value) {
      this.updateAvailableQuantityForItem(itemFormGroup);
    }
    this.safeUpdateInvoiceTotals();
  }

  private safeUpdateInvoiceTotals(): void {
    // Ensure no recursive triggering of updates
    try {
      this.updateInvoiceTotals();
    } catch (error) {
      console.error('Error during updateInvoiceTotals:', error);
    }
  }

  // ==================== PRINT FUNCTIONALITY ====================

  /**
   * Load company details for printing
   */
  private loadCompanyDetails(): void {
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        if (companyData && companyData.length > 0) {
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
        }
      },
      error: (error) => {
        console.error('Error loading company details:', error);
      }
    });
  }

  /**
   * Setup print columns based on language
   */
  private setupPrintColumns(): void {
    this.printDataColumns = [
      {
        field: 'itemNo',
        label: this.translateService.instant('INVOICE.ITEMNO'),
        width: '60px'
      },
      {
        field: 'itemName',
        label: this.translateService.instant('INVOICE.ITEMNAME'),
        width: 'auto'
      },
      {
        field: 'unit',
        label: this.translateService.instant('INVOICE.UNIT'),
        width: '80px'
      },
      {
        field: 'quantity',
        label: this.translateService.instant('INVOICE.QUANTITY'),
        width: '80px',
        pipe: 'number'
      },
      {
        field: 'price',
        label: this.translateService.instant('INVOICE.PRICE'),
        width: '100px',
        pipe: 'number'
      },
      {
        field: 'netPrice',
        label: this.translateService.instant('INVOICE.TOTAL_PRE_TAX'),
        width: '100px',
        pipe: 'number'
      },
      {
        field: 'taxAmount',
        label: this.translateService.instant('INVOICE.TAX'),
        width: '80px',
        pipe: 'number'
      },
      {
        field: 'totalPrice',
        label: this.translateService.instant('INVOICE.TOTAL'),
        width: '100px',
        pipe: 'number'
      }
    ];
  }

  /**
   * Prepare invoice data for printing
   */
  private prepareInvoiceForPrint(): any {
    const formValue = this.invoiceForm.value;

    // Get customer name
    let customerName = formValue.customerProfileName || '';
    const customerId = formValue.customerProfileId;

    if (customerId && !customerName) {
      const customer = this.customers.find(c => c.id === customerId);
      if (customer) {
        customerName = this.activeLanguage === 'en'
          ? customer.englishName
          : customer.arabicName;
      }
    }

    // Prepare print rows from valid items
    this.printDataRows = this.saleItems.controls
      .filter(item => {
        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;
        const noOfNights = item.get('noOfNights')?.value;
        return price && quantity && noOfNights && price > 0 && quantity > 0 && noOfNights > 0;
      })
      .map((item, index) => {
        const mainSalesClassId = item.get('mainSalesClassId')?.value;
        const mainSalesClass = this.mainSalesArray.find(x => x.id === mainSalesClassId);

        return {
          itemNo: mainSalesClass?.referenceCode || '',
          itemName: this.activeLanguage === 'en'
            ? mainSalesClass?.englishName || ''
            : mainSalesClass?.arabicName || '',
          unit: this.activeLanguage === 'en'
            ? mainSalesClass?.measurementUnit?.englishSymbol || ''
            : mainSalesClass?.measurementUnit?.arabicSymbol || '',
          quantity: item.get('quantity')?.value || 0,
          price: item.get('price')?.value || 0,
          netPrice: item.get('netPrice')?.value || 0,
          totalPreTax: item.get('netPrice')?.value || 0,
          taxAmount: item.get('taxAmount')?.value || 0,
          totalPrice: item.get('totalPrice')?.value || 0,
          description: '-'
        };
      });

    // Calculate totals
    const totalNetPrice = this.printDataRows.reduce((sum, row) => sum + (row.netPrice || 0), 0);
    const totalTaxAmount = this.printDataRows.reduce((sum, row) => sum + (row.taxAmount || 0), 0);
    const totalPrice = this.printDataRows.reduce((sum, row) => sum + (row.totalPrice || 0), 0);

    const discountAmount = formValue.discountAmount || 0;
    const finalTotal = totalPrice - discountAmount;

    // Generate QR code - Create TLV encoded string for ZATCA
    const companyName = this.activeLanguage === 'en'
      ? this.companyDetails?.englishName || ''
      : this.companyDetails?.arabicName || '';
    const taxNumber = this.companyDetails?.taxNumber || '';
    const invoiceDate = formValue.issueDate ? new Date(formValue.issueDate).toISOString() : new Date().toISOString();

    // ZATCA QR Code format (TLV)
    const qrString = `${companyName}|${taxNumber}|${invoiceDate}|${finalTotal.toFixed(2)}|${totalTaxAmount.toFixed(2)}`;
    this.qrImageUrl = qrString;

    return {
      invoiceNo: formValue.invoiceNo,
      issueDate: formValue.issueDate,
      customerName: customerName,
      customerTaxNumber: '', // Not available for unsaved invoice
      totalNetPrice: totalNetPrice,
      totalTaxAmount: totalTaxAmount,
      discountAmount: discountAmount,
      totalPrice: finalTotal,
      description: formValue.description || ''
    };
  }

  /**
   * Trigger print for unsaved invoice
   */
  printUnsavedInvoice(): void {
    // Validate that we have at least one valid item
    const hasValidItems = this.saleItems.controls.some((item) => {
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const noOfNights = item.get('noOfNights')?.value;
      return price && quantity && noOfNights && price > 0 && quantity > 0 && noOfNights >= 1;
    });

    if (!hasValidItems) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('INVOICE.WARNING'),
        detail: this.translateService.instant('INVOICE.AT_LEAST_ONE_ITEM_REQUIRED'),
        life: 4000,
      });
      return;
    }

    // Validate customer name
    const customerName = this.invoiceForm.get('customerProfileName')?.value;
    if (!customerName || customerName.trim() === '') {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('INVOICE.WARNING'),
        detail: this.translateService.instant('INVOICE.CUSTOMER_NAME_REQUIRED'),
        life: 4000,
      });
      return;
    }

    // Prepare invoice data
    this.prepareInvoiceForPrint();

    // Wait for view to update, then trigger custom print that preserves form state
    this.cdr.detectChanges();
    setTimeout(() => {
      this.triggerPrintWithoutReload();
    }, 500);
  }

  /**
   * Custom print method that doesn't reload the page
   * Uses iframe approach to avoid breaking Angular's component tree
   */
  private triggerPrintWithoutReload(): void {
    if (!this.printComponent || !this.printComponent.printSection) {
      console.error('Print component not ready');
      return;
    }

    const printContent = this.printComponent.printSection.nativeElement.innerHTML;
    const currentLanguage = this.activeLanguage;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error('Failed to access iframe document');
      document.body.removeChild(iframe);
      return;
    }

    // Build the iframe content with proper styles
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          // Handle cross-origin stylesheets
          if (styleSheet.href) {
            return `@import url("${styleSheet.href}");`;
          }
          return '';
        }
      })
      .join('\n');

    // Write content to iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${currentLanguage === 'ar' ? 'rtl' : 'ltr'}" lang="${currentLanguage}">
      <head>
        <meta charset="UTF-8">
        <title>Print Invoice</title>
        <style>
          ${styles}
          body { margin: 0; padding: 20px; }
          @media print {
            @page { margin: 0.5cm; }
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for iframe to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // Clean up iframe after a delay
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } catch (e) {
          console.error('Print error:', e);
          document.body.removeChild(iframe);
        }
      }, 500);
    };
  }

  /**
   * Get invoice totals for print template
   */
  getInvoiceTotalsForPrint(): any {
    const formValue = this.invoiceForm.value;
    return {
      netPrice: formValue.netPrice || 0,
      taxAmount: formValue.taxAmount || 0,
      discountAmount: formValue.discountAmount || 0,
      totalPrice: formValue.totalPrice || 0
    };
  }

  removeItem(index: number): void {
    this.saleItems.removeAt(index);
    this.updateInvoiceTotals();
    this.cdr.detectChanges();
  }

  getSelectedCustomer(): any {
    const customerId = this.invoiceForm?.get('customerProfileId')?.value;
    if (customerId !== null && customerId !== undefined && customerId !== '') {
      const normId = String(customerId).toLowerCase().trim();
      return (
        (this.allCustomers || []).find((c) => c?.id !== undefined && String(c.id).toLowerCase().trim() === normId) ||
        (this.customers || []).find((c) => c?.id !== undefined && String(c.id).toLowerCase().trim() === normId)
      );
    }
    return null;
  }

  isCompanyCustomer(): boolean {
    if (this.isNewCustomer) {
      return this.newCustomerType === 'company';
    }
    const customer = this.getSelectedCustomer();
    return !!(customer && customer.taxNumber && String(customer.taxNumber).trim().length > 0);
  }

  isSameDate(date1: any, date2: any): boolean {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return !isNaN(d1.getTime()) && !isNaN(d2.getTime()) &&
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  setCustomerIdForInvoice(customerIdValue: string): void {
    this.invoiceForm.get('customerProfileId')?.setValue(customerIdValue);
  }

  onSalesClick(event: any, item: AbstractControl<any, any>) {
    const salesId = event.value;

    const salesObject = this.mainSalesArray.find((x) => x.id === salesId);

    item.get('unit')?.setValue(
      this.activeLanguage === 'en'
        ? salesObject?.measurementUnit?.englishSymbol
        : salesObject?.measurementUnit?.arabicSymbol
    );
    if (this.isLinkedToInventory) {
      item.get('storeDetailsId')?.setValue(this.invoiceForm.get('storeDetailsId')?.value ?? null);
      this.updateAvailableQuantityForItem(item as FormGroup, salesObject?.referenceCode);
    }

    this.updateInvoiceTotals();

    this.cdr.detectChanges();
  }

  salesBarcodeScanHandler = (barcode: string): Observable<unknown> => {
    return this.barcodeService.getSaleProductByBarcode(barcode);
  };

  onSalesBarcodeResolved(event: BarcodeResolvedEvent): void {
    const product = event.result as {
      id?: string;
      referenceCode?: string;
      measurementUnitName?: string;
      salePrice?: number;
      availableQuantity?: number | null;
    };

    if (!product?.id) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('INVOICE.BARCODE_PRODUCT_INCOMPLETE')
      });
      return;
    }

    const existingItem = this.findExistingSaleItemByProductId(product.id);
    if (existingItem) {
      const currentQuantity = parseFloat(existingItem.get('quantity')?.value) || 0;
      existingItem.get('quantity')?.setValue(currentQuantity + 1);
      if (this.isLinkedToInventory) {
        existingItem.get('availableQuantity')?.setValue(product.availableQuantity ?? null);
      }
      this.updateItemValues(existingItem);
      this.updateInvoiceTotals();
      return;
    }

    this.addItem({
      id: null,
      itemNo: '',
      mainSalesClassId: product.id as any,
      price: product.salePrice ?? null,
      quantity: 1,
      noOfNights: 1,
      tax: 15,
      taxAmount: 0,
      discount: 0,
      discountAmount: 0,
      totalPrice: 0,
      netPrice: 0,
      saleInvoiceId: this.invoiceId,
      storeDetailsId: this.invoiceForm.get('storeDetailsId')?.value ?? null,
      availableQuantity: this.isLinkedToInventory ? (product.availableQuantity ?? null) : null,
    } as any);

    const addedItem = this.saleItems.at(this.saleItems.length - 1) as FormGroup;
    const selectedProduct = this.mainSalesArray.find((x) => x.id === product.id);
    addedItem.get('unit')?.setValue(
      this.activeLanguage === 'en'
        ? (selectedProduct?.measurementUnit?.englishSymbol || product.measurementUnitName || '')
        : (selectedProduct?.measurementUnit?.arabicSymbol || product.measurementUnitName || '')
    );

    if (this.isLinkedToInventory && !addedItem.get('availableQuantity')?.value) {
      this.updateAvailableQuantityForItem(addedItem, product.referenceCode);
    }
    this.updateItemValues(addedItem);
    this.updateInvoiceTotals();
    this.scheduleBarcodeInputFocus();
  }

  onSalesBarcodeFailed(event: BarcodeFailedEvent): void {
    const currentLanguage = this.translate.currentLang || this.activeLanguage;
    const detailMessage = this.barcodeService.getLocalizedBarcodeErrorMessage(
      event?.error,
      currentLanguage,
      this.translate.instant('INVOICE.BARCODE_NOT_FOUND')
    );
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('FINANCE.ERROR'),
      detail: detailMessage
    });
  }

  onHeaderStoreChange(event: DropdownChangeEvent): void {
    const selectedStoreId = event?.value ?? null;
    this.invoiceForm.get('storeDetailsId')?.setValue(selectedStoreId);

    for (const control of this.saleItems.controls) {
      const item = control as FormGroup;
      item.get('storeDetailsId')?.setValue(selectedStoreId);
      if (this.isLinkedToInventory) {
        this.updateAvailableQuantityForItem(item);
      }
    }
  }

  getAvailableQuantity(item: AbstractControl<any, any>): number | null {
    const available = item.get('availableQuantity')?.value;
    if (available === null || available === undefined || available === '') {
      return null;
    }
    const parsed = Number(available);
    return Number.isFinite(parsed) ? parsed : null;
  }

  isQuantityExceedingAvailable(item: AbstractControl<any, any>): boolean {
    if (!this.isLinkedToInventory) {
      return false;
    }
    const availableQuantity = this.getAvailableQuantity(item);
    if (availableQuantity === null) {
      return false;
    }
    const enteredQuantity = Number(item.get('quantity')?.value || 0);
    return enteredQuantity > availableQuantity;
  }

  private updateAvailableQuantityForItem(item: FormGroup, referenceCode?: string): void {
    if (!this.isLinkedToInventory) {
      item.get('availableQuantity')?.setValue(null, { emitEvent: false });
      return;
    }

    const salesId = item.get('mainSalesClassId')?.value;
    const selectedProduct = this.mainSalesArray.find((x) => x.id === salesId);
    const lookupReference = referenceCode || selectedProduct?.referenceCode;
    if (!lookupReference) {
      item.get('availableQuantity')?.setValue(null, { emitEvent: false });
      return;
    }

    this.barcodeService.getSaleProductByBarcode(lookupReference).subscribe({
      next: (result) => {
        const availableQuantity = (result as { availableQuantity?: number | null })?.availableQuantity;
        item.get('availableQuantity')?.setValue(availableQuantity ?? null, { emitEvent: false });
      },
      error: () => {
        item.get('availableQuantity')?.setValue(null, { emitEvent: false });
      }
    });
  }

  private findExistingSaleItemByProductId(productId: string): FormGroup | null {
    for (const control of this.saleItems.controls) {
      const item = control as FormGroup;
      if (item.get('mainSalesClassId')?.value === productId) {
        return item;
      }
    }
    return null;
  }

  private scheduleBarcodeInputFocus(): void {
    setTimeout(() => {
      const inputElement = this.barcodeInputHost?.nativeElement?.querySelector('input');
      inputElement?.focus();
    }, 150);
  }

  submitForm(event: Event, isSaveAndContinue): void {
    this.loading = true;

    // If new customer quick-add mode, create the customer first
    if (this.isNewCustomer) {
      if (!this.newCustomerName || this.newCustomerName.trim() === '') {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('INVOICE.ERROR'),
          detail: this.translate.instant('INVOICE.CUSTOMER_NAME_REQUIRED'),
          life: 5000,
        });
        this.loading = false;
        return;
      }
      this.isCreatingCustomer = true;
      this.customerService.quickAdd({
        arabicName: this.newCustomerName.trim(),
        taxNumber: this.newCustomerTaxNumber?.trim() || undefined,
        contactNumber: this.newCustomerPhone?.trim() || undefined,
      }).subscribe({
        next: (customer) => {
          this.isCreatingCustomer = false;
          // Add the new customer to local list
          this.customers.push(customer);
          this.lookupCache.invalidateCustomers(); // force re-fetch on next open
          this.updateCustomerOptions();
          // Patch the form with the new customer id and name
          this.invoiceForm.patchValue({
            customerProfileId: customer.id,
            customerProfileName: customer.arabicName,
          });
          // Reset quick-add state
          this.isNewCustomer = false;
          this.newCustomerType = 'individual';
          this.newCustomerName = '';
          this.newCustomerPhone = '';
          this.newCustomerTaxNumber = '';
          // Continue with invoice save
          this.continueSubmitForm(isSaveAndContinue);
        },
        error: (err) => {
          this.isCreatingCustomer = false;
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('INVOICE.ERROR'),
            detail: err?.error?.message || this.translate.instant('INVOICE.CUSTOMER_CREATE_FAILED'),
            life: 5000,
          });
        },
      });
      return;
    }

    this.continueSubmitForm(isSaveAndContinue);
  }

  continueSubmitForm(isSaveAndContinue): void {
    const rawNameControl = this.invoiceForm.get('customerProfileName');
    let typedName = rawNameControl?.value;
    // If user selected an object accidentally (future-proof), extract display property
    if (typedName && typeof typedName === 'object') {
      typedName =
        typedName.label || typedName.englishName || typedName.arabicName || '';
      rawNameControl.setValue(typedName);
    }
    const currentCustomerId = this.invoiceForm.get('customerProfileId')?.value;
    const normalized = (typedName || '').trim().toLowerCase();
    const normalizedArabic = this.normalizeArabic(typedName || '');

    const allCusts = [...(this.customers || []), ...(this.allCustomers || [])];
    const existingById = currentCustomerId
      ? allCusts.find((c) => String(c.id) === String(currentCustomerId))
      : null;

    const customerExists =
      existingById ||
      allCusts.find(
        (c) =>
          (c.englishName && c.englishName.trim().toLowerCase() === normalized) ||
          (c.arabicName && c.arabicName.trim().toLowerCase() === normalized) ||
          (c.arabicName && this.normalizeArabic(c.arabicName) === normalizedArabic) ||
          (c.englishName && this.normalizeArabic(c.englishName) === normalizedArabic)
      );

    if (customerExists) {
      this.invoiceForm.patchValue({
        customerProfileId: customerExists.id,
        customerProfileName:
          this.activeLanguage === 'en'
            ? customerExists.englishName || customerExists.arabicName
            : customerExists.arabicName || customerExists.englishName,
      });
    } else if (currentCustomerId) {
      // Keep existing customerProfileId if already set (e.g. from copy or direct select)
      this.invoiceForm.patchValue({ customerProfileId: currentCustomerId });
    } else {
      // New customer name typed -> clear id so backend can treat as new if supported
      this.invoiceForm.patchValue({
        customerProfileId: null,
        customerProfileName: typedName,
      });
    }

    const customerName = this.invoiceForm.get('customerProfileName')?.value;
    if (!customerName || customerName.trim() === '') {
      console.log('No customer name provided, showing error message');
      this.messageService.clear();
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('INVOICE.CUSTOMER_NAME_REQUIRED'),
        life: 5000,
      });
      this.loading = false;
      return;
    }

    if (this.isLinkedToInventory && !this.invoiceForm.get('storeDetailsId')?.value) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('INVOICE.STORE_REQUIRED'),
        life: 5000,
      });
      this.loading = false;
      return;
    }

    if (this.isLinkedToInventory && this.hasAnyQuantityOverage()) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('INVOICE.QUANTITY_EXCEEDS_AVAILABLE_GENERIC'),
        life: 5000,
      });
      this.loading = false;
      return;
    }

    const hasValidItems = this.saleItems.controls.some((item) => {
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const noOfNights = item.get('noOfNights')?.value;
      const mainSalesClassId = item.get('mainSalesClassId')?.value;
      return (
        mainSalesClassId &&
        price !== null &&
        price !== undefined &&
        quantity &&
        noOfNights &&
        price >= 0 &&
        quantity > 0 &&
        noOfNights >= 1
      );
    });

    console.log('Total items:', this.saleItems.length);
    console.log('Has valid items:', hasValidItems);

    if (!hasValidItems) {
      console.log('No valid items found, showing error message');
      this.messageService.clear();
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('INVOICE.AT_LEAST_ONE_ITEM_REQUIRED'),
        life: 6000,
      });
      this.loading = false;
      return;
    }

    for (let i = this.saleItems.length - 1; i >= 0; i--) {
      const item = this.saleItems.at(i);

      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const noOfNights = item.get('noOfNights')?.value;
      const mainSalesClassId = item.get('mainSalesClassId')?.value;

      if (
        price === null ||
        price === undefined ||
        !quantity ||
        !noOfNights ||
        price < 0 ||
        quantity <= 0 ||
        noOfNights < 1 ||
        !mainSalesClassId
      ) {
        this.saleItems.removeAt(i);
      }
    }

    const totalInvoicePrice = this.saleItems.controls.reduce(
      (total, item) => total + (item.get('totalPrice')?.value || 0),
      0
    );
    const totalNetPrice = this.saleItems.controls.reduce(
      (total, item) => total + (item.get('netPrice')?.value || 0),
      0
    );
    const totalTaxAmount = this.saleItems.controls.reduce(
      (total, item) => total + (item.get('taxAmount')?.value || 0),
      0
    );

    this.invoiceForm.patchValue({
      totalPrice: totalInvoicePrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
    });
    const invs = this.invoiceForm.getRawValue();

    invs.discountType = "amount"
    console.log('Invoice form value:', invs)
    console.log('Form valid:', this.invoiceForm.valid)
    console.log('Form errors:', this.invoiceForm.errors)

    // Log individual field validation
    Object.keys(this.invoiceForm.controls).forEach(key => {
      const control = this.invoiceForm.get(key);
      if (control && control.invalid) {
        console.log(`Field ${key} is invalid:`, control.errors);
      }
    });

    if (this.invoiceForm.valid) {
      // Resolve customerProfileId: if it's a reservation company ID rather than a CustomerProfile ID,
      // map it to the actual CustomerProfile.id if found, or null so backend resolves it by name.
      const resolveCustomerProfileIdForPayload = (currentId: any, currentName: string): any => {
        if (!currentId) return null;
        const normId = String(currentId).toLowerCase().trim();
        const isReservationCompId = this.reservationCompaniesMap.has(normId);

        if (isReservationCompId) {
          const comp = this.reservationCompaniesMap.get(normId);
          const realCustProfile = (this.allCustomers || []).find(c =>
            !this.reservationCompaniesMap.has(String(c.id).toLowerCase().trim()) &&
            ((c.mainAccountId && comp?.mainAccountId && String(c.mainAccountId).toLowerCase().trim() === String(comp.mainAccountId).toLowerCase().trim()) ||
             (c.arabicName && comp?.arabicName && c.arabicName.trim().toLowerCase() === comp.arabicName.trim().toLowerCase()) ||
             (c.englishName && comp?.englishName && c.englishName.trim().toLowerCase() === comp.englishName.trim().toLowerCase()))
          );
          return realCustProfile ? realCustProfile.id : null;
        }

        return currentId;
      };

      if (this.invoiceId) {
        const saleItems = (invs.saleItems || []).map((inv: any, i: number) => ({
          ...inv,
          itemNo: String(i + 1),
          discount: inv.discount ?? 0,
          discountAmount: inv.discountAmount ?? 0,
        }));
        console.log(invs);
        // Map invoiceType string to saleInvoiceType number for backend
        const saleInvoiceTypeUpdate = invs.invoiceType === 'reservation'
          ? (invs.reservationIds && invs.reservationIds.length > 0 ? 2 : 1)
          : 0;

        const isFrontalInvoice = this.isFrontal || !!invs.isFrontal;

        this.salesInvoiceService
          .updateInvoice(this.invoiceId, {
            ...invs,
            customerProfileId: resolveCustomerProfileIdForPayload(invs.customerProfileId, invs.customerProfileName),
            isFrontal: isFrontalInvoice,
            saleInvoiceType: saleInvoiceTypeUpdate,
            saleItems: saleItems,
            dueDate: invs.dueDate ? formatDateToUTCString(invs.dueDate) : formatDateToUTCString(invs.issueDate),
            issueDate: formatDateToUTCString(invs.issueDate),
          })
          .subscribe(
            () => {
              this.loading = false;

              if (isSaveAndContinue) {
                this.initiateForm();
                // Load 10 empty saleItems with placeholder values
                for (let i = 0; i < 10; i++) {
                  this.addItem({
                    id: null,
                    itemNo: '',
                    mainSalesClassId: null,
                    price: null,
                    quantity: null,
                    noOfNights: 1,
                    tax: 15,
                    taxAmount: null,
                    discount: null,
                    discountAmount: null,
                    totalPrice: null,
                    netPrice: null,
                    saleInvoiceId: this.invoiceId,
                  });
                }
              } else {
                if (invs.invoiceType === 'reservation') {
                  this.router.navigate(['/invoices/reservation-list'], { replaceUrl: true });
                } else {
                  this.router.navigate(['/invoices/list'], { replaceUrl: true });
                }
              }
            },
            (error) => {
              console.error('Error during update:', error);
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('INVOICE.ERROR'),
                detail: this.extractSalesInvoiceSaveErrorMessage(error),
                life: 6000,
              });
              this.loading = false;
            }
          );
        if (this.modalInstance) {
          this.modalInstance.hide();
        }
      } else {
        const saleItems = (invs.saleItems || [])
          .filter((inv: any) => {
            const price = inv.price;
            const quantity = inv.quantity;
            const noOfNights = inv.noOfNights;
            const classId = inv.mainSalesClassId;
            return (
              classId &&
              price !== null &&
              price !== undefined &&
              quantity &&
              noOfNights &&
              price >= 0 &&
              quantity > 0 &&
              noOfNights >= 1
            );
          })
          .map((inv: any, i: number) => ({
            id: null,
            saleInvoiceId: null,
            mainSalesClassId: inv.mainSalesClassId,
            itemNo: String(i + 1),
            price: Number(inv.price),
            quantity: Number(inv.quantity),
            noOfNights: Number(inv.noOfNights) || 1,
            tax: Number(inv.tax) ?? 15,
            taxAmount: Number(inv.taxAmount) ?? 0,
            discount: Number(inv.discount) ?? 0,
            discountAmount: Number(inv.discountAmount) ?? 0,
            totalPrice: Number(inv.totalPrice) ?? 0,
            netPrice: Number(inv.netPrice) ?? 0,
          }));

        if (this.isFrontal) {
          // Map invoiceType string to saleInvoiceType number for backend
          const saleInvoiceTypeFrontal = invs.invoiceType === 'reservation'
            ? (invs.reservationIds && invs.reservationIds.length > 0 ? 2 : 1)
            : 0;

          const frontalPayload: any = {
            ...invs,
            customerProfileId: resolveCustomerProfileIdForPayload(invs.customerProfileId, invs.customerProfileName),
            saleInvoiceType: saleInvoiceTypeFrontal,
            saleItems: saleItems,
            dueDate: invs.dueDate ? formatDateToUTCString(invs.dueDate) : formatDateToUTCString(invs.issueDate),
            issueDate: formatDateToUTCString(invs.issueDate),
          };
          delete frontalPayload.id;
          delete frontalPayload.invoiceType;
          delete frontalPayload.discountType;

          this.salesInvoiceService
            .createAndClearInvoice(frontalPayload)
            .subscribe(
              (response) => {
                this.loading = false;

                // Trigger bottom-left toast notification (independent of backend SignalR)
                this.notifications.addNotification({
                  id: Date.now(),
                  title: this.translateService.instant('FINANCE.SUCCESS'),
                  message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY'),
                  date: new Date(),
                  type: 'success',
                  read: false
                });

                if (isSaveAndContinue) {
                  // Also show PrimeNG toast for immediate feedback
                  this.messageService.add({
                    severity: 'success',
                    summary: this.translateService.instant('FINANCE.SUCCESS'),
                    detail: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY'),
                    life: 4000,
                  });
                  this.resetToNewInvoiceForm();
                } else {
                  if (invs.invoiceType === 'reservation') {
                    this.router.navigate(['/invoices/reservation-list'], {
                      replaceUrl: true,
                      state: { message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY') },
                    });
                  } else {
                    this.router.navigate(['/invoices/frontal-list'], {
                      replaceUrl: true,
                      state: { message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY') },
                    });
                  }
                }
              },
              (error) => {
                console.error('Error during creation:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('INVOICE.ERROR'),
                  detail: this.extractSalesInvoiceSaveErrorMessage(error),
                  life: 6000,
                });
                this.loading = false;
              }
            );
        } else {
          // Map invoiceType string to saleInvoiceType number for backend
          const saleInvoiceType = invs.invoiceType === 'reservation'
            ? (invs.reservationIds && invs.reservationIds.length > 0 ? 2 : 1)
            : 0;

          const payload: any = {
            ...invs,
            customerProfileId: resolveCustomerProfileIdForPayload(invs.customerProfileId, invs.customerProfileName),
            saleInvoiceType: saleInvoiceType,
            saleItems: saleItems,
            dueDate: invs.dueDate ? formatDateToUTCString(invs.dueDate) : formatDateToUTCString(invs.issueDate),
            issueDate: formatDateToUTCString(invs.issueDate),
          };
          delete payload.id;
          delete payload.invoiceType;
          delete payload.discountType;

          console.log('Creating sales invoice with payload:', payload);
          console.log('IsQuotation value:', payload.isQuotation);
          console.log('SaleInvoiceType value:', payload.saleInvoiceType);
          this.salesInvoiceService
            .createInvoice(payload)
            .subscribe(
              (response) => {
                this.loading = false;

                // Trigger bottom-left toast notification (independent of backend SignalR)
                this.notifications.addNotification({
                  id: Date.now(),
                  title: this.translateService.instant('FINANCE.SUCCESS'),
                  message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY'),
                  date: new Date(),
                  type: 'success',
                  read: false
                });

                if (isSaveAndContinue) {
                  // Also show PrimeNG toast for immediate feedback
                  this.messageService.add({
                    severity: 'success',
                    summary: this.translateService.instant('FINANCE.SUCCESS'),
                    detail: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY'),
                    life: 4000,
                  });
                  this.resetToNewInvoiceForm();
                } else {
                  if (invs.invoiceType === 'reservation') {
                    this.router.navigate(['/invoices/reservation-list'], {
                      replaceUrl: true,
                      state: { message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY') },
                    });
                  } else {
                    this.router.navigate(['/invoices/list'], {
                      replaceUrl: true,
                      state: { message: this.translateService.instant('INVOICE.CREATED_SUCCESSFULLY') },
                    });
                  }
                }
              },
              (error) => {
                console.error('Error during creation:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('INVOICE.ERROR'),
                  detail: this.extractSalesInvoiceSaveErrorMessage(error),
                  life: 6000,
                });
                this.loading = false;
              }
            );
        }
      }
    }
    else {
      console.log('Form is invalid, marking all fields as touched');
      console.log('Form errors:', this.invoiceForm.errors);
      Object.keys(this.invoiceForm.controls).forEach(key => {
        const control = this.invoiceForm.get(key);
        if (control && control.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      this.invoiceForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('INVOICE.ERROR'),
        detail: this.translate.instant('VALIDATION.INVALID_VALUE'),
        life: 4000,
      });
      this.loading = false;
    }
  }

  //#region  load data

  mainSalesClassOptions: Array<{ label: string; value: string }> = [];
  customerOptions: Array<{ label: string; value: string }> = [];

  updateMainSalesClassOptions(): void {
    this.mainSalesClassOptions = (this.mainSalesArray || []).map((x) => ({
      label: x.displayName || (this.activeLanguage === 'en' ? (x.englishName || x.arabicName) : (x.arabicName || x.englishName)),
      value: String(x.id),
    }));
  }

  updateCustomerOptions(): void {
    this.customerOptions = (this.customers || []).map((x) => ({
      label:
        this.activeLanguage === 'en' ? `${x.englishName || x.arabicName}` : `${x.arabicName || x.englishName}`,
      value: String(x.id),
    }));
    this.customerOptionsFiltered = this.customerOptions;
  }

  loadData(reservationId?: string, reservationIds?: string[]): void {
    if (!this.copyId && !this.copyLoaded && !this.invoiceId) {
      this.loading = true;
    }

    const isReservationMode = !!(reservationId || (reservationIds && reservationIds.length));

    // لو الـ lookup data اتحملت قبل كده، تجاهل الـ forkJoin وحدّث الفلترة والـ UI فقط
    if (this.lookupDataLoaded) {
      this.applyFilterByInvoiceType(isReservationMode);
      if (!this.copyLoaded && !this.copyId && !this.invoiceId) {
        this.initInvoiceForm();
        this.loading = false;
      }
      if (reservationIds && reservationIds.length) {
        this.loadMultipleReservationsData(reservationIds);
      } else if (reservationId) {
        this.loadReservationData(reservationId);
      }
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      customers: this.lookupCache.getCustomers(),
      roots: this.lookupCache.getRootSalesClasses(),
      hotels: isReservationMode ? this.hotelService.getAll() : of([]),
      reservationCompanies: isReservationMode ? this.reservationCompanyService.getAll() : of([]),
    }).subscribe({
      next: ({ customers, roots, hotels, reservationCompanies }) => {
        this.allCustomers = customers || [];

        // Flatten the tree nodes to extract all mainSalesClasses
        const allMainSales: any[] = [];
        if (roots && Array.isArray(roots)) {
          roots.forEach(root => {
            if (root.headerSalesClasses) {
              root.headerSalesClasses.forEach(header => {
                if (header.detailSalesClasses) {
                  header.detailSalesClasses.forEach(detail => {
                    if (detail.mainSalesClasses) {
                      detail.mainSalesClasses.forEach(main => {
                        allMainSales.push(main);
                      });
                    }
                  });
                }
              });
            }
          });
        }

        const mappedMainSales = allMainSales.map(item => {
          const name = this.activeLanguage === 'en' ? (item.englishName || item.arabicName) : (item.arabicName || item.englishName);
          return {
            ...item,
            id: String(item.id),
            displayName: name
          };
        });

        // Retain any mainSales classes that were injected early during copy mode
        const existingClassIds = new Set(mappedMainSales.map(m => String(m.id)));
        const preservedClasses = (this.mainSalesArray || []).filter(m => !existingClassIds.has(String(m.id)));
        this.rawMainSalesArray = [...mappedMainSales, ...preservedClasses];

        // Merge reservation companies into allCustomers (avoid duplicates)
        const mappedReservationCompanies = (reservationCompanies || []).map((company: any) => ({
          ...company,
          id: String(company.id),
          arabicName: company.arabicName,
          englishName: company.englishName,
          displayName: this.activeLanguage === 'en' ? (company.englishName || company.arabicName) : (company.arabicName || company.englishName),
          mainAccountId: company.mainAccountId || 'reservation-comp',
          isReservationCompany: true,
        }));

        const existingCustomerIds = new Set((customers || []).map(c => String(c.id).toLowerCase().trim()));
        const uniqueReservationCompanies = mappedReservationCompanies.filter(rc => !existingCustomerIds.has(String(rc.id).toLowerCase().trim()));
        this.allCustomers = [...(customers || []), ...uniqueReservationCompanies];

        // Build lookup maps
        this.hotelsMap.clear();
        this.reservationCompaniesMap.clear();
        (hotels || []).forEach((hotel: any) => {
          if (hotel?.id) {
            this.hotelsMap.set(String(hotel.id).toLowerCase().trim(), hotel);
          }
        });
        (reservationCompanies || []).forEach((company: any) => {
          if (company?.id) {
            this.reservationCompaniesMap.set(String(company.id).toLowerCase().trim(), company);
          }
        });

        this.lookupDataLoaded = true; // mark as cached – skip forkJoin on next visit

        // Apply filter according to invoice type
        this.applyFilterByInvoiceType(isReservationMode);

        // Update units in saleItems if they were missing before mainSalesArray was loaded
        this.saleItems.controls.forEach(itemFg => {
          const classId = itemFg.get('mainSalesClassId')?.value;
          if (classId && !itemFg.get('unit')?.value) {
            const foundClass = this.rawMainSalesArray.find(c => String(c.id) === String(classId));
            if (foundClass?.measurementUnit) {
              const unitSymbol = this.activeLanguage === 'en'
                ? foundClass.measurementUnit.englishSymbol
                : foundClass.measurementUnit.arabicSymbol;
              itemFg.get('unit')?.setValue(unitSymbol);
            }
          }
        });

        if (!this.copyLoaded && !this.copyId && !this.invoiceId) {
          this.initInvoiceForm();
        }
        this.scheduleBarcodeInputFocus();

        // 👇 مهم: حمّل بعد ما الفورم يتجهّز
        if (reservationIds && reservationIds.length) {
          this.loadMultipleReservationsData(reservationIds);
        } else if (reservationId) {
          this.loadReservationData(reservationId);
        } else if (!this.copyId && !this.invoiceId) {
          this.loading = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ERROR loading data:', err);
        if (!this.copyLoaded && !this.copyId && !this.invoiceId) {
          this.loading = false;
        }
        this.cdr.detectChanges();
      },
    });
  }
  private normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/[\u064B-\u065F]/g, '') // remove diacritics
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  // Helper: Find customer by name or company account
  private findCustomerByName(name: string, exactMatch: boolean = true, company?: any): any {
    if (!name && !company) return null;

    const searchPool = [...(this.customers || []), ...(this.allCustomers || [])];

    // 0. Match by mainAccountId if company object is provided
    if (company?.mainAccountId) {
      const matchByAccount = searchPool.find(c =>
        c.mainAccountId && String(c.mainAccountId).toLowerCase().trim() === String(company.mainAccountId).toLowerCase().trim()
      );
      if (matchByAccount) return matchByAccount;
    }

    if (!name) return null;

    const trimmedName = name.trim();
    const lowerName = trimmedName.toLowerCase();
    const normalizedQuery = this.normalizeArabic(trimmedName);

    // 1. Exact match (case insensitive)
    let match = searchPool.find(c =>
      (c.englishName && c.englishName.trim().toLowerCase() === lowerName) ||
      (c.arabicName && c.arabicName.trim().toLowerCase() === lowerName) ||
      (c.name && c.name.trim().toLowerCase() === lowerName)
    );
    if (match) return match;

    // 2. Normalized Arabic match
    match = searchPool.find(c =>
      (c.englishName && this.normalizeArabic(c.englishName) === normalizedQuery) ||
      (c.arabicName && this.normalizeArabic(c.arabicName) === normalizedQuery) ||
      (c.name && this.normalizeArabic(c.name) === normalizedQuery)
    );
    if (match) return match;

    // 3. Substring / partial match
    match = searchPool.find(c => {
      const ar = c.arabicName ? this.normalizeArabic(c.arabicName) : '';
      const en = c.englishName ? c.englishName.toLowerCase() : '';
      return (ar && (ar.includes(normalizedQuery) || normalizedQuery.includes(ar))) ||
             (en && (en.includes(lowerName) || lowerName.includes(en)));
    });
    if (match) return match;

    return null;
  }

  // Helper: Get name from item based on active language
  private getName(item: any): string {
    if (!item) return '';
    return this.activeLanguage === 'en'
      ? (item.englishName || item.arabicName || item.name || '')
      : (item.arabicName || item.englishName || item.name || '');
  }

  // Get customer name and ID based on reservation type
  getCustomerNameByReservationType(reservation: any): {
    customerId?: string;
    customerName?: string;
    fallbackCompanyId?: string;
    fallbackCompanyObj?: any;
  } {
    if (!reservation) return {};

    const isEmptyGuid = (g: any) => !g || String(g).trim() === '' || String(g).trim() === '00000000-0000-0000-0000-000000000000';

    let customerName = '';
    let foundCompany: any = null;
    let isCompany = true;

    // 1. Client Company (شركة السياحة / العميل)
    const clientCompId = !isEmptyGuid(reservation.reservationClientCompanyId) ? reservation.reservationClientCompanyId :
                         (!isEmptyGuid(reservation.reservationClientCompanyID) ? reservation.reservationClientCompanyID :
                         (!isEmptyGuid(reservation.clientCompanyId) ? reservation.clientCompanyId : null));

    if (clientCompId) {
      const key = String(clientCompId).toLowerCase().trim();
      foundCompany = this.reservationCompaniesMap.get(key) || reservation.reservationClientCompany;
      customerName = this.getName(foundCompany) || this.getName(reservation.reservationClientCompany) || '';
    }

    // 2. Reservation Company (الشركة)
    const compId = !isEmptyGuid(reservation.reservationCompanyId) ? reservation.reservationCompanyId :
                   (!isEmptyGuid(reservation.reservationCompanyID) ? reservation.reservationCompanyID :
                   (!isEmptyGuid(reservation.companyId) ? reservation.companyId : null));

    if (!customerName && compId) {
      const key = String(compId).toLowerCase().trim();
      foundCompany = this.reservationCompaniesMap.get(key) || reservation.reservationCompany;
      customerName = this.getName(foundCompany) || this.getName(reservation.reservationCompany) || '';
    }

    // 3. Hotel Direct (الفندق)
    const hotelId = !isEmptyGuid(reservation.hotelId) ? reservation.hotelId :
                    (!isEmptyGuid(reservation.hotelID) ? reservation.hotelID : null);

    const resType = String(reservation.reservationType || '');
    const isHotelDirect = resType === 'HotelDirect' || resType === '2';

    if (!customerName && hotelId && isHotelDirect) {
      const key = String(hotelId).toLowerCase().trim();
      const hotel = this.hotelsMap.get(key) || reservation.hotel;
      if (hotel) {
        foundCompany = hotel;
        customerName = this.getName(hotel) || '';
      }
    }

    // 4. Guest Name (اسم النزيل)
    if (!customerName && reservation.guestName && reservation.guestName.trim()) {
      customerName = reservation.guestName.trim();
      isCompany = false;
    }

    // 5. Fallbacks
    if (!customerName && compId) {
      const key = String(compId).toLowerCase().trim();
      const c = this.reservationCompaniesMap.get(key) || reservation.reservationCompany;
      if (c) {
        foundCompany = c;
        customerName = this.getName(c);
      }
    }

    if (!customerName && hotelId) {
      const key = String(hotelId).toLowerCase().trim();
      const h = this.hotelsMap.get(key) || reservation.hotel;
      if (h) {
        foundCompany = h;
        customerName = this.getName(h);
      }
    }

    if (!customerName && !foundCompany) return {};

    // Match customer by company/name
    let matchedCustomer = this.findCustomerByName(customerName, isCompany, foundCompany);

    // Match by ID directly in allCustomers or customers
    if (!matchedCustomer && foundCompany?.id) {
      const targetId = String(foundCompany.id).toLowerCase().trim();
      matchedCustomer = [...(this.customers || []), ...(this.allCustomers || [])].find(c =>
        c?.id && String(c.id).toLowerCase().trim() === targetId
      );
    }

    const resolvedId = matchedCustomer ? String(matchedCustomer.id) : (foundCompany?.id ? String(foundCompany.id) : undefined);

    return {
      customerId: resolvedId,
      customerName: customerName || (matchedCustomer ? this.getName(matchedCustomer) : ''),
      fallbackCompanyId: foundCompany?.id ? String(foundCompany.id) : undefined,
      fallbackCompanyObj: matchedCustomer || foundCompany || undefined
    };
  }

  /** حمّل عدة حجوزات معًا وبنِ عناصر الفاتورة منها */
  private loadMultipleReservationsData(reservationIds: string[]): void {
    const ids = Array.from(new Set((reservationIds || []).map(String).filter(Boolean)));
    if (!ids.length) {
      this.loading = false;
      return;
    }

    this.invoiceForm.patchValue({ reservationIds: ids, invoiceType: 'reservation', saleInvoiceType: 2 });
    this.applyFilterByInvoiceType(true);

    // هنجيب الحجوزات كلها + الـ lookups مرة واحدة
    const reservations$ = forkJoin(ids.map(id =>
      this.reservationService.getById(id).pipe(
        catchError(() => of(null))
      )
    ));

    forkJoin({
      reservations: reservations$,
      roomTypes: this.roomTypeService.getAll(),
      meals: this.reservationMealService.getAll(),
      views: this.reservationViewService.getAll(),
      services: this.reservationServiceService.getAll(),
      reservationCompanies: this.reservationCompanyService.getAll(),
      hotels: this.hotelService.getAll(),
    }).subscribe({
      next: ({ reservations, roomTypes, meals, views, services, reservationCompanies, hotels }) => {
        // Build lookup maps
        (hotels || []).forEach((hotel: any) => {
          if (hotel?.id) {
            this.hotelsMap.set(String(hotel.id).toLowerCase().trim(), hotel);
          }
        });
        (reservationCompanies || []).forEach((company: any) => {
          if (company?.id) {
            this.reservationCompaniesMap.set(String(company.id).toLowerCase().trim(), company);
          }
        });

        // Merge reservation companies into allCustomers (avoid duplicates)
        const mappedReservationCompanies = (reservationCompanies || []).map((company: any) => ({
          ...company,
          id: String(company.id),
          arabicName: company.arabicName,
          englishName: company.englishName,
          displayName: this.activeLanguage === 'en' ? (company.englishName || company.arabicName) : (company.arabicName || company.englishName),
          mainAccountId: company.mainAccountId || 'reservation-comp',
          isReservationCompany: true,
        }));
        const existingCustomerIds = new Set((this.allCustomers || []).map(c => String(c.id).toLowerCase().trim()));
        const uniqueReservationCompanies = mappedReservationCompanies.filter(rc => !existingCustomerIds.has(String(rc.id).toLowerCase().trim()));
        this.allCustomers = [...(this.allCustomers || []), ...uniqueReservationCompanies];

        this.applyFilterByInvoiceType(true);

        // امسح أي عناصر سابقة
        while (this.saleItems.length) this.saleItems.removeAt(0);

        const getName = (obj: any) =>
          this.activeLanguage === 'ar'
            ? (obj?.arabicName || obj?.englishName || '')
            : (obj?.englishName || obj?.arabicName || '');

        // Set customer from first valid reservation
        const validReservations = (reservations || []).filter(Boolean);
        if (validReservations.length > 0) {
          const firstReservation = validReservations[0];
          const customerInfo = this.getCustomerNameByReservationType(firstReservation);
          if (customerInfo.customerName || customerInfo.customerId) {
            const finalCustomerId = customerInfo.customerId || customerInfo.fallbackCompanyId;
            const resolvedName = customerInfo.customerName || (customerInfo.fallbackCompanyObj ? this.getName(customerInfo.fallbackCompanyObj) : '');

            if (finalCustomerId) {
              this.isNewCustomer = false;

              const normFinalId = String(finalCustomerId).toLowerCase().trim();
              let targetEntry = (this.allCustomers || []).find(c =>
                c?.id && String(c.id).toLowerCase().trim() === normFinalId
              );

              if (!targetEntry) {
                targetEntry = customerInfo.fallbackCompanyObj ? {
                  ...customerInfo.fallbackCompanyObj,
                  id: String(finalCustomerId),
                  arabicName: customerInfo.fallbackCompanyObj.arabicName || resolvedName,
                  englishName: customerInfo.fallbackCompanyObj.englishName || resolvedName,
                  displayName: resolvedName,
                  mainAccountId: customerInfo.fallbackCompanyObj.mainAccountId || 'reservation-comp',
                  isReservationCompany: true
                } : {
                  id: String(finalCustomerId),
                  arabicName: resolvedName,
                  englishName: resolvedName,
                  displayName: resolvedName,
                  mainAccountId: 'reservation-comp',
                  isReservationCompany: true
                };

                this.allCustomers = [targetEntry, ...(this.allCustomers || [])];
              }

              const exactCustomerId = String(targetEntry.id);
              this.invoiceForm.patchValue({
                customerProfileId: exactCustomerId,
                customerProfileName: resolvedName
              });

              if (!this.customers.some(c => c?.id && String(c.id).toLowerCase().trim() === normFinalId)) {
                this.customers = [targetEntry, ...this.customers];
              }
              this.updateCustomerOptions();
            } else {
              this.isNewCustomer = false;
              this.newCustomerName = '';
              this.newCustomerTaxNumber = '';
              this.invoiceForm.patchValue({
                customerProfileId: null,
                customerProfileName: resolvedName
              });
              this.notifications.addNotification({
                id: Date.now(),
                title: this.translateService.instant('FINANCE.WARNING') || 'تنبيه',
                message: 'شركة الحجز غير موجودة في العملاء أو غير مربوطة بحساب مالي.',
                date: new Date(),
                type: 'warning',
                read: false
              });
            }
          }
        }

        // نفس منطق loadReservationData لكن بالتجميع
        validReservations.forEach((reservation: any) => {
          const numberOfNights = reservation?.numberOfNights || 1;

          // غرف
          (reservation?.reservationRoomEntries || []).forEach((entry: any) => {
            const numberOfRooms = entry?.numberOfRooms || 1;

            // room pax = عدد الغرف × سعة الغرفة (personNo)
            const roomType = roomTypes.find((rt: any) => rt.id === entry.roomTypeId);
            const personNo = roomType?.personNo || 1;
            const roomPax = numberOfRooms * personNo;

            // RoomType
            if (entry.roomTypeId && entry.roomRate > 0) {
              const roomTypeName = getName(roomType);
              const msc = this.mainSalesArray.find(
                (ms: any) => ms.englishName === roomTypeName || ms.arabicName === roomTypeName
              );
              if (msc) {
                const it = new SalesItem();
                it.mainSalesClassId = msc.id;
                it.quantity = numberOfRooms * numberOfNights;
                it.noOfNights = 1;
                it.price = entry.roomRate || 0;
                this.addItem(it);
              }
            }

            // Meal (بالـ pax)
            if (entry.reservationMealId && entry.mealRate > 0) {
              const meal = meals.find((m: any) => m.id === entry.reservationMealId);
              const mealName = getName(meal);
              const msc = this.mainSalesArray.find(
                (ms: any) => ms.englishName === mealName || ms.arabicName === mealName
              );
              if (msc) {
                const it = new SalesItem();
                it.mainSalesClassId = msc.id;
                it.quantity = roomPax * numberOfNights;
                it.noOfNights = 1;
                it.price = entry.mealRate || 0;
                this.addItem(it);
              }
            }

            // View
            if (entry.reservationViewId && entry.viewRate > 0) {
              const view = views.find((v: any) => v.id === entry.reservationViewId);
              const viewName = getName(view);
              const msc = this.mainSalesArray.find(
                (ms: any) => ms.englishName === viewName || ms.arabicName === viewName
              );
              if (msc) {
                const it = new SalesItem();
                it.mainSalesClassId = msc.id;
                it.quantity = numberOfRooms * numberOfNights;
                it.noOfNights = 1;
                it.price = entry.viewRate || 0;
                this.addItem(it);
              }
            }
          });

          // خدمات
          (reservation?.reservationServiceEntries || []).forEach((entry: any) => {
            if (entry.reservationServiceId) {
              const service = services.find((s: any) => s.id === entry.reservationServiceId);
              const serviceName = getName(service);
              const msc = this.mainSalesArray.find(
                (ms: any) => ms.englishName === serviceName || ms.arabicName === serviceName
              );
              if (msc) {
                const it = new SalesItem();
                it.mainSalesClassId = msc.id;
                it.quantity = entry.quantity || 1;
                it.noOfNights = 1;
                it.price = entry.salesPrice || 0;
                this.addItem(it);
              }
            }
          });
        });

        this.updateInvoiceTotals();
        this.applyLockIfReservation();
        this.loading = false;
        this.scheduleBarcodeInputFocus();
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('FINANCE.SUCCESS'),
          detail: `تم تحميل بيانات ${ids.length} حجز وبناء عناصر الفاتورة.`,
        });
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('FINANCE.ERROR') || 'خطأ',
          detail: 'فشل في تحميل بيانات الحجوزات.',
        });
      },
    });
  }


  loadReservationData(reservationId: string): void {
    forkJoin({
      reservation: this.reservationService.getById(reservationId),
      roomTypes: this.roomTypeService.getAll(),
      meals: this.reservationMealService.getAll(),
      views: this.reservationViewService.getAll(),
      services: this.reservationServiceService.getAll(),
      reservationCompanies: this.reservationCompanyService.getAll(),
      hotels: this.hotelService.getAll(),
    }).subscribe({
      next: ({ reservation, roomTypes, meals, views, services, reservationCompanies, hotels }) => {
        console.log('Reservation data loaded:', reservation);

        // Build lookup maps
        (hotels || []).forEach((hotel: any) => {
          if (hotel?.id) {
            this.hotelsMap.set(String(hotel.id).toLowerCase().trim(), hotel);
          }
        });
        (reservationCompanies || []).forEach((company: any) => {
          if (company?.id) {
            this.reservationCompaniesMap.set(String(company.id).toLowerCase().trim(), company);
          }
        });

        // Merge reservation companies into allCustomers (avoid duplicates)
        const mappedReservationCompanies = (reservationCompanies || []).map((company: any) => ({
          ...company,
          id: String(company.id),
          arabicName: company.arabicName,
          englishName: company.englishName,
          displayName: this.activeLanguage === 'en' ? (company.englishName || company.arabicName) : (company.arabicName || company.englishName),
          mainAccountId: company.mainAccountId || 'reservation-comp',
          isReservationCompany: true,
        }));
        const existingCustomerIds = new Set((this.allCustomers || []).map(c => String(c.id).toLowerCase().trim()));
        const uniqueReservationCompanies = mappedReservationCompanies.filter(rc => !existingCustomerIds.has(String(rc.id).toLowerCase().trim()));
        this.allCustomers = [...(this.allCustomers || []), ...uniqueReservationCompanies];

        this.applyFilterByInvoiceType(true);

        // Set reservationId and try to set customer if available
        const patchData: any = {
          reservationIds: [reservationId],
          invoiceType: 'reservation',
          saleInvoiceType: 2
        };

        // Get customer name and ID based on reservation type
        const customerInfo = this.getCustomerNameByReservationType(reservation);
        console.log('Customer info resolved from reservation:', customerInfo);

        if (customerInfo.customerName || customerInfo.customerId) {
          const finalCustomerId = customerInfo.customerId || customerInfo.fallbackCompanyId;
          const resolvedName = customerInfo.customerName || (customerInfo.fallbackCompanyObj ? this.getName(customerInfo.fallbackCompanyObj) : '');

          if (finalCustomerId) {
            this.isNewCustomer = false;

            const normFinalId = String(finalCustomerId).toLowerCase().trim();
            let targetEntry = (this.allCustomers || []).find(c =>
              c?.id && String(c.id).toLowerCase().trim() === normFinalId
            );

            if (!targetEntry) {
              targetEntry = customerInfo.fallbackCompanyObj ? {
                ...customerInfo.fallbackCompanyObj,
                id: String(finalCustomerId),
                arabicName: customerInfo.fallbackCompanyObj.arabicName || resolvedName,
                englishName: customerInfo.fallbackCompanyObj.englishName || resolvedName,
                displayName: resolvedName,
                mainAccountId: customerInfo.fallbackCompanyObj.mainAccountId || 'reservation-comp',
                isReservationCompany: true
              } : {
                id: String(finalCustomerId),
                arabicName: resolvedName,
                englishName: resolvedName,
                displayName: resolvedName,
                mainAccountId: 'reservation-comp',
                isReservationCompany: true
              };

              this.allCustomers = [targetEntry, ...(this.allCustomers || [])];
            }

            const exactCustomerId = String(targetEntry.id);
            patchData.customerProfileId = exactCustomerId;
            patchData.customerProfileName = resolvedName;

            if (!this.customers.some(c => c?.id && String(c.id).toLowerCase().trim() === normFinalId)) {
              this.customers = [targetEntry, ...this.customers];
            }
            this.updateCustomerOptions();
          } else {
            this.isNewCustomer = false;
            this.newCustomerName = '';
            this.newCustomerTaxNumber = '';
            patchData.customerProfileId = null;
            patchData.customerProfileName = resolvedName;
            this.notifications.addNotification({
              id: Date.now(),
              title: this.translateService.instant('FINANCE.WARNING') || 'تنبيه',
              message: 'شركة الحجز غير موجودة في العملاء أو غير مربوطة بحساب مالي.',
              date: new Date(),
              type: 'warning',
              read: false
            });
          }
        }

        this.invoiceForm.patchValue(patchData);

        // Clear existing items
        while (this.saleItems.length) {
          this.saleItems.removeAt(0);
        }

        // Helper to get name in current language
        const getName = (item: any) => {
          return this.activeLanguage === 'ar'
            ? (item?.arabicName || item?.englishName || '')
            : (item?.englishName || item?.arabicName || '');
        };

        // Add items from reservation room entries
        if (reservation.reservationRoomEntries) {
          const numberOfNights = reservation.numberOfNights || 1;

          for (const entry of reservation.reservationRoomEntries) {
            console.log('Processing room entry:', entry);
            const numberOfRooms = entry.numberOfRooms || 1;

            // Calculate roomPax (number of people) = numberOfRooms × personNo
            const roomType = roomTypes.find(rt => rt.id === entry.roomTypeId);
            const personNo = roomType?.personNo || 1;
            const roomPax = numberOfRooms * personNo;

            // Room Type
            if (entry.roomTypeId && entry.roomRate > 0) {
              const roomTypeName = getName(roomType);
              console.log('Room type name:', roomTypeName);
              const mainSalesClass = this.mainSalesArray.find(
                ms => ms.englishName === roomTypeName || ms.arabicName === roomTypeName
              );

              if (mainSalesClass) {
                const newItem = new SalesItem();
                newItem.mainSalesClassId = mainSalesClass.id;
                newItem.quantity = numberOfRooms * numberOfNights;
                newItem.noOfNights = 1;
                newItem.price = entry.roomRate || 0;
                this.addItem(newItem);
              } else {
                console.warn('No mainSalesClass found for room type:', roomTypeName);
              }
            }

            // Meal - Uses roomPax (number of people), not numberOfRooms
            if (entry.reservationMealId && entry.mealRate > 0) {
              const meal = meals.find(m => m.id === entry.reservationMealId);
              const mealName = getName(meal);
              console.log('Meal name:', mealName, 'roomPax:', roomPax);
              const mainSalesClass = this.mainSalesArray.find(
                ms => ms.englishName === mealName || ms.arabicName === mealName
              );

              if (mainSalesClass) {
                const newItem = new SalesItem();
                newItem.mainSalesClassId = mainSalesClass.id;
                newItem.quantity = roomPax * numberOfNights;
                newItem.noOfNights = 1;
                newItem.price = entry.mealRate || 0;
                this.addItem(newItem);
              } else {
                console.warn('No mainSalesClass found for meal:', mealName);
              }
            }

            // View
            if (entry.reservationViewId && entry.viewRate > 0) {
              const view = views.find(v => v.id === entry.reservationViewId);
              const viewName = getName(view);
              console.log('View name:', viewName);
              const mainSalesClass = this.mainSalesArray.find(
                ms => ms.englishName === viewName || ms.arabicName === viewName
              );

              if (mainSalesClass) {
                const newItem = new SalesItem();
                newItem.mainSalesClassId = mainSalesClass.id;
                newItem.quantity = numberOfRooms * numberOfNights;
                newItem.noOfNights = 1;
                newItem.price = entry.viewRate || 0;
                this.addItem(newItem);
              } else {
                console.warn('No mainSalesClass found for view:', viewName);
              }
            }
          }
        }

        // Add items from reservation service entries
        if (reservation.reservationServiceEntries) {
          for (const entry of reservation.reservationServiceEntries) {
            if (entry.reservationServiceId) {
              const service = services.find(s => s.id === entry.reservationServiceId);
              const serviceName = getName(service);
              const mainSalesClass = this.mainSalesArray.find(
                ms => ms.englishName === serviceName || ms.arabicName === serviceName
              );

              if (mainSalesClass) {
                const newItem = new SalesItem();
                newItem.mainSalesClassId = mainSalesClass.id;
                newItem.quantity = entry.quantity || 1;
                newItem.noOfNights = 1;
                newItem.price = entry.salesPrice || 0;
                this.addItem(newItem);
              }
            }
          }
        }

        this.updateInvoiceTotals();
        this.applyLockIfReservation();
        this.loading = false;
        this.scheduleBarcodeInputFocus();
        this.cdr.detectChanges();

        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('FINANCE.SUCCESS'),
          detail: 'تم تحميل بيانات الحجز بنجاح',
        });

      },

      error: (err) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('FINANCE.ERROR') || 'خطأ',
          detail: 'فشل في تحميل بيانات الحجز',
        });
      },
    });
  }
  createInvoicesForReservations(reservationIds: string[]): void {
    const ids = Array.from(new Set((reservationIds || []).map(String).filter(Boolean)));

    if (!ids.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'لا توجد معرفات حجوزات لإصدار فواتير لها.',
      });
      return;
    }

    this.loading = true;

    this.salesInvoiceService.getInvoicesByReservations(ids).pipe(
      catchError((err) => {
        console.error('getInvoicesByReservations error', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: 'فشل استدعاء خدمة إنشاء/جلب الفواتير.',
        });
        this.loading = false;
        return of([]);
      })
    ).subscribe((invoices: any[]) => {
      this.loading = false;

      if (!invoices || !invoices.length) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
          detail: 'لم يتم إنشاء/إرجاع أي فواتير.',
        });
        return;
      }

      // رسالة نجاح
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
        detail: `تم إنشاء/إرجاع ${invoices.length} فاتورة.`,
      });

      // لو الحجز الحالي ضمن المطلوب، حدّث حالة "لديه فاتورة"
      const currentIds: string[] = this.invoiceForm.get('reservationIds')?.value || [];
      const currentReservationId = currentIds[0];
      if (currentReservationId) {
        const match = invoices.find(inv => Array.isArray(inv?.reservationIds) && inv.reservationIds.includes(currentReservationId));
      }



      // لو كان الطلب لحجز واحد فقط: افتح الفاتورة مباشرة
      if (ids.length === 1 && invoices[0]?.id) {
        this.router.navigate(['/invoices', invoices[0].id]);
      }
    });
  }

  /** نسخة مختصرة لإنشاء/جلب فاتورة الحجز الحالي فقط */
  createInvoiceForThisReservation(): void {
    // اقرأ المصفوفة الجديدة reservationIds من الفورم
    const ids: string[] = this.invoiceForm.get('reservationIds')?.value || [];

    if (!ids.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
        detail: 'لا يوجد حجز مرتبط بهذه الفاتورة.',
      });
      return;
    }

    // استخدم أول حجز (نفس سلوك القديم)، أو أرسل المصفوفة كلها لو تبغى
    this.createInvoicesForReservations([ids[0]]);
  }



  getTaxAmount() {
    const items = this.saleItems.controls;
    // 1) Compute each item's pre-discount subtotal
    const subtotals = items.map((item) => {
      const qty = item.get('quantity')?.value || 0;
      const nights = item.get('noOfNights')?.value || 0;
      const price = item.get('price')?.value || 0;
      return price * qty * nights;
    });

    // 2) Total of **all** items (taxable + exempt)
    const grossTotal = subtotals.reduce((sum, s) => sum + s, 0);

    // 3) Grab the global discount
    const discount = this.invoiceForm.get('discountAmount')?.value || 0;

    // 4) Now walk each item, allocate its share of discount, then tax
    let totalTax = 0;
    items.forEach((item, i) => {
      const mainSalesClassId = item.get('mainSalesClassId')?.value;
      // decide tax rate
      const isExempt = mainSalesClassId
        ? this.mainSalesArray.find((x) => x.id === mainSalesClassId)
          ?.isTaxExempted
        : false;
      const taxRate = isExempt ? 0 : 0.15;

      // this item's raw subtotal
      const itemSubtotal = subtotals[i];

      // item's share of the discount (proportional to its subtotal)
      const itemDiscount =
        grossTotal > 0 ? (itemSubtotal / grossTotal) * discount : 0;

      // taxable base for this item
      const taxableBase = Math.max(itemSubtotal - itemDiscount, 0);

      // add its tax
      totalTax += taxableBase * taxRate;
    });

    // 5) Round to 4 decimal places and return
    const result = Math.round(totalTax * 100) / 100;
    return result;
  }

  getGrossNetTotal() {
    return this.saleItems.controls.reduce(
      (total, item) =>
        total +
        (item.get('price')?.value || 0) *
        (item.get('quantity')?.value || 0) *
        (item.get('noOfNights')?.value || 0),
      0
    );
  }
  getNetPrice() {
    const netTotal = this.getGrossNetTotal();
    const discount = this.invoiceForm.get('discountAmount')?.value || 0;
    const discountedTotal = netTotal - discount;
    const result = Math.round(discountedTotal * 100) / 100;
    return result;
  }

  getTotalPrice() {
    // calculate from items
    const netPrice = this.getNetPrice() || 0;
    const taxAmount = this.getTaxAmount() || 0;
    const result = this.roundToTwo(netPrice + taxAmount);
    return result;
  }

  confirmationCancelBeforeSavingChange() {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      header: this.translate.instant('DATA.CANCEL_BEFORE_SAVING_CHANGE'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'btn btn-danger  rounded-md m-4',
      rejectButtonStyleClass: 'btn btn-primary rounded-md  m-4',
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      accept: () => {
        this.router.navigateByUrl('invoices/list');
      },
    });
  }

  customerOptionsFilteredSignal = signal([]);
  get customerOptionsFiltered() {
    return this.customerOptionsFilteredSignal();
  }

  set customerOptionsFiltered(value: any[]) {
    this.customerOptionsFilteredSignal.set(value);
  }

  filterCustomerOptions(event: AutoCompleteCompleteEvent) {
    let filtered: any[] = [];
    let query = event.query;
    if (!query) {
      // show first 50 when empty
      filtered = this.customerOptions.slice(0, 50);
    } else {
      filtered = this.customerOptions.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase())
      );
    }
    this.customerOptionsFiltered = filtered;
  }

  get safeNetPrice() {
    return this.getGrossNetTotal();
  }

  cancel() {
    this.confirmationCancelBeforeSavingChange();
    /*this.initiateForm();

    // Load 10 empty saleItems with placeholder values
    for (let i = 0; i < 10; i++) {
      this.addItem({
        id: null,
        itemNo: '',
        mainSalesClassId: null,
        price: null,
        quantity: null,
        noOfNights: 1,
        tax: 15,
        taxAmount: 0,
        discount: 0,
        discountAmount: 0,
        totalPrice: 0,
        netPrice: 0,
        saleInvoiceId: this.invoiceId,
      });
    }*/
  }

  private resetToNewInvoiceForm(): void {
    // Reset component state to "new invoice" while staying on the same page.
    this.invoiceId = null;
    this.isEditMode = false;

    // Clear header invoice number immediately
    this.invoiceNo = null;

    // Recreate the form to ensure clean default values and validators.
    this.initiateForm();

    // Load initial empty rows (same UX pattern used in purchase invoice form)
    for (let i = 0; i < 10; i++) {
      this.addItem({
        id: null,
        itemNo: '',
        mainSalesClassId: null,
        price: null,
        quantity: null,
        noOfNights: 1,
        tax: 15,
        taxAmount: null,
        discount: null,
        discountAmount: null,
        totalPrice: null,
        netPrice: null,
        saleInvoiceId: null,
      } as any);
    }

    // Optional: clear customer selection display
    this.invoiceForm.patchValue({
      customerProfileId: null,
      customerProfileName: null,
      description: '',
      reservationIds: [],
      isQuotation: false,
      storeDetailsId: null,
      issueDate: getSystemNow(),
      dueDate: getSystemNow(),
    });

    // Generate a fresh invoice number (updates header + form control)
    this.generateInvoiceNum();

    // Ensure totals are recalculated
    this.safeUpdateInvoiceTotals();
  }

  // When a customer is selected from autocomplete suggestions
  onCustomerSelected(event: AutoCompleteSelectEvent) {
    const selected = event.value; // Expecting {label,value}
    if (selected && selected.value) {
      this.invoiceForm.patchValue({
        customerProfileName: selected.label,
        customerProfileId: selected.value,
      });
    }
  }

  onDropdownCustomerSelected(event: any) {
    const customerId = event.value;
    const selectedCustomer = this.customerOptions.find(c => c.value === customerId);
    this.invoiceForm.patchValue({
      customerProfileName: selectedCustomer ? selectedCustomer.label : '',
      customerProfileId: customerId
    });
  }

  toggleNewCustomer(): void {
    this.isNewCustomer = true;
    this.newCustomerType = 'individual';
    this.invoiceForm.patchValue({ customerProfileId: null, customerProfileName: '' });
  }

  cancelNewCustomer(): void {
    this.isNewCustomer = false;
    this.newCustomerType = 'individual';
    this.newCustomerName = '';
    this.newCustomerPhone = '';
    this.newCustomerTaxNumber = '';
    this.isDueDateManuallyEdited = false;
  }

  setCustomerType(type: 'individual' | 'company'): void {
    this.newCustomerType = type;
    if (type === 'individual') {
      this.newCustomerTaxNumber = '';
      this.isDueDateManuallyEdited = false;
      const currentIssueDate = this.invoiceForm?.get('issueDate')?.value;
      if (currentIssueDate) {
        this.invoiceForm.get('dueDate')?.setValue(currentIssueDate, { emitEvent: false });
      }
    }
  }

  onCustomerCleared() {
    this.invoiceForm.patchValue({ customerProfileId: null });
  }

  private hasAnyQuantityOverage(): boolean {
    return this.saleItems.controls.some((item) => this.isQuantityExceedingAvailable(item));
  }

  private extractSalesInvoiceSaveErrorMessage(error: any): string {
    if (typeof error?.error === 'string') {
      return error.error;
    }

    if (error?.error?.errors && typeof error.error.errors === 'object') {
      if (Array.isArray(error.error.errors)) {
        const first = error.error.errors[0];
        if (typeof first === 'string') return first;
        if (first?.errorMessage || first?.ErrorMessage || first?.message) {
          return first.errorMessage || first.ErrorMessage || first.message;
        }
      } else {
        const errorKeys = Object.keys(error.error.errors);
        if (errorKeys.length > 0) {
          const firstKeyErrors = error.error.errors[errorKeys[0]];
          if (Array.isArray(firstKeyErrors) && firstKeyErrors.length > 0) {
            return `${errorKeys[0]}: ${firstKeyErrors[0]}`;
          }
          if (typeof firstKeyErrors === 'string') {
            return `${errorKeys[0]}: ${firstKeyErrors}`;
          }
        }
      }
    }

    const businessRuleMessage =
      error?.error?.errors?.[0]?.errorMessage ||
      error?.error?.errors?.[0]?.ErrorMessage ||
      error?.error?.errors?.[0]?.message;
    const directMessage =
      error?.error?.message ||
      error?.error?.Message ||
      error?.error?.title ||
      error?.message;

    return (
      businessRuleMessage ||
      directMessage ||
      this.translate.instant('INVOICE.SAVE_FAILED')
    );
  }

  getSupplierEmail(): string {
    return this.companyDetails?.email || '';
  }
  getSupplierWebsite(): string {
    return this.companyDetails?.website || '';
  }
  getSupplierBankName(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      return this.companyDetails.bankAccounts[0].bankName || '';
    }
    return '';
  }
  getSupplierBankAccountNumber(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      return this.companyDetails.bankAccounts[0].bankAccountNumber || '';
    }
    return '';
  }
  getSupplierIBAN(): string {
    if (this.companyDetails?.bankAccounts && this.companyDetails.bankAccounts.length > 0) {
      return this.companyDetails.bankAccounts[0].iban || '';
    }
    return '';
  }
  getSupplierGaztNumber(): string {
    return this.companyDetails?.gaztNumber || '';
  }
  getVatAmountFromNet(net: number): number {
    return net * 0.15;
  }
  getTotalWithVat(net: number): number {
    return net * 1.15;
  }

  getCustomerName(): string {
    const formName = this.invoiceForm.get('customerProfileName')?.value;
    if (formName) {
      return formName;
    }
    const customerId = this.invoiceForm.get('customerProfileId')?.value;
    if (customerId && this.customerOptions) {
      const match = this.customerOptions.find(c => c.value === customerId);
      if (match) {
        return match.label;
      }
    }
    if (this.isNewCustomer && this.newCustomerName) {
      return this.newCustomerName;
    }
    return '-';
  }

  getCustomerAddress(): string {
    const p = this.getSelectedCustomer();
    if (!p) return '';
    const parts = [
      p.buildingNumber,
      p.street,
      p.district,
      p.city,
      p.country,
      p.postalCode
    ].filter(Boolean);
    return parts.join(', ');
  }

  getCustomerPhone(): string {
    if (this.isNewCustomer && this.newCustomerPhone) {
      return this.newCustomerPhone;
    }
    return this.getSelectedCustomer()?.contactNumber || '';
  }

  getCustomerEmail(): string {
    return this.getSelectedCustomer()?.email || '';
  }

  getCustomerTaxNumber(): string {
    if (this.isNewCustomer && this.newCustomerTaxNumber) {
      return this.newCustomerTaxNumber;
    }
    return this.getSelectedCustomer()?.taxNumber || '';
  }

  getCustomerOtherId(): string {
    return this.getSelectedCustomer()?.otherId || '';
  }

  getCustomerGaztNumber(): string {
    return this.getSelectedCustomer()?.gaztNumber || '';
  }

  getCustomerBankName(): string {
    return this.getSelectedCustomer()?.bankName || '';
  }

  getCustomerBankAccountNumber(): string {
    return this.getSelectedCustomer()?.bankAccountNumber || '';
  }

  getCustomerIBAN(): string {
    return this.getSelectedCustomer()?.iban || '';
  }

  setSellerName() {
    this.authService.getUserByToken().subscribe((res: any) => {
      this.sellerName = res.fullName;
    });
  }
}
