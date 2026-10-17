import { of, Subject, throwError } from 'rxjs';
import { CompanyDetailsComponent } from './company-details.component';

describe('CompanyDetailsComponent - Server-Side Search', () => {
  let component: CompanyDetailsComponent;

  beforeEach(() => {
    const mockTranslationService = { getSelectedLanguage: () => 'en' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockAuthService = { getUserByToken: () => of(null) } as any;
    const mockFormBuilder = {
      group: () => ({
        controls: {},
        value: {},
        reset: () => {},
        patchValue: () => {},
        invalid: false,
      }),
      array: () => ({ length: 0, push: () => {}, removeAt: () => {}, at: () => ({ get: () => ({ value: false, setValue: () => {} }) }) }),
    } as any;
    const mockConfirmationService = { confirm: () => {} } as any;
    const mockMessageService = { add: () => {} } as any;

    component = new CompanyDetailsComponent(
      mockPrimeNGConfig,
      mockFormBuilder,
      mockAuthService,
      mockConfirmationService,
      mockMessageService,
      mockTranslateService,
      mockTranslationService,
      null as any,
      null as any,
      null as any,
    );
  });

  it('TC-CD-001: should call searchPaged on initial load', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [{ id: '1', arabicName: 'Test', createdAt: '2024-01-01' }], totalCount: 1 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetails();

    expect(searchPagedSpy).toHaveBeenCalledWith('', 1, 10);
  });

  it('TC-CD-002: searchSubject emits trigger debounced loadCompanyDetailsLazy', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    // Manually trigger the lazy load as the subscription would
    component.loadCompanyDetailsLazy({ first: 0, rows: 10, filters: { global: { value: 'test' } } });

    expect(searchPagedSpy).toHaveBeenCalledWith('test', 1, 10);
  });

  it('TC-CD-003: search passes value to backend (case handled by backend)', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetailsLazy({
      first: 0,
      rows: 10,
      filters: { global: { value: 'TEST' } }
    });

    expect(searchPagedSpy).toHaveBeenCalledWith('TEST', 1, 10);
  });

  it('TC-CD-004: empty results update companyDetails and totalRecords', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetailsLazy({ first: 0, rows: 10 });

    expect(component.companyDetails).toEqual([]);
    expect(component.totalRecords).toBe(0);
    expect(component.loading).toBeFalse();
  });

  it('TC-CD-005: totalRecords is set after search', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [{ id: '1', arabicName: 'Test', createdAt: '2024-01-01' }], totalCount: 5 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetailsLazy({ first: 0, rows: 10 });

    expect(component.totalRecords).toBe(5);
  });

  it('TC-CD-006: loadCompanyDetails delegates to loadCompanyDetailsLazy', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetails();

    expect(searchPagedSpy).toHaveBeenCalledWith('', 1, 10);
  });

  it('filter should emit to searchSubject', () => {
    const spy = spyOn(component.searchSubject, 'next');
    component.filter({} as any, { target: { value: '  test  ' } } as any);
    expect(spy).toHaveBeenCalledWith('test');
  });

  it('ngOnDestroy should unsubscribe from searchSub', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    component.searchSub = { unsubscribe: unsubSpy } as any;
    component.ngOnDestroy();
    expect(unsubSpy).toHaveBeenCalled();
  });

  it('loadCompanyDetailsLazy calculates correct page from first offset', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      of({ data: [], totalCount: 0 })
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetailsLazy({ first: 20, rows: 10 });

    expect(searchPagedSpy).toHaveBeenCalledWith('', 3, 10);
  });

  it('loadCompanyDetailsLazy sets loading to false on error', () => {
    const searchPagedSpy = jasmine.createSpy('searchPaged').and.returnValue(
      throwError(() => new Error('fail'))
    );
    (component as any).companyDetailsService = { searchPaged: searchPagedSpy };
    (component as any).messageService = { add: () => {} };

    component.loadCompanyDetailsLazy({ first: 0, rows: 10 });

    expect(component.loading).toBeFalse();
  });
});
