import {Component, LOCALE_ID, OnInit, signal} from '@angular/core';
import {PermissionModel} from "../../../models/auth/permission.model";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {ConfirmationService, MessageService, PrimeNGConfig} from "primeng/api";
import {AuthService} from "../../../modules/auth";
import {TranslationService} from "../../../modules/i18n";
import {UserAccountModel} from "../../../models/auth/userAccount.model";
import primengArTranslations from "../../../utils/primengArTranslations";
import {Table, TableModule} from "primeng/table";
import * as FileSaver from 'file-saver';
import {DetailAccountService} from "../../../services/accounting/detail-account.service";
import {EmploymentTypeModel} from "../../../models/hr/employment-type.model";
import {EmploymentTypeService} from "../../../services/hr/employment-type.service";
import {getTimeFromDate} from "../../../utils/getTimeFromDate";
import {getDateFromTimeString} from "../../../utils/getDateFromTimeString";


interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}
@Component({
  selector: 'app-employment-types',
  templateUrl: './employmentTypes.component.html',
  styleUrl: './employmentTypes.component.scss',
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-EG'}]
})
export class EmploymentTypesComponent implements OnInit{
  employmentTypeSignal = signal<EmploymentTypeModel[]>([]);
  get employmentTypes() {
    return this.employmentTypeSignal();
  }
  set employmentTypes(value) {
    this.employmentTypeSignal.set(value);
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

  employmentTypeDialogVisibleSignal = signal(false);
  get employmentTypeDialogVisible() {
    return this.employmentTypeDialogVisibleSignal();
  }
  set employmentTypeDialogVisible(value) {
    this.employmentTypeDialogVisibleSignal.set(value);
  }
  employmentTypeFormGroup : FormGroup;
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate : TranslateService;
  columns!: Column[];

  weeklyDayOffOptions = [
    {label: 'الاحد', value: 'Sunday'},
    {label: 'الاثنين', value: 'Monday'},
    {label: 'الثلاثاء', value: 'Tuesday'},
    {label: 'الأربعاء', value: 'Wednesday'},
    {label: 'الخميس', value: 'Thursday'},
    {label: 'الجمعة', value: 'Friday'},
    {label: 'السبت', value: 'Saturday'},
  ];

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public employmentTypeService: EmploymentTypeService,
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

    this.employmentTypeFormGroup = this.fb.group({
      id: [null],
      code: ['', Validators.required],
      description: [''],
      weeklyDayOff: [[]],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      {field: 'code', header: "المسمي الوظيفي", filter: true , filterType: 'text'},
      {field: 'description', header: "الوصف", filter: true , filterType: 'text'},
      {field: 'weeklyDayOff', header: "الاجازة الأسبوعية", filter: true , filterType: 'text'},
      {field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true , filterType: 'date'}
    ];
  }

  ngOnInit(): void {
    this.loadEmploymentTypes();
  }

  loadEmploymentTypes() {
    this.loading = true;
    this.employmentTypeService.getAll().subscribe({
      next: employmentTypes => {
        this.employmentTypes = employmentTypes.map(x => {
          x.createdAt = new Date(x.createdAt);
          return x;
        })
        this.loading = false;
      },
      error: error => {
        console.log('Error Loading EmploymentTypes', error)
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: "حدث خطأ أثناء التحميل"
        })
      }
    })
  }

  showAddEmploymentTypeDialog(employmentType: EmploymentTypeModel = null) {
    this.employmentTypeFormGroup.reset();
    if (employmentType) {
      this.employmentTypeFormGroup.controls.id.setValue(employmentType.id);
      this.employmentTypeFormGroup.controls.code.setValue(employmentType.code);
      this.employmentTypeFormGroup.controls.description.setValue(employmentType.description);
      this.employmentTypeFormGroup.controls.weeklyDayOff.setValue(employmentType.weeklyDayOffValues);
    }
    this.employmentTypeDialogVisible = true;
  }

  closeEmploymentTypeDialog() {
    this.employmentTypeDialogVisible = false;
    this.employmentTypeFormGroup.reset();
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
    dt1.filterGlobal(target.value, 'contains')
  }

  saveEmploymentType() {
    if (this.employmentTypeFormGroup.invalid) {
      return;
    }
    const employmentTypeValues = this.employmentTypeFormGroup.value;
    if (employmentTypeValues.id) {
      console.log('updating employmentType', employmentTypeValues)
      const employmentType = new EmploymentTypeModel();
      employmentType.id = employmentTypeValues.id;
      employmentType.code = employmentTypeValues.code;
      employmentType.description = employmentTypeValues.description;
      employmentType.weeklyDayOff = employmentTypeValues.weeklyDayOff ? employmentTypeValues.weeklyDayOff.join(',') : null;
      this.employmentTypeService.update(employmentType).subscribe({
        next: res => {
          this.closeEmploymentTypeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: "تم التعديل بنجاح" });
          this.loadEmploymentTypes();
        },
        error: error => {
          console.log('Error Saving EmploymentType', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء التعديل" });
          this.closeEmploymentTypeDialog();
        }
      });
    }else{
      const employmentType = new EmploymentTypeModel();
      employmentType.code = employmentTypeValues.code;
      employmentType.description = employmentTypeValues.description;
      employmentType.weeklyDayOff = employmentTypeValues.weeklyDayOff ? employmentTypeValues.weeklyDayOff.join(',') : null;
      this.employmentTypeService.create(employmentType).subscribe({
        next: res => {
          console.log('EmploymentType Saved', res);
          this.closeEmploymentTypeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الإنشاء بنجاح" });
          this.loadEmploymentTypes();
        },
        error: error => {
          console.log('Error Saving EmploymentType', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الإنشاء" });
          this.closeEmploymentTypeDialog();
        }
      });
    }
  }

  deleteEmploymentType(employmentType: EmploymentTypeModel) {
    this.employmentTypeService.delete(employmentType.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: "تم الحذف بنجاح" });
        this.loadEmploymentTypes();
      },
      error: error => {
        console.log('Error Deleting EmploymentType', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: "حدث خطأ أثناء الحذف" });
      }
    });
  }

  confirmEmploymentTypeDeletion(event: Event , employmentType: EmploymentTypeModel) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: `هل تريد حذف الوظيفة "${employmentType.code}" ؟`,
        header: "حذف الوظيفة",
        icon: 'pi pi-info-circle',
        acceptButtonStyleClass:"p-button-danger p-button-text rounded-md ",
        rejectButtonStyleClass:"p-button-text p-button-text rounded-md ",
        acceptIcon:"none",
        rejectIcon:"none",
        acceptLabel : this.translate.instant('FINANCE.YES'),
        rejectLabel : this.translate.instant('FINANCE.NO'),
        accept: () => {
            this.deleteEmploymentType(employmentType);
        },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.employmentTypes.map(y => {
        const row = {};
        this.columns.forEach(x => {
          if (x.filterType === 'date') {
            // @ts-ignore
            row[x.detail] = new Date(y[x.field]).toLocaleString(
              'ar-EG-u-ca-gregory',
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
      this.saveAsExcelFile(excelBuffer, 'EmploymentTypes');
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


}
