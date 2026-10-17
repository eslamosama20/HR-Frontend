import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import * as FileSaver from 'file-saver';
import { ReservationServiceModel } from 'src/app/models/accounting/reservation-service-model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import { DetailAccountModel } from '../../models/accounting/detailAccount.model';
import { MainAccountModel } from '../../models/accounting/mainAccount.model';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PERMISSIONS } from 'src/app/config/permissions';


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-services',
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
    FileUploadModule,
    ],
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],

  templateUrl: './reservation-services.component.html',
  styleUrl: './reservation-services.component.scss'
})
export class ReservationServicesComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  private searchSub: Subscription;

  reservationServiceSignal = signal<any[]>([]);
  get reservationServices() {
    return this.reservationServiceSignal();
  }
  set reservationServices(value) {
    this.reservationServiceSignal.set(value);
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
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  reservationServiceVisibleSignal = signal(false);
  get reservationServiceSignalDialogVisible() {
    return this.reservationServiceVisibleSignal();
  }
  set reservationServiceSignalDialogVisible(value) {
    this.reservationServiceVisibleSignal.set(value);
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

  selectedRevenueDetailAccountIdSignal = signal<string>(null);
  get selectedRevenueDetailAccountId(): string {
    return this.selectedRevenueDetailAccountIdSignal();
  }
  set selectedRevenueDetailAccountId(value: string) {
    this.selectedRevenueDetailAccountIdSignal.set(value);
  }

  selectedExpenseDetailAccountIdSignal = signal<string>(null);
  get selectedExpenseDetailAccountId(): string {
    return this.selectedExpenseDetailAccountIdSignal();
  }
  set selectedExpenseDetailAccountId(value: string) {
    this.selectedExpenseDetailAccountIdSignal.set(value);
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == 'en' ? da.englishName : da.arabicName
    }));
  }

  get revenueMainAccountOptionsFromDetail() {
    const detailAccount = this.detailAccounts.find((da) => da.id === this.selectedRevenueDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == 'en' ? ma.englishName : ma.arabicName
    }));
  }

  get expenseMainAccountOptionsFromDetail() {
    const detailAccount = this.detailAccounts.find((da) => da.id === this.selectedExpenseDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == 'en' ? ma.englishName : ma.arabicName
    }));
  }

  reservationServiceFormGroup: FormGroup;
  @ViewChild('reservationServiceFileUploader') reservationServiceFileUploader!: FileUpload;
  isFileUploadingSignal = signal(false);
  get isFileUploading(){ return this.isFileUploadingSignal(); }
  set isFileUploading(v:boolean){ this.isFileUploadingSignal.set(v); }
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
    public reservationServiceService: ReservationServiceService,
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

    this.reservationServiceFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      revenueMainAccountId: [null],
      expenseMainAccountId: [null],
      isFrontal: [this.isFrontal],
      logo: [''],
      isActive: [true],           
      contactNumber: [''],
      email: ['', Validators.email],
      bankName: [''],
      bankAccountNumber: [''],
      iban: [''],
      taxNumber: [''],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'logo', header: this.translate.instant('FINANCE.LOGO'), filter: false },
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'revenueMainAccountConnected', header: this.translate.instant('FINANCE.REVENUE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'expenseMainAccountConnected', header: this.translate.instant('FINANCE.EXPENSE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    if (this.useServerSearch && !this.isFrontal) {
      this.loadReservationServiceLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationServices();
    }
    this.loadAccounts();

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
          return this.reservationServiceService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.reservationServices = (response.data || []).map(x => ({
            ...x,
            isConnected: !!(x.revenueMainAccountId || x.expenseMainAccountId),
            revenueMainAccountConnected: !!x.revenueMainAccountId,
            expenseMainAccountConnected: !!x.expenseMainAccountId,
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
            detail: this.translate.instant('FINANCE.RESERVATION_SERVICES_LOADING_ERROR')
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

  loadReservationServices() {
    this.loading = true;
    const serviceCall = this.isFrontal ? 
      this.reservationServiceService.getAllFrontal() : 
      this.reservationServiceService.getAll();
      
    serviceCall.subscribe({
      next: reservationServices => {
        this.reservationServices = reservationServices.map(x => ({
          ...x,
          revenueMainAccountConnected: !!x.revenueMainAccountId,
          expenseMainAccountConnected: !!x.expenseMainAccountId,
          createdAt: new Date(x.createdAt),
        }))
        this.loading = false;
      },
      error: error => {
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RESERVATION_SERVICES_LOADING_ERROR')
        })
      }
    })
  }

  loadReservationServiceLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.reservationServiceService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
        this.reservationServices = (response.data || []).map(x => ({
          ...x,
          isConnected: !!(x.revenueMainAccountId || x.expenseMainAccountId),
          revenueMainAccountConnected: !!x.revenueMainAccountId,
          expenseMainAccountConnected: !!x.expenseMainAccountId,
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
          detail: this.translate.instant('FINANCE.RESERVATION_SERVICES_LOADING_ERROR')
        });
      }
    });
  }

  showAddReservationServiceDialog(reservationService: ReservationServiceModel = null) {
    if (this.opReservationServicePanel?.overlayVisible) {
      this.opReservationServicePanel.hide();
      return;
    }
    this.reservationServiceFormGroup.reset();
    this.selectedRevenueDetailAccountId = null;
    this.selectedExpenseDetailAccountId = null;

    const applyReservationService = (serviceData: ReservationServiceModel) => {
      this.reservationServiceFormGroup.patchValue({
        id: serviceData.id,
        arabicName: serviceData.arabicName,
        englishName: serviceData.englishName,
        revenueMainAccountId: serviceData.revenueMainAccountId,
        expenseMainAccountId: serviceData.expenseMainAccountId,
        isFrontal: serviceData.isFrontal ?? this.isFrontal,
        logo: serviceData.logoUrl ?? '',
  
        isActive: (serviceData as any).isActive ?? true,
        contactNumber: (serviceData as any).contactNumber ?? '',
        email: (serviceData as any).email ?? '',
        bankName: (serviceData as any).bankName ?? '',
        bankAccountNumber: (serviceData as any).bankAccountNumber ?? '',
        iban: (serviceData as any).iban ?? '',
        taxNumber: (serviceData as any).taxNumber ?? '',
      });
      this.syncSelectedDetailAccountFromMainAccount(serviceData.revenueMainAccountId, (serviceData as any).revenueMainAccount?.detailAccountId, 'revenue');
      this.syncSelectedDetailAccountFromMainAccount(serviceData.expenseMainAccountId, (serviceData as any).expenseMainAccount?.detailAccountId, 'expense');
      this.reservationServiceSignalDialogVisible = true;
    };

    if (reservationService?.id) {
      forkJoin({
        accounts: this.detailAccountService.getAll(),
        reservationService: this.reservationServiceService.getById(reservationService.id)
      }).subscribe({
        next: ({ accounts, reservationService: fullEntry }) => {
          this.detailAccounts = accounts;
          applyReservationService(fullEntry ?? reservationService);
        },
        error: () => applyReservationService(reservationService),
      });
    } else {
      this.reservationServiceFormGroup.patchValue({
        isFrontal: this.isFrontal,
        isActive: true,
      });
      this.reservationServiceSignalDialogVisible = true;
    }
  }
  
  closeReservationServiceDialog() {
    this.reservationServiceSignalDialogVisible = false;
    this.selectedRevenueDetailAccountId = null;
    this.selectedExpenseDetailAccountId = null;
    this.reservationServiceFormGroup.reset();
    if(this.reservationServiceFileUploader){ this.reservationServiceFileUploader.clear(); }
    this.isFileUploading = false;
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadReservationServiceLazy({ first: 0, rows: this.pageSize });
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

  saveReservationService() {
    if (this.reservationServiceFormGroup.invalid) return;
  
    const payload = new ReservationServiceModel({ ...this.reservationServiceFormGroup.value });
    (payload as any).logo = null;
    payload.logoUrl = this.reservationServiceFormGroup.controls.logo.value || null;

    const wasMainAccountEmpty = !payload.revenueMainAccountId && !payload.expenseMainAccountId;

    if (this.selectedRevenueDetailAccountId) {
      payload.revenueDetailAccountId = this.selectedRevenueDetailAccountId;
      if (payload.id) {
        payload.revenueMainAccountId = null;
      }
    }
    if (this.selectedExpenseDetailAccountId) {
      payload.expenseDetailAccountId = this.selectedExpenseDetailAccountId;
      if (payload.id) {
        payload.expenseMainAccountId = null;
      }
    }
  
    const obs = payload.id
      ? this.reservationServiceService.update(payload)
      : this.reservationServiceService.create(payload);
  
    obs.subscribe({
      next: () => {
        this.closeReservationServiceDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: payload.id
            ? this.translate.instant('FINANCE.RESERVATION_SERVICE_UPDATED')
            : this.translate.instant('FINANCE.RESERVATION_SERVICE_CREATED')
        });
        if (wasMainAccountEmpty) {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_AUTO_CREATED', { accountName: payload.arabicName })
          });
        }
        this.loadReservationServices();
      },
      error: (error) => {
        const detail = error?.error || this.translate.instant('FINANCE.RESERVATION_SERVICE_SAVING_ERROR');
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail
        });
        this.closeReservationServiceDialog();
      }
    });
  }

  private syncSelectedDetailAccountFromMainAccount(mainAccountId?: string, fallbackDetailAccountId?: string, target: 'revenue' | 'expense' = 'revenue'): void {
    if (!mainAccountId) return;
    if (fallbackDetailAccountId) {
      if (target === 'revenue') {
        this.selectedRevenueDetailAccountId = fallbackDetailAccountId;
      } else {
        this.selectedExpenseDetailAccountId = fallbackDetailAccountId;
      }
      return;
    }
    const linkedMainAccount = this.findMainAccountById(mainAccountId);
    if (linkedMainAccount?.detailAccountId) {
      if (target === 'revenue') {
        this.selectedRevenueDetailAccountId = linkedMainAccount.detailAccountId;
      } else {
        this.selectedExpenseDetailAccountId = linkedMainAccount.detailAccountId;
      }
    }
  }

  private findMainAccountById(mainAccountId?: string): MainAccountModel | null {
    if (!mainAccountId || !this.detailAccounts?.length) return null;
    for (const detailAccount of this.detailAccounts) {
      const account = detailAccount.mainAccounts?.find(ma => ma.id === mainAccountId);
      if (account) return account;
    }
    return null;
  }

  deleteReservationService(reservationService: ReservationServiceModel) {
    this.reservationServiceService.delete(reservationService.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_SERVICE_DELETED') });
        this.loadReservationServices();
      },
      error: error => {
        console.log('Error Deleting Customer Profile', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_SERVICE_SAVING_ERROR') });
      }
    });
  }

  confirmReservationServiceDeletion(event: Event, reservationService: ReservationServiceModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_SERVICE_DELETE', { reservationServiceName: reservationService.arabicName }),
      header: this.translate.instant('FINANCE.RESERVATION_SERVICE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservationService(reservationService);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.reservationServices.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'ReservationServices');
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

  sendToFrontal(reservationService: ReservationServiceModel) {
    this.reservationServiceService.makeFrontal(reservationService.id).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('FINANCE.SUCCESS'),
          detail: this.translate.instant('FINANCE.SEND_TO_FRONTAL_SERVICE_SUCCESS')
        });
        this.loadReservationServices();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.SEND_TO_FRONTAL_SERVICE_ERROR')
        });
      }
    });
  }
  selectedEntry: any = null;
  @ViewChild('opCustomerProfile') opReservationServicePanel!: OverlayPanel;

  openSalesRepPanel(event: MouseEvent, overlayPanel: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opReservationServicePanel?.overlayVisible;
    const isDifferent = this.selectedEntry?.id !== entry.id;

    this.selectedEntry = entry;

    if (isVisible && isDifferent) {
      this.opReservationServicePanel.show(event);
    } else {
      this.opReservationServicePanel.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opReservationServicePanel?.container as HTMLElement;
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

  onReservationServiceFileSelected(event:any){
    this.isFileUploading = true;
    const file = event.files?.[0];
    if(!file){ this.isFileUploading = false; return; }
    if(!file.type.startsWith('image/')){
      this.messageService.add({severity:'error', summary:'Error', detail:'Unsupported file type. Please choose an image.'});
      this.isFileUploading = false; return;
    }
    const reservationServiceId = this.reservationServiceFormGroup.controls.id.value;
    const uploadRequest = reservationServiceId
      ? this.reservationServiceService.uploadLogo(reservationServiceId, file)
      : this.reservationServiceService.uploadLogoTemp(file);

    uploadRequest.subscribe({
      next: ({ url }) => {
        this.reservationServiceFormGroup.controls.logo.setValue(url);
        this.isFileUploading = false;
        this.messageService.add({severity:'success', summary:'Success', detail:'Image uploaded successfully.'});
        if(this.reservationServiceFileUploader) this.reservationServiceFileUploader.clear();
      },
      error: () => {
        this.isFileUploading = false;
        this.messageService.add({severity:'error', summary:'Error', detail:'Failed uploading file.'});
      }
    });
  }


}
