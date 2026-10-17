import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { TranslationService } from './modules/i18n';
// language list
import { locale as enLang } from './modules/i18n/vocabs/en';
import { locale as arLang } from './modules/i18n/vocabs/ar';
import { ThemeModeService } from './_metronic/partials/layout/theme-mode-switcher/theme-mode.service';

import { registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar-SA';
import localeArEg from '@angular/common/locales/ar-EG';
import { CssLoaderService } from './services/css-loader.service';
import primengArTranslations from './utils/primengArTranslations';
import { PrimeNGConfig } from 'primeng/api';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { SystemSettingService } from './services/system-setting.service';
import { TimezoneService } from './services/timezone.service';
import { PrintSettingsService } from './services/print-settings.service';
import { IdleTimeoutService } from './services/idle-timeout.service';

// ✅ إضافات الإشعارات
import { NotificationService } from './services/notification.service';
import { environment } from 'src/environments/environment';

@Component({
  // tslint:disable-next-line:component-selector
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body[root]',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  activeLanguageSignal = signal('ar');

  get activeLanguage(): string {
    return this.activeLanguageSignal();
  }

  set activeLanguage(value: string) {
    this.activeLanguageSignal.set(value);
  }

  constructor(
    private translationService: TranslationService,
    private modeService: ThemeModeService,
    private cssLoaderService: CssLoaderService,
    private primengConfig: PrimeNGConfig,
    private systemSettingService: SystemSettingService,
    private timezoneService: TimezoneService,
    private printSettingsService: PrintSettingsService,
    private notificationService: NotificationService, // ✅ حقن الخدمة هنا
    public idleTimeoutService: IdleTimeoutService, // ✅ حقن خدمة الخمول
    library: FaIconLibrary
  ) {
    library.addIconPacks(fas);
    registerLocaleData(localeAr, 'ar-SA');
    registerLocaleData(localeArEg, 'ar-EG');
    registerLocaleData(localeAr, 'ar');
  }

  ngOnInit(): void {
    // Theme & i18n init
    this.modeService.init();

    this.translationService.loadTranslations(enLang, arLang);
    this.activeLanguage = this.translationService.getSelectedLanguage();

    // تحميل الثيم حسب المود الحالي
    switch (this.modeService.mode.value) {
      case 'dark':
        this.cssLoaderService.loadCSS(
          'assets/primeng/themes/lara-dark-blue/theme.css'
        );
        break;
      case 'light':
        this.cssLoaderService.loadCSS(
          'assets/primeng/themes/lara-light-blue/theme.css'
        );
        break;
      default:
        this.cssLoaderService.loadCSS(
          'assets/primeng/themes/lara-light-blue/theme.css'
        );
    }

    // ضبط ترجمة PrimeNG عند العربية
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    // Only load user-specific data if authenticated
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      // ✅ تشغيل مراقبة خمول الجلسة التلقائي
      this.idleTimeoutService.startTracking();

      // ✅ تشغيل خدمة الإشعارات مع بدء التطبيق
      // لو wsNotificationsUrl غير موجود/غير صالح، السيرفس هيشغل Mock تلقائيًا
      this.notificationService.connect(
        environment['wsNotificationsUrl'] as string | undefined
      );

      // تهيئة الإعدادات العامة والمنطقة الزمنية
      this.systemSettingService.getAll().subscribe((elements) => {
        if (elements.length === 0) {
          return;
        }
        this.timezoneService.setTimezone(elements[0].timeZone);
        if (elements[0].showTermsInPrint2 !== undefined && elements[0].showTermsInPrint2 !== null) {
          this.printSettingsService.setShowTermsInPrint2(elements[0].showTermsInPrint2);
        }
        this.idleTimeoutService.setTimeoutMinutes(elements[0].sessionTimeoutMinutes || 20);
      });
    }
  }
}
