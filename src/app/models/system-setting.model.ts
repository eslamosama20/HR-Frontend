import {EntityBase} from './base/entity-base';
import {ReservationSerialNumberFormat} from '../enums/reservation-serial-number-format';

export class SystemSettingModel extends EntityBase {

  timeZone: string;
  isLinkedToInventory: boolean = false;
  reservationSequencePrefix: string;
  reservationSerialNumberFormat: ReservationSerialNumberFormat;
  reservationSerialStartNumber: number;
  reservationSerialPrefix: string;
  showSignaturesInInvoicePrint: boolean = true;
  showTermsInPrint2: boolean = false;

  showStampInReservationPrint: boolean = true;
  showCompanySignatureInReservationPrint: boolean = true;
  showCustomerSignatureInReservationPrint: boolean = true;
  defaultReservationUncheckedPolicyIds: string[] = [];
  defaultReservationUncheckedBankIds: string[] = [];
  sessionTimeoutMinutes: number = 20;

  constructor(data?: Partial<SystemSettingModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.timeZone
  }
}
