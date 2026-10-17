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
import { ReservationView } from 'src/app/models/accounting/reservation-view';
import { ReservationViewService } from 'src/app/services/reservations/reservation-view.service';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-view',
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
  templateUrl: './reservation-view.component.html',
  styleUrl: './reservation-view.component.scss'
})
export class ReservationViewComponent implements OnInit, OnDestroy{
  readonly PERMISSIONS = PERMISSIONS;
  isFrontal = signal<boolean>(false);
  reservationViewsSignal = signal<ReservationView[]>([]);
  get reservationViews() {
    return this.reservationViewsSignal();
  }
  set reservationViews(value) {
    this.reservationViewsSignal.set(value);
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

  reservationViewVisibleDialogSignal = signal(false);
  get reservationViewVisibleDialogVisible() {
    return this.reservationViewVisibleDialogSignal();
  }
  set reservationViewVisibleDialogVisible(value) {
    this.reservationViewVisibleDialogSignal.set(value);
  }
  reservationViewFormGroup: FormGroup;
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
    public reservationViewService: ReservationViewService,
    public detailAccountService: DetailAccountService,
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

    this.reservationViewFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      isFrontal: [false]
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
    this.isFrontal.set(this.router.url.includes('frontal'));

    if (this.useServerSearch && !this.isFrontal()) {
      this.loadReservationViewLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationView();
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
          return this.reservationViewService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.reservationViews = (response.data || []).map(x => {
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
            detail: this.translate.instant('FINANCE.RESERVATION_VIEWS_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadReservationView() {
    this.loading = true;
    const dataSource = this.isFrontal() ? 
      this.reservationViewService.getAllFrontal() : 
      this.reservationViewService.getAll();
    
    dataSource.subscribe({
      next: reservationViews => {
        this.reservationViews = reservationViews.map(x => {
          x.createdAt = new Date(x.createdAt);
          return x;
        })
        this.totalRecords = this.reservationViews.length;
        this.loading = false;
      },
      error: error => {
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.RESERVATION_VIEWS_LOADING_ERROR')
        })
      }
    })
  }

  loadReservationViewLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal()) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.reservationViewService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
      this.reservationViews = (response.data || []).map(x => {
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
          detail: this.translate.instant('FINANCE.RESERVATION_VIEWS_LOADING_ERROR')
        });
      }
    });
  }

  showAddReservationViewDialog(reservationView: ReservationView = null) {
    if (this.opReservationView?.overlayVisible) {
      this.opReservationView.hide();
      return;
    }
    this.reservationViewFormGroup.reset();
    if (reservationView) {
      this.reservationViewFormGroup.controls.id.setValue(reservationView.id);
      this.reservationViewFormGroup.controls.arabicName.setValue(reservationView.arabicName);
      this.reservationViewFormGroup.controls.englishName.setValue(reservationView.englishName);
      this.reservationViewFormGroup.controls.isFrontal.setValue(reservationView.isFrontal || false);
    } else {
      this.reservationViewFormGroup.controls.isFrontal.setValue(this.isFrontal());
    }
    this.reservationViewVisibleDialogVisible = true;
  }

  closeReservationViewDialog() {
    this.reservationViewVisibleDialogVisible = false;
    this.reservationViewFormGroup.reset();
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal()) {
      this.totalRecords = 0;
      this.loadReservationViewLazy({ first: 0, rows: this.pageSize });
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

  saveExpesnseCenter() {
    if (this.reservationViewFormGroup.invalid) {
      return;
    }
    const reservationViewValues = this.reservationViewFormGroup.value;
    if (reservationViewValues.id) {
      const reservationView = new ReservationView();
      reservationView.id = reservationViewValues.id;
      reservationView.arabicName = reservationViewValues.arabicName;
      reservationView.englishName = reservationViewValues.englishName;
      reservationView.isFrontal = reservationViewValues.isFrontal || false;
      this.reservationViewService.update(reservationView).subscribe({
        next: res => {
          this.closeReservationViewDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_UPDATED') });
          this.loadReservationView();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_SAVING_ERROR') });
          this.closeReservationViewDialog();
        }
      });
    } else {
      const reservationView = new ReservationView();
      reservationView.arabicName = reservationViewValues.arabicName;
      reservationView.englishName = reservationViewValues.englishName;
      reservationView.isFrontal = reservationViewValues.isFrontal || false;
      this.reservationViewService.create(reservationView).subscribe({
        next: res => {
          this.closeReservationViewDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_CREATED') });
          this.loadReservationView();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_SAVING_ERROR') });
          this.closeReservationViewDialog();
        }
      });
    }
  }

  deleteReservationView(reservationView: ReservationView) {
    this.reservationViewService.delete(reservationView.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_DELETED') });
        this.loadReservationView();
      },
      error: error => {
        console.log('Error Deleting Room Type', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_VIEW_SAVING_ERROR') });
      }
    });
  }

  confirmReservationViewDeletion(event: Event, reservationView: ReservationView) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_VIEW_DELETE', { reservationViewName: reservationView.arabicName }),
      header: this.translate.instant('FINANCE.RESERVATION_VIEW_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservationView(reservationView);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.reservationViews.map(y => {
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

  sendToFrontal(reservationView: ReservationView) {
    this.reservationViewService.makeFrontal(reservationView.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال العنصر إلى الواجهة الأمامية بنجاح'
        });
        this.loadReservationView();
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
  @ViewChild('opReservationView') opReservationView!: OverlayPanel;

  openOverlayPanel(event: MouseEvent, overlayPanel: any, entry: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opReservationView?.overlayVisible;
    const isDifferent = this.selectedEntry?.id !== entry.id;

    this.selectedEntry = entry;

    if (isVisible && isDifferent) {
      this.opReservationView.show(event);
    } else {
      this.opReservationView.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opReservationView?.container as HTMLElement;
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
