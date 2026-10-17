import {Component, OnDestroy, OnInit, signal, ChangeDetectorRef} from '@angular/core';
import {SystemSettingModel} from "../../models/system-setting.model";
import {SystemSettingService} from "../../services/system-setting.service";
import {CardModule} from "primeng/card";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule} from '@angular/forms';
import {CommonModule} from "@angular/common";
import {Button} from "primeng/button";
import {TranslateService} from "@ngx-translate/core";
import {DropdownModule} from "primeng/dropdown";
import { DateTime } from "luxon";
import {ToastModule} from "primeng/toast";
import {ConfirmationService, MessageService} from "primeng/api";
import {InputTextModule} from "primeng/inputtext";
import {ReservationService} from "../../services/reservations/reservation.service";
import {TooltipModule} from "primeng/tooltip";
import {ReservationSerialNumberFormat} from "../../enums/reservation-serial-number-format";
import {InputNumberModule} from "primeng/inputnumber";
import {InputSwitchModule, InputSwitchChangeEvent} from "primeng/inputswitch";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {Subscription} from "rxjs";
import {TranslationModule} from "../../modules/i18n";
import { CompanyDetailsService } from '../../services/inventory/company-details.service';
import { PrintSettingsService } from '../../services/print-settings.service';
import { PERMISSIONS } from '../../config/permissions';
import { IdleTimeoutService } from '../../services/idle-timeout.service';
import { AuthService } from '../../modules/auth/services/auth.service';
import { TimezoneService } from '../../services/timezone.service';

import {Location} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-system-setting',
  standalone: true,
  imports: [
    CardModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Button,
    DropdownModule,
    ToastModule,
    InputTextModule,
    TooltipModule,
    InputNumberModule,
    InputSwitchModule,
    ConfirmDialogModule,
    TranslationModule,
  ],
  templateUrl: './system-setting.component.html',
  styleUrl: './system-setting.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class SystemSettingComponent implements OnInit, OnDestroy{
  public translate: TranslateService;
  activeTab = signal<'general' | 'reservations' | 'print'>('general');
  reservationsCount = signal<number>(0);
  canEditReservationPrefix = signal<boolean>(false);

  setActiveTab(tab: 'general' | 'reservations' | 'print'): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  cancel(): void {
    this.loadSystemSetting();
    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('DATA.NOTIFICATION') || 'تنبيه',
      detail: this.activeLanguage === 'ar' ? 'تم التراجع عن التعديلات غير المحفوظة' : 'Unsaved changes discarded'
    });
  }

  // Print settings
  showStamp: boolean = true;
  showCompanySignature: boolean = true;
  showCustomerSignature: boolean = true;
  showTermsInPrint2: boolean = false;
  showBanksInPrint2: boolean = false;
  selectedPolicies: { id: string; name: string; checked: boolean }[] = [];
  selectedBanks: { id: string; bankName: string; accountNumber: string; checked: boolean }[] = [];
  companyDetails: any = null;
  activeLanguage: string = 'en';

  // Reservation print settings (DB-backed)
  showReservationStamp: boolean = true;
  showReservationCompanySignature: boolean = true;
  showReservationCustomerSignature: boolean = true;
  reservationSelectedPolicies: { id: string; name: string; checked: boolean }[] = [];
  reservationSelectedBanks: { id: string; bankName: string; accountNumber: string; checked: boolean }[] = [];

  // DEVELOPER MODE: Set to true to bypass reservation lock for testing
  devModeBypassLock = false; // <-- Change to false in production

  // Reservation Serial Number Format options
  serialFormatOptions: { label: string; value: ReservationSerialNumberFormat }[] = [];

  // Expose enum for template
  ReservationSerialNumberFormat = ReservationSerialNumberFormat;
  readonly PERMISSIONS = PERMISSIONS;

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  private timeZoneSource =  [
    { label: 'السعودية (آسيا/الرياض)', value: 'Asia/Riyadh' },
    { label: 'التوقيت العالمي المنسق (UTC)', value: 'UTC' },
    { label: 'الولايات المتحدة - الساحل الشرقي (أمريكا/نيويورك)', value: 'America/New_York' },
    { label: 'الولايات المتحدة - الساحل الأوسط (أمريكا/شيكاغو)', value: 'America/Chicago' },
    { label: 'الولايات المتحدة - المنطقة الجبلية (أمريكا/دنفر)', value: 'America/Denver' },
    { label: 'الولايات المتحدة - الساحل الغربي (أمريكا/لوس أنجلوس)', value: 'America/Los_Angeles' },
    { label: 'المملكة المتحدة (أوروبا/لندن)', value: 'Europe/London' },
    { label: 'أوروبا - التوقيت المركزي (أوروبا/برلين)', value: 'Europe/Berlin' },
    { label: 'أوروبا - التوقيت الشرقي (أوروبا/هلسنكي)', value: 'Europe/Helsinki' },
    { label: 'فرنسا (أوروبا/باريس)', value: 'Europe/Paris' },
    { label: 'إسبانيا (أوروبا/مدريد)', value: 'Europe/Madrid' },
    { label: 'إيطاليا (أوروبا/روما)', value: 'Europe/Rome' },
    { label: 'اليونان (أوروبا/أثينا)', value: 'Europe/Athens' },
    { label: 'روسيا (أوروبا/موسكو)', value: 'Europe/Moscow' },
    { label: 'تركيا (أوروبا/إسطنبول)', value: 'Europe/Istanbul' },
    { label: 'مصر (أفريقيا/القاهرة)', value: 'Africa/Cairo' },
    { label: 'جنوب أفريقيا (أفريقيا/جوهانسبرغ)', value: 'Africa/Johannesburg' },
    { label: 'الإمارات العربية المتحدة (آسيا/دبي)', value: 'Asia/Dubai' },
    { label: 'الهند (آسيا/كولكاتا)', value: 'Asia/Kolkata' },
    { label: 'باكستان (آسيا/كراتشي)', value: 'Asia/Karachi' },
    { label: 'بنغلاديش (آسيا/دكا)', value: 'Asia/Dhaka' },
    { label: 'إندونيسيا (آسيا/جاكرتا)', value: 'Asia/Jakarta' },
    { label: 'الصين (آسيا/شنغهاي)', value: 'Asia/Shanghai' },
    { label: 'هونغ كونغ (آسيا/هونغ كونغ)', value: 'Asia/Hong_Kong' },
    { label: 'اليابان (آسيا/طوكيو)', value: 'Asia/Tokyo' },
    { label: 'كوريا الجنوبية (آسيا/سيول)', value: 'Asia/Seoul' },
    { label: 'سنغافورة (آسيا/سنغافورة)', value: 'Asia/Singapore' },
    { label: 'أستراليا - الغرب (أستراليا/بيرث)', value: 'Australia/Perth' },
    { label: 'أستراليا - الوسط (أستراليا/أديلايد)', value: 'Australia/Adelaide' },
    { label: 'أستراليا - الشرق (أستراليا/سيدني)', value: 'Australia/Sydney' },
    { label: 'نيوزيلندا (المحيط الهادئ/أوكلاند)', value: 'Pacific/Auckland' },
    { label: 'البرازيل (أمريكا/ساو باولو)', value: 'America/Sao_Paulo' },
    { label: 'الأرجنتين (أمريكا/بوينس آيرس)', value: 'America/Argentina/Buenos_Aires' },
    { label: 'المكسيك (أمريكا/مكسيكو سيتي)', value: 'America/Mexico_City' },
    { label: 'كندا - الشرق (أمريكا/تورونتو)', value: 'America/Toronto' },
    { label: 'كندا - الغرب (أمريكا/فانكوفر)', value: 'America/Vancouver' },
    { label: 'جرينلاند (أمريكا/غودثاب)', value: 'America/Godthab' },
    { label: 'هاواي (المحيط الهادئ/هونولولو)', value: 'Pacific/Honolulu' },
    { label: 'ألاسكا (أمريكا/أنكوراج)', value: 'America/Anchorage' },
    { label: 'الفلبين (آسيا/مانيلا)', value: 'Asia/Manila' },
    { label: 'ماليزيا (آسيا/كوالالمبور)', value: 'Asia/Kuala_Lumpur' },
    { label: 'تايلاند (آسيا/بانكوك)', value: 'Asia/Bangkok' },
  ];
  timeZoneOptions: { label: string; value: string }[] = [];
  sessionTimeoutOptions: { label: string; value: number }[] = [];
  private langChangeSubscription?: Subscription;
  systemSettingFormGroup : FormGroup;
  get isDeveloper(): boolean {
    const user = this.authService.currentUserValue;
    return user?.userName === 'developer' || user?.userRoles?.some(ur => ur.role?.name === 'System.Developer') || false;
  }

  constructor(
    private fb : FormBuilder,
    private systemSettingService: SystemSettingService,
    private translateService: TranslateService,
    private messageService: MessageService,
    private reservationService: ReservationService,
    private confirmationService: ConfirmationService,
    private companyDataService: CompanyDetailsService,
    private printSettingsService: PrintSettingsService,
    private idleTimeoutService: IdleTimeoutService,
    private authService: AuthService,
    private timezoneService: TimezoneService,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private router: Router
  ) {
    this.systemSettingFormGroup = this.fb.group({
      timeZone: ['Asia/Riyadh', Validators.required],
      isLinkedToInventory: [false],
      sessionTimeoutMinutes: [20, [Validators.required, Validators.min(1), Validators.max(30)]],
      reservationSerialNumberFormat: [ReservationSerialNumberFormat.NumbersOnly, Validators.required],
      reservationSerialStartNumber: [1, [Validators.required, Validators.min(1)]],
      reservationSerialPrefix: [''],
      showSignaturesInInvoicePrint: [true],
      showTermsInPrint2: [false]
    })
    this.translate = translateService;

    // Watch for format changes to update prefix validation
    this.systemSettingFormGroup.get('reservationSerialNumberFormat')?.valueChanges.subscribe(format => {
      this.updatePrefixValidation(format);
    });
  }
  loadingSignal = signal(false);
  get loading(){
    return this.loadingSignal()
  }
  set loading(value){
    this.loadingSignal.set(value)
  }

  savingSignal = signal(false);
  get saving(){
    return this.savingSignal()
  }
  set saving(value){
    this.savingSignal.set(value)
  }

  systemSettingSignal = signal<SystemSettingModel>(null);
  get systemSetting(): SystemSettingModel {
    return this.systemSettingSignal();
  }
  set systemSetting(value: SystemSettingModel) {
    this.systemSettingSignal.set(value);
  }

  private clockInterval?: any;
  currentClockSignal = signal<number>(Date.now());

  get clockTime(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        return dt.toFormat('hh:mm:ss a');
      }
    } catch {
      // fallback
    }
    return '';
  }

  get clockTimeDigits(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        return dt.toFormat('hh:mm:ss');
      }
    } catch {
      // fallback
    }
    return '';
  }

  get clockTimePeriod(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        const isAr = this.activeLanguage === 'ar';
        const isPM = dt.hour >= 12;
        return isAr ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
      }
    } catch {
      // fallback
    }
    return '';
  }

  get selectedTimezoneCleanName(): string {
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    const found = this.timeZoneSource.find(o => o.value === zone);
    if (!found) return zone;
    return this.activeLanguage === 'ar' ? found.label : zone.replace(/_/g, ' ');
  }

  get clockDayName(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone).setLocale(this.activeLanguage || 'ar');
      if (dt.isValid) {
        return dt.toFormat('cccc');
      }
    } catch {
      // fallback
    }
    return '';
  }

  get clockDate(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        return dt.toFormat('dd/MM/yyyy');
      }
    } catch {
      // fallback
    }
    return '';
  }

  get currentTimeInSelectedZone(): string {
    this.currentClockSignal();
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        const timeStr = dt.toFormat('hh:mm:ss a');
        const dateStr = dt.toFormat('dd/MM/yyyy');
        return `${timeStr}  —  ${dateStr}`;
      }
    } catch {
      // fallback
    }
    return '';
  }

  get selectedTimezoneDetails(): { label: string; offset: string } {
    const zone = this.systemSettingFormGroup?.get('timeZone')?.value || 'Asia/Riyadh';
    const found = this.timeZoneOptions.find(o => o.value === zone);
    const label = found ? found.label : zone;
    try {
      const dt = DateTime.now().setZone(zone);
      if (dt.isValid) {
        if (dt.offset === 0) return { label, offset: 'UTC' };
        const hours = dt.offset / 60;
        const sign = hours >= 0 ? '+' : '';
        return { label, offset: `UTC${sign}${hours}` };
      }
    } catch {
      // fallback
    }
    return { label, offset: '' };
  }

  ngOnInit(): void {
    this.activeLanguage = this.translate.currentLang || 'ar';
    this.buildLocalizedOptions();
    this.clockInterval = setInterval(() => {
      this.currentClockSignal.set(Date.now());
    }, 1000);
    this.langChangeSubscription = this.translate.onLangChange.subscribe((event) => {
      this.activeLanguage = event.lang;
      this.buildLocalizedOptions();
      this.loadCompanyDetails();
    });
    this.loadSystemSetting();
    this.loadReservationsCount();
    this.loadPrintSettings();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.langChangeSubscription?.unsubscribe();
  }

  private buildLocalizedOptions(): void {
    this.serialFormatOptions = [
      { label: this.translate.instant('DATA.SERIAL_FORMAT_NUMBERS_ONLY'), value: ReservationSerialNumberFormat.NumbersOnly },
      { label: this.translate.instant('DATA.SERIAL_FORMAT_PREFIX_WITH_NUMBERS'), value: ReservationSerialNumberFormat.PrefixWithNumbers }
    ];

    this.sessionTimeoutOptions = [
      { label: this.translate.instant('DATA.SESSION_TIMEOUT_15_MIN'), value: 15 },
      { label: this.translate.instant('DATA.SESSION_TIMEOUT_20_MIN'), value: 20 },
      { label: this.translate.instant('DATA.SESSION_TIMEOUT_25_MIN'), value: 25 },
      { label: this.translate.instant('DATA.SESSION_TIMEOUT_30_MIN'), value: 30 }
    ];

    const language = this.translate.currentLang || 'ar';
    this.timeZoneOptions = this.timeZoneSource.map((item) => {
      let offsetStr = '';
      try {
        const dt = DateTime.now().setZone(item.value);
        if (dt.isValid) {
          if (dt.offset === 0) {
            offsetStr = ' • UTC';
          } else if (dt.offset % 60 === 0) {
            const hours = dt.offset / 60;
            const sign = hours >= 0 ? '+' : '';
            offsetStr = ` • UTC${sign}${hours}`;
          } else {
            offsetStr = ` • UTC${dt.toFormat('ZZ')}`;
          }
        }
      } catch {
        offsetStr = '';
      }

      const baseLabel = language === 'ar'
        ? item.label
        : item.value.replace(/_/g, ' ');

      return {
        value: item.value,
        label: `${baseLabel}${offsetStr}`
      };
    });
  }

  previewIdleWarning(): void {
    this.idleTimeoutService.triggerWarningForTesting();
  }

  previewExpiredDialog(): void {
    this.idleTimeoutService.triggerExpiredDialogForTesting();
  }

  loadReservationsCount(): void {
    this.reservationService.getReservationsCount().subscribe({
      next: (count) => {
        this.reservationsCount.set(count);
        // Check if we can edit: either no reservations OR dev mode bypass is enabled
        const canEdit = count === 0 || this.devModeBypassLock;
        this.canEditReservationPrefix.set(canEdit);
        this.updateReservationPrefixState();

        // Log warning if bypassing lock
        if (this.devModeBypassLock && count > 0) {
          console.warn(`🔓 DEV MODE: Bypassing reservation lock (${count} reservations exist)`);
        }
      },
      error: (error) => {
        console.log('Error loading reservations count', error);
        // In dev mode, allow edit even on error
        this.canEditReservationPrefix.set(this.devModeBypassLock);
        this.updateReservationPrefixState();
      }
    });
  }

  updateReservationPrefixState(): void {
    const controls = [
      'reservationSerialNumberFormat',
      'reservationSerialStartNumber',
      'reservationSerialPrefix'
    ];

    controls.forEach(controlName => {
      const control = this.systemSettingFormGroup.get(controlName);
      if (this.canEditReservationPrefix()) {
        control?.enable();
      } else {
        control?.disable();
      }
    });
  }

  updatePrefixValidation(format: ReservationSerialNumberFormat): void {
    const prefixControl = this.systemSettingFormGroup.get('reservationSerialPrefix');

    if (format === ReservationSerialNumberFormat.PrefixWithNumbers) {
      // Prefix is required for PrefixWithNumbers format
      prefixControl?.setValidators([Validators.required, Validators.pattern(/^[a-zA-Z\u0600-\u06FF]+$/)]);
    } else {
      // Prefix is not needed for NumbersOnly format
      prefixControl?.clearValidators();
      prefixControl?.setValue('');
    }

    prefixControl?.updateValueAndValidity();
  }

  loadSystemSetting(){
    this.saving = false;
    this.loading = true;
    this.systemSettingService.getAll().subscribe({
      next: elements => {
        if (elements.length === 0) {
          this.systemSetting = null;
          this.loading = false;
          return;
        }
        this.systemSetting = elements[0];
        this.systemSettingFormGroup.patchValue({
          timeZone: this.systemSetting.timeZone,
          isLinkedToInventory: !!this.systemSetting.isLinkedToInventory,
          sessionTimeoutMinutes: this.systemSetting.sessionTimeoutMinutes ?? 20,
          reservationSerialNumberFormat: this.systemSetting.reservationSerialNumberFormat ?? ReservationSerialNumberFormat.NumbersOnly,
          reservationSerialStartNumber: this.systemSetting.reservationSerialStartNumber || 1,
          reservationSerialPrefix: this.systemSetting.reservationSerialPrefix || '',
          showSignaturesInInvoicePrint: this.systemSetting.showSignaturesInInvoicePrint ?? true,
          showTermsInPrint2: this.systemSetting.showTermsInPrint2 ?? false
        })

        if (this.systemSetting.showTermsInPrint2 !== undefined) {
          this.showTermsInPrint2 = this.systemSetting.showTermsInPrint2;
          this.printSettingsService.setShowTermsInPrint2(this.systemSetting.showTermsInPrint2);
        }

        if (this.systemSetting.sessionTimeoutMinutes) {
          this.idleTimeoutService.setTimeoutMinutes(this.systemSetting.sessionTimeoutMinutes);
        }

        // Load reservation print settings from DB
        this.showReservationStamp = this.systemSetting.showStampInReservationPrint ?? true;
        this.showReservationCompanySignature = this.systemSetting.showCompanySignatureInReservationPrint ?? true;
        this.showReservationCustomerSignature = this.systemSetting.showCustomerSignatureInReservationPrint ?? true;

        // Load reservation policies from DB (unchecked IDs)
        const uncheckedPolicyIds = this.systemSetting.defaultReservationUncheckedPolicyIds || [];
        if (this.companyDetails?.policies) {
          this.reservationSelectedPolicies = this.companyDetails.policies
            .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
            .map((p: any) => {
              const idStr = String(p.id || '');
              return {
                id: idStr,
                name: p.policyParagraph || '',
                checked: !uncheckedPolicyIds.includes(idStr)
              };
            });
        }

        // Load reservation banks from DB (unchecked IDs)
        const uncheckedBankIds = this.systemSetting.defaultReservationUncheckedBankIds || [];
        if (this.companyDetails?.bankAccounts) {
          this.reservationSelectedBanks = this.companyDetails.bankAccounts
            .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
            .map((b: any) => {
              const idStr = String(b.id || '');
              return {
                id: idStr,
                bankName: b.bankName || '',
                accountNumber: b.bankAccountNumber || '',
                checked: !uncheckedBankIds.includes(idStr)
              };
            });
        }

        this.updateReservationPrefixState();
        this.loading = false;

      },
      error: error => {
        console.log('Error Loading System Setting', error);
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('DATA.SYSTEM_SETTING_LOAD_ERROR')
        });
      }
    })
  }

  saveSystemSetting(){
    this.saving = true;
    this.loading = true;
    const formValues = this.systemSettingFormGroup.getRawValue();
    const format = formValues.reservationSerialNumberFormat;

    // Prepare reservation serial data
    const reservationSerialData = this.canEditReservationPrefix() ? {
      reservationSerialNumberFormat: format,
      reservationSerialStartNumber: formValues.reservationSerialStartNumber,
      reservationSerialPrefix: format === ReservationSerialNumberFormat.PrefixWithNumbers ? formValues.reservationSerialPrefix : null
    } : {
      reservationSerialNumberFormat: this.systemSetting?.reservationSerialNumberFormat,
      reservationSerialStartNumber: this.systemSetting?.reservationSerialStartNumber,
      reservationSerialPrefix: this.systemSetting?.reservationSerialPrefix
    };

    // Prepare reservation print settings
    const reservationPrintSettings = {
      showStampInReservationPrint: this.showReservationStamp,
      showCompanySignatureInReservationPrint: this.showReservationCompanySignature,
      showCustomerSignatureInReservationPrint: this.showReservationCustomerSignature,
      defaultReservationUncheckedPolicyIds: this.reservationSelectedPolicies.filter(p => !p.checked).map(p => p.id),
      defaultReservationUncheckedBankIds: this.reservationSelectedBanks.filter(b => !b.checked).map(b => b.id)
    };

    const timeoutMinutes = formValues.sessionTimeoutMinutes ?? 20;

    if (this.systemSetting){
      this.systemSettingService.update(new SystemSettingModel({
        timeZone: formValues.timeZone,
        isLinkedToInventory: !!formValues.isLinkedToInventory,
        sessionTimeoutMinutes: timeoutMinutes,
        ...reservationSerialData,
        showSignaturesInInvoicePrint: !!formValues.showSignaturesInInvoicePrint,
        showTermsInPrint2: !!formValues.showTermsInPrint2,
        ...reservationPrintSettings,
        id: this.systemSetting.id
      })).subscribe({
        next: res => {
          this.saving = false;
          this.timezoneService.setTimezone(formValues.timeZone);
          this.printSettingsService.setShowTermsInPrint2(!!formValues.showTermsInPrint2);
          this.idleTimeoutService.setTimeoutMinutes(timeoutMinutes);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('DATA.SYSTEM_SETTING_SAVE_SUCCESS')
          });
          this.loadSystemSetting();
        },
        error: error => {
          console.log('Error Saving System Setting', error);
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('DATA.SYSTEM_SETTING_SAVE_ERROR')
          });
          this.loading = false;
        }
      })
    }else{
      const systemSetting = new SystemSettingModel({
        timeZone: formValues.timeZone,
        isLinkedToInventory: !!formValues.isLinkedToInventory,
        sessionTimeoutMinutes: timeoutMinutes,
        ...reservationSerialData,
        showSignaturesInInvoicePrint: !!formValues.showSignaturesInInvoicePrint,
        showTermsInPrint2: !!formValues.showTermsInPrint2,
        ...reservationPrintSettings
      })
      this.systemSettingService.create(systemSetting).subscribe({
        next: res => {
          this.saving = false;
          this.timezoneService.setTimezone(formValues.timeZone);
          this.printSettingsService.setShowTermsInPrint2(!!formValues.showTermsInPrint2);
          this.idleTimeoutService.setTimeoutMinutes(timeoutMinutes);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: this.translate.instant('DATA.SYSTEM_SETTING_SAVE_SUCCESS')
          });
          this.loadSystemSetting();
        },
        error: error => {
          console.log('Error Saving System Setting', error);
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('DATA.SYSTEM_SETTING_SAVE_ERROR')
          });
          this.loading = false;
        }
      })
    }
  }

  onIsLinkedToInventoryChange(event: InputSwitchChangeEvent): void {
    if (!this.systemSetting) {
      return;
    }

    const control = this.systemSettingFormGroup.get('isLinkedToInventory');
    const newValue = event.checked;
    const previousValue = !newValue;

    this.confirmationService.confirm({
      header: this.translate.instant('DATA.SYSTEM_SETTING_CONFIRM_CHANGE'),
      message: newValue
        ? this.translate.instant('DATA.SYSTEM_SETTING_CONFIRM_ENABLE_LINK')
        : this.translate.instant('DATA.SYSTEM_SETTING_CONFIRM_DISABLE_LINK'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('DATA.YES'),
      rejectLabel: this.translate.instant('DATA.NO'),
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.loading = true;
        const formValues = this.systemSettingFormGroup.getRawValue();
        this.systemSettingService.update(new SystemSettingModel({
          id: this.systemSetting.id,
          timeZone: formValues.timeZone,
          isLinkedToInventory: !!formValues.isLinkedToInventory,
          reservationSerialNumberFormat: formValues.reservationSerialNumberFormat,
          reservationSerialStartNumber: formValues.reservationSerialStartNumber,
          reservationSerialPrefix: formValues.reservationSerialPrefix
        })).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('FINANCE.SUCCESS'),
              detail: this.translate.instant('DATA.SYSTEM_SETTING_UPDATED_SUCCESS')
            });
            this.loadSystemSetting();
          },
          error: () => {
            this.loading = false;
            control?.setValue(previousValue, { emitEvent: false });
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('FINANCE.ERROR'),
              detail: this.translate.instant('DATA.SYSTEM_SETTING_SAVE_ERROR')
            });
          }
        });
      },
      reject: () => {
        control?.setValue(previousValue, { emitEvent: false });
      }
    });
  }

  loadPrintSettings(): void {
    this.showCompanySignature = this.printSettingsService.getShowCompanySignature();
    this.showCustomerSignature = this.printSettingsService.getShowCustomerSignature();
    this.showStamp = this.printSettingsService.getShowStamp();
    this.showTermsInPrint2 = this.printSettingsService.getShowTermsInPrint2();
    this.showBanksInPrint2 = this.printSettingsService.getShowBanksInPrint2();
    this.loadCompanyDetails();
  }

  loadCompanyDetails(): void {
    this.companyDataService.getAll().subscribe({
      next: (companyData) => {
        if (companyData && companyData.length > 0) {
          this.companyDetails = companyData[0];

          // Load default policies and banks (sales-invoice, localStorage-backed)
          const uncheckedPolicies = this.printSettingsService.getUncheckedPolicies();
          if (this.companyDetails?.policies) {
            this.selectedPolicies = this.companyDetails.policies
              .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
              .map((p: any) => {
                const idStr = String(p.id || '');
                return {
                  id: idStr,
                  name: p.policyParagraph || '',
                  checked: !uncheckedPolicies.includes(idStr)
                };
              });
          }

          const uncheckedBanks = this.printSettingsService.getUncheckedBanks();
          if (this.companyDetails?.bankAccounts) {
            this.selectedBanks = this.companyDetails.bankAccounts
              .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
              .map((b: any) => {
                const idStr = String(b.id || '');
                return {
                  id: idStr,
                  bankName: b.bankName || '',
                  accountNumber: b.bankAccountNumber || '',
                  swiftCode: b.swiftCode || '',
                  checked: !uncheckedBanks.includes(idStr)
                };
              });
          }

          // Load reservation policies and banks (DB-backed)
          if (this.systemSetting && this.companyDetails?.policies) {
            const uncheckedPolicyIds = this.systemSetting.defaultReservationUncheckedPolicyIds || [];
            this.reservationSelectedPolicies = this.companyDetails.policies
              .filter((p: any) => p.policyParagraph && p.policyParagraph.trim())
              .map((p: any) => {
                const idStr = String(p.id || '');
                return {
                  id: idStr,
                  name: p.policyParagraph || '',
                  checked: !uncheckedPolicyIds.includes(idStr)
                };
              });
          }

          if (this.systemSetting && this.companyDetails?.bankAccounts) {
            const uncheckedBankIds = this.systemSetting.defaultReservationUncheckedBankIds || [];
            this.reservationSelectedBanks = this.companyDetails.bankAccounts
              .filter((b: any) => (b.bankName && b.bankName.trim()) || (b.bankAccountNumber && b.bankAccountNumber.trim()) || (b.iban && b.iban.trim()))
              .map((b: any) => {
                const idStr = String(b.id || '');
                return {
                  id: idStr,
                  bankName: b.bankName || '',
                  accountNumber: b.bankAccountNumber || '',
                  checked: !uncheckedBankIds.includes(idStr)
                };
              });
          }

          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading company details for print settings:', error);
      }
    });
  }

  onShowStampChange(value: boolean): void {
    this.showStamp = value;
    this.printSettingsService.setShowStamp(value);
  }

  onShowCompanySignatureChange(value: boolean): void {
    this.showCompanySignature = value;
    this.printSettingsService.setShowCompanySignature(value);
  }

  onShowCustomerSignatureChange(value: boolean): void {
    this.showCustomerSignature = value;
    this.printSettingsService.setShowCustomerSignature(value);
  }

  onShowTermsInPrint2Change(value: boolean): void {
    this.showTermsInPrint2 = value;
    this.printSettingsService.setShowTermsInPrint2(value);
  }

  onShowBanksInPrint2Change(value: boolean): void {
    this.showBanksInPrint2 = value;
    this.printSettingsService.setShowBanksInPrint2(value);
  }

  onPolicyToggle(): void {
    this.selectedPolicies = [...this.selectedPolicies];
    const uncheckedIds = this.selectedPolicies.filter(p => !p.checked).map(p => p.id);
    this.printSettingsService.setUncheckedPolicies(uncheckedIds);
  }

  onBankToggle(): void {
    this.selectedBanks = [...this.selectedBanks];
    const uncheckedIds = this.selectedBanks.filter(b => !b.checked).map(b => b.id);
    this.printSettingsService.setUncheckedBanks(uncheckedIds);
  }

  // Reservation print settings event handlers
  onShowReservationStampChange(value: boolean): void {
    this.showReservationStamp = value;
  }

  onShowReservationCompanySignatureChange(value: boolean): void {
    this.showReservationCompanySignature = value;
  }

  onShowReservationCustomerSignatureChange(value: boolean): void {
    this.showReservationCustomerSignature = value;
  }

  onReservationPolicyToggle(): void {
    this.reservationSelectedPolicies = [...this.reservationSelectedPolicies];
  }

  onReservationBankToggle(): void {
    this.reservationSelectedBanks = [...this.reservationSelectedBanks];
  }
}
