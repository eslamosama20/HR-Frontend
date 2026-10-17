import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomValidators } from 'src/app/utils/CustomValidators';
import { ReservationComponent } from './reservation.component';

describe('ReservationComponent.getMissingRequiredFields (optional cost fields)', () => {
  let fb: FormBuilder;

  const buildForm = (): FormGroup => {
    return fb.group({
      id: [null],
      referenceNumber: [''],
      guestName: ['', Validators.required],
      guestPhone: [''],
      guestEmail: [''],
      nationality: ['', Validators.required],
      arrivalDate: [null, Validators.required],
      departureDate: [null, Validators.required],
      numberOfNights: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      reservationCompanyId: [null],
      reservationClientCompanyId: [null, Validators.required],
      salesRepresentativeId: [null],
      hotelId: [null, Validators.required],
      reservationSeasonId: [null, Validators.required],
      reservationType: ['', Validators.required],
      reservationRoomEntries: fb.array([]),
      reservationServiceEntries: fb.array([]),
      bankAccountId: [null],
      companyPhoneId: [null],
      companyPolicyId: [null],
      hotelRemarks: [null],
      clientRemarks: [null],
    });
  };

  const addRoom = (form: FormGroup, overrides: Record<string, any> = {}): void => {
    const room = fb.group({
      id: [null],
      roomTypeId: [null, Validators.required],
      numberOfRooms: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      roomRate: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      roomCost: [null],
      reservationMealId: [null],
      mealRate: [null, [CustomValidators.greaterThanZero()]],
      mealCost: [null],
      reservationViewId: [null],
      viewRate: [null, [CustomValidators.greaterThanZero()]],
      viewCost: [null],
      reservationId: [null],
      ...overrides,
    });
    (form.get('reservationRoomEntries') as any).push(room);
  };

  const addService = (form: FormGroup, overrides: Record<string, any> = {}): void => {
    const service = fb.group({
      id: [null],
      reservationServiceId: [null, Validators.required],
      description: [''],
      quantity: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      salesPrice: [null, [Validators.required, CustomValidators.greaterThanZero()]],
      costPrice: [null],
      reservationSupplierId: [null, Validators.required],
      reservationId: [null],
      ...overrides,
    });
    (form.get('reservationServiceEntries') as any).push(service);
  };

  const callGetMissing = (form: FormGroup): string[] => {
    const partialThis: Pick<ReservationComponent, 'reservationForm'> = {
      reservationForm: form,
    };
    return ReservationComponent.prototype.getMissingRequiredFields.call(partialThis as any);
  };

  beforeEach(() => {
    fb = new FormBuilder();
  });

  it('does NOT report roomCost as missing when it is empty (Phase 2: cost fields are optional)', () => {
    const form = buildForm();
    addRoom(form, {
      roomTypeId: 1,
      numberOfRooms: 2,
      roomRate: 500,
      roomCost: null,
    });

    const missing = callGetMissing(form);

    const costMessages = missing.filter((m) => m.includes('تكلفة الغرفة'));
    expect(costMessages).toEqual([]);
  });

  it('does NOT report mealCost as missing when it is empty', () => {
    const form = buildForm();
    addRoom(form, {
      roomTypeId: 1,
      numberOfRooms: 2,
      roomRate: 500,
      mealCost: null,
    });

    const missing = callGetMissing(form);

    const costMessages = missing.filter((m) => m.includes('تكلفة الغرفة'));
    expect(costMessages).toEqual([]);
  });

  it('does NOT report viewCost as missing when it is empty', () => {
    const form = buildForm();
    addRoom(form, {
      roomTypeId: 1,
      numberOfRooms: 2,
      roomRate: 500,
      viewCost: null,
    });

    const missing = callGetMissing(form);

    const costMessages = missing.filter((m) => m.includes('تكلفة الغرفة'));
    expect(costMessages).toEqual([]);
  });

  it('does NOT report costPrice as missing when service entry has empty costPrice (Phase 2)', () => {
    const form = buildForm();
    addService(form, {
      reservationServiceId: 1,
      quantity: 1,
      salesPrice: 100,
      costPrice: null,
    });

    const missing = callGetMissing(form);

    const costMessages = missing.filter((m) => m.includes('سعر التكلفة'));
    expect(costMessages).toEqual([]);
  });

  it('still reports required fields (guestName, hotelId, etc.) as missing when empty', () => {
    const form = buildForm();
    addRoom(form, {
      roomTypeId: 1,
      numberOfRooms: 2,
      roomRate: 500,
    });

    const missing = callGetMissing(form);

    expect(missing).toContain('اسم النزيل');
    expect(missing).toContain('الفندق');
    expect(missing).toContain('الجنسية');
  });

  it('reports room with empty roomTypeId as missing (required field, untouched by Phase 2)', () => {
    const form = buildForm();
    addRoom(form, {
      roomTypeId: null,
      numberOfRooms: 2,
      roomRate: 500,
    });

    const missing = callGetMissing(form);

    const roomError = missing.find((m) => m.includes('بيانات الغرفة رقم 1'));
    expect(roomError).toBeDefined();
    expect(roomError).toContain('نوع الغرفة');
  });
});
