import {TrailBalanceHeaderDataModel} from "./trailBalanceHeaderData.model";

export class TrailBalanceRootDataModel {

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

  headers: TrailBalanceHeaderDataModel[];
  constructor(data?: Partial<TrailBalanceRootDataModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
