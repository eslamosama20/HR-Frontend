import { of, Subject } from 'rxjs';
import { ReservationSupplierComponent } from './reservation-supplier.component';

describe('ReservationSupplierComponent - Server-Side Search (Unit)', () => {
  let component: ReservationSupplierComponent;

  beforeEach(() => {
    // Create mock services that the constructor calls
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/reservation-supplier' } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({}) } as any;

    component = new ReservationSupplierComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockRouter,
      mockAuthService,
      null as any, // confirmationService
      null as any, // messageService
      mockTranslateService,
      mockTranslationService,
      null as any, // reservationSuppliersService
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
    const mockEvent = { target: { value: 'supplier1' } } as any;
    const mockTable = {} as any;

    component.filter(mockTable, mockEvent);

    expect(spy).toHaveBeenCalledWith('supplier1');
  });

  it('filter should call filterGlobal when useServerSearch is false', () => {
    component.useServerSearch = false;
    const filterGlobalSpy = jasmine.createSpy('filterGlobal');
    const mockTable = { filterGlobal: filterGlobalSpy } as any;
    const mockEvent = { target: { value: 'supplier1' } } as any;

    component.filter(mockTable, mockEvent);

    expect(filterGlobalSpy).toHaveBeenCalledWith('supplier1', 'contains');
  });

  it('clear should reset searchValue and totalRecords when useServerSearch is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
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

  it('loadReservationSupplierLazy should extract search query from event.filters', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationSupplierLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: 'test query' } }
    });

    expect(searchPagedSpy).toHaveBeenCalledWith('test query', 1, 10, 'createdAt', -1);
  });

  it('loadReservationSupplierLazy should calculate correct page from first/rows', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationSupplierLazy({
      first: 20,
      rows: 10,
      filters: { global: { value: '' } }
    });

    // first=20, rows=10 → page 3
    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1);
  });

  it('loadReservationSupplierLazy should update reservationSuppliers and totalRecords from response', () => {
    const mockSuppliers = [
      { id: '1', arabicName: 'Supplier 1', englishName: 'Supplier 1', mainAccountId: 'acc1' },
      { id: '2', arabicName: 'Supplier 2', englishName: 'Supplier 2' }
    ];
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: mockSuppliers, totalCount: 2 })
    );
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadReservationSupplierLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: '' } }
    });

    expect(component.totalRecords).toBe(2);
    expect(component.reservationSuppliers.length).toBe(2);
    expect(component.reservationSuppliers[0].isConnected).toBe(true); // mainAccountId exists
    expect(component.reservationSuppliers[1].isConnected).toBe(false); // no mainAccountId
  });

  it('loadReservationSupplierLazy should not call searchPaged when isFrontal is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.isFrontal = true;

    component.loadReservationSupplierLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });

  it('loadReservationSupplierLazy should not call searchPaged when useServerSearch is false', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).reservationSuppliersService = { searchPaged: searchPagedSpy };
    component.useServerSearch = false;
    component.isFrontal = false;

    component.loadReservationSupplierLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });
});
