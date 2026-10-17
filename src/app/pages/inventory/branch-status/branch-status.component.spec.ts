import {ComponentFixture, TestBed} from '@angular/core/testing';

import {BranchStatusComponent} from './branch-status.component';

describe('BranchStatusComponent', () => {
  let component: BranchStatusComponent;
  let fixture: ComponentFixture<BranchStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchStatusComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BranchStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
