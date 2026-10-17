import { of, Subject } from 'rxjs';
import { ReservationViewComponent } from './reservation-view.component';

describe('ReservationViewComponent - Server-Side Search (Unit)', () => {
  let component: ReservationViewComponent;

  beforeEach(() => {
    // Create mock services that the constructor calls
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/reservation-view' } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({}) } as any;

    component = new ReservationViewComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockAuthService,
      null as any, // confirmationService
      null as any, // messageService
      mockTranslateService,
      mockTranslationService,
      null as any, // reservationViewService
      null as any, // detailAccountService
      mockRouter,
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
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);
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

  it('loadReservationViewLazy should extract search query from event.filters', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);

    component.loadReservationViewLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: 'test query' } }
    });

    expect(searchPagedSpy).toHaveBeenCalledWith('test query', 1, 10, 'createdAt', -1);
  });

  it('loadReservationViewLazy should calculate correct page from first/rows', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);

    component.loadReservationViewLazy({
      first: 20,
      rows: 10,
      filters: { global: { value: '' } }
    });

    // first=20, rows=10 → page 3
    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1);
  });

  it('loadReservationViewLazy should update reservationViews and totalRecords from response', () => {
    const mockData = [
      { id: '1', arabicName: 'View 1', englishName: 'View 1', createdAt: '2024-01-01' },
      { id: '2', arabicName: 'View 2', englishName: 'View 2', createdAt: '2024-02-01' }
    ];
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: mockData, totalCount: 2 })
    );
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);

    component.loadReservationViewLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: '' } }
    });

    expect(component.totalRecords).toBe(2);
    expect(component.reservationViews.length).toBe(2);
  });

  it('loadReservationViewLazy should not call searchPaged when isFrontal is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.isFrontal.set(true);

    component.loadReservationViewLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });

  it('loadReservationViewLazy should not call searchPaged when useServerSearch is false', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationViewService = { searchPaged: searchPagedSpy };
    component.useServerSearch = false;
    component.isFrontal.set(false);

    component.loadReservationViewLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });
});
