import { Routes } from '@angular/router';
import { AuthGuard } from '../modules/auth/services/auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { UserManagementComponent } from './user-management/user-management.component';
import { PERMISSIONS } from '../config/permissions';

let Routing: Routes;
Routing = [
  {
    path: 'dashboard',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Dashboard.Read] },
    loadChildren: () =>
      import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'builder',
    loadChildren: () =>
      import('./builder/builder.module').then((m) => m.BuilderModule),
  },

  {
    path: 'crafted/account',
    loadChildren: () =>
      import('../modules/account/account.module').then((m) => m.AccountModule),
  },

  {
    path: 'crafted/widgets',
    loadChildren: () =>
      import('../modules/widgets-examples/widgets-examples.module').then(
        (m) => m.WidgetsExamplesModule
      ),
  },

  {
    path: '',
    redirectTo: '/hr/employees',
    pathMatch: 'full',
  },

  {
    path: 'inventory/management',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.InventoryManagement.Read] },
    loadChildren: () =>
      import(
        './inventory/inventory-management/inventory-management.module'
      ).then((m) => m.InventoryManagementModule),
  },
  {
    path: 'company-details',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.CompanyDetails.Read] },
    loadComponent: () =>
      import('./inventory/company-details/company-details.component').then(
        (m) => m.CompanyDetailsComponent
      ),
  },
  {
    path: 'company-details/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.CompanyDetails.Read] },
    loadComponent: () =>
      import(
        './inventory/view-company-details/view-company-details.component'
      ).then((m) => m.ViewCompanyDetailsComponent),
  },
  {
    path: 'inventory/store-details',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/store-details/store-details.component').then(
        (m) => m.StoreDetailsComponent
      ),
  },
  {
    path: 'inventory/view',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/inventory-view/inventory-view.component').then(
        (m) => m.InventoryViewComponent
      ),
  },
  {
    path: 'inventory/stock-view',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/stock-view/stock-view.component').then(
        (m) => m.StockViewComponent
      ),
  },
  {
    path: 'inventory/barcode-management',
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.MainPurchaseClass.Read,
        PERMISSIONS.MainSalesClass.Read,
      ],
    },
    loadComponent: () =>
      import('./inventory/barcode-management/barcode-management.component').then(
        (m) => m.BarcodeManagementComponent
      ),
  },
  {
    path: 'inventory/transfer',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/store-transfer-list/store-transfer-list.component').then(
        (m) => m.StoreTransferListComponent
      ),
  },
  {
    path: 'inventory/transfer/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/store-transfer/store-transfer.component').then(
        (m) => m.StoreTransferComponent
      ),
  },
  {
    path: 'inventory/damaged',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/damaged-inventory-list/damaged-inventory-list.component').then(
        (m) => m.DamagedInventoryListComponent
      ),
  },
  {
    path: 'inventory/stagnant',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.StoreDetails.Read] },
    loadComponent: () =>
      import('./inventory/stagnant-inventory/stagnant-inventory.component').then(
        (m) => m.StagnantInventoryComponent
      ),
  },

  {
    path: 'inventory/supplier-details/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SupplierDetails.Read] },
    loadComponent: () =>
      import('./inventory/add-supplier-profile/add-supplier-profile.component').then(
        (m) => m.AddSupplierProfileComponent
      ),
  },
  {
    path: 'inventory/supplier-details/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SupplierDetails.Read] },
    loadComponent: () =>
      import('./inventory/add-supplier-profile/add-supplier-profile.component').then(
        (m) => m.AddSupplierProfileComponent
      ),
  },
  {
    path: 'inventory/supplier-details',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SupplierDetails.Read] },
    loadComponent: () =>
      import('./inventory/supplier-details/supplier-details.component').then(
        (m) => m.SupplierDetailsComponent
      ),
  },
  {
    path: 'inventory/frontal-supplier-details',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalSupplierDetails.Read] },
    loadComponent: () =>
      import('./inventory/supplier-details/supplier-details.component').then(
        (m) => m.SupplierDetailsComponent
      ),
  },
  {
    path: 'expensescenters',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ExpensesCenter.Read] },
    loadComponent: () =>
      import('./expensescenters/expensescenters.component').then(
        (m) => m.EXPENSESCENTERSComponent
      ),
  },
  {
    path: 'hotels',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./hotels/hotels.component').then((m) => m.HotelsComponent),
  },
  {
    path: 'channel-manager',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./channel-manager/channel-manager.component').then(
        (m) => m.ChannelManagerComponent
      ),
  },
  {
    path: 'frontal-hotels',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalHotel.Read] },
    loadComponent: () =>
      import('./hotels/hotels.component').then((m) => m.HotelsComponent),
  },
  {
    path: 'reservation-meal',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationMeal.Read] },
    loadComponent: () =>
      import('./reservation-meal/reservation-meal.component').then(
        (m) => m.ReservationMealComponent
      ),
  },
  {
    path: 'frontal-reservation-meal',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationMeal.Read] },
    loadComponent: () =>
      import('./reservation-meal/reservation-meal.component').then(
        (m) => m.ReservationMealComponent
      ),
  },


  {
    path: 'reservation-view',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationView.Read] },
    loadComponent: () =>
      import('./reservation-view/reservation-view.component').then(
        (m) => m.ReservationViewComponent
      ),
  },
  {
    path: 'frontal-reservation-view',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationView.Read] },
    loadComponent: () =>
      import('./reservation-view/reservation-view.component').then(
        (m) => m.ReservationViewComponent
      ),
  },
  {
    path: 'reservation-company',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationCompany.Read] },
    loadComponent: () =>
      import('./reservation-company/reservation-company.component').then(
        (m) => m.ReservationCompanyComponent
      ),
  },
  {
    path: 'frontal-reservation-company',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationCompany.Read] },
    loadComponent: () =>
      import('./reservation-company/reservation-company.component').then(
        (m) => m.ReservationCompanyComponent
      ),
  },
  {
    path: 'reservation-supplier',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationSupplier.Read] },
    loadComponent: () =>
      import('./reservation-supplier/reservation-supplier.component').then(
        (m) => m.ReservationSupplierComponent
      ),
  },
  {
    path: 'frontal-reservation-supplier',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationSupplier.Read] },
    loadComponent: () =>
      import('./reservation-supplier/reservation-supplier.component').then(
        (m) => m.ReservationSupplierComponent
      ),
  },
  {
    path: 'reservation-service',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationService.Read] },
    loadComponent: () =>
      import('./reservation-services/reservation-services.component').then(
        (m) => m.ReservationServicesComponent
      ),
  },
  {
    path: 'frontal-reservation-service',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationService.Read] },
    loadComponent: () =>
      import('./reservation-services/reservation-services.component').then(
        (m) => m.ReservationServicesComponent
      ),
  },
  {
    path: 'hotel-allotment',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.HotelAllotment.Read] },
    loadComponent: () =>
      import('./reservations/hotel-allotment/hotel-allotment.component').then(
        (m) => m.HotelAllotmentComponent
      ),
  },
  {
    path: 'reservation-purchases',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Read] },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'reservation-purchases/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Create], title: 'RESERVATION_PURCHASE.ADD_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.ADD_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'reservation-purchases/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Read], title: 'RESERVATION_PURCHASE.VIEW_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.VIEW_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'reservation-purchases/edit/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Update], title: 'RESERVATION_PURCHASE.EDIT_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.EDIT_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'frontal-reservation-purchases',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Read] },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'frontal-reservation-purchases/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Create], title: 'RESERVATION_PURCHASE.ADD_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.ADD_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'frontal-reservation-purchases/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Read], title: 'RESERVATION_PURCHASE.VIEW_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.VIEW_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'frontal-reservation-purchases/edit/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationPurchases.Update], title: 'RESERVATION_PURCHASE.EDIT_INVOICE', breadcrumb: 'RESERVATION_PURCHASE.EDIT_INVOICE' },
    loadComponent: () =>
      import('./reservations/reservation-purchases/reservation-purchases.component').then(
        (m) => m.ReservationPurchasesComponent
      ),
  },
  {
    path: 'room-availability',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.RoomAvailability.Read] },
    loadComponent: () =>
      import(
        './reservations/room-availability/room-availability.component'
      ).then((m) => m.RoomAvailabilityComponent),
  },

  {
    path: 'reservation-season',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.ReservationSeason.Read] },
    loadComponent: () =>
      import('./reservation-seasons/reservation-seasons.component').then(
        (m) => m.ReservationSeasonsComponent
      ),
  },
  {
    path: 'frontal-reservation-season',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalReservationSeason.Read] },
    loadComponent: () =>
      import('./reservation-seasons/reservation-seasons.component').then(
        (m) => m.ReservationSeasonsComponent
      ),
  },
  {
    path: 'room-type',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.RoomType.Read] },
    loadComponent: () =>
      import('./room-type/room-type.component').then(
        (m) => m.RoomTypeComponent
      ),
  },
  {
    path: 'frontal-room-type',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalRoomType.Read] },
    loadComponent: () =>
      import('./room-type/room-type.component').then(
        (m) => m.RoomTypeComponent
      ),
  },
  {
    path: 'sales-representative',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SalesRepresentative.Read] },
    loadComponent: () =>
      import('./sales-representative/sales-representative.component').then(
        (m) => m.SalesRepresentativeComponent
      ),
  },
  {
    path: 'frontal-sales-representative',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalSalesRepresentative.Read] },
    loadComponent: () =>
      import('./sales-representative/sales-representative.component').then(
        (m) => m.SalesRepresentativeComponent
      ),
  },
  {
    path: 'reservations',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.Reservation.Read,
        PERMISSIONS.FrontalReservation.Read,
      ],
    },
    loadChildren: () =>
      import('./reservations/reservations.module').then(
        (m) => m.ReservationsModule
      ),
  },
  {
    path: 'meal-reservations',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.MealReservation.Read] },
    loadChildren: () =>
      import('./meal-reservations/meal-reservations.module').then(
        (m) => m.MealReservationsModule
      ),
  },
  {
    path: 'admin/bookings',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SmartBooking.Read] },
    loadComponent: () =>
      import('./public-booking-admin/public-bookings-admin.component').then(
        (m) => m.PublicBookingsAdminComponent
      ),
  },
  {
    path: 'hotel-list',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./hotel-list/hotel-list.component').then(
        (m) => m.HotelListComponent
      ),
  },
  {
    path: 'hotel-details/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./hotel-details/hotel-details.component').then(
        (m) => m.HotelDetailsComponent
      ),
  },
  {
    path: 'booking-form',
    loadComponent: () =>
      import('./booking-form/booking-form.component').then(
        (m) => m.BookingFormComponent
      ),
  },
  {
    path: 'public-home',
    loadComponent: () =>
      import('./public-home/public-home.component').then(
        (m) => m.PublicHomeComponent
      ),
  },
  {
    path: 'public-bookings-admin',
    redirectTo: 'admin/bookings',
  },
  {
    path: 'hotel-erp-linking',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./hotel-erp-linking/hotel-erp-linking.component').then(
        (m) => m.HotelErpLinkingComponent
      ),
  },
  {
    path: 'channel-manager',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Hotels.Read] },
    loadComponent: () =>
      import('./channel-manager/channel-manager.component').then(
        (m) => m.ChannelManagerComponent
      ),
  },
  {
    path: 'inventory/measurement-unit',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.MeasurementUnit.Read] },
    loadComponent: () =>
      import('./inventory/measurement-unit/measurement-unit.component').then(
        (m) => m.MeasurementUnitComponent
      ),
  },

  {
    path: 'inventory/product-unit-status',
    loadComponent: () =>
      import(
        './inventory/product-unit-status/product-unit-status.component'
      ).then((m) => m.ProductUnitStatusComponent),
  },
  {
    path: 'inventory/batch-status',
    loadComponent: () =>
      import('./inventory/batch-status/batch-status.component').then(
        (m) => m.BatchStatusComponent
      ),
  },
  {
    path: 'inventory/batch-unit-status',
    loadComponent: () =>
      import('./inventory/batch-unit-status/batch-unit-status.component').then(
        (m) => m.BatchUnitStatusComponent
      ),
  },
  {
    path: 'inventory/company-status',
    loadComponent: () =>
      import('./inventory/company-status/company-status.component').then(
        (m) => m.CompanyStatusComponent
      ),
  },
  {
    path: 'inventory/branch-status',
    loadComponent: () =>
      import('./inventory/branch-status/branch-status.component').then(
        (m) => m.BranchStatusComponent
      ),
  },
  {
    path: 'inventory/store-status',
    loadComponent: () =>
      import('./inventory/store-status/store-status.component').then(
        (m) => m.StoreStatusComponent
      ),
  },
  {
    path: 'inventory/supplier-status',
    loadComponent: () =>
      import('./inventory/supplier-status/supplier-status.component').then(
        (m) => m.SupplierStatusComponent
      ),
  },
  {
    path: 'finance-periods',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FinancePeriods.Read] },
    loadComponent: () =>
      import('./FinancePeriods/FinancePeriods.component').then(
        (m) => m.FinanceperiodsComponent
      ),
  },
  {
    path: 'accounting',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.Account.Read,
        PERMISSIONS.Transaction.Read,
        PERMISSIONS.FrontalTransaction.Read,
        PERMISSIONS.ExpensesCenter.Read,
        PERMISSIONS.CustomerProfile.Read,
        PERMISSIONS.FrontalCustomerProfile.Read,
        PERMISSIONS.SupplierDetails.Read,
        PERMISSIONS.FrontalSupplierDetails.Read,
        PERMISSIONS.ReviewBalance.Read,
        PERMISSIONS.ProfitLossAccount.Read,
        PERMISSIONS.BudgetAssessment.Read,
        PERMISSIONS.AccountStatement.Read,
        PERMISSIONS.FrontalAccountStatement.Read,
      ],
    },
    loadChildren: () =>
      import('./accounting/accounting.module').then((m) => m.AccountingModule),
  },
  {
    path: 'user-management',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.UserManagement.Read] },
    component: UserManagementComponent,
  },
  {
    path: 'user-management/add-user',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.UserManagement.Read] },
    loadComponent: () =>
      import('./user-management/add-user/add-user.component').then(
        (m) => m.AddUserComponent
      ),
  },
  {
    path: 'user-profile',
    loadComponent: () =>
      import('./user-profile/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
  },
  {
    path: 'reports',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.InventoryReport.Read,
        PERMISSIONS.SupplierReport.Read,
        PERMISSIONS.PurchasableCardReport.Read,
        PERMISSIONS.PurchasableReport.Read,
        PERMISSIONS.SalesInvoiceReport.Read,
      ],
    },
    loadChildren: () =>
      import('./reports/reports.module').then((m) => m.ReportsModule),
  },
  {
    path: 'company-data',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.CompanyDetails.Read] },
    loadChildren: () =>
      import('./company-data/company-data.module').then(
        (m) => m.CompanyDataModule
      ),
  },
  {
    path: 'purchase-classes-tree',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.MainPurchaseClass.Read] },
    loadComponent: () =>
      import('./purchase-classes-tree/purchase-classes-tree.component').then(
        (m) => m.PurchaseClassesTreeComponent
      ),
  },
  {
    path: 'sales-classes-tree',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.MainSalesClass.Read] },
    loadComponent: () =>
      import('./sales-classes-tree/sales-classes-tree.component').then(
        (m) => m.SalesClassesTreeComponent
      ),
  },
  {
    path: 'receipts',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.PaymentReceipt.Read,
        PERMISSIONS.FrontalPaymentReceipt.Read,
        PERMISSIONS.PaycheckReceipt.Read,
        PERMISSIONS.FrontalPaycheckReceipt.Read,
      ],
    },
    loadChildren: () =>
      import('./receipts/receipts.module').then((m) => m.ReceiptsModule),
  },
  {
    path: 'notes',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.DebitNote.Read] },
    loadChildren: () =>
      import('./notes/notes.module').then((m) => m.NotesModule),
  },
  {
    path: 'payments',
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.PaymentReceipt.Read,
        PERMISSIONS.FrontalPaymentReceipt.Read,
      ],
    },
    loadComponent: () =>
      import('./payments/payments.component').then(
        (m) => m.PaymentsComponent
      ),
  },
  {
    path: 'invoices',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.SalesInvoice.Read,
        PERMISSIONS.FrontalSalesInvoice.Read,
        PERMISSIONS.Reservation.Read,
      ],
    },
    loadChildren: () =>
      import('./invoices/invoices.module').then((m) => m.InvoicesModule),
  },


  {
    path: 'sales-credit-notes',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.SalesCreditNote.Read] },
    loadChildren: () =>
      import('./notes/sales-credit-notes/sales-credit-notes.module').then(
        (m) => m.SalesCreditNotesModule
      ),
  },
  {
    path: 'quotations',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.SalesQuotation.Read] },
    loadChildren: () =>
      import('./quotations/quotations.module').then((m) => m.QuotationsModule),
  },
  {
    path: 'purchase-invoices',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.PurchaseInvoice.Read,
        PERMISSIONS.FrontalPurchaseInvoice.Read,
      ],
    },
    loadChildren: () =>
      import('./purchase-invoices/purchase-invoices.module').then(
        (m) => m.PurchaseInvoicesModule
      ),
  },

  {
    path: 'sales-returns',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.SalesReturn.Read, 'SaleReturn.Read'] },
    loadChildren: () =>
      import('./sales-returns/sales-returns.module').then(
        (m) => m.SalesReturnsModule
      ),
  },
  {
    path: 'purchase-returns',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.PurchaseReturn.Read] },
    loadChildren: () =>
      import('./purchase-returns/purchase-returns.module').then(
        (m) => m.PurchaseReturnsModule
      ),
  },
  {
    path: 'permits',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.InventoryPermit.Read] },
    loadChildren: () =>
      import('./permits/permits.module').then((m) => m.PermitsModule),
  },
  {
    path: 'inventory-stocktaking',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.InventoryStocktaking.Read] },
    loadChildren: () =>
      import('./stocktaking/stocktaking.module').then(
        (m) => m.StocktakingModule
      ),
  },
  {
    path: 'recipes',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Recipe.Read] },
    loadChildren: () =>
      import('./recipes/recipes.module').then((m) => m.RecipesModule),
  },
  {
    path: 'treasuries/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Treasury.Read] },
    loadComponent: () =>
      import('./treasuries/add-treasury/add-treasury.component').then(
        (m) => m.AddTreasuryComponent
      ),
  },
  {
    path: 'frontal-treasuries/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalTreasury.Read] },
    loadComponent: () =>
      import('./treasuries/add-treasury/add-treasury.component').then(
        (m) => m.AddTreasuryComponent
      ),
  },
  {
    path: 'bank-accounts/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Treasury.Read] },
    loadComponent: () =>
      import('./treasuries/add-bank-account/add-bank-account.component').then(
        (m) => m.AddBankAccountComponent
      ),
  },
  {
    path: 'frontal-bank-accounts/new',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalTreasury.Read] },
    loadComponent: () =>
      import('./treasuries/add-bank-account/add-bank-account.component').then(
        (m) => m.AddBankAccountComponent
      ),
  },
  {
    path: 'treasuries',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Treasury.Read] },
    loadComponent: () =>
      import('./treasuries/treasuries.component').then(
        (m) => m.TreasuryComponent
      ),
  },
  {
    path: 'bank-accounts',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.Treasury.Read] },
    loadComponent: () =>
      import('./treasuries/treasuries.component').then(
        (m) => m.TreasuryComponent
      ),
  },
  {
    path: 'frontal-treasuries',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalTreasury.Read] },
    loadComponent: () =>
      import('./treasuries/treasuries.component').then(
        (m) => m.TreasuryComponent
      ),
  },
  {
    path: 'frontal-bank-accounts',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.FrontalTreasury.Read] },
    loadComponent: () =>
      import('./treasuries/treasuries.component').then(
        (m) => m.TreasuryComponent
      ),
  },
  {
    path: 'roles-management',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.RoleManagement.Read] },
    loadComponent: () =>
      import('./roles-management/roles-management.component').then(
        (m) => m.RolesManagementComponent
      ),
  },
  {
    path: 'roles-management/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.RoleManagement.Read] },
    loadComponent: () =>
      import('./roles-management/view-role/view-role.component').then(
        (m) => m.ViewRoleComponent
      ),
  },
  {
    path: 'roles-management/view/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.RoleManagement.Read] },
    loadComponent: () =>
      import('./roles-management/view-role/view-role.component').then(
        (m) => m.ViewRoleComponent
      ),
  },

  {
    path: 'system-setting',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SystemSetting.Read] },
    loadComponent: () =>
      import('./system-setting/system-setting.component').then(
        (m) => m.SystemSettingComponent
      ),
  },
  {
    path: 'system-notifications',
    loadComponent: () =>
      import('./system-notifications/system-notifications.component').then(
        (m) => m.SystemNotificationsComponent
      ),
  },
  {
    path: 'pdf-template-configurator',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.PdfTemplateConfigurator.Read] },
    loadComponent: () =>
      import(
        './pdf-template-configurator/pdf-template-configurator.component'
      ).then((m) => m.PdfTemplateConfiguratorComponent),
  },
  {
    path: 'reservation-print-table-template',
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      permissions: [PERMISSIONS.ReservationPrintTableTemplates.Read],
    },
    loadComponent: () =>
      import(
        './reservation-print-table-templates/reservation-print-table-templates.component'
      ).then((m) => m.ReservationPrintTableTemplatesComponent),
  },
  {
    path: 'admin/hotels-management',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: [PERMISSIONS.SmartBooking.Read] },
    loadComponent: () =>
      import(
        './public-booking-admin/public-hotels-management.component'
      ).then((m) => m.PublicHotelsManagementComponent),
  },
  {
    path: 'admin/public-hotels',
    redirectTo: 'admin/hotels-management',
  },
  {
    path: 'public-hotels-admin',
    redirectTo: 'admin/hotels-management',
  },
  {
    path: 'admin/public-room-types',
    redirectTo: 'admin/hotels-management',
  },
  {
    path: 'public-room-types-admin',
    redirectTo: 'admin/hotels-management',
  },
  {
    path: 'projects',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Read] },
    loadChildren: () =>
      import('../projects/projects.module').then((m) => m.ProjectsModule),
  },
  {
    path: 'cashier',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      permissions: [
        PERMISSIONS.Cashier.POS,
        PERMISSIONS.Cashier.Session.Manage,
        PERMISSIONS.Cashier.Pharmacy,
        PERMISSIONS.Cashier.Restaurant,
      ],
    },
    loadChildren: () =>
      import('./cashier/cashier.module').then((m) => m.CashierModule),
  },
  {
    path: 'unauthorized',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./unauthorized/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },
  {
    path: 'public/projects/share/:shareToken',
    loadComponent: () =>
      import('../projects/components/project-share/project-share.component').then(
        (m) => m.ProjectShareComponent
      ),
  },
  {
    path: 'hr',
    loadChildren: () => import('./hr/hr.module').then((m) => m.HrModule),
  },
  {
    path: 'company-documents',
    loadComponent: () => import('./hr-documents/company-documents/company-documents.component').then(m => m.CompanyDocumentsComponent)
  },
  {
    path: 'resignation-requests',
    loadComponent: () => import('./hr-documents/resignation-requests/resignation-requests.component').then(m => m.ResignationRequestsComponent)
  },
  {
    path: 'hr-trust-receipts',
    loadComponent: () => import('./hr-documents/hr-trust-receipts/hr-trust-receipts.component').then(m => m.HRTrustReceiptsComponent)
  },
  {
    path: 'employment-applications',
    loadComponent: () => import('./hr-documents/employment-applications/employment-applications.component').then(m => m.EmploymentApplicationsComponent)
  },
  {
    path: 'bank-documents',
    loadComponent: () => import('./hr-documents/bank-documents/bank-documents.component').then(m => m.BankDocumentsComponent)
  },
  {
    path: 'insurance-records',
    loadComponent: () => import('./hr-documents/insurance-records/insurance-records.component').then(m => m.InsuranceRecordsComponent)
  },
  {
    path: 'salary-slips',
    loadComponent: () => import('./hr-documents/salary-slips/salary-slips.component').then(m => m.SalarySlipsComponent)
  },
  {
    path: 'hr-letter',
    loadComponent: () => import('./hr-documents/hr-letter/hr-letter.component').then(m => m.HrLetterComponent)
  },
  {
    path: 'leave-applications',
    loadComponent: () => import('./hr-documents/leave-applications/leave-applications.component').then(m => m.LeaveApplicationsComponent)
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];


export { Routing };
