import {AfterViewChecked, AfterViewInit, Component, ElementRef, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {InventoryPermitService} from "../../../../services/permits/inventory-permit.service"
import {AuthService} from "../../../../modules/auth";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../../modules/i18n";
import {InventoryPermitEntryService} from "../../../../services/permits/inventory-permit-entry.service";
import {ActivatedRoute, Router} from "@angular/router";
import {UserAccountModel} from "../../../../models/auth/userAccount.model";
import {PermissionModel} from "../../../../models/auth/permission.model";
import primengArTranslations from "../../../../utils/primengArTranslations";
import {MainAccountService} from "../../../../services/accounting/main-account.service";
import {InventoryPermitModel} from "../../../../models/permits/inventory-permit.model";
import {formatDateOnlyToString, parseDateOnly, getSystemNow} from "../../../../utils/dateUtils";
import {InventoryPermitEntryModel} from "../../../../models/permits/inventory-permit-entry.model";
import {
  InventoryPermitEntriesEditableTableComponent
} from "./inventory-permit-entries-editable-table/inventory-permit-entries-editable-table.component";
import {forkJoin, Observable} from "rxjs";
import {StoreDetailsService} from "../../../../services/inventory/store-details.service";
import {MainPurchaseClassService} from "../../../../services/purchase-classes-tree/main-purchase-class.service";
import {log} from "@angular-devkit/build-angular/src/builders/ssr-dev-server";
import {PrintDocumentComponent} from "../../../../shared-components/print-document/print-document.component";
import {CompanyDetailsModel} from "../../../../models/inventory/companyDetails.model";
import {CompanyDetailsService} from "../../../../services/inventory/company-details.service";
import {TransactionEntryModel} from "../../../../models/accounting/transactionEntry.model";
import {AttachmentModel} from "../../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {AttachmentService} from "../../../../services/attachments/attachment.service";
import {InventoryStocksService} from "../../../../services/reports/inventory-stocks.service";
import {InventoryStocksModel} from "../../../../models/reports/inventory-stocks/inventoryStocks.model";
import {RecipeService} from "../../../../services/recipes/recipe.service";
import { NavigationControls } from '../../../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { Subscription } from 'rxjs';
import { BarcodeFailedEvent, BarcodeResolvedEvent } from '../../../../_metronic/shared/barcode-input/barcode-input.component';
import { BarcodeService } from '../../../../services/barcode/barcode.service';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-inventory-permit',
  templateUrl: './inventory-permit.component.html',
  styleUrl: './inventory-permit.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class InventoryPermitComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild(InventoryPermitEntriesEditableTableComponent) inventoryPermitEntriesTable!: InventoryPermitEntriesEditableTableComponent;
  @ViewChild('permitBarcodeInputHost') permitBarcodeInputHost: ElementRef | undefined;

  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;
  
  // Navigation controls
  allInventoryPermitIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  
  private routeSubscription: Subscription;
  private childInitialized = false;
  private barcodeFocusScheduled = false;
  ngAfterViewChecked(): void {
    if (!this.loading && !this.barcodeFocusScheduled) {
      this.schedulePermitBarcodeInputFocus();
    }

    if (!this.childInitialized && this.inventoryPermitEntriesTable) {
      this.childInitialized = true; // Prevent multiple calls
      console.log('Child component is now initialized:', this.inventoryPermitEntriesTable);
      this.loadExitRecipeOperation();
    }
  }
  companyDetailsSignal = signal<CompanyDetailsModel>(null)
  get companyDetails(): CompanyDetailsModel {
    return this.companyDetailsSignal();
  }
  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  docColumnsSignal=signal<any[]>([])
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

  inventoryPermitIdSignal = signal<string | null>(null);
  inventoryPermitTypeSignal = signal<string | null>(null);

  isEditModeSignal = signal<boolean>(false);
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
  }

  get inventoryPermitId() {
    return this.inventoryPermitIdSignal();
  }
  set inventoryPermitId(value) {
    this.inventoryPermitIdSignal.set(value);
  }

  get inventoryPermitType() {
    return this.inventoryPermitTypeSignal();
  }
  set inventoryPermitType(value) {
    this.inventoryPermitTypeSignal.set(value);
  }
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }
  mainAccountsSignal = signal([]);
  get mainAccounts() {
    return this.mainAccountsSignal();
  }
  set mainAccounts(value) {
    this.mainAccountsSignal.set(value);
  }

  recipesSignal = signal([]);
  get recipes() {
    return this.recipesSignal();
  }
  set recipes(value) {
    this.recipesSignal.set(value);
  }
  recipeOptions = [];

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
  selectedRecipeIdSignal = signal(null);
  get selectedRecipeId() {
    return this.selectedRecipeIdSignal();
  }
  set selectedRecipeId(value) {
    this.selectedRecipeIdSignal.set(value);
  }
  selectedRecipeQuantitySignal = signal(1);
  get selectedRecipeQuantity() {
    return this.selectedRecipeQuantitySignal();
  }
  set selectedRecipeQuantity(value) {
    this.selectedRecipeQuantitySignal.set(value);
  }


  inventoryPermitFormGroup : FormGroup;
  mainAccountsOptions = [];
  mainPurchaseClassOptions = [];

  storeDetailsOptions = []
  inventoryPermitTypesOptions = [];
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
    private inventoryPermitService: InventoryPermitService,
    private mainAccountService: MainAccountService,
    private mainPurchaseClassService: MainPurchaseClassService,
    private storeDetailsService: StoreDetailsService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private inventoryPermitEntryService: InventoryPermitEntryService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private attachmentService: AttachmentService,
    private sanitizer: DomSanitizer,
    private inventoryStocksService: InventoryStocksService,
    private recipeService: RecipeService,
    private barcodeService: BarcodeService,
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
      { field: 'mainPurchaseClassName', label: this.translate.instant("DATA.CLASS"),},
      { field: 'measurementUnitName', label: this.translate.instant("DATA.MEASUREMENT_UNIT"), },
      { field: 'quantity', label: this.translate.instant("DATA.QUANTITY") , pipe: 'number'},
      { field: 'unitPrice', label: this.translate.instant("DATA.UNIT_PRICE"), pipe: 'number' },
      { field: 'totalAmount', label: this.translate.instant("FINANCE.TOTAL_AMOUNT") , pipe: 'number'},
    ];
  }

  // خيارات التذكير بتاريخ الصلاحية
  reminderFrequencyOptions: { label: string, value: string }[] = [];

  ngOnInit(): void {
    // تهيئة خيارات التذكير
    this.reminderFrequencyOptions = [
      { label: this.translateService.instant('FINANCE.REMINDER_DAILY'), value: 'Daily' },
      { label: this.translateService.instant('FINANCE.REMINDER_WEEKLY'), value: 'Weekly' },
      { label: this.translateService.instant('FINANCE.REMINDER_MONTHLY'), value: 'Monthly' },
      { label: this.translateService.instant('FINANCE.REMINDER_CUSTOM'), value: 'Custom' }
    ];

    this.loadData();
    this.loadStocks();
    this.inventoryPermitFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: ['', [Validators.maxLength(255)]],
      permitType: [null, Validators.required],
      permitDate: [getSystemNow(), Validators.required],
      mainAccountId:[null, Validators.required],
      storeDetailsId:[null, Validators.required],
      inventoryPermitEntries: [[], {validators: [this.inventoryPermitEntriesValidator()]}],
      transactionId:[null],
      // حقول التذكير بتاريخ الصلاحية
      reminderEnabled: [false],
      reminderFrequency: [null],
      customReminderDays: [7],
      // حقول التحويل للرواكد
      stagnantEnabled: [false],
      stagnantPeriodMonths: [3]
    })

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // Subscribe to route parameter changes for navigation and switching between entry / exit / edit modes
    this.routeSubscription = this.route.params.subscribe(params => {
      const newId = params['id'] || null;
      const newType = params['type'] || null;

      const idChanged = newId !== this.inventoryPermitId;
      const typeChanged = newType && newType !== this.inventoryPermitType;

      if (idChanged || typeChanged) {
        this.inventoryPermitId = newId;
        if (newType) {
          this.inventoryPermitType = newType;
        }
        this.isEditMode = !!newId;

        if (this.isEditMode && newId) {
          this.loadCompanyDetails();
          this.loadInventoryPermit(newId);
          this.loadAllInventoryPermitIds();
        } else if (!this.isEditMode && newType) {
          const typeFormatted = newType.charAt(0).toUpperCase() + newType.slice(1);
          if (this.inventoryPermitFormGroup) {
            this.resetFormForNewEntry();
            this.inventoryPermitFormGroup.get('permitType')?.setValue(typeFormatted);
          }
        }
      }
    });
  }

  // معالجة تغيير نوع التذكير
  onReminderFrequencyChange(event: any): void {
    if (event.value !== 'Custom') {
      this.inventoryPermitFormGroup.patchValue({ customReminderDays: null });
    } else {
      this.inventoryPermitFormGroup.patchValue({ customReminderDays: 7 });
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
  print(){
    window.print();
  }

  inventoryPermitEntriesValidator() : ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const inventoryPermitEntries = control.value;
      if (inventoryPermitEntries.length < 1) {
        return {'minLength': {'requiredLength': 1, 'actualLength': inventoryPermitEntries.length}};
      }
      return null;
    }
  }





  loadData(): void {
    this.loading = true;
    const inventoryPermitId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!inventoryPermitId;

    forkJoin({
    mainAccounts: this.mainAccountService.getAll(),
    storeDetails: this.storeDetailsService.getAll(),
    mainPurchaseClasses: this.mainPurchaseClassService.getAll(),
      recipes: this.recipeService.getAll()
    }).subscribe({
      next: ({  mainAccounts,storeDetails,mainPurchaseClasses,recipes }) => {
        this.recipeOptions = (recipes || []).map(recipe => ({
          label: this.activeLanguage === 'en'
            ? `${recipe.referenceNumber} | ${recipe.mainSalesClass.arabicName}`
            : `${recipe.referenceNumber} | ${recipe.mainSalesClass.arabicName}`,
          value: recipe.id
        }));
        this.recipes = recipes || [];
        this.mainAccounts = mainAccounts || [];
        this.mainAccountsOptions = (mainAccounts || []).map(mainAccount => ({
          label: this.activeLanguage === 'en'
            ? `${mainAccount.referenceCode} | ${mainAccount.englishName}`
            : `${mainAccount.referenceCode} | ${mainAccount.arabicName}`,
          value: mainAccount.id
        }));
        this.mainPurchaseClasses = mainPurchaseClasses || [];
        this.mainPurchaseClassOptions = (mainPurchaseClasses || []).map(mainPurchaseClass => ({
          label: this.activeLanguage === 'en'
            ? `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.englishName}`
            : `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.arabicName}`,
          value: mainPurchaseClass.id
        }));

        this.storeDetails = storeDetails || [];
        this.storeDetailsOptions = (storeDetails || []).map(storeDetail => ({
          label: this.activeLanguage === 'en'
            ? storeDetail.englishName
            : storeDetail.arabicName,
          value: storeDetail.id
        }));

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
  exitRecipeEntries: any[] = [];
  loadMode() {
    this.barcodeFocusScheduled = false;
    this.inventoryPermitId = this.route.snapshot.paramMap.get('id');
    this.inventoryPermitType = this.route.snapshot.paramMap.get('type');

    if (!this.inventoryPermitId && this.inventoryPermitType !== "entry" && this.inventoryPermitType !== "exit"){
      this.router.navigate(['/error/404'])
    }
    if (this.inventoryPermitType){
      const type= this.inventoryPermitType.charAt(0).toUpperCase() + this.inventoryPermitType.slice(1)
      this.inventoryPermitFormGroup.get('permitType').setValue(type)
    }
    this.isEditMode = !!this.inventoryPermitId;
    if (this.isEditMode) {
      this.loadCompanyDetails()
      this.loadInventoryPermit(this.inventoryPermitId);
      this.loadAllInventoryPermitIds(); // Load IDs for navigation
    }
  }
  loadInventoryPermit(id: string) {
    this.inventoryPermitService.getById(id).subscribe({
      next: inventoryPermit => {
        this.inventoryPermitType = inventoryPermit.permitType.toLowerCase();
        this.currentInventoryPermit = inventoryPermit
        this.docData = inventoryPermit.permitEntries.map((entry: InventoryPermitEntryModel) => ({
          ...entry,
          mainPurchaseClassName: this.activeLanguage == "en" ? entry.mainPurchaseClass.englishName:entry.mainPurchaseClass.arabicName,
          measurementUnitName: this.activeLanguage == "en" ? entry.mainPurchaseClass.measurementUnit.englishName:entry.mainPurchaseClass.measurementUnit.arabicName,
          totalAmount:entry.unitPrice*entry.quantity
        }))
        // Handle date properly for the calendar component
        let permitDate: Date;
        if (typeof inventoryPermit.permitDate === 'string') {
          permitDate = new Date(inventoryPermit.permitDate);
        } else {
          permitDate = new Date(inventoryPermit.permitDate);
        }
        
        this.inventoryPermitFormGroup.patchValue({
          ...inventoryPermit,
          permitDate: permitDate
        });
        this.inventoryPermitEntriesTable.patchValues(inventoryPermit.permitEntries);
      },
      error: error => {
        console.log('Error Loading InventoryPermit', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.PERMIT_LOADING_ERROR')
        })
      }
    })
  }

  stocksSignal = signal<InventoryStocksModel[]>([]);
  get stocks() {
    return this.stocksSignal();
  }
  set stocks(value) {
    this.stocksSignal.set(value);
  }
  loadStocks() {
    this.inventoryStocksService.getInventoryStocks().subscribe(stocks => {
      if (Array.isArray(stocks)) {
        this.stocks = stocks;
      }
    })
  }

  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  isSubmitted: boolean = false;
  
  saveInventoryPermit(isSaveAndContinue: boolean = false) {
    this.inventoryPermitEntriesTable.clearEmptyRows();
    this.isSubmitted = true;
    this.loading = true;
    const inventoryPermitEntries = this.inventoryPermitEntriesTable.getTableFormValue();
    this.inventoryPermitFormGroup.controls.inventoryPermitEntries.setValue(inventoryPermitEntries.map(x => ({
      ...x,
      inventoryPermitId: x.inventoryPermitId || this.inventoryPermitId || null
    })));

    const inventoryPermitValues = this.inventoryPermitFormGroup.value;
    const invalidRows = inventoryPermitValues.inventoryPermitEntries.filter(entry => entry.quantity < 1);
if (invalidRows.length > 0) {
  this.messageService.add({
    severity: 'error',
    summary: this.translate.instant('FINANCE.ERROR'),
    detail: this.translate.instant('DATA.QUANTITY_REQUIRED_OR_MORE_THAN_STOCK')
  });
  this.loading = false;
  return;
}
    if (this.inventoryPermitFormGroup.invalid) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.PERMITS_SAVING_ERROR') });
      this.loading = false;
      return;
    }
    // Access the rows value from the child component

    if (inventoryPermitValues.id) {
      const inventoryPermit = new InventoryPermitModel();
      inventoryPermit.id = inventoryPermitValues.id;
      inventoryPermit.referenceNumber = inventoryPermitValues.referenceNumber;
      inventoryPermit.description = inventoryPermitValues.description;
      inventoryPermit.permitType = inventoryPermitValues.permitType;
      inventoryPermit.permitDate = formatDateOnlyToString(inventoryPermitValues.permitDate);
      inventoryPermit.mainAccountId = inventoryPermitValues.mainAccountId;
      inventoryPermit.storeDetailsId = inventoryPermitValues.storeDetailsId;
      inventoryPermit.transactionId = inventoryPermitValues.transactionId

      inventoryPermit.permitEntries = inventoryPermitValues.inventoryPermitEntries.map((entry: any) => ({
        ...entry,
        expiryDate: entry.expiryDate ? formatDateOnlyToString(entry.expiryDate) : null
      }));

      this.inventoryPermitService.update(inventoryPermit).subscribe({
        next: res => {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.PERMIT_UPDATED') });
          
          if (isSaveAndContinue && !this.isEditMode) {
            // Reset form for new entry (loading will be set to false in resetFormForNewEntry)
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            this.router.navigate(['/permits/inventory-permits']);
          }
        },
        error: error => {
          console.log('Error Saving InventoryPermit', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.PERMITS_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }else{

      const inventoryPermit = new InventoryPermitModel();
      inventoryPermit.referenceNumber = inventoryPermitValues.referenceNumber;
      inventoryPermit.description = inventoryPermitValues.description;
      inventoryPermit.permitType = inventoryPermitValues.permitType;

      inventoryPermit.permitDate = formatDateOnlyToString(inventoryPermitValues.permitDate);
      inventoryPermit.mainAccountId = inventoryPermitValues.mainAccountId;
      inventoryPermit.storeDetailsId = inventoryPermitValues.storeDetailsId;
      inventoryPermit.permitEntries = inventoryPermitValues.inventoryPermitEntries.map((entry: any) => ({
        ...entry,
        expiryDate: entry.expiryDate ? formatDateOnlyToString(entry.expiryDate) : null
      }));
      inventoryPermit.transactionId = inventoryPermitValues.transactionId

      this.inventoryPermitService.create(inventoryPermit).subscribe({
        next: res => {
          console.log('InventoryPermit Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.PERMIT_CREATED') });
          
          if (isSaveAndContinue) {
            // Reset form for new entry (loading will be set to false in resetFormForNewEntry)
            this.resetFormForNewEntry();
          } else {
            // Navigate to list
            this.loading = false;
            this.router.navigate(['/permits/inventory-permits']);
          }
        },
        error: error => {
          console.log('Error Saving InventoryPermit', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.PERMITS_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }
  }




  addInventoryPermitEntry(inventoryPermitEntry: InventoryPermitEntryModel) {
    this.inventoryPermitFormGroup.controls.inventoryPermitEntries.setValue([...this.inventoryPermitFormGroup.controls.inventoryPermitEntries.value, inventoryPermitEntry]);
  }



  navigateToInventoryPermitsPage() {
    this.router.navigate(['/permits/inventory-permits']);
  }

  onDeleteClick(): void {
    if (!this.inventoryPermitId) return;
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_INVENTORY_PERMIT_DELETE', {
        referenceNumber: this.currentInventoryPermit?.referenceNumber || this.inventoryPermitId
      }),
      header: this.translate.instant('FINANCE.INVENTORY_PERMIT_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.loading = true;
        this.inventoryPermitService.delete(this.inventoryPermitId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'info',
              summary: this.translate.instant('FINANCE.CONFIRMED'),
              detail: this.translate.instant('FINANCE.INVENTORY_PERMIT_DELETED')
            });
            this.router.navigate(['/permits/inventory-permits']);
          },
          error: () => {
            this.loading = false;
          }
        });
      }
    });
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

  currentInventoryPermit: InventoryPermitModel = null;



  get attachments(): AttachmentModel[] {
    return this.currentInventoryPermit?.attachments || [];
  }
  loadAttachments() {
    this.loadMode();
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
    const permitId = this.route.snapshot.paramMap.get('id');
    if (!permitId) return;
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
      requestData.inventoryPermitId = permitId;
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
    const permitId = this.route.snapshot.paramMap.get('id');
    if (!permitId) return;
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
      requestData.inventoryPermitId = permitId;
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

  getTotalQuantity(): number {
    let totalQuantity = 0;
    if (this.inventoryPermitEntriesTable)
    {
      totalQuantity = this.inventoryPermitEntriesTable.getTableFormValue().reduce((acc, val) => acc + val.quantity, 0);
    }
    return totalQuantity;
  }

  getTotalPrice(): number {
    let totalPrice = 0;
    if (this.inventoryPermitEntriesTable)
    {
      totalPrice = this.inventoryPermitEntriesTable.getTableFormValue().reduce((acc, val) => acc + val.unitPrice * val.quantity, 0);
    }
    return totalPrice;
  }

  addRecipeEntry(){
    if (!this.selectedRecipeId || !this.selectedRecipeQuantity) {
      return;
    }
    const recipe = this.recipes.find(x => x.id === this.selectedRecipeId);
    if (!recipe) {
      return;
    }
    console.log(recipe)
    this.inventoryPermitEntriesTable.clearEmptyRows();
    const currentEntries = this.inventoryPermitEntriesTable.getTableFormValue();
    const newEntries = recipe.recipeEntries.map(x => new InventoryPermitEntryModel({
      mainPurchaseClassId: x.mainPurchaseClassId,
      quantity: this.selectedRecipeQuantity * x.quantity,
    }));
    this.inventoryPermitEntriesTable.patchValues(newEntries);
    this.inventoryPermitEntriesTable.refreshUnitPrice();
    this.selectedRecipeId = null;
    this.selectedRecipeQuantity = 1;
  }

  permitBarcodeScanHandler = (barcode: string): Observable<unknown> => {
    return this.barcodeService.getPermitProductByBarcode(barcode);
  };

  onPermitBarcodeResolved(event: BarcodeResolvedEvent): void {
    const product = event.result as {
      id?: string;
    };

    if (!product?.id) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('INVOICE.BARCODE_PRODUCT_INCOMPLETE')
      });
      return;
    }

    const existsInPurchaseClasses = this.mainPurchaseClasses.some((item) => item.id === product.id);
    if (!existsInPurchaseClasses) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('INVOICE.BARCODE_NOT_FOUND')
      });
      return;
    }

    const existingRow = this.findExistingPermitEntryRow(product.id);
    if (existingRow) {
      const currentQuantity = Number(existingRow.get('quantity')?.value) || 0;
      existingRow.get('quantity')?.setValue(currentQuantity + 1);
      return;
    }

    if (!this.inventoryPermitEntriesTable) {
      return;
    }

    this.inventoryPermitEntriesTable.clearEmptyRows();
    this.inventoryPermitEntriesTable.patchValues([
      new InventoryPermitEntryModel({
        mainPurchaseClassId: product.id,
        quantity: 1,
      })
    ]);
    this.inventoryPermitEntriesTable.refreshUnitPrice();
  }

  onPermitBarcodeFailed(event: BarcodeFailedEvent): void {
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

  private findExistingPermitEntryRow(productId: string): FormGroup | null {
    if (!this.inventoryPermitEntriesTable) {
      return null;
    }

    for (const row of this.inventoryPermitEntriesTable.rowGroups) {
      if (row.get('mainPurchaseClassId')?.value === productId) {
        return row;
      }
    }
    return null;
  }

  private schedulePermitBarcodeInputFocus(): void {
    if (this.isReadOnly) {
      return;
    }

    this.barcodeFocusScheduled = true;
    setTimeout(() => {
      const inputElement = this.permitBarcodeInputHost?.nativeElement?.querySelector('input');
      inputElement?.focus();
    }, 150);
  }

  loadExitRecipeOperation() {
    const exitRecipeId = this.route.snapshot.queryParamMap.get('exitRecipeId');
    if (exitRecipeId) {
      this.exitRecipeEntries = JSON.parse(localStorage.getItem(exitRecipeId));
      this.inventoryPermitEntriesTable.clearEmptyRows();
      const exitRecipeEntries = this.exitRecipeEntries;
      this.inventoryPermitEntriesTable.patchValues(exitRecipeEntries.map(x => new InventoryPermitEntryModel({
        mainPurchaseClassId: x.mainPurchaseClassId,
        quantity:x.quantity,
      })));
      this.inventoryPermitEntriesTable.refreshUnitPrice();
      localStorage.removeItem(exitRecipeId);
    }
  }

  // ============= Navigation Methods =============
  
  // Load all inventory permit IDs for navigation
  loadAllInventoryPermitIds(): void {
    this.inventoryPermitService.getAll().subscribe({
      next: (inventoryPermits) => {
        this.allInventoryPermitIds = inventoryPermits.map(permit => permit.id);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading inventory permit IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.inventoryPermitId || this.allInventoryPermitIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allInventoryPermitIds.indexOf(this.inventoryPermitId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allInventoryPermitIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
  }

  // Navigate to next inventory permit
  navigateToNext(): void {
    if (this.currentIndex < this.allInventoryPermitIds.length - 1) {
      const nextId = this.allInventoryPermitIds[this.currentIndex + 1];
      this.router.navigate(['/permits/inventory-permits', nextId]);
    }
  }

  // Navigate to previous inventory permit
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allInventoryPermitIds[this.currentIndex - 1];
      this.router.navigate(['/permits/inventory-permits', prevId]);
    }
  }

  // Reset form for creating a new entry (Save and Continue functionality)
  resetFormForNewEntry(): void {
    // Reset loading and submission states first
    this.loading = false;
    this.isSubmitted = false;
    
    // Reset form to initial state but preserve structure
    this.inventoryPermitFormGroup.reset({
      id: [null],
      referenceNumber: [''],
      description: [''],
      permitType: [this.inventoryPermitType?.charAt(0).toUpperCase() + this.inventoryPermitType?.slice(1)],
      permitDate: [getSystemNow()],
      mainAccountId: [null],
      storeDetailsId: [null],
      inventoryPermitEntries: [[]],
      transactionId: [null]
    });
    
    // Clear and reset the entries table safely
    if (this.inventoryPermitEntriesTable) {
      try {
        this.inventoryPermitEntriesTable.clearEmptyRows();
        this.inventoryPermitEntriesTable.patchValues([]);
      } catch (error) {
        console.log('Table reset error (safe to ignore):', error);
      }
    }
    
    // Reset current permit
    this.currentInventoryPermit = null;
    
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
