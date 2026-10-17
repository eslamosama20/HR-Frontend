import { Component, ElementRef, LOCALE_ID, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PrimeNGConfig, ConfirmationService, MessageService, SharedModule } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { DetailAccountModel } from 'src/app/models/accounting/detailAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { CustomerProfileService } from 'src/app/services/accounting/customer-profile.service';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { ExpenseCenters } from 'src/app/models/expensesCenters/expense-centers';
import { ExpenseCenterService } from 'src/app/services/expensesCenters/expense-center.service';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-expensescenters',
  standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TreeModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        CardModule,
        ConfirmDialogModule,
        TagModule,
        ToastModule,
        TableModule,
        DropdownModule,
        MultiSelectModule,
        ProgressBarModule,
        InputNumberModule,
        TranslateModule,
        FormsModule,
        PaginatorModule,
        OverlayPanelModule,
        CustomDatePipe,
    ],
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],

  templateUrl: './expensescenters.component.html',
  styleUrl: './expensescenters.component.scss',
})
export class EXPENSESCENTERSComponent {
  selectedDetailAccountIdSignal = signal<string>(null)
  get selectedDetailAccountId(): string {
    return this.selectedDetailAccountIdSignal()
  }
  set selectedDetailAccountId(value: string) {
    this.selectedDetailAccountIdSignal.set(value)
  }
  detailAccountsSignal = signal<DetailAccountModel[]>([])
  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal()
  }
  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value)
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == "en" ? da.englishName : da.arabicName
    }))
  }

  get mainAccountOptions() {
    const detailAccount = this.detailAccounts.find((ha) => ha.id === this.selectedDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == "en" ? ma.englishName : ma.arabicName
    }))
  }

  expenseCentersSignal = signal<ExpenseCenters[]>([]);
  get expensesCenters() {
    return this.expenseCentersSignal();
  }
  set expensesCenters(value) {
    this.expenseCentersSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  customerProfileDialogVisibleSignal = signal(false);
  get customerProfileDialogVisible() {
    return this.customerProfileDialogVisibleSignal();
  }
  set customerProfileDialogVisible(value) {
    this.customerProfileDialogVisibleSignal.set(value);
  }
  expenseCenterFormGroup: FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public expensesCenterService: ExpenseCenterService,
    public detailAccountService: DetailAccountService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.expenseCenterFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required]
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    this.loadExpensesCenters();
  }

  loadExpensesCenters() {
    this.loading = true;
    this.expensesCenterService.getAll().subscribe({
      next: customerProfiles => {
        this.expensesCenters = customerProfiles.map(x => {
          x.createdAt = new Date(x.createdAt);
          return x;
        })
        this.loading = false;
      },
      error: error => {
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.EXPENSES_CENTER_LOADING_ERROR')
        })
      }
    })
  }

  showAddCustomerProfileDialog(expenseCenter: ExpenseCenters = null) {
    this.expenseCenterFormGroup.reset();
    if (expenseCenter) {
      this.expenseCenterFormGroup.controls.id.setValue(expenseCenter.id);
      this.expenseCenterFormGroup.controls.arabicName.setValue(expenseCenter.arabicName);
      this.expenseCenterFormGroup.controls.englishName.setValue(expenseCenter.englishName);
    }
    this.customerProfileDialogVisible = true;
  }

  closeExpenseCenterDialog() {
    this.customerProfileDialogVisible = false;
    this.selectedDetailAccountId = null
    this.expenseCenterFormGroup.reset();
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  selectedExpenseCenterForOverlay: ExpenseCenters = null;

  @ViewChild('opExpenseCenter') opExpenseCenter!: OverlayPanel;
  @ViewChild('overlayAnchor') overlayAnchor!: ElementRef;

  showOverlay(event: MouseEvent, entry: ExpenseCenters) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedExpenseCenterForOverlay = entry;

    const anchorEl = this.overlayAnchor.nativeElement as HTMLElement;
    anchorEl.style.left = `${event.clientX}px`;
    anchorEl.style.top = `${event.clientY}px`;
    anchorEl.style.position = 'fixed';

    if (this.opExpenseCenter.overlayVisible) {
      this.opExpenseCenter.hide();
      setTimeout(() => this.opExpenseCenter.show(event, anchorEl), 0);
    } else {
      this.opExpenseCenter.show(event, anchorEl);
    }
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value, 'contains')
  }

  saveExpesnseCenter() {
    if (this.expenseCenterFormGroup.invalid) {
      return;
    }
    const expenseCenterValues = this.expenseCenterFormGroup.value;
    if (expenseCenterValues.id) {
      const expenseCenter = new ExpenseCenters();
      expenseCenter.id = expenseCenterValues.id;
      expenseCenter.arabicName = expenseCenterValues.arabicName;
      expenseCenter.englishName = expenseCenterValues.englishName;
      this.expensesCenterService.update(expenseCenter).subscribe({
        next: res => {
          this.closeExpenseCenterDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_UPDATED') });
          this.loadExpensesCenters();
        },
        error: error => {
          console.log('Error Saving Expense Center', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_SAVING_ERROR') });
          this.closeExpenseCenterDialog();
        }
      });
    } else {
      const expenseCenter = new ExpenseCenters();
      expenseCenter.arabicName = expenseCenterValues.arabicName;
      expenseCenter.englishName = expenseCenterValues.englishName;
      this.expensesCenterService.create(expenseCenter).subscribe({
        next: res => {
          this.closeExpenseCenterDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_CREATED') });
          this.loadExpensesCenters();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_SAVING_ERROR') });
          this.closeExpenseCenterDialog();
        }
      });
    }
  }

  deleteExpenseCenter(expenseCenter: ExpenseCenters) {
    this.expensesCenterService.delete(expenseCenter.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_DELETED') });
        this.loadExpensesCenters();
      },
      error: error => {
        console.log('Error Deleting Expense Center', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.EXPENSES_CENTER_DELETING_ERROR') });
      }
    });
  }

  confirmExpenseCenterDeletion(event: Event, expenseCenter: ExpenseCenters) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_EXPENSES_CENTER_DELETE', { expensesCenterName: expenseCenter.arabicName }),
      header: this.translate.instant('FINANCE.EXPENSES_CENTER_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteExpenseCenter(expenseCenter);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.expensesCenters.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.filterType === 'date') {
            // @ts-ignore
            row[x.detail] = new Date(y[x.field]).toLocaleString(
              'ar-SA-u-ca-gregory',
              {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }
            );
          } else {
            // @ts-ignore
            row[x.detail] = y[x.field];
          }
        });
        return row;
      });
      console.log(data);
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'ExpenseCenter');
    });
  }
  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION);
  }
}
