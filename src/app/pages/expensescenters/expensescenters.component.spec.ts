import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EXPENSESCENTERSComponent } from './expensescenters.component';

describe('EXPENSESCENTERSComponent', () => {
  let component: EXPENSESCENTERSComponent;
  let fixture: ComponentFixture<EXPENSESCENTERSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EXPENSESCENTERSComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EXPENSESCENTERSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
