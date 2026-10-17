import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchUnitStatusComponent } from './batch-unit-status.component';

describe('BatchUnitStatusComponent', () => {
  let component: BatchUnitStatusComponent;
  let fixture: ComponentFixture<BatchUnitStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchUnitStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchUnitStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
