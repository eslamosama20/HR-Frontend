import {Component, Input, LOCALE_ID, OnChanges, OnInit, OnDestroy, signal, SimpleChanges, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import {Subject, Subscription, Observable} from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {ModalComponent, ModalConfig} from "../../_metronic/partials";
import {FormConfig, FormFieldConfig} from "./common/form-config";
import {FormBuilder, FormGroup} from "@angular/forms";
import {TableAction, TableActions} from "./common/table-action";
import {Column} from "./common/columns-config";
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../modules/i18n";
import {AuthService} from "../../modules/auth";
import {UserAccountModel} from "../../models/auth/userAccount.model";
import {PermissionModel} from "../../models/auth/permission.model";
import { Router } from '@angular/router';
import {Table, TableLazyLoadEvent} from "primeng/table";
import {ConfirmationService, LazyLoadEvent, MessageService} from "primeng/api";
import {EntityBase} from "../../models/base/entity-base";
import * as FileSaver from 'file-saver';
import {OverlayPanel} from "primeng/overlaypanel";

@Component({
  selector: 'app-entity-manager',
  templateUrl: './entity-manager.component.html',
  styleUrl: './entity-manager.component.css',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class EntityManagerComponent<T extends EntityBase> implements OnInit, OnChanges, OnDestroy {
  @Input() data: T[] = [];
  @Input({required: true}) entityName:  string;
  @Input({required: true}) columns: Column<T>[] = [];
  @Input({required: true}) formConfig: FormConfig;
  @Input({required: true}) actions: TableActions
  @Input() loadData: { load: (page: number, size: number, searchQuery?: string, sortField?: string, sortOrder?: number) => Observable<{ data: T[]; totalCount: number }> }
  @Input() loading: boolean = false;
  @Input() totalCount: number =0;
  @Input() importConfig?: {
    label?: string;
    accept?: string;
    onSelect: (file: File) => void;
    disabled?: boolean;
    downloadTemplate?: () => void;
    downloadTemplateLabel?: string;
    instructions?: {
      title?: string;
      description?: string;
      headers: string[];
      notes?: string[];
    };
  };
  @Input() enableBulkDelete: boolean = false;
  @Input() service: any; // Entity service with searchPaged method (optional)

  // Server-side search state
  totalRecords: number = 0;
  pageSize: number = 10;
  private currentPage: number = 1;
  private currentSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;
  private searchSub: Subscription;

  modalOpenSignal = signal(false);
  get modalOpen() {
    return this.modalOpenSignal();
  }
  set modalOpen(value) {
    this.modalOpenSignal.set(value);
  }
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value ? value.trim() : '');
  }
  
  showImportInstructionsSignal = signal(false);
  get showImportInstructions() {
    return this.showImportInstructionsSignal();
  }
  set showImportInstructions(value) {
    this.showImportInstructionsSignal.set(value);
  }
  
  private pendingFileInput: HTMLInputElement | null = null;
  private clickOutsideHandler: ((event: Event) => void) | null = null;
   ngOnChanges(changes: SimpleChanges): void {
    if (changes.data && changes.data.currentValue) {
      // Parent fed data via [data]; mirror its length as totalRecords so the
      // paginator is enabled from the start. Once a real searchPaged response
      // arrives, the server's true count takes over (guard prevents override).
      if (!this.totalRecords) {
        this.totalRecords = changes.data.currentValue.length;
      }
    }
    if (changes.entityName && changes.entityName.currentValue) {
      console.log('entityName :', this.entityName);
    }
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }


  public hasAddPermission(): boolean {
    if (this.actions?.add) {
      return this.actions.add.visible !== false;
    }
    return true;
  }

  public hasReadPermission(): boolean {
    if (this.actions?.view) {
      return this.actions.view.visible !== false;
    }
    return true;
  }

  public hasEditPermission(): boolean {
    if (this.actions?.edit) {
      return this.actions.edit.visible !== false;
    }
    return true;
  }

  public hasDeletePermission(): boolean {
    if (this.actions?.delete) {
      return this.actions.delete.visible !== false;
    }
    return true;
  }

  isEditMode: boolean = false;
  currentItemId: number | string | null = null;

  formGroup: FormGroup
  public translate: TranslateService;
  public activeLanguage: string = 'en';
  
  selectedItems: T[] = [];

  constructor(
    public authService: AuthService,
    private formBuilder: FormBuilder,
    translate: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    ) {

    this.translate = translate;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res : UserAccountModel) => {
        if (res) {
          this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
                                  .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );


  }


  async openModal() {
    this.isEditMode = false;
    this.currentItemId = null;
    this.formGroup.reset();
    this.modalOpen = true;
  }

  openEditModal = async (action: TableAction, item: T) => {
    console.log('--- openEditModal item ---', item);
    this.isEditMode = true;
    this.currentItemId = item['id'] ?? null;

    const patchedValues = {};
    (this.formConfig?.fields || []).forEach(config => {
      let value = config.accessorFunction ? config.accessorFunction(item) : item[config.field];
      if ((value === undefined || value === null || value === '') && item['address']) {
        const addrObj = typeof item['address'] === 'object' ? item['address'] : null;
        if (addrObj && addrObj[config.field] !== undefined) {
          value = addrObj[config.field];
        }
      }

      if (config.type === 'multiselect') {
        if (typeof value === 'string' && value.trim()) {
          value = value.split(/[,،\n|]+|\s*-\s*/).map(s => s.trim()).filter(s => !!s);
        } else if (!Array.isArray(value)) {
          value = [];
        }
      } else {
        if (value === undefined || value === null) {
          value = '';
        }
      }
      patchedValues[config.field] = value;
    });
    this.formGroup.patchValue(patchedValues);

    this.modalOpen = true;
  }


  async closeModal() {
    this.modalOpen = false;
    this.isEditMode = false;
    this.currentItemId = null;
  }
  openViewModal(item: T) {
    this.isEditMode = false;
    this.currentItemId = item['id'] ?? null;

    const patchedValues = {};
    (this.formConfig?.fields || []).forEach(config => {
      let value = config.accessorFunction ? config.accessorFunction(item) : item[config.field];
      if (config.type === 'multiselect') {
        if (typeof value === 'string' && value.trim()) {
          value = value.split(/[,،\n|]+|\s*-\s*/).map(s => s.trim()).filter(s => !!s);
        } else if (!Array.isArray(value)) {
          value = [];
        }
      } else {
        if (value === undefined || value === null) {
          value = '';
        }
      }
      patchedValues[config.field] = value;
    });

    this.formGroup.patchValue(patchedValues);
    this.modalOpen = true;
}


  ngOnInit(): void {
    this.data = (this.data || []).map(x => {
      x.createdAt = new Date(x.createdAt);
      return x;
    });

    const fields = this.formConfig?.fields || [];
    const group = fields.reduce((acc, field) => {
      const validations = field.validations ? field.validations.map(v => v.validator) : [];
      const defaultValue = field.type === 'multiselect' ? [] : '';
      acc[field.field] = [{value: defaultValue, disabled: field.disabled || false}, validations];
      return acc;
    }, {});
    this.formGroup = this.formBuilder.group(group);
    this.loading = false;

    // Fire initial load if loadData is provided (page-driven mode)
    if (this.loadData) {
      this.currentPage = 1;
      this.currentSize = this.pageSize;
      this.loading = true;
      this.loadData.load(1, this.pageSize).subscribe({
        next: (response) => {
          this.data = (response?.data || []).map((x: any) => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response?.totalCount ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }

    this.clickOutsideHandler = (event: Event) => {
      if (this.opEntitiy && this.opEntitiy.overlayVisible) {
        if (!this.opEntitiy.container?.contains(event.target as Node)) {
          this.opEntitiy.hide();
        }
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);

    // Wire up debounced server-side search
    if (this.useServerSearch && this.service) {
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
          if (this.loadData) {
            return this.loadData.load(page, size, query, sortField, sortOrder);
          }
          return this.service.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: (response: any) => {
          this.data = (response?.data || []).map((x: any) => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response?.totalCount ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.LOADING_ERROR')
          });
          this.cdr.detectChanges();
        }
      });
    }
  }


  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
  }

  onSubmit(): void {
    if (!this.modalOpen) {
      console.log('--- onSubmit ignored because modal is closed ---');
      return;
    }
    console.log('--- Entity Manager onSubmit called --- isEditMode:', this.isEditMode, 'currentItemId:', this.currentItemId, 'Form valid:', this.formGroup.valid, 'Values:', this.formGroup.value);
    
    if (this.formGroup.valid) {
      const payload = { ...this.formGroup.value };
      if (this.currentItemId || this.isEditMode) {
        payload.id = this.currentItemId;
      }
      this.formConfig.onSubmit(payload);
      this.closeModal();
      this.formGroup.reset();
    } else {
      this.formGroup.markAllAsTouched();
      console.warn('--- Form is INVALID --- Errors:');
      Object.keys(this.formGroup.controls).forEach(key => {
        const controlErrors = this.formGroup.controls[key].errors;
        if (controlErrors) {
          console.warn(`Control [${key}] errors:`, controlErrors);
        }
      });
    }
  }

  onCancel(): void {
    console.log('Form cancelled');
    this.formGroup.reset();
    // Handle form cancellation logic here
  }


  getOptions(field: FormFieldConfig): { label: string; value: any; }[] {
    if (!field.options) {
      return [];
    } else if (typeof field.options === 'function') {
      return field.options();
    } else {
      return field.options;
    }
  }

  trackByFn(index: number, item: any): any {
    return item.value;
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && this.service) {
      this.totalRecords = 0;
      this.loadEntitiesLazy({ first: 0, rows: this.pageSize });
    }
  }
  filter(table: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    if (this.useServerSearch && this.service) {
      this.searchSubject.next(trimmedValue);
    } else {
      table.filterGlobal(trimmedValue, 'contains');
    }
  }

  triggerImport(fileInput: HTMLInputElement) {
    if (!this.importConfig || this.importConfig.disabled) return;
    
    // If instructions are provided, show dialog first
    if (this.importConfig.instructions) {
      this.pendingFileInput = fileInput;
      this.showImportInstructions = true;
    } else {
      // Otherwise, directly trigger file selection
      fileInput.click();
    }
  }
  
  confirmImportInstructions() {
    this.showImportInstructions = false;
    if (this.pendingFileInput) {
      this.pendingFileInput.click();
      this.pendingFileInput = null;
    }
  }
  
  cancelImportInstructions() {
    this.showImportInstructions = false;
    this.pendingFileInput = null;
  }

  onImportFileChange(event: Event) {
    if (!this.importConfig || this.importConfig.disabled) return;
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.importConfig.onSelect(file);
    input.value = '';
  }

  public confirmEntityDeletion(event: Event , item: T) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('DATA.CONFIRM_ENTITY_DELETE'),
        header: this.translate.instant('DATA.ENTITY_DELETE_CONFIRMATION', {entityName: this.entityName.split('Model')[0]}),
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('DATA.YES'),
        rejectLabel : this.translate.instant('DATA.NO'),
        accept: () => {
            this.handleAction(this.actions.delete, item);
        },
    });
  }

  public confirmBulkDeletion(event: Event) {
    if (!this.selectedItems || this.selectedItems.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('COMMON.WARNING'),
        detail: this.translate.instant('COMMON.NO_ITEMS_SELECTED')
      });
      return;
    }

    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: this.translate.instant('COMMON.CONFIRM_BULK_DELETE', {count: this.selectedItems.length}),
        header: this.translate.instant('COMMON.BULK_DELETE_CONFIRMATION'),
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('DATA.YES'),
        rejectLabel : this.translate.instant('DATA.NO'),
        accept: () => {
            this.handleBulkDelete();
        },
    });
  }

  handleBulkDelete() {
    if (this.actions.delete && this.actions.delete.onClick) {
      const ids = this.selectedItems.map(item => item.id);
      // Call the bulk delete handler passed from parent component
      if (this.actions.bulkDelete && this.actions.bulkDelete.onClick) {
        this.actions.bulkDelete.onClick(ids);
      }
    }
  }

  handleAction(action: TableAction, item: T): void {
    switch (action.name) {
      case 'Edit':
        this.openEditModal(action, item);
        break;
      case 'Delete':
        action.onClick(item);
        break;
      case 'View':
        this.openViewModal(item);
        break;
      default:
        break;
    }
  }

  handleCustomAction(action: TableAction, item: T): void {
    if (action.onClick) {
      action.onClick(item);
    } else {
      console.warn(`No onClick handler defined for action: ${action.name}`);
    }
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.data.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.type === 'date') {
            // @ts-ignore
            row[x.label] = new Date(y[x.field]).toLocaleString(
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
            row[x.label] = x.accessorFunction ? x.accessorFunction(y) : y[x.field];
          }
        });
        return row;
      });
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, this.entityName.split('Model')[0]);
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

  fieldAccessible(field : FormFieldConfig){
    if(field.hidden){
      return false
    }
    if(this.isEditMode){
      return field.additionOnly !== true
    }
    return true
  }

  loadLazy(event: TableLazyLoadEvent) {
    const page = (event.first / event.rows) + 1;
    const size = event.rows;

    this.loadData.load(page, size);
  }

  loadEntitiesLazy(event: any) {
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;

    // Priority 1: Page-driven loadData contract
    if (this.loadData) {
      this.currentPage = page;
      this.currentSize = size;
      this.loading = true;
      const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
      const sortField = event.sortField || 'createdAt';
      const sortOrder = event.sortOrder ?? -1;
      this.loadData.load(page, size, searchQuery, sortField, sortOrder).subscribe({
        next: response => {
          this.data = (response.data || []).map((x: any) => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('DATA.ERROR'),
            detail: this.translate.instant('DATA.LOADING_ERROR')
          });
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // Priority 2: Server-side search via service
    if (this.useServerSearch && this.service) {
      this.loading = true;
      const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
      const sortField = event.sortField || 'createdAt';
      const sortOrder = event.sortOrder ?? -1;

      this.service.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
        next: response => {
          this.data = (response.data || []).map((x: any) => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('DATA.ERROR'),
            detail: this.translate.instant('DATA.LOADING_ERROR')
          });
          this.cdr.detectChanges();
        }
      });
      return;
    }
  }

  reload(): void {
    if (this.loadData) {
      this.loading = true;
      this.loadData.load(this.currentPage, this.currentSize, this.searchValue, 'createdAt', -1).subscribe({
        next: response => {
          this.data = (response.data || []).map((x: any) => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

selectedEntry: any;

@ViewChild('opEntitiy') opEntitiy!: OverlayPanel;
@ViewChild('overlayAnchor') overlayAnchor!: ElementRef;

onRowClick(event: MouseEvent, entry: any) {
  this.selectedEntry = entry;
  event.preventDefault(); // ✅ منع القائمة السياقية الافتراضية
  event.stopPropagation(); // ✅ منع الكليك يوصل للـ tr

  // ✅ نحرك الـ anchor لمكان الماوس
  const anchorEl = this.overlayAnchor.nativeElement as HTMLElement;
  anchorEl.style.left = `${event.clientX}px`;
  anchorEl.style.top = `${event.clientY}px`;
  anchorEl.style.position = 'fixed';

  // ✅ لو البانال مفتوح نقفله الأول
  if (this.opEntitiy.overlayVisible) {
    this.opEntitiy.hide();
    setTimeout(() => this.opEntitiy.show(event, anchorEl), 0);
  } else {
    this.opEntitiy.show(event, anchorEl);
  }
}

onCogClick(event: MouseEvent, entry: any) {
  event.stopPropagation(); // ✅ منع الكليك يوصل للـ tr
  this.onRowClick(event, entry);
}
getValue(entry: T, field: string | keyof T): any {
  return (entry as any)[field];
}

getFormGridClass(): string {
  if (!this.formConfig) return '';
  if (this.formConfig.fields.length < 3) {
    return 'flex flex-col gap-3 p-4';
  }
  if (this.formConfig.gridCols) {
    return `grid grid-cols-${this.formConfig.gridCols} gap-x-3 gap-y-1.5 p-4 py-1`;
  }
  return 'grid-3 gap-3 p-4';
}

}
