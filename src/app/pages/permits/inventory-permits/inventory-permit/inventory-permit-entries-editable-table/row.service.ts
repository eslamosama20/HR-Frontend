import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class RowService {
  constructor(private fb: FormBuilder) {}

  createRow(columns: any[] , row: any = null) {
    if (!row) {
      return this.fb.group({
        id: [null],
        unitPrice: [0, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        mainPurchaseClassId: ['', Validators.required],
        inventoryPermitId: [''],
        batchNo: [''],
        shelfNumber: [''],
        rowNumber: [''],
        expiryDate: [null],
        retailPrice: [0],
        wholesalePrice: [0],
        bulkPrice: [0]
      });
    }
    return this.fb.group({
      id: [row.id],
      unitPrice: [row.unitPrice, Validators.required],
      quantity: [row.quantity, [Validators.required, Validators.min(1)]],
      mainPurchaseClassId: [row.mainPurchaseClassId, Validators.required],
      inventoryPermitId: [row.inventoryPermitId],
      batchNo: [row.batchNo || ''],
      shelfNumber: [row.shelfNumber || ''],
      rowNumber: [row.rowNumber || ''],
      expiryDate: [row.expiryDate || null],
      retailPrice: [row.retailPrice || 0],
      wholesalePrice: [row.wholesalePrice || 0],
      bulkPrice: [row.bulkPrice || 0]
    });
  }

  addRow(formArray: FormArray, columns: any[] , row: any = null) {
    formArray.push(this.createRow(columns,row));
  }

  addRows(formArray: FormArray, columns: any[] , rows: any[]) {
    rows.forEach(row => this.addRow(formArray, columns, row));
  }


}
