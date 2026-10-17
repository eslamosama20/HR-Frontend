import { Component, signal , OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';

import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import {ConfirmationService, MenuItem, MenuItemCommandEvent, MessageService} from 'primeng/api';
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {TrailBalanceService} from "../../../services/accounting/trail-balance.service";
import {formatDateOnlyToString, parseDateOnly} from "../../../utils/dateUtils";

enum Accounts {
  ROOT_ACCOUNT,
  HEADER_ACCOUNT,
  DETAIL_ACCOUNT
}

interface ProfitLossTotals {
  totalPreviousCredit: number,
  totalPreviousDebit: number,
  totalPeriodCredit: number,
  totalPeriodDebit: number,
  totalBalance: number
}
@Component({
  selector: 'app-budget-assessment',
  templateUrl: './budget-assessment.component.html',
  styleUrl: './budget-assessment.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class BudgetAssessmentComponent implements OnInit {
  items: MenuItem[] | undefined;

  loadingSignal = signal(false);

  profitLossTotalsSignal = signal<ProfitLossTotals>(
    {
      totalPreviousCredit: 0,
      totalPreviousDebit: 0,
      totalPeriodCredit: 0,
      totalPeriodDebit: 0,
      totalBalance: 0,
    }
  );
  get profitLossTotals(){
    return this.profitLossTotalsSignal()
  }
  set profitLossTotals(value:ProfitLossTotals){
    this.profitLossTotalsSignal.set(value)
  }

  previousShownSignal = signal(false);
  get previousShown(){
    return this.previousShownSignal()
  }
  set previousShown(value:boolean){
    this.previousShownSignal.set(value)
  }
  periodShownSignal = signal(false);
  get periodShown(){
    return this.periodShownSignal()
  }
  set periodShown(value:boolean){
    this.periodShownSignal.set(value)
  }

  startDate: Date;
  endDate: Date;

  trailBalanceDataSignal = signal<any[]>([]);
  get trailBalanceData(): any[] {
    return this.trailBalanceDataSignal();
  }

  set trailBalanceData(value: any[]) {
    this.trailBalanceDataSignal.set(value);
  }
  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  userPermissionsSignal = signal<PermissionModel[]>([]);

  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }

  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }



  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;

  constructor(
              private authService: AuthService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private trailBalanceService: TrailBalanceService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.items = [
      { label: this.translate.instant('FINANCE.ALL_LEVELS'),
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { label: this.translate.instant('FINANCE.FIRST_LEVEL'),
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { label: this.translate.instant('FINANCE.SECOND_LEVEL'),
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { label: this.translate.instant('FINANCE.THIRD_LEVEL'),
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { label: this.translate.instant('FINANCE.FOURTH_LEVEL'),
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
    ]

    this.activeTab = this.items[0]
  }


  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);

  }


  loadData() {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      console.log('Date validation failed:', { startDate: this.startDate, endDate: this.endDate });
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية'
      });
      return;
    }
    this.loading = true;
    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.trailBalanceService.getTrailBalance(startDate, endDate).subscribe({
      next: res => {
        if (res.length === 0) {
          this.loading = false;
          return;
        }
        this.trailBalanceData = res.filter(d=>d.accountNumber == '1' || d.accountNumber == '2')
        const profitLossAccounts = res.filter(d=>d.accountNumber !== '1' && d.accountNumber !== '2')
        const profitLossTotals = profitLossAccounts.reduce((acc, curr) => {
          acc.totalPreviousCredit += curr.previousCredit;
          acc.totalPreviousDebit += curr.previousDebit;
          acc.totalPeriodCredit += curr.periodCredit;
          acc.totalPeriodDebit += curr.periodDebit;
          acc.totalBalance += curr.balance;
          return acc;
        }, {
          totalPreviousCredit: 0,
          totalPreviousDebit: 0,
          totalPeriodCredit: 0,
          totalPeriodDebit: 0,
          totalBalance: 0
        })
        this.profitLossTotals = profitLossTotals;
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading Data', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  get calculateTotalBalance() {
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.balance;
      });
    }
    return total + this.profitLossTotals.totalBalance;
  }

  get totalPreviousDebit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.previousDebit
      });
    }
    return total + this.profitLossTotals.totalPreviousDebit;
  }
  get totalPreviousCredit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.previousCredit
      });
    }
    return total + this.profitLossTotals.totalPreviousCredit;
  }
  get totalPeriodDebit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.periodDebit
      });
    }
    return total + this.profitLossTotals.totalPeriodDebit;
  }
  get totalPeriodCredit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.periodCredit
      });
    }
    return total + this.profitLossTotals.totalPeriodCredit;
  }

  activeTabSignal = signal<MenuItem>(null);
  get activeTab(){
    return this.activeTabSignal()
  }
  set activeTab(value:MenuItem){
    this.activeTabSignal.set(value);
  }

  getFilteredData(){
    const filteredData = []
    switch (this.activeTab.label) {
      case this.translate.instant('FINANCE.ALL_LEVELS'):
        this.trailBalanceData.forEach(root => {
          filteredData.push(root)
          root.headers.forEach(header => {
            filteredData.push(header)
            header.details.forEach(detail => {
              filteredData.push(detail)
              detail.mains.forEach(main => {
                filteredData.push(main)
              })
            })
          })
        })
        break;
      case this.translate.instant('FINANCE.FIRST_LEVEL'):
        this.trailBalanceData.forEach(root => {
          filteredData.push(root)
        })
        break;
      case this.translate.instant('FINANCE.SECOND_LEVEL'):
        this.trailBalanceData.forEach(root => {
          root.headers.forEach(header => {
            filteredData.push(header)
          })
        })
        break;
      case this.translate.instant('FINANCE.THIRD_LEVEL'):
        this.trailBalanceData.forEach(root => {
          root.headers.forEach(header => {
            header.details.forEach(detail => {
              filteredData.push(detail)
            })
          })
        })
        break;
      case this.translate.instant('FINANCE.FOURTH_LEVEL'):
        this.trailBalanceData.forEach(root => {
          root.headers.forEach(header => {
            header.details.forEach(detail => {
              detail.mains.forEach(main => {
                filteredData.push(main)
              })
            })
          })
        })
        break;
    }
    return filteredData
  }

  toggleShowPrevious(event: { checked: boolean }) {
    this.previousShown = event.checked;
  }

  toggleShowPeriod(event: { checked: boolean }) {
    this.periodShown = event.checked;
  }

}
