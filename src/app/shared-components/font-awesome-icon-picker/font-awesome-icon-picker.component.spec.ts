import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FontAwesomeIconPickerComponent } from './font-awesome-icon-picker.component';

describe('FontAwesomeIconPickerComponent', () => {
  let component: FontAwesomeIconPickerComponent;
  let fixture: ComponentFixture<FontAwesomeIconPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FontAwesomeIconPickerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FontAwesomeIconPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
