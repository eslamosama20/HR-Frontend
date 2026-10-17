import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidSettings } from 'src/app/models/cashier/zid-integration.model';
import { ZidApiService } from 'src/app/services/cashier/zid-api.service';
import { environment } from 'src/environments/environment';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidSkeletonComponent } from '../zid-shared/zid-skeleton.component';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
  selector: 'app-zid-settings',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
    ZidShellComponent,
    ZidSkeletonComponent
  ],
  providers: [MessageService],
  templateUrl: './zid-settings.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidSettingsComponent implements OnInit {
  loading = signal(false);
  actionLoading = signal('');
  error = signal('');
  settings = signal<ZidSettings | null>(null);
  oauthUrl = signal('');

  authorizationCode = '';
  manualAccessToken = '';
  manualRefreshToken = '';
  manualExpiresAt = '';
  readonly showDevTokenSection = !environment.production;

  constructor(
    private zidApi: ZidApiService,
    private messageService: MessageService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.zidApi.getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: settings => {
          this.settings.set(settings);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(this.readError(error, this.t('LOAD_SETTINGS_ERROR')));
          this.loading.set(false);
        }
      });
  }

  getOAuthUrl(): void {
    this.actionLoading.set('oauth');
    this.zidApi.getOAuthUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.oauthUrl.set(response.url);
          this.actionLoading.set('');
          this.showSuccess(this.t('OAUTH_LOADED'));
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('LOAD_OAUTH_ERROR')));
        }
      });
  }

  connect(): void {
    const code = this.authorizationCode.trim();
    if (!code) {
      this.showError(this.t('AUTH_CODE_REQUIRED'));
      return;
    }

    this.actionLoading.set('connect');
    this.zidApi.connect(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.authorizationCode = '';
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('STORE_CONNECTED'));
          this.loadSettings();
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('CONNECT_ERROR')));
        }
      });
  }

  setToken(): void {
    const accessToken = this.manualAccessToken.trim();
    if (!accessToken) {
      this.showError(this.t('ACCESS_TOKEN_REQUIRED'));
      return;
    }

    this.actionLoading.set('token');
    this.zidApi.setToken({
      accessToken,
      refreshToken: this.manualRefreshToken.trim() || null,
      expiresAt: this.manualExpiresAt.trim() || null
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.manualAccessToken = '';
          this.manualRefreshToken = '';
          this.manualExpiresAt = '';
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('TOKEN_SAVED'));
          this.loadSettings();
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('SAVE_TOKEN_ERROR')));
        }
      });
  }

  isBusy(key: string): boolean {
    return this.actionLoading() === key;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 3500 });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 5000 });
  }

  private readError(error: any, fallback: string): string {
    return error?.error?.message ?? error?.error?.error ?? error?.message ?? fallback;
  }

  private t(key: string): string {
    return this.translate.instant(`CASHIER_ZID.${key}`);
  }
}
