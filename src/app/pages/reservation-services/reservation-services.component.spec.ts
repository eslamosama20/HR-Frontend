import { of, Subject } from 'rxjs';
import { ReservationServicesComponent } from './reservation-services.component';

describe('ReservationServicesComponent - Server-Side Search (Unit)', () => {
  let component: ReservationServicesComponent;

  beforeEach(() => {
    // Create mock services that the constructor calls
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/reservation-services' } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({ reset: () => {}, patchValue: () => {}, controls: {}, value: '' }) } as any;

    component = new ReservationServicesComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockRouter,
      mockAuthService,
      null as any, // confirmationService
      null as any, // messageService
      mockTranslateService,
      mockTranslationService,
      null as any, // reservationServiceService
      null as any, // detailAccountService
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize totalRecords to 0', () => {
    expect(component.totalRecords).toBe(0);
  });

  it('should initialize pageSize to 10', () => {
    expect(component.pageSize).toBe(10);
  });

  it('should initialize searchSubject', () => {
    expect(component.searchSubject).toBeTruthy();
  });

  it('should read USE_SERVER_SEARCH from environment', () => {
    expect(component.useServerSearch).toBe(true);
  });

  it('filter should emit to searchSubject when useServerSearch is true', () => {
    component.useServerSearch = true;
    const spy = spyOn(component.searchSubject, 'next');
    const mockEvent = { target: { value: 'reservation' } } as any;
    const mockTable = {} as any;

    component.filter(mockTable, mockEvent);

    expect(spy).toHaveBeenCalledWith('reservation');
  });

  it('filter should call filterGlobal when useServerSearch is false', () => {
    component.useServerSearch = false;
    const filterGlobalSpy = jasmine.createSpy('filterGlobal');
    const mockTable = { filterGlobal: filterGlobalSpy } as any;
    const mockEvent = { target: { value: 'reservation' } } as any;

    component.filter(mockTable, mockEvent);

    expect(filterGlobalSpy).toHaveBeenCalledWith('reservation', 'contains');
  });

  it('clear should reset searchValue and totalRecords when useServerSearch is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;
    component.searchValue = 'test';
    component.totalRecords = 5;
    const mockTable = { clear: jasmine.createSpy('clear') } as any;

    component.clear(mockTable);

    expect(component.searchValue).toBe('');
    expect(component.totalRecords).toBe(0);
    expect(mockTable.clear).toHaveBeenCalled();
  });

  it('clear should not reset totalRecords when useServerSearch is false', () => {
    component.useServerSearch = false;
    component.searchValue = 'test';
    component.totalRecords = 5;
    const mockTable = { clear: jasmine.createSpy('clear') } as any;

    component.clear(mockTable);

    expect(component.searchValue).toBe('');
    expect(component.totalRecords).toBe(5); // unchanged
  });

  it('ngOnDestroy should unsubscribe from searchSub', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (component as any).searchSub = { unsubscribe: unsubSpy };

    component.ngOnDestroy();

    expect(unsubSpy).toHaveBeenCalled();
  });

  it('loadReservationServiceLazy should extract search query from event.filters', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationServiceLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: 'test query' } }
    });

    expect(searchPagedSpy).toHaveBeenCalledWith('test query', 1, 10, 'createdAt', -1);
  });

  it('loadReservationServiceLazy should calculate correct page from first/rows', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationServiceLazy({
      first: 20,
      rows: 10,
      filters: { global: { value: '' } }
    });

    // first=20, rows=10 → page 3
    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1);
  });

  it('loadReservationServiceLazy should update reservationServices and totalRecords from response', () => {
    const mockServices = [
      { id: '1', arabicName: 'Service 1', englishName: 'Service 1', mainAccountId: 'acc1', revenueMainAccountId: 'rev1', expenseMainAccountId: null },
      { id: '2', arabicName: 'Service 2', englishName: 'Service 2' }
    ];
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: mockServices, totalCount: 2 })
    );
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationServiceLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: '' } }
    });

    expect(component.totalRecords).toBe(2);
    expect(component.reservationServices.length).toBe(2);
    expect(component.reservationServices[0].isConnected).toBe(true); // mainAccountId exists
    expect(component.reservationServices[1].isConnected).toBe(false); // no mainAccountId
    expect(component.reservationServices[0].revenueMainAccountConnected).toBe(true);
    expect(component.reservationServices[0].expenseMainAccountConnected).toBe(false);
  });

  it('loadReservationServiceLazy should not call searchPaged when isFrontal is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.isFrontal = true;

    component.loadReservationServiceLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });

  it('loadReservationServiceLazy should not call searchPaged when useServerSearch is false', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationServiceService = { searchPaged: searchPagedSpy };
    component.useServerSearch = false;
    component.isFrontal = false;

    component.loadReservationServiceLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });
});
