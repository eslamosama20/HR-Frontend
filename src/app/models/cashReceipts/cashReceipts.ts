export class CashReceipts{
    id?:string;
    description?:string;
    attatchments?:File;
    billNumber:number;
    createdDate: Date;
    sellerId:string;
    treasuryId:number;
    classificationId?:number;
    supplierId:string;
    supplierBankAccountNumber:number;
    tax:number;
    taxAmount:number;
    netPrice:number;
    totalPrice:number;
}