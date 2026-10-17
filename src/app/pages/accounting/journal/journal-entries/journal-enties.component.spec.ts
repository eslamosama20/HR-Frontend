import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalEntriesComponent } from './journal-entries.component';

describe('JournalEntriesComponent', () => {
  let component: JournalEntriesComponent;
  let fixture: ComponentFixture<JournalEntriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalEntriesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JournalEntriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
