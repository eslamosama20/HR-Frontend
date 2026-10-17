import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table } from 'primeng/table';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslationService } from '../../modules/i18n';

export interface FilterMatchModeOption {
  label: string;
  value: string;
}

export interface FilterConstraint {
  value: any;
  matchMode: string;
}

@Component({
  selector: 'app-table-column-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OverlayPanelModule,
    DropdownModule,
    CalendarModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    TranslateModule
  ],
  templateUrl: './table-column-filter.component.html',
  styleUrls: ['./table-column-filter.component.scss']
})
export class TableColumnFilterComponent implements OnInit, OnDestroy {
  private static activeInstance: TableColumnFilterComponent | null = null;

  @Input() table!: Table;
  @Input() field!: string;
  @Input() header: string = '';
  @Input() type: 'text' | 'date' | 'numeric' | 'dropdown' = 'text';
  @Input() options: any[] = [];
  @Input() optionLabel: string = 'name';
  @Input() optionValue: string = 'id';
  @Input() placeholder: string = '';
  @Input() dateFormat: string = 'dd/mm/yy';

  @ViewChild('op') op!: OverlayPanel;
  @ViewChild('triggerBtn') triggerBtn!: ElementRef;

  operator: 'and' | 'or' = 'and';
  operatorOptions: { label: string; value: 'and' | 'or' }[] = [];
  constraints: FilterConstraint[] = [{ value: null, matchMode: 'startsWith' }];
  matchModes: FilterMatchModeOption[] = [];
  isFilterActive: boolean = false;
  isArabic: boolean = true;

  constructor(
    private translate: TranslateService,
    private translationService: TranslationService
  ) {}

  ngOnDestroy(): void {
    if (TableColumnFilterComponent.activeInstance === this) {
      TableColumnFilterComponent.activeInstance = null;
    }
  }

  ngOnInit(): void {
    const lang = this.translationService.getSelectedLanguage() || 'ar';
    this.isArabic = lang === 'ar';

    this.translate.onLangChange.subscribe(event => {
      this.isArabic = event.lang === 'ar';
      this.setupTranslations();
    });

    this.setupTranslations();
    this.checkInitialFilterState();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.op || !this.op.overlayVisible) {
      return;
    }

    const target = event.target as HTMLElement;

    // 1. If element is null or detached from DOM (e.g. removed dynamically), ignore
    if (!target || !document.contains(target)) {
      return;
    }

    // 2. If click is inside the trigger button of THIS filter, ignore
    const triggerEl = this.triggerBtn?.nativeElement;
    if (triggerEl && (triggerEl === target || triggerEl.contains(target))) {
      return;
    }

    // 3. If click is inside the overlay panel container
    const container = this.op.container;
    if (container && (container === target || container.contains(target))) {
      return;
    }

    // 4. If click is inside any PrimeNG popup panel (dropdown list, datepicker calendar)
    if (
      target.closest('.custom-table-filter-overlay-panel') ||
      target.closest('.p-dropdown-panel') ||
      target.closest('.p-datepicker') ||
      target.closest('.p-overlaypanel')
    ) {
      return;
    }

    // 5. Truly outside click: close overlay
    this.closeOverlay();
  }

  private setupTranslations(): void {
    this.operatorOptions = [
      { label: this.isArabic ? 'تطابق الكل' : 'Match All', value: 'and' },
      { label: this.isArabic ? 'تطابق أي' : 'Match Any', value: 'or' }
    ];

    if (this.type === 'text') {
      this.matchModes = [
        { label: this.isArabic ? 'يبدأ بـ' : 'Starts With', value: 'startsWith' },
        { label: this.isArabic ? 'يحتوي على' : 'Contains', value: 'contains' },
        { label: this.isArabic ? 'لا يحتوي على' : 'Not Contains', value: 'notContains' },
        { label: this.isArabic ? 'ينتهي بـ' : 'Ends With', value: 'endsWith' },
        { label: this.isArabic ? 'يساوي' : 'Equals', value: 'equals' },
        { label: this.isArabic ? 'لا يساوي' : 'Not Equals', value: 'notEquals' }
      ];
    } else if (this.type === 'date') {
      this.matchModes = [
        { label: this.isArabic ? 'التاريخ يكون' : 'Date is', value: 'dateIs' },
        { label: this.isArabic ? 'التاريخ لا يكون' : 'Date is not', value: 'dateIsNot' },
        { label: this.isArabic ? 'التاريخ قبل' : 'Date is before', value: 'dateBefore' },
        { label: this.isArabic ? 'التاريخ بعد' : 'Date is after', value: 'dateAfter' }
      ];
    } else if (this.type === 'numeric') {
      this.matchModes = [
        { label: this.isArabic ? 'يساوي' : 'Equals', value: 'equals' },
        { label: this.isArabic ? 'لا يساوي' : 'Not Equals', value: 'notEquals' },
        { label: this.isArabic ? 'أقل من' : 'Less than', value: 'lt' },
        { label: this.isArabic ? 'أقل من أو يساوي' : 'Less than or equal to', value: 'lte' },
        { label: this.isArabic ? 'أكبر من' : 'Greater than', value: 'gt' },
        { label: this.isArabic ? 'أكبر من أو يساوي' : 'Greater than or equal to', value: 'gte' }
      ];
    } else if (this.type === 'dropdown') {
      this.matchModes = [
        { label: this.isArabic ? 'يساوي' : 'Equals', value: 'equals' }
      ];
    }

    const defaultMode = this.getDefaultMatchMode();
    if (this.constraints.length === 1 && !this.constraints[0].value) {
      this.constraints[0].matchMode = defaultMode;
    }
  }

  private getDefaultMatchMode(): string {
    if (this.type === 'date') return 'dateIs';
    if (this.type === 'numeric' || this.type === 'dropdown') return 'equals';
    return 'startsWith';
  }

  private checkInitialFilterState(): void {
    if (this.table && this.table.filters && this.table.filters[this.field]) {
      const meta = this.table.filters[this.field];
      if (Array.isArray(meta)) {
        this.constraints = meta.map(m => ({ value: m.value, matchMode: m.matchMode || this.getDefaultMatchMode() }));
        this.isFilterActive = this.constraints.some(c => c.value !== null && c.value !== undefined && c.value !== '');
      } else if (typeof meta === 'object' && meta !== null) {
        if ('constraints' in meta && Array.isArray((meta as any).constraints)) {
          this.operator = ((meta as any).operator as 'and' | 'or') || 'and';
          this.constraints = (meta as any).constraints.map((m: any) => ({ value: m.value, matchMode: m.matchMode || this.getDefaultMatchMode() }));
          this.isFilterActive = this.constraints.some(c => c.value !== null && c.value !== undefined && c.value !== '');
        } else if ('value' in meta) {
          this.constraints = [{ value: meta.value, matchMode: meta.matchMode || this.getDefaultMatchMode() }];
          this.isFilterActive = meta.value !== null && meta.value !== undefined && meta.value !== '';
        }
      }
    }
  }

  toggleOverlay(event: Event): void {
    event.stopPropagation();
    if (this.op && this.op.overlayVisible) {
      this.closeOverlay();
    } else {
      if (TableColumnFilterComponent.activeInstance && TableColumnFilterComponent.activeInstance !== this) {
        TableColumnFilterComponent.activeInstance.closeOverlay();
      }
      this.openOverlay(event);
    }
  }

  openOverlay(event: Event): void {
    TableColumnFilterComponent.activeInstance = this;
    if (this.op) {
      this.op.show(event, this.triggerBtn?.nativeElement || event.currentTarget);
    }
  }

  closeOverlay(): void {
    if (TableColumnFilterComponent.activeInstance === this) {
      TableColumnFilterComponent.activeInstance = null;
    }
    if (this.op) {
      this.op.hide();
    }
  }

  onOverlayHide(): void {
    if (TableColumnFilterComponent.activeInstance === this) {
      TableColumnFilterComponent.activeInstance = null;
    }
  }

  addRule(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const defaultMode = this.getDefaultMatchMode();
    this.constraints.push({ value: null, matchMode: defaultMode });
    setTimeout(() => {
      if (this.op) {
        this.op.align();
      }
    }, 50);
  }

  removeRule(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.constraints.splice(index, 1);
    if (this.constraints.length === 0) {
      this.addRule();
    } else {
      setTimeout(() => {
        if (this.op) {
          this.op.align();
        }
      }, 50);
    }
  }

  applyFilter(): void {
    if (!this.table || !this.field) return;

    const validConstraints = this.constraints.filter(
      c => c.value !== null && c.value !== undefined && c.value !== ''
    );

    if (validConstraints.length > 0) {
      if (this.constraints.length === 1) {
        this.table.filter(this.constraints[0].value, this.field, this.constraints[0].matchMode);
      } else {
        (this.table.filters as any)[this.field] = this.constraints.map(c => ({
          value: c.value,
          matchMode: c.matchMode,
          operator: this.operator
        }));
        this.table._filter();
      }
      this.isFilterActive = true;
    } else {
      this.clearFilter();
      return;
    }
    this.closeOverlay();
  }

  clearFilter(): void {
    const defaultMode = this.getDefaultMatchMode();
    this.constraints = [{ value: null, matchMode: defaultMode }];
    this.operator = 'and';
    this.isFilterActive = false;
    if (this.table && this.field) {
      this.table.filter(null, this.field, defaultMode);
    }
    this.closeOverlay();
  }
}
