import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../guards/permission.guard';
import { PERMISSIONS } from '../../config/permissions';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full'
  },
  {
    path: 'pos',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pos-dashboard/pos-dashboard.component').then(m => m.PosDashboardComponent),
    data: { breadcrumb: 'POS', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'session',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/cashier-session/cashier-session.component').then(m => m.CashierSessionComponent),
    data: { breadcrumb: 'Session Management', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  },
  {
    path: 'session/:id/report',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/cashier-session-report/cashier-session-report.component').then(m => m.CashierSessionReportComponent),
    data: { breadcrumb: 'Session Report', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  },
  {
    path: 'reports',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/cashier-reports/cashier-reports.component').then(m => m.CashierReportsComponent),
    data: { breadcrumb: 'Reports', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  },
  {
    path: 'quick-sale',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/quick-sale/quick-sale.component').then(m => m.QuickSaleComponent),
    data: { breadcrumb: 'Quick Sale', permissions: [PERMISSIONS.Cashier.POS] }
  },

  {
    path: 'pharmacy-prescriptions',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-prescriptions/pharmacy-prescriptions.component').then(m => m.PharmacyPrescriptionsComponent),
    data: { breadcrumb: 'Pharmacy Prescriptions', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-prescription-workbench',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/prescription-crud-workbench/prescription-crud-workbench.component').then(m => m.PrescriptionCrudWorkbenchComponent),
    data: { breadcrumb: 'Prescription CRUD Workbench', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-patients',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-patients/pharmacy-patients.component').then(m => m.PharmacyPatientsComponent),
    data: { breadcrumb: 'Pharmacy Patients', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-batches',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-batches/pharmacy-batches.component').then(m => m.PharmacyBatchesComponent),
    data: { breadcrumb: 'Pharmacy Batches', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-interactions',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-interactions/pharmacy-interactions.component').then(m => m.PharmacyInteractionsComponent),
    data: { breadcrumb: 'Pharmacy Interactions', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-insurance',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-insurance/pharmacy-insurance.component').then(m => m.PharmacyInsuranceComponent),
    data: { breadcrumb: 'Pharmacy Insurance', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-controlled-drugs',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-controlled-drugs/pharmacy-controlled-drugs.component').then(m => m.PharmacyControlledDrugsComponent),
    data: { breadcrumb: 'Pharmacy Controlled Drugs', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-alerts',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-alerts/pharmacy-alerts.component').then(m => m.PharmacyAlertsComponent),
    data: { breadcrumb: 'Pharmacy Alerts', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'pharmacy-returns',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/pharmacy-returns/pharmacy-returns.component').then(m => m.PharmacyReturnsComponent),
    data: { breadcrumb: 'Pharmacy Returns', permissions: [PERMISSIONS.Cashier.Pharmacy, PERMISSIONS.Pharmacy.Read] }
  },
  {
    path: 'floor',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/restaurant-floor/restaurant-floor.component').then(m => m.RestaurantFloorComponent),
    data: { breadcrumb: 'Restaurant Floor', permissions: [PERMISSIONS.Cashier.Restaurant] }
  },
  {
    path: 'live-orders',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/live-orders/live-orders.component').then(m => m.LiveOrdersComponent),
    data: { breadcrumb: 'Live Orders', permissions: [PERMISSIONS.Cashier.Restaurant] }
  },
  {
    path: 'table/:tableId',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/table-workspace/table-workspace.component').then(m => m.TableWorkspaceComponent),
    data: { breadcrumb: 'Table Workspace', permissions: [PERMISSIONS.Cashier.Restaurant] }
  },
  {
    path: 'self-order/:token',
    loadComponent: () => import('./components/self-order/self-order.component').then(m => m.SelfOrderComponent),
    data: { breadcrumb: 'Self Order' }
  },
  {
    path: 'z-report',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/z-report/z-report.component').then(m => m.ZReportComponent),
    data: { breadcrumb: 'Z-Report', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  },
  {
    path: 'invoice-control',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/invoice-control/invoice-control.component').then(m => m.InvoiceControlComponent),
    data: { breadcrumb: 'Invoice Control', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'audit-log',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/audit-log/audit-log.component').then(m => m.AuditLogComponent),
    data: { breadcrumb: 'Audit Log', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  },
  {
    path: 'kds',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/kds/kds.component').then(m => m.KdsComponent),
    data: { breadcrumb: 'Kitchen Display', permissions: [PERMISSIONS.Cashier.Restaurant] }
  },
  {
    path: 'customer-display',
    loadComponent: () => import('./components/customer-display/customer-display.component').then(m => m.CustomerDisplayComponent),
    data: { breadcrumb: 'Customer Display' }
  },
  {
    path: 'salla-orders',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/salla-orders/salla-orders.component').then(m => m.SallaOrdersComponent),
    data: { breadcrumb: 'Salla Orders', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'zid-settings',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-settings/zid-settings.component').then(m => m.ZidSettingsComponent),
    data: { breadcrumb: 'Zid Settings', permissions: [PERMISSIONS.SystemSetting.Read] }
  },
  {
    path: 'zid-orders',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-orders/zid-orders.component').then(m => m.ZidOrdersComponent),
    data: { breadcrumb: 'Zid Orders', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'zid-products',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-products/zid-products.component').then(m => m.ZidProductsComponent),
    data: { breadcrumb: 'Zid Product Mapping', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'zid-stock-sync',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-stock-sync/zid-stock-sync.component').then(m => m.ZidStockSyncComponent),
    data: { breadcrumb: 'Zid Stock Sync', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'zid-cashier-orders',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-cashier-orders/zid-cashier-orders.component').then(m => m.ZidCashierOrdersComponent),
    data: { breadcrumb: 'Zid Cashier Orders', permissions: [PERMISSIONS.Cashier.POS] }
  },
  {
    path: 'zid-logs',
    canActivate: [PermissionGuard],
    loadComponent: () => import('./components/zid-logs/zid-logs.component').then(m => m.ZidLogsComponent),
    data: { breadcrumb: 'Zid Sync Logs', permissions: [PERMISSIONS.Cashier.Session.Manage] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CashierRoutingModule { }
