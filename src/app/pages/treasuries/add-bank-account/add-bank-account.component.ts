import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService, PrimeNGConfig } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ToastModule } from 'primeng/toast';
import { Router } from '@angular/router';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { TranslationService } from 'src/app/modules/i18n';
import primengArTranslations from 'src/app/utils/primengArTranslations';

@Component({
  selector: 'app-add-bank-account',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CardModule,
    ToastModule,
    InputSwitchModule,
  ],
  providers: [
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
  templateUrl: './add-bank-account.component.html',
})
export class AddBankAccountComponent implements OnInit {
  bankAccountForm: FormGroup;
  activeLanguage: string = 'en';
  isFrontal: boolean = false;
  loading: boolean = false;
  mainAccountOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private treasuryService: TreasuryService,
    private mainAccountService: MainAccountService,
    private translateService: TranslateService,
    private translationService: TranslationService,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.bankAccountForm = this.fb.group({
      accountName: ['', Validators.required],
      bankName: ['', Validators.required],
      bankBranchName: [''],
      bankAccountNumber: ['', Validators.required],
      swiftCode: [''],
      iban: ['', Validators.required],
      mainAccountId: [null, Validators.required],
      isActive: [true],
      isFrontal: [false],
    });
  }

  ngOnInit(): void {
    this.loadMainAccounts();
    this.translateService.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang;
      if (this.activeLanguage === 'ar') {
        this.primengConfig.setTranslation(primengArTranslations);
      }
      this.loadMainAccounts();
    });
  }

  loadMainAccounts() {
    this.mainAccountService.getAll().subscribe({
      next: (mainAccounts) => {
        this.mainAccountOptions = mainAccounts.map((x) => ({
          label:
            this.activeLanguage === 'en'
              ? `${x.englishName} | ${x.referenceCode}`
              : `${x.arabicName} | ${x.referenceCode}`,
          value: x.id,
        }));
      },
      error: (error) => {
        console.log('Error Loading Main Accounts', error);
      },
    });
  }

  submitBankAccount() {
    if (this.bankAccountForm.invalid) {
      this.bankAccountForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const v = this.bankAccountForm.value;

    this.treasuryService.createGeneralBankAccount(v).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('FINANCE.SUCCESS'),
          detail: this.translateService.instant('FINANCE.BANK_ACCOUNT_CREATED'),
        });
        setTimeout(() => {
          this.cancel();
        }, 1000);
      },
      error: (err: any) => {
        console.error('Error creating GeneralBankAccount', err);
        this.loading = false;
        const detailMsg = err?.error?.message || err?.error?.Message || (typeof err?.error === 'string' ? err.error : null) || this.translateService.instant('FINANCE.BANK_ACCOUNT_SAVING_ERROR');
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('FINANCE.ERROR'),
          detail: detailMsg,
        });
      },
    });
  }

  cancel() {
    this.router.navigate([this.isFrontal ? '/frontal-bank-accounts' : '/bank-accounts']);
  }
}
