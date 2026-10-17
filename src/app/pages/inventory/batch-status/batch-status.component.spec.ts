import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchStatusComponent } from './batch-status.component';

describe('BatchStatusComponent', () => {
  let component: BatchStatusComponent;
  let fixture: ComponentFixture<BatchStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
