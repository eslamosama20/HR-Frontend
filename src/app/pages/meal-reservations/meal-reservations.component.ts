import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../modules/i18n';
import { AuthService } from '../../modules/auth';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PermissionModel } from '../../models/auth/permission.model';
import { UserAccountModel } from '../../models/auth/userAccount.model';
import { Router } from '@angular/router';
import { MealReservationModel } from '../../models/meal-reservation/meal-reservation.model';
import { MealReservationService } from '../../services/meal-reservation/meal-reservation.service';
import { OverlayPanel } from 'primeng/overlaypanel';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string; // 'text' | 'date' | ...
}

/** ViewModel للجدول (نضمن createdAt = Date ونضيف customerProfileName) */
interface MealReservationRowVM {
  id: string;
  referenceNumber: string;
  customerProfileName: string;
  /** الحقول الجديدة */
  customerReservationNumber?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt: Date;
  transactionId?: string | null;
}

@Component({
  selector: 'app-meal-reservations',
  templateUrl: './meal-reservations.component.html',
  styleUrl: './meal-reservations.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]
})
export class MealReservationsComponent implements OnInit {
  // 🔽 خلّينا الsignal Typed على الVM
  mealReservationsSignal = signal<MealReservationRowVM[]>([]);
  mealReservationEntriesSignal = signal([] as any[]);

  loading: boolean = true;
  searchValueSignal = signal('');
  userPermissionsSignal = signal<PermissionModel[]>([]);
  mealReservationEntryFormGroup: FormGroup;

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  private router: Router;

  constructor(
    private mealReservationService: MealReservationService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    router: Router
  ) {
    this.router = router;
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userPermissions = res.userRoles
          .map((ur) => ur.role.rolePermissions.map((rp) => rp.permission))
          .reduce((acc, val) => acc.concat(val), []);
      }
    });
  }

  ngOnInit(): void {
    this.loadMealReservations();

    // ✅ ضفنا الأعمدة الجديدة هنا
    this.columns = [
      { field: 'referenceNumber', header: this.translate.instant('FINANCE.MEAL_RESERVATION_REFERENCE_NUMBER'), filter: true, filterType: 'text' },
      { field: 'customerProfileName', header: this.translate.instant('FINANCE.CUSTOMER_PROFILE'), filter: true, filterType: 'text' },
      { field: 'customerReservationNumber', header: 'رقم حجز العميل', filter: true, filterType: 'text' },
      { field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION'), filter: true, filterType: 'text' },
      { field: 'notes', header: 'الملاحظات', filter: true, filterType: 'text' }, 
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  // ✅ المابّنج بيجهّز الVM وفيه الحقول الجديدة كما هي من الAPI
  loadMealReservations() {
    this.loading = true;
    this.mealReservationService.getAll().subscribe({
      next: (mealReservations: MealReservationModel[]) => {
        const rows: MealReservationRowVM[] = mealReservations.map((x) => ({
          id: x.id,
          referenceNumber: x.referenceNumber,
          customerProfileName:
            this.activeLanguage === 'en'
              ? (x.customerProfile?.englishName ?? '')
              : (x.customerProfile?.arabicName ?? ''),
          customerReservationNumber: (x as any).customerReservationNumber ?? null, // موجودة في الAPI
          description: (x as any).description ?? null, // موجودة في الAPI
          notes: (x as any).notes ?? null, // موجودة في الAPI
          createdAt: new Date(x.createdAt),
          transactionId: (x as any).transactionId ?? null
        }));

        this.mealReservations = rows;
        this.loading = false;
      },
      error: (error) => {
        console.log('Error Loading Meal Reservations', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  // ------- Signals Getters/Setters -------
  get mealReservations() {
    return this.mealReservationsSignal();
  }
  set mealReservations(value: MealReservationRowVM[]) {
    this.mealReservationsSignal.set(value);
  }

  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value: string) {
    this.searchValueSignal.set(value);
  }

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal();
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  // ------- Helpers / Actions -------
  public hasPermission(permission: string): boolean {
    return this.userPermissions.some((x) => x.name === permission);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    dt1.filterGlobal(target.value.trim(), 'contains');
  }

  trimSearchValue() {
    this.searchValue = this.searchValue.trim();
  }

  deleteMealReservation(mealReservation: MealReservationModel) {
    this.loading = true;
    this.mealReservationService.delete(mealReservation.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('FINANCE.CONFIRMED'),
          detail: this.translate.instant('FINANCE.MEAL_RESERVATION_DELETED')
        });
        this.loadMealReservations();
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  confirmMealReservationDeletion(event: Event, mealReservation: MealReservationModel) {
    this.opMealReservation?.hide();
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_MEAL_RESERVATION_DELETE', {
        referenceNumber: mealReservation.referenceNumber
      }),
      header: this.translate.instant('FINANCE.MEAL_RESERVATION_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteMealReservation(mealReservation);
      }
    });
  }

  navigateToAddMealReservation() {
    this.router.navigate(['/meal-reservations/new/']);
  }

  navigateToMealReservation(mealReservation: MealReservationModel | MealReservationRowVM) {
    this.opMealReservation?.hide();
    this.router.navigate(['/meal-reservations/', mealReservation.id]);
  }

  selectedEntry: any;
  @ViewChild('opMealReservation') opMealReservation!: OverlayPanel;

  toggleCogOverlay(event: Event, entry: any) {
    event.stopPropagation();
    const isVisible = this.opMealReservation?.overlayVisible;
    const isDifferent = this.selectedEntry?.id !== entry.id;
    this.selectedEntry = entry;

    if (isVisible && isDifferent) {
      this.opMealReservation.hide();
      setTimeout(() => {
        this.opMealReservation.show(event, event.currentTarget as HTMLElement);
      }, 50);
    } else {
      this.opMealReservation.toggle(event, event.currentTarget as HTMLElement);
    }
  }

  openOverlay(event: MouseEvent, entry: any) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedEntry = entry;
    this.opMealReservation.show(event);

    setTimeout(() => {
      const panelEl = this.opMealReservation?.container as HTMLElement;
      if (panelEl) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = panelEl.getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        if (left + panelRect.width > viewportWidth) {
          left = viewportWidth - panelRect.width - 15;
        }
        if (left < 15) {
          left = 15;
        }
        if (top + panelRect.height > viewportHeight) {
          top = viewportHeight - panelRect.height - 15;
        }
        if (top < 15) {
          top = 15;
        }

        panelEl.style.position = 'fixed';
        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        panelEl.style.transform = 'none';
        panelEl.style.margin = '0';
        panelEl.style.zIndex = '99999';
      }
    }, 0);
  }
}
