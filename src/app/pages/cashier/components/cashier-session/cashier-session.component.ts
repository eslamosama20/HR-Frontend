import { Component, OnInit, OnDestroy, signal, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { CashierService } from 'src/app/services/cashier/cashier.service';
import { CashierSession, CashierSessionStatus } from 'src/app/models/cashier/cashier-session.model';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';
import { StoreDetailsService } from 'src/app/services/inventory/store-details.service';
import { isPharmacyStore } from 'src/app/models/inventory/storeDetails.model';
import { UserManagementService } from 'src/app/services/user-management/user-management.service';
import { AuthService } from 'src/app/modules/auth';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-cashier-session',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputNumberModule,
    InputTextareaModule,
    InputTextModule,
    RadioButtonModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CustomDatePipe
  ],
  providers: [MessageService],
  templateUrl: './cashier-session.component.html',
  styleUrls: ['./cashier-session.component.scss']
})
export class CashierSessionComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  
  loading = signal<boolean>(false);
  sessions = signal<CashierSession[]>([]);
  currentSession = signal<CashierSession | null>(null);
  sessionSummary = signal<any>(null);

  // Search & Filter Properties
  searchValue: string = '';
  statusFilter: 'all' | 'open' | 'closed' = 'all';
  columns: Array<{
    field: string;
    header: string;
    filter: boolean;
    filterType: string;
    minWidth?: string;
  }> = [];

  get activeLanguage(): string {
    return this.translateService.currentLang || 'ar';
  }

  // Dialog Controls
  showOpenSessionDialog = false;
  showCloseSessionDialog = false;
  showCashActionDialog = false;
  showSessionDetailsDialog = false;
  showActiveSessionConflictDialog = false;
  showSupervisorOverrideDialog = false;

  // Form Data
  openingBalance: number | null = null;
  stockAlertLimit: number | null = null;
  actualBalance: number = 0;
  closingNotes: string = '';
  cashActionType: 'in' | 'out' = 'in';
  cashActionAmount: number = 0;
  cashActionReason: string = '';
  selectedSession: CashierSession | null = null;
  conflictingSession: CashierSession | null = null;
  selectedStoreDetailsId: string | null = null;
  selectedStoreDetailsIds: string[] = [];
  supervisorId: string = '';
  approvalPasscode: string = '';
  terminalId: string = 'POS-01';
  discrepancyDetails: {
    expectedCash: number;
    actualCash: number;
    discrepancy: number;
    threshold: number;
    message?: string;
  } | null = null;

  canCloseAny = signal<boolean>(false);
  canViewAll = signal<boolean>(false);
  canSetCustomNumber = signal<boolean>(false);
  canSetAlertLimit = signal<boolean>(false);
  sessionToClose: CashierSession | null = null;
  customSessionNumber: string = '';
  pendingHeldOrders: any[] = [];
  checkingHeldOrders = signal<boolean>(false);
  showEditStoresDialog = false;
  editSessionStoreIds: string[] = [];

  allStoresMap = new Map<string, string>();
  storeOptions: Array<{ label: string; value: string }> = [];
  storesLoading = false;
  shiftDurationHours: number | null = null;
  isExpired: boolean = false;
  supervisorsList: Array<{ label: string; value: string }> = [];

  constructor(
    private cashierService: CashierService,
    private messageService: MessageService,
    private translateService: TranslateService,
    private storeDetailsService: StoreDetailsService,
    private userService: UserManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initColumns();
    this.loadStoreOptions();
    this.loadCurrentSession();
    this.loadSessionsHistory();
    this.loadSupervisors();
    this.loadUserPermissions();

    this.cashierService.sessionExpired$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(expiredSession => {
      this.isExpired = !!expiredSession;
      if (expiredSession) {
        this.openCloseSessionDialog();
      }
    });
  }

  initColumns(): void {
    this.columns = [
      {
        field: 'sessionNumber',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_SESSION_NO') || 'رقم الوردية',
        filter: true,
        filterType: 'text',
        minWidth: '10.5rem'
      },
      {
        field: 'cashierUserName',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_CASHIER') || 'الكاشير',
        filter: true,
        filterType: 'text',
        minWidth: '11rem'
      },
      {
        field: 'storeName',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_STORE') || 'المخزن',
        filter: true,
        filterType: 'text',
        minWidth: '12rem'
      },
      {
        field: 'openingDate',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_OPEN_TIME') || 'وقت الفتح',
        filter: true,
        filterType: 'date',
        minWidth: '12rem'
      },
      {
        field: 'closingDate',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_CLOSE_TIME') || 'وقت الإغلاق',
        filter: true,
        filterType: 'date',
        minWidth: '12rem'
      },
      {
        field: 'openingBalance',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_OPENING_BALANCE') || 'رصيد الافتتاح',
        filter: true,
        filterType: 'numeric',
        minWidth: '10.5rem'
      },
      {
        field: 'totalSales',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_TOTAL_SALES') || 'إجمالي المبيعات',
        filter: true,
        filterType: 'numeric',
        minWidth: '10.5rem'
      },
      {
        field: 'expectedBalance',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_EXPECTED_CASH') || 'الرصيد المتوقع',
        filter: true,
        filterType: 'numeric',
        minWidth: '10.5rem'
      },
      {
        field: 'difference',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_DIFFERENCE') || 'الفارق',
        filter: true,
        filterType: 'numeric',
        minWidth: '9.5rem'
      },
      {
        field: 'status',
        header: this.translateService.instant('CASHIER_SESSION.TABLE_STATUS') || 'الحالة',
        filter: true,
        filterType: 'text',
        minWidth: '9.5rem'
      }
    ];
  }

  getSessionStoreNames(session?: CashierSession | null): string {
    if (!session) return '-';

    // 1. Check if multiple stores were saved for this session in localStorage
    if (session.id) {
      const stored = localStorage.getItem(`cashier_session_stores_${session.id}`);
      if (stored) {
        try {
          const ids: string[] = JSON.parse(stored);
          if (Array.isArray(ids) && ids.length > 0) {
            const names = ids
              .map(id => this.allStoresMap.get(id?.toLowerCase()) || this.storeOptions.find(s => s.value.toLowerCase() === id?.toLowerCase())?.label)
              .filter((name): name is string => !!name);
            if (names.length > 0) {
              return names.join(' ، ');
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 2. Check storeDetailsId in map
    if (session.storeDetailsId) {
      const name = this.allStoresMap.get(session.storeDetailsId.toLowerCase()) ||
                   this.storeOptions.find(s => s.value.toLowerCase() === session.storeDetailsId?.toLowerCase())?.label;
      if (name) return name;
    }

    // 3. Fallback to API storeName
    if (session.storeName) {
      return session.storeName;
    }

    // 4. Fallback to treasury/branch if present
    if (session.treasuryName || session.branchName) {
      return `${session.treasuryName || ''} ${session.branchName ? '- ' + session.branchName : ''}`.trim();
    }

    return '-';
  }

  loadSupervisors(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.supervisorsList = users
          .filter(u => u.isActive)
          .map(u => ({
            label: `${u.firstName || ''} ${u.lastName || ''} (${u.userName})`.trim() || u.email,
            value: u.id!
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تحميل قائمة المشرفين'
        });
      }
    });
  }

  loadUserPermissions(): void {
    this.authService.getUserByToken().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        if (!user) {
          this.canCloseAny.set(false);
          this.canViewAll.set(false);
          return;
        }
        const isAdmin = user.userRoles?.some(ur => {
          const name = ur.role?.name?.toLowerCase().trim() || '';
          return name === 'admin' || name === 'administrator' || name === 'system.admin';
        });
        const hasCloseAnyPermission = user.userRoles?.some(ur =>
          ur.role?.rolePermissions?.some(rp => rp.permission?.name === 'Cashier.Session.CloseAny')
        );
        const hasViewAllPermission = user.userRoles?.some(ur =>
          ur.role?.rolePermissions?.some(rp => rp.permission?.name === 'Cashier.Session.ViewAll')
        );
        const hasCustomNumPermission = user.userRoles?.some(ur =>
          ur.role?.rolePermissions?.some(rp => rp.permission?.name === 'Cashier.Session.SetCustomNumber')
        );
        const hasAlertLimitPermission = user.userRoles?.some(ur =>
          ur.role?.rolePermissions?.some(rp => rp.permission?.name === 'Cashier.Session.SetAlertLimit')
        );
        this.canCloseAny.set(!!isAdmin || !!hasCloseAnyPermission);
        this.canViewAll.set(!!isAdmin || !!hasViewAllPermission);
        this.canSetCustomNumber.set(!!isAdmin || !!hasCustomNumPermission);
        this.canSetAlertLimit.set(!!isAdmin || !!hasAlertLimitPermission);
      },
      error: () => {
        this.canCloseAny.set(false);
        this.canViewAll.set(false);
        this.canSetCustomNumber.set(false);
        this.canSetAlertLimit.set(false);
      }
    });
  }

  loadStoreOptions(): void {
    this.storesLoading = true;
    this.storeDetailsService.getAll().subscribe({
      next: (stores) => {
        this.storesLoading = false;
        
        stores.forEach(store => {
          if (store.id) {
            const name = this.currentLangIsAr()
              ? (store.arabicName || store.englishName || store.id)
              : (store.englishName || store.arabicName || store.id);
            this.allStoresMap.set(store.id.toLowerCase(), name);
          }
        });

        const hasPharmacyPerm = this.authService.hasPermission('Cashier.Pharmacy');
        const hasPosPerm = this.authService.hasPermission('Cashier.POS');
        const isDevOrAdmin = this.authService.hasPermission('System.Admin') || this.authService.hasPermission('System.Developer');

        let filteredStores = stores.filter(store => store.isActive && !!store.id);

        if (!isDevOrAdmin) {
          if (hasPharmacyPerm && !hasPosPerm) {
            // المستخدم صيدلية فقط -> إظهار مخازن الصيدليات فقط
            filteredStores = filteredStores.filter(s => 
              isPharmacyStore(s) || 
              (s.arabicName && (s.arabicName.includes('صيدل') || s.arabicName.toLowerCase().includes('pharmacy'))) ||
              (s.englishName && s.englishName.toLowerCase().includes('pharmacy'))
            );
          } else if (hasPosPerm && !hasPharmacyPerm) {
            // المستخدم سوبر ماركت / بيع عادي فقط -> إظهار المخازن غير الصيدليات
            filteredStores = filteredStores.filter(s => 
              !isPharmacyStore(s) && 
              !(s.arabicName && (s.arabicName.includes('صيدل') || s.arabicName.toLowerCase().includes('pharmacy'))) &&
              !(s.englishName && s.englishName.toLowerCase().includes('pharmacy'))
            );
          }
        }

        this.storeOptions = filteredStores
          .map(store => ({
            label: this.currentLangIsAr()
              ? (store.arabicName || store.englishName || store.id!)
              : (store.englishName || store.arabicName || store.id!),
            value: store.id!
          }))
          .sort((left, right) => left.label.localeCompare(right.label, this.currentLangIsAr() ? 'ar' : 'en'));
      },
      error: () => {
        this.storesLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
          detail: 'فشل في تحميل المخازن'
        });
      }
    });
  }

  private currentLangIsAr(): boolean {
    return (this.translateService.currentLang || '').toLowerCase().startsWith('ar');
  }

  loadCurrentSession(): void {
    this.cashierService.currentSession$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
      this.currentSession.set(session);
      if (session && session.id) {
        this.loadSessionSummary(session.id);
      } else {
        this.sessionSummary.set(null);
      }
    });
  }

  loadSessionsHistory(): void {
    this.loading.set(true);
    this.cashierService.getSessions(1, 100).pipe(
      map(response => response.items)
    ).subscribe({
      next: (items) => {
        const enriched = (items || []).map(session => ({
          ...session,
          storeName: session.storeName || this.getSessionStoreNames(session),
          openingDate: session.openingDate ? new Date(session.openingDate) : undefined,
          closingDate: session.closingDate ? new Date(session.closingDate) : undefined
        }));
        this.sessions.set(enriched);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
          detail: this.translateService.instant('CASHIER_SESSION.FAILED_TO_LOAD')
        });
      }
    });
  }

  loadSessionSummary(sessionId: number): void {
    this.cashierService.getSessionSummary(sessionId).subscribe(summary => {
      this.sessionSummary.set(summary);
    });
  }

  openNewSessionDialog(): void {
    // Check if there is already an active session in the state
    const activeSession = this.currentSession();
    if (activeSession) {
      this.conflictingSession = activeSession;
      this.showActiveSessionConflictDialog = true;
      return;
    }

    this.openingBalance = null;
    this.stockAlertLimit = null;
    this.shiftDurationHours = null;
    this.selectedStoreDetailsId = null;
    this.selectedStoreDetailsIds = [];
    this.customSessionNumber = '';
    this.showOpenSessionDialog = true;
  }

  openNewSession(): void {
    if (!this.selectedStoreDetailsIds || this.selectedStoreDetailsIds.length === 0) {
       this.messageService.add({
         severity: 'warn',
         summary: this.translateService.instant('CASHIER_POS.WARNING'),
         detail: 'يرجى اختيار المخزن أولاً'
       });
       return;
    }

    this.selectedStoreDetailsId = this.selectedStoreDetailsIds[0];

    this.loading.set(true);
    const balance = this.openingBalance !== null && this.openingBalance !== undefined ? this.openingBalance : 0;
    const duration = this.shiftDurationHours !== null && this.shiftDurationHours !== undefined ? this.shiftDurationHours : 8;
    // Passing storeDetailsId as the 3rd argument, terminalId as 4th, shiftDurationHours as 5th, customSessionNumber as 6th, stockAlertLimit as 7th
    this.cashierService.openSession(balance, undefined, this.selectedStoreDetailsId, this.terminalId, duration, this.customSessionNumber, this.stockAlertLimit || undefined).subscribe({
      next: (session) => {
        if (session && session.id) {
          localStorage.setItem(`cashier_session_stores_${session.id}`, JSON.stringify(this.selectedStoreDetailsIds));
        }
        this.showOpenSessionDialog = false;
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('CASHIER_SESSION.SUCCESS'),
          detail: this.translateService.instant('CASHIER_SESSION.SESSION_OPENED')
        });
        this.loadSessionsHistory();
      },
      error: (err) => {
        this.loading.set(false);
        // Handle specialized error for active session conflict / terminal lock
        if (err.status === 409) {
          this.showOpenSessionDialog = false;
          this.conflictingSession = err.error?.activeSession || null;
          this.showActiveSessionConflictDialog = true;
          this.messageService.add({
            severity: 'warn',
            summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
            detail: err.error?.messageAr || err.error?.message || 'المحطة مستخدمة بالفعل من كاشير آخر. تطلب موافقة المشرف للتجاوز.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
            detail: err.error?.messageAr || err.error?.message || 'فشل فتح الوردية'
          });
        }
      }
    });
  }

  openEditSessionStoresDialog(): void {
    const session = this.currentSession();
    if (!session || !session.id) return;
    const stored = localStorage.getItem(`cashier_session_stores_${session.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.editSessionStoreIds = Array.isArray(parsed) ? parsed : (session.storeDetailsId ? [session.storeDetailsId] : []);
      } catch {
        this.editSessionStoreIds = session.storeDetailsId ? [session.storeDetailsId] : [];
      }
    } else {
      this.editSessionStoreIds = session.storeDetailsId ? [session.storeDetailsId] : [];
    }
    this.showEditStoresDialog = true;
  }

  saveEditedSessionStores(): void {
    const session = this.currentSession();
    if (!session || !session.id) return;
    if (!this.editSessionStoreIds || this.editSessionStoreIds.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تنبيه',
        detail: 'يجب اختيار مخزن واحد على الأقل للوردية.'
      });
      return;
    }

    localStorage.setItem(`cashier_session_stores_${session.id}`, JSON.stringify(this.editSessionStoreIds));
    this.showEditStoresDialog = false;
    this.messageService.add({
      severity: 'success',
      summary: 'تم الحفظ',
      detail: 'تم تحديث قائمة مخازن الوردية بنجاح.'
    });
  }

  getSelectedStoreNames(): string[] {
    if (!this.editSessionStoreIds || this.editSessionStoreIds.length === 0) return [];
    return this.editSessionStoreIds
      .map(id => this.allStoresMap.get(id?.toLowerCase()) || this.storeOptions.find(opt => opt.value.toLowerCase() === id?.toLowerCase())?.label)
      .filter((name): name is string => !!name);
  }

  getLocalHeldOrdersCount(sessionId?: number | null): number {
    if (!sessionId) return 0;
    try {
      const data = localStorage.getItem(`pos_held_orders_${sessionId}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  checkAndLoadHeldOrders(session: CashierSession, callback?: (hasHeld: boolean) => void): void {
    if (!session || !session.id) {
      this.pendingHeldOrders = [];
      if (callback) callback(false);
      return;
    }

    const localCount = this.getLocalHeldOrdersCount(session.id);
    this.checkingHeldOrders.set(true);
    this.cashierService.getHeldOrders({
      sessionId: session.id
    }).subscribe({
      next: (orders) => {
        this.checkingHeldOrders.set(false);
        const backendCount = orders ? orders.length : 0;
        const count = Math.max(backendCount, localCount);
        this.pendingHeldOrders = (orders && orders.length > 0) ? orders : new Array(count).fill({});
        if (callback) callback(count > 0);
      },
      error: () => {
        this.checkingHeldOrders.set(false);
        this.pendingHeldOrders = localCount > 0 ? new Array(localCount).fill({}) : [];
        if (callback) callback(localCount > 0);
      }
    });
  }

  openCloseSessionDialog(): void {
    this.sessionToClose = null;
    const session = this.currentSession();
    this.actualBalance = 0;
    this.closingNotes = '';
    this.pendingHeldOrders = [];
    if (session) {
      this.checkAndLoadHeldOrders(session, (hasHeld) => {
        if (hasHeld) {
          this.messageService.add({
            severity: 'warn',
            summary: 'يوجد طلبات معلقة',
            detail: `تنبيه: يوجد (${this.pendingHeldOrders.length}) طلب معلق. يجب التعامل مع الطلبات المعلقة أولاً قبل إغلاق الوردية.`,
            life: 7000
          });
        }
      });
    }
    this.showCloseSessionDialog = true;
  }

  closeOtherSession(session: CashierSession): void {
    this.sessionToClose = session;
    this.showSessionDetailsDialog = false;
    this.actualBalance = 0;
    this.closingNotes = '';
    this.pendingHeldOrders = [];
    this.checkAndLoadHeldOrders(session, (hasHeld) => {
      if (hasHeld) {
        this.messageService.add({
          severity: 'warn',
          summary: 'يوجد طلبات معلقة',
          detail: `تنبيه: يوجد (${this.pendingHeldOrders.length}) طلب معلق في هذه الوردية. يجب التعامل معها قبل الإغلاق.`,
          life: 7000
        });
      }
    });
    this.showCloseSessionDialog = true;
  }

  closeSession(supervisorId?: string): void {
    const session = this.sessionToClose || this.currentSession();
    if (!session || !session.id) return;

    const localCount = this.getLocalHeldOrdersCount(session.id);
    if (localCount > 0) {
      this.pendingHeldOrders = new Array(localCount).fill({});
      this.messageService.add({
        severity: 'error',
        summary: 'يوجد طلبات معلقة',
        detail: `تنبيه: يوجد (${localCount}) طلب معلق. يجب اتخاذ إجراء بشأن جميع الطلبات المعلقة أولاً قبل إغلاق الوردية.`,
        life: 8000
      });
      return;
    }

    this.loading.set(true);
    // Double check with backend by sessionId before closing
    this.cashierService.getHeldOrders({ sessionId: session.id }).subscribe({
      next: (orders) => {
        const backendCount = orders ? orders.length : 0;
        const totalCount = Math.max(backendCount, this.getLocalHeldOrdersCount(session.id));
        if (totalCount > 0) {
          this.pendingHeldOrders = (orders && orders.length > 0) ? orders : new Array(totalCount).fill({});
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'يوجد طلبات معلقة',
            detail: `تنبيه: يوجد (${totalCount}) طلب معلق. يجب اتخاذ إجراء بشأن جميع الطلبات المعلقة أولاً قبل إغلاق الوردية.`,
            life: 8000
          });
          return;
        }

        const approval = supervisorId ? { supervisorId, approvalPasscode: this.approvalPasscode } : undefined;
        this.cashierService.closeSession(session.id, this.actualBalance, this.closingNotes, approval).subscribe({
          next: () => {
            if (session.id) {
              localStorage.removeItem(`pos_held_orders_${session.id}`);
            }
            this.showCloseSessionDialog = false;
            this.showSupervisorOverrideDialog = false;
            this.supervisorId = '';
            this.approvalPasscode = '';
            this.discrepancyDetails = null;
            this.sessionToClose = null;
            this.loading.set(false);
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('CASHIER_SESSION.SUCCESS'),
              detail: this.translateService.instant('CASHIER_SESSION.SESSION_CLOSED_MSG')
            });
            this.loadSessionsHistory();
            this.loadCurrentSession();
          },
          error: (err) => {
            this.loading.set(false);
            const errData = err.error;
            if (err.status === 401 && errData?.errorCode === 'SUPERVISOR_AUTH_FAILED') {
              this.messageService.add({
                severity: 'error',
                summary: 'فشل اعتماد المشرف',
                detail: errData?.messageAr || errData?.message || 'رمز مرور أو معرف المشرف غير صحيح.'
              });
            } else if (
              errData?.requiresSupervisorApproval === true ||
              (err.status === 400 && (errData?.message?.toLowerCase().includes('discrepancy') || errData?.messageAr?.includes('عجز') || errData?.messageAr?.includes('فارق')))
            ) {
              this.discrepancyDetails = {
                expectedCash: errData?.expectedCash ?? this.expectedBalance,
                actualCash: errData?.actualCash ?? this.actualBalance,
                discrepancy: errData?.discrepancy ?? Math.abs(this.balanceDifference),
                threshold: errData?.threshold ?? 50,
                message: errData?.messageAr || errData?.message
              };
              this.showCloseSessionDialog = false;
              this.showSupervisorOverrideDialog = true;
            } else {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
                detail: errData?.messageAr || errData?.message || 'فشل إغلاق الوردية'
              });
            }
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل التحقق من الطلبات المعلقة للوردية.'
        });
      }
    });
  }

  closeAndOpenNewSession(): void {
    const oldSession = this.conflictingSession;
    if (!oldSession || !oldSession.id) return;

    this.loading.set(true);
    // Simple 0 balance auto-close for convenience in conflict case
    this.cashierService.closeSession(oldSession.id, oldSession.expectedBalance || 0, 'Auto-closed for new session').subscribe({
      next: () => {
        this.showActiveSessionConflictDialog = false;
        this.openNewSession(); // Proceed to open new one
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
          detail: 'فشل إغلاق الوردية السابقة'
        });
      }
    });
  }

  cancelConflictDialog(): void {
    this.showActiveSessionConflictDialog = false;
    this.conflictingSession = null;
  }

  openCashActionDialog(type: 'in' | 'out'): void {
    this.cashActionType = type;
    this.cashActionAmount = 0;
    this.cashActionReason = '';
    this.showCashActionDialog = true;
  }

  submitCashAction(): void {
    const session = this.currentSession();
    if (!session || !session.id || this.cashActionAmount <= 0) return;

    this.loading.set(true);
    this.cashierService.addCashAction(session.id, this.cashActionType, this.cashActionAmount, this.cashActionReason).subscribe({
      next: () => {
        this.showCashActionDialog = false;
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('CASHIER_SESSION.SUCCESS'),
          detail: this.translateService.instant('CASHIER_SESSION.CASH_ACTION_SUCCESS')
        });
        this.loadSessionSummary(session.id!);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('CASHIER_SESSION.ERROR'),
          detail: 'فشل تسجيل الحركة النقدية'
        });
      }
    });
  }

  viewSessionDetails(session: CashierSession): void {
    this.selectedSession = session;
    this.showSessionDetailsDialog = true;
    if (session.id) {
      this.cashierService.getSessionSummary(session.id).subscribe(summary => {
        // For history, we just want to show what was captured
      });
    }
  }

  getStatusLabel(status: CashierSessionStatus): string {
    switch (status) {
      case CashierSessionStatus.Open: return this.translateService.instant('CASHIER_SESSION.STATUS_OPEN');
      case CashierSessionStatus.Closed: return this.translateService.instant('CASHIER_SESSION.STATUS_CLOSED');
      case CashierSessionStatus.Suspended: return this.translateService.instant('CASHIER_SESSION.STATUS_CONFLICT');
      default: return String(status);
    }
  }

  getStatusSeverity(status: CashierSessionStatus): TagSeverity {
    switch (status) {
      case CashierSessionStatus.Open: return 'success';
      case CashierSessionStatus.Closed: return 'danger';
      default: return 'info';
    }
  }

  get expectedBalance(): number {
    const summary = this.sessionSummary();
    const current = this.currentSession();
    if (!summary || !current) return 0;
    // Note: totalCashDropsIn/Out should be part of the summary response
    return (current.openingBalance || 0) + (summary.cashAmount || 0) + (summary.totalCashDropsIn || 0) - (summary.totalCashDropsOut || 0);
  }

  get balanceDifference(): number {
    return this.actualBalance - this.expectedBalance;
  }

  clear(table: Table): void {
    table.clear();
    this.searchValue = '';
    this.statusFilter = 'all';
  }

  trimSearchValue(): void {
    this.searchValue = this.searchValue.trim();
  }

  filter(dt: Table, event: Event): void {
    const target = event.target as HTMLInputElement;
    dt.filterGlobal(target.value.trim(), 'contains');
  }

  onStatusFilterChange(dt: Table): void {
    if (this.statusFilter === 'all') {
      dt.filter(null, 'status', 'equals');
    } else if (this.statusFilter === 'open') {
      dt.filter(0, 'status', 'equals');
    } else if (this.statusFilter === 'closed') {
      dt.filter(1, 'status', 'equals');
    }
  }
}
