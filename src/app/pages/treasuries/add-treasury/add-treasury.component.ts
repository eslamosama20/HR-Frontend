import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, signal } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { Router, ActivatedRoute } from '@angular/router';
import { TreasuryService } from 'src/app/services/treasury/treasury.service';
import { MainAccountService } from 'src/app/services/accounting/main-account.service';
import { TranslationService } from 'src/app/modules/i18n';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import { Treasury } from 'src/app/models/treasury/treasury';

@Component({
  selector: 'app-add-treasury',
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
  ],
  providers: [
    MessageService,
    { provide: LOCALE_ID, useValue: 'ar-SA' },
  ],
  templateUrl: './add-treasury.component.html',
})
export class AddTreasuryComponent implements OnInit {
  treasuryFormGroup: FormGroup;
  activeLanguage: string = 'en';
  isFrontal: boolean = false;
  loading: boolean = false;
  mainAccountOptions: any[] = [];
  treasuryId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private treasuryService: TreasuryService,
    private mainAccountService: MainAccountService,
    private translateService: TranslateService,
    private translationService: TranslationService,
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
    this.isFrontal = this.router.url.includes('frontal');

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.treasuryFormGroup = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
      mainAccountId: [null, Validators.required],
      isFrontal: [this.isFrontal],
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
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.treasuryId = params['id'];
        this.loadTreasury(this.treasuryId);
      }
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

  loadTreasury(id: string) {
    // Note: Assuming there is a getById or similar. If not, we might need a different approach.
    // For now, let's assume we can fetch it or it's only meant for "Add".
    // Since the request is "Add Treasury", I'll focus on the add part.
  }

  saveTreasury() {
    if (this.treasuryFormGroup.invalid) {
      this.treasuryFormGroup.markAllAsTouched();
      return;
    }
    this.loading = true;
    const treasuryValues = this.treasuryFormGroup.value;
    const treasury = new Treasury();
    treasury.name = treasuryValues.name.trim();
    treasury.mainAccountId = treasuryValues.mainAccountId;
    treasury.isFrontal = treasuryValues.isFrontal;

    this.treasuryService.create(treasury).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('FINANCE.SUCCESS'),
          detail: this.translateService.instant('FINANCE.TREASURY_CREATED'),
        });
        setTimeout(() => {
          this.cancel();
        }, 1000);
      },
      error: (err: any) => {
        this.loading = false;
        const detailMsg = err?.error?.message || err?.error?.Message || (typeof err?.error === 'string' ? err.error : null) || this.translateService.instant('FINANCE.TREASURY_SAVING_ERROR');
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('FINANCE.ERROR'),
          detail: detailMsg,
        });
      },
    });
  }

  cancel() {
    this.router.navigate([this.isFrontal ? '/frontal-treasuries' : '/treasuries']);
  }
}
