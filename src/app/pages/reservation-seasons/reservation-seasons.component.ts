import { Component, LOCALE_ID, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PrimeNGConfig, ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import { ReservationServiceService } from 'src/app/services/reservations/reservation-service.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { ReservationSeason } from 'src/app/models/accounting/reservation-season';
import { ReservationSeasonService } from 'src/app/services/reservations/reservation-season.service';
import { PERMISSIONS } from 'src/app/config/permissions';
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
import {MainAccountModel} from "../../models/accounting/mainAccount.model";
import {MainAccountService} from "../../services/accounting/main-account.service";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-seasons',
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

  templateUrl: './reservation-seasons.component.html',
  styleUrl: './reservation-seasons.component.scss'
})
export class ReservationSeasonsComponent implements OnInit, OnDestroy {
  @ViewChild('dt1') dt1!: Table;
  private searchSub: Subscription;
  totalRecords: number = 0;
  pageSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;

  isFrontal = signal<boolean>(false);
  reservationSeasonSignal = signal<any[]>([]);
  get reservationSeasons() {
    return this.reservationSeasonSignal();
  }
  set reservationSeasons(value) {
    this.reservationSeasonSignal.set(value);
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

  PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.userPermissions?.some(p => p.name === permission) ?? false;
  }

  ReservationSeasonVisibleSignal = signal(false);
  get ReservationSeasonSignalDialogVisible() {
    return this.ReservationSeasonVisibleSignal();
  }
  set ReservationSeasonSignalDialogVisible(value) {
    this.ReservationSeasonVisibleSignal.set(value);
  }

  mainAccountOptionsSignal = signal(null);
  get mainAccountOptions() {
    return this.mainAccountOptionsSignal();
  }
  set mainAccountOptions(value) {
    this.mainAccountOptionsSignal.set(value);
  }

  reservationSeasonFormGroup: FormGroup;
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
    public reservationSeasonService: ReservationSeasonService,
    public detailAccountService: DetailAccountService,
    public mainAccountService: MainAccountService,
    private router: Router
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

    this.reservationSeasonFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      roomRevenueMainAccountId: [null],
      roomExpenseMainAccountId: [null],
      mealRevenueMainAccountId: [null],
      mealExpenseMainAccountId: [null],
      otherRevenueMainAccountId: [null],
      otherExpenseMainAccountId: [null],
      isFrontal: [false]
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'roomRevenueMainAccountConnected', header: this.translate.instant('FINANCE.ROOM_REVENUE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'roomExpenseMainAccountConnected', header: this.translate.instant('FINANCE.ROOM_EXPENSE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'mealRevenueMainAccountConnected', header: this.translate.instant('FINANCE.MEAL_REVENUE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'mealExpenseMainAccountConnected', header: this.translate.instant('FINANCE.MEAL_EXPENSE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'otherRevenueMainAccountConnected', header: this.translate.instant('FINANCE.OTHER_REVENUE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'otherExpenseMainAccountConnected', header: this.translate.instant('FINANCE.OTHER_EXPENSE_ACCOUNT_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    this.isFrontal.set(this.router.url.includes('frontal'));
    if (this.useServerSearch && !this.isFrontal()) {
      this.loadReservationSeasonLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationSeasons();
    }
    this.loadMainAccounts();

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
          return this.reservationSeasonService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          const mapped = (response.data || []).map(x => this.mapSeason(x));
          this.reservationSeasons = this.sortDescending(mapped);
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.RESERVATION_SEASONS_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: (mainAccounts: MainAccountModel[]) => {
        this.mainAccountOptions = mainAccounts.map(x => ({
          label: this.activeLanguage === 'en' ? `${x.englishName} | ${x.referenceCode}` : `${x.arabicName} | ${x.referenceCode}`,
          value: x.id
        }))
      },
      error: error => {
        console.log('Error Loading Main Accounts', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.MAIN_ACCOUNTS_LOADING_ERROR') });
      }
    })
  }

  private mapSeason(x: any) {
    return {
      ...x,
      roomRevenueMainAccountConnected: !!x.roomRevenueMainAccountId,
      roomExpenseMainAccountConnected: !!x.roomExpenseMainAccountId,
      mealRevenueMainAccountConnected: !!x.mealRevenueMainAccountId,
      mealExpenseMainAccountConnected: !!x.mealExpenseMainAccountId,
      otherRevenueMainAccountConnected: !!x.otherRevenueMainAccountId,
      otherExpenseMainAccountConnected: !!x.otherExpenseMainAccountId,
      createdAt: x.createdAt ? new Date(x.createdAt) : null,
    };
  }

  private sortDescending(list: any[]): any[] {
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  reloadTable() {
    if (this.useServerSearch && !this.isFrontal()) {
      if (this.dt1) {
        this.dt1.first = 0;
      }
      this.loadReservationSeasonLazy({ first: 0, rows: this.pageSize, sortField: 'createdAt', sortOrder: -1 });
    } else {
      this.loadReservationSeasons();
    }
  }

  loadReservationSeasons() {
    this.loading = true;
    const dataSource = this.isFrontal() ? 
      this.reservationSeasonService.getAllFrontal() : 
      this.reservationSeasonService.getAll();
    
    dataSource.subscribe({
      next: reservationSeasons => {
        const mapped = reservationSeasons.map(x => this.mapSeason(x));
        this.reservationSeasons = this.sortDescending(mapped);
        this.totalRecords = mapped.length;
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

  loadReservationSeasonLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal()) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.reservationSeasonService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
        const mapped = (response.data || []).map(x => this.mapSeason(x));
        this.reservationSeasons = this.sortDescending(mapped);
        this.totalRecords = response.totalCount ?? 0;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RESERVATION_SEASONS_LOADING_ERROR')
        });
      }
    });
  }

  showAddCustomerProfileDialog(reservationSeason: ReservationSeason = null) {
    if (this.opReservationSeason?.overlayVisible) {
      this.opReservationSeason.hide();
      return;
    }
    this.reservationSeasonFormGroup.reset();
    if (reservationSeason) {
      this.reservationSeasonFormGroup.controls.id.setValue(reservationSeason.id);
      this.reservationSeasonFormGroup.controls.arabicName.setValue(reservationSeason.arabicName);
      this.reservationSeasonFormGroup.controls.englishName.setValue(reservationSeason.englishName);
      this.reservationSeasonFormGroup.controls.roomRevenueMainAccountId.setValue(reservationSeason.roomRevenueMainAccountId);
      this.reservationSeasonFormGroup.controls.roomExpenseMainAccountId.setValue(reservationSeason.roomExpenseMainAccountId);
      this.reservationSeasonFormGroup.controls.mealRevenueMainAccountId.setValue(reservationSeason.mealRevenueMainAccountId);
      this.reservationSeasonFormGroup.controls.mealExpenseMainAccountId.setValue(reservationSeason.mealExpenseMainAccountId);
      this.reservationSeasonFormGroup.controls.otherRevenueMainAccountId.setValue(reservationSeason.otherRevenueMainAccountId);
      this.reservationSeasonFormGroup.controls.otherExpenseMainAccountId.setValue(reservationSeason.otherExpenseMainAccountId);
      this.reservationSeasonFormGroup.controls.isFrontal.setValue(reservationSeason.isFrontal || false);
    } else {
      this.reservationSeasonFormGroup.controls.isFrontal.setValue(this.isFrontal());
    }
    this.ReservationSeasonSignalDialogVisible = true;
  }

  closeReservationSeasonDialog() {
    this.ReservationSeasonSignalDialogVisible = false;
    this.reservationSeasonFormGroup.reset();
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal()) {
      this.totalRecords = 0;
      this.loadReservationSeasonLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationSeasons();
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

  saveReservationSeason() {
    if (this.reservationSeasonFormGroup.invalid) {
      return;
    }
    const reservationSeasonValues = this.reservationSeasonFormGroup.value;
    if (reservationSeasonValues.id) {
      const reservationSeason = new ReservationSeason();
      reservationSeason.id = reservationSeasonValues.id;
      reservationSeason.arabicName = reservationSeasonValues.arabicName;
      reservationSeason.englishName = reservationSeasonValues.englishName;
      reservationSeason.roomRevenueMainAccountId = reservationSeasonValues.roomRevenueMainAccountId;
      reservationSeason.roomExpenseMainAccountId = reservationSeasonValues.roomExpenseMainAccountId;
      reservationSeason.mealRevenueMainAccountId = reservationSeasonValues.mealRevenueMainAccountId;
      reservationSeason.mealExpenseMainAccountId = reservationSeasonValues.mealExpenseMainAccountId;
      reservationSeason.otherRevenueMainAccountId = reservationSeasonValues.otherRevenueMainAccountId;
      reservationSeason.otherExpenseMainAccountId = reservationSeasonValues.otherExpenseMainAccountId;
      reservationSeason.isFrontal = reservationSeasonValues.isFrontal || false;

      this.reservationSeasonService.update(reservationSeason).subscribe({
        next: res => {
          this.closeReservationSeasonDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_UPDATED') });
          this.reloadTable();
        },
        error: error => {
          console.log('Error Saving Reservation Season', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_SAVING_ERROR') });
          this.closeReservationSeasonDialog();
        }
      });
    } else {
      const reservationSeason = new ReservationSeason();
      reservationSeason.arabicName = reservationSeasonValues.arabicName;
      reservationSeason.englishName = reservationSeasonValues.englishName;
      reservationSeason.roomRevenueMainAccountId = reservationSeasonValues.roomRevenueMainAccountId;
      reservationSeason.roomExpenseMainAccountId = reservationSeasonValues.roomExpenseMainAccountId;
      reservationSeason.mealRevenueMainAccountId = reservationSeasonValues.mealRevenueMainAccountId;
      reservationSeason.mealExpenseMainAccountId = reservationSeasonValues.mealExpenseMainAccountId;
      reservationSeason.otherRevenueMainAccountId = reservationSeasonValues.otherRevenueMainAccountId;
      reservationSeason.otherExpenseMainAccountId = reservationSeasonValues.otherExpenseMainAccountId;
      reservationSeason.isFrontal = reservationSeasonValues.isFrontal || false;
      this.reservationSeasonService.create(reservationSeason).subscribe({
        next: res => {
          this.closeReservationSeasonDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_CREATED') });
          this.reloadTable();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_SAVING_ERROR') });
          this.closeReservationSeasonDialog();
        }
      });
    }
  }

  deleteReservationSeason(reservationSeason: ReservationSeason) {
    this.reservationSeasonService.delete(reservationSeason.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_DELETED') });
        this.reloadTable();
      },
      error: error => {
        console.log('Error Deleting Customer Profile', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_SEASON_SAVING_ERROR') });
      }
    });
  }

  confirmReservationSeasonDeletion(event: Event, reservationSeason: ReservationSeason) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_SEASON_DELETE', { reservationSeasonName: reservationSeason.arabicName }),
      header: this.translate.instant('FINANCE.RESERVATION_SEASON_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservationSeason(reservationSeason);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.reservationSeasons.map(y => {
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
      this.saveAsExcelFile(excelBuffer, 'ReservationSeasons');
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

  sendToFrontal(reservationSeason: ReservationSeason) {
    this.reservationSeasonService.makeFrontal(reservationSeason.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال العنصر إلى الواجهة الأمامية بنجاح'
        });
        this.reloadTable();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إرسال العنصر إلى الواجهة الأمامية'
        });
      }
    });
  }
  selectedEntry: any;
  @ViewChild('opReservationSeason') opReservationSeason!: OverlayPanel;

  openOverlayPanel(event: MouseEvent, overlayPanel: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opReservationSeason?.overlayVisible;
    const isDifferent = this.selectedEntry?.id !== entry.id;

    this.selectedEntry = entry;

    if (isVisible && isDifferent) {
      this.opReservationSeason.show(event);
    } else {
      this.opReservationSeason.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opReservationSeason?.container as HTMLElement;
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

