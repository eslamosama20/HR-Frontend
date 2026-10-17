import {TrailBalanceDetailDataModel} from "./trailBalanceDetailData.model";

export class TrailBalanceHeaderDataModel  {

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

  details: TrailBalanceDetailDataModel[];
  constructor(data?: Partial<TrailBalanceHeaderDataModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
