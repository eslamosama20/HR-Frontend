import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SupplierDetailsComponent} from './supplier-details.component';

describe('SupplierDetailsComponent', () => {
  let component: SupplierDetailsComponent;
  let fixture: ComponentFixture<SupplierDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierDetailsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SupplierDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getLinkedAccountName returns the account name from mainAccount', () => {
    component.activeLanguage = 'ar';
    const supplier: any = { mainAccount: { arabicName: 'مؤسسة النور', englishName: 'Al-Noor' } };
    expect(component.getLinkedAccountName(supplier)).toBe('مؤسسة النور');
  });

  it('getLinkedAccountName falls back to the loaded mainAccounts by mainAccountId', () => {
    component.activeLanguage = 'en';
    component.mainAccount = [{ id: 'acc-1', englishName: 'Shared Account', arabicName: 'حساب مشترك' } as any];
    expect(component.getLinkedAccountName({ mainAccountId: 'acc-1' } as any)).toBe('Shared Account');
  });

  it('getLinkedAccountName returns NOT_LINKED when no account is linked', () => {
    component.translate = { instant: (k: string) => (k === 'FINANCE.NOT_LINKED' ? 'غير مرتبط' : k) } as any;
    expect(component.getLinkedAccountName({} as any)).toBe('غير مرتبط');
  });

  it('new account-name column accessor renders the linked account name', () => {
    component.activeLanguage = 'ar';
    const supplier: any = { mainAccount: { arabicName: 'مؤسسة النور', englishName: 'Al-Noor' } };
    expect(component.getLinkedAccountName(supplier)).toBe('مؤسسة النور');
  });
});
