import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreStatusComponent } from './store-status.component';

describe('StoreStatusComponent', () => {
  let component: StoreStatusComponent;
  let fixture: ComponentFixture<StoreStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreStatusComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StoreStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
