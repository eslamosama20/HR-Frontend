import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalTransactionsComponent } from './journal-transactions.component';

describe('JournalTransactionsComponent', () => {
  let component: JournalTransactionsComponent;
  let fixture: ComponentFixture<JournalTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JournalTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
