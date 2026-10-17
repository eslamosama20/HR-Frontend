import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { AddSupplierProfileComponent } from './add-supplier-profile.component';

describe('AddSupplierProfileComponent - Account Cascade & Edit Mode (Unit)', () => {
  let detailAccountsMock: any[];
  let mainAccountsMock: any[];
  let paramId: string | null;
  let getByIdResult: any;
  let updateSpy: jasmine.Spy;
  let createSpy: jasmine.Spy;

  function createComponent() {
    const mockTranslationService = { getSelectedLanguage: () => 'ar' } as any;
    const mockTranslateService = { instant: (key: string) => key } as any;
    const mockPrimeNGConfig = { setTranslation: () => {} } as any;
    const mockRouter = {
      url: '/inventory/supplier-details/new',
      navigate: jasmine.createSpy('navigate'),
    } as any;
    const mockRoute = { snapshot: { paramMap: { get: () => paramId } } } as any;
    const mockMessageService = { add: jasmine.createSpy('add') } as any;
    const mockMainAccountService = {
      getAll: () => of(mainAccountsMock),
    } as any;
    const mockSupplierStatusService = { getAll: () => of([]) } as any;
    const mockDetailAccountService = {
      getAll: () => of(detailAccountsMock),
    } as any;
    const mockSupplierDetailsService = {
      getById: (_id: string) => of(getByIdResult),
      update: updateSpy,
      create: createSpy,
    } as any;

    return new AddSupplierProfileComponent(
      mockPrimeNGConfig,
      new FormBuilder(),
      mockMessageService,
      mockTranslateService,
      mockTranslationService,
      mockSupplierDetailsService,
      mockMainAccountService,
      mockDetailAccountService,
      mockSupplierStatusService,
      mockRouter,
      mockRoute,
      { hasPermission: () => true } as any
    );
  }

  beforeEach(() => {
    detailAccountsMock = [
      {
        id: 'da-cred',
        arabicName: 'دائنون',
        englishName: 'Creditors',
        mainAccounts: [
          { id: 'ma-1', arabicName: 'مؤسسة النور', englishName: 'Al-Noor', detailAccountId: 'da-cred' },
        ],
      },
      {
        id: 'da-other',
        arabicName: 'العملاء',
        englishName: 'Customers',
        mainAccounts: [
          { id: 'ma-2', arabicName: 'شركة الأفق', englishName: 'Horizon', detailAccountId: 'da-other' },
        ],
      },
    ];
    mainAccountsMock = [
      {
        id: 'ma-1',
        arabicName: 'مؤسسة النور',
        englishName: 'Al-Noor',
        detailAccountId: 'da-cred',
      },
      {
        id: 'ma-2',
        arabicName: 'شركة الأفق',
        englishName: 'Horizon',
        detailAccountId: 'da-other',
      },
    ];
    paramId = null;
    getByIdResult = null;
    updateSpy = jasmine.createSpy('update').and.returnValue(of({}));
    createSpy = jasmine.createSpy('create').and.returnValue(of({}));
  });

  it('should create', () => {
    const component = createComponent();
    expect(component).toBeTruthy();
  });

  it('defaults the parent group to «دائنون» for a new supplier', () => {
    const component = createComponent();
    component.ngOnInit();
    expect(component.selectedDetailAccountId).toBe('da-cred');
    expect(component.supplierId).toBeNull();
  });

  it('filters MainAccount options by the selected parent group', () => {
    const component = createComponent();
    component.detailAccounts = detailAccountsMock as any;
    component.mainAccounts = mainAccountsMock as any;
    component.selectedDetailAccountId = 'da-cred';
    expect(component.mainAccountOptions).toEqual([
      { value: 'ma-1', label: 'مؤسسة النور' },
    ]);

    component.selectedDetailAccountId = 'da-other';
    expect(component.mainAccountOptions).toEqual([
      { value: 'ma-2', label: 'شركة الأفق' },
    ]);

    component.selectedDetailAccountId = null;
    expect(component.mainAccountOptions).toEqual([]);
  });

  it('clears an out-of-group MainAccount when the parent group changes (T007)', () => {
    const component = createComponent();
    component.detailAccounts = detailAccountsMock as any;
    component.mainAccounts = mainAccountsMock as any;
    component.selectedDetailAccountId = 'da-other';
    component.supplierProfileFormGroup.controls.mainAccountId.setValue('ma-2');

    // Switch to a group that ma-2 does NOT belong to → selection must clear.
    component.selectedDetailAccountId = 'da-cred';
    expect(
      component.supplierProfileFormGroup.controls.mainAccountId.value,
    ).toBeNull();

    // Re-selecting within the group does not wipe a valid selection.
    component.supplierProfileFormGroup.controls.mainAccountId.setValue('ma-1');
    component.selectedDetailAccountId = 'da-cred';
    expect(
      component.supplierProfileFormGroup.controls.mainAccountId.value,
    ).toBe('ma-1');
  });

  it('loads the supplier in edit mode and patches mainAccountId + parent group', () => {
    paramId = 'sup-1';
    getByIdResult = {
      id: 'sup-1',
      arabicName: 'مؤسسة النور للتوريدات',
      englishName: 'Al-Noor Trading',
      mainAccountId: 'ma-1',
      mainAccount: { detailAccountId: 'da-cred' },
      country: "",
    };
    const component = createComponent();
    component.ngOnInit();

    expect(component.supplierId).toBe('sup-1');
    expect(component.supplierProfileFormGroup.controls.id.value).toBe('sup-1');
    expect(
      component.supplierProfileFormGroup.controls.mainAccountId.value,
    ).toBe('ma-1');
    expect(component.selectedDetailAccountId).toBe('da-cred');
    expect(component.supplierProfileFormGroup.controls.arabicName.value).toBe(
      'مؤسسة النور للتوريدات',
    );
  });

  it('legacy supplier: opens with no account, stays unlinked (T010)', () => {
    paramId = 'sup-legacy';
    getByIdResult = {
      id: 'sup-legacy',
      arabicName: 'مورد قديم',
      mainAccountId: null,
      country: "",
    };
    const component = createComponent();
    component.ngOnInit();

    expect(component.selectedDetailAccountId).toBeNull();
    expect(
      component.supplierProfileFormGroup.controls.mainAccountId.value,
    ).toBeNull();
  });

  it('legacy save calls update (not create) and does not send a new account', () => {
    const component = createComponent();
    component.supplierProfileFormGroup.patchValue({
      id: 'sup-legacy',
      arabicName: 'مورد قديم',
      mainAccountId: null,
      countriesList: [],
    });
    component.saveSupplierProfile();

    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.calls.mostRecent().args[0].toJSON();
    expect(payload.id).toBe('sup-legacy');
    expect(payload.mainAccountId).toBeNull();
  });

  it('new supplier save calls create (not update)', () => {
    const component = createComponent();
    component.supplierProfileFormGroup.patchValue({
      arabicName: 'مورد جديد',
      mainAccountId: null,
      countriesList: [],
    });
    component.saveSupplierProfile();

    expect(updateSpy).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});
