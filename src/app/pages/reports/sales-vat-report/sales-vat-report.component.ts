import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ResponseStatusCode } from 'src/app/enums/servers';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { BaseResponse } from 'src/app/models/base-response';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { SalesInvoiceService } from 'src/app/services/salesInvoice/sales-invoice.service';
import { formatDateOnlyToString, getSystemNow } from 'src/app/utils/dateUtils';
import { PdfUtilsService } from 'src/app/services/pdf-utils.service';
import { CustomDatePipe } from "../../../pipes/custom-date.pipe";

interface VATItemDetails {
  referenceCode: string;
  itemArabicName: string;
  itemEnglishName: string;
  quantity: number;
  price: number;
  vatAmount: number;
  isTaxExempted: boolean;
}

interface SalesVATDetails {
  invoiceId: number;
  invoiceNo: string;
  supplierId: string;
  suppilerArabicName: string;
  suppilerEnglishName: string;
  mainAccountId: string;
  issueDate: Date;
  isTaxExempted: boolean;
  itemDetails: VATItemDetails[];
}

@Component({
  selector: 'app-sales-vat-report',
  standalone: true,
  templateUrl: './sales-vat-report.component.html',
  styleUrl: './sales-vat-report.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CardModule,
    ToastModule,
    TableModule,
    TranslateModule,
    FormsModule,
    CalendarModule,
    PanelModule,
    TabViewModule,
    CustomDatePipe
  ],
  providers: [ConfirmationService, MessageService]
})
export class SalesVATReportComponent implements OnInit {
  loadingSignal = signal(false);
  dateRange: Date[] = [];
  startDate;
  endDate;
  totalVAT = 0;
  isSubmitting = false;
  salesVATReport: SalesVATDetails[] = [];
  shareDialogVisible = false;
  shareActiveTabIndex = 0;
  shareForm!: FormGroup;
  shareBusy = false;

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
    private salesInvoiceService: SalesInvoiceService,
    private cdf: ChangeDetectorRef,
    private pdfUtilsService: PdfUtilsService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute
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
  }

  ngOnInit(): void {
    this.totalVAT = 0;

    const currentYear = getSystemNow().getFullYear();
    this.startDate = new Date(currentYear, 0, 1);
    this.endDate = new Date(currentYear, 11, 31);
    this.dateRange = [this.startDate, this.endDate];

    this.activatedRoute.queryParams.subscribe(params => {
      if (params['startDate']) {
        this.startDate = new Date(params['startDate']);
      }
      if (params['endDate']) {
        this.endDate = new Date(params['endDate']);
      }
      if (params['startDate'] && params['endDate']) {
        this.dateRange = [this.startDate, this.endDate];
        setTimeout(() => {
          this.handleSubmit();
        }, 100);
      }
    });

    this.shareForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      whatsappNumber: ['', [Validators.pattern(/^[0-9]{8,15}$/)]],
    });
  }

  handleSubmit() {
    this.loading = true;
    this.isSubmitting = true;
    this.totalVAT = 0;

    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
      this.startDate = this.dateRange[0];
      this.endDate = this.dateRange[1];
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.salesInvoiceService.GetSalesVATDetails(startDate, endDate).subscribe(
      (res: BaseResponse<SalesVATDetails[]>) => {
        if (res.errorCode === ResponseStatusCode.Success) {
          console.log('Sales VAT Report', res);
          this.salesVATReport = res.data;
          this.loading = false;

          this.salesVATReport.forEach(invoice => {
            invoice.itemDetails.forEach(item => {
              this.totalVAT += Number(item.vatAmount) || 0;
            });
          });

          this.cdf.detectChanges();
        }
      },
      (error) => {
        console.log('Error Loading Data', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.DATA_LOADING_ERROR')
        });

        this.loading = false;
      }
    );
  }

  exportToExcel() {
    this.loading = true;

    if (!this.salesVATReport || this.salesVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('WARNING'),
        detail: 'لا توجد بيانات للتصدير'
      });
      this.loading = false;
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.salesInvoiceService.ExportSalesVATToExcel(startDate, endDate).subscribe({
      next: (blob) => {
        const fileName = `تقرير_القيمة_المضافة_${startDate}_${endDate}.xlsx`;
        this.pdfUtilsService.downloadFile(blob, fileName);
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم تصدير التقرير بنجاح'
        });
      },
      error: (err) => {
        console.error('Export error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تصدير التقرير'
        });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  printPDF() {
    if (!this.startDate || !this.endDate || this.salesVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('FINANCE.WARNING'),
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.salesInvoiceService.printSalesVATReportDocument(startDate, endDate, this.activeLanguage);
  }

  downloadPDF() {
    if (!this.startDate || !this.endDate || this.salesVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'برجاء اختيار تواريخ وعرض البيانات أولاً',
      });
      return;
    }

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);
    this.salesInvoiceService.downloadSalesVATReportDocument(startDate, endDate, this.activeLanguage).subscribe({
      next: (blob) => {
        const fileName = `تقرير_القيمة_المضافة_${startDate}_${endDate}.pdf`;
        this.pdfUtilsService.downloadFile(blob, fileName);
      },
      error: (err) => {
        console.error('Download error', err);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل تنزيل تقرير القيمة المضافة',
        });
      },
    });
  }

  openShareDialog() {
    if (!this.startDate || !this.endDate || this.salesVATReport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'تحذير',
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
        summary: 'تحذير',
        detail: 'برجاء إدخال بريد صحيح.',
      });
      return;
    }

    this.shareBusy = true;
    this.shareForm.disable({ emitEvent: false });

    const startDate = formatDateOnlyToString(this.startDate);
    const endDate = formatDateOnlyToString(this.endDate);

    this.salesInvoiceService
      .shareSalesVATReportByEmail(startDate, endDate, email, this.activeLanguage)
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'نجح',
            detail: 'تم إرسال تقرير القيمة المضافة عبر البريد الإلكتروني بنجاح.',
          });
          this.closeShareDialog();
        },
        error: (err) => {
          console.error('Share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة عبر البريد الإلكتروني.',
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

    this.salesInvoiceService
      .shareSalesVATReportByWhatsapp(startDate, endDate, phone, this.activeLanguage)
      .subscribe({
        next: (res) => {
          // Extract WhatsApp link from response (case-insensitive)
          const whatsappLink = res?.WhatsAppLink || res?.whatsAppLink || res?.response?.WhatsAppLink || res?.response?.whatsAppLink;
          
          if (whatsappLink) {
            // Open WhatsApp link in new tab
            window.open(whatsappLink, '_blank');
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم إنشاء رابط واتساب بنجاح. سيتم فتح واتساب الآن.',
            });
            this.closeShareDialog();
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'نجح',
              detail: 'تم إرسال تقرير القيمة المضافة عبر واتساب بنجاح.',
            });
            this.closeShareDialog();
          }
        },
        error: (err) => {
          console.error('WhatsApp share error', err);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || 'فشل إرسال تقرير القيمة المضافة عبر واتساب.',
          });
        },
        complete: () => {
          this.shareBusy = false;
          this.shareForm.enable({ emitEvent: false });
        },
      });
  }
}
