import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SupplierStatusComponent} from './supplier-status.component';

describe('SupplierStatusComponent', () => {
  let component: SupplierStatusComponent;
  let fixture: ComponentFixture<SupplierStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierStatusComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SupplierStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
