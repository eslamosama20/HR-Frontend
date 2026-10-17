import { Component, signal , OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import {ConfirmationService, MenuItem, MenuItemCommandEvent, MessageService} from 'primeng/api';
import {TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {TrailBalanceService} from "../../../services/accounting/trail-balance.service";
import {formatDateOnlyToString, formatDisplayDate} from "../../../utils/dateUtils";
import * as FileSaver from 'file-saver';

enum Accounts {
  ROOT_ACCOUNT,
  HEADER_ACCOUNT,
  DETAIL_ACCOUNT
}
@Component({
  selector: 'app-review-balance',
  templateUrl: './review-balance.component.html',
  styleUrl: './review-balance.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class ReviewBalanceComponent implements OnInit {
  items: MenuItem[] | undefined;

  loadingSignal = signal(false);

  dateRange: Date[] = [];

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

  // Share functionality
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

  constructor(
              private authService: AuthService,
              private messageService: MessageService,
              private translateService: TranslateService,
              public translationService: TranslationService,
              private trailBalanceService: TrailBalanceService,
              private fb: FormBuilder
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
      { 
        label: this.translate.instant('FINANCE.ALL_LEVELS'),
        value: 'All',
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { 
        label: this.translate.instant('FINANCE.FIRST_LEVEL'),
        value: 'First',
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { 
        label: this.translate.instant('FINANCE.SECOND_LEVEL'),
        value: 'Second',
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { 
        label: this.translate.instant('FINANCE.THIRD_LEVEL'),
        value: 'Third',
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
      { 
        label: this.translate.instant('FINANCE.FOURTH_LEVEL'),
        value: 'Fourth',
        command: (event: MenuItemCommandEvent) => {
          this.activeTab = event.item;
        },
      },
    ]

    this.activeTab = this.items[0]
  }


  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.dateRange = [new Date(currentYear, 0, 1), new Date(currentYear, 11, 31)];

    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }


  loadData() {
    this.loading = true;
    const startDate = formatDateOnlyToString(this.dateRange[0]);
    const endDate = formatDateOnlyToString(this.dateRange[1]);
    this.trailBalanceService.getTrailBalance(startDate, endDate).subscribe({
      next: res => {
        if (res.length === 0) {
          this.loading = false;
          return;
        }
        console.log(res);
        this.trailBalanceData = res;
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
    return total;
  }

  get totalPreviousDebit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.previousDebit
      });
    }
    return total;
  }
  get totalPreviousCredit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.previousCredit
      });
    }
    return total;
  }
  get totalPeriodDebit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.periodDebit
      });
    }
    return total;
  }
  get totalPeriodCredit(){
    let total = 0;
    if (this.trailBalanceData.length > 0) {
      this.trailBalanceData.forEach(root => {
        total += root.periodCredit
      });
    }
    return total;
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

  private formatNumber(value: number): string {
    if (value === 0) return '-';
    return value.toFixed(2);
  }
  
  private formatBalance(value: number): string {
    if (value === 0) return '-';
    if (value > 0) return value.toFixed(2);
    return '(' + Math.abs(value).toFixed(2) + ')';
  }

  openShareDialog() {
    if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1] || this.getFilteredData().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }
    this.shareForm.reset();
    this.shareActiveTabIndex = 0;
    this.shareDialogVisible = true;
  }

  closeShareDialog() {
    this.shareDialogVisible = false;
    this.shareForm.reset();
  }

  submitShareEmail() {
    const email = (this.shareForm.get('email')?.value || '').trim();
    if (!email || this.shareForm.get('email')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.dateRange[0]);
    const endDate = formatDateOnlyToString(this.dateRange[1]);
    const level = this.activeTab.value;

    this.trailBalanceService
      .shareTrialBalanceByEmail(startDate, endDate, level, email)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('FINANCE.SUCCESS'),
            detail: 'تم إرسال ميزان المراجعة عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: err?.error?.message || 'فشل إرسال ميزان المراجعة عبر البريد الإلكتروني.',
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        },
      });
  }

  submitShareWhatsApp() {
    const phoneRaw = (this.shareForm.get('whatsappNumber')?.value || '').trim();
    if (!phoneRaw || this.shareForm.get('whatsappNumber')?.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء إدخال رقم جوال صحيح (8-15 رقم).',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.dateRange[0]);
    const endDate = formatDateOnlyToString(this.dateRange[1]);
    const level = this.activeTab.value;
    const phone = phoneRaw.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '');

    this.trailBalanceService
      .shareTrialBalanceByWhatsapp(startDate, endDate, level, phone)
      .subscribe({
        next: (res) => {
          const links = this.extractWhatsAppLinks(res);
          if (links && links.length > 0) {
            this.openWhatsAppLink(links[0]);
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('FINANCE.SUCCESS'),
              detail: 'تم فتح رابط واتساب للمشاركة.',
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.instant('FINANCE.WARNING'),
              detail: 'لم يتم العثور على رابط واتساب.',
            });
          }
        },
        error: (err) => {
          console.error('WhatsApp share error', err);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: err?.error?.message || 'فشل إرسال ميزان المراجعة عبر واتساب.',
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        },
      });
  }

  private extractWhatsAppLinks(res: any): string[] {
    if (res?.response?.whatsAppLink) {
      return [res.response.whatsAppLink];
    }
    if (res?.whatsAppLink) {
      return [res.whatsAppLink];
    }
    return [];
  }

  private openWhatsAppLink(url: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  printDocument() {
    if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1] || this.getFilteredData().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.dateRange[0]);
    const endDate = formatDateOnlyToString(this.dateRange[1]);
    const level = this.activeTab.value;
    this.trailBalanceService.printDocument(startDate, endDate, level);
  }

  downloadDocument() {
    if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1] || this.getFilteredData().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.dateRange[0]);
    const endDate = formatDateOnlyToString(this.dateRange[1]);
    const level = this.activeTab.value;
    this.trailBalanceService.downloadDocument(startDate, endDate, level);
  }

  exportToExcel() {
    if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1] || this.getFilteredData().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    import('xlsx').then((xlsx) => {
      const data = this.prepareExcelData();
      const worksheet = xlsx.utils.json_to_sheet(data);
      
      // Set column widths
      const columnWidths = [
        { wch: 15 },  // Account Number
        { wch: 30 },  // Account Name
        { wch: 15 },  // Previous Debit
        { wch: 15 },  // Previous Credit
        { wch: 15 },  // Period Debit
        { wch: 15 },  // Period Credit
        { wch: 15 }   // Balance
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'ميزان المراجعة': worksheet }, 
        SheetNames: ['ميزان المراجعة'] 
      };
      const excelBuffer: any = xlsx.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      this.saveAsExcelFile(excelBuffer, 'TrailBalance');
    });
  }

  private prepareExcelData(): any[] {
    const data: any[] = [];
    const filteredData = this.getFilteredData();

    filteredData.forEach(account => {
      const row = {
        'رقم الحساب': account.accountNumber || '',
        'اسم الحساب': account.accountName || '',
        'السابق مدين': this.formatNumber(account.previousDebit),
        'السابق دائن': this.formatNumber(account.previousCredit),
        'الفترة مدين': this.formatNumber(account.periodDebit),
        'الفترة دائن': this.formatNumber(account.periodCredit),
        'الرصيد': this.formatBalance(account.balance)
      };
      data.push(row);
    });

    // Add totals row
    const totalsRow = {
      'رقم الحساب': '',
      'اسم الحساب': 'الإجمالي',
      'السابق مدين': this.formatNumber(this.totalPreviousDebit),
      'السابق دائن': this.formatNumber(this.totalPreviousCredit),
      'الفترة مدين': this.formatNumber(this.totalPeriodDebit),
      'الفترة دائن': this.formatNumber(this.totalPeriodCredit),
      'الرصيد': this.formatBalance(this.calculateTotalBalance)
    };
    data.push(totalsRow);

    return data;
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    const dateStr = formatDisplayDate(new Date()).replace(/\//g, '-');
    FileSaver.saveAs(data, `${fileName}_${dateStr}${EXCEL_EXTENSION}`);
  }

}
