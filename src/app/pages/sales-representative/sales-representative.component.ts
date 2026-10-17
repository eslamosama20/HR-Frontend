import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';
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
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { SalesRepresentative } from 'src/app/models/accounting/sales-representative';
import { SalesRepresentativeService } from 'src/app/services/sales-representative/sales-representative.service';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';



interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-sales-representative',
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
  templateUrl: './sales-representative.component.html',
  styleUrl: './sales-representative.component.scss'
})
export class SalesRepresentativeComponent implements OnInit, OnDestroy {

  salesRepresentativesSignal = signal<any[]>([]);
  get salesRepresentatives() {
    return this.salesRepresentativesSignal();
  }
  set salesRepresentatives(value) {
    this.salesRepresentativesSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  totalRecords: number = 0;
  pageSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;
  private searchSub: any;
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  salesRepresentativeDialogVisibleSignal = signal(false);
  get salesRepresentaiveDialogVisible() {
    return this.salesRepresentativeDialogVisibleSignal();
  }
  set salesRepresentaiveDialogVisible(value) {
    this.salesRepresentativeDialogVisibleSignal.set(value);
  }



  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  salesRepresentativeFormGroup: FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public salesRepresentativeService: SalesRepresentativeService,
    public detailAccountService: DetailAccountService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.salesRepresentativeFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      isFrontal: [this.isFrontal],
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
    if (this.useServerSearch && !this.isFrontal) {
      this.loadSalesRepresentativeLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadSalesRepresentatives();
    }

    // Wire up debounced server-side search
    if (this.useServerSearch) {
      this.searchSub = this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          this.searchValue = query;
          this.loading = true;
          const page = 1;
          const size = this.pageSize;
          const sortField = 'createdAt';
          const sortOrder = -1;
          return this.salesRepresentativeService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.salesRepresentatives = (response.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVES_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }



  loadSalesRepresentatives() {
    this.loading = true;
    const serviceCall = this.isFrontal ? 
      this.salesRepresentativeService.getAllFrontal() : 
      this.salesRepresentativeService.getAll();
      
    serviceCall.subscribe({
      next: customerProfiles => {
        this.salesRepresentatives = customerProfiles.map(x => ({
          ...x,
          createdAt: new Date(x.createdAt),
        }))
        this.loading = false;
      },
      error: error => {
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.NO_SALES_REPRESENTATIVES')
        })
      }
    })
  }

  loadSalesRepresentativeLazy(event: any) {
    if (!this.useServerSearch) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.salesRepresentativeService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
        this.salesRepresentatives = (response.data || []).map(x => {
          x.createdAt = new Date(x.createdAt);
          return x;
        });
        this.totalRecords = response.totalCount ?? 0;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVES_LOADING_ERROR')
        });
      }
    });
  }

  showAddSalesRepresentativeDialog(expenseCenter: SalesRepresentative = null) {
    if (this.opCustomerProfile?.overlayVisible) {
      this.opCustomerProfile.hide();
      return;
    }
    this.salesRepresentativeFormGroup.reset();
    if (expenseCenter) {
      this.salesRepresentativeFormGroup.controls.id.setValue(expenseCenter.id);
      this.salesRepresentativeFormGroup.controls.arabicName.setValue(expenseCenter.arabicName);
      this.salesRepresentativeFormGroup.controls.englishName.setValue(expenseCenter.englishName);
      this.salesRepresentativeFormGroup.controls.isFrontal.setValue(expenseCenter.isFrontal || this.isFrontal);
    } else {
      this.salesRepresentativeFormGroup.controls.isFrontal.setValue(this.isFrontal);
    }
    this.salesRepresentaiveDialogVisible = true;
  }

  closeSalesRepresentativeDialog() {
    this.salesRepresentaiveDialogVisible = false;
    this.salesRepresentativeFormGroup.reset();
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch) {
      this.totalRecords = 0;
      this.loadSalesRepresentativeLazy({ first: 0, rows: this.pageSize });
    }
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    if (this.useServerSearch) {
      this.searchSubject.next(target.value.trim());
    } else {
      dt1.filterGlobal(target.value.trim(), 'contains');
    }
  }

  saveSalesRepresentative() {
    if (this.salesRepresentativeFormGroup.invalid) {
      return;
    }
    const salesRepresentaiveValues = this.salesRepresentativeFormGroup.value;
    if (salesRepresentaiveValues.id) {
      const salesRepresentaitve = new SalesRepresentative();
      salesRepresentaitve.id = salesRepresentaiveValues.id;
      salesRepresentaitve.arabicName = salesRepresentaiveValues.arabicName;
      salesRepresentaitve.englishName = salesRepresentaiveValues.englishName;
      salesRepresentaitve.isFrontal = salesRepresentaiveValues.isFrontal;
      this.salesRepresentativeService.update(salesRepresentaitve).subscribe({
        next: res => {
          this.closeSalesRepresentativeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_UPDATED') });
          this.loadSalesRepresentatives();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_SAVING_ERROR') });
          this.closeSalesRepresentativeDialog();
        }
      });
    } else {
      const salesRepresentative = new SalesRepresentative();
      salesRepresentative.arabicName = salesRepresentaiveValues.arabicName;
      salesRepresentative.englishName = salesRepresentaiveValues.englishName;
      salesRepresentative.isFrontal = salesRepresentaiveValues.isFrontal;
      this.salesRepresentativeService.create(salesRepresentative).subscribe({
        next: res => {
          this.closeSalesRepresentativeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_CREATED') });
          this.loadSalesRepresentatives();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.CUSTOMER_PROFILES_SAVING_ERROR') });
          this.closeSalesRepresentativeDialog();
        }
      });
    }
  }

  deleteSalesRepresentative(salesRepresentative: SalesRepresentative) {
    this.salesRepresentativeService.delete(salesRepresentative.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_DELETED') });
        this.loadSalesRepresentatives();
      },
      error: error => {
        console.log('Error Deleting Sales Representative', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_SAVING_ERROR') });
      }
    });
  }

  confirmSalesRepresentativeDeletion(event: Event, salesRepresentaitve: SalesRepresentative) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_SALES_REPRESENTATIVE_DELETE', { salesRepresentativeName: salesRepresentaitve.arabicName }),
      header: this.translate.instant('FINANCE.SALES_REPRESENTATIVE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteSalesRepresentative(salesRepresentaitve);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.salesRepresentatives.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'FinancePeriods');
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

  sendToFrontal(salesRepresentative: SalesRepresentative) {
    this.salesRepresentativeService.makeFrontal(salesRepresentative.id).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال مندوب المبيعات إلى الواجهة بنجاح'
        });
        this.loadSalesRepresentatives();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إرسال مندوب المبيعات إلى الواجهة'
        });
      }
    });
  }
  selectedSalesRep: any = null;
  @ViewChild('opCustomerProfile') opCustomerProfile!: OverlayPanel;

  openSalesRepPanel(event: MouseEvent, overlay: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opCustomerProfile?.overlayVisible;
    const isDifferent = this.selectedSalesRep?.id !== entry.id;

    this.selectedSalesRep = entry;

    if (isVisible && isDifferent) {
      this.opCustomerProfile.show(event);
    } else {
      this.opCustomerProfile.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opCustomerProfile?.container as HTMLElement;
      if (!panel) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelRect = panel.getBoundingClientRect();

      let left = event.clientX;
      let top = event.clientY;

      if (left + panelRect.width > viewportWidth) left = viewportWidth - panelRect.width - 10;
      if (top + panelRect.height > viewportHeight) top = viewportHeight - panelRect.height - 10;

      panel.style.position = 'fixed';
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.zIndex = '9999';
    });
  }

}
