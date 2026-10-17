import {Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {InventoryStocktakingService} from "../../../services/inventory-stocktaking/inventory-stocktaking.service"
import {AuthService} from "../../../modules/auth";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {ActivatedRoute, Router} from "@angular/router";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import {PermissionModel} from "../../../models/auth/permission.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {MainAccountService} from "../../../services/accounting/main-account.service";
import {InventoryStocktakingModel} from "../../../models/inventory-stocktaking/inventoryStocktaking.model";
import {parseDateOnly, formatDateOnlyToString, getSystemNow} from "../../../utils/dateUtils";
import {StocktakingEntryModel} from "../../../models/inventory-stocktaking/stocktakingEntry.model";
import {forkJoin} from "rxjs";
import {StoreDetailsService} from "../../../services/inventory/store-details.service";
import {MainPurchaseClassService} from "../../../services/purchase-classes-tree/main-purchase-class.service";
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsModel} from "../../../models/inventory/companyDetails.model";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {InventoryStocksService} from "../../../services/reports/inventory-stocks.service";
import {InventoryStocksModel} from "../../../models/reports/inventory-stocks/inventoryStocks.model";
import {AttachmentModel} from "../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {AttachmentService} from "../../../services/attachments/attachment.service";
import { NavigationControls } from '../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Subscription } from 'rxjs';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-inventory-stocktaking',
  templateUrl: './inventory-stocktaking.component.html',
  styleUrl: './inventory-stocktaking.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class InventoryStocktakingComponent implements OnInit, OnDestroy {


  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  
  // Navigation controls
  allStocktakingIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  
  private routeSubscription: Subscription;
  storedItems: any[] = [];
  selectedInventoryStockSignal = signal<InventoryStocksModel>(null);
  get selectedInventoryStock() {
    return this.selectedInventoryStockSignal();
  }
  set selectedInventoryStock(value) {
    this.selectedInventoryStockSignal.set(value);
  }
  inventoryStocksSignal = signal<InventoryStocksModel[]>([]);
  get inventoryStocks() {
    return this.inventoryStocksSignal();
  }
  set inventoryStocks(value) {
    this.inventoryStocksSignal.set(value);
  }

  companyDetailsSignal = signal<CompanyDetailsModel>(null)
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal=signal<InventoryStocksModel[]>([])
  get docColumns(): any[] {
    return this.docColumnsSignal();
  }
  set docColumns(value: any[]) {
    this.docColumnsSignal.set(value);
  }

  docDataSignal=signal<any>(null)
  get docData(): any {
    return this.docDataSignal();
  }
  set docData(value: any) {
    this.docDataSignal.set(value);
  }

  printDocument() {
    this.printComponent.triggerPrint();
  }

  inventoryStocktakingIdSignal = signal<string | null>(null);
  inventoryStocktakingTypeSignal = signal<string | null>(null);

  isEditModeSignal = signal<boolean>(false);
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
  }

  get inventoryStocktakingId() {
    return this.inventoryStocktakingIdSignal();
  }
  set inventoryStocktakingId(value) {
    this.inventoryStocktakingIdSignal.set(value);
  }

  get inventoryStocktakingType() {
    return this.inventoryStocktakingTypeSignal();
  }
  set inventoryStocktakingType(value) {
    this.inventoryStocktakingTypeSignal.set(value);
  }
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }

  mainPurchaseClassesSignal = signal([]);
  get mainPurchaseClasses() {
    return this.mainPurchaseClassesSignal();
  }
  set mainPurchaseClasses(value) {
    this.mainPurchaseClassesSignal.set(value);
  }

  mainPurchaseClassSignal = signal([]);
  get mainPurchaseClass() {
    return this.mainPurchaseClassSignal();
  }
  set mainPurchaseClass(value) {
    this.mainPurchaseClassSignal.set(value);
  }

  storeDetailsSignal = signal([]);
  get storeDetails() {
    return this.storeDetailsSignal();
  }
  set storeDetails(value) {
    this.storeDetailsSignal.set(value);
  }


  inventoryStocktakingFormGroup : FormGroup;
  mainPurchaseClassOptions = [];

  storeDetailsOptions = []
  loadingSignal=signal(false)
  get loading(){
    return this.loadingSignal()
  }
  set loading(value){
    this.loadingSignal.set(value)
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  constructor(
    private companyDetailsService: CompanyDetailsService,
    private inventoryStocktakingService: InventoryStocktakingService,
    private mainPurchaseClassService: MainPurchaseClassService,
    private storeDetailsService: StoreDetailsService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private inventoryStocksService : InventoryStocksService,
    private sanitizer: DomSanitizer,
    private attachmentService: AttachmentService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.docColumns = [
      { field: 'mainPurchaseClassName', label: this.translate.instant("DATA.CLASS")},
      { field: 'reportedQuantity', label: this.translate.instant("DATA.REPORTED_QUANTITY"), pipe: 'number' },
      { field: 'actualQuantity', label: this.translate.instant("DATA.ACTUAL_QUANTITY") , pipe: 'number'},
      { field: 'difference', label: this.translate.instant("DATA.DIFFERENCE"), pipe: 'number' },
    ];
  }

  ngOnInit(): void {
    this.loadData();

    this.inventoryStocktakingFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      stocktakingDate: [getSystemNow(), Validators.required],
      storeDetailsId:[null, Validators.required],
      stocktakingEntries: [[], {validators: [this.stocktakingEntriesValidator()]}],
      transactionId:[null]
    })

    // storeDetailsId on change
    this.inventoryStocktakingFormGroup.controls.storeDetailsId.valueChanges.subscribe(value => {
      if (value) {
        const data = this.inventoryStocks.find(x => x.storeDetailsId === value);
        this.selectedInventoryStock = data;
        this.storedItems = data.storedItems.map(x => ({...x, actualQuantity: 0}));
      }
    });

    // description on change
    this.inventoryStocktakingFormGroup.controls.description.valueChanges.subscribe(value => {
      this.descriptionLength = value ? value.length : 0;
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // Subscribe to route parameter changes for navigation
    this.routeSubscription = this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId && newId !== this.inventoryStocktakingId) {
        this.inventoryStocktakingId = newId;
        this.loadInventoryStocktaking(newId);
        this.updateNavigationControls();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
  print(){
    window.print();
  }

  stocktakingEntriesValidator() : ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const stocktakingEntries = control.value;
      if (stocktakingEntries.length < 1) {
        return {'minLength': {'requiredLength': 1, 'actualLength': stocktakingEntries.length}};
      }
      return null;
    }
  }





  loadData(): void {
    this.loading = true;
    const inventoryStocktakingId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!inventoryStocktakingId;

    forkJoin({
    storeDetails: this.storeDetailsService.getAll(),
    mainPurchaseClasses: this.mainPurchaseClassService.getAll(),
    inventoryStocks: this.inventoryStocksService.getInventoryStocks()
    }).subscribe({
      next: ({  storeDetails,mainPurchaseClasses,inventoryStocks }) => {
        this.mainPurchaseClasses = mainPurchaseClasses;
        this.mainPurchaseClassOptions = mainPurchaseClasses.map(mainPurchaseClass => ({
          label: this.activeLanguage === 'en'
            ? `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.englishName}`
            : `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.arabicName}`,
          value: mainPurchaseClass.id
        }));

        this.storeDetails = storeDetails;
        this.storeDetailsOptions = storeDetails.map(storeDetail => ({
          label: this.activeLanguage === 'en'
            ? storeDetail.englishName
            : storeDetail.arabicName,
          value: storeDetail.id
        }));

        this.inventoryStocks = inventoryStocks;
        // Handle transaction (if in edit mode)
        this.loadMode()
        console.log('All data loaded successfully.');
      },
      error: (err) => {
        console.error('Error loading data', err);
        this.loading = false
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
      },
      complete:()=> {
        this.loading = false
      }
    });
  }

  loadMode() {
    this.inventoryStocktakingId = this.route.snapshot.paramMap.get('id');

    this.isEditMode = !!this.inventoryStocktakingId;
    if (this.isEditMode) {
      this.loadCompanyDetails()
      this.loadInventoryStocktaking(this.inventoryStocktakingId);
      this.loadAllStocktakingIds(); // Load IDs for navigation
    }
  }
  loadInventoryStocktaking(id: string) {
    this.inventoryStocktakingService.getById(id).subscribe({
      next: inventoryStocktaking => {
        this.currentInventoryStocktaking = inventoryStocktaking
        this.docData = inventoryStocktaking.stocktakingEntries.map((entry: StocktakingEntryModel) => ({
          ...entry,
          mainPurchaseClassName: this.activeLanguage == "en" ? entry.mainPurchaseClass.englishName:entry.mainPurchaseClass.arabicName,
          difference: entry.actualQuantity - entry.reportedQuantity
        }))
        
        const stocktakingDate = typeof inventoryStocktaking.stocktakingDate === 'string' 
          ? new Date(inventoryStocktaking.stocktakingDate)
          : inventoryStocktaking.stocktakingDate;
        
        this.inventoryStocktakingFormGroup.patchValue({
          ...inventoryStocktaking,
          stocktakingDate: stocktakingDate
        });
        
        this.storedItems = inventoryStocktaking.stocktakingEntries.map(x => ({
          ...x,
          mainPurchaseClassId: x.mainPurchaseClass.id,
          mainPurchaseClassEnglishName: x.mainPurchaseClass.englishName,
          mainPurchaseClassArabicName: x.mainPurchaseClass.arabicName,
          quantity: x.reportedQuantity,
          actualQuantity: x.actualQuantity
        }));
      },
      error: error => {
        console.log('Error Loading InventoryStocktaking', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.STOCKTAKING_LOADING_ERROR')
        })
      }
    })
  }


  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  isSubmitted: boolean = false;
  
  saveInventoryStocktaking(isSaveAndContinue: boolean = false) {
    this.isSubmitted = true;
    this.loading = true;
    const stocktakingEntries = this.storedItems.map(x => {
      const item = new StocktakingEntryModel();
      item.mainPurchaseClassId = x.mainPurchaseClassId;
      item.reportedQuantity = x.quantity;
      item.actualQuantity = x.actualQuantity;
      return item;
    })
    this.inventoryStocktakingFormGroup.controls.stocktakingEntries.setValue(stocktakingEntries.map(x => ({
      ...x,
      inventoryStocktakingId: x.inventoryStocktakingId || this.inventoryStocktakingId || null
    })));

    if (this.storedItems.some(x => {
      return x.actualQuantity == 0 && x.quantity > 0;
    })) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.MUST_ENTER_ALL_ACTUAL_QUANTITIES') });
      this.loading = false;
      return;
    }

    const inventoryStocktakingValues = this.inventoryStocktakingFormGroup.value;

    console.log('inventoryStocktakingValues', inventoryStocktakingValues);
    if (this.inventoryStocktakingFormGroup.invalid) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.STOCKTAKINGS_SAVING_ERROR') });
      this.loading = false;
      return;
    }



    if (inventoryStocktakingValues.id) {
      const inventoryStocktaking = new InventoryStocktakingModel();
      inventoryStocktaking.id = inventoryStocktakingValues.id;
      inventoryStocktaking.referenceNumber = inventoryStocktakingValues.referenceNumber;
      inventoryStocktaking.description = inventoryStocktakingValues.description;
      inventoryStocktaking.stocktakingDate = typeof inventoryStocktakingValues.stocktakingDate === 'string'
                                        ? formatDateOnlyToString(parseDateOnly(inventoryStocktakingValues.stocktakingDate))
                                        : formatDateOnlyToString(inventoryStocktakingValues.stocktakingDate);
      inventoryStocktaking.storeDetailsId = inventoryStocktakingValues.storeDetailsId;
      inventoryStocktaking.transactionId = inventoryStocktakingValues.transactionId

      inventoryStocktaking.stocktakingEntries = inventoryStocktakingValues.stocktakingEntries

      this.inventoryStocktakingService.update(inventoryStocktaking).subscribe({
        next: res => {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.STOCKTAKING_UPDATED') });
          
          if (isSaveAndContinue && !this.isEditMode) {
            // Reset form for new entry
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            this.router.navigate(['/inventory-stocktaking']);
          }
        },
        error: error => {
          console.log('Error Saving InventoryStocktaking', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.STOCKTAKINGS_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }else{

      const inventoryStocktaking = new InventoryStocktakingModel();
      inventoryStocktaking.referenceNumber = inventoryStocktakingValues.referenceNumber;
      inventoryStocktaking.description = inventoryStocktakingValues.description;

      inventoryStocktaking.stocktakingDate = typeof inventoryStocktakingValues.stocktakingDate === 'string'
        ? formatDateOnlyToString(parseDateOnly(inventoryStocktakingValues.stocktakingDate))
        : formatDateOnlyToString(inventoryStocktakingValues.stocktakingDate);
      inventoryStocktaking.storeDetailsId = inventoryStocktakingValues.storeDetailsId;
      inventoryStocktaking.stocktakingEntries = inventoryStocktakingValues.stocktakingEntries;
      inventoryStocktaking.transactionId = inventoryStocktakingValues.transactionId
      inventoryStocktaking.stocktakingEntries = inventoryStocktakingValues.stocktakingEntries
      this.inventoryStocktakingService.create(inventoryStocktaking).subscribe({
        next: res => {
          console.log('InventoryStocktaking Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.STOCKTAKING_CREATED') });
          
          if (isSaveAndContinue) {
            // Reset form for new entry
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            this.router.navigate(['/inventory-stocktaking']);
          }
        },
        error: error => {
          console.log('Error Saving InventoryStocktaking', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.STOCKTAKINGS_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }
  }




  addInventoryStocktakingEntry(stocktakingEntry: StocktakingEntryModel) {
    this.inventoryStocktakingFormGroup.controls.stocktakingEntries.setValue([...this.inventoryStocktakingFormGroup.controls.stocktakingEntries.value, stocktakingEntry]);
  }



  navigateToInventoryStocktakingsPage() {
    this.router.navigate(['/inventory-stocktaking']);
  }
  loadCompanyDetails() {
    this.companyDetailsService.getAll().subscribe(
      {
        next: (value) => {
          this.companyDetails = value[0];
        },
        error(err) {
          console.error('Error loading Company details', err);
        },
      }
    );
  }

  currentInventoryStocktaking: InventoryStocktakingModel = null;

  descriptionMaxLength = 255;
  descriptionLengthSignal = signal(0);
  get descriptionLength() {
    return this.descriptionLengthSignal();
  }
  set descriptionLength(value) {
    this.descriptionLengthSignal.set(value);
  }

  get attachments(): AttachmentModel[] {
    return this.currentInventoryStocktaking?.attachments || [];
  }
  loadAttachments() {
    this.loadMode()
  }



  deleteAttachment(attachmentId: string) {
    this.loading = true;
    this.attachmentService.delete(attachmentId).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.ATTACHMENT_DELETED') });
      this.loadAttachments();
    });
  }

  viewDialogSignal = signal(false);
  get viewDialog() {
    return this.viewDialogSignal();
  }
  set viewDialog(value) {
    this.viewDialogSignal.set(value);
  }
  currentPdfUrlSignal = signal<SafeResourceUrl>(null);
  get currentPdfUrl() {
    return this.currentPdfUrlSignal();
  }
  set currentPdfUrl(value) {
    this.currentPdfUrlSignal.set(value);
  }


  onView(pdf: AttachmentModel) {
    this.attachmentService.downloadAttachment(pdf.id).subscribe(res => {
      // Decode the Base64 string into a binary array
      const byteCharacters = atob(res.fileData); // Decode Base64 to binary string
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i); // Get char codes
      }
      const byteArray = new Uint8Array(byteNumbers); // Convert to Uint8Array

      // Create a Blob from the byte array
      const blob = new Blob([byteArray], { type: pdf.fileType });
      const blobUrl = URL.createObjectURL(blob); // Create object URL
      this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl); // Sanitize URL

      this.viewDialog = true; // Open the dialog to view the PDF
    });
  }

  onUpdate(event: any,pdf: AttachmentModel) {
    const inventoryStocktakingId = this.inventoryStocktakingId
    if (!inventoryStocktakingId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.inventoryStocktakingId = inventoryStocktakingId;
      requestData.id = pdf.id;
      this.attachmentService.update(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.viewDialog = false;
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file)
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }
  onDelete(pdf: AttachmentModel) {
    this.attachmentService.delete(pdf.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File deleted successfully.',
        });
        this.loadAttachments();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete file.',
        });
      },
    });
  }
  onFileSelected(event: any) {
    const inventoryStocktakingId = this.inventoryStocktakingId;
    if (!inventoryStocktakingId) return;
    const file = event.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'نوع الملف غير مدعوم',
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const requestData = new AttachmentModel();
      requestData.file = base64File.split(',')[1];
      requestData.fileName = file.name;
      requestData.fileType = file.type;
      requestData.inventoryStocktakingId = inventoryStocktakingId;
      this.attachmentService.create(requestData).subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File uploaded successfully.',
          });
          this.loadAttachments();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload file.',
          });
        },
      });
    };
    reader.readAsDataURL(file); // Convert file to base64
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
    };
  }

  // ============= Navigation Methods =============
  
  // Load all inventory stocktaking IDs for navigation
  loadAllStocktakingIds(): void {
    this.inventoryStocktakingService.getAll().subscribe({
      next: (stocktakings) => {
        this.allStocktakingIds = stocktakings.map(stocktaking => stocktaking.id);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading stocktaking IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.inventoryStocktakingId || this.allStocktakingIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allStocktakingIds.indexOf(this.inventoryStocktakingId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allStocktakingIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
  }

  // Navigate to next inventory stocktaking
  navigateToNext(): void {
    if (this.currentIndex < this.allStocktakingIds.length - 1) {
      const nextId = this.allStocktakingIds[this.currentIndex + 1];
      this.router.navigate(['/inventory-stocktaking', nextId]);
    }
  }

  // Navigate to previous inventory stocktaking
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allStocktakingIds[this.currentIndex - 1];
      this.router.navigate(['/inventory-stocktaking', prevId]);
    }
  }

  // Reset form for creating a new entry (Save and Continue functionality)
  resetFormForNewEntry(): void {
    // Reset loading and submission states first
    this.loading = false;
    this.isSubmitted = false;
    
    // Reset form to initial state but preserve structure
    this.inventoryStocktakingFormGroup.reset({
      id: [null],
      referenceNumber: [''],
      description: [''],
      stocktakingDate: [getSystemNow()],
      storeDetailsId: [null],
      stocktakingEntries: [[]],
      transactionId: [null]
    });
    
    // Clear stored items and selected inventory stock
    this.storedItems = [];
    this.selectedInventoryStock = null;
    this.descriptionLength = 0;
    
    // Reset current stocktaking
    this.currentInventoryStocktaking = null;
    
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
