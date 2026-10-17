import { Component, DestroyRef, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/modules/auth';
import {
  CreateTableRequest,
  DiningArea,
  DiningTable,
  DiningTableStatus
} from 'src/app/models/cashier/restaurant-mode.model';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';

interface AreaSection {
  area: DiningArea;
  tables: DiningTable[];
}

@Component({
  selector: 'app-restaurant-floor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './restaurant-floor.component.html',
  styleUrls: ['./restaurant-floor.component.scss']
})
export class RestaurantFloorComponent implements OnInit {
  readonly tableStatus = DiningTableStatus;

  tables = signal<DiningTable[]>([]);
  areas = signal<DiningArea[]>([]);
  canManageLayout = signal<boolean>(false);

  searchTerm = '';
  selectedAreaId = '';
  selectedStatus: DiningTableStatus | 'all' = 'all';
  isEditMode = false;

  showAddDialog = false;
  showEditDialog = false;

  newTable: CreateTableRequest = {
    tableNumber: '',
    seats: 4,
    areaId: 'main',
    notes: ''
  };

  editingTableId: number | null = null;
  editModel: CreateTableRequest = {
    tableNumber: '',
    seats: 4,
    areaId: 'main',
    notes: ''
  };

  get totalTablesCount(): number {
    return this.tables().length;
  }

  get newOrderCount(): number {
    return this.tables().filter(t => t.status === DiningTableStatus.NewOrder).length;
  }

  get readyToPayCount(): number {
    return this.tables().filter(t => t.status === DiningTableStatus.ReadyToPay).length;
  }

  get cleaningCount(): number {
    return this.tables().filter(t => t.status === DiningTableStatus.Cleaning).length;
  }

  getAreaTableCount(areaId: string): number {
    return this.tables().filter(t => t.areaId === areaId).length;
  }

  getAreaOccupiedCount(areaId: string): number {
    return this.tables().filter(t => t.areaId === areaId && t.status !== DiningTableStatus.Available).length;
  }

  selectAreaFilter(areaId: string): void {
    this.selectedAreaId = areaId;
  }

  selectStatusFilter(status: DiningTableStatus | 'all'): void {
    this.selectedStatus = status;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedAreaId = '';
    this.selectedStatus = 'all';
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim() || !!this.selectedAreaId || this.selectedStatus !== 'all';
  }

  getStatusIcon(status: DiningTableStatus): string {
    switch (status) {
      case DiningTableStatus.Available:
        return 'pi pi-check-circle';
      case DiningTableStatus.Occupied:
        return 'pi pi-users';
      case DiningTableStatus.NewOrder:
        return 'pi pi-bell';
      case DiningTableStatus.ReadyToPay:
        return 'pi pi-wallet';
      case DiningTableStatus.Cleaning:
        return 'pi pi-sparkles';
      default:
        return 'pi pi-circle';
    }
  }

  constructor(
    private restaurantModeService: RestaurantModeService,
    private authService: AuthService,
    private messageService: MessageService,
    private translateService: TranslateService,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.areas.set(this.restaurantModeService.getAreas());

    this.newTable.areaId = this.areas()[0]?.id || 'main';
    this.editModel.areaId = this.newTable.areaId;

    this.restaurantModeService.tables$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(tables => {
        this.tables.set(tables);
      });

    this.restaurantModeService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        let severity = 'info';
        let summary = 'تحديث الطاولة';
        let life = 5000;

        switch (event.type) {
          case 'NEW_ORDER':
            severity = 'warn';
            summary = 'طلب جديد';
            life = 8000;
            break;
          case 'ORDER_READY':
            severity = 'success';
            summary = 'جاهز للتقديم';
            life = 8000;
            break;
          case 'BILL_REQUEST':
            severity = 'info';
            summary = 'طلب الحساب';
            life = 8000;
            break;
          case 'ORDER_PREPARING':
            severity = 'info';
            summary = 'قيد التحضير';
            break;
          case 'ORDER_PAID':
            severity = 'success';
            summary = 'تم الدفع';
            break;
          case 'TABLE_STATUS_CHANGED':
            severity = 'info';
            summary = 'تحديث حالة الطاولة';
            break;
        }

        this.playGenericSound(event.type);
        this.messageService.add({
          severity,
          summary,
          detail: event.message,
          life
        });
      });

    this.loadPermissions();
  }

  get sections(): AreaSection[] {
    const visible = this.filteredTables;
    return this.areas()
      .filter(area => !this.selectedAreaId || area.id === this.selectedAreaId)
      .map(area => ({
        area,
        tables: visible.filter(table => table.areaId === area.id)
      }))
      .filter(section => section.tables.length > 0 || !this.searchTerm.trim());
  }

  get filteredTables(): DiningTable[] {
    const keyword = this.searchTerm.trim().toLowerCase();

    return this.tables().filter(table => {
      const areaMatch = !this.selectedAreaId || table.areaId === this.selectedAreaId;
      const statusMatch = this.selectedStatus === 'all' || table.status === this.selectedStatus;
      const textMatch =
        !keyword ||
        table.tableNumber.toLowerCase().includes(keyword) ||
        table.areaName.toLowerCase().includes(keyword);

      return areaMatch && statusMatch && textMatch;
    });
  }

  get areaOptions(): Array<{ label: string; value: string }> {
    return this.areas().map(area => ({
      label: area.name,
      value: area.id
    }));
  }

  get availableCount(): number {
    return this.tables().filter(table => table.status === DiningTableStatus.Available).length;
  }

  get occupiedCount(): number {
    return this.tables().filter(table => table.status === DiningTableStatus.Occupied).length;
  }

  get needsActionCount(): number {
    return this.tables().filter(table =>
      table.status === DiningTableStatus.NewOrder ||
      table.status === DiningTableStatus.ReadyToPay
    ).length;
  }

  get totalOpenAmount(): number {
    return this.tables().reduce((sum, table) => sum + table.unpaidTotal, 0);
  }

  toggleEditMode(): void {
    if (!this.canManageLayout()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_FLOOR.NOTIFY_PERMISSION_DENIED'),
        detail: this.translateService.instant('CASHIER_FLOOR.NOTIFY_PERMISSION_DETAIL')
      });
      return;
    }

    this.isEditMode = !this.isEditMode;
  }

  openAddTableDialog(): void {
    if (!this.canManageLayout()) {
      this.toggleEditMode();
      return;
    }

    this.newTable = {
      tableNumber: '',
      seats: 4,
      areaId: this.selectedAreaId || this.areas()[0]?.id || 'main',
      notes: ''
    };
    this.showAddDialog = true;
  }

  createTable(): void {
    if (!this.newTable.tableNumber?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('CASHIER_FLOOR.NOTIFY_ALERT'),
        detail: this.translateService.instant('CASHIER_FLOOR.NOTIFY_FIELD_REQUIRED')
      });
      return;
    }

    this.restaurantModeService.createTable(this.newTable);
    this.showAddDialog = false;
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_FLOOR.NOTIFY_DONE'),
      detail: this.translateService.instant('CASHIER_FLOOR.NOTIFY_ADD_SUCCESS')
    });
  }

  editTable(table: DiningTable): void {
    if (!this.canManageLayout()) {
      return;
    }

    this.editingTableId = table.id;
    this.editModel = {
      tableNumber: table.tableNumber,
      seats: table.seats,
      areaId: table.areaId,
      notes: table.notes || ''
    };
    this.showEditDialog = true;
  }

  saveTableChanges(): void {
    if (!this.editingTableId) {
      return;
    }

    this.restaurantModeService.updateTable(this.editingTableId, this.editModel);
    this.showEditDialog = false;
    this.editingTableId = null;
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('CASHIER_FLOOR.BTN_SAVE_CHANGES'),
      detail: this.translateService.instant('CASHIER_FLOOR.NOTIFY_UPDATE_SUCCESS')
    });
  }

  deleteTable(table: DiningTable): void {
    if (!this.canManageLayout()) {
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف الطاولة "${table.tableNumber}"؟`)) {
      return;
    }

    const success = this.restaurantModeService.deleteTable(table.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'تم الحذف',
        detail: 'تم حذف الطاولة بنجاح'
      });
    }
  }

  openCustomerScreen(table: DiningTable, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const token = table.token || `table-${table.id}`;
    window.open(`/self-order/${token}`, '_blank');
  }

  moveTable(table: DiningTable, direction: -1 | 1): void {
    if (!this.restaurantModeService.moveTable(table.id, direction)) {
      return;
    }

    this.messageService.add({
      severity: 'info',
      summary: this.translateService.instant('CASHIER_FLOOR.NOTIFY_MOVE_SUCCESS'),
      detail: this.translateService.instant('CASHIER_FLOOR.NOTIFY_MOVE_SUCCESS')
    });
  }

  setStatus(table: DiningTable, status: DiningTableStatus): void {
    this.restaurantModeService.setTableStatus(table.id, status);
  }

  vacateTable(table: DiningTable, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const success = this.restaurantModeService.vacateTable(table.id);
    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'تم الإخلاء',
        detail: `تم إخلاء الطاولة ${table.tableNumber} وأصبحت متاحة للعملاء`
      });
    }
  }

  async createDemoOrder(table: DiningTable): Promise<void> {
    const result = await this.restaurantModeService.createDemoSelfOrder(table.id);
    this.messageService.add({
      severity: result.success ? 'success' : 'warn',
      summary: result.success ? this.translateService.instant('CASHIER_FLOOR.NOTIFY_DONE') : this.translateService.instant('CASHIER_FLOOR.NOTIFY_ALERT'),
      detail: result.success
        ? this.translateService.instant('CASHIER_FLOOR.NOTIFY_DEMO_SUCCESS', { no: table.tableNumber })
        : (result.message || this.translateService.instant('CASHIER_FLOOR.NOTIFY_DEMO_ERROR'))
    });
  }

  getStatusLabel(status: DiningTableStatus): string {
    const labels: Record<DiningTableStatus, string> = {
      [DiningTableStatus.Available]: this.translateService.instant('CASHIER_FLOOR.STATUS_AVAILABLE'),
      [DiningTableStatus.Occupied]: this.translateService.instant('CASHIER_FLOOR.STATUS_OCCUPIED'),
      [DiningTableStatus.NewOrder]: this.translateService.instant('CASHIER_FLOOR.STATUS_NEW_ORDER'),
      [DiningTableStatus.ReadyToPay]: this.translateService.instant('CASHIER_FLOOR.STATUS_READY_PAY'),
      [DiningTableStatus.Cleaning]: this.translateService.instant('CASHIER_FLOOR.STATUS_CLEANING')
    };
    return labels[status];
  }

  trackByTable(_: number, table: DiningTable): number {
    return table.id;
  }

  private loadPermissions(): void {
    this.authService.getUserByToken().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        const roleNames = user?.userRoles
          ?.map(userRole => userRole?.role?.name?.toLowerCase().trim())
          .filter((name): name is string => !!name) || [];

        const allowed = roleNames.some(roleName =>
          roleName === 'system.admin' ||
          roleName === 'admin' ||
          roleName === 'administrator' ||
          roleName === 'system.manager' ||
          roleName === 'manager' ||
          roleName.endsWith('.admin') ||
          roleName.endsWith('.manager') ||
          roleName.includes('مدير')
        );

        this.canManageLayout.set(allowed);
      },
      error: () => this.canManageLayout.set(false)
    });
  }

  private playGenericSound(type: string): void {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'NEW_ORDER') {
        // Double soft beep
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.15); // E5
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
      } else if (type === 'ORDER_READY') {
        // High energetic beep
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, now); // A4
        oscillator.frequency.setValueAtTime(880, now + 0.1); // A5
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
      } else if (type === 'BILL_REQUEST') {
        // Distinct alert beep
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(349.23, now); // F4
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
      } else if (type === 'ORDER_PAID') {
        // Success chime (arpeggio)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
      } else {
        // Generic click/beep
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }
    } catch { }
  }
}
