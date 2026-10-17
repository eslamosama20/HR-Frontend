import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductUnitStatusComponent } from './product-unit-status.component';

describe('ProductUnitStatusComponent', () => {
  let component: ProductUnitStatusComponent;
  let fixture: ComponentFixture<ProductUnitStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductUnitStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductUnitStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
