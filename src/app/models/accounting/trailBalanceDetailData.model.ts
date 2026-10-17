import {TrailBalanceMainDataModel} from "./trailBalanceMainData.model";

export class TrailBalanceDetailDataModel  {

  accountNumber: string;
  accountEnglishName: string;
  accountArabicName: string;

  periodCredit: number;
  periodDebit: number;

  previousCredit: number;
  previousDebit: number;

  balanceCredit: number;
  balanceDebit: number;
  balance: number;

  mains: TrailBalanceMainDataModel[];
  constructor(data?: Partial<TrailBalanceDetailDataModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
