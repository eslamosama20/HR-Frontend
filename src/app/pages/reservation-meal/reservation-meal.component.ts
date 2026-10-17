import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
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
import { ReservationMealModel } from 'src/app/models/accounting/reservation-meal-model';
import { ReservationMealService } from 'src/app/services/reservation-meal/reservation-meal.service';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PERMISSIONS } from 'src/app/config/permissions';


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-reservation-meal',
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

  templateUrl: './reservation-meal.component.html',
  styleUrl: './reservation-meal.component.scss'
})
export class ReservationMealComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }
  showReservationMealView(entry: any) {
    if (this.opReservationMealPanel?.overlayVisible) {
      this.opReservationMealPanel.hide();
      return;
    }
    this.reservationMealsFormGroup.reset();
    if (entry) {
      Object.keys(this.reservationMealsFormGroup.controls).forEach(key => {
        if (entry[key] !== undefined) {
          this.reservationMealsFormGroup.controls[key].setValue(entry[key]);
        }
      });
    }
    this.reservationMealsignalDialogVisible = true;
  }

  reservationMealSignal = signal<ReservationMealModel[]>([]);
  get reservationMeals() {
    return this.reservationMealSignal();
  }
  set reservationMeals(value) {
    this.reservationMealSignal.set(value);
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
  private searchSub: Subscription;
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  reservationMealsignalVisibleSignal = signal(false);
  get reservationMealsignalDialogVisible() {
    return this.reservationMealsignalVisibleSignal();
  }
  set reservationMealsignalDialogVisible(value) {
    this.reservationMealsignalVisibleSignal.set(value);
  }

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  reservationMealsFormGroup: FormGroup;
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
    public reservationMealService: ReservationMealService,
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

    this.reservationMealsFormGroup = this.fb.group({
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
      this.loadReservationMealLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadReservationMeals();
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
          return this.reservationMealService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.reservationMeals = (response.data || []).map(x => {
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
            detail: this.translate.instant('FINANCE.RESERVATION_MEALS_LOADING_ERROR')
          });
        }
      });
    }
  }

  loadReservationMeals() {
    this.loading = true;
    const serviceCall = this.isFrontal ? 
      this.reservationMealService.getAllFrontal() : 
      this.reservationMealService.getAll();
      
    serviceCall.subscribe({
      next: reservationMeals => {
        this.reservationMeals = reservationMeals.map(x => {
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
          detail: this.translate.instant('FINANCE.RESERVATION_MEALS_LOADING_ERROR')
        })
      }
    })
  }

  loadReservationMealLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.reservationMealService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
      this.reservationMeals = (response.data || []).map(x => {
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
          detail: this.translate.instant('FINANCE.RESERVATION_MEALS_LOADING_ERROR')
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  showAddCustomerProfileDialog(reservationMeal: ReservationMealModel = null) {
    this.reservationMealsFormGroup.reset();
    if (reservationMeal) {
      this.reservationMealsFormGroup.controls.id.setValue(reservationMeal.id);
      this.reservationMealsFormGroup.controls.arabicName.setValue(reservationMeal.arabicName);
      this.reservationMealsFormGroup.controls.englishName.setValue(reservationMeal.englishName);
      this.reservationMealsFormGroup.controls.isFrontal.setValue(reservationMeal.isFrontal || this.isFrontal);
    } else {
      this.reservationMealsFormGroup.controls.isFrontal.setValue(this.isFrontal);
    }
    this.reservationMealsignalDialogVisible = true;
  }

  closeReservationMealDialog() {
    this.reservationMealsignalDialogVisible = false;
    this.reservationMealsFormGroup.reset();
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadReservationMealLazy({ first: 0, rows: this.pageSize });
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
    if (this.reservationMealsFormGroup.invalid) {
      return;
    }
    const reservarionMealsValues = this.reservationMealsFormGroup.value;
    if (reservarionMealsValues.id) {
      const reservationMeal = new ReservationMealModel();
      reservationMeal.id = reservarionMealsValues.id;
      reservationMeal.arabicName = reservarionMealsValues.arabicName;
      reservationMeal.englishName = reservarionMealsValues.englishName;
      reservationMeal.isFrontal = reservarionMealsValues.isFrontal;
      this.reservationMealService.update(reservationMeal).subscribe({
        next: res => {
          this.closeReservationMealDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_UPDATED') });
          this.loadReservationMeals();
        },
        error: error => {
          console.log('Error Saving Reservation Meal', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_SAVING_ERROR') });
          this.closeReservationMealDialog();
        }
      });
    } else {
      const reservationMeal = new ReservationMealModel();
      reservationMeal.arabicName = reservarionMealsValues.arabicName;
      reservationMeal.englishName = reservarionMealsValues.englishName;
      reservationMeal.isFrontal = reservarionMealsValues.isFrontal;
      this.reservationMealService.create(reservationMeal).subscribe({
        next: res => {
          this.closeReservationMealDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_CREATED') });
          this.loadReservationMeals();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_SAVING_ERROR') });
          this.closeReservationMealDialog();
        }
      });
    }
  }

  deleteReservationMeal(reservationMeal: ReservationMealModel) {
    this.reservationMealService.delete(reservationMeal.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_DELETED') });
        this.loadReservationMeals();
      },
      error: error => {
        console.log('Error Deleting Reservation Meal', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.RESERVATION_MEAL_SAVING_ERROR') });
      }
    });
  }

  confirmReservationMealDeletion(event: Event, reservationMeal: ReservationMealModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_RESERVATION_MEAL_DELETE', { reservationMealName: reservationMeal.arabicName }),
      header: this.translate.instant('FINANCE.RESERVATION_MEAL_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteReservationMeal(reservationMeal);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.reservationMeals.map(y => {
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

  sendToFrontal(reservationMeal: ReservationMealModel) {
    this.reservationMealService.makeFrontal(reservationMeal.id).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال وجبة الحجز إلى الواجهة بنجاح'
        });
        this.loadReservationMeals();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في إرسال وجبة الحجز إلى الواجهة'
        });
      }
    });
  }
  selectedReservationMeal: any = null;
  @ViewChild('opCustomerProfile') opReservationMealPanel!: OverlayPanel;

  openReservationMealPanel(event: MouseEvent, meal: any, overlay: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opReservationMealPanel?.overlayVisible;
    const isDifferent = this.selectedReservationMeal?.id !== meal.id;

    this.selectedReservationMeal = meal;

    if (isVisible && isDifferent) {
      this.opReservationMealPanel.show(event);
    } else {
      this.opReservationMealPanel.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opReservationMealPanel?.container as HTMLElement;
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
