import { Injectable } from '@angular/core';

const SHOW_COMPANY_SIGNATURE_KEY = 'printSettings.showCompanySignature';
const SHOW_CUSTOMER_SIGNATURE_KEY = 'printSettings.showCustomerSignature';

@Injectable({ providedIn: 'root' })
export class PrintSettingsService {
  getShowCompanySignature(): boolean {
    return this.getBooleanSetting(SHOW_COMPANY_SIGNATURE_KEY, true);
  }

  setShowCompanySignature(value: boolean): void {
    this.setBooleanSetting(SHOW_COMPANY_SIGNATURE_KEY, value);
  }

  getShowCustomerSignature(): boolean {
    return this.getBooleanSetting(SHOW_CUSTOMER_SIGNATURE_KEY, true);
  }

  setShowCustomerSignature(value: boolean): void {
    this.setBooleanSetting(SHOW_CUSTOMER_SIGNATURE_KEY, value);
  }

  getShowStamp(): boolean {
    return this.getBooleanSetting('printSettings.showStamp', true);
  }

  setShowStamp(value: boolean): void {
    this.setBooleanSetting('printSettings.showStamp', value);
  }

  getUncheckedPolicies(): string[] {
    const raw = localStorage.getItem('printSettings.uncheckedPolicies');
    return raw ? JSON.parse(raw) : [];
  }

  setUncheckedPolicies(ids: string[]): void {
    localStorage.setItem('printSettings.uncheckedPolicies', JSON.stringify(ids));
  }

  getUncheckedBanks(): string[] {
    const raw = localStorage.getItem('printSettings.uncheckedBanks');
    return raw ? JSON.parse(raw) : [];
  }

  setUncheckedBanks(ids: string[]): void {
    localStorage.setItem('printSettings.uncheckedBanks', JSON.stringify(ids));
  }

  getShowTermsInPrint2(): boolean {
    return this.getBooleanSetting('printSettings.showTermsInPrint2', false);
  }

  setShowTermsInPrint2(value: boolean): void {
    this.setBooleanSetting('printSettings.showTermsInPrint2', value);
  }

  getShowBanksInPrint2(): boolean {
    return this.getBooleanSetting('printSettings.showBanksInPrint2', false);
  }

  setShowBanksInPrint2(value: boolean): void {
    this.setBooleanSetting('printSettings.showBanksInPrint2', value);
  }

  private getBooleanSetting(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }

    return raw === 'true';
  }

  private setBooleanSetting(key: string, value: boolean): void {
    localStorage.setItem(key, String(value));
  }
}
