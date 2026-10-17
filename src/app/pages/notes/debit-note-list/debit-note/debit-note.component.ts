import { CommonModule } from '@angular/common';
import {Component, LOCALE_ID, OnInit, signal, TemplateRef, ViewChild} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule, ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import { DropdownChangeEvent, DropdownModule } from 'primeng/dropdown';
import { SupplierDetailsModel } from 'src/app/models/inventory/supplierDetails.model';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { SupplierDetailsService } from 'src/app/services/inventory/supplier-details.service';
import {PermissionModel} from "../../../../models/auth/permission.model";
import {AuthService} from "../../../../modules/auth";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslationService} from "../../../../modules/i18n";
import {ActivatedRoute, Router} from "@angular/router";
import {DebitNotesService} from "../../../../services/notes/debit-notes.service";
import {UserAccountModel} from "../../../../models/auth/userAccount.model";
import primengArTranslations from "../../../../utils/primengArTranslations";
import {DebitNoteAccountModel} from "../../../../models/notes/debitNoteAccount.model";
import {forkJoin} from "rxjs";
import {parseDateOnly, formatDateOnlyToString} from "../../../../utils/dateUtils";
import {DebitNoteModel} from "../../../../models/notes/debitNote.model";
import {PrintDocumentComponent} from "../../../../shared-components/print-document/print-document.component";
import {CompanyDetailsModel} from "../../../../models/inventory/companyDetails.model";
import {CompanyDetailsService} from "../../../../services/inventory/company-details.service";
import {AttachmentModel} from "../../../../models/Attachments/attachment.model";
import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {AttachmentService} from "../../../../services/attachments/attachment.service";
import { DetailActionsMenuComponent, ActionButton, NavigationControls } from '../../../../shared-components/detail-actions-menu/detail-actions-menu.component';

type Options = {
  label:string,
  value:string
}

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-debit-note',
  templateUrl: './debit-note.component.html',
  styleUrls: ['./debit-note.component.scss'],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]

})
export class DebitNoteComponent implements OnInit{
  @ViewChild('printComponent', { static: false }) printComponent: PrintDocumentComponent;

  // Navigation controls for actions menu
  allDebitNoteIds: string[] = [];
  currentIndex: number = -1;
  navigationControls: NavigationControls | undefined;
  customButtons: ActionButton[] = [];

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


  currentNoteSignal = signal<DebitNoteModel>(null)
  get currentNote(): DebitNoteModel {
    return this.currentNoteSignal();
  }
  set currentNote(value: DebitNoteModel) {
    this.currentNoteSignal.set(value);
  }

  taxOptions: any[] = [];  // Tax options for dropdowns
  tax1 = { id: null, amount: null };  // Holds Tax 1 info
  tax2 = { id: null, amount: null };  // Holds Tax 2 info
  rows: any[] = [];  // Array to store multiple account rows
  totalPrice = 0;
  selectedSingularAccount
  isTableVisible: boolean = false;  // Controls visibility of the dynamic table

  availableTaxOptions = [
    { label: 'صفريه', value: 0 },
    { label: 'معافاه', value: 0 },
    { label: 'القيمه المضافه', value: 0.15 },
  ];
  @ViewChild('taxModal') taxModal: TemplateRef<any>;  // Reference to the tax modal
  taxAmount: number = 0;

  debitNoteIdSignal = signal<string | null>(null);
  isEditModeSignal = signal<boolean>(false);
  isSubmitted: boolean = false;

  get debitNoteId(){
    return this.debitNoteIdSignal()
  }
  set debitNoteId(value:string){
    this.debitNoteIdSignal.set(value);
  }
  get isEditMode() {
    return this.isEditModeSignal();
  }
  set isEditMode(value) {
    this.isEditModeSignal.set(value);
  }

  get isFormValid(): boolean {
    if (!this.debitNoteFormGroup) {
      return false;
    }
    
    // Check if form is valid and not in loading state
    return this.debitNoteFormGroup.valid && !this.loading;
  }

  mainAccountsSignal = signal([]);
  get mainAccounts() {
    return this.mainAccountsSignal();
  }
  set mainAccounts(value) {
    this.mainAccountsSignal.set(value);
  }

  debitNoteFormGroup : FormGroup;
  mainAccountsOptions:Options[] = [];
  supplierDetailsOptions:Options[] =[];
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
    private mainAccountService: MainAccountService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private route: ActivatedRoute,
    private debitNoteService : DebitNotesService,
    private supplierDetailsService : SupplierDetailsService,
    private modalService: NgbModal,
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
      { field: 'mainAccountName', label: this.translate.instant("FINANCE.SUBACCOUNT")},
      { field: 'amount', label: this.translate.instant('FINANCE.PRICEAMOUNT') , pipe: 'number'},
      { field: 'description', label: this.translate.instant('FINANCE.DESCRIPTION') },
    ];
  }

  ngOnInit() {
    this.loadData();

    this.debitNoteFormGroup = this.fb.group({
      id: [null],
      referenceNumber: [''],
      description: [''],
      selectedSingularAccountId:[null],
      amount:[null,[Validators.min(0.01),Validators.required]],
      tax:[0,Validators.min(0)],
      supplierDetailsId: ['', Validators.required],
      receiptDate: [null, [Validators.required, this.futureDateValidator()]],
      debitNoteAccounts: [[], [this.debitNoteAccountsLengthValidator()]],
      transactionId:[null]
    })
    
    if (!this.isEditMode) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.debitNoteFormGroup.get('receiptDate').setValue(today);
    }
    
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }
    
    // Subscribe to route parameter changes to handle navigation
    this.route.params.subscribe(params => {
      const newId = params['id'];
      if (newId && newId !== this.debitNoteId) {
        this.debitNoteId = newId;
        this.isEditMode = true;
        this.loadDebitNote(newId);
        this.loadAllDebitNoteIds();
        this.loadAttachments();
      }
    });
  }

  
debitNoteAccountsLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const hasSingular = this.debitNoteFormGroup?.get('selectedSingularAccountId')?.value;
    const accounts = control.value;
    return hasSingular || (accounts && accounts.length >= 1) ? null : {
      minLength: { requiredLength: 1, actualLength: accounts?.length || 0 }
    };
  };
}

  futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const date = new Date(value);
    if (!value || isNaN(date.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date > today ? { futureDate: { value } } : null;
  };
}



  loadData(): void {
    this.loading = true;
    const debitNoteId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!debitNoteId;

    forkJoin({
      supplierDetails: this.supplierDetailsService.getAll(),
      mainAccounts: this.mainAccountService.getAll(),
    }).subscribe({
      next: ({ supplierDetails, mainAccounts }) => {
        // Handle transaction types
        this.supplierDetailsOptions = supplierDetails.map(supplierDetails => ({
          label: supplierDetails.arabicName,
          value: supplierDetails.id
        }));

        // Handle main accounts
        this.mainAccounts = mainAccounts;
        this.mainAccountsOptions = mainAccounts.map(mainAccount => ({
          label: this.activeLanguage === 'en'
            ? `${mainAccount.referenceCode} | ${mainAccount.englishName}`
            : `${mainAccount.referenceCode} | ${mainAccount.arabicName}`,
          value: mainAccount.id
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

  loadMode() {
    this.debitNoteId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.debitNoteId;
    if (this.isEditMode) {
      this.loadCompanyDetails()
      this.loadDebitNote(this.debitNoteId);
      this.loadAllDebitNoteIds(); // Load IDs for navigation
    }
  }

  loadDebitNote(id: string) {
    this.debitNoteService.getById(id).subscribe({
      next: debitNote => {
        this.currentNote = debitNote;
        this.docData=debitNote.debitNoteAccounts.map(entry =>({
          ...entry,
          mainAccountName: this.activeLanguage == "en" ? entry.mainAccount.englishName:entry.mainAccount.arabicName
        }))
        if (debitNote.debitNoteAccounts.length == 1){
          this.debitNoteFormGroup.get('selectedSingularAccountId')
            .setValue(debitNote.debitNoteAccounts[0].mainAccountId);
          debitNote.debitNoteAccounts = [];
        }else {
          this.toggleTableVisibility();
          this.rows = debitNote.debitNoteAccounts
        }

        this.taxAmount = debitNote.amount * debitNote.tax;

        // Handle date properly for the calendar component
        let receiptDate: Date;
        if (typeof debitNote.receiptDate === 'string') {
          receiptDate = new Date(debitNote.receiptDate);
        } else {
          receiptDate = new Date(debitNote.receiptDate);
        }
        
        this.debitNoteFormGroup.patchValue({
          ...debitNote,
          receiptDate: receiptDate
        });
        
        // Setup custom buttons and navigation after loading
        this.setupCustomButtons();
        this.updateNavigationControls();
        //this.transactionEntriesTable.patchValues(transaction.transactionEntries);
      },
      error: error => {
        console.log('Error Loading Note', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.NOTE_LOADING_ERROR')
        })
      }
    })
  }
  public hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  saveDebitNote() {
    this.isSubmitted = true;
    this.loading = true;

    const debitNoteValues = this.debitNoteFormGroup.value;
    if (debitNoteValues.selectedSingularAccountId && debitNoteValues.debitNoteAccounts.length ==0){
      debitNoteValues.debitNoteAccounts =[new DebitNoteAccountModel({
        mainAccountId:this.debitNoteFormGroup.get('selectedSingularAccountId').value,
        amount:debitNoteValues.amount,
        tax:debitNoteValues.tax,
      })]
      this.debitNoteFormGroup.get('debitNoteAccounts').setValue(debitNoteValues.debitNoteAccounts)
    }else{
      debitNoteValues.debitNoteAccounts = this.rows
    }
    if (debitNoteValues.amount != debitNoteValues.debitNoteAccounts.reduce((sum,item)=>sum+item.amount,0))
    {
      alert('مجموع مبالغ الحسابات لا يساوي مبلغ السند')
      this.loading = false;
      return
    }
    console.log('debitNoteValues', debitNoteValues);
    if (debitNoteValues.id) {
      const debitNote = new DebitNoteModel();
      debitNote.id = debitNoteValues.id;
      debitNote.referenceNumber = debitNoteValues.referenceNumber;
      debitNote.description = debitNoteValues.description;
      debitNote.receiptDate = typeof debitNoteValues.receiptDate === 'string'
        ? formatDateOnlyToString(parseDateOnly(debitNoteValues.receiptDate))
        : formatDateOnlyToString(debitNoteValues.receiptDate);
      debitNote.supplierDetailsId = debitNoteValues.supplierDetailsId;
      debitNote.amount = debitNoteValues.amount;
      debitNote.tax = debitNoteValues.tax;
      debitNote.transactionId = debitNoteValues.transactionId

      debitNote.debitNoteAccounts = debitNoteValues.debitNoteAccounts.map(p=>({
        ...p,
        debitNoteId:debitNoteValues.id
      }))

      this.debitNoteService.update(debitNote).subscribe({
        next: res => {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.NOTE_UPDATED') });
          this.router.navigate(['/notes/debit-notes/']);
        },
        error: error => {
          console.log('Error Saving Note', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.NOTE_SAVING_ERROR') });
          this.loading = false;
        }
      });
    }else{

      const debitNote = new DebitNoteModel();
      debitNote.referenceNumber = debitNoteValues.referenceNumber;
      debitNote.description = debitNoteValues.description;
      debitNote.receiptDate = typeof debitNoteValues.receiptDate === 'string'
        ? formatDateOnlyToString(parseDateOnly(debitNoteValues.receiptDate))
        : formatDateOnlyToString(debitNoteValues.receiptDate);
      debitNote.supplierDetailsId = debitNoteValues.supplierDetailsId;
      debitNote.amount = debitNoteValues.amount;
      debitNote.tax = debitNoteValues.tax;

      debitNote.debitNoteAccounts = debitNoteValues.debitNoteAccounts

      console.log(debitNote)

      this.debitNoteService.create(debitNote).subscribe({
        next: res => {
          console.log('Note Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.NOTE_CREATED') });
          this.router.navigate(['/notes/debit-notes/']);
        },
        error: error => {
          console.log('Error Saving Note', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.NOTE_SAVING_ERROR') });
          this.loading = false;
        }
      });

    }
  }

  navigateToDebitNotesPage() {
    this.router.navigate(['/notes/debit-notes/']);
  }

  openTaxModal(): void {
    this.modalService.open(this.taxModal, { size: 'lg' });
  }
  onPriceOrTaxChange(): void {
    // When price or tax changes, recalculate the tax amount and total price
    const selectedTax1 = this.tax1.amount
    const selectedTax2 = this.tax2.amount
    if (this.tax1.amount ||this.tax2.amount )
    {
      this.debitNoteFormGroup.get('tax').setValue(this.tax1.amount+this.tax2.amount)
    }
  }
  removeTax(): void {
    this.tax1 = { id: null, amount: null };
    this.tax2 = { id: null, amount: null };
    this.debitNoteFormGroup.get('tax').setValue(0)

  }
  saveTax(): void {
    if (this.tax1.amount ||this.tax2.amount )
    {
      this.debitNoteFormGroup.get('tax').setValue(this.tax1.amount+this.tax2.amount)
    }
    // Logic to save selected tax and close the modal
    this.closeTaxModal();
  }
  closeTaxModal(): void {
    this.modalService.dismissAll();
  }

  handleSingularAccount(event:DropdownChangeEvent){
    // Update validation for debitNoteAccounts when singular account changes
    this.debitNoteFormGroup.get('debitNoteAccounts').updateValueAndValidity();
  }

  toggleTableVisibility(): void {
    this.isTableVisible = !this.isTableVisible;
    this.debitNoteFormGroup.get('selectedSingularAccountId').setValue(null)
    this.rows=[]
  }

  removeRow(index: number): void {
    // Remove a row from the table
    this.rows.splice(index, 1);
  }
  addRow(): void {
    const account=new DebitNoteAccountModel({
        mainAccountId: null,
        description: '',
        amount: 0,
        tax: null,
        debitNoteId:null,
      })

    this.rows.push(account);
  }

  patchMainAccountRow(event:DropdownChangeEvent,index:number){
    this.rows[index] = {
      ...this.rows[index],
      mainAccountId:event.value
    }
  }
  printTable(){
    window.print();
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


  get attachments(): AttachmentModel[] {
    return this.currentNote?.attachments || [];
  }
  loadAttachments() {
    this.loadDebitNote(this.debitNoteId)
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
    const debitNoteId = this.debitNoteId
    if (!debitNoteId) return;
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
      requestData.debitNoteId = debitNoteId;
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
    const debitNoteId = this.debitNoteId;
    if (!debitNoteId) return;
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
      requestData.debitNoteId = debitNoteId;
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

  // ============= Detail Actions Menu Handlers =============
  
  // Load all debit note IDs for navigation
  loadAllDebitNoteIds(): void {
    this.debitNoteService.getAll().subscribe({
      next: (debitNotes) => {
        this.allDebitNoteIds = debitNotes.map(note => note.id);
        this.updateNavigationControls();
      },
      error: (err) => {
        console.error('Error loading debit note IDs', err);
      }
    });
  }

  // Update navigation controls based on current position
  updateNavigationControls(): void {
    if (!this.debitNoteId || this.allDebitNoteIds.length === 0) {
      this.navigationControls = undefined;
      return;
    }

    this.currentIndex = this.allDebitNoteIds.indexOf(this.debitNoteId);
    
    if (this.currentIndex !== -1) {
      this.navigationControls = {
        currentPage: this.currentIndex + 1,
        totalPages: this.allDebitNoteIds.length,
        onNext: () => this.navigateToNext(),
        onPrevious: () => this.navigateToPrevious()
      };
    }
  }

  // Navigate to next debit note
  navigateToNext(): void {
    if (this.currentIndex < this.allDebitNoteIds.length - 1) {
      const nextId = this.allDebitNoteIds[this.currentIndex + 1];
      this.router.navigate(['/notes/debit-notes', nextId]);
    }
  }

  // Navigate to previous debit note
  navigateToPrevious(): void {
    if (this.currentIndex > 0) {
      const prevId = this.allDebitNoteIds[this.currentIndex - 1];
      this.router.navigate(['/notes/debit-notes', prevId]);
    }
  }

  // Action handlers
  onPrintClick(): void {
    this.printDocument();
  }

  onEditClick(): void {
    // Already in edit mode, just focus on form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  onDeleteClick(): void {
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_DELETE_NOTE'),
      header: this.translate.instant('FINANCE.DELETE_CONFIRMATION'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.debitNoteService.delete(this.debitNoteId).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: this.translate.instant('FINANCE.CONFIRMED'), 
              detail: this.translate.instant('FINANCE.NOTE_DELETED') 
            });
            this.router.navigate(['/notes/debit-notes']);
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: this.translate.instant('FINANCE.ERROR'), 
              detail: this.translate.instant('FINANCE.NOTE_DELETION_ERROR') 
            });
          }
        });
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
    this.isSubmitted = true;
    this.loading = true;

    const debitNoteValues = this.debitNoteFormGroup.value;
    
    // Prepare accounts
    if (debitNoteValues.selectedSingularAccountId && debitNoteValues.debitNoteAccounts.length === 0) {
      debitNoteValues.debitNoteAccounts = [new DebitNoteAccountModel({
        mainAccountId: this.debitNoteFormGroup.get('selectedSingularAccountId').value,
        amount: debitNoteValues.amount,
        tax: debitNoteValues.tax,
      })];
    } else {
      debitNoteValues.debitNoteAccounts = this.rows;
    }

    // Validate total amount
    if (debitNoteValues.amount !== debitNoteValues.debitNoteAccounts.reduce((sum, item) => sum + item.amount, 0)) {
      this.messageService.add({ 
        severity: 'error', 
        summary: this.translate.instant('FINANCE.ERROR'), 
        detail: this.translate.instant('FINANCE.AMOUNT_MISMATCH') 
      });
      this.loading = false;
      return;
    }

    const debitNote = new DebitNoteModel();
    debitNote.referenceNumber = debitNoteValues.referenceNumber;
    debitNote.description = debitNoteValues.description;
    debitNote.receiptDate = typeof debitNoteValues.receiptDate === 'string'
      ? formatDateOnlyToString(parseDateOnly(debitNoteValues.receiptDate))
      : formatDateOnlyToString(debitNoteValues.receiptDate);
    debitNote.supplierDetailsId = debitNoteValues.supplierDetailsId;
    debitNote.amount = debitNoteValues.amount;
    debitNote.tax = debitNoteValues.tax;
    debitNote.debitNoteAccounts = debitNoteValues.debitNoteAccounts;

    this.debitNoteService.create(debitNote).subscribe({
      next: (res) => {
        this.messageService.add({ 
          severity: 'success', 
          summary: this.translate.instant('FINANCE.CONFIRMED'), 
          detail: this.translate.instant('FINANCE.NOTE_CREATED') 
        });
        
        // Reset form for new entry
        this.resetFormForNewEntry();
        this.loading = false;
      },
      error: (error) => {
        console.log('Error Saving Note', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: this.translate.instant('FINANCE.ERROR'), 
          detail: this.translate.instant('FINANCE.NOTE_SAVING_ERROR') 
        });
        this.loading = false;
      }
    });
  }

  // Reset form for creating a new entry
  resetFormForNewEntry(): void {
    this.debitNoteFormGroup.reset();
    this.rows = [];
    this.isTableVisible = false;
    this.tax1 = { id: null, amount: null };
    this.tax2 = { id: null, amount: null };
    this.taxAmount = 0;
    this.isSubmitted = false;
    
    // Set default receipt date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.debitNoteFormGroup.get('receiptDate').setValue(today);
    this.debitNoteFormGroup.get('tax').setValue(0);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
