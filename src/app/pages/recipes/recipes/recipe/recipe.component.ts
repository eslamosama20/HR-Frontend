import {Component, LOCALE_ID, OnInit, signal, ViewChild, ChangeDetectorRef} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {RecipeService} from "../../../../services/recipes/recipe.service"
import {AuthService} from "../../../../modules/auth";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../../modules/i18n";
import {RecipeEntryService} from "../../../../services/recipes/recipe-entry.service";
import {ActivatedRoute, Router} from "@angular/router";
import {UserAccountModel} from "../../../../models/auth/userAccount.model";
import {PermissionModel} from "../../../../models/auth/permission.model";
import primengArTranslations from "../../../../utils/primengArTranslations";
import {MainAccountService} from "../../../../services/accounting/main-account.service";
import {RecipeModel} from "../../../../models/recipes/recipe.model";
import {parseDateOnly, formatDateOnlyToString} from "../../../../utils/dateUtils";
import {RecipeEntryModel} from "../../../../models/recipes/recipe-entry.model";
import {
  RecipeEntriesEditableTableComponent
} from "./recipe-entries-editable-table/recipe-entries-editable-table.component";
import {forkJoin} from "rxjs";
import {MainPurchaseClassService} from "../../../../services/purchase-classes-tree/main-purchase-class.service";
import {PrintDocumentComponent} from "../../../../shared-components/print-document/print-document.component";
import {CompanyDetailsModel} from "../../../../models/inventory/companyDetails.model";
import {CompanyDetailsService} from "../../../../services/inventory/company-details.service";
import {TransactionEntryModel} from "../../../../models/accounting/transactionEntry.model";
import {MainSalesClassService} from "../../../../services/sales-classes-tree/main-sales-class.service";
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../../shared-components/detail-actions-menu/detail-actions-menu.component';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.component.html',
  styleUrl: './recipe.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class RecipeComponent implements OnInit{

  @ViewChild('recipeEntriesTable', { static: false }) recipeEntriesTable!: RecipeEntriesEditableTableComponent;
  @ViewChild('exitRecipeEntriesTable', { static: false }) exitRecipeEntriesTable!: RecipeEntriesEditableTableComponent;

  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

  // Navigation controls for actions menu
  allRecipeIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  customButtons: ActionButton[] = [];
  currentRecipe: RecipeModel = null;

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

  recipeIdSignal = signal<string | null>(null);

  isEditModeSignal = signal<boolean>(false);
  isReadOnlySignal = signal<boolean>(false);
  get isReadOnly() {
    return this.isReadOnlySignal();
  }
  set isReadOnly(value) {
    this.isReadOnlySignal.set(value);
  }

  get recipeId() {
    return this.recipeIdSignal();
  }
  set recipeId(value) {
    this.recipeIdSignal.set(value);
  }
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }
  mainSalesClassesSignal = signal([]);
  get mainSalesClasses() {
    return this.mainSalesClassesSignal();
  }
  set mainSalesClasses(value) {
    this.mainSalesClassesSignal.set(value);
  }

  mainPurchaseClassesSignal = signal([]);
  get mainPurchaseClasses() {
    return this.mainPurchaseClassesSignal();
  }
  set mainPurchaseClasses(value) {
    this.mainPurchaseClassesSignal.set(value);
  }



  recipeFormGroup : FormGroup;
  exitRecipeFormGroup: FormGroup;
  mainSalesClassesOptions = [];
  mainPurchaseClassOptions = [];

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
    private recipeService: RecipeService,
    private mainPurchaseClassService: MainPurchaseClassService,
    private mainSalesClassService: MainSalesClassService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private recipeEntryService: RecipeEntryService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
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
      { field: 'quantity', label: this.translate.instant("DATA.ALL_PERSONS_QUANTITY"), pipe: 'number' },
      { field: 'quantityPerPerson', label: this.translate.instant("DATA.QUANTITY_PER_PERSON"), pipe: 'number' },
      { field: 'lastPrice', label: this.translate.instant("DATA.LAST_PRICE"), pipe: 'number' },
      { field: 'totalAmount', label: this.translate.instant("FINANCE.TOTAL_AMOUNT") , pipe: 'number'},
      { field: 'amountPerPerson', label: this.translate.instant("FINANCE.AMOUNT_PER_PERSON") , pipe: 'number'}
    ];
  }

  ngOnInit(): void {
    this.loadData();

    this.recipeFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      numberOfPersons: [1, Validators.required],
      mainSalesClassId: [null, Validators.required],
      recipeEntries: [[], {validators: [this.recipeEntriesValidator()]}],
    })
    this.exitRecipeFormGroup = this.fb.group({
      numberOfPersons: [1, Validators.required],
      recipeEntries: [[], {validators: [this.recipeEntriesValidator()]}],
    })

    this.recipeFormGroup.controls.numberOfPersons.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });

    this.exitRecipeFormGroup.controls.numberOfPersons.valueChanges.subscribe(value => {
      this.loadExitRecipeOperation();
      this.cdr.detectChanges();
    })

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
    
    // Subscribe to route parameter changes to handle navigation
    this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId && newId !== this.recipeId) {
        this.recipeId = newId;
        this.isEditMode = true;
        this.loadRecipe(newId);
        this.loadAllRecipeIds();
      }
    });
  }

  onRecipeEntriesChanged(entries: RecipeEntryModel[]) {
    this.recipeFormGroup.controls.recipeEntries.setValue(entries, { emitEvent: false });
    this.cdr.detectChanges();
  }

  onExitRecipeEntriesChanged(entries: RecipeEntryModel[]) {
    this.exitRecipeFormGroup.controls.recipeEntries.setValue(entries, { emitEvent: false });
    this.cdr.detectChanges();
  }

  recipeEntriesValidator() : ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const recipeEntries = control.value;
      if (recipeEntries.length < 1) {
        return {'minLength': {'requiredLength': 1, 'actualLength': recipeEntries.length}};
      }
      return null;
    }
  }

  loadData(): void {
    this.loading = true;
    const recipeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!recipeId;

    forkJoin({
      mainSalesClasses: this.mainSalesClassService.getAll(),
      mainPurchaseClasses: this.mainPurchaseClassService.getAll()
    }).subscribe({
      next: ({  mainSalesClasses,mainPurchaseClasses }) => {
        this.mainSalesClasses = mainSalesClasses;
        this.mainSalesClassesOptions = mainSalesClasses.map(mainSalesClass => ({
          label: this.activeLanguage === 'en'
            ? `${mainSalesClass.referenceCode} | ${mainSalesClass.englishName}`
            : `${mainSalesClass.referenceCode} | ${mainSalesClass.arabicName}`,
          value: mainSalesClass.id
        }));
        this.mainPurchaseClasses = mainPurchaseClasses;
        this.mainPurchaseClassOptions = mainPurchaseClasses.map(mainPurchaseClass => ({
          label: this.activeLanguage === 'en'
            ? `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.englishName}`
            : `${mainPurchaseClass.referenceCode} | ${mainPurchaseClass.arabicName}`,
          value: mainPurchaseClass.id
        }));
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
    this.recipeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.recipeId;
    if (this.isEditMode) {
      this.loadCompanyDetails()
      this.loadRecipe(this.recipeId);
      this.loadAllRecipeIds(); // Load IDs for navigation
    }
  }
  loadRecipe(id: string) {
    this.recipeService.getById(id).subscribe({
      next: recipe => {
        this.currentRecipe = recipe
        recipe.mainSalesClassName = this.activeLanguage == "en" ? `${recipe.mainSalesClass.englishName} | ${recipe.mainSalesClass.referenceCode}` : `${recipe.mainSalesClass.arabicName} | ${recipe.mainSalesClass.referenceCode}`;
        this.recipeFormGroup.patchValue(recipe);
        this.docData = recipe.recipeEntries.map((entry: RecipeEntryModel) => ({
          ...entry,
          mainPurchaseClassName: this.activeLanguage == "en" ? entry.mainPurchaseClass.englishName:entry.mainPurchaseClass.arabicName,
          totalAmount:entry.quantity * this.mainPurchaseClasses.find(m => m.id === entry.mainPurchaseClassId)?.lastPrice,
          lastPrice:this.mainPurchaseClasses.find(m => m.id === entry.mainPurchaseClassId)?.lastPrice,
          amountPerPerson: entry.quantity / this.recipeFormGroup.controls.numberOfPersons.value * this.mainPurchaseClasses.find(m => m.id === entry.mainPurchaseClassId)?.lastPrice,
          quantityPerPerson: entry.quantity / this.recipeFormGroup.controls.numberOfPersons.value,
        }))

        this.recipeEntriesTable.patchValues(recipe.recipeEntries);
        
        // Setup custom buttons and navigation after loading
        this.setupCustomButtons();
        this.updateNavigationControls();
      },
      error: error => {
        console.log('Error Loading Recipe', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('DATA.RECIPE_LOADING_ERROR')
        })
      }
    })
  }


  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  // Check if form is valid including recipe entries from child component
  get isFormValid(): boolean {
    if (!this.recipeFormGroup) {
      return false;
    }
    
    // Update recipe entries from child component before validation
    if (this.recipeEntriesTable) {
      const recipeEntries = this.recipeEntriesTable.getTableFormValue();
      this.recipeFormGroup.controls.recipeEntries.setValue(recipeEntries);
    }
    
    return this.recipeFormGroup.valid;
  }

  isSubmitted: boolean = false;
  saveRecipe() {
    this.recipeEntriesTable.clearEmptyRows();
    this.isSubmitted = true;
    this.loading = true;
    const recipeEntries = (this.recipeEntriesTable.getTableFormValue() || []).filter(x => !!x.mainPurchaseClassId);
    this.recipeFormGroup.controls.recipeEntries.setValue(recipeEntries.map(x => ({
      ...x,
      recipeId: x.recipeId || this.recipeId || null
    })));

    const recipeValues = this.recipeFormGroup.value;
    if (this.recipeFormGroup.invalid) {
      this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.RECIPE_SAVING_ERROR') });
      this.loading = false;
      return;
    }
    // Access the rows value from the child component

    if (recipeValues.id) {
      const recipe = new RecipeModel();
      recipe.id = recipeValues.id;
      recipe.referenceNumber = recipeValues.referenceNumber;
      recipe.description = recipeValues.description;
      recipe.numberOfPersons = recipeValues.numberOfPersons;
      recipe.mainSalesClassId = recipeValues.mainSalesClassId;

      recipe.recipeEntries = recipeValues.recipeEntries

      this.recipeService.update(recipe).subscribe({
        next: res => {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('DATA.RECIPE_UPDATED') });
          this.router.navigate(['/recipes/']);
        },
        error: error => {
          console.log('Error Saving Recipe', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.RECIPE_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }else{

      const recipe = new RecipeModel();
      recipe.referenceNumber = recipeValues.referenceNumber;
      recipe.description = recipeValues.description;
      recipe.numberOfPersons = recipeValues.numberOfPersons;
      recipe.mainSalesClassId = recipeValues.mainSalesClassId;

      recipe.recipeEntries = recipeValues.recipeEntries;

      this.recipeService.create(recipe).subscribe({
        next: res => {
          console.log('Recipe Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('DATA.RECIPE_CREATED') });
          this.router.navigate(['/recipes/']);
        },
        error: error => {
          console.log('Error Saving Recipe', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('DATA.RECIPE_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }
  }



  navigateToRecipesPage() {
    this.router.navigate(['/recipes/']);
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

  getRecipeTotal() {
    if (!this.recipeEntriesTable) {
      return 0;
    }
    const recipeEntries = this.recipeEntriesTable.getTableFormValue();
    return recipeEntries.reduce((acc, val) => acc + val.quantity *
      (this.mainPurchaseClasses.find(m => m.id === val.mainPurchaseClassId)?.lastPrice ?? 0), 0);
  }
  getRecipeTotalPerPerson() {
    const recipeTotal = this.getRecipeTotal();
    return Math.round(recipeTotal / this.recipeFormGroup.controls.numberOfPersons.value * 100) / 100;
  }

  getExitRecipeTotal() {
    if (!this.exitRecipeEntriesTable) {
      return 0;
    }
    const recipeEntries = this.exitRecipeEntriesTable.getTableFormValue();
    return recipeEntries.reduce((acc, val) => acc + val.quantity *
      (this.mainPurchaseClasses.find(m => m.id === val.mainPurchaseClassId)?.lastPrice ?? 0), 0);
  }
  getExitRecipeTotalPerPerson() {
    const recipeTotal = this.getExitRecipeTotal();
    return Math.round(recipeTotal / this.exitRecipeFormGroup.controls.numberOfPersons.value * 100) / 100;
  }

  clearExitRecipeForm(){
    this.exitRecipeFormGroup.reset(
      {
        numberOfPersons: 1,
        recipeEntries: []
      }
    );
    this.exitRecipeEntriesTable.clearAllRows();
  }

  loadExitRecipeOperation(){
    this.exitRecipeEntriesTable.clearAllRows();
    const recipeValue = this.recipeEntriesTable.getTableFormValue();
    console.log(recipeValue)
    console.log()
    this.exitRecipeFormGroup.patchValue({
      recipeEntries: recipeValue.map(x => ({
        ...x,
        quantity: (x.quantity / this.recipeFormGroup.controls.numberOfPersons.value) * this.exitRecipeFormGroup.controls.numberOfPersons.value,
      }))
    });
    console.log(recipeValue)
    this.exitRecipeEntriesTable.patchValues(recipeValue.map(x => new RecipeEntryModel({
      ...x,
      quantity: (x.quantity / this.recipeFormGroup.controls.numberOfPersons.value) * this.exitRecipeFormGroup.controls.numberOfPersons.value,
    })));
  }

  sendToExitPermit(){
    this.exitRecipeEntriesTable.clearEmptyRows();
    const exitRecipeEntries = this.exitRecipeEntriesTable.getTableFormValue();
    const id = 'exitRecipeEntries-' +  Math.random().toString(36).substring(2, 15)
    localStorage.setItem(id, JSON.stringify(exitRecipeEntries));
    this.router.navigate(['/permits/inventory-permits/new/exit'], {
      queryParams: {
        exitRecipeId: id
      }
    });
  }

  // ============= Detail Actions Menu Handlers =============
  
  // Load all recipe IDs for navigation
  loadAllRecipeIds(): void {
    this.recipeService.getAll().subscribe({
      next: (recipes) => {
        this.allRecipeIds = recipes.map(recipe => recipe.id);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading recipe IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.recipeId || this.allRecipeIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allRecipeIds.indexOf(this.recipeId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allRecipeIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
  }

  // Navigate to next recipe
  navigateToNext(): void {
    if (this.currentIndex < this.allRecipeIds.length - 1) {
      const nextId = this.allRecipeIds[this.currentIndex + 1];
      this.router.navigate(['/recipes', nextId]);
    }
  }

  // Navigate to previous recipe
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allRecipeIds[this.currentIndex - 1];
      this.router.navigate(['/recipes', prevId]);
    }
  }

  // Action handlers
  onPrintClick(): void {
    this.printDocument();
  }

  onDeleteClick(): void {
    // Since the detail-actions-menu doesn't pass the event, 
    // we'll use the confirmation dialog without target
    this.confirmationService.confirm({
      message: this.translate.instant('DATA.CONFIRM_RECIPE_DELETE', {referenceNumber: this.currentRecipe?.referenceNumber || this.recipeId}),
      header: this.translate.instant('DATA.RECIPE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteRecipe();
      },
    });
  }

  deleteRecipe() {
    this.loading = true;
    this.recipeService.delete(this.recipeId).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'info', 
          summary: this.translate.instant('FINANCE.CONFIRMED'), 
          detail: this.translate.instant('DATA.RECIPE_DELETED') 
        });
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('FINANCE.ERROR'), 
          detail: this.translate.instant('DATA.RECIPE_DELETION_ERROR') 
        });
        this.loading = false;
      }
    });
  }

  // Setup custom buttons
  setupCustomButtons(): void {
    this.customButtons = [];
    // Custom buttons can be added here if needed in the future
  }

  // Save and Continue functionality
  saveAndContinue(): void {
    this.recipeEntriesTable.clearEmptyRows();
    this.isSubmitted = true;
    this.loading = true;

    const recipeEntries = (this.recipeEntriesTable.getTableFormValue() || []).filter(x => !!x.mainPurchaseClassId);
    this.recipeFormGroup.controls.recipeEntries.setValue(recipeEntries.map(x => ({
      ...x,
      recipeId: null
    })));

    const recipeValues = this.recipeFormGroup.value;
    if (this.recipeFormGroup.invalid) {
      this.messageService.add({ 
        severity: 'error', 
        summary: this.translate.instant('FINANCE.ERROR'), 
        detail: this.translate.instant('DATA.RECIPE_SAVING_ERROR') 
      });
      this.loading = false;
      return;
    }

    const recipe = new RecipeModel();
    recipe.referenceNumber = recipeValues.referenceNumber;
    recipe.description = recipeValues.description;
    recipe.numberOfPersons = recipeValues.numberOfPersons;
    recipe.mainSalesClassId = recipeValues.mainSalesClassId;
    recipe.recipeEntries = recipeValues.recipeEntries;

    this.recipeService.create(recipe).subscribe({
      next: (res) => {
        this.messageService.add({ 
          severity: 'success', 
          summary: this.translate.instant('FINANCE.CONFIRMED'), 
          detail: this.translate.instant('DATA.RECIPE_CREATED') 
        });
        
        // Reset form for new entry
        this.resetFormForNewEntry();
        this.loading = false;
      },
      error: (error) => {
        console.log('Error Saving Recipe', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('FINANCE.ERROR'), 
          detail: this.translate.instant('DATA.RECIPE_SAVING_ERROR') 
        });
        this.loading = false;
      }
    });
  }

  // Reset form for creating a new entry
  resetFormForNewEntry(): void {
    this.recipeFormGroup.reset({
      numberOfPersons: 1,
      recipeEntries: []
    });
    this.recipeEntriesTable.clearAllRows();
    this.isSubmitted = false;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
