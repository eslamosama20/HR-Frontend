import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeasurementUnitComponent } from './measurement-unit.component';

describe('MeasurementUnitComponent', () => {
  let component: MeasurementUnitComponent;
  let fixture: ComponentFixture<MeasurementUnitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeasurementUnitComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MeasurementUnitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
