import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { FinancePeriodsService } from './../../services/Finance Periods/FinancePeriods.service';
import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PermissionModel } from 'src/app/models/auth/permission.model';
import { FinancePeriodsModel } from 'src/app/models/FinancePeriods/FinancePeriods.model';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import primengArTranslations from "src/app//utils/primengArTranslations";
import { Table, TableModule } from 'primeng/table';
import * as FileSaver from 'file-saver';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { OverlayPanel } from 'primeng/overlaypanel';
import { ViewChild } from '@angular/core';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";


interface Column {
    field: string;
    header: string;
    filter?: boolean;
    filterType?: string;
  }

  @Component({
    selector: 'app-finance-periods',
    standalone:true,
      imports: [TableModule, ButtonModule, InputTextModule, DialogModule, CommonModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, TranslateModule, PaginatorModule, OverlayPanelModule, CustomDatePipe],
    templateUrl: './FinancePeriods.component.html',
    styleUrls: ['./FinancePeriods.component.scss'],
    providers: [ConfirmationService, MessageService]
  })
  export class FinanceperiodsComponent implements OnInit{

    financePeriodsSignal = signal<FinancePeriodsModel[]>([]);
    get financePeriods() {
      return this.financePeriodsSignal();
    }
    set financePeriods(value) {
      this.financePeriodsSignal.set(value);
    }
    loading: boolean = true;
    searchValueSignal = signal('');
    get searchValue() {
      return this.searchValueSignal();
    }
    set searchValue(value) {
      this.searchValueSignal.set(value);
    }
    userPermissionsSignal = signal<PermissionModel[]>([]);
    get userPermissions(): PermissionModel[] {
      return this.userPermissionsSignal()
    }
    set userPermissions(permissions: PermissionModel[]) {
      this.userPermissionsSignal.set(permissions);
    }

    financePeriodsSignalVisibleSignal = signal(false);
    get financePeriodsDialogVisible() {
      return this.financePeriodsSignalVisibleSignal();
    }
    set financePeriodsDialogVisible(value) {
      this.financePeriodsSignalVisibleSignal.set(value);
    }
    financePeriodsFormGroup : FormGroup;
    public activeLanguage: string = 'en';
    theme = localStorage.getItem('kt_theme_mode_value') || 'light';
    public translate : TranslateService;
    columns!: Column[];

    constructor(
      private primengConfig: PrimeNGConfig,
      private fb: FormBuilder,
      private authService: AuthService,
      private confirmationService: ConfirmationService,
      private messageService: MessageService,
      private translateService: TranslateService,
      public translationService: TranslationService,
      public financePeriodsService: FinancePeriodsService,
    ) {
      this.translate = translateService;
      this.activeLanguage = translationService.getSelectedLanguage();

      this.authService.getUserByToken().subscribe(
        (res : UserAccountModel) => {
          if (res) {
            this.userPermissions= res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
              .reduce((acc, val) => acc.concat(val), []);
          }
        }
      );

      this.financePeriodsFormGroup = this.fb.group({
        id: [null],
        arabicName: ['', Validators.required],
        englishName: ['', Validators.required],

      });

      if (this.activeLanguage === 'ar') {
        this.primengConfig.setTranslation(primengArTranslations);
      }

      this.columns = [
        {field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true , filterType: 'text'},
        {field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true , filterType: 'text'},
        { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
      ];
    }

    ngOnInit(): void {
      this.loadFinancePeriods();

    }

    loadFinancePeriods() {
      this.loading = true;
      this.financePeriodsService.getAll().subscribe({
        next: financePeriods => {
          this.financePeriods = financePeriods.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          })
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Finance Periods', error)
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.FINANCE_PERIOD_LOADING_ERROR')
          })
          this.loading=false
        }
      })
    }

    showAddFinancePeriodsDialog(financePeriods: FinancePeriodsModel = null) {
      if (this.opCustomerProfile?.overlayVisible) {
        this.opCustomerProfile.hide();
      }
      this.financePeriodsFormGroup.reset();
      if (financePeriods) {
        this.financePeriodsFormGroup.controls.id.setValue(financePeriods.id);
        this.financePeriodsFormGroup.controls.arabicName.setValue(financePeriods.arabicName);
        this.financePeriodsFormGroup.controls.englishName.setValue(financePeriods.englishName);

      }
      this.financePeriodsDialogVisible = true;
    }

    closeFinancePeriodsDialog() {
      this.financePeriodsDialogVisible = false;
      this.financePeriodsFormGroup.reset();
    }

    public hasPermission(permission : string): boolean {
      return this.userPermissions.some(x => x.name === permission)
    }

    clear(table: Table) {
      table.clear();
      this.searchValue = ''
    }

    filter(dt1: Table, event: Event) {
      const target = event.target as HTMLInputElement;
      dt1.filterGlobal(target.value.trim(), 'contains')
    }

    saveFinancePeriods() {
      console.log('finance Periods', this.financePeriodsFormGroup.value)
      if (this.financePeriodsFormGroup.invalid) {
        return;
      }
      const financePeriodsValues = this.financePeriodsFormGroup.value;
      if (financePeriodsValues.id) {
        console.log('updating finance Periods', financePeriodsValues)
        const financePeriods = new FinancePeriodsModel();
        financePeriods.id = financePeriodsValues.id;
        financePeriods.arabicName = financePeriodsValues.arabicName;
        financePeriods.englishName = financePeriodsValues.englishName;

        this.financePeriodsService.update(financePeriods).subscribe({
          next: res => {
            this.closeFinancePeriodsDialog();
            this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_UPDATED') });
            this.loadFinancePeriods();
          },
          error: error => {
            console.log('Error Saving Finance Periods', error);
            this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_SAVING_ERROR') });
            this.closeFinancePeriodsDialog();
          }
        });
      }else{
        const financePeriods = new FinancePeriodsModel();
        financePeriods.arabicName = financePeriodsValues.arabicName;
        financePeriods.englishName = financePeriodsValues.englishName;
        this.financePeriodsService.create(financePeriods).subscribe({
          next: res => {
            console.log('Finance Periods Saved', res);
            this.closeFinancePeriodsDialog();
            this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_CREATED') });
            this.loadFinancePeriods();
          },
          error: error => {
            console.log('Error Saving Finance Periods', error);
            this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_SAVING_ERROR') });
            this.closeFinancePeriodsDialog();
          }
        });
      }
    }

    deleteFinancePeriods(financePeriods: FinancePeriodsModel) {
      this.financePeriodsService.delete(financePeriods.id).subscribe({
        next: res => {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_DELETED') });
          this.loadFinancePeriods();
        },
        error: error => {
          console.log('Error Deleting Finance Periods', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.FINANCE_PERIOD_DELETING_ERROR') });
        }
      });
    }

    confirmFinancePeriodsDeletion(event: Event , financePeriods: FinancePeriodsModel) {
      if (this.opCustomerProfile?.overlayVisible) {
        this.opCustomerProfile.hide();
      }
      this.confirmationService.confirm({
          target: event.target as EventTarget,
          message: this.translate.instant('FINANCE.CONFIRM_FINANCE_PERIOD_DELETE', {financePeriodsName: financePeriods.arabicName}),
          header: this.translate.instant('FINANCE.FINANCE_PERIOD_DELETE_CONFIRMATION'),
          icon: 'pi pi-info-circle',
          acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
          rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
          acceptIcon:"none",
          rejectIcon:"none",
          acceptLabel : this.translate.instant('FINANCE.YES'),
          rejectLabel : this.translate.instant('FINANCE.NO'),
          accept: () => {
              this.deleteFinancePeriods(financePeriods);
          },
      });
    }

    exportExcel() {
      import("xlsx").then(xlsx => {
        const data = this.financePeriods.map(y => {
          const row = {};
          this.columns.forEach(x => {
            if (x.filterType === 'date') {
              // @ts-ignore
              row[x.detail] = new Date(y[x.field]).toLocaleString(
                'ar-SA-u-ca-gregory',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );
            } else {
              // @ts-ignore
              row[x.detail] = y[x.field];
            }
          });
          return row;
        });
        console.log(data);
        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, 'FinancePeriods');
      });
    }
    saveAsExcelFile(buffer: any, fileName: string): void {
      let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      let EXCEL_EXTENSION = '.xlsx';
      const data: Blob = new Blob([buffer], {
        type: EXCEL_TYPE
      });
      FileSaver.saveAs(data, fileName + '_export_' + new Date().toLocaleTimeString() + EXCEL_EXTENSION);
    }
    selectedFinancePeriod: FinancePeriodsModel | null = null;
    @ViewChild('opCustomerProfile') opCustomerProfile: OverlayPanel;

    toggleCogOverlay(event: Event, financePeriods: FinancePeriodsModel) {
      event.stopPropagation();
      const isVisible = this.opCustomerProfile?.overlayVisible;
      const isDifferent = this.selectedFinancePeriod?.id !== financePeriods.id;
      this.selectedFinancePeriod = financePeriods;

      if (isVisible && isDifferent) {
        this.opCustomerProfile.hide();
        setTimeout(() => {
          this.opCustomerProfile.show(event, event.currentTarget as HTMLElement);
        }, 50);
      } else {
        this.opCustomerProfile.toggle(event, event.currentTarget as HTMLElement);
      }
    }

    openOverlay(event: MouseEvent, financePeriods: FinancePeriodsModel) {
      event.preventDefault();
      event.stopPropagation();
      this.selectedFinancePeriod = financePeriods;
      this.opCustomerProfile.show(event);

      setTimeout(() => {
        const panelEl = this.opCustomerProfile?.container as HTMLElement;
        if (panelEl) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const panelRect = panelEl.getBoundingClientRect();

          let left = event.clientX;
          let top = event.clientY;

          // Prevent overflowing the right edge
          if (left + panelRect.width > viewportWidth) {
            left = viewportWidth - panelRect.width - 15;
          }
          // Prevent overflowing the left edge
          if (left < 15) {
            left = 15;
          }

          // Prevent overflowing the bottom edge
          if (top + panelRect.height > viewportHeight) {
            top = viewportHeight - panelRect.height - 15;
          }
          // Prevent overflowing the top edge
          if (top < 15) {
            top = 15;
          }

          panelEl.style.position = 'fixed';
          panelEl.style.left = `${left}px`;
          panelEl.style.top = `${top}px`;
          panelEl.style.transform = 'none';
          panelEl.style.margin = '0';
          panelEl.style.zIndex = '99999';
        }
      }, 0);
    }
  }
