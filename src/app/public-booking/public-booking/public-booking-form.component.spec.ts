import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { PublicBookingFormComponent } from './public-booking-form.component';
import { ReservationService } from '../../services/reservations/reservation.service';
import { of } from 'rxjs';

describe('PublicBookingFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports:[ReactiveFormsModule, PublicBookingFormComponent],
      providers:[{provide: ReservationService, useValue:{create: () => of({})}}]
    }).compileComponents();
  });

  it('should create component and have one room by default', () => {
    const fixture = TestBed.createComponent(PublicBookingFormComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp).toBeTruthy();
    expect(comp.rooms.length).toBe(1);
  });
});
