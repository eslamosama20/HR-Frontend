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
        creditAmount: [null, Validators.required],
        debitAmount: [null, Validators.required],
        description: [''],
        mainAccountId: ['', Validators.required],
        mainAccount: [''],
        transactionId: ['']
      });
    }
    return this.fb.group({
      id: [row.id],
      creditAmount: [row.creditAmount && row.creditAmount !== 0 ? row.creditAmount : null, Validators.required],
      debitAmount: [row.debitAmount && row.debitAmount !== 0 ? row.debitAmount : null, Validators.required],
      description: [row.description],
      mainAccountId: [row.mainAccountId, Validators.required],
      mainAccount: [row.mainAccount],
      transactionId: [row.transactionId]
    });
  }

  addRow(formArray: FormArray, columns: any[] , row: any = null) {
    formArray.push(this.createRow(columns,row));
  }

  addRows(formArray: FormArray, columns: any[] , rows: any[]) {
    rows.forEach(row => this.addRow(formArray, columns, row));
  }


}
