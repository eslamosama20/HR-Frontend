import {Component, LOCALE_ID, OnInit, signal, ViewChild} from '@angular/core';
import {Table} from "primeng/table";
import {DebitNotesService} from "../../../services/notes/debit-notes.service";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {AuthService} from "../../../modules/auth";
import { FormBuilder, FormGroup} from "@angular/forms";
import {PermissionModel} from "../../../models/auth/permission.model";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import {DebitNoteModel} from "../../../models/notes/debitNote.model";
import {MainAccountService} from "../../../services/accounting/main-account.service";
import {Router} from "@angular/router";
import {PrintDocumentComponent} from "../../../shared-components/print-document/print-document.component";
import {CompanyDetailsModel} from "../../../models/inventory/companyDetails.model";
import {OverlayPanel} from "primeng/overlaypanel";
import { PermissionService } from '../../../services/authorization/permission.service';
import { PERMISSIONS } from '../../../config/permissions';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-debit-note-list',
  templateUrl: './debit-note-list.component.html',
  styleUrl: './debit-note-list.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class DebitNoteListComponent implements OnInit{
  debitNotesSignal = signal([]);
  debitNoteEntriesSignal = signal([]);

  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  constructor(
    private debitNoteService: DebitNotesService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private mainAccountService: MainAccountService,
    public router: Router
  ) {
    this.router = router;
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
  }

  ngOnInit(): void {
    this.loadDebitNotes();

    this.columns = [
      {field: 'referenceNumber', header: this.translate.instant('FINANCE.REFERENCE_NUMBER') , filter: true , filterType: 'text'},
      {field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION') , filter: true , filterType: 'text'},
      {field: 'supplierDetails.arabicName', header: this.translate.instant('FINANCE.SUPPLIER_DETAILS'), filter: false },
      {field: 'receiptDate', header: this.translate.instant('FINANCE.NOTE_DATE'), filter: true , filterType: 'date'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'},
    ];
  }


  loadDebitNotes() {
    this.loading = true;
    this.debitNoteService.getAll().subscribe({
      next: debitNotes => {
        this.debitNotes = debitNotes.map(x => {
          x.createdAt = new Date(x.createdAt);
          x.receiptDate = new Date(x.receiptDate);
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading DebitNotes', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.NOTES_LOADING_ERROR') });
        this.loading = false;
      }
    });
  }


  get debitNotes() {
    return this.debitNotesSignal();
  }
  set debitNotes(value) {
    this.debitNotesSignal.set(value);
  }
  get debitNoteEntries() {
    return this.debitNoteEntriesSignal();
  }
  set debitNoteEntries(value) {
    this.debitNoteEntriesSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;

    dt1.filterGlobal(target.value, 'contains')
  }


  deleteDebitNote(debitNote: DebitNoteModel) {
    this.loading = true;
    this.debitNoteService.delete(debitNote.id).subscribe(res => {
      this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.NOTE_DELETED') });
      this.loadDebitNotes();
    });
  }



  confirmDebitNoteDeletion(event: Event , debitNote: DebitNoteModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('FINANCE.CONFIRM_NOTE_DELETE', {referenceNumber: debitNote.referenceNumber}),
        header: this.translate.instant('FINANCE.NOTE_DELETE_CONFIRMATION'),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteDebitNote(debitNote);
        },
    });
  }

  navigateToAddDebitNote() {
    this.router.navigate(['/notes/debit-notes/new']);
  }

  navigateToDebitNote(debitNote: DebitNoteModel) {
    this.router.navigate(['/notes/debit-notes/', debitNote.id]);
  }
  @ViewChild('opDebitNote') opDebitNote!: OverlayPanel;
selectedDebitNote: any;

openOverlayDebitNote(event: MouseEvent, entry: any) {
  event.preventDefault();
  
  // If panel is already open and a different entry is selected, hide it first
  if (this.opDebitNote.overlayVisible && this.selectedDebitNote?.id !== entry.id) {
    this.opDebitNote.hide();
  }
  
  this.selectedDebitNote = entry;
  
  // If panel was hidden or is not visible, show it
  if (!this.opDebitNote.overlayVisible) {
    this.opDebitNote.show(event);
  }

  // خليه يظهر عند الماوس لو الكليك على الصف
  setTimeout(() => {
    const panelEl = this.opDebitNote.container as HTMLElement;
    if (panelEl && (event.target as HTMLElement).tagName !== 'BUTTON') {
      panelEl.style.position = 'fixed';
      panelEl.style.left = `${event.clientX}px`;
      panelEl.style.top = `${event.clientY}px`;
    }
  });
}



}
