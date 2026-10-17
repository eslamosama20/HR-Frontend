import { of, Subject } from 'rxjs';
import { ReservationSeasonsComponent } from './reservation-seasons.component';
import { signal } from '@angular/core';

describe('ReservationSeasonsComponent - Server-Side Search (Unit)', () => {
  let component: ReservationSeasonsComponent;

  beforeEach(() => {
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/reservation-seasons' } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = { group: () => ({}) } as any;

    component = new ReservationSeasonsComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockAuthService,
      null as any,
      null as any,
      mockTranslateService,
      mockTranslationService,
      null as any,
      null as any,
      null as any,
      mockRouter,
    );
  });

  it('should create', () => expect(component).toBeTruthy());
  it('should initialize totalRecords to 0', () => expect(component.totalRecords).toBe(0));
  it('should initialize pageSize to 10', () => expect(component.pageSize).toBe(10));
  it('should have searchSubject initialized', () => expect(component.searchSubject).toBeTruthy());
  it('should read USE_SERVER_SEARCH from environment', () => expect(component.useServerSearch).toBe(true));

  it('filter should emit to searchSubject when useServerSearch is true', () => {
    component.useServerSearch = true;
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

  it('clear should reset searchValue and totalRecords when useServerSearch is true', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    (component as any).reservationSeasonService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);
    component.searchValue = 'test';
    component.totalRecords = 5;
    component.clear({ clear: jasmine.createSpy('clear') } as any);
    expect(component.searchValue).toBe('');
    expect(component.totalRecords).toBe(0);
  });

  it('ngOnDestroy should unsubscribe from searchSub', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (component as any).searchSub = { unsubscribe: unsubSpy };
    component.ngOnDestroy();
    expect(unsubSpy).toHaveBeenCalled();
  });

  it('loadReservationSeasonLazy should call searchPaged', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [], totalCount: 0 }));
    (component as any).reservationSeasonService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);
    component.loadReservationSeasonLazy({ first: 0, rows: 10, filters: { global: { value: 'test' } } });
    expect(searchPagedSpy).toHaveBeenCalledWith('test', 1, 10, 'createdAt', -1);
  });

  it('loadReservationSeasonLazy should update totalRecords', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(of({ data: [{ id: '1' }, { id: '2' }], totalCount: 2 }));
    (component as any).reservationSeasonService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };
    component.useServerSearch = true;
    component.isFrontal.set(false);
    component.loadReservationSeasonLazy({ first: 0, rows: 10 });
    expect(component.totalRecords).toBe(2);
    expect(component.reservationSeasons.length).toBe(2);
  });
});
