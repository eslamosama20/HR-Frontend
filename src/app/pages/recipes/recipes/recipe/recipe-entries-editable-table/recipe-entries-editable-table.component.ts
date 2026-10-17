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
  Output,
  EventEmitter,
  OnInit,
  OnChanges, SimpleChanges
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FocusMonitor } from '@angular/cdk/a11y';
import { RowService } from './row.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslationService } from 'src/app/modules/i18n';
import { TranslateService } from "@ngx-translate/core";
import { RecipeEntryModel } from "../../../../../models/recipes/recipe-entry.model";

@Component({
  selector: 'app-recipe-entries-editable-table',
  templateUrl: './recipe-entries-editable-table.component.html',
  styleUrls: ['./recipe-entries-editable-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeEntriesEditableTableComponent implements AfterViewInit, AfterViewChecked, OnInit {
  @Input() data: RecipeEntryModel[] = [];
  @Input() mainPurchaseClassOptions = [];
  @Input() mainPurchaseClasses = [];
  @Input() description='';
  @Input() isReadOnly : boolean = false;
  @Input() numberOfPersons: number = 1;
  @Output() valueChange = new EventEmitter<RecipeEntryModel[]>();
  columns = [];

  tableForm: FormGroup;



  getTableFormValue(): RecipeEntryModel[] {
    return this.tableForm.value.rows || [];
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
      { field: 'mainPurchaseClassId', header: this.translate.instant('FINANCE.MAIN_ACCOUNT'), width: '40%' },
      { field: 'measurementUnit', header: this.translate.instant('DATA.MEASUREMENT_UNIT'), width: '20%' },
      { field: 'quantity', header: this.translate.instant('DATA.QUANTITY'), width: '20%' },
      { field: 'quantityPerPerson', header: this.translate.instant('DATA.QUANTITY_PER_PERSON'), width: '20%' },
      { field: 'lastPrice', header: this.translate.instant('DATA.LAST_PRICE'), width: '20%' },
    ];
    this.tableForm = this.fb.group({
      rows: this.fb.array([])
    });
  }

  ngOnInit() {
    this.initializeData();
    this.tableForm.valueChanges.subscribe(() => {
      this.valueChange.emit(this.getTableFormValue());
      this.cdr.detectChanges();
    });
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
    this.rows.clear();
    if (this.data && this.data.length > 0) {
      this.data.forEach(row => this.rowService.addRow(this.rows, this.columns, {
        quantity: row.quantity ?? 1,
        mainPurchaseClassId: row.mainPurchaseClassId ?? null,
        recipeId: row.recipeId ?? null,
        id: row.id ?? null
      }));
    }
  }

  get rows(): FormArray {
    return this.tableForm.get('rows') as FormArray;
  }

  get rowGroups(): FormGroup[] {
    return this.rows.controls as FormGroup[];
  }

  clearEmptyRows() {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows.at(i);
      const classId = row.get('mainPurchaseClassId')?.value;
      if (!classId || classId === '' || classId === null) {
        this.rows.removeAt(i);
      }
    }
    this.valueChange.emit(this.getTableFormValue());
    this.cdr.detectChanges();
  }

  clearAllRows() {
    this.rows.clear();
    this.valueChange.emit(this.getTableFormValue());
    this.cdr.detectChanges();
  }

  addRow() {
    if (this.isReadOnly) return
    if (this.tableForm.value.rows.length > 0) {
      this.rowService.addRow(this.rows, this.columns, {
        quantity: 1,
        mainPurchaseClassId: null,
        recipeId: null
      });
    }else{
      this.rowService.addRow(this.rows, this.columns,{
        quantity: 1,
        mainPurchaseClassId: null,
        recipeId: null
      });
    }

    this.focusNewRow = true;
    this.valueChange.emit(this.getTableFormValue());
    this.cdr.detectChanges(); // Trigger change detection manually
  }

  deleteRow(rowIndex: number) {
    this.rows.removeAt(rowIndex);
    this.valueChange.emit(this.getTableFormValue());
    this.cdr.detectChanges();
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
      if (colIndex === 0){
        setTimeout(() => {
          this.focusOnInput(nextInputIndex);
        }, 100);
      }else{
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
      if (typeof inputs[index] == 'object' && inputs[index].input){
        // @ts-ignore
        this.focusMonitor.focusVia(inputs[index].input.nativeElement, 'keyboard');
      }else{
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



/*  getRecipeEntriesQuantity(): number {
    return this.tableForm.value.rows.reduce((acc, val) => acc + val.creditAmount, 0);
  }*/

/*  getRecipeEntriesTotal(): number {
    return this.tableForm.value.rows.reduce((acc, val) => acc + (val.unitPrice * val.quantity), 0);
  }*/

  formatInputNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (value === '0.' || value.endsWith('.')) {
      // No need to modify the value
      input.value =value
    }
    if (value.startsWith('0') && !value.startsWith('0.') && value.length > 1) {
      value = value.replace(/^0+/, '');
    }

    // Set the value in the input field
    input.value =value

    // Find the form control that corresponds to this input and update its value
    const formControlName = input.getAttribute('formControlName');
    if (formControlName) {
      const rowIndex = +input.getAttribute('rowIndex')!;
      const control = this.getControl(rowIndex, this.columns.findIndex(col => col.field === formControlName));
      control?.setValue(value, { emitEvent: false });
    }
  }

  patchValues(value: RecipeEntryModel[]) {
    this.rows.clear();
    if (value && value.length > 0) {
      this.rowService.addRows(this.rows, this.columns, value);
    }
    this.valueChange.emit(this.getTableFormValue());
    this.cdr.detectChanges();
  }

  getRowLastPrice(row: FormGroup) {
    const rowValue = row.get('quantity').value;
    const mainPurchaseClassId = row.get('mainPurchaseClassId').value;
    const mainPurchaseClass = this.mainPurchaseClasses.find(x => x.id === mainPurchaseClassId);
    if (!mainPurchaseClass) {
      return 0;
    }
    return  mainPurchaseClass.lastPrice
  }

  getRowTotal(row: FormGroup) {
    const rowValue = row.get('quantity').value;
    const mainPurchaseClassId = row.get('mainPurchaseClassId').value;
    const mainPurchaseClass = this.mainPurchaseClasses.find(x => x.id === mainPurchaseClassId);
    if (!mainPurchaseClass) {
      return 0;
    }
    return  mainPurchaseClass.lastPrice * rowValue
  }
  getRowAmountPerPerson(row: FormGroup) {
    const total = this.getRowTotal(row);
    return Math.round(total / this.numberOfPersons * 100) / 100;
  }

  getRowQuantityPerPerson(row: FormGroup) {
    const rowValue = row.get('quantity').value;
    return Math.round(rowValue / this.numberOfPersons * 100) / 100;
  }

  getRowMeasurementUnit(row: FormGroup) {
    const rowValue = row.get('mainPurchaseClassId').value;
    const mainPurchaseClass = this.mainPurchaseClasses.find(x => x.id === rowValue);
    if (!mainPurchaseClass) {
      return 0;
    }
    return  mainPurchaseClass.measurementUnit?.arabicName;
  }
}
