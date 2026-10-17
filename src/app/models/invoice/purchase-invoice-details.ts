export interface PurchaseInvoiceDetails {
  invoiceId: string;
  invoiceNo: string
  supplierID: string;
  suppilerArabicName: string
  suppilerEnglishName: string
  mainAccountId: string
  description: string
  issueDate: Date
  itemDetails: ItemDetails[]

  totalItemPrice: number;
  totalItemQuantity: number;
  totalInvoicePrice: number;
  totalInvoicePriceWithTax: number;
  totalPrice: number;
  totalPriceWithTax: number;
  isFrontal: boolean;
}

interface ItemDetails {
  itemNo: string;
  referenceCode: string;
  itemArabicName: string;
  itemEnglishName: string;
  price: string;
  quantity: string;
  totalPrice: string;
  totalPriceWithTax: string;
  isTaxExempted: boolean;
}

