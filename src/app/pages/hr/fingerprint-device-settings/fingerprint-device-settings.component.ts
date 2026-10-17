import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PermissionModel} from "../../../models/auth/permission.model";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {AuthService} from "../../../modules/auth";
import {TranslationService} from "../../../modules/i18n";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {Table, TableModule} from "primeng/table";
import * as FileSaver from 'file-saver';
import {DetailAccountService} from "../../../services/accounting/detail-account.service";
import {ShiftModel} from "../../../models/hr/shift.model";
import {ShiftService} from "../../../services/hr/shift.service";
import {getTimeFromDate} from "../../../utils/getTimeFromDate";
import {getDateFromTimeString} from "../../../utils/getDateFromTimeString";
import {FingerprintDeviceSettingsModel} from "../../../models/hr/fingerprint-device-settings.model";
import {FingerprintDeviceSettingsService} from "../../../services/hr/fingerprint-device-settings.service";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-fingerprint-device-settings',
  templateUrl: './fingerprint-device-settings.component.html',
  styleUrl: './fingerprint-device-settings.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class FingerprintDeviceSettingsComponent implements OnInit{

  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions)
  }

  hasPermission(permission : string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }
  translate : TranslateService;
  activeLanguage: string = 'en';

  settingsFormGroup : FormGroup;
  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public fingerprintDeviceSettingsService: FingerprintDeviceSettingsService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  settingsSignal = signal<FingerprintDeviceSettingsModel>(null);
  get settings() {
    return this.settingsSignal();
  }
  set settings(value) {
    this.settingsSignal.set(value);
  }

  ngOnInit(): void {
    this.settingsFormGroup = this.fb.group({
      id: [null],
      factory1DeviceIP: [''],
      factory1DevicePort: [''],
      factory1DeviceEnabled: [false],
      factory2DeviceIP: [''],
      factory2DevicePort: [''],
      factory2DeviceEnabled: [false],
      factory3DeviceIP: [''],
      factory3DevicePort: [''],
      factory3DeviceEnabled: [false],
    });
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;

    this.fingerprintDeviceSettingsService.getAll().subscribe({
      next: settings => {
        console.log('settings', settings)
        this.settings = settings[0];
        this.settingsFormGroup.patchValue(this.settings);
        this.loading = false;

      },
      error: error => {
        console.log('Error Loading Fingerprint Device Settings', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: "حدث خطأ أثناء التحميل"
        })
        this.loading = false;

      }
    })
  }
  loadingSignal = signal(false);
  get loading() {
    return this.loadingSignal();
  }
  set loading(value) {
    this.loadingSignal.set(value);
  }

  saveSettings() {
    this.loading = true;
    if (this.settingsFormGroup.invalid) {
      return;
    }
    const settingsValues = this.settingsFormGroup.value;
    if (settingsValues.id) {
      console.log('updating settings', settingsValues)
      const settings = new FingerprintDeviceSettingsModel();
      settings.id = settingsValues.id;
      settings.factory1DeviceIP = settingsValues.factory1DeviceIP;
      settings.factory1DevicePort = settingsValues.factory1DevicePort;
      settings.factory1DeviceEnabled = settingsValues.factory1DeviceEnabled;
      settings.factory2DeviceIP = settingsValues.factory2DeviceIP;
      settings.factory2DevicePort = settingsValues.factory2DevicePort;
      settings.factory2DeviceEnabled = settingsValues.factory2DeviceEnabled;
      settings.factory3DeviceIP = settingsValues.factory3DeviceIP;
      settings.factory3DevicePort = settingsValues.factory3DevicePort;
      settings.factory3DeviceEnabled = settingsValues.factory3DeviceEnabled;
      this.fingerprintDeviceSettingsService.update(settings).subscribe({
        next: res => {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadSettings();
          this.loading = false;
          this.rescheduleJobs();
        },
        error: error => {
          console.log('Error Saving Fingerprint Device Settings', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.loading = false;

        }
      });
    }else{
      const settings = new FingerprintDeviceSettingsModel();
      settings.factory1DeviceIP = settingsValues.factory1DeviceIP;
      settings.factory1DevicePort = settingsValues.factory1DevicePort;
      settings.factory1DeviceEnabled = settingsValues.factory1DeviceEnabled;
      settings.factory2DeviceIP = settingsValues.factory2DeviceIP;
      settings.factory2DevicePort = settingsValues.factory2DevicePort;
      settings.factory2DeviceEnabled = settingsValues.factory2DeviceEnabled;
      settings.factory3DeviceIP = settingsValues.factory3DeviceIP;
      settings.factory3DevicePort = settingsValues.factory3DevicePort;
      settings.factory3DeviceEnabled = settingsValues.factory3DeviceEnabled;
      this.fingerprintDeviceSettingsService.create(settings).subscribe({
        next: res => {
          console.log('Fingerprint Device Settings Saved', res);
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.loadSettings();
          this.loading = false;
          this.rescheduleJobs();
        },
        error: error => {
          console.log('Error Saving Fingerprint Device Settings', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.loading = false;

        }
      });
    }
  }

  factory1DeviceConnectedSignal = signal(null);
  get factory1DeviceConnected() {
    return this.factory1DeviceConnectedSignal();
  }
  set factory1DeviceConnected(value) {
    this.factory1DeviceConnectedSignal.set(value);
  }
  factory2DeviceConnectedSignal = signal(null);
  get factory2DeviceConnected() {
    return this.factory2DeviceConnectedSignal();
  }
  set factory2DeviceConnected(value) {
    this.factory2DeviceConnectedSignal.set(value);
  }
  factory3DeviceConnectedSignal = signal(null);
  get factory3DeviceConnected() {
    return this.factory3DeviceConnectedSignal();
  }
  set factory3DeviceConnected(value) {
    this.factory3DeviceConnectedSignal.set(value);
  }

  syncingFactory1Signal = signal(false);
  get syncingFactory1() {
    return this.syncingFactory1Signal();
  }
  set syncingFactory1(val: boolean) {
    this.syncingFactory1Signal.set(val);
  }

  syncingFactory2Signal = signal(false);
  get syncingFactory2() {
    return this.syncingFactory2Signal();
  }
  set syncingFactory2(val: boolean) {
    this.syncingFactory2Signal.set(val);
  }

  syncingFactory3Signal = signal(false);
  get syncingFactory3() {
    return this.syncingFactory3Signal();
  }
  set syncingFactory3(val: boolean) {
    this.syncingFactory3Signal.set(val);
  }

  syncNow(factory: "Factory1" | "Factory2" | "Factory3") {
    if (factory === 'Factory1') {
      if (this.syncingFactory1) return;
      this.syncingFactory1 = true;
    } else if (factory === 'Factory2') {
      if (this.syncingFactory2) return;
      this.syncingFactory2 = true;
    } else {
      if (this.syncingFactory3) return;
      this.syncingFactory3 = true;
    }

    this.fingerprintDeviceSettingsService.syncNow(factory).subscribe({
      next: (res: any) => {
        if (factory === 'Factory1') this.syncingFactory1 = false;
        else if (factory === 'Factory2') this.syncingFactory2 = false;
        else this.syncingFactory3 = false;

        const isSuccess = res && res.success;
        if (isSuccess) {
          const detail = res.message || `تم سحب ${res.fetchedCount || 0} حركة، تمت إضافة ${res.insertedCount || 0} جديدة، وتخطي ${res.skippedCount || 0} مكررة.`;
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'تمت المزامنة بنجاح',
            detail: detail,
            life: 6000
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تنبيه',
            detail: res?.message || 'لم تكتمل المزامنة بشكل كامل.',
            life: 6000
          });
        }
        this.loadSettings();
      },
      error: (err: any) => {
        if (factory === 'Factory1') this.syncingFactory1 = false;
        else if (factory === 'Factory2') this.syncingFactory2 = false;
        else this.syncingFactory3 = false;

        const errMsg = err?.error?.message || err?.message || 'فشل سحب البيانات من جهاز البصمة. يرجى مراجعة الاتصال والإعدادات.';
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR') || 'خطأ في المزامنة',
          detail: errMsg,
          life: 8000
        });
        this.loadSettings();
      }
    });
  }
  checkConnectionForFactory1Device() {
    this.loading = true;
    const formVal = this.settingsFormGroup.value;
    this.fingerprintDeviceSettingsService.checkConnectionForFactory1Device(formVal.factory1DeviceIP, formVal.factory1DevicePort).subscribe({
      next: (res: any) => {
        this.loading = false;
        const isConnected = res?.connected ?? (typeof res === 'boolean' ? res : false);
        this.factory1DeviceConnected = isConnected;
        if (isConnected) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'نجاح',
            detail: res?.message || 'تم الاتصال بجهاز البصمة بنجاح'
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تنبيه',
            detail: res?.message || 'تعذر الاتصال بجهاز البصمة. تأكد من صحة الـ IP والـ Port وتشغيل الجهاز على الشبكة.'
          });
        }
      },
      error: error => {
        console.log('Error Checking Connection For Factory 1 Device', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء التحقق من الاتصال المصنع الأول'
        });
      }
    });
  }
  checkConnectionForFactory2Device() {
    this.loading = true;
    const formVal = this.settingsFormGroup.value;
    this.fingerprintDeviceSettingsService.checkConnectionForFactory2Device(formVal.factory2DeviceIP, formVal.factory2DevicePort).subscribe({
      next: (res: any) => {
        this.loading = false;
        const isConnected = res?.connected ?? (typeof res === 'boolean' ? res : false);
        this.factory2DeviceConnected = isConnected;
        if (isConnected) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'نجاح',
            detail: res?.message || 'تم الاتصال بجهاز البصمة بنجاح'
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تنبيه',
            detail: res?.message || 'تعذر الاتصال بجهاز البصمة. تأكد من صحة الـ IP والـ Port وتشغيل الجهاز على الشبكة.'
          });
        }
      },
      error: error => {
        console.log('Error Checking Connection For Factory 2 Device', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء التحقق من الاتصال المصنع الثاني'
        });
      }
    });
  }
  checkConnectionForFactory3Device() {
    this.loading = true;
    const formVal = this.settingsFormGroup.value;
    this.fingerprintDeviceSettingsService.checkConnectionForFactory3Device(formVal.factory3DeviceIP, formVal.factory3DevicePort).subscribe({
      next: (res: any) => {
        this.loading = false;
        const isConnected = res?.connected ?? (typeof res === 'boolean' ? res : false);
        this.factory3DeviceConnected = isConnected;
        if (isConnected) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS') || 'نجاح',
            detail: res?.message || 'تم الاتصال بجهاز البصمة بنجاح'
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تنبيه',
            detail: res?.message || 'تعذر الاتصال بجهاز البصمة. تأكد من صحة الـ IP والـ Port وتشغيل الجهاز على الشبكة.'
          });
        }
      },
      error: error => {
        console.log('Error Checking Connection For Factory 3 Device', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'حدث خطأ أثناء التحقق من الاتصال المصنع الثالث'
        });
      }
    });
  }

  clearData(factory: "Factory1" | "Factory2" | "Factory3") {
    this.loading = true;
    this.fingerprintDeviceSettingsService.clearData(factory).subscribe({
      next: res => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم مسح البيانات بنجاح" });
        this.loadSettings();
        this.loading = false;
      },
      error: error => {
        console.log('Error Clearing Data For Fingerprint Device Settings', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء مسح البيانات" });
        this.loading = false;
      }
    });
  }

  rescheduleJobs() {
    this.loading = true;
    this.fingerprintDeviceSettingsService.rescheduleJobs().subscribe({
      next: res => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم إعادة جدولة المهام بنجاح" });
        this.loadSettings();
        this.loading = false;
      },
      error: error => {
        if (error === "OK"){
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم إعادة جدولة المهام بنجاح" });
          this.loadSettings();
          this.loading = false;
          return;
        }
        console.log('Error Rescheduling Fingerprint Device Settings Jobs', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء إعادة جدولة المهام" });
        this.loading = false;
      }
    });
  }

  countdownSignal = signal(5);
  get countdown() {
    return this.countdownSignal();
  }
  set countdown(value) {
    this.countdownSignal.set(value);
  }
  yesDisabledSignal = signal(true);
  get yesDisabled() {
    return this.yesDisabledSignal();
  }
  set yesDisabled(value) {
    this.yesDisabledSignal.set(value);
  }
  countdownInterval: any;

  confirmClearData(event: Event, factory: "Factory1" | "Factory2" | "Factory3") {
    this.yesDisabled = true;
    this.countdown = 5;

    const factoryName = factory === 'Factory1' ? 'الأول' : factory === 'Factory2' ? 'الثاني' : 'الثالث';

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `تحذير !!\nهل أنت متأكد من أنك تريد مسح البيانات من جهاز البصمة ${factoryName} ؟`,
      header: `مسح البيانات من جهاز البصمة ${factoryName} !!!!!`,
      icon: 'pi pi-info-circle',
      accept: () => {
        this.clearData(factory);
        this.cleanupCountdown();
      },
      acceptVisible: false,  // hide default button
      rejectVisible: false,  // hide default button
      reject: () => {
        this.cleanupCountdown();
      },
    });

    this.startCountdown();
  }

  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdown = 5;
    this.yesDisabled = true;

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.yesDisabled = false;
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }


  cleanupCountdown() {
    clearInterval(this.countdownInterval);
    this.countdown = 5;
    this.yesDisabled = true;
  }

}
