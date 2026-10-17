import { of, Subject, throwError } from 'rxjs';
import { CustomerProfileComponent } from './customer-profile.component';

describe('CustomerProfileComponent - Server-Side Search (Unit)', () => {
  let component: CustomerProfileComponent;

  beforeEach(() => {
    // Create mock services that the constructor calls
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = { url: '/customer-profiles' } as any;
    const mockRoute = { snapshot: { paramMap: { get: () => null } } } as any;
    const mockAuthService = {
      getUserByToken: () => of(null),
      getUserByTokenWithParams: () => of(null),
    } as any;
    const mockFormBuilder = {
      group: () => ({
        controls: {
          id: { value: null },
          arabicName: { value: '' },
          englishName: { value: '' },
          taxNumber: { value: '' },
          contactNumber: { value: '' },
          email: { value: '' },
          bankName: { value: '' },
          bankAccountNumber: { value: '' },
          iban: { value: '' },
          street: { value: '' },
          district: { value: '' },
          shortAddress: { value: '' },
          buildingNumber: { value: '' },
          postalCode: { value: '' },
          city: { value: '' },
          country: { value: '' },
          additionalContactNumber: { value: '' },
          fax: { value: '' },
          website: { value: '' },
          instructions: { value: '' },
          gaztNumber: { value: '' },
          otherId: { value: '' },
          mainAccountId: { value: null },
          isFrontal: { value: false },
          isForProjects: { value: false },
        },
        reset: () => {},
        patchValue: () => {},
        invalid: false,
      }),
    } as any;

    component = new CustomerProfileComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockAuthService,
      null as any, // confirmationService
      null as any, // messageService
      mockTranslateService,
      mockTranslationService,
      null as any, // customerProfileService
      null as any, // detailAccountService
      mockRoute,
      mockRouter,
      null as any, // cdr
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

  describe('filter behavior', () => {
    it('should emit to searchSubject when useServerSearch is true', () => {
      component.useServerSearch = true;
      const spy = spyOn(component.searchSubject, 'next');
      const mockEvent = { target: { value: 'ahmed' } } as any;
      const mockTable = {} as any;

      component.filter(mockTable, mockEvent);

      expect(spy).toHaveBeenCalledWith('ahmed');
    });

    it('should call filterGlobal when useServerSearch is false', () => {
      component.useServerSearch = false;
      const filterGlobalSpy = jasmine.createSpy('filterGlobal');
      const mockTable = { filterGlobal: filterGlobalSpy } as any;
      const mockEvent = { target: { value: 'ahmed' } } as any;

      component.filter(mockTable, mockEvent);

      expect(filterGlobalSpy).toHaveBeenCalledWith('ahmed', 'contains');
    });

    it('should trim the search value before passing it', () => {
      component.useServerSearch = true;
      const spy = spyOn(component.searchSubject, 'next');
      const mockEvent = { target: { value: '  hello  ' } } as any;
      const mockTable = {} as any;

      component.filter(mockTable, mockEvent);

      expect(spy).toHaveBeenCalledWith('hello');
    });
  });

  describe('clear behavior', () => {
    it('should reset searchValue', () => {
      component.useServerSearch = false;
      component.searchValue = 'test';
      const mockTable = { clear: jasmine.createSpy('clear') } as any;

      component.clear(mockTable);

      expect(component.searchValue).toBe('');
    });

    it('should call table.clear()', () => {
      component.useServerSearch = false;
      const mockTable = { clear: jasmine.createSpy('clear') } as any;

      component.clear(mockTable);

      expect(mockTable.clear).toHaveBeenCalled();
    });

    it('should reset totalRecords and reload when useServerSearch is true', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(of({ data: [], totalCount: 0 }));
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;
      component.searchValue = 'test';
      component.totalRecords = 50;

      const mockTable = { clear: jasmine.createSpy('clear') } as any;
      component.clear(mockTable);

      expect(component.totalRecords).toBe(0);
      expect(mockTable.clear).toHaveBeenCalled();
      expect(searchPagedSpy).toHaveBeenCalled();
    });

    it('should not reset totalRecords when useServerSearch is false', () => {
      component.useServerSearch = false;
      component.searchValue = 'test';
      component.totalRecords = 50;

      const mockTable = { clear: jasmine.createSpy('clear') } as any;
      component.clear(mockTable);

      expect(component.searchValue).toBe('');
      expect(component.totalRecords).toBe(50); // unchanged
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from searchSub', () => {
      const unsubSpy = jasmine.createSpy('unsubscribe');
      (component as any).searchSub = { unsubscribe: unsubSpy };

      component.ngOnDestroy();

      expect(unsubSpy).toHaveBeenCalled();
    });

    it('should not throw when searchSub is not set', () => {
      (component as any).searchSub = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('loadCustomerProfilesLazy', () => {
    it('should call searchPagedWithCompanyFilter and update totalRecords when useServerSearch is true', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        of({
          data: [{ id: '1', arabicName: 'Test Customer', createdAt: '2024-01-01' }],
          totalCount: 1,
        })
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({
        first: 0,
        rows: 10,
        filters: { global: { value: '' } },
      });

      expect(searchPagedSpy).toHaveBeenCalledWith('', 1, 10, 'createdAt', -1, null);
      expect(component.totalRecords).toBe(1);
      expect(component.customerProfiles.length).toBe(1);
      expect(component.loading).toBeFalse();
    });

    it('should calculate correct page from first/rows offset', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        of({ data: [], totalCount: 0 })
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({
        first: 20,
        rows: 10,
        filters: { global: { value: '' } },
      });

      // first=20, rows=10 -> page 3
      expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10, 'createdAt', -1, null);
    });

    it('should use searchQuery from event filters when available', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        of({ data: [], totalCount: 0 })
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({
        first: 0,
        rows: 10,
        filters: { global: { value: 'search term' } },
      });

      expect(searchPagedSpy).toHaveBeenCalledWith('search term', 1, 10, 'createdAt', -1, null);
    });

    it('should fall back to searchValue when event filters are empty', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        of({ data: [], totalCount: 0 })
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;
      component.searchValue = 'fallback';

      component.loadCustomerProfilesLazy({ first: 0, rows: 10 });

      expect(searchPagedSpy).toHaveBeenCalledWith('fallback', 1, 10, 'createdAt', -1, null);
    });

    it('should not call searchPagedWithCompanyFilter when useServerSearch is false', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter');
      const getPagedSpy = jasmine.createSpy('getPaged').and.returnValue(
        of({ data: [], totalCount: 0 })
      );
      (component as any).customerProfileService = {
        searchPagedWithCompanyFilter: searchPagedSpy,
        getPaged: getPagedSpy,
      };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = false;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({ first: 0, rows: 10 });

      expect(searchPagedSpy).not.toHaveBeenCalled();
    });

    it('should not call searchPagedWithCompanyFilter when isFrontal is true', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter');
      const getAllFrontalSpy = jasmine.createSpy('getAllFrontal').and.returnValue(of([]));
      (component as any).customerProfileService = {
        searchPagedWithCompanyFilter: searchPagedSpy,
        getAllFrontal: getAllFrontalSpy,
      };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = true;

      component.loadCustomerProfilesLazy({ first: 0, rows: 10 });

      expect(searchPagedSpy).not.toHaveBeenCalled();
    });

    it('should set loading to false on error', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        throwError(() => new Error('fail'))
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({ first: 0, rows: 10 });

      expect(component.loading).toBeFalse();
    });

    it('should convert createdAt strings to Date objects', () => {
      const searchPagedSpy = jasmine.createSpy('searchPagedWithCompanyFilter').and.returnValue(
        of({
          data: [{ id: '1', arabicName: 'Test', createdAt: '2024-01-15T12:00:00Z' }],
          totalCount: 1,
        })
      );
      (component as any).customerProfileService = { searchPagedWithCompanyFilter: searchPagedSpy };
      (component as any).messageService = { add: () => {} };
      component.useServerSearch = true;
      component.isFrontal = false;

      component.loadCustomerProfilesLazy({ first: 0, rows: 10 });

      expect(component.customerProfiles[0].createdAt instanceof Date).toBeTrue();
    });
  });
});
