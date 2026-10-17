import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Renderer2,
  AfterViewInit,
  Input,
  OnInit,
  OnChanges, SimpleChanges
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FocusMonitor } from '@angular/cdk/a11y';
import { RowService } from './row.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslationService } from 'src/app/modules/i18n';
import { TranslateService } from "@ngx-translate/core";
import { TransactionEntryModel } from "../../../../../../models/accounting/transactionEntry.model";

@Component({
  selector: 'app-transaction-entries-editable-table',
  templateUrl: './transaction-entries-editable-table.component.html',
  styleUrls: ['./transaction-entries-editable-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionEntriesEditableTableComponent implements AfterViewInit, AfterViewChecked, OnInit {
  @Input() data: TransactionEntryModel[] = [];
  @Input() mainAccountOptions = [];
  @Input() description = '';
  @Input() isReadOnly: boolean = false
  columns = [];

  tableForm: FormGroup;



  getTableFormValue(): TransactionEntryModel[] {
    return this.tableForm.value.rows;
  }

  @ViewChildren('inputCell') inputCells!: QueryList<ElementRef>;
  focusedRowIndex: number | null = null;
  focusedColIndex: number | null = null;
  focusNewRow: boolean = false;

  translate: TranslateService;
  constructor(
    private fb: FormBuilder,
    private rowService: RowService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    private focusMonitor: FocusMonitor,
    translate: TranslateService,
    translationService: TranslationService
  ) {
    this.translate = translate;
    this.columns = [
      { field: 'mainAccountId', header: this.translate.instant('FINANCE.MAIN_ACCOUNT'), width: '30%' },
      { field: 'debitAmount', header: this.translate.instant('FINANCE.DEBIT'), width: '20%' },
      { field: 'creditAmount', header: this.translate.instant('FINANCE.CREDIT'), width: '20%' },
      { field: 'description', header: this.translate.instant('FINANCE.DESCRIPTION'), width: '30%' },
    ];
    this.tableForm = this.fb.group({
      rows: this.fb.array([])
    });
  }

  ngOnInit() {
    this.initializeData();
  }

  ngAfterViewInit() {
    this.inputCells.forEach((cell) => {
      this.focusMonitor.monitor(cell).subscribe(origin => {
        if (origin === 'keyboard') {
          this.renderer.addClass(cell.nativeElement, 'focused');
        } else {
          this.renderer.removeClass(cell.nativeElement, 'focused');
        }
      });
    });
  }

  initializeData() {
    if (this.data.length > 0) {
      // وضع التعديل - حمّل البيانات الموجودة
      this.data.forEach(row => this.rowService.addRow(this.rows, this.columns, {
        creditAmount: 0,
        debitAmount: 0,
        description: this.description,
        mainAccountId: null,
        mainAccount: null,
        transactionId: null
      }));
      this.rows.patchValue(this.data);
    } else {
      return
    }
  }

  get rows(): FormArray {
    return this.tableForm.get('rows') as FormArray;
  }

  get rowGroups(): FormGroup[] {
    return this.rows.controls as FormGroup[];
  }

  clearEmptyRows() {
    this.rows.controls.forEach((row, index) => {
      if (row.value.creditAmount === 0 && row.value.debitAmount === 0 && row.value.mainAccountId === null) {
        this.deleteRow(index);
      }
    });
    this.cdr.detectChanges();
  }

  clearAllRows() {
    this.rows.controls.forEach((row, index) => {
      this.deleteRow(index);
    });
    this.cdr.detectChanges();
  }

  addRow() {
    if (this.isReadOnly) return
    if (this.tableForm.value.rows.length > 0) {
      const creditTotal = this.getTransactionEntriesCreditTotal();
      const debitTotal = this.getTransactionEntriesDebitTotal();
      const difference = creditTotal - debitTotal
      this.rowService.addRow(this.rows, this.columns, {
        creditAmount: difference > 0 ? null : (difference < 0 ? Math.abs(difference) : null),
        debitAmount: difference > 0 ? Math.abs(difference) : null,
        description: this.description,
        mainAccountId: null,
        mainAccount: null,
        transactionId: null
      });
    } else {
      this.rowService.addRow(this.rows, this.columns, {
        creditAmount: null,
        debitAmount: null,
        description: this.description,
        mainAccountId: null,
        mainAccount: null,
        transactionId: null
      });
    }

    this.focusNewRow = true;
    this.cdr.detectChanges(); // Trigger change detection manually
  }

  deleteRow(rowIndex: number) {
    this.rows.removeAt(rowIndex);
  }

  onEnter(event: KeyboardEvent, rowIndex: number, colIndex: number) {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.goNextCell(rowIndex, colIndex);
  }

  goNextCell(rowIndex: number, colIndex: number) {
    // Debounce the input event
    this.rows.at(rowIndex).get(this.columns[colIndex].field)?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => { });

    const isLastCell = rowIndex === this.rows.length - 1 && colIndex === this.columns.length - 1;

    if (isLastCell) {
      this.addRow();
    } else {
      const nextInputIndex = this.calculateNextInputIndex(rowIndex, colIndex);
      if (colIndex === 0) {
        setTimeout(() => {
          this.focusOnInput(nextInputIndex);
        }, 100);
      } else {
        this.focusOnInput(nextInputIndex);
      }
    }
  }

  calculateNextInputIndex(rowIndex: number, colIndex: number): number {
    return rowIndex * this.columns.length + colIndex + 1;
  }

  focusOnInput(index: number) {
    const inputs = this.inputCells.toArray();
    if (index < inputs.length) {
      // @ts-ignore
      if (typeof inputs[index] == 'object' && inputs[index].input) {
        // @ts-ignore
        this.focusMonitor.focusVia(inputs[index].input.nativeElement, 'keyboard');
      } else {
        this.focusMonitor.focusVia(inputs[index], 'keyboard');
      }
    }
  }

  trackByFn(index: number, item: any) {
    return index;
  }

  ngAfterViewChecked() {
    if (this.focusNewRow) {
      this.focusNewRow = false;
      this.focusOnInput(this.rows.length * this.columns.length - this.columns.length);
    }
  }

  isInvalid(rowIndex: number, colIndex: number): boolean {
    const control = this.getControl(rowIndex, colIndex);
    return control.invalid && control.touched;
  }

  getControl(rowIndex: number, colIndex: number) {
    return this.rows.at(rowIndex).get(this.columns[colIndex].field);
  }



  getTransactionEntriesCreditTotal(): number {
    return this.tableForm.value.rows.reduce((acc, val) => acc + val.creditAmount, 0);
  }

  getTransactionEntriesDebitTotal(): number {
    return this.tableForm.value.rows.reduce((acc, val) => acc + val.debitAmount, 0);
  }

  formatInputNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (value === '0.' || value.endsWith('.')) {
      // No need to modify the value
      input.value = value
    }
    if (value.startsWith('0') && !value.startsWith('0.') && value.length > 1) {
      value = value.replace(/^0+/, '');
    }

    // Set the value in the input field
    input.value = value

    // Find the form control that corresponds to this input and update its value
    const formControlName = input.getAttribute('formControlName');
    if (formControlName) {
      const rowIndex = +input.getAttribute('rowIndex')!;
      const control = this.getControl(rowIndex, this.columns.findIndex(col => col.field === formControlName));
      control?.setValue(value, { emitEvent: false });
    }
  }

  patchValues(value: TransactionEntryModel[]) {
    // ✅ امسح كل الـ rows الحالية أولاً لمنع التكرار
    this.rows.clear();
    this.rowService.addRows(this.rows, this.columns, value);
    this.cdr.detectChanges();
  }

}
