
export class AccountStatementRecordModel {

  isTransactionPost1: boolean;
  transactionDate: string;
  transactionNumber: string;
  transactionId: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  description: string;
  transactionTypeArabicName: string;
  transactionTypeEnglishName: string;
  accountId: string;

  constructor(data?: Partial<AccountStatementRecordModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
