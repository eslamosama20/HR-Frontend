import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray, ReactiveFormsModule, FormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { forkJoin } from "rxjs";
import { CalendarModule } from 'primeng/calendar';
import { formatDateToUTCString, getSystemNow } from 'src/app/utils/dateUtils';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import { BackButtonComponent } from "../../../../shared-components/back-button/back-button.component";
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabViewModule } from 'primeng/tabview';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { finalize, switchMap } from 'rxjs/operators';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';

interface PurchaseRequestItem {
  id?: number | null;
  itemNo?: string;
  mainPurchaseClassId?: string | null;
  price?: number | null;
  quantity?: number | null;
  noOfNights?: number;
  tax?: number;
  taxAmount?: number;
  discount?: number;
  discountAmount?: number;
  totalPrice?: number;
  netPrice?: number;
  unit?: string;
}

@Component({
  selector: 'app-request-quotation-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, TranslateModule, DropdownModule, CalendarModule, RadioButtonModule, BackButtonComponent, ToastModule, DetailActionsMenuComponent, ConfirmDialogModule, TabViewModule, InputTextModule, DialogModule, ButtonModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './request-quotation-form.component.html',
  styleUrls: ['./request-quotation-form.component.scss']
})
export class RequestQuotationFormComponent implements OnInit {
  loadingSignal = signal<boolean>(false);
  get loading() {
    return this.loadingSignal()
  }
  set loading(value: boolean) {
    this.loadingSignal.set(value)
  }

  requestForm: FormGroup;
  requestId: string | null = null;
  quotationNo: { quotationNo: string } | null = null;
  suppliers: any[] = [];
  mainPurchaseArray: any[] = [];
  isViewMode: boolean = false; // Track if we're in view mode

  translate: TranslateService;
  activeLanguage: string = "en";
  
  priceModeSignal = signal('lastPrice');
  get priceMode() {
    return this.priceModeSignal();
  }
  set priceMode(value) {
    this.priceModeSignal.set(value);
  }

  // Action menu related properties
  customButtons: ActionButton[] = [];
  quotationData: any = null; // Store full quotation data
  
  // Navigation controls for action menu
  allQuotationIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  
  // Share dialog properties
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareBusy = false;
  shareForm!: FormGroup;
  
  // Convert dialog properties
  showConvertDialog = false;
  stores: StoreDetailsModel[] = [];
  selectedStoreId: string | null = null;
  convertError: string | null = null;
  submitting = false;
  
  constructor(
    private purchaseClassService: MainPurchaseClassService,
    private fb: FormBuilder,
    private purchaseInvoiceService: PurchaseInvoiceService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private supplierService: SupplierDetailsService,
    private translateService: TranslateService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private storeDetailsService: StoreDetailsService
  ) {
    this.translate = translateService;
    this.activeLanguage = this.translate.currentLang || 'ar';

    this.route.paramMap.subscribe(params => {
      this.requestId = params.get('id');
      // Check if we're in view mode from the URL path
      this.isViewMode = this.router.url.includes('/view/');
      console.log('View mode:', this.isViewMode, 'URL:', this.router.url);
    });
    
    // Initialize share form
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
    });

    this.requestForm = this.fb.group({
      id: [this.requestId],
      invoiceNo: [null],
      supplierDetailsId: [''],
      supplierDetailsName: [''],
      description: [''],
      issueDate: [getSystemNow()],
      tax: [0],
      taxAmount: [0],
      discountType: ['percentage'],
      discount: [0, [Validators.min(0)]],
      discountAmount: [0],
      totalPrice: [0],
      netPrice: [0],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Load all quotation IDs once on init for navigation
    this.loadAllQuotationIds();
    
    // Load stores once
    this.loadStores();
    
    // Subscribe to route params to get the request ID and reload data when it changes
    this.route.paramMap.subscribe(params => {
      const newId = params.get('id');
      if (newId) {
        this.requestId = newId;
        // Load data for the new quotation
        this.loadData();
        // Update navigation controls when route changes
        this.updateNavigationControls();
      } else {
        // No ID in route - this is a new quotation
        this.requestId = null;
        this.loadData();
        this.generateQuotationNum();
      }
    });
  }
  
  private loadStores(): void {
    this.storeDetailsService.getAll().subscribe({
      next: (list) => {
        this.stores = list || [];
        console.log('Stores loaded:', this.stores.length, this.stores);
      },
      error: (err) => {
        console.error('Error loading stores:', err);
        this.stores = [];
      }
    });
  }

  initRequestForm() {
    if (this.requestId) {
      const numericId = parseInt(this.requestId, 10);
      
      // Use new frontal API if ID is numeric, otherwise use old API
      if (!isNaN(numericId)) {
        this.purchaseInvoiceService.getQuotationById(numericId).subscribe({
          next: (quotation: any) => {
            // Store quotation data for action menu
            this.quotationData = quotation;
            console.log('Quotation loaded:', quotation);
            console.log('purchaseInvoiceId:', quotation.purchaseInvoiceId);
            
            this.requestForm.patchValue({
              ...quotation,
              issueDate: new Date(quotation.issueDate),
            });
            
            // Frontal API uses 'purchaseQuotationItems' instead of 'items'
            const items = quotation.purchaseQuotationItems || quotation.items || [];
            items.forEach((item: any) => {
              this.addItem(item)
            });
            
            // Disable form after loading data if in view mode
            if (this.isViewMode) {
              this.requestForm.disable();
              // Setup buttons after data is loaded so we have quotationData available
              this.setupCustomButtons();
            }
            
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading quotation:', error);
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('ERROR'),
              detail: this.translate.instant('ERRORS.LOAD_QUOTATION_FAILED') || 'Failed to load quotation data',
              life: 5000
            });
            this.router.navigate(['/purchase-invoices/request-quotation']);
          }
        });
      } else {
        // Fallback to old API for GUID-based IDs
        this.purchaseInvoiceService.getPurchaseRequestForQuotationById(this.requestId).subscribe((request: any) => {
          this.requestForm.patchValue({
            ...request,
            issueDate: new Date(request.issueDate),
          });
          request.items?.forEach((item: any) => {
            this.addItem(item)
          });
          
          // Disable form after loading data if in view mode
          if (this.isViewMode) {
            this.requestForm.disable();
          }
          
          this.cdr.detectChanges();
        });
      }
    } else {
      // Load 10 empty items with placeholder values
      for (let i = 0; i < 10; i++) {
        this.addItem({
          id: null,
          itemNo: '',
          mainPurchaseClassId: null,
          price: null,
          quantity: null,
          noOfNights: 1,
          tax: 15,
          taxAmount: 0,
          discount: 0,
          discountAmount: 0,
          totalPrice: 0,
          netPrice: 0,
        });
      }
      this.cdr.detectChanges()
    }

    this.updateRequestTotals();
  }

  private generateQuotationNum() {
    // Get quotation number from the new frontal API
    this.purchaseInvoiceService.getFrontalQuotationInvoiceNo().subscribe({
      next: (response) => {
        // Use the original invoice number from backend without modification
        const invoiceNo = response?.invoiceNo || `Q-${Date.now()}`;
        this.quotationNo = { quotationNo: invoiceNo };
        this.requestForm.controls['invoiceNo'].setValue(this.quotationNo?.quotationNo);
      },
      error: (err) => {
        console.error('Error getting quotation number, using fallback:', err);
        this.quotationNo = { quotationNo: `Q-${Date.now()}` };
        this.requestForm.controls['invoiceNo'].setValue(this.quotationNo?.quotationNo);
      }
    });
  }

  private filterValidItems(): any[] {
    return this.items.controls
      .filter(item => {
        const price = item.get('price')?.value;
        const quantity = item.get('quantity')?.value;
        const noOfNights = item.get('noOfNights')?.value;
        // Price can be 0, just check it's not null/undefined
        return (price !== null && price !== undefined) && quantity && noOfNights && (price >= 0 && quantity > 0 && noOfNights > 0);
      })
      .map(item => {
        this.updateItemValues(item as FormGroup);
        return item.value;
      });
  }

  updateItemValues(item: FormGroup): void {
    const price = parseFloat(item.get('price')?.value) || 0;
    const quantity = parseFloat(item.get('quantity')?.value) || 0;
    const noOfNights = parseFloat(item.get('noOfNights')?.value) || 1;
    const itemDiscount = parseFloat(item.get('discount')?.value) || 0;
    const taxRate = parseFloat(this.requestForm.get('tax')?.value) || 15;

    const grossPrice = (price * quantity) * noOfNights;
    const discountAmount = (grossPrice * itemDiscount) / 100;
    const netPrice = grossPrice - discountAmount;
    const taxAmount = (netPrice * taxRate) / 100;
    const totalPrice = netPrice + taxAmount;

    item.get('netPrice')?.setValue(parseFloat(netPrice.toFixed(2)))
    item.get('discountAmount')?.setValue(parseFloat(discountAmount.toFixed(2)))
    item.get('taxAmount')?.setValue(parseFloat(taxAmount.toFixed(2)))
    item.get('totalPrice')?.setValue(parseFloat(totalPrice.toFixed(2)))
  }

  updateRequestTotals(): void {
    const filteredItems = this.filterValidItems();

    const totalRequestPrice = filteredItems.reduce((total, item) => total + (item.totalPrice || 0), 0);
    const totalNetPrice = filteredItems.reduce((total, item) => total + (item.netPrice || 0), 0);
    const totalTaxAmount = filteredItems.reduce((total, item) => total + (item.taxAmount || 0), 0);

    const discountType = this.requestForm.get('discountType')?.value;
    const requestDiscountValue = parseFloat(this.requestForm.get('discount')?.value) || 0;

    let requestDiscountAmount = 0;

    if (discountType === 'percentage') {
      requestDiscountAmount = (totalRequestPrice * requestDiscountValue) / 100;
    } else if (discountType === 'amount') {
      requestDiscountAmount = requestDiscountValue;
    }

    const netPriceAfterDiscount = totalNetPrice - requestDiscountAmount;
    const totalPriceAfterDiscount = totalNetPrice + totalTaxAmount - requestDiscountAmount;

    this.requestForm.get('totalPrice')?.setValue(parseFloat(totalPriceAfterDiscount.toFixed(2)))
    this.requestForm.get('netPrice')?.setValue(parseFloat(netPriceAfterDiscount.toFixed(2)))
    this.requestForm.get('taxAmount')?.setValue(parseFloat(totalTaxAmount.toFixed(2)))
    this.requestForm.get('discountAmount')?.setValue(parseFloat(requestDiscountAmount.toFixed(2)))

    this.cdr.detectChanges();
  }

  onDiscountTypeChange(event: any): void {
    const discountType = event.target.value;
    this.requestForm.patchValue({ discount: 0 });
    this.updateRequestTotals();
  }

  get items(): FormArray {
    return this.requestForm.get('items') as FormArray;
  }

  addItem(purchaseItem: PurchaseRequestItem = null): void {
    const itemFormGroup = this.fb.group({
      id: [purchaseItem?.id ?? null],
      itemNo: [{ value: '', disabled: true }],
      mainPurchaseClassId: [purchaseItem?.mainPurchaseClassId],
      price: [purchaseItem?.price ?? 0, [Validators.min(0)]],  // Allow 0 price, just min validation
      quantity: [purchaseItem?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      noOfNights: [purchaseItem?.noOfNights ?? 1, [Validators.required, Validators.min(1), Validators.pattern("^[0-9]*$")]],
      discount: [purchaseItem?.discount ?? 0, [Validators.min(0)]],
      discountAmount: [purchaseItem?.discountAmount ?? 0],
      netPrice: [purchaseItem?.netPrice ?? 0],
      tax: [purchaseItem?.tax ?? 15],
      taxAmount: [purchaseItem?.taxAmount ?? 0],
      totalPrice: [purchaseItem?.totalPrice ?? 0],
      unit: purchaseItem?.unit ?? ''
    });

    this.items.push(itemFormGroup);

    itemFormGroup.get('price')?.valueChanges.subscribe(() => this.updateRequestTotals());
    itemFormGroup.get('quantity')?.valueChanges.subscribe(() => this.updateRequestTotals());
    itemFormGroup.get('noOfNights')?.valueChanges.subscribe(() => this.updateRequestTotals());
    itemFormGroup.get('discount')?.valueChanges.subscribe(() => this.updateRequestTotals());

    this.updateRequestTotals();
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.updateRequestTotals();
    this.cdr.detectChanges();
  }

  setSupplierIdForRequest(supplierIdValue: string): void {
    this.requestForm.get('supplierDetailsId')?.setValue(supplierIdValue);
    
    const selectedSupplier = this.suppliers.find(supplier => supplier.value === supplierIdValue);
    if (selectedSupplier) {
      this.requestForm.get('supplierDetailsName')?.setValue(selectedSupplier.label);
    }
  }

  onSupplierChange(event: any): void {
    const supplierId = event.value;
    if (supplierId) {
      this.setSupplierIdForRequest(supplierId);
    }
  }

  onPurchaseClick(event: any, item: AbstractControl<any, any>) {
    const purchaseId = event.value
    const purchaseObject = this.mainPurchaseArray.find(x => x.id === purchaseId);

    // Set unit
    item.get('unit')?.setValue(purchaseObject?.measurementUnit?.arabicSymbol);
    
    // Set price based on priceMode (lastPrice or lastMonthAveragePrice)
    const price = this.priceMode === 'lastPrice' 
      ? (purchaseObject?.lastPrice ?? 0)
      : (purchaseObject?.lastMonthAveragePrice ?? 0);
    item.get('price')?.setValue(price);
    
    this.cdr.detectChanges()
  }

  setPriceModeLastPrice() {
    this.priceMode = 'lastPrice';
    // Update all existing items with lastPrice if they currently have lastMonthAveragePrice
    this.items.controls.forEach(item => {
      const purchaseId = item.get('mainPurchaseClassId')?.value;
      if (purchaseId) {
        const purchaseObject = this.mainPurchaseArray.find(x => x.id === purchaseId);
        if (purchaseObject && item.get('price')?.value === purchaseObject.lastMonthAveragePrice) {
          item.get('price')?.setValue(purchaseObject.lastPrice ?? 0);
        }
      }
    });
    this.updateRequestTotals();
    this.cdr.detectChanges();
  }

  setPriceModeAveragePrice() {
    this.priceMode = 'averagePrice';
    // Update all existing items with lastMonthAveragePrice if they currently have lastPrice
    this.items.controls.forEach(item => {
      const purchaseId = item.get('mainPurchaseClassId')?.value;
      if (purchaseId) {
        const purchaseObject = this.mainPurchaseArray.find(x => x.id === purchaseId);
        if (purchaseObject && item.get('price')?.value === purchaseObject.lastPrice) {
          item.get('price')?.setValue(purchaseObject.lastMonthAveragePrice ?? 0);
        }
      }
    });
    this.updateRequestTotals();
    this.cdr.detectChanges();
  }

  submitForm(): void {
    this.loading = true;
    // Remove invalid items before submitting
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items.at(i);
      const mainPurchaseClassId = item.get('mainPurchaseClassId')?.value;
      const price = item.get('price')?.value;
      const quantity = item.get('quantity')?.value;
      const noOfNights = item.get('noOfNights')?.value;

      // Item is invalid if it's missing required fields
      // Note: price can be 0 (free items), but must be present (not null/undefined)
      const isPriceValid = price !== null && price !== undefined && price >= 0;
      const isQuantityValid = quantity && quantity > 0;
      const isNoOfNightsValid = noOfNights && noOfNights >= 1;
      
      if (!mainPurchaseClassId || !isPriceValid || !isQuantityValid || !isNoOfNightsValid) {
        console.log(`Removing invalid item at index ${i}:`, {
          mainPurchaseClassId,
          price,
          quantity,
          noOfNights,
          isPriceValid,
          isQuantityValid,
          isNoOfNightsValid
        });
        this.items.removeAt(i);
      }
    }

    // Validate that at least one item exists
    if (this.items.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('WARNING'),
        detail: this.translate.instant('VALIDATION.AT_LEAST_ONE_ITEM') || 'Please add at least one item to the quotation',
        life: 4000
      });
      this.loading = false;
      return;
    }

    const totalRequestPrice = this.items.controls.reduce((total, item) => total + (item.get('totalPrice')?.value || 0), 0);
    const totalNetPrice = this.items.controls.reduce((total, item) => total + (item.get('netPrice')?.value || 0), 0);
    const totalTaxAmount = this.items.controls.reduce((total, item) => total + (item.get('taxAmount')?.value || 0), 0);
    const totalDiscountAmount = this.items.controls.reduce((total, item) => total + (item.get('discountAmount')?.value || 0), 0);

    this.requestForm.patchValue({
      totalPrice: totalRequestPrice,
      netPrice: totalNetPrice,
      taxAmount: totalTaxAmount,
      discountAmount: totalDiscountAmount,
    });

    if (this.requestForm.valid) {
      const formValue = this.requestForm.value;
      const items = formValue.items.map((inv: any, i: number) => {
        // Find the mainPurchaseClass to get the item name
        const mainClass = this.mainPurchaseArray.find(x => x.id === inv.mainPurchaseClassId);
        const itemName = mainClass?.arabicName || mainClass?.englishName || '';
        
        // Build clean item object with only API-required fields
        const item: any = {
          itemNo: String(i + 1),
          mainPurchaseClassId: inv.mainPurchaseClassId,
          name: itemName,
          price: inv.price,
          quantity: inv.quantity,
          tax: inv.tax || 0,
          taxAmount: inv.taxAmount || 0,
          discount: inv.discount || 0,
          discountAmount: inv.discountAmount || 0,
          totalPrice: inv.totalPrice || 0,
          netPrice: inv.netPrice || 0,
          isTaxExempted: false  // Default value for required field
        };
        
        // Only include ID for existing items (updates)
        if (inv.id !== null && inv.id !== undefined) {
          item.id = typeof inv.id === 'string' ? parseInt(inv.id, 10) : inv.id;
        }
        
        return item;
      });
      
      // Build clean payload with only API-required fields
      const payload: any = {
        invoiceNo: formValue.invoiceNo,
        currency: formValue.currency || 'SAR',
        supplierDetailsId: formValue.supplierDetailsId,
        description: formValue.description || '',
        issueDate: formatDateToUTCString(formValue.issueDate),
        dueDate: formatDateToUTCString(formValue.issueDate),
        tax: formValue.tax || 0,
        taxAmount: formValue.taxAmount || 0,
        discount: formValue.discount || 0,
        discountAmount: formValue.discountAmount || 0,
        totalPrice: formValue.totalPrice || 0,
        netPrice: formValue.netPrice || 0,
        purchaseQuotationItems: items,
        isFrontal: true
      };
      
      // Only include ID for edit operations
      if (formValue.id) {
        payload.id = typeof formValue.id === 'string' ? parseInt(formValue.id, 10) : formValue.id;
      }
      
      if (this.requestId) {
        console.log('=== UPDATING QUOTATION ===');
        console.log('Full payload:', JSON.stringify(payload, null, 2));
        console.log('Number of items:', payload.purchaseQuotationItems?.length);
        console.log('Items details:', payload.purchaseQuotationItems);
        const numericId = parseInt(this.requestId, 10);
        
        // Use frontal API if ID is numeric, otherwise use old API
        if (!isNaN(numericId)) {
          this.purchaseInvoiceService.updateFrontalQuotation(numericId, payload).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('SUCCESS'),
                detail: this.translate.instant('PURCHASE_QUOTATION.UPDATE_SUCCESS') || 'Purchase quotation updated successfully',
                life: 3000
              });
              this.router.navigate(['/purchase-invoices/request-quotation']);
              this.loading = false;
            },
            error: (error) => {
              console.error('Error during update:', error);
              
              // Check if it's a backend error but data might have been saved
              // Some backends return 500 even when the update succeeds
              if (error.status === 500 && error.error?.Message === 'An unexpected error occurred.') {
                this.messageService.add({
                  severity: 'warn',
                  summary: this.translate.instant('WARNING'),
                  detail: this.translate.instant('PURCHASE_QUOTATION.UPDATE_WARNING') || 'Quotation may have been updated, but the server returned an error. Please verify the changes.',
                  life: 6000
                });
                // Navigate back to list after delay so user can see the message
                setTimeout(() => {
                  this.router.navigate(['/purchase-invoices/request-quotation']);
                }, 2000);
              } else {
                const errorMessage = error?.error?.message || error?.message || 'Failed to update purchase quotation';
                this.messageService.add({
                  severity: 'error',
                  summary: this.translate.instant('ERROR'),
                  detail: this.translate.instant('PURCHASE_QUOTATION.UPDATE_FAILED') || errorMessage,
                  life: 5000
                });
              }
              this.loading = false;
            }
          });
        } else {
          // Fallback to old API for GUID-based IDs
          this.purchaseInvoiceService.updatePurchaseRequestForQuotation(this.requestId, payload).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('SUCCESS'),
                detail: this.translate.instant('PURCHASE_QUOTATION.UPDATE_SUCCESS') || 'Purchase quotation updated successfully',
                life: 3000
              });
              this.router.navigate(['/purchase-invoices/request-quotation']);
              this.loading = false;
            },
            error: (error) => {
              console.error('Error during update:', error);
              const errorMessage = error?.error?.message || error?.message || 'Failed to update purchase quotation';
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('ERROR'),
                detail: this.translate.instant('PURCHASE_QUOTATION.UPDATE_FAILED') || errorMessage,
                life: 5000
              });
              this.loading = false;
            }
          });
        }
      } else {
        console.log('Creating frontal quotation with payload:', payload);
        this.purchaseInvoiceService.createFrontalQuotation(payload).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('SUCCESS'),
              detail: this.translate.instant('PURCHASE_QUOTATION.CREATE_SUCCESS') || 'Purchase quotation created successfully',
              life: 3000
            });
            this.router.navigate(['/purchase-invoices/request-quotation']);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error during creation:', error);
            const errorMessage = error?.error?.message || error?.message || 'Failed to create purchase quotation';
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('ERROR'),
              detail: this.translate.instant('PURCHASE_QUOTATION.CREATE_FAILED') || errorMessage,
              life: 5000
            });
            this.loading = false;
          }
        });
      }
    } else {
      this.requestForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('WARNING'),
        detail: this.translate.instant('VALIDATION.FORM_INVALID') || 'Please fill in all required fields correctly',
        life: 4000
      });
      this.loading = false;
    }
  }

  loadData(): void {
    this.loading = true
    forkJoin({
      suppliers: this.supplierService.getAll(),
      mainPurchase: this.purchaseClassService.getAll()
    }).subscribe({
      next: ({ suppliers, mainPurchase }) => {
        this.suppliers = suppliers.map(supplier => (
          {
            label: this.activeLanguage == 'en' ? supplier.englishName : supplier.arabicName,
            value: supplier.id
          }));
        this.mainPurchaseArray = mainPurchase;
        this.initRequestForm();
        this.loading = false;
      },
      error: (err) => {
        console.error("ERROR loading data", err);
        this.loading = false;
      }
    });
  }

  // ============= Action Menu Handlers =============
  
  setupCustomButtons(): void {
    this.customButtons = [];
    
    // Add "Share" button
    this.customButtons.push({
      label: 'COMMON.SHARE',
      icon: 'pi pi-share-alt',
      color: 'info',
      action: () => this.openShareDialog(),
      visible: true
    });
    
    // Add "Convert to Invoice" button - check if already converted
    // Check both purchaseInvoiceId and status field
    const isConverted = 
      (this.quotationData?.purchaseInvoiceId != null && this.quotationData?.purchaseInvoiceId !== undefined) ||
      this.quotationData?.status === 'ConvertedToInvoice' ||
      this.quotationData?.status === 'Converted';
    
    this.customButtons.push({
      label: 'REQUEST_QUOTATION.CONVERT_TO_INVOICE',
      icon: 'pi pi-file-export',
      color: 'success',
      action: () => this.openConvertDialog(),
      visible: true,
      disabled: isConverted
    });
    
    console.log('Convert button setup - isConverted:', isConverted, 'purchaseInvoiceId:', this.quotationData?.purchaseInvoiceId, 'status:', this.quotationData?.status);
  }
  
  onPrintClick(): void {
    window.print();
  }
  
  onEditClick(): void {
    if (this.requestId) {
      this.router.navigate(['/purchase-invoices/request-quotation/edit', this.requestId]);
    }
  }
  
  onDeleteClick(event?: Event): void {
    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: this.translate.instant('REQUEST_QUOTATION.CONFIRM_DELETE'),
      header: this.translate.instant('REQUEST_QUOTATION.DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        if (this.requestId) {
          this.purchaseInvoiceService.deletePurchaseQuotation(this.requestId).subscribe({
            next: () => {
              this.messageService.add({ 
                severity: 'success', 
                summary: this.translate.instant('COMMON.SUCCESS'), 
                detail: this.translate.instant('REQUEST_QUOTATION.DELETE_SUCCESS_DETAIL') 
              });
              this.router.navigate(['/purchase-invoices/request-quotation']);
            },
            error: (err) => {
              this.messageService.add({ 
                severity: 'error', 
                summary: this.translate.instant('COMMON.ERROR'), 
                detail: this.translate.instant('REQUEST_QUOTATION.DELETE_ERROR_DETAIL') 
              });
            }
          });
        }
      },
    });
  }
  
  // Share dialog methods
  openShareDialog(): void {
    this.shareDialogVisible = true;
    this.shareActiveTabIndex = 0;
    this.shareForm.reset();
    this.shareBusy = false;
  }
  
  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.shareBusy = false;
    this.shareForm.reset();
  }
  
  submitShareEmail(): void {
    const email = (this.shareForm.get('email')?.value || '').trim();
    if (!email || this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail: this.translate.instant('REQUEST_QUOTATION.EMAIL_INVALID'),
      });
      return;
    }
    
    if (!this.requestId) return;
    
    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });
    
    this.purchaseInvoiceService.shareRequestQuotationByEmail(this.requestId, email)
      .pipe(finalize(() => {
        this.shareBusy = false;
        this.shareForm.enable({ emitEvent: false });
      }))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
            detail: this.translate.instant('REQUEST_QUOTATION.EMAIL_SUCCESS_SINGLE'),
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.translate.instant('REQUEST_QUOTATION.EMAIL_ERROR'),
          });
        },
      });
  }
  
  submitShareWhatsapp(): void {
    const ctrl = this.shareForm.get('whatsappNumber');
    const raw = ctrl?.value || '';
    const phone = String(raw || '').replace(/\s+/g, '').replace(/^\+/, '');
    
    if (!phone || ctrl?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail: this.translate.instant('REQUEST_QUOTATION.PHONE_INVALID'),
      });
      return;
    }
    
    if (!this.requestId) return;
    
    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });
    
    this.purchaseInvoiceService.shareRequestQuotationByWhatsapp(this.requestId, phone)
      .pipe(finalize(() => {
        this.shareBusy = false;
        this.shareForm.enable({ emitEvent: false });
      }))
      .subscribe({
        next: (res: any) => {
          const whatsAppLink = res?.response?.whatsAppLink || res?.whatsAppLink;
          if (whatsAppLink) {
            window.open(whatsAppLink, '_blank', 'noopener');
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
              detail: this.translate.instant('REQUEST_QUOTATION.WHATSAPP_SUCCESS_SINGLE'),
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.instant('FINANCE.WARNING') || 'تنبيه',
              detail: this.translate.instant('REQUEST_QUOTATION.NO_WHATSAPP_LINK'),
            });
          }
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.translate.instant('REQUEST_QUOTATION.WHATSAPP_ERROR'),
          });
        },
      });
  }
  
  // Convert to invoice methods
  openConvertDialog(): void {
    console.log('Opening convert dialog, stores:', this.stores);
    this.showConvertDialog = true;
    this.selectedStoreId = null;
    this.convertError = null;
  }
  
  closeConvertDialog(): void {
    if (!this.submitting) {
      this.showConvertDialog = false;
      this.selectedStoreId = null;
      this.convertError = null;
    }
  }
  
  confirmConvert(): void {
    if (!this.requestId || !this.selectedStoreId) return;
    
    this.submitting = true;
    this.convertError = null;
    
    const numericId = parseInt(this.requestId, 10);
    
    if (isNaN(numericId)) {
      this.convertError = this.translate.instant('REQUEST_QUOTATION.INVALID_REQUEST_ID') || 'رقم الطلب غير صالح';
      this.submitting = false;
      return;
    }
    
    this.purchaseInvoiceService.getQuotationById(numericId)
      .pipe(
        switchMap((quotation: any) => {
          // Add itemName to each item using mainPurchaseClasses
          if (quotation.purchaseQuotationItems && Array.isArray(quotation.purchaseQuotationItems)) {
            quotation.purchaseQuotationItems = quotation.purchaseQuotationItems.map((item: any) => {
              const mainClass = this.mainPurchaseArray.find(x => x.id === item.mainPurchaseClassId);
              return {
                ...item,
                itemName: item.itemName || mainClass?.arabicName || mainClass?.englishName || ''
              };
            });
          }
          return this.purchaseInvoiceService.convertPurchaseQuotationToInvoice(numericId, this.selectedStoreId!, quotation);
        }),
        finalize(() => { this.submitting = false; })
      )
      .subscribe({
        next: () => {
          this.showConvertDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('REQUEST_QUOTATION.CONVERT_SUCCESS_SUMMARY'),
            detail: this.translate.instant('REQUEST_QUOTATION.CONVERT_SUCCESS_DETAIL')
          });
          this.router.navigate(['/purchase-invoices/request-quotation']);
        },
        error: (err) => {
          console.error(err);
          this.convertError = this.translate.instant('REQUEST_QUOTATION.CONVERT_ERROR_DETAIL') || 'حدث خطأ أثناء التحويل';
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('REQUEST_QUOTATION.CONVERT_ERROR_SUMMARY'),
            detail: this.convertError
          });
        }
      });
  }
  
  // ============= Navigation Controls =============
  
  // Load all quotation IDs for navigation
  loadAllQuotationIds(): void {
    this.purchaseInvoiceService.getFrontalQuotations().subscribe({
      next: (quotations) => {
        this.allQuotationIds = quotations.map(q => q.id.toString());
        this.updateNavigationControls();
        this.cdr.detectChanges(); // Trigger change detection
      },
      error: (err) => {
        console.error('Error loading quotation IDs', err);
      }
    });
  }
  
  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.requestId || this.allQuotationIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }
    
    this.currentIndex = this.allQuotationIds.indexOf(this.requestId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allQuotationIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
      this.cdr.detectChanges(); // Trigger change detection after updating controls
    }
  }
  
  // Navigate to next quotation
  navigateToNext(): void {
    if (this.currentIndex < this.allQuotationIds.length - 1) {
      const nextId = this.allQuotationIds[this.currentIndex + 1];
      this.router.navigate(['/purchase-invoices/request-quotation/view', nextId]);
    }
  }
  
  // Navigate to previous quotation
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allQuotationIds[this.currentIndex - 1];
      this.router.navigate(['/purchase-invoices/request-quotation/view', prevId]);
    }
  }
}
