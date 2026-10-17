export class BillAccountPostDto {
    supplierId: string; // GUID as a string, required
    supplierBankAccountNumber: string; // Required bank account number
    description?: string; // Optional description
    netPrice: number; // Required net price of the transaction
    tax: number; // Required tax amount applied
    taxAmount: number; // Required total tax amount
    totalPrice: number; // Required total price including tax
}

export class BillAccountPutDto {
    id: string; // GUID as a string, required
    supplierId: string; // GUID as a string, required
    supplierBankAccountNumber: string; // Required bank account number
    description?: string; // Optional description
    netPrice: number; // Required net price of the transaction
    tax: number; // Required tax amount applied
    taxAmount: number; // Required total tax amount
    totalPrice: number; // Required total price including tax
}

export class BillAccountResponseDto {
    id: string; // GUID as a string, required
    supplierId: string; // GUID as a string, required
    supplierBankAccountNumber: string; // Required bank account number
    description?: string; // Optional description
    netPrice: number; // Required net price of the transaction
    tax: number; // Required tax amount applied
    taxAmount: number; // Required total tax amount
    totalPrice: number; // Required total price including tax
}