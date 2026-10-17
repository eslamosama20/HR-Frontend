export interface SalesInvoiceDetails {
  invoiceId: string
  invoiceNo: string
  supplierId: string;
  suppilerArabicName: string
  suppilerEnglishName: string
  mainAccountId: string
  description: string
  issueDate: Date
  itemDetails: ItemDetails[]
  isFrontal?: boolean;

  isCleared: boolean;
  invoiceHash: string;
  generatedQR: string;

  totalItemPrice: number;
  totalItemQuantity: number;
  totalInvoicePrice: number;
  totalInvoicePriceWithTax: number;
}

interface ItemDetails {
  itemNo: string;
  referenceCode: string;
  itemArabicName: string
  itemEnglishName: string
  price: string
  quantity: string
  totalPrice: string;
  totalPriceWithTax: string
  isTaxExempted: boolean;  // Indicates whether the invoice is exempted from tax
}
