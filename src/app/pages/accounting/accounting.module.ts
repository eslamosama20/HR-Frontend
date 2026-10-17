import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';

import { AccountingComponent } from './accounting.component';
import { AccountsComponent } from './accounts/accounts.component';
import { RouterModule } from '@angular/router';
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TranslateModule } from "@ngx-translate/core";
import { DropdownModule } from "primeng/dropdown";
import { MultiSelectModule } from "primeng/multiselect";
import { ProgressBarModule } from "primeng/progressbar";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { TagModule } from "primeng/tag";
import { JournalTransactionsComponent } from "./journal/journal-transactions/journal-transactions.component";
import { PaginatorModule } from "primeng/paginator";
import { InputNumberModule } from "primeng/inputnumber";
import { MenuModule } from "primeng/menu";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { JournalEntriesComponent } from "./journal/journal-entries/journal-entries.component";
import { CalendarModule } from "primeng/calendar";
import { CustomerProfileComponent } from "./profiles/customer-profile/customer-profile.component";
import { AddCustomerProfileComponent } from "./profiles/customer-profile/add-customer-profile.component";
import {
    FontAwesomeIconPickerComponent
} from "../../shared-components/font-awesome-icon-picker/font-awesome-icon-picker.component";
import { DividerModule } from "primeng/divider";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { TransactionComponent } from "./journal/journal-transactions/transaction/transaction.component";
import { PanelModule } from "primeng/panel";
import {
    TransactionEntriesEditableTableComponent
} from "./journal/journal-transactions/transaction/transaction-entries-editable-table/transaction-entries-editable-table.component";
import { ReviewBalanceComponent } from "./review-balance/review-balance.component";
import { InputSwitchModule } from 'primeng/inputswitch';
import { AccountStatementComponent } from "./account-statement/account-statement.component";
import { SummaryAccountStatementComponent } from "./summary-account-statement/summary-account-statement.component";
import { AbsoluteValuePipe } from "../../pipes/absolute-value.pipe";
import { PrintDocumentComponent } from "../../shared-components/print-document/print-document.component";
import { TabMenuModule } from "primeng/tabmenu";
import { TabViewModule } from "primeng/tabview";
import { ProfitLossAccountComponent } from "./profit-loss-account/profit-loss-account.component";
import { BudgetAssessmentComponent } from "./budget-assessment/budget-assessment.component";
import { FileUploadModule } from "primeng/fileupload";
import { CustomDatePipe } from "../../pipes/custom-date.pipe";
import { BackButtonComponent } from '../../shared-components/back-button/back-button.component';
import { DetailActionsMenuComponent } from '../../shared-components/detail-actions-menu/detail-actions-menu.component';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { TableColumnFilterComponent } from 'src/app/shared-components/table-column-filter/table-column-filter.component';
import { StickyHorizontalScrollDirective } from 'src/app/shared-components/directives/sticky-horizontal-scroll.directive';
import { PermissionGuard } from '../../guards/permission.guard';
import { PERMISSIONS } from '../../config/permissions';

@NgModule({
    declarations: [
        AccountingComponent,
        AccountsComponent,
        JournalTransactionsComponent,
        JournalEntriesComponent,
        CustomerProfileComponent,
        AddCustomerProfileComponent,
        TransactionComponent,
        TransactionEntriesEditableTableComponent,
        ReviewBalanceComponent,
        AccountStatementComponent,
        SummaryAccountStatementComponent,
        ProfitLossAccountComponent,
        BudgetAssessmentComponent
    ],
    imports: [
        PrintDocumentComponent,
        FileUploadModule,
        MenuModule,
        FontAwesomeModule,
        DividerModule,
        CommonModule,
        ReactiveFormsModule,
        TreeModule,
        ButtonModule,
        DialogModule,
        InputTextModule,
        CardModule,
        ConfirmDialogModule,
        TagModule,
        ToastModule,
        TableModule,
        DropdownModule,
        MultiSelectModule,
        ProgressBarModule,
        ProgressSpinnerModule,
        InputNumberModule,
        TranslateModule,
        FormsModule,
        PaginatorModule,
        OverlayPanelModule,
        CalendarModule,
        PanelModule,
        InputSwitchModule,
        AbsoluteValuePipe,
        NgOptimizedImage,
        TabMenuModule,
        TabViewModule,
        CheckboxModule,
        TooltipModule,
        TableColumnFilterComponent,
        StickyHorizontalScrollDirective,
        RouterModule.forChild([
            {
                path: '',
                component: AccountingComponent,
                children: [
                    {
                        path: 'accounts',
                        component: AccountsComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.Account.Read] }
                    },
                    {
                        path: 'journal-transactions',
                        component: JournalTransactionsComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.Transaction.Read] }
                    },
                    {
                        path: 'journal-transactions/transaction',
                        component: TransactionComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.Transaction.Create] }
                    },
                    {
                        path: 'journal-transactions/transaction/:id',
                        component: TransactionComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.Transaction.Read, PERMISSIONS.Transaction.Update] }
                    },

                    {
                        path: 'frontal-journal-transactions',
                        component: JournalTransactionsComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalTransaction.Read] }
                    },
                    {
                        path: 'frontal-journal-transactions/transaction',
                        component: TransactionComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalTransaction.Create] }
                    },
                    {
                        path: 'frontal-journal-transactions/transaction/:id',
                        component: TransactionComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalTransaction.Read, PERMISSIONS.FrontalTransaction.Update] }
                    },

                    {
                        path: 'journal-entries',
                        component: JournalEntriesComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.Transaction.Read] }
                    },
                    {
                        path: 'customer-profile/new',
                        component: AddCustomerProfileComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.CustomerProfile.Create] }
                    },
                    {
                        path: 'customer-profile',
                        component: CustomerProfileComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.CustomerProfile.Read] }
                    },
                    {
                        path: 'frontal-customer-profile',
                        component: CustomerProfileComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalCustomerProfile.Read] }
                    },
                    {
                        path: 'customer-profile/:id',
                        component: CustomerProfileComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.CustomerProfile.Read, PERMISSIONS.CustomerProfile.Update] }
                    },
                    {
                        path: 'review-balance',
                        component: ReviewBalanceComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.ReviewBalance.Read] }
                    },
                    {
                        path: 'profit-loss-account',
                        component: ProfitLossAccountComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.ProfitLossAccount.Read] }
                    },
                    {
                        path: 'budget-assessment',
                        component: BudgetAssessmentComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.BudgetAssessment.Read] }
                    },
                    {
                        path: 'account-statement',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.AccountStatement.Read] }
                    },
                    {
                        path: 'frontal-account-statement',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalAccountStatement.Read] }
                    },
                    {
                        path: 'account-statement/:id',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.AccountStatement.Read] }
                    },
                    {
                        path: 'summary-account-statement',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.AccountStatement.Read] }
                    },
                    {
                        path: 'frontal-summary-account-statement',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.FrontalAccountStatement.Read] }
                    },
                    {
                        path: 'summary-account-statement/:id',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { permissions: [PERMISSIONS.AccountStatement.Read] }
                    },
                    {
                        path: 'customer-account-statement',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { customersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.CustomerProfile.Read] }
                    },
                    {
                        path: 'customer-account-statement/:id',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { customersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.CustomerProfile.Read] }
                    },
                    {
                        path: 'supplier-account-statement',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { suppliersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.SupplierDetails.Read] }
                    },
                    {
                        path: 'supplier-account-statement/:id',
                        component: AccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { suppliersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.SupplierDetails.Read] }
                    },
                    {
                        path: 'customer-summary-account-statement',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { customersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.CustomerProfile.Read] }
                    },
                    {
                        path: 'customer-summary-account-statement/:id',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { customersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.CustomerProfile.Read] }
                    },
                    {
                        path: 'supplier-summary-account-statement',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { suppliersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.SupplierDetails.Read] }
                    },
                    {
                        path: 'supplier-summary-account-statement/:id',
                        component: SummaryAccountStatementComponent,
                        canActivate: [PermissionGuard],
                        data: { suppliersOnly: true, permissions: [PERMISSIONS.AccountStatement.Read, PERMISSIONS.SupplierDetails.Read] }
                    }
                ]
            },
            {
                path: '**',
                redirectTo: 'error/404',
            }
        ]),
        FontAwesomeIconPickerComponent,
        CustomDatePipe,
        BackButtonComponent,
        DetailActionsMenuComponent,
    ],
})
export class AccountingModule { }
