import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PrimeNGConfig, ConfirmationService, MessageService } from 'primeng/api';
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
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { ReservationSupplierModel } from 'src/app/models/accounting/reservation-supplier-model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { ReservationSupplierService } from 'src/app/services/ReservationSupplier/reservation-supplier.service';
import { DetailAccountModel } from '../../models/accounting/detailAccount.model';
import { MainAccountModel } from '../../models/accounting/mainAccount.model';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-supplier',
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
  templateUrl: './reservation-supplier.component.html',
  styleUrl: './reservation-supplier.component.scss'
})
export class ReservationSupplierComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;
  private searchSub: any;
  totalRecords: number = 0;
  pageSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;

  reservationSuppliersSignal = signal<any[]>([]);
  get reservationSuppliers() {
    return this.reservationSuppliersSignal();
  }
  set reservationSuppliers(value) {
    this.reservationSuppliersSignal.set(value);
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

  reservationSuppliersignalVisibleSignal = signal(false);
  get reservationSupplierssignalDialogVisible() {
    return this.reservationSuppliersignalVisibleSignal();
  }
  set reservationSupplierssignalDialogVisible(value) {
    this.reservationSuppliersignalVisibleSignal.set(value);
  }

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  detailAccountsSignal = signal<DetailAccountModel[]>([]);
  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal();
  }
  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value);
  }

  selectedDetailAccountIdSignal = signal<string>(null);
  get selectedDetailAccountId(): string {
    return this.selectedDetailAccountIdSignal();
  }
  set selectedDetailAccountId(value: string) {
    this.selectedDetailAccountIdSignal.set(value);
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == 'en' ? da.englishName : da.arabicName
    }));
  }

  get mainAccountOptionsFromDetail() {
    const detailAccount = this.detailAccounts.find((da) => da.id === this.selectedDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == 'en' ? ma.englishName : ma.arabicName
    }));
  }

  @ViewChild('opCustomerProfile') opCustomerProfile!: OverlayPanel;
  reservationSuppliersFormGroup: FormGroup;
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
    public reservationSuppliersService: ReservationSupplierService,
    public detailAccountService: DetailAccountService,
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

    this.reservationSuppliersFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      mainAccountId: [null],
      isFrontal: [this.isFrontal],
    
      // بيانات التواصل
      isActive: [true],
      contactNumber: [''],
      additionalContactNumber: [''],
      email: ['', Validators.email],
      bankName: [''],
      bankAccountNumber: [''],
      iban: [''],
      taxNumber: [''],

      // حقول العنوان (مطلوبة لزاتكا)
      street: [''],
      district: [''],
      buildingNumber: [''],
      postalCode: [''],
      city: [''],
      country: [''],
      shortAddress: [''],
      subNumber: [''],
      fax: [''],
      website: [''],
      instructions: [''],
      gaztNumber: [''],
      otherId: [''],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'isConnected', header: this.translate.instant('FINANCE.IS_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    if (this.useServerSearch && !this.isFrontal) {
      this.loadReservationSupplierLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationSupplier();
    }
    this.loadAccounts();

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
          return this.reservationSuppliersService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.reservationSuppliers = (response.data || []).map(x => ({
            ...x,
            isConnected: !!x.mainAccountId,
            createdAt: new Date(x.createdAt),
          }));
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RESERVATION_SUPPLIERS_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: (res) => {
        this.detailAccounts = res;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.MAIN_ACCOUNTS_LOADING_ERROR') });
      }
    });
  }

  loadReservationSupplier() {
    this.loading = true;
    const serviceCall = this.isFrontal ? 
      this.reservationSuppliersService.getAllFrontal() : 
      this.reservationSuppliersService.getAll();
      
    serviceCall.subscribe({
      next: reservationSuppliers => {
        this.reservationSuppliers = reservationSuppliers.map(x => ({
          ...x,
          isConnected: !!x.mainAccountId,
          createdAt: new Date(x.createdAt),
        }))
        this.loading = false;
      },
      error: error => {
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RESERVATION_SUPPLIERS_LOADING_ERROR')
        })
      }
    })
  }

  loadReservationSupplierLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.reservationSuppliersService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
        this.reservationSuppliers = (response.data || []).map(x => ({
          ...x,
          isConnected: !!x.mainAccountId,
          createdAt: new Date(x.createdAt),
        }));
        this.totalRecords = response.totalCount ?? 0;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RESERVATION_SUPPLIERS_LOADING_ERROR')
        });
      }
    });
  }

  showAddReservationSupplierProfileDialog(reservationSupplier: ReservationSupplierModel = null) {
    if (this.opCustomerProfile?.overlayVisible) {
      this.opCustomerProfile.hide();
      return;
    }
    this.reservationSuppliersFormGroup.reset();
    this.selectedDetailAccountId = null;

    const applyEntry = (entryData: ReservationSupplierModel) => {
      this.reservationSuppliersFormGroup.patchValue({
        id: entryData.id,
        arabicName: entryData.arabicName,
        englishName: entryData.englishName,
        mainAccountId: entryData.mainAccountId,
        isFrontal: entryData.isFrontal ?? this.isFrontal,

        isActive: (entryData as any).isActive ?? true,
        contactNumber: (entryData as any).contactNumber ?? '',
        additionalContactNumber: (entryData as any).additionalContactNumber ?? '',
        email: (entryData as any).email ?? '',
        bankName: (entryData as any).bankName ?? '',
        bankAccountNumber: (entryData as any).bankAccountNumber ?? '',
        iban: (entryData as any).iban ?? '',
        taxNumber: (entryData as any).taxNumber ?? '',
        street: (entryData as any).street ?? '',
        district: (entryData as any).district ?? '',
        buildingNumber: (entryData as any).buildingNumber ?? '',
        postalCode: (entryData as any).postalCode ?? '',
        city: (entryData as any).city ?? '',
        country: (entryData as any).country ?? '',
        shortAddress: (entryData as any).shortAddress ?? '',
        subNumber: (entryData as any).subNumber ?? '',
        fax: (entryData as any).fax ?? '',
        website: (entryData as any).website ?? '',
        instructions: (entryData as any).instructions ?? '',
        gaztNumber: (entryData as any).gaztNumber ?? '',
        otherId: (entryData as any).otherId ?? '',
      });
      this.syncSelectedDetailAccountFromMainAccount(entryData.mainAccountId, (entryData as any).mainAccount?.detailAccountId);
      this.reservationSupplierssignalDialogVisible = true;
    };

    if (reservationSupplier?.id) {
      forkJoin({
        accounts: this.detailAccountService.getAll(),
        reservationSupplier: this.reservationSuppliersService.getById(reservationSupplier.id)
      }).subscribe({
        next: ({ accounts, reservationSupplier: fullEntry }) => {
          this.detailAccounts = accounts;
          applyEntry(fullEntry ?? reservationSupplier);
        },
        error: () => applyEntry(reservationSupplier),
      });
    } else {
      this.reservationSuppliersFormGroup.patchValue({
        isFrontal: this.isFrontal,
        isActive: true,
      });
      this.reservationSupplierssignalDialogVisible = true;
    }
  }
  

  closeReservationSupplierlDialog() {
    this.reservationSupplierssignalDialogVisible = false;
    this.selectedDetailAccountId = null;
    this.reservationSuppliersFormGroup.reset();
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadReservationSupplierLazy({ first: 0, rows: this.pageSize });
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

  saveReservationMeal() {
    if (this.reservationSuppliersFormGroup.invalid) return;
  
    const payload = new ReservationSupplierModel({ ...this.reservationSuppliersFormGroup.value });
    const wasMainAccountEmpty = !payload.mainAccountId;

    if (this.selectedDetailAccountId) {
      payload.detailAccountId = this.selectedDetailAccountId;
      if (payload.id) {
        payload.mainAccountId = null;
      }
    }
  
    const obs = payload.id
      ? this.reservationSuppliersService.update(payload)
      : this.reservationSuppliersService.create(payload);
  
    obs.subscribe({
      next: () => {
        this.closeReservationSupplierlDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: payload.id
            ? this.translate.instant('FINANCE.RESERVATION_SUPPLIER_UPDATED')
            : this.translate.instant('FINANCE.RESERVATION_SUPPLIER_CREATED')
        });
        if (wasMainAccountEmpty) {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_AUTO_CREATED', { accountName: payload.arabicName })
          });
        }
        this.loadReservationSupplier();
      },
      error: (error) => {
        const detail = error?.error || this.translate.instant('FINANCE.RESERVATION_SUPPLIER_SAVING_ERROR');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail
        });
        this.closeReservationSupplierlDialog();
      }
    });
  }

  private syncSelectedDetailAccountFromMainAccount(mainAccountId?: string, fallbackDetailAccountId?: string): void {
    if (!mainAccountId) return;
    if (fallbackDetailAccountId) {
      this.selectedDetailAccountId = fallbackDetailAccountId;
      return;
    }
    const linkedMainAccount = this.findMainAccountById(mainAccountId);
    if (linkedMainAccount?.detailAccountId) {
      this.selectedDetailAccountId = linkedMainAccount.detailAccountId;
    }
  }

  private findMainAccountById(mainAccountId?: string): MainAccountModel | null {
    if (!mainAccountId || !this.detailAccounts) return null;
    for (const detailAccount of this.detailAccounts) {
      if (!detailAccount.mainAccounts) continue;
      const match = detailAccount.mainAccounts.find(main => main.id === mainAccountId);
      if (match) return match;
    }
    return null;
  }

  deleteReservationSupplier(reservationSupplier: ReservationSupplierModel) {
    this.reservationSuppliersService.delete(reservationSupplier.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_SUPPLIER_DELETED') });
        this.loadReservationSupplier();
      },
      error: error => {
        console.log('Error Deleting Reservation Supplier Profile', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_SUPPLIER_SAVING_ERROR') });
      }
    });
  }

  confirmReservationSupplierDeletion(event: Event, reservationSupplier: ReservationSupplierModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_SUPPLIER_DELETE', { reservationSupplierName: reservationSupplier.arabicName }),
      header: this.translate.instant('FINANCE.RESERVATION_SUPPLIER_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservationSupplier(reservationSupplier);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.reservationSuppliers.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'ReservationMeals');
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

  sendToFrontal(reservationSupplier: ReservationSupplierModel) {
    this.reservationSuppliersService.makeFrontal(reservationSupplier.id).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال مورد الحجز إلى الواجهة بنجاح'
        });
        this.loadReservationSupplier();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إرسال مورد الحجز إلى الواجهة'
        });
      }
    });
  }
  selectedReservationSupplier: any = null;

  openReservationSupplierPanel(event: MouseEvent, overlay: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opCustomerProfile?.overlayVisible;
    const isDifferent = this.selectedReservationSupplier?.id !== entry.id;

    this.selectedReservationSupplier = entry;

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
