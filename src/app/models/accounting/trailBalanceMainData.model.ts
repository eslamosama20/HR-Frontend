export class TrailBalanceMainDataModel  {

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
  constructor(data?: Partial<TrailBalanceMainDataModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
