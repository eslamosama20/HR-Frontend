import { of, Subject } from 'rxjs';
import { HotelsComponent } from './hotels.component';

describe('HotelsComponent - Server-Side Search (Unit)', () => {
  let component: HotelsComponent;

  beforeEach(() => {
    // Create mock services that the constructor calls
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/hotels' } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({}) } as any;
    const mockHotelDialogService = { openDialog$: new Subject() } as any;

    component = new HotelsComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockAuthService,
      null as any, // confirmationService
      null as any, // messageService
      mockTranslateService,
      mockTranslationService,
      null as any, // hotelsService
      null as any, // detailAccountService
      null as any, // mainAccountService
      mockRouter,
      mockHotelDialogService,
    );
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
    const mockEvent = { target: { value: 'hilton' } } as any;
    const mockTable = {} as any;

    component.filter(mockTable, mockEvent);

    expect(spy).toHaveBeenCalledWith('hilton');
  });

  it('filter should call filterGlobal when useServerSearch is false', () => {
    component.useServerSearch = false;
    const filterGlobalSpy = jasmine.createSpy('filterGlobal');
    const mockTable = { filterGlobal: filterGlobalSpy } as any;
    const mockEvent = { target: { value: 'hilton' } } as any;

    component.filter(mockTable, mockEvent);

    expect(filterGlobalSpy).toHaveBeenCalledWith('hilton', 'contains');
  });

  it('clear should reset searchValue and totalRecords when useServerSearch is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
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

  it('ngOnDestroy should unsubscribe from dialogSub', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (component as any).dialogSub = { unsubscribe: unsubSpy };

    component.ngOnDestroy();

    expect(unsubSpy).toHaveBeenCalled();
  });

  it('loadHotelsLazy should extract search query from event.filters', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadHotelsLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: 'test query' } }
    });

    expect(searchPagedSpy).toHaveBeenCalledWith('test query', 1, 10, 'createdAt', -1);
  });

  it('loadHotelsLazy should calculate correct page from first/rows', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadHotelsLazy({
      first: 20,
      rows: 10,
      filters: { global: { value: '' } }
    });

    // first=20, rows=10 → page 3
    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1);
  });

  it('loadHotelsLazy should update hotels and totalRecords from response', () => {
    const mockHotels = [
      { id: '1', arabicName: 'Hotel 1', englishName: 'Hotel 1', mainAccountId: 'acc1' },
      { id: '2', arabicName: 'Hotel 2', englishName: 'Hotel 2' }
    ];
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: mockHotels, totalCount: 2 })
    );
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal = false;

    component.loadHotelsLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: '' } }
    });

    expect(component.totalRecords).toBe(2);
    expect(component.hotels.length).toBe(2);
    expect(component.hotels[0].isConnected).toBe(true); // mainAccountId exists
    expect(component.hotels[1].isConnected).toBe(false); // no mainAccountId
  });

  it('loadHotelsLazy should not call searchPaged when isFrontal is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.isFrontal = true;

    component.loadHotelsLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });

  it('loadHotelsLazy should not call searchPaged when useServerSearch is false', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    (component as any).hotelsService = { searchPaged: searchPagedSpy };
    component.useServerSearch = false;
    component.isFrontal = false;

    component.loadHotelsLazy({ first: 0, rows: 10 });

    expect(searchPagedSpy).not.toHaveBeenCalled();
  });
});
