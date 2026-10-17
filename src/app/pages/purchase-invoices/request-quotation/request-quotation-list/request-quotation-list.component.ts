import { Component, OnInit, ViewChild, ChangeDetectorRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { PurchaseInvoiceService } from 'src/app/services/purchaseInvoice/purchase-invoice.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { MainPurchaseClassService } from 'src/app/services/purchase-classes-tree/main-purchase-class.service';
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import { finalize, switchMap, filter } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import { CompanyDetailsService } from 'src/app/services/inventory/company-details.service';
import { PrintDocumentComponent } from 'src/app/shared-components/print-document/print-document.component';
import { TranslationService } from 'src/app/modules/i18n';
import { FormatDecimalPipe } from 'src/app/pipes/format-decimal.pipe';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { DropdownModule } from 'primeng/dropdown';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { StoreDetailsModel } from 'src/app/models/inventory/storeDetails.model';

interface QuotationItemRow {
  id: string;
  requestId: string;
  invoiceNo?: string; // Display invoice number instead of ID
  itemName: string;
  quantity: number;
  mainPurchaseClassId?: string | null;
  mainPurchaseClassName?: string;
  status?: string; // "Draft" | "ConvertedToInvoice"
  purchaseInvoiceId?: number | null;
}

interface PRQItemDto {
  id?: string;
  itemName: string;
  quantity: number;
  mainPurchaseClassId?: string | null;
  unitPrice?: number | null;
  isActive?: boolean;
}

interface PRQDto {
  id?: string;
  items: PRQItemDto[];
  isActive?: boolean;
}

@Component({
  selector: 'app-request-quotation-list',
  standalone: true,
  templateUrl: './request-quotation-list.component.html',
  styleUrls: ['./request-quotation-list.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ToastModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    OverlayPanelModule,
    TranslateModule,
    DialogModule,
    TabViewModule,
    CheckboxModule,
    PrintDocumentComponent,
    FormatDecimalPipe,
    CustomDatePipe,
    DropdownModule
  ],
  providers: [MessageService]
})
export class RequestQuotationListComponent implements OnInit, OnDestroy {
  @ViewChild('opItem') opItem!: OverlayPanel;
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  
  items: QuotationItemRow[] = [];
  filteredItems: QuotationItemRow[] = [];
  selectedItems: QuotationItemRow[] = [];
  selectedItem: QuotationItemRow | null = null;
  loading = true;
  searchValue: string = '';
  
  // Print-related properties
  companyDetailsSignal = signal<CompanyDetailsModel | null>(null);
  get companyDetails(): CompanyDetailsModel | null {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel | null) {
    this.companyDetailsSignal.set(value);
  }

  printDataSignal = signal<any[]>([]);
  get printData(): any[] {
    return this.printDataSignal();
  }
  set printData(value: any[]) {
    this.printDataSignal.set(value);
  }

  docColumnsSignal = signal<any[]>([]);
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  printRequestId: string = '';
  currentDate: Date = new Date();
  activeLanguage: string;
  
  // Table columns configuration
  columns = [
    { field: 'mainPurchaseClassName', header: 'DATA.CLASS', filter: true, filterType: 'text' },
    { field: 'quantity', header: 'REQUEST_QUOTATION.QUANTITY', filter: true, filterType: 'numeric' },
    { field: 'requestId', header: 'REQUEST_QUOTATION.REQUEST_ID', filter: true, filterType: 'text' }
  ];

  // dialogs
  showViewDialog = false;
  showDeleteDialog = false;
  showDeleteAllDialog = false;
  showConvertDialog = false;

  // Share dialog
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareTarget: QuotationItemRow | null = null;
  shareBulkMode = false;
  shareBulkIds: string[] = [];
  shareBusy = false;
  shareForm!: FormGroup;

  // Print options dialog
  printOptionsDialogVisible: boolean = false;
  includePricesInPrint: boolean = true;
  pendingPrintItem: QuotationItemRow | null = null;
  pendingPrintMode: 'single' | 'bulk' = 'single';

  // forms
  submitting = false;
  mainPurchaseClasses: MainPurchaseClassModel[] = [];

  viewForm = { itemId: '', requestId: '', itemName: '', quantity: 0, itemsCount: 0, mainPurchaseClassName: '', unitPrice: null as number | null };
  deleteTarget: QuotationItemRow | null = null;
  deleteError: string | null = null;
  viewLoading = false;

  // Convert to invoice
  convertTarget: QuotationItemRow | null = null;
  convertError: string | null = null;
  stores: StoreDetailsModel[] = [];
  selectedStoreId: string | null = null;

  // Frontal mode detection
  isFrontal = false;
  
  // Route subscription for reload on navigation
  private routerSubscription: Subscription;

  constructor(
    private purchaseService: PurchaseInvoiceService,
    private messageService: MessageService,
    private translate: TranslateService,
    private fb: FormBuilder,
    private mainPurchaseClassService: MainPurchaseClassService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private companyDataService: CompanyDetailsService,
    public translationService: TranslationService,
    private storeDetailsService: StoreDetailsService
  ) {
    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,15}$/)]],
    });
    this.activeLanguage = this.translationService.getSelectedLanguage();
  }

  ngOnInit(): void {
    // All quotations are now frontal (can be converted)
    this.isFrontal = true;
    
    this.loadMainPurchaseClasses();
    this.loadStores();
    this.reload();
    
    // Initialize print columns with default (with prices)
    this.updatePrintColumns();
    
    // Load company details for printing
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        this.companyDetails = companyData[0];
      },
      error: (error) => {
        console.error('Error fetching company details:', error);
      },
    });
    
    // Subscribe to router events to reload data when navigating back from edit/view
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter((event: NavigationEnd) => event.url === '/purchase-invoices/request-quotation')
    ).subscribe(() => {
      console.log('Navigated back to request quotation list - reloading data');
      this.reload();
    });
  }
  
  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private loadMainPurchaseClasses(): void {
    this.mainPurchaseClassService.getAll().subscribe({
      next: (list) => {
        this.mainPurchaseClasses = list || [];
      },
      error: () => {
        this.mainPurchaseClasses = [];
      }
    });
  }

  private loadStores(): void {
    this.storeDetailsService.getAll().subscribe({
      next: (list) => {
        this.stores = list || [];
      },
      error: (err) => {
        console.error('Error loading stores:', err);
        this.stores = [];
      }
    });
  }

  // Row interaction methods
  onRowClick(event: Event, item: QuotationItemRow): void {
    // Navigate to view page instead of opening dialog
    this.router.navigate(['/purchase-invoices/request-quotation/view', item.requestId]);
    if (this.opItem) {
      this.opItem.hide();
    }
  }

  onRowRightClick(event: MouseEvent, item: QuotationItemRow): void {
    event.preventDefault();
    event.stopPropagation();
    
    const isVisible = this.opItem.overlayVisible;
    const isDifferent = this.selectedItem?.id !== item.id;
    this.selectedItem = item;

    if (isVisible && isDifferent) {
      this.opItem.show(event);
    } else {
      this.opItem.toggle(event);
    }

    setTimeout(() => {
      const panelEl = this.opItem.container as HTMLElement;
      if (!panelEl) return;

      // Get panel dimensions
      const panelRect = panelEl.getBoundingClientRect();
      const panelHeight = panelRect.height || 400; // Approximate if not rendered yet
      const panelWidth = panelRect.width || 250;
      
      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate position with viewport boundary checks
      let leftPos = event.clientX;
      let topPos = event.clientY;
      
      // Adjust horizontal position if would overflow right edge
      if (leftPos + panelWidth > viewportWidth) {
        leftPos = viewportWidth - panelWidth - 20; // 20px margin from edge
      }
      
      // Adjust vertical position if would overflow bottom (including taskbar area)
      // Leave 80px space at bottom for taskbar
      if (topPos + panelHeight > viewportHeight - 80) {
        topPos = viewportHeight - panelHeight - 80;
      }
      
      // Ensure it's not off the top edge
      if (topPos < 10) {
        topPos = 10;
      }
      
      // Ensure it's not off the left edge
      if (leftPos < 10) {
        leftPos = 10;
      }

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${leftPos}px`;
      panelEl.style.top = `${topPos}px`;
      panelEl.style.zIndex = '9999';
    }, 10);
  }

  onActionButtonClick(event: MouseEvent, item: QuotationItemRow): void {
    event.stopPropagation();
    
    const isVisible = this.opItem.overlayVisible;
    const isDifferent = this.selectedItem?.id !== item.id;
    this.selectedItem = item;

    if (isVisible && isDifferent) {
      this.opItem.show(event);
    } else {
      this.opItem.toggle(event);
    }

    setTimeout(() => {
      const panelEl = this.opItem.container as HTMLElement;
      if (!panelEl) return;

      // Get panel dimensions
      const panelRect = panelEl.getBoundingClientRect();
      const panelHeight = panelRect.height || 400; // Approximate if not rendered yet
      const panelWidth = panelRect.width || 250;
      
      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate position with viewport boundary checks
      let leftPos = event.clientX;
      let topPos = event.clientY;
      
      // Adjust horizontal position if would overflow right edge
      if (leftPos + panelWidth > viewportWidth) {
        leftPos = viewportWidth - panelWidth - 20; // 20px margin from edge
      }
      
      // Adjust vertical position if would overflow bottom (including taskbar area)
      // Leave 80px space at bottom for taskbar
      if (topPos + panelHeight > viewportHeight - 80) {
        topPos = viewportHeight - panelHeight - 80;
      }
      
      // Ensure it's not off the top edge
      if (topPos < 10) {
        topPos = 10;
      }
      
      // Ensure it's not off the left edge
      if (leftPos < 10) {
        leftPos = 10;
      }

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${leftPos}px`;
      panelEl.style.top = `${topPos}px`;
      panelEl.style.zIndex = '9999';
    }, 10);
  }

  // Filter and search methods
  filter(dt: Table, event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    dt.filterGlobal(value, 'contains');
  }

  clear(dt: Table): void {
    dt.clear();
    this.searchValue = '';
  }

  // Navigation methods
  navigateToAdd(): void {
    this.router.navigate(['/purchase-invoices/request-quotation/new']);
  }

  navigateToEdit(item: QuotationItemRow): void {
    this.router.navigate(['/purchase-invoices/request-quotation/edit', item.requestId]);
  }

  // Delete all selected items
  deleteAll(): void {
    if (this.selectedItems.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: this.translate.instant('REQUEST_QUOTATION.SELECT_ITEMS_TO_DELETE') || 'يرجى اختيار عناصر للحذف'
      });
      return;
    }
    this.showDeleteAllDialog = true;
  }

  // Share methods
  openShareDialog(item: QuotationItemRow): void {
    this.resetShareState();
    this.shareBulkMode = false;
    this.shareTarget = item;
    this.shareDialogVisible = true;
  }

  openBulkShareDialog(): void {
    const ids = (this.selectedItems || [])
      .map((x: any) => x?.requestId)
      .filter((x: any) => x != null);

    if (!ids.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: this.translate.instant('REQUEST_QUOTATION.SELECT_REQUESTS_TO_SHARE'),
      });
      return;
    }

    this.resetShareState();
    this.shareBulkMode = true;
    this.shareBulkIds = ids;
    this.shareDialogVisible = true;
  }

  closeShareDialog(): void {
    this.shareDialogVisible = false;
    this.resetShareState();
  }

  private resetShareState(): void {
    this.shareBusy = false;
    this.shareBulkMode = false;
    this.shareBulkIds = [];
    this.shareTarget = null;
    this.shareActiveTabIndex = 0;
    this.resetShareForm();
  }

  private resetShareForm(initial?: Partial<{ email: string; whatsappNumber: string }>): void {
    this.shareForm.reset({
      email: initial?.email ?? '',
      whatsappNumber: initial?.whatsappNumber ?? '',
    });
    this.shareForm.markAsPristine();
    this.shareForm.markAsUntouched();
    this.shareForm.updateValueAndValidity({ emitEvent: false });
    this.shareForm.enable({ emitEvent: false });
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

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    if (this.shareBulkMode) {
      this.purchaseService
        .shareRequestQuotationsByEmail(this.shareBulkIds, email)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.shareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
              detail: this.translate.instant('REQUEST_QUOTATION.EMAIL_SUCCESS_BULK'),
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
    } else {
      if (!this.shareTarget?.requestId) {
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
          detail: this.translate.instant('REQUEST_QUOTATION.NO_REQUEST_SELECTED'),
        });
        this.shareBusy = false;
        this.shareForm.enable({ emitEvent: false });
        return;
      }

      this.purchaseService
        .shareRequestQuotationByEmail(this.shareTarget.requestId, email)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.shareForm.enable({ emitEvent: false });
          })
        )
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
  }

  private normalizePhoneForApi(input: string): string {
    return String(input || '')
      .replace(/\s+/g, '')
      .replace(/^\+/, '');
  }

  private openWhatsAppLink(url: string): void {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch {
      window.location.href = url;
    }
  }

  private openMultipleWhatsAppLinks(urls: string[]): void {
    if (!Array.isArray(urls) || !urls.length) return;
    this.openWhatsAppLink(urls[0]);
    const rest = urls.slice(1);
    rest.forEach((u, i) =>
      setTimeout(() => this.openWhatsAppLink(u), (i + 1) * 400)
    );
  }

  private extractWhatsAppLinks(res: any): string[] {
    if (!res) return [];

    if (res?.response?.whatsAppLink) return [res.response.whatsAppLink];
    if (res?.whatsAppLink) return [res.whatsAppLink];

    const links: string[] = [];

    if (Array.isArray(res)) {
      res.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    const bags = [res?.responses, res?.items, res?.data].filter(Array.isArray);
    bags.forEach((arr: any[]) => {
      arr.forEach((item) => {
        const link = item?.response?.whatsAppLink || item?.whatsAppLink;
        if (link) links.push(link);
      });
    });

    if (res && typeof res === 'object' && !Array.isArray(res)) {
      Object.values(res).forEach((val: any) => {
        const link = val?.response?.whatsAppLink || val?.whatsAppLink;
        if (link) links.push(link);
      });
    }

    return Array.from(new Set(links.filter(Boolean)));
  }

  submitShareWhatsapp(): void {
    const ctrl = this.shareForm.get('whatsappNumber');
    const raw = ctrl?.value || '';
    const phone = this.normalizePhoneForApi(raw);

    if (!phone || ctrl?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING') || 'تحذير',
        detail: this.translate.instant('REQUEST_QUOTATION.PHONE_INVALID'),
      });
      return;
    }

    if (this.shareBulkMode && !this.shareBulkIds?.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: this.translate.instant('REQUEST_QUOTATION.SELECT_REQUESTS_TO_SHARE'),
      });
      return;
    }
    if (!this.shareBulkMode && !this.shareTarget?.requestId) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: this.translate.instant('REQUEST_QUOTATION.NO_REQUEST_SELECTED'),
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    if (this.shareBulkMode) {
      this.purchaseService
        .shareRequestQuotationsByWhatsapp(this.shareBulkIds, phone)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.shareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: (res: any) => {
            const links = this.extractWhatsAppLinks(res);
            if (links.length) {
              this.openMultipleWhatsAppLinks(links);
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('FINANCE.SUCCESS') || 'تم',
                detail: this.translate.instant('REQUEST_QUOTATION.WHATSAPP_SUCCESS_BULK'),
              });
              this.closeShareDialog();
              this.selectedItems = [];
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
    } else {
      this.purchaseService
        .shareRequestQuotationByWhatsapp(this.shareTarget!.requestId, phone)
        .pipe(
          finalize(() => {
            this.shareBusy = false;
            this.shareForm.enable({ emitEvent: false });
          })
        )
        .subscribe({
          next: (res: any) => {
            const links = this.extractWhatsAppLinks(res);
            if (links.length) {
              this.openWhatsAppLink(links[0]);
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
  }

  closeDeleteAllDialog(): void {
    if (!this.submitting) {
      this.showDeleteAllDialog = false;
    }
  }

  confirmDeleteAll(): void {
    if (this.selectedItems.length === 0) return;
    
    this.submitting = true;

    // Use the new deletePurchaseQuotation method for frontal quotations
    const deletePromises = this.selectedItems.map(item => {
      return this.purchaseService.deletePurchaseQuotation(item.requestId).toPromise();
    });

    Promise.all(deletePromises)
      .then(() => {
        this.showDeleteAllDialog = false;
        this.submitting = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: this.translate.instant('REQUEST_QUOTATION.DELETE_ALL_SUCCESS_SUMMARY'), 
          detail: this.translate.instant('REQUEST_QUOTATION.DELETE_ALL_SUCCESS_DETAIL')
        });
        this.selectedItems = [];
        this.reload();
      })
      .catch((err) => {
        console.error('Error deleting quotations:', err);
        this.showDeleteAllDialog = false;
        this.submitting = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('REQUEST_QUOTATION.DELETE_ALL_ERROR_SUMMARY'), 
          detail: this.translate.instant('REQUEST_QUOTATION.DELETE_ALL_ERROR_DETAIL')
        });
      });
  }

  // View dialog
  openViewDialog(row: QuotationItemRow): void {
    this.viewForm = { itemId: row.id, requestId: row.requestId, itemName: row.itemName, quantity: row.quantity, itemsCount: 0, mainPurchaseClassName: row.mainPurchaseClassName || row.itemName, unitPrice: null };
    this.viewLoading = true;
    this.showViewDialog = true;

    const numericId = parseInt(row.requestId, 10);
    
    if (isNaN(numericId)) {
      this.viewLoading = false;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('REQUEST_QUOTATION.INVALID_REQUEST_ID')
      });
      return;
    }

    // Use new PurchaseQuotation API
    this.purchaseService.getQuotationById(numericId).subscribe({
      next: (res: any) => {
        // Frontal API uses 'purchaseQuotationItems'
        const items = res.purchaseQuotationItems || res.items || [];
        const item = items.find((i: any) => i.id === row.id) as any;
        
        // Use mainPurchaseClass name if available, otherwise use itemName
        const className = this.mainPurchaseClasses.find(x=>x.id === (item?.mainPurchaseClassId ?? null))?.arabicName ?? (item?.itemName ?? row.itemName);
        this.viewForm = {
          itemId: row.id,
          requestId: row.requestId,
          itemName: item?.itemName ?? row.itemName,
          quantity: item?.quantity ?? row.quantity,
          itemsCount: items.length,
          mainPurchaseClassName: className,
          unitPrice: item?.price ?? null // Frontal API uses 'price' not 'unitPrice'
        };
        this.viewLoading = false;
      },
      error: () => {
        this.viewLoading = false;
      }
    });
  }

  closeViewDialog(): void {
    this.showViewDialog = false;
  }

  // Delete dialog
  openDeleteDialog(row: QuotationItemRow): void {
    this.deleteTarget = row;
    this.deleteError = null;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    if (!this.submitting) {
      this.showDeleteDialog = false;
      this.deleteTarget = null;
    }
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    this.submitting = true;
    this.deleteError = null;

    // Use the new deletePurchaseQuotation method for frontal quotations
    this.purchaseService.deletePurchaseQuotation(this.deleteTarget.requestId)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.showDeleteDialog = false;
          this.deleteTarget = null;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('REQUEST_QUOTATION.DELETE_SUCCESS_SUMMARY'),
            detail: this.translate.instant('REQUEST_QUOTATION.DELETE_SUCCESS_DETAIL')
          });
          this.reload();
        },
        error: (err) => {
          console.error(err);
          this.deleteError = 'حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.';
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('REQUEST_QUOTATION.DELETE_ERROR_SUMMARY'),
            detail: this.translate.instant('REQUEST_QUOTATION.DELETE_ERROR_DETAIL')
          });
        }
      });
  }

  reload(): void {
    this.loading = true;
    this.items = [];
    this.filteredItems = [];
    this.cdr.detectChanges();
    
    // Always load frontal quotations (new API)
    this.purchaseService.getFrontalQuotations().subscribe({
      next: (res: any) => {
        console.log('Frontal quotations response:', res);
        
        // Handle different response structures
        const quotations = Array.isArray(res) ? res : (res?.data || res?.items || res?.result || []);
        console.log('Parsed quotations:', quotations);
        
        const rows: QuotationItemRow[] = [];
        (quotations || [])
          .filter((req: any) => {
            // Filter out inactive quotations
            if (req.isActive === false) return false;
            
            // Filter out quotations with no items (deleted items)
            const itemsArray = req.purchaseQuotationItems || req.items || [];
            if (itemsArray.length === 0) return false;
            
            return true;
          })
          .forEach((req: any) => {
            // Frontal API uses 'purchaseQuotationItems', old API uses 'items'
            const itemsArray = req.purchaseQuotationItems || req.items || [];
            console.log('Items for quotation:', req.id, itemsArray);
            
            // Create ONE row per QUOTATION (not per item)
            // Show the first item's details, or summary info
            const firstItem = itemsArray[0] || {};
            const itemCount = itemsArray.length;
            const totalQuantity = itemsArray.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
            
            // Use mainPurchaseClass name from first item
            const className = this.mainPurchaseClasses.find(x => x.id === firstItem?.mainPurchaseClassId)?.arabicName 
                           || firstItem.mainPurchaseClass?.arabicName 
                           || firstItem.itemName 
                           || `${itemCount} items`;
            
            rows.push({
              id: req.id ?? crypto.randomUUID(),
              requestId: String(req.id) ?? '—',
              invoiceNo: req.invoiceNo || String(req.id), // Use invoiceNo from API
              itemName: firstItem.itemName || '',
              quantity: totalQuantity, // Show total quantity across all items
              mainPurchaseClassId: firstItem.mainPurchaseClassId || null,
              mainPurchaseClassName: className,
              status: req.status || 'Draft',
              purchaseInvoiceId: req.purchaseInvoiceId || null
            });
          });
        this.items = rows;
        this.filteredItems = [...rows];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Action handlers
  onView(item: QuotationItemRow | null): void {
    if (item) {
      // Navigate to view page instead of opening dialog
      this.router.navigate(['/purchase-invoices/request-quotation/view', item.requestId]);
      this.opItem.hide();
    }
  }

  onEdit(item: QuotationItemRow | null): void {
    if (item) {
      this.navigateToEdit(item);
      this.opItem.hide();
    }
  }

  onDelete(item: QuotationItemRow | null): void {
    if (item) {
      this.openDeleteDialog(item);
      this.opItem.hide();
    }
  }

  // Print methods
  onPrint(item: QuotationItemRow | null): void {
    if (item) {
      this.pendingPrintItem = item;
      this.pendingPrintMode = 'single';
      this.printOptionsDialogVisible = true;
      this.opItem.hide();
    }
  }

  onPrintConfirm(): void {
    this.printOptionsDialogVisible = false;
    
    // Update columns based on price option
    this.updatePrintColumns();
    
    if (this.pendingPrintMode === 'single' && this.pendingPrintItem) {
      this.printSingle(this.pendingPrintItem);
    } else if (this.pendingPrintMode === 'bulk') {
      this.printBulkExecute();
    }
    
    this.pendingPrintItem = null;
  }

  updatePrintColumns(): void {
    // Always include all columns (Class, Quantity, Price, Price Before Tax, Tax, Total)
    // When printing without prices, price fields will be empty for manual filling
    this.docColumns = [
      {
        field: 'mainPurchaseClassName',
        label: this.translate.instant('DATA.CLASS'),
        cellClass: 'text-center',
      },
      {
        field: 'quantity',
        label: this.translate.instant('REQUEST_QUOTATION.QUANTITY'),
        pipe: 'number',
        cellClass: 'text-center',
      },
      {
        field: 'unitPrice',
        label: this.translate.instant('DATA.UNIT_PRICE'),
        pipe: this.includePricesInPrint ? 'number' : '',
        cellClass: 'text-center',
      },
      {
        field: 'priceBeforeTax',
        label: this.translate.instant('REQUEST_QUOTATION.PRICE_BEFORE_TAX'),
        pipe: this.includePricesInPrint ? 'number' : '',
        cellClass: 'text-center',
      },
      {
        field: 'taxAmount',
        label: this.translate.instant('REQUEST_QUOTATION.TAX_AMOUNT'),
        pipe: this.includePricesInPrint ? 'number' : '',
        cellClass: 'text-center',
      },
      {
        field: 'totalPrice',
        label: this.translate.instant('REQUEST_QUOTATION.TOTAL_PRICE'),
        pipe: this.includePricesInPrint ? 'number' : '',
        cellClass: 'text-center',
      },
    ];
  }

  printSingle(item: QuotationItemRow): void {
    this.loading = true;
    this.printRequestId = item.requestId;
    
    const numericId = parseInt(item.requestId, 10);
    
    if (isNaN(numericId)) {
      this.loading = false;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('REQUEST_QUOTATION.INVALID_REQUEST_ID')
      });
      return;
    }
    
    // Fetch the full quotation data using new API
    this.purchaseService.getQuotationById(numericId).subscribe({
      next: (quotation: any) => {
        // Frontal API uses 'purchaseQuotationItems'
        const items = quotation.purchaseQuotationItems || quotation.items || [];
        
        // Map items to print format
        this.printData = items.map((it: any) => {
          // Use mainPurchaseClass name if available, otherwise use itemName
          const className = this.mainPurchaseClasses.find(x => x.id === (it?.mainPurchaseClassId ?? null))?.arabicName ?? it.itemName;
          
          // Calculate price fields if prices are included
          const quantity = it.quantity ?? 0;
          let unitPrice: string | number = '';
          let priceBeforeTax: string | number = '';
          let taxAmount: string | number = '';
          let totalPrice: string | number = '';
          
          if (this.includePricesInPrint) {
            const unitPriceNum = it.price ?? 0; // Frontal API uses 'price'
            const priceBeforeTaxNum = unitPriceNum * quantity;
            const taxRate = quotation.tax ? quotation.tax / 100 : 0.15; // Use quotation tax rate or default 15%
            const taxAmountNum = priceBeforeTaxNum * taxRate;
            const totalPriceNum = priceBeforeTaxNum + taxAmountNum;
            
            unitPrice = unitPriceNum;
            priceBeforeTax = priceBeforeTaxNum;
            taxAmount = taxAmountNum;
            totalPrice = totalPriceNum;
          }
          
          return {
            itemName: it.itemName,
            quantity: quantity,
            mainPurchaseClassName: className,
            unitPrice: unitPrice,
            priceBeforeTax: priceBeforeTax,
            taxAmount: taxAmount,
            totalPrice: totalPrice,
          };
        });
        
        this.currentDate = new Date();
        
        // Trigger print after data is loaded with longer timeout
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.printComponent && this.printData.length > 0 && this.docColumns.length > 0) {
            this.printComponent.triggerPrint();
          }
          this.loading = false;
          this.cdr.detectChanges();
        }, 500);
      },
      error: (err) => {
        console.error('Error loading quotation for printing:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
          detail: this.translate.instant('REQUEST_QUOTATION.PRINT_ERROR') || 'حدث خطأ أثناء الطباعة',
        });
        this.loading = false;
      }
    });
  }

  printBulk(): void {
    if (this.selectedItems.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant('FINANCE.INFO') || 'معلومة',
        detail: this.translate.instant('REQUEST_QUOTATION.SELECT_ITEMS_TO_PRINT') || 'يرجى اختيار عناصر للطباعة',
      });
      return;
    }

    this.pendingPrintMode = 'bulk';
    this.printOptionsDialogVisible = true;
  }

  printBulkExecute(): void {

    this.loading = true;
    
    // Get unique request IDs
    const uniqueRequestIds = Array.from(new Set(this.selectedItems.map(item => item.requestId)));
    
    if (uniqueRequestIds.length === 1) {
      // If all selected items are from the same request, print that request
      this.printRequestId = uniqueRequestIds[0];
      
      const numericId = parseInt(uniqueRequestIds[0], 10);
      
      if (isNaN(numericId)) {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('REQUEST_QUOTATION.INVALID_REQUEST_ID')
        });
        return;
      }
      
      this.purchaseService.getQuotationById(numericId).subscribe({
        next: (quotation: any) => {
          // Frontal API uses 'purchaseQuotationItems'
          const items = quotation.purchaseQuotationItems || quotation.items || [];
          
          this.printData = items.map((it: any) => {
            // Use mainPurchaseClass name if available, otherwise use itemName
            const className = this.mainPurchaseClasses.find(x => x.id === (it?.mainPurchaseClassId ?? null))?.arabicName ?? it.itemName;
            
            // Calculate price fields if prices are included
            const quantity = it.quantity ?? 0;
            let unitPrice: string | number = '';
            let priceBeforeTax: string | number = '';
            let taxAmount: string | number = '';
            let totalPrice: string | number = '';
            
            if (this.includePricesInPrint) {
              const unitPriceNum = it.price ?? 0; // Frontal API uses 'price'
              const priceBeforeTaxNum = unitPriceNum * quantity;
              const taxRate = quotation.tax ? quotation.tax / 100 : 0.15; // Use quotation tax rate or default 15%
              const taxAmountNum = priceBeforeTaxNum * taxRate;
              const totalPriceNum = priceBeforeTaxNum + taxAmountNum;
              
              unitPrice = unitPriceNum;
              priceBeforeTax = priceBeforeTaxNum;
              taxAmount = taxAmountNum;
              totalPrice = totalPriceNum;
            }
            
            return {
              itemName: it.itemName,
              quantity: quantity,
              mainPurchaseClassName: className,
              unitPrice: unitPrice,
              priceBeforeTax: priceBeforeTax,
              taxAmount: taxAmount,
              totalPrice: totalPrice,
            };
          });
          
          this.currentDate = new Date();
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.printComponent && this.printData.length > 0 && this.docColumns.length > 0) {
              this.printComponent.triggerPrint();
            }
            this.loading = false;
            this.cdr.detectChanges();
          }, 500);
        },
        error: (err) => {
          console.error('Error loading quotation for printing:', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR') || 'خطأ',
            detail: this.translate.instant('REQUEST_QUOTATION.PRINT_ERROR') || 'حدث خطأ أثناء الطباعة',
          });
          this.loading = false;
        }
      });
    } else {
      // Multiple requests selected - print all selected items
      this.printRequestId = this.translate.instant('REQUEST_QUOTATION.MULTIPLE_REQUESTS') || 'طلبات متعددة';
      
      // Map only the selected items - use mainPurchaseClassName from row data
      this.printData = this.selectedItems.map(item => {
        // For multiple requests, we don't have unitPrice data, so set to blank for manual filling
        const unitPrice = '';
        const priceBeforeTax = '';
        const taxAmount = '';
        const totalPrice = '';
        
        return {
          itemName: item.itemName,
          quantity: item.quantity,
          mainPurchaseClassName: item.mainPurchaseClassName || item.itemName,
          unitPrice: unitPrice,
          priceBeforeTax: priceBeforeTax,
          taxAmount: taxAmount,
          totalPrice: totalPrice,
        };
      });
      
      this.currentDate = new Date();
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.printComponent && this.printData.length > 0 && this.docColumns.length > 0) {
          this.printComponent.triggerPrint();
        }
        this.loading = false;
        this.cdr.detectChanges();
      }, 500);
    }
  }

  getTotalQuantity(): number {
    return this.printData.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  getTotalAmount(): number {
    if (!this.includePricesInPrint) return 0;
    return this.printData.reduce((total, item) => total + (item.priceBeforeTax || 0), 0);
  }

  getTotalTaxAmount(): number {
    if (!this.includePricesInPrint) return 0;
    return this.printData.reduce((total, item) => total + (item.taxAmount || 0), 0);
  }

  getTotalWithTax(): number {
    if (!this.includePricesInPrint) return 0;
    return this.printData.reduce((total, item) => total + (item.totalPrice || 0), 0);
  }

  // Convert to invoice methods
  onConvert(item: QuotationItemRow | null): void {
    if (item) {
      this.convertTarget = item;
      this.convertError = null;
      this.selectedStoreId = null;
      this.showConvertDialog = true;
      this.opItem.hide();
    }
  }

  closeConvertDialog(): void {
    if (!this.submitting) {
      this.showConvertDialog = false;
      this.convertTarget = null;
      this.convertError = null;
      this.selectedStoreId = null;
    }
  }

  confirmConvert(): void {
    if (!this.convertTarget || !this.selectedStoreId) return;

    this.submitting = true;
    this.convertError = null;

    const requestId = this.convertTarget.requestId;
    
    // For frontal quotations, requestId should be numeric
    const numericId = parseInt(requestId, 10);
    
    if (isNaN(numericId)) {
      this.convertError = this.translate.instant('REQUEST_QUOTATION.INVALID_REQUEST_ID') || 'رقم الطلب غير صالح';
      this.submitting = false;
      return;
    }

    // First fetch the quotation, then add item names from our loaded mainPurchaseClasses
    this.purchaseService.getQuotationById(numericId)
      .pipe(
        switchMap((quotation: any) => {
          // Add itemName to each item using mainPurchaseClasses
          if (quotation.items && Array.isArray(quotation.items)) {
            quotation.items = quotation.items.map((item: any) => {
              const mainClass = this.mainPurchaseClasses.find(x => x.id === item.mainPurchaseClassId);
              return {
                ...item,
                itemName: item.itemName || mainClass?.arabicName || mainClass?.englishName || 'Unknown Item'
              };
            });
          }
          
          // Now call convert with the enriched quotation data
          return this.purchaseService.convertPurchaseQuotationToInvoice(numericId, this.selectedStoreId, quotation);
        }),
        finalize(() => { this.submitting = false; })
      )
      .subscribe({
        next: (response) => {
          this.showConvertDialog = false;
          this.convertTarget = null;
          this.selectedStoreId = null;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('REQUEST_QUOTATION.CONVERT_SUCCESS_SUMMARY') || 'نجح',
            detail: this.translate.instant('REQUEST_QUOTATION.CONVERT_SUCCESS_DETAIL') || 'تم تحويل طلب الأسعار إلى فاتورة شراء بنجاح'
          });
          this.reload();
        },
        error: (err) => {
          console.error('Error converting quotation to invoice:', err);
          const errorMsg = err?.error?.message || err?.message || this.translate.instant('REQUEST_QUOTATION.CONVERT_ERROR_DETAIL');
          this.convertError = errorMsg;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('REQUEST_QUOTATION.CONVERT_ERROR_SUMMARY') || 'خطأ',
            detail: errorMsg
          });
        }
      });
  }
}
