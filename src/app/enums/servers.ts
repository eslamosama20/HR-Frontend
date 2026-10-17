
export enum Servers {
  inventoryUrl = "inventoryUrl",
  accountingUrl = "accountingUrl",
  authUrl = "authUrl",
  invoiceUrl = "invoiceUrl",
  purchaseInvoiceUrl = "purchaseInvoiceUrl",
  salesInvoiceUrl = "salesInvoiceUrl",
  receipts = "receipts",
  notes = "notes",
  serverUrl= "serverUrl",
  baseApi= "baseApi",
  hrUrl = "hrUrl",
  settingsUrl = "settingsUrl"
}


export enum ResponseStatusCode
{
    Success = 0,
    GeneralFail = -1,
    NoRecordsUpdated = -2,
    Validation = -3,
    Conflict = -4,
    NotFound = -5,
    Unauthorized =-6,
    Forbidden = -7,
    NoContent = -8
}
