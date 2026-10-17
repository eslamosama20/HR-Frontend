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
        quantity: [1, Validators.required],
        mainPurchaseClassId: ['', Validators.required],
        recipeId: ['']
      });
    }
    return this.fb.group({
      id: [row.id],
      quantity: [row.quantity, Validators.required],
      mainPurchaseClassId: [row.mainPurchaseClassId, Validators.required],
      recipeId: [row.recipeId]
    });
  }

  addRow(formArray: FormArray, columns: any[] , row: any = null) {
    formArray.push(this.createRow(columns,row));
  }

  addRows(formArray: FormArray, columns: any[] , rows: any[]) {
    rows.forEach(row => this.addRow(formArray, columns, row));
  }


}
