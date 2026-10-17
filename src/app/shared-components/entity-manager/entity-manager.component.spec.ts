import { of, Subject } from 'rxjs';
import { EntityManagerComponent } from './entity-manager.component';

describe('EntityManagerComponent - Server-Side Search (Unit)', () => {
  let component: EntityManagerComponent<any>;

  beforeEach(() => {
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({}) } as any;
    const mockRouter = {} as any;
    const mockConfirmationService = { confirm: () => {} } as any;
    const mockMessageService = { add: () => {} } as any;
    const mockCdr = { detectChanges: () => {} } as any;

    component = new EntityManagerComponent<any>(
      mockAuthService,
      mockFormBuilder,
      mockTranslateService,
      mockTranslationService,
      mockRouter,
      mockConfirmationService,
      mockMessageService,
      mockCdr,
    );

    // Set required inputs
    component.entityName = 'TestEntity';
    component.columns = [];
    component.formConfig = { title: 'Test', fields: [], onSubmit: () => {} } as any;
    component.actions = {} as any;
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should initialize totalRecords to 0', () => {
    expect(component.totalRecords).toBe(0);
  });

  it('should initialize pageSize to 10', () => {
    expect(component.pageSize).toBe(10);
  });

  it('should have searchSubject initialized', () => {
    expect(component.searchSubject).toBeTruthy();
  });

  it('should read USE_SERVER_SEARCH from environment', () => {
    expect(component.useServerSearch).toBe(true);
  });

  it('filter should emit to searchSubject when useServerSearch is true and service is provided', () => {
    component.useServerSearch = true;
    component.service = { searchPaged: jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 })) };
    const spy = spyOn(component.searchSubject, 'next');
    component.filter({} as any, { target: { value: 'test' } } as any);
    expect(spy).toHaveBeenCalledWith('test');
  });

  it('filter should call filterGlobal when useServerSearch is false', () => {
    component.useServerSearch = false;
    const filterGlobalSpy = jasmine.createSpy('filterGlobal');
    component.filter({ filterGlobal: filterGlobalSpy } as any, { target: { value: 'test' } } as any);
    expect(filterGlobalSpy).toHaveBeenCalledWith('test', 'contains');
  });

  it('filter should call filterGlobal when service is not provided', () => {
    component.useServerSearch = true;
    component.service = null;
    const filterGlobalSpy = jasmine.createSpy('filterGlobal');
    component.filter({ filterGlobal: filterGlobalSpy } as any, { target: { value: 'test' } } as any);
    expect(filterGlobalSpy).toHaveBeenCalledWith('test', 'contains');
  });

  it('clear should reset searchValue and totalRecords when useServerSearch is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    component.service = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.searchValue = 'test';
    component.totalRecords = 5;
    component.clear({ clear: jasmine.createSpy('clear') } as any);
    expect(component.searchValue).toBe('');
    expect(component.totalRecords).toBe(0);
  });

  it('clear should not reset totalRecords when useServerSearch is false', () => {
    component.useServerSearch = false;
    component.searchValue = 'test';
    component.totalRecords = 5;
    component.clear({ clear: jasmine.createSpy('clear') } as any);
    expect(component.searchValue).toBe('');
    expect(component.totalRecords).toBe(5);
  });

  it('ngOnDestroy should unsubscribe from searchSub', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (component as any).searchSub = { unsubscribe: unsubSpy };
    component.ngOnDestroy();
    expect(unsubSpy).toHaveBeenCalled();
  });

  it('loadEntitiesLazy should call searchPaged', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    component.service = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.loadEntitiesLazy({ first: 0, rows: 10, filters: { global: { value: 'test' } } });
    expect(searchPagedSpy).toHaveBeenCalledWith('test', 1, 10, 'createdAt', -1);
  });

  it('loadEntitiesLazy should update data and totalRecords', () => {
    const mockData = [{ id: '1', createdAt: '2024-01-01' }, { id: '2', createdAt: '2024-01-02' }];
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: mockData, totalCount: 2 }));
    component.service = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.loadEntitiesLazy({ first: 0, rows: 10 });
    expect(component.totalRecords).toBe(2);
    expect(component.data.length).toBe(2);
  });

  it('loadEntitiesLazy should not call searchPaged when useServerSearch is false', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    component.service = { searchPaged: searchPagedSpy };
    component.useServerSearch = false;
    component.loadEntitiesLazy({ first: 0, rows: 10 });
    expect(searchPagedSpy).not.toHaveBeenCalled();
  });

  it('loadEntitiesLazy should not call searchPaged when service is not provided', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged');
    component.service = null;
    component.useServerSearch = true;
    component.loadEntitiesLazy({ first: 0, rows: 10 });
    // No service means no searchPaged call
    expect(component.loading).toBe(false); // loading stays false since no response was triggered
  });

  it('loadEntitiesLazy should calculate correct page from first offset', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    component.service = { searchPaged: searchPagedSpy };
    component.useServerSearch = true;
    component.loadEntitiesLazy({ first: 20, rows: 10 });
    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1);
  });

  it('loadEntitiesLazy should use loadData when provided (priority over service)', () => {
    const mockData = [{ id: '1', createdAt: '2024-01-01' }, { id: '2', createdAt: '2024-01-02' }];
    const loadSpy = jasmine.createSpy('load').and.returnValue(of({ data: mockData, totalCount: 2 }));
    component.loadData = { load: loadSpy };
    component.service = { searchPaged: jasmine.createSpy('searchPaged') };
    component.useServerSearch = true;

    component.loadEntitiesLazy({ first: 0, rows: 10 });

    expect(loadSpy).toHaveBeenCalledWith(1, 10, '', 'createdAt', -1);
    expect(component.totalRecords).toBe(2);
    expect(component.data.length).toBe(2);
    expect(component.data[0].createdAt instanceof Date).toBe(true);
    expect(component.loading).toBe(false);
    // service.searchPaged should NOT have been called since loadData takes priority
    expect(component.service.searchPaged).not.toHaveBeenCalled();
  });

  it('ngOnInit should fire initial loadData.load(1, pageSize) when loadData is set', () => {
    const mockData = [{ id: '1', createdAt: '2024-01-01' }];
    const loadSpy = jasmine.createSpy('load').and.returnValue(of({ data: mockData, totalCount: 1 }));
    component.loadData = { load: loadSpy };

    component.ngOnInit();

    expect(loadSpy).toHaveBeenCalledWith(1, 10);
    expect(component.totalRecords).toBe(1);
    expect(component.data.length).toBe(1);
    expect(component.loading).toBe(false);
  });
});
