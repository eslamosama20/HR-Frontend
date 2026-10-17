import { Component, LOCALE_ID, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { RoleModel } from '../../models/auth/role.model';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { TranslationService } from '../../modules/i18n';
import { RoleService } from '../../services/authorization/role.service';
import primengArTranslations from '../../utils/primengArTranslations';
import { Table, TableModule } from 'primeng/table';
import * as FileSaver from 'file-saver';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { OverlayPanelModule, OverlayPanel } from 'primeng/overlaypanel';
import { InputTextModule } from 'primeng/inputtext';
import { CustomDatePipe } from '../../pipes/custom-date.pipe';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-roles-management',
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    TableModule,
    OverlayPanelModule,
    InputTextModule,
    RouterModule,
    CustomDatePipe,
  ],
  providers: [
    ConfirmationService,
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
})
export class RolesManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  roleSignal = signal<RoleModel[]>([]);
  get roles() {
    return this.roleSignal();
  }
  set roles(value) {
    this.roleSignal.set(value);
  }

  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  selectedRole: RoleModel | null = null;
  @ViewChild('opRole') opRole!: OverlayPanel;

  constructor(
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public roleService: RoleService,
    private router: Router
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {
        field: 'name',
        header: this.translate.instant('FINANCE.NAME'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date',
      },
    ];
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoles() {
    this.loading = true;
    this.roleService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.roles = roles
            .filter((x) => x.name !== 'System.Admin')
            .map((x) => {
              x.createdAt = new Date(x.createdAt);
              return x;
            });
          this.loading = false;
        },
        error: (error) => {
          console.error('Error Loading Roles', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.ROLES_LOADING_ERROR'),
          });
        },
      });
  }

  showRoleDialog(role: RoleModel) {
    this.router.navigate(['/roles-management/view', role.id]);
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    this.searchValue = trimmedValue;
    dt1.filterGlobal(trimmedValue, 'contains');
  }

  deleteRole(role: RoleModel) {
    if (role.name === 'System.Admin') {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.SYSTEM_ROLE_DELETE_ERROR'),
      });
      return;
    }
    this.roleService
      .delete(role.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('FINANCE.CONFIRMED'),
            detail: this.translate.instant('FINANCE.ROLE_DELETED'),
          });
          this.loadRoles();
        },
        error: (error) => {
          console.error('Error Deleting Role', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.ROLES_DELETING_ERROR'),
          });
        },
      });
  }

  confirmRoleDeletion(event: Event, role: any) {
    if (this.opRole) {
      this.opRole.hide();
    }
    this.confirmationService.confirm({
      message: this.translate.instant('FINANCE.CONFIRM_ROLE_DELETE', {
        roleName: role?.name,
      }),
      header: this.translate.instant('FINANCE.ROLE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: 'p-button-danger p-button-text rounded-md ',
      rejectButtonStyleClass: 'p-button-text p-button-text rounded-md ',
      acceptIcon: 'none',
      rejectIcon: 'none',
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        if (role) {
          this.deleteRole(role);
        }
      },
    });
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const data = this.roles.map((y: any) => {
        const row: Record<string, any> = {};
        this.columns.forEach((x) => {
          if (x.filterType === 'date') {
            row[x.header] = y[x.field]
              ? new Date(y[x.field]).toLocaleString('ar-SA-u-ca-gregory', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '-';
          } else {
            row[x.header] = y[x.field] ?? '-';
          }
        });
        return row;
      });
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'Roles');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE,
    });
    FileSaver.saveAs(
      data,
      fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION
    );
  }

  showRoleOverlay(event: MouseEvent | any, role: any) {
    if (event.preventDefault) {
      event.preventDefault();
    }
    if (event.stopPropagation) {
      event.stopPropagation();
    }

    const isVisible = this.opRole.overlayVisible;
    const isDifferent = this.selectedRole?.id !== role.id;
    this.selectedRole = role;

    if (isVisible && isDifferent) {
      this.opRole.show(event);
    } else {
      this.opRole.toggle(event);
    }

    // Position panel at exact click location (mouse position)
    setTimeout(() => {
      const panelEl = this.opRole.container as HTMLElement;
      if (!panelEl) return;

      if (event.clientX !== undefined && event.clientY !== undefined) {
        panelEl.style.position = 'fixed';
        const panelWidth = panelEl.offsetWidth || 180;
        const panelHeight = panelEl.offsetHeight || 100;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.clientX;
        let top = event.clientY;

        if (left + panelWidth > windowWidth - 10) {
          left = windowWidth - panelWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }

        if (top + panelHeight > windowHeight - 10) {
          top = windowHeight - panelHeight - 10;
        }

        panelEl.style.left = `${left}px`;
        panelEl.style.top = `${top}px`;
        panelEl.style.zIndex = '9999';
      }
    });
  }
}
