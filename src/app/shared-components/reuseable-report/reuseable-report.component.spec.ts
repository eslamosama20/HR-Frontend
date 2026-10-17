import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReuseableReportComponent } from './reuseable-report.component';

describe('ReuseableReportComponent', () => {
  let component: ReuseableReportComponent;
  let fixture: ComponentFixture<ReuseableReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReuseableReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReuseableReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
