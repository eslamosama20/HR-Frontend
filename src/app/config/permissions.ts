/**
 * Centralized permission constants.
 * Use these instead of string literals in route data and sidebar *ngIf checks.
 * Naming convention: {EntityName}.{Action}
 */
export const PERMISSIONS = {
  // System
  Dashboard: {
    Read: 'Dashboard.Read',
  },
  Builder: {
    Admin: 'System.Admin',
  },
  SystemNotifications: {
    Read: 'SystemNotifications.Read',
  },

  // Projects
  Projects: {
    Read: 'Projects.Read',
    Create: 'Projects.Create',
    Update: 'Projects.Update',
    Delete: 'Projects.Delete',
    Assignment: {
      Read: 'Projects.Assignment.Read',
      Update: 'Projects.Assignment.Update'
    },
    Execution: {
      Read: 'Projects.Execution.Read',
      Update: 'Projects.Execution.Update'
    },
    Documents: {
      Read: 'Projects.Documents.Read',
      Create: 'Projects.Documents.Create',
      Delete: 'Projects.Documents.Delete'
    },
    Payments: {
      Read: 'Projects.Payments.Read',
      Create: 'Projects.Payments.Create',
      Update: 'Projects.Payments.Update',
      Delete: 'Projects.Payments.Delete'
    },
    PriceQuotes: {
      Read: 'Projects.PriceQuotes.Read',
      Create: 'Projects.PriceQuotes.Create',
      Update: 'Projects.PriceQuotes.Update',
      Delete: 'Projects.PriceQuotes.Delete',
      Accept: 'Projects.PriceQuotes.Accept'
    },
    Assessments: {
      Read: 'Projects.Assessments.Read',
      Create: 'Projects.Assessments.Create',
      Update: 'Projects.Assessments.Update',
      Delete: 'Projects.Assessments.Delete'
    },
    Reports: {
      Read: 'Projects.Reports.Read'
    }
  },

  // Sales
  MainSalesClass: {
    Read: 'MainSalesClass.Read',
    Create: 'MainSalesClass.Create',
    Update: 'MainSalesClass.Update',
    Delete: 'MainSalesClass.Delete',
  },
  SalesInvoice: {
    Read: 'SalesInvoice.Read',
    Create: 'SalesInvoice.Create',
    Update: 'SalesInvoice.Update',
    Delete: 'SalesInvoice.Delete',
    Import: 'SalesInvoice.Import',
    ExportExcel: 'SalesInvoice.ExportExcel',
    ExportSelectedExcel: 'SalesInvoice.ExportSelectedExcel',
    ExportPdfZip: 'SalesInvoice.ExportPdfZip',
    ExportPdfMerged: 'SalesInvoice.ExportPdfMerged',
    PrintSelected: 'SalesInvoice.PrintSelected',
    Print3: 'SalesInvoice.Print3',
    DownloadSelectedPdf: 'SalesInvoice.DownloadSelectedPdf',
    DownloadSelectedMergedPdf: 'SalesInvoice.DownloadSelectedMergedPdf',
    BulkShare: 'SalesInvoice.BulkShare',
  },
  FrontalSalesInvoice: {
    Read: 'FrontalSalesInvoice.Read',
    Create: 'FrontalSalesInvoice.Create',
  },
  SalesQuotation: {
    Read: 'SalesQuotation.Read',
    Create: 'SalesQuotation.Create',
    Update: 'SalesQuotation.Update',
    Delete: 'SalesQuotation.Delete',
  },
  SalesReturn: {
    Read: 'SalesReturn.Read',
    Create: 'SalesReturn.Create',
    Update: 'SalesReturn.Update',
    Delete: 'SalesReturn.Delete',
  },
  SaleReturn: {
    Read: 'SalesReturn.Read',
    Create: 'SalesReturn.Create',
    Update: 'SalesReturn.Update',
    Delete: 'SalesReturn.Delete',
  },
  SalesCreditNote: {
    Read: 'SalesCreditNote.Read',
    Create: 'SalesCreditNote.Create',
    Update: 'SalesCreditNote.Update',
    Delete: 'SalesCreditNote.Delete',
  },
  SalesInvoiceReport: { Read: 'SalesInvoiceReport.Read' },

  // Cashier / POS
  Cashier: {
    POS: 'Cashier.POS',
    Session: { Manage: 'Cashier.Session.Manage' },
    Pharmacy: 'Cashier.Pharmacy',
    Restaurant: 'Cashier.Restaurant',
    Pricing: {
      Retail: 'Cashier.Pricing.Retail',
      Wholesale: 'Cashier.Pricing.Wholesale',
      Bulk: 'Cashier.Pricing.Bulk',
      Purchase: 'Cashier.Pricing.Purchase',
    },
    Invoice: {
      Discount: 'Cashier.Invoice.Discount',
      EditPrice: 'Cashier.Invoice.EditPrice',
    },
  },

  // Operations / Reservations
  Reservation: {
    Read: 'Reservation.Read',
    Create: 'Reservation.Create',
    Update: 'Reservation.Update',
    Delete: 'Reservation.Delete',
    AdvancedSearch: { Read: 'ReservationAdvancedSearch.Read' },
  },
  ReservationAdvancedSearch: {
    Read: 'ReservationAdvancedSearch.Read',
  },
  FrontalReservation: {
    Read: 'FrontalReservation.Read',
    Create: 'FrontalReservation.Create',
    Update: 'FrontalReservation.Update',
    Delete: 'FrontalReservation.Delete',
    AdvancedSearch: { Read: 'FrontalReservationAdvancedSearch.Read' },
  },
  FrontalReservationAdvancedSearch: {
    Read: 'FrontalReservationAdvancedSearch.Read',
  },
  RoomAvailability: { Read: 'RoomAvailability.Read' },
  HotelAllotment: { Read: 'HotelAllotment.Read' },
  ReservationPurchases: {
    Read: 'ReservationPurchases.Read',
    Create: 'ReservationPurchases.Create',
    Update: 'ReservationPurchases.Update',
    Delete: 'ReservationPurchases.Delete',
  },
  ReservationInvoice: {
    Read: 'ReservationInvoice.Read',
    Create: 'ReservationInvoice.Create',
    Update: 'ReservationInvoice.Update',
    Delete: 'ReservationInvoice.Delete',
  },
  ReservationReports: { Read: 'ReservationReports.Read' },
  ReservationPrintTableTemplates: {
    Read: 'ReservationPrintTableTemplates.Read',
    Create: 'ReservationPrintTableTemplates.Create',
    Update: 'ReservationPrintTableTemplates.Update',
    Delete: 'ReservationPrintTableTemplates.Delete',
  },

  // Reservations Data
  Hotels: {
    Read: 'Hotels.Read',
    Create: 'Hotels.Create',
    Update: 'Hotels.Update',
    Delete: 'Hotels.Delete',
  },
  FrontalHotel: {
    Read: 'FrontalHotel.Read',
    Create: 'FrontalHotel.Create',
    Update: 'FrontalHotel.Update',
    Delete: 'FrontalHotel.Delete',
  },
  ReservationMeal: {
    Read: 'ReservationMeal.Read',
    Create: 'ReservationMeal.Create',
    Update: 'ReservationMeal.Update',
    Delete: 'ReservationMeal.Delete',
  },
  FrontalReservationMeal: {
    Read: 'FrontalReservationMeal.Read',
    Create: 'FrontalReservationMeal.Create',
    Update: 'FrontalReservationMeal.Update',
    Delete: 'FrontalReservationMeal.Delete',
  },
  RoomType: {
    Read: 'RoomType.Read',
    Create: 'RoomType.Create',
    Update: 'RoomType.Update',
    Delete: 'RoomType.Delete',
  },
  FrontalRoomType: {
    Read: 'FrontalRoomType.Read',
    Create: 'FrontalRoomType.Create',
    Update: 'FrontalRoomType.Update',
    Delete: 'FrontalRoomType.Delete',
  },
  SalesRepresentative: {
    Read: 'SalesRepresentative.Read',
    Create: 'SalesRepresentative.Create',
    Update: 'SalesRepresentative.Update',
    Delete: 'SalesRepresentative.Delete',
  },
  FrontalSalesRepresentative: {
    Read: 'FrontalSalesRepresentative.Read',
    Create: 'FrontalSalesRepresentative.Create',
    Update: 'FrontalSalesRepresentative.Update',
    Delete: 'FrontalSalesRepresentative.Delete',
  },
  ReservationSupplier: {
    Read: 'ReservationSupplier.Read',
    Create: 'ReservationSupplier.Create',
    Update: 'ReservationSupplier.Update',
    Delete: 'ReservationSupplier.Delete',
  },
  FrontalReservationSupplier: {
    Read: 'FrontalReservationSupplier.Read',
    Create: 'FrontalReservationSupplier.Create',
    Update: 'FrontalReservationSupplier.Update',
    Delete: 'FrontalReservationSupplier.Delete',
  },
  ReservationService: {
    Read: 'ReservationService.Read',
    Create: 'ReservationService.Create',
    Update: 'ReservationService.Update',
    Delete: 'ReservationService.Delete',
  },
  FrontalReservationService: {
    Read: 'FrontalReservationService.Read',
    Create: 'FrontalReservationService.Create',
    Update: 'FrontalReservationService.Update',
    Delete: 'FrontalReservationService.Delete',
  },
  ReservationCompany: {
    Read: 'ReservationCompany.Read',
    Create: 'ReservationCompany.Create',
    Update: 'ReservationCompany.Update',
    Delete: 'ReservationCompany.Delete',
  },
  FrontalReservationCompany: {
    Read: 'FrontalReservationCompany.Read',
    Create: 'FrontalReservationCompany.Create',
    Update: 'FrontalReservationCompany.Update',
    Delete: 'FrontalReservationCompany.Delete',
  },
  ReservationView: {
    Read: 'ReservationView.Read',
    Create: 'ReservationView.Create',
    Update: 'ReservationView.Update',
    Delete: 'ReservationView.Delete',
  },
  FrontalReservationView: {
    Read: 'FrontalReservationView.Read',
    Create: 'FrontalReservationView.Create',
    Update: 'FrontalReservationView.Update',
    Delete: 'FrontalReservationView.Delete',
  },
  ReservationSeason: {
    Read: 'ReservationSeason.Read',
    Create: 'ReservationSeason.Create',
    Update: 'ReservationSeason.Update',
    Delete: 'ReservationSeason.Delete',
  },
  FrontalReservationSeason: {
    Read: 'FrontalReservationSeason.Read',
    Create: 'FrontalReservationSeason.Create',
    Update: 'FrontalReservationSeason.Update',
    Delete: 'FrontalReservationSeason.Delete',
  },

  // Smart Booking
  SmartBooking: { Read: 'SmartBooking.Read' },

  // Purchases
  MainPurchaseClass: {
    Read: 'MainPurchaseClass.Read',
    Create: 'MainPurchaseClass.Create',
    Update: 'MainPurchaseClass.Update',
    Delete: 'MainPurchaseClass.Delete',
  },
  PurchaseInvoice: {
    Read: 'PurchaseInvoice.Read',
    Create: 'PurchaseInvoice.Create',
    Update: 'PurchaseInvoice.Update',
    Delete: 'PurchaseInvoice.Delete',
  },
  FrontalPurchaseInvoice: {
    Read: 'FrontalPurchaseInvoice.Read',
    Create: 'FrontalPurchaseInvoice.Create',
  },
  PurchaseReturn: {
    Read: 'PurchaseReturn.Read',
    Create: 'PurchaseReturn.Create',
    Update: 'PurchaseReturn.Update',
    Delete: 'PurchaseReturn.Delete',
  },
  DebitNote: {
    Read: 'DebitNote.Read',
    Create: 'DebitNote.Create',
    Update: 'DebitNote.Update',
    Delete: 'DebitNote.Delete',
  },
  PurchasableReport: { Read: 'PurchasableReport.Read' },
  PurchasableCardReport: { Read: 'PurchasableCardReport.Read' },

  // Restaurants / Kitchens
  Recipe: {
    Read: 'Recipe.Read',
    Create: 'Recipe.Create',
    Update: 'Recipe.Update',
    Delete: 'Recipe.Delete',
  },
  MealReservation: {
    Read: 'MealReservation.Read',
    Create: 'MealReservation.Create',
    Update: 'MealReservation.Update',
    Delete: 'MealReservation.Delete',
  },

  // Main Details / Inventory
  MeasurementUnit: {
    Read: 'MeasurementUnit.Read',
    Create: 'MeasurementUnit.Create',
    Update: 'MeasurementUnit.Update',
    Delete: 'MeasurementUnit.Delete',
  },
  InventoryManagement: {
    Read: 'InventoryManagement.Read',
    Create: 'InventoryManagement.Create',
    Update: 'InventoryManagement.Update',
    Delete: 'InventoryManagement.Delete',
  },
  StoreDetails: {
    Read: 'StoreDetails.Read',
    Create: 'StoreDetails.Create',
    Update: 'StoreDetails.Update',
    Delete: 'StoreDetails.Delete',
  },
  InventoryPermit: {
    Read: 'InventoryPermit.Read',
    Create: 'InventoryPermit.Create',
    Update: 'InventoryPermit.Update',
    Delete: 'InventoryPermit.Delete',
  },
  InventoryStocktaking: {
    Read: 'InventoryStocktaking.Read',
    Create: 'InventoryStocktaking.Create',
    Update: 'InventoryStocktaking.Update',
    Delete: 'InventoryStocktaking.Delete',
  },

  // Customers
  CustomerProfile: {
    Read: 'CustomerProfile.Read',
    Create: 'CustomerProfile.Create',
    Update: 'CustomerProfile.Update',
    Delete: 'CustomerProfile.Delete',
    Import: 'CustomerProfile.Import',
    Export: 'CustomerProfile.Export',
  },
  FrontalCustomerProfile: {
    Read: 'FrontalCustomerProfile.Read',
    Create: 'FrontalCustomerProfile.Create',
    Update: 'FrontalCustomerProfile.Update',
    Delete: 'FrontalCustomerProfile.Delete',
  },

  // Suppliers
  SupplierDetails: {
    Read: 'SupplierDetails.Read',
    Create: 'SupplierDetails.Create',
    Update: 'SupplierDetails.Update',
    Delete: 'SupplierDetails.Delete',
  },
  FrontalSupplierDetails: {
    Read: 'FrontalSupplierDetails.Read',
    Create: 'FrontalSupplierDetails.Create',
    Update: 'FrontalSupplierDetails.Update',
    Delete: 'FrontalSupplierDetails.Delete',
  },

  // General Accounts
  Account: {
    Read: 'Account.Read',
    Create: 'Account.Create',
    Update: 'Account.Update',
    Delete: 'Account.Delete',
  },
  Transaction: {
    Read: 'Transaction.Read',
    Create: 'Transaction.Create',
    Update: 'Transaction.Update',
    Delete: 'Transaction.Delete',
    Import: 'Transaction.Import',
    Export: 'Transaction.Export',
  },
  FrontalTransaction: {
    Read: 'FrontalTransaction.Read',
    Create: 'FrontalTransaction.Create',
    Update: 'FrontalTransaction.Update',
    Delete: 'FrontalTransaction.Delete',
  },
  ExpensesCenter: {
    Read: 'ExpensesCenter.Read',
    Create: 'ExpensesCenter.Create',
    Update: 'ExpensesCenter.Update',
    Delete: 'ExpensesCenter.Delete',
  },

  // Finance
  PaymentReceipt: {
    Read: 'PaymentReceipt.Read',
    Create: 'PaymentReceipt.Create',
    Update: 'PaymentReceipt.Update',
    Delete: 'PaymentReceipt.Delete',
    MakeFrontal: 'PaymentReceipt.MakeFrontal',
  },
  FrontalPaymentReceipt: {
    Read: 'FrontalPaymentReceipt.Read',
    Create: 'FrontalPaymentReceipt.Create',
    Update: 'FrontalPaymentReceipt.Update',
    Delete: 'FrontalPaymentReceipt.Delete',
  },
  PaycheckReceipt: {
    Read: 'PaycheckReceipt.Read',
    Create: 'PaycheckReceipt.Create',
    Update: 'PaycheckReceipt.Update',
    Delete: 'PaycheckReceipt.Delete',
    MakeFrontal: 'PaycheckReceipt.MakeFrontal',
  },
  FrontalPaycheckReceipt: {
    Read: 'FrontalPaycheckReceipt.Read',
    Create: 'FrontalPaycheckReceipt.Create',
    Update: 'FrontalPaycheckReceipt.Update',
    Delete: 'FrontalPaycheckReceipt.Delete',
  },
  FinancePeriods: {
    Read: 'FinancePeriods.Read',
    Create: 'FinancePeriods.Create',
    Update: 'FinancePeriods.Update',
    Delete: 'FinancePeriods.Delete',
  },
  Treasury: {
    Read: 'Treasury.Read',
    Create: 'Treasury.Create',
    Update: 'Treasury.Update',
    Delete: 'Treasury.Delete',
  },
  FrontalTreasury: {
    Read: 'FrontalTreasury.Read',
    Create: 'FrontalTreasury.Create',
    Update: 'FrontalTreasury.Update',
    Delete: 'FrontalTreasury.Delete',
  },

  // Reports
  InventoryReport: { Read: 'InventoryReport.Read' },
  SupplierReport: { Read: 'SupplierReport.Read' },

  // Financial Reports
  ReviewBalance: { Read: 'ReviewBalance.Read' },
  ProfitLossAccount: { Read: 'ProfitLossAccount.Read' },
  BudgetAssessment: { Read: 'BudgetAssessment.Read' },
  AccountStatement: { Read: 'AccountStatement.Read' },
  FrontalAccountStatement: {
    Read: 'FrontalAccountStatement.Read',
    Create: 'FrontalAccountStatement.Create',
  },

  // Settings
  UserManagement: {
    Read: 'UserManagement.Read',
    Create: 'UserManagement.Create',
    Update: 'UserManagement.Update',
    Delete: 'UserManagement.Delete',
  },
  FrontalUserManagement: { Read: 'FrontalUserManagement.Read' },
  RoleManagement: {
    Read: 'RoleManagement.Read',
    Create: 'RoleManagement.Create',
    Update: 'RoleManagement.Update',
    Delete: 'RoleManagement.Delete',
  },
  FrontalRoleManagement: { Read: 'FrontalRoleManagement.Read' },
  CompanyDetails: {
    Read: 'CompanyDetails.Read',
    Create: 'CompanyDetails.Create',
    Update: 'CompanyDetails.Update',
    Delete: 'CompanyDetails.Delete',
  },
  SystemSetting: {
    Read: 'SystemSetting.Read',
    Create: 'SystemSetting.Create',
    Update: 'SystemSetting.Update',
    Delete: 'SystemSetting.Delete',
  },
  PdfTemplateConfigurator: { Read: 'PdfTemplateConfigurator.Read' },
  LicenseManagement: {
    Read: 'LicenseManagement.Read',
    Update: 'LicenseManagement.Update',
  },

  // Branches
  Branch: {
    Read: 'Branch.Read',
    Create: 'Branch.Create',
    Update: 'Branch.Update',
    Delete: 'Branch.Delete',
  },
  BranchDetails: {
    Read: 'BranchDetails.Read',
    Create: 'BranchDetails.Create',
    Update: 'BranchDetails.Update',
    Delete: 'BranchDetails.Delete',
  },


  // Pharmacy
  Pharmacy: {
    Read: 'Pharmacy.Read',
    Create: 'Pharmacy.Create',
    Update: 'Pharmacy.Update',
    Delete: 'Pharmacy.Delete',
    Prescriptions: {
      Create: 'Pharmacy.Prescriptions.Create',
      Dispense: 'Pharmacy.Prescriptions.Dispense',
      Cancel: 'Pharmacy.Prescriptions.Cancel',
      WasfatySync: 'Pharmacy.Prescriptions.WasfatySync',
      ViewHistory: 'Pharmacy.Prescriptions.ViewHistory',
    },
    ControlledDrugs: {
      View: 'Pharmacy.ControlledDrugs.View',
      Dispense: 'Pharmacy.ControlledDrugs.Dispense',
      ApproveReject: 'Pharmacy.ControlledDrugs.ApproveReject',
      ExportReports: 'Pharmacy.ControlledDrugs.ExportReports',
    },
    Patients: {
      CreateEdit: 'Pharmacy.Patients.CreateEdit',
      ManageClinicalAlerts: 'Pharmacy.Patients.ManageClinicalAlerts',
      Delete: 'Pharmacy.Patients.Delete',
    },
    Insurance: {
      EligibilityCheck: 'Pharmacy.Insurance.EligibilityCheck',
      SubmitClaim: 'Pharmacy.Insurance.SubmitClaim',
      SettleClaims: 'Pharmacy.Insurance.SettleClaims',
      ManagePolicies: 'Pharmacy.Insurance.ManagePolicies',
    },
    Batches: {
      View: 'Pharmacy.Batches.View',
      Manage: 'Pharmacy.Batches.Manage',
    },
    Pricing: {
      Manage: 'Pharmacy.Pricing.Manage',
    },
    ExpiryAlerts: {
      Manage: 'Pharmacy.ExpiryAlerts.Manage',
    },
    POS: {
      ApplyDiscount: 'Pharmacy.POS.ApplyDiscount',
      ReturnDrugs: 'Pharmacy.POS.ReturnDrugs',
      CloseShiftSummary: 'Pharmacy.POS.CloseShiftSummary',
    },
  },
} as const;
