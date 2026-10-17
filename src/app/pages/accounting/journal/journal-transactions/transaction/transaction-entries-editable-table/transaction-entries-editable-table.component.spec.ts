import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionEntriesEditableTableComponent } from './transaction-entries-editable-table.component';

describe('TransactionEntriesEditableTableComponent', () => {
  let component: TransactionEntriesEditableTableComponent;
  let fixture: ComponentFixture<TransactionEntriesEditableTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionEntriesEditableTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TransactionEntriesEditableTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
