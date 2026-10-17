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
  OnChanges, SimpleChanges, signal
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FocusMonitor } from '@angular/cdk/a11y';
import { RowService } from './row.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslationService } from 'src/app/modules/i18n';
import { TranslateService } from "@ngx-translate/core";
import { InventoryPermitEntryModel } from "../../../../../models/permits/inventory-permit-entry.model";
import { MainPurchaseClassModel } from 'src/app/models/purchase-classes-tree/mainPurchaseClass.model';
import {DropdownChangeEvent} from "primeng/dropdown";
import {InputSwitchChangeEvent} from "primeng/inputswitch";
import {InventoryStocksModel} from "../../../../../models/reports/inventory-stocks/inventoryStocks.model";
import {StoreDetailsModel} from "../../../../../models/inventory/storeDetails.model";

@Component({
  selector: 'app-inventory-permit-entries-editable-table',
  templateUrl: './inventory-permit-entries-editable-table.component.html',
  styleUrls: ['./inventory-permit-entries-editable-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryPermitEntriesEditableTableComponent implements AfterViewInit, AfterViewChecked, OnInit {
  @Input() data: InventoryPermitEntryModel[] = [];
  @Input() mainPurchaseClassOptions = [];
  @Input() description='';
  @Input() isReadOnly : boolean = false;
  @Input() mainPurchaseClasses: MainPurchaseClassModel[] = [];
  @Input() stocks: InventoryStocksModel[] = [];
  @Input() storeDetailsId: string | null = null;
  @Input() permitType: string | null = null;
  columns = [];

  tableForm: FormGroup;

  priceModeSignal = signal('lastPrice');
  get priceMode() {
    return this.priceModeSignal();
  }
  set priceMode(value) {
    this.priceModeSignal.set(value);
  }


  getTableFormValue(): InventoryPermitEntryModel[] {
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
      { field: 'mainPurchaseClassId', header: this.translate.instant('FINANCE.MAIN_ACCOUNT'), width: '40%' },
      { field: 'measurementUnitName', header: this.translate.instant('DATA.MEASUREMENT_UNIT'), width: '20%' },
      { field: 'quantity', header: this.translate.instant('DATA.QUANTITY'), width: '20%' },
      { field: 'inStock', header: this.translate.instant('DATA.IN_STOCK'), width: '20%' },
      { field: 'batchNo', header: 'Batch No', width: '15%' },
      { field: 'shelfNumber', header: 'رقم الرف', width: '15%' },
      { field: 'rowNumber', header: 'رقم الصف', width: '15%' },
      { field: 'expiryDate', header: 'تاريخ الصلاحية', width: '20%' },
      { field: 'unitPrice', header: this.translate.instant('DATA.UNIT_PRICE'), width: '20%' },
      { field: 'retailPrice', header: 'سعر القطاعي', width: '15%' },
      { field: 'wholesalePrice', header: 'سعر الجملة', width: '15%' },
      { field: 'bulkPrice', header: 'جملة الجملة', width: '15%' },
    ];
    this.tableForm = this.fb.group({
      rows: this.fb.array([])
    });
  }

  ngOnInit() {
    this.initializeData();
    console.log(this.mainPurchaseClasses)
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
      this.data.forEach(row => this.rowService.addRow(this.rows, this.columns, {
        unitPrice: 0,
        quantity: 1,
        mainPurchaseClassId: null,
        inventoryPermitId: null,
        batchNo: null,
        shelfNumber: null,
        rowNumber: null,
        expiryDate: null,
        retailPrice: 0,
        wholesalePrice: 0,
        bulkPrice: 0
      }));
      this.rows.patchValue(this.data);
    }else{
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
      if (row.value.unitPrice === 0 && row.value.quantity === 1 && row.value.mainPurchaseClassId === null) {
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
      this.rowService.addRow(this.rows, this.columns, {
        unitPrice: 0,
        quantity: 1,
        mainPurchaseClassId: null,
        inventoryPermitId: null,
        batchNo: null,
        shelfNumber: null,
        rowNumber: null,
        expiryDate: null,
        retailPrice: 0,
        wholesalePrice: 0,
        bulkPrice: 0
      });
    }else{
      this.rowService.addRow(this.rows, this.columns,{
        unitPrice: 0,
        quantity: 1,
        mainPurchaseClassId: null,
        inventoryPermitId: null,
        batchNo: null,
        shelfNumber: null,
        rowNumber: null,
        expiryDate: null,
        retailPrice: 0,
        wholesalePrice: 0,
        bulkPrice: 0
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



  getInventoryPermitEntriesQuantity(): number {
    return this.tableForm.value.rows.reduce((acc: number, val: any) => acc + (Number(val.quantity) || 0), 0);
  }

  getTotalQuantity(): number {
    if (!this.tableForm?.value?.rows) return 0;
    return this.tableForm.value.rows.reduce((acc: number, val: any) => acc + (Number(val.quantity) || 0), 0);
  }

  getInventoryPermitEntriesTotal(): number {
    if (!this.tableForm?.value?.rows) return 0;
    return this.tableForm.value.rows.reduce((acc: number, val: any) => acc + ((Number(val.unitPrice) || 0) * (Number(val.quantity) || 0)), 0);
  }

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

  patchValues(value: InventoryPermitEntryModel[]) {
    this.clearEmptyRows();
    this.rowService.addRows(this.rows, this.columns, value);
    this.cdr.detectChanges();
  }

  handleMainPurchaseClassChange(rowIndex: number, colIndex: number, event: DropdownChangeEvent) {
    const mainPurchaseClassId = event.value;
    const mainPurchaseClass = this.mainPurchaseClasses.find(x => x.id === mainPurchaseClassId);
    if (mainPurchaseClass) {
      const currentUnitPrice = this.rows.at(rowIndex).get('unitPrice').value;
      if (this.priceMode === 'lastPrice') {
        if (mainPurchaseClass.lastPrice !== currentUnitPrice) {
          this.rows.at(rowIndex).get('unitPrice').setValue(mainPurchaseClass.lastPrice);
        }
      } else {
        if (mainPurchaseClass.lastMonthAveragePrice !== currentUnitPrice) {
          this.rows.at(rowIndex).get('unitPrice').setValue(mainPurchaseClass.lastMonthAveragePrice);
        }
      }
    }
    this.goNextCell(rowIndex, colIndex);
  }
  refreshUnitPrice() {
    this.rows.controls.forEach(row => {
      const mainPurchaseClass = this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value);
      if (mainPurchaseClass) {
        const currentUnitPrice = row.get('unitPrice').value;
        if (this.priceMode === 'lastPrice') {
          if (mainPurchaseClass.lastPrice !== currentUnitPrice) {
            row.get('unitPrice').setValue(mainPurchaseClass.lastPrice);
          }
        } else {
          if (mainPurchaseClass.lastMonthAveragePrice !== currentUnitPrice) {
            row.get('unitPrice').setValue(mainPurchaseClass.lastMonthAveragePrice);
          }
        }
      }
    });
  }

  setPriceModeLastPrice() {
    this.priceMode = 'lastPrice';
    // change the unitPrice to the last price of the mainPurchaseClass only if it's not the last month average price
    this.rows.controls.forEach(row => {
      if (this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value)?.lastMonthAveragePrice === row.get('unitPrice').value) {
        row.get('unitPrice').setValue(this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value)?.lastPrice ?? 0);
      }
    });
  }
  setPriceModeAveragePrice() {
    this.priceMode = 'averagePrice';
    this.rows.controls.forEach(row => {
      if (this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value)?.lastPrice === row.get('unitPrice').value) {
        row.get('unitPrice').setValue(this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value)?.lastMonthAveragePrice ?? 0);
      }
    });
  }

  getMeasurementUnitName(row: FormGroup): string {
    return this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId').value)?.measurementUnit?.arabicName ?? '';
  }

  getSelectedMainPurchaseClass(row: FormGroup): MainPurchaseClassModel | undefined {
    return this.mainPurchaseClasses.find(x => x.id === row.get('mainPurchaseClassId')?.value);
  }

  isBatchRequiredForRow(row: FormGroup): boolean {
    return !!this.getSelectedMainPurchaseClass(row)?.needsBatch;
  }

  isExpiryRequiredForRow(row: FormGroup): boolean {
    return !!this.getSelectedMainPurchaseClass(row)?.needsExpiry;
  }

  isMissingBatchForRow(row: FormGroup): boolean {
    return this.isBatchRequiredForRow(row) && !`${row.get('batchNo')?.value ?? ''}`.trim();
  }

  isMissingExpiryForRow(row: FormGroup): boolean {
    return this.isExpiryRequiredForRow(row) && !row.get('expiryDate')?.value;
  }

  getStockAmount(row: FormGroup): number {
    const amount =  this.stocks.find(x => x.storeDetailsId === this.storeDetailsId)
      ?.storedItems.find(y => y.mainPurchaseClassId === row.get('mainPurchaseClassId').value)?.quantity ?? 0;
    console.log('amount', amount);
    return amount;
  }

}
