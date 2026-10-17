import { Component, signal, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateService } from "@ngx-translate/core";
import { TranslationService } from "../../../modules/i18n";
import { TrailBalanceService } from "../../../services/accounting/trail-balance.service";
import { formatDateOnlyToString, parseDateOnly, formatDisplayDate, getSystemNow } from "../../../utils/dateUtils";
import { RootAccountService } from "../../../services/accounting/root-account.service";
import { AccountStatementService } from "../../../services/accounting/account-statement.service";
import { AccountStatementModel } from 'src/app/models/accounting/accountStatement.model';
import { AccountStatementRecordModel } from 'src/app/models/accounting/accountStatementRecord.model';
import {ActivatedRoute, Router} from '@angular/router';
import { CustomerProfileService } from '../../../services/accounting/customer-profile.service';
import { CustomerProfileModel } from 'src/app/models/accounting/customerProfile.model';
import { SupplierDetailsService } from '../../../services/inventory/supplier-details.service';
import { SupplierDetailsModel } from 'src/app/models/inventory/supplierDetails.model';
import { ProjectService } from 'src/app/projects/services/project.service';

enum Accounts {
  ROOT_ACCOUNT,
  HEADER_ACCOUNT,
  DETAIL_ACCOUNT
}
@Component({
  selector: 'app-account-statement',
  templateUrl: './account-statement.component.html',
  styleUrl: './account-statement.component.scss',
  providers: [ConfirmationService, MessageService]
})
export class AccountStatementComponent implements OnInit {

  loadingSignal = signal(false);
  selectedAccount = '';
  accountOptionsSignal = signal<any[]>([]);
  get accountOptions(): any[] {
    return this.accountOptionsSignal()
  }
  set accountOptions(options: any[]) {
    this.accountOptionsSignal.set(options);
  }
  previousDebitSignal = signal<number>(0);
  previousCreditSignal = signal<number>(0);
  hasPreviousBalanceSignal = signal<boolean>(false);
  get hasPreviousBalance(): boolean {
    return this.hasPreviousBalanceSignal()
  }
  set hasPreviousBalance(value: boolean) {
    this.hasPreviousBalanceSignal.set(value);
  }
  get previousDebit(): number {
    return this.previousDebitSignal()
  }
  set previousDebit(balance: number) {
    this.previousDebitSignal.set(balance);
  }
  get previousCredit(): number {
    return this.previousCreditSignal()
  }
  set previousCredit(balance: number) {
    this.previousCreditSignal.set(balance);
  }
  startDate;
  endDate;
  projects: any[] = [];
  projectOptions: any[] = [];
  selectedProjectId: string | null = null;

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

  accountStatementSignal = signal<AccountStatementRecordModel[]>([]);
  get accountStatement(): AccountStatementRecordModel[] {
    return this.accountStatementSignal()
  }
  set accountStatement(accountStatement: AccountStatementRecordModel[]) {
    this.accountStatementSignal.set(accountStatement);
  }

  // Search functionality
  searchTextSignal = signal<string>('');
  get searchText(): string {
    return this.searchTextSignal();
  }
  set searchText(value: string) {
    this.searchTextSignal.set(value);
  }

  fullAccountStatementSignal = signal<AccountStatementRecordModel[]>([]);
  get fullAccountStatement(): AccountStatementRecordModel[] {
    return this.fullAccountStatementSignal();
  }
  set fullAccountStatement(value: AccountStatementRecordModel[]) {
    this.fullAccountStatementSignal.set(value);
  }

  // Sort functionality
  sortOrderSignal = signal<string>('desc');
  get sortOrder(): string {
    return this.sortOrderSignal();
  }
  set sortOrder(value: string) {
    this.sortOrderSignal.set(value);
  }

  sortOptions: any[] = [];

  filterAccountStatement() {
    let filtered = this.fullAccountStatement;

    // Apply search filter
    if (this.searchText && this.searchText.trim() !== '') {
      const searchLower = this.searchText.toLowerCase().trim();
      filtered = filtered.filter(item => {
        // Skip "Previous Balance" row from search
        if (this.hasPreviousBalance && item.transactionNumber === ' ') {
          return true;
        }

        return (
          item.transactionNumber?.toLowerCase().includes(searchLower) ||
          item.transactionDate?.toString().includes(searchLower) ||
          item.debitAmount?.toString().includes(searchLower) ||
          item.creditAmount?.toString().includes(searchLower) ||
          item.balance?.toString().includes(searchLower) ||
          item.transactionTypeArabicName?.toLowerCase().includes(searchLower) ||
          item.transactionTypeEnglishName?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sort
    this.applySorting(filtered);
  }

  applySorting(data: AccountStatementRecordModel[]) {
    const previousBalanceRow = this.hasPreviousBalance ? data[0] : null;
    let dataToSort = this.hasPreviousBalance ? data.slice(1) : [...data];

    dataToSort.sort((a, b) => {
      const dateA = new Date(a.transactionDate);
      const dateB = new Date(b.transactionDate);
      
      if (this.sortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    });

    if (previousBalanceRow) {
      this.accountStatement = [previousBalanceRow, ...dataToSort];
    } else {
      this.accountStatement = dataToSort;
    }
  }

  onSortChange() {
    this.filterAccountStatement();
  }

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  customersOnly = false;
  suppliersOnly = false;

  loadAccountOptions() {
    this.rootAccountService.getAll().subscribe({
      next: res => {
        if (res.length === 0) {
          this.loading = false;
          return;
        }

        const accountsOptions = [];
        for (let rootAccount of res) {
          for (let headerAccount of rootAccount.headerAccounts) {
            for (let detailAccount of headerAccount.detailAccounts) {
              for (let mainAccount of detailAccount.mainAccounts) {
                accountsOptions.push({
                  label: `${mainAccount.referenceCode} | ${this.activeLanguage === 'ar' ? mainAccount.arabicName : mainAccount.englishName}`,
                  value: mainAccount.id
                });
              }
            }
          }
        }
        this.accountOptions = accountsOptions;
        this.loading = false;

        console.log(this.selectedAccount)
        if(this.selectedAccount)
          this.handleSubmit();

      },
      error: error => {
        console.log('Error Loading Accounts', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });
  }


  handleSubmit() {
    // التحقق من صحة التواريخ
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
    this.accountStatement = [];
    this.accountStatementService.getAccountStatement(startDate, endDate, this.selectedAccount, this.isFrontal, this.selectedProjectId || undefined).subscribe({
      next: res => {
        if (res === null) {
          this.loading = false;
          return;
        }
        console.log('Account Statement', res);
        if (res.previousDebit !== 0 || res.previousCredit !== 0) {
          const previousStatement = new AccountStatementRecordModel({
            isTransactionPost1: false,
            transactionNumber: ' ',
            transactionDate: this.activeLanguage === 'ar' ? "الرصيد السابق" : 'Previous Balance',
            debitAmount: res.previousDebit,
            creditAmount: res.previousCredit,
            balance: res.previousDebit - res.previousCredit,
            description: this.activeLanguage === 'ar' ? "الرصيد السابق" : 'Previous Balance',
            transactionTypeEnglishName: "",
            transactionTypeArabicName: ""
          });
          const accountStatement = res.accountStatementRecords.map(item => {
            item.balance += res.previousDebit - res.previousCredit;
            return item;
          });
          this.fullAccountStatement = [previousStatement, ...accountStatement];
          this.hasPreviousBalance = true;
        } else {
          this.fullAccountStatement = res.accountStatementRecords;
          this.hasPreviousBalance = false;
        }

        this.searchText = '';
        this.filterAccountStatement(); // Apply initial sort
        this.cdr.detectChanges();
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

    this.loading = false;
  }


  calculateTotalCredit() {
    let total = 0;
    this.accountStatement.forEach(item => {
      total += item.creditAmount;
    });
    return total;
  }

  calculateTotalDebit() {
    let total = 0;
    this.accountStatement.forEach(item => {
      total += item.debitAmount;
    });
    return total;
  }

  // Share functionality
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

  ngOnInit(): void {
    // Initialize sort options with translations
    this.sortOptions = [
      { label: this.translate.instant('FINANCE.SORT_OLDEST_FIRST'), value: 'asc' },
      { label: this.translate.instant('FINANCE.SORT_NEWEST_FIRST'), value: 'desc' }
    ];

    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });

    // Set default dates first
    const currentYear = getSystemNow().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);

    this.route.paramMap.subscribe(params => {
      this.selectedAccount = params.get('id').toLowerCase();
    });

    // Load projects list
    this.projectService.getAll().subscribe({
      next: (res) => {
        this.projects = res.data || [];
        this.projectOptions = this.projects.map(p => ({
          label: p.projectName,
          value: p.id
        }));
      }
    });

    // Check for query params (dates/projectId passed from other pages)
    this.route.queryParamMap.subscribe(queryParams => {
      const startDateParam = queryParams.get('startDate');
      const endDateParam = queryParams.get('endDate');
      const projectIdParam = queryParams.get('projectId');
      
      if (projectIdParam) {
        this.selectedProjectId = projectIdParam;
      }
      
      if (startDateParam && endDateParam) {
        try {
          // Parse dates from query params
          const parsedStartDate = parseDateOnly(startDateParam);
          const parsedEndDate = parseDateOnly(endDateParam);
          
          // Only override if parsing was successful
          if (parsedStartDate && parsedEndDate && !isNaN(parsedStartDate.getTime()) && !isNaN(parsedEndDate.getTime())) {
            this.startDate = parsedStartDate;
            this.endDate = parsedEndDate;
          }
        } catch (error) {
          console.warn('Failed to parse date params, using defaults:', error);
        }
      }
    });

    this.route.data.subscribe(data => {
      this.customersOnly = !!data['customersOnly'];
      this.suppliersOnly = !!data['suppliersOnly'];

      if (this.customersOnly) {
        this.loadCustomerAccountOptions();
      } else if (this.suppliersOnly) {
        this.loadSupplierAccountOptions();
      } else {
        this.loadAccountOptions();
      }
    });
  }

  openShareDialog() {
    if (!this.selectedAccount || !this.startDate || !this.endDate || this.accountStatement.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار حساب وتواريخ وعرض البيانات أولاً',
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
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.accountStatementService
      .shareAccountStatementByEmail(startDate, endDate, this.selectedAccount, email, this.isFrontal, this.selectedProjectId || undefined)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم إرسال كشف الحساب عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال كشف الحساب عبر البريد الإلكتروني.',
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
        summary: 'تحذير',
        detail: 'برجاء إدخال رقم جوال صحيح (8-15 رقم).',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    const phone = phoneRaw.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '');

    this.accountStatementService
      .shareAccountStatementByWhatsapp(startDate, endDate, this.selectedAccount, phone, this.isFrontal, this.selectedProjectId || undefined)
      .subscribe({
        next: (res) => {
          const links = this.extractWhatsAppLinks(res);
          if (links && links.length > 0) {
            this.openWhatsAppLink(links[0]);
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم فتح رابط واتساب للمشاركة.',
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'تحذير',
              detail: 'لم يتم العثور على رابط واتساب.',
            });
          }
        },
        error: (err) => {
          console.error('WhatsApp share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال كشف الحساب عبر واتساب.',
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
    if (!this.selectedAccount || !this.startDate || !this.endDate || this.accountStatement.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار حساب وتواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.accountStatementService.printDocument(startDate, endDate, this.selectedAccount, this.isFrontal, this.selectedProjectId || undefined);
  }

  downloadDocument() {
    if (!this.selectedAccount || !this.startDate || !this.endDate || this.accountStatement.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار حساب وتواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.accountStatementService.downloadDocument(startDate, endDate, this.selectedAccount, this.isFrontal, this.selectedProjectId || undefined);
  }

  exportToExcel() {
    if (!this.selectedAccount || !this.startDate || !this.endDate || this.accountStatement.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار حساب وتواريخ وعرض البيانات أولاً',
      });
      return;
    }

    import("xlsx").then(xlsx => {
      const workbook = xlsx.utils.book_new();
      const worksheetData: any[][] = [];

      // Get account name
      const selectedAccountOption = this.accountOptions.find(opt => opt.value === this.selectedAccount);
      const accountName = selectedAccountOption ? selectedAccountOption.label : this.selectedAccount;

      // Add header information
      worksheetData.push([`كشف حساب: ${accountName}`]);
      const startDateStr = formatDisplayDate(this.startDate);
      const endDateStr = formatDisplayDate(this.endDate);
      worksheetData.push([`من: ${startDateStr} - إلى: ${endDateStr}`]);
      worksheetData.push([]); // Empty row

      // Add table headers
      const headers = [
        'التاريخ',
        'رقم العملية',
        'مدين',
        'دائن',
        'الرصيد',
        'نوع العملية',
        'الوصف'
      ];
      worksheetData.push(headers);
      const headerRowIndex = worksheetData.length - 1;

      // Add data rows
      let runningBalance = 0;
      if (this.hasPreviousBalance && this.accountStatement.length > 0) {
        const firstRecord = this.accountStatement[0];
        runningBalance = firstRecord.balance;
      }

      this.accountStatement.forEach((record, index) => {
        // Skip the "Previous Balance" row if it's the first one and has special formatting
        if (this.hasPreviousBalance && index === 0 && record.transactionDate === "الرصيد السابق") {
          runningBalance = record.balance;
        }

        const transactionDate = this.hasPreviousBalance && index === 0 && record.transactionDate === "الرصيد السابق"
          ? record.transactionDate
          : record.transactionDate
            ? formatDisplayDate(record.transactionDate)
            : '';

        const row = [
          transactionDate,
          record.transactionNumber || '-',
          record.debitAmount > 0 ? record.debitAmount : '-',
          record.creditAmount > 0 ? record.creditAmount : '-',
          record.balance !== 0 ? record.balance : '-',
          this.activeLanguage === 'ar' ? (record.transactionTypeArabicName || '-') : (record.transactionTypeEnglishName || '-'),
          record.description || '-'
        ];
        worksheetData.push(row);
      });

      // Add totals row
      worksheetData.push([]); // Empty row
      const totalRow = [
        'الإجمالي',
        '-',
        this.calculateTotalDebit() > 0 ? this.calculateTotalDebit() : '-',
        this.calculateTotalCredit() > 0 ? this.calculateTotalCredit() : '-',
        this.accountStatement.length > 0 ? this.accountStatement[this.accountStatement.length - 1].balance : '-',
        '-',
        '-'
      ];
      worksheetData.push(totalRow);
      const totalRowIndex = worksheetData.length - 1;

      // Create worksheet
      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // التاريخ
        { wch: 12 }, // رقم العملية
        { wch: 12 }, // مدين
        { wch: 12 }, // دائن
        { wch: 12 }, // الرصيد
        { wch: 15 }, // نوع العملية
        { wch: 30 }  // الوصف
      ];

      // Set RTL direction for Arabic
      if (this.activeLanguage === 'ar') {
        worksheet['!dir'] = 'rtl';
      }

      // Style the worksheet
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');

      // Apply center alignment and borders to all cells
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });

          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { t: 's', v: '' };
          }

          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }

          worksheet[cellAddress].s.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true
          };

          // Add borders to data cells (from header row onwards)
          if (row >= headerRowIndex) {
            worksheet[cellAddress].s.border = {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            };
          }
        }
      }

      // Style header row
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: headerRowIndex, c: col });
        worksheet[cellAddress].s = {
          ...worksheet[cellAddress].s,
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: 'D3D3D3' } }
        };
      }

      // Style total row
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: totalRowIndex, c: col });
        if (worksheet[cellAddress] && worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {
            ...worksheet[cellAddress].s,
            font: { bold: true, sz: 12 },
            fill: { fgColor: { rgb: 'FFE4B5' } }
          };
        }
      }

      // Style title rows
      const titleCell = xlsx.utils.encode_cell({ r: 0, c: 0 });
      worksheet[titleCell].s = {
        ...worksheet[titleCell].s,
        font: { bold: true, sz: 14 }
      };

      const dateCell = xlsx.utils.encode_cell({ r: 1, c: 0 });
      worksheet[dateCell].s = {
        ...worksheet[dateCell].s,
        font: { bold: true, sz: 11 }
      };

      // Apply number formatting to numeric columns (Debit, Credit, Balance)
      for (let row = headerRowIndex + 1; row < totalRowIndex; row++) {
        [2, 3, 4].forEach(col => { // Columns: Debit (2), Credit (3), Balance (4)
          if (col <= range.e.c) {
            const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellAddress] && worksheet[cellAddress].v !== '-' && typeof worksheet[cellAddress].v === 'number') {
              if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
              worksheet[cellAddress].s.numFmt = '#,##0.00';
            }
          }
        });
      }

      // Format totals row numbers
      [2, 3, 4].forEach(col => {
        if (col <= range.e.c) {
          const cellAddress = xlsx.utils.encode_cell({ r: totalRowIndex, c: col });
          if (worksheet[cellAddress] && worksheet[cellAddress].v !== '-' && typeof worksheet[cellAddress].v === 'number') {
            if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
            worksheet[cellAddress].s.numFmt = '#,##0.00';
          }
        }
      });

      // Set row heights
      const rowHeights: any[] = [];
      worksheetData.forEach((row, index) => {
        rowHeights[index] = { hpt: 20 };
      });
      worksheet['!rows'] = rowHeights;

      // Add worksheet to workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, 'كشف حساب');

      // Generate file name
      const fileName = `كشف_حساب_${this.selectedAccount}_${startDateStr.replace(/\//g, '-')}_${endDateStr.replace(/\//g, '-')}.xlsx`;

      // Save file
      xlsx.writeFile(workbook, fileName);

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'نجح',
        detail: 'تم تصدير الملف بنجاح'
      });
    }).catch(error => {
      console.error('Error exporting Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'حدث خطأ أثناء تصدير الملف'
      });
    });
  }

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private trailBalanceService: TrailBalanceService,
    private rootAccountService: RootAccountService,
    private accountStatementService: AccountStatementService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private customerProfileService: CustomerProfileService,
    private supplierDetailsService: SupplierDetailsService,
    private projectService: ProjectService
  ) {
    this.translate = translateService;
    this.isFrontal = this.router.url.includes('frontal');
    this.activeLanguage = translationService.getSelectedLanguage();
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  navigateToTransactionDetails(item: AccountStatementRecordModel, index: number) {
    // Skip if it's the previous balance row (first row when hasPreviousBalance is true)
    if (this.hasPreviousBalance && index === 0) {
      return;
    }

    // Skip if no transaction ID
    if (!item.transactionId || item.transactionId.trim() === '' || item.transactionId.trim() === ' ') {
      return;
    }

    // Navigate to transaction details page using transaction ID
    const route = this.isFrontal ? '/accounting/frontal-journal-transactions/transaction' : '/accounting/journal-transactions/transaction';
    this.router.navigate([route, item.transactionId]);
  }

  loadCustomerAccountOptions() {
    this.loading = true;
    this.customerProfileService.getAll().subscribe({
      next: (customers: CustomerProfileModel[]) => {
        const accountsOptions = customers
          .filter(c => c.mainAccountId)
          .map(c => ({
            label: `${this.activeLanguage === 'ar' ? c.arabicName : c.englishName}`,
            value: c.mainAccountId
          }));
        this.accountOptions = accountsOptions;
        this.loading = false;

        if (this.selectedAccount) {
          this.handleSubmit();
        }
      },
      error: error => {
        console.log('Error Loading Customer Accounts', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });
  }

  loadSupplierAccountOptions() {
    this.loading = true;
    this.supplierDetailsService.getAll().subscribe({
      next: (suppliers: SupplierDetailsModel[]) => {
        const accountsOptions = suppliers
          .filter(s => s.mainAccountId)
          .map(s => ({
            label: `${this.activeLanguage === 'ar' ? s.arabicName : s.englishName}`,
            value: s.mainAccountId
          }));
        this.accountOptions = accountsOptions;
        this.loading = false;

        if (this.selectedAccount) {
          this.handleSubmit();
        }
      },
      error: error => {
        console.log('Error Loading Supplier Accounts', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });
        this.loading = false;
      }
    });
  }

}
