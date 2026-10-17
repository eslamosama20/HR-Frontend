import { CommonModule } from '@angular/common';
import { Component, ElementRef, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import { DetailAccountService } from 'src/app/services/accounting/detail-account.service';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import * as FileSaver from 'file-saver';
import { HotelModel } from 'src/app/models/accounting/hotel-model';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { MainAccountModel } from 'src/app/models/accounting/mainAccount.model';
import { DetailAccountModel } from 'src/app/models/accounting/detailAccount.model';
import {MainAccountService} from "../../services/accounting/main-account.service";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { HotelDialogService } from 'src/app/services/hotels/hotel-dialog.service';
import { OnDestroy } from '@angular/core';
import { Subscription, forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PERMISSIONS } from 'src/app/config/permissions';
interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [
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
    InputNumberModule,
    TranslateModule,
    FormsModule,
    PaginatorModule,
    OverlayPanelModule,
  CustomDatePipe,
  FileUploadModule,
  ],
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }],

  templateUrl: './hotels.component.html',
  styleUrl: './hotels.component.scss'
})
export class HotelsComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;

  private dialogSub: Subscription;
  private searchSub: Subscription;
  totalRecords: number = 0;
  pageSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;
  showHotelView(entry: any) {
    if (this.opHotelPanel?.overlayVisible) {
      this.opHotelPanel.hide();
      return;
    }
    if (entry?.id) {
      this.showAddCustomerProfileDialog(entry);
    }
  }
  hotelsSignal = signal<any[]>([]);
  get hotels() {
    return this.hotelsSignal();
  }
  set hotels(value) {
    this.hotelsSignal.set(value);
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

  hotelDialogVisibleSignal = signal(false);
  get hotelDialogVisible() {
    return this.hotelDialogVisibleSignal();
  }
  set hotelDialogVisible(value) {
    this.hotelDialogVisibleSignal.set(value);
  }

  mainAccountOptionsSignal = signal(null);
  get mainAccountOptions() {
    return this.mainAccountOptionsSignal();
  }
  set mainAccountOptions(value) {
    this.mainAccountOptionsSignal.set(value);
  }

  selectedDetailAccountIdSignal = signal<string>(null);
  get selectedDetailAccountId(): string {
    return this.selectedDetailAccountIdSignal();
  }
  set selectedDetailAccountId(value: string) {
    this.selectedDetailAccountIdSignal.set(value);
  }

  detailAccountsSignal = signal<DetailAccountModel[]>([]);
  get detailAccounts(): DetailAccountModel[] {
    return this.detailAccountsSignal();
  }
  set detailAccounts(value: DetailAccountModel[]) {
    this.detailAccountsSignal.set(value);
  }

  get detailAccountOptions() {
    return this.detailAccounts.map((da) => ({
      value: da.id,
      label: this.activeLanguage == 'en' ? da.englishName : da.arabicName
    }));
  }

  get mainAccountOptionsFromDetail() {
    const detailAccount = this.detailAccounts.find((ha) => ha.id === this.selectedDetailAccountId);
    if (!detailAccount) return [];
    return detailAccount.mainAccounts.map((ma) => ({
      value: ma.id,
      label: this.activeLanguage == 'en' ? ma.englishName : ma.arabicName
    }));
  }

  hotelFormGroup: FormGroup;
  @ViewChild('hotelFileUploader') hotelFileUploader!: FileUpload;
  @ViewChild('importFileInput') importFileInput!: ElementRef;
  isFileUploadingSignal = signal(false);
  get isFileUploading() { return this.isFileUploadingSignal(); }
  set isFileUploading(v: boolean) { this.isFileUploadingSignal.set(v); }
  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  // Import Excel
  private importInProgress = false;
  showImportInstructionsSignal = signal(false);
  get showImportInstructions() { return this.showImportInstructionsSignal(); }
  set showImportInstructions(value: boolean) { this.showImportInstructionsSignal.set(value); }

  importInstructions = {
    title: '',
    description: '',
    headers: [] as string[],
    notes: [] as string[]
  };

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public hotelsService: HotelService,
    public detailAccountService: DetailAccountService,
    public mainAccountService: MainAccountService,
    private router: Router,
    private hotelDialogService: HotelDialogService,
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );

    this.hotelFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: [''],
      mainAccountId: [null],
      isFrontal: [this.isFrontal],
      logo: [''],
      isActive: [true],
      contactNumber: [''],
      email: ['', Validators.email],
      bankName: [''],
      bankAccountNumber: [''],
      iban: [''],
      taxNumber: [''],
      street: [''],
      district: [''],
      city: [''],
      country: [''],
      shortAddress: [''],
      buildingNumber: [''],
      postalCode: [''],
      website: [''],
      additionalContactNumber: [''],
      fax: [''],
      gaztNumber: [''],
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.importInstructions = {
      title: this.activeLanguage === 'ar' ? 'تعليمات استيراد الفنادق' : 'Hotel Import Instructions',
      description: this.activeLanguage === 'ar'
        ? 'يرجى التأكد من أن ملف Excel الخاص بك يحتوي على الأعمدة التالية. الحقل المطلوب الوحيد هو الاسم العربي.'
        : 'Please ensure your Excel file contains the following columns. The only required field is Arabic Name.',
      headers: [
        this.activeLanguage === 'ar' ? '* الاسم العربي (arabicName)' : '* Arabic Name (arabicName)',
        this.activeLanguage === 'ar' ? 'الاسم الإنجليزي (englishName)' : 'English Name (englishName)',
        this.activeLanguage === 'ar' ? 'الرقم الضريبي (taxNumber)' : 'Tax Number (taxNumber)',
        this.activeLanguage === 'ar' ? 'رقم التواصل (contactNumber)' : 'Contact Number (contactNumber)',
        this.activeLanguage === 'ar' ? 'البريد الإلكتروني (email)' : 'Email (email)',
        this.activeLanguage === 'ar' ? 'اسم البنك (bankName)' : 'Bank Name (bankName)',
        this.activeLanguage === 'ar' ? 'رقم الحساب البنكي (bankAccountNumber)' : 'Bank Account Number (bankAccountNumber)',
        this.activeLanguage === 'ar' ? 'آيبان (iban)' : 'IBAN (iban)',
        this.activeLanguage === 'ar' ? 'رقم GAZT (gaztNumber)' : 'GAZT Number (gaztNumber)',
        this.activeLanguage === 'ar' ? 'رقم التواصل الإضافي (additionalContactNumber)' : 'Additional Contact Number (additionalContactNumber)',
        this.activeLanguage === 'ar' ? 'فاكس (fax)' : 'Fax (fax)',
        this.activeLanguage === 'ar' ? 'الموقع الإلكتروني (website)' : 'Website (website)',
        this.activeLanguage === 'ar' ? 'العنوان المختصر (shortAddress)' : 'Short Address (shortAddress)',
        this.activeLanguage === 'ar' ? 'الشارع (street)' : 'Street (street)',
        this.activeLanguage === 'ar' ? 'الحي (district)' : 'District (district)',
        this.activeLanguage === 'ar' ? 'المدينة (city)' : 'City (city)',
        this.activeLanguage === 'ar' ? 'البلد (country)' : 'Country (country)',
        this.activeLanguage === 'ar' ? 'رقم المبنى (buildingNumber)' : 'Building Number (buildingNumber)',
        this.activeLanguage === 'ar' ? 'الرمز البريدي (postalCode)' : 'Postal Code (postalCode)',
      ],
      notes: [
        this.activeLanguage === 'ar'
          ? 'يمكن استخدام أسماء الأعمدة بالعربية أو الإنجليزية'
          : 'Column names can be in Arabic or English',
        this.activeLanguage === 'ar'
          ? 'الحقل المطلوب الوحيد هو الاسم العربي — باقي الحقول اختيارية'
          : 'Only Arabic Name is required — all other fields are optional',
        this.activeLanguage === 'ar'
          ? 'سيتم تحديث الفنادق الموجودة بناءً على الرقم الضريبي أو الاسم العربي'
          : 'Existing hotels will be matched by tax number first, then by Arabic name',
        this.activeLanguage === 'ar'
          ? 'سيتم إنشاء الحساب الرئيسي تلقائياً إذا لم يُحدد'
          : 'Main account will be created automatically if not specified',
        this.activeLanguage === 'ar'
          ? 'تأكد من أن الملف بتنسيق .xlsx أو .xls'
          : 'Ensure the file is in .xlsx or .xls format',
      ],
    };

    this.columns = [
      { field: 'logo', header: this.translate.instant('FINANCE.LOGO'), filter: false },
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'isConnected', header: this.translate.instant('FINANCE.IS_CONNECTED'), filter: true, filterType: 'text' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    if (this.useServerSearch && !this.isFrontal) {
      this.loadHotelsLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadHotels();
    }
    this.loadAccounts();
    this.dialogSub = this.hotelDialogService.openDialog$.subscribe(() => {
      this.showAddCustomerProfileDialog();
    });

    // Wire up debounced server-side search
    if (this.useServerSearch) {
      this.searchSub = this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          this.searchValue = query;
          this.loading = true;
          const page = 1;
          const size = this.pageSize;
          const sortField = 'createdAt';
          const sortOrder = -1;
          return this.hotelsService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.hotels = (response.data || []).map(x => ({
            ...x,
            isConnected: !!x.mainAccountId,
            createdAt: new Date(x.createdAt),
          }));
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.HOTELS_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.dialogSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  loadAccounts() {
    this.detailAccountService.getAll().subscribe({
      next: (res) => {
        this.detailAccounts = res;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.MAIN_ACCOUNTS_LOADING_ERROR') });
      }
    });
  }
  loadHotels() {
    this.loading = true;
    if (this.isFrontal) {
      this.hotelsService.getAllFrontal().subscribe({
        next: hotels => {
          this.hotels = hotels.map(x => ({
            ...x,
            isConnected: !!x.mainAccountId,
            createdAt: new Date(x.createdAt),
          }))
          this.totalRecords = this.hotels.length;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء تحميل الفنادق الأمامية'
          });
        }
      })
    } else {
      this.hotelsService.getAll().subscribe({
        next: hotels => {
          this.hotels = hotels.map(x => ({
            ...x,
            isConnected: !!x.mainAccountId,
            createdAt: new Date(x.createdAt),
          }))
          this.totalRecords = this.hotels.length;
          this.loading = false;
        },
        error: error => {
          this.loading = false;

          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.HOTELS_LOADING_ERROR')
          });
        }
      })
    }
  }

  loadHotelsLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.hotelsService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
        this.hotels = (response.data || []).map(x => ({
          ...x,
          isConnected: !!x.mainAccountId,
          createdAt: new Date(x.createdAt),
        }));
        this.totalRecords = response.totalCount ?? 0;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.HOTELS_LOADING_ERROR')
        });
      }
    });
  }

  showAddCustomerProfileDialog(hotel: HotelModel = null) {
    this.hotelFormGroup.reset();

    const applyHotel = (hotelData: HotelModel) => {
      this.hotelFormGroup.patchValue({
        id: hotelData.id,
        arabicName: hotelData.arabicName,
        englishName: hotelData.englishName,
        mainAccountId: hotelData.mainAccountId,
        isFrontal: hotelData.isFrontal ?? this.isFrontal,
        logo: hotelData.logoUrl ?? '',
  
        isActive: (hotelData as any).isActive ?? true,
        contactNumber: hotelData.contactNumber ?? '',
        email: hotelData.email ?? '',
        bankName: hotelData.bankName ?? '',
        bankAccountNumber: hotelData.bankAccountNumber ?? '',
        iban: hotelData.iban ?? '',
        taxNumber: hotelData.taxNumber ?? '',
        street: hotelData.street ?? '',
        district: hotelData.district ?? '',
        city: hotelData.city ?? '',
        country: hotelData.country ?? '',
        shortAddress: hotelData.shortAddress ?? '',
        buildingNumber: hotelData.buildingNumber ?? '',
        postalCode: hotelData.postalCode ?? '',
        website: hotelData.website ?? '',
        additionalContactNumber: hotelData.additionalContactNumber ?? '',
        fax: hotelData.fax ?? '',
        gaztNumber: hotelData.gaztNumber ?? '',
      });
      this.syncSelectedDetailAccountFromMainAccount(hotelData.mainAccountId, (hotelData as any).mainAccount?.detailAccountId);
      this.hotelDialogVisible = true;
    };

    if (hotel?.id) {
      forkJoin({
        accounts: this.detailAccountService.getAll(),
        hotel: this.hotelsService.getById(hotel.id)
      }).subscribe({
        next: ({ accounts, hotel: fullHotel }) => {
          this.detailAccounts = accounts;
          applyHotel(fullHotel ?? hotel);
        },
        error: () => applyHotel(hotel),
      });
    } else {
      this.hotelFormGroup.patchValue({
        isFrontal: this.isFrontal,
        isActive: true
      });
      this.hotelDialogVisible = true;
    }
  }
  

  closeHotelDialog() {
    this.hotelDialogVisible = false;
    this.selectedDetailAccountId = null;
    this.hotelFormGroup.reset();
    if (this.hotelFileUploader) {
      this.hotelFileUploader.clear();
    }
    this.isFileUploading = false;
  }

  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadHotelsLazy({ first: 0, rows: this.pageSize });
    }
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    if (this.useServerSearch) {
      this.searchSubject.next(target.value.trim());
    } else {
      dt1.filterGlobal(target.value.trim(), 'contains');
    }
  }

  trimSearchValue(): void {
    this.searchValue = this.searchValue.trim();
  }

  saveExpesnseCenter() {
    if (this.hotelFormGroup.invalid) return;
  
    const payload = new HotelModel({ ...this.hotelFormGroup.value });
    (payload as any).logo = null;
    payload.logoUrl = this.hotelFormGroup.controls.logo.value || null;

    const wasMainAccountEmpty = !payload.mainAccountId;
  
    if (payload.id) {
      this.hotelsService.update(payload).subscribe({
        next: () => {
          this.closeHotelDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.HOTEL_UPDATED') });
          this.loadHotels();
        },
        error: (error) => {
          console.log('Error Saving Hotel', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.HOTEL_SAVING_ERROR') });
          this.closeHotelDialog();
        }
      });
    } else {
      this.hotelsService.create(payload).subscribe({
        next: () => {
          this.closeHotelDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.HOTEL_CREATED') });
          if (wasMainAccountEmpty) {
            this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.MAIN_ACCOUNT_AUTO_CREATED', { accountName: payload.arabicName }) });
          }
          this.loadHotels();
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.HOTEL_SAVING_ERROR') });
          this.closeHotelDialog();
        }
      });
    }
  }
  
  onHotelFileSelected(event: any) {
    this.isFileUploading = true;
    const file = event.files?.[0];
    if (!file) { this.isFileUploading = false; return; }
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unsupported file type. Please choose an image.' });
      this.isFileUploading = false; return;
    }
    const hotelId = this.hotelFormGroup.controls.id.value;
    const uploadRequest = hotelId
      ? this.hotelsService.uploadLogo(hotelId, file)
      : this.hotelsService.uploadLogoTemp(file);

    uploadRequest.subscribe({
      next: ({ url }) => {
        this.hotelFormGroup.controls.logo.setValue(url);
        this.isFileUploading = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Image uploaded successfully.' });
        if (this.hotelFileUploader) this.hotelFileUploader.clear();
      },
      error: () => {
        this.isFileUploading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed uploading file.' });
      }
    });
  }

  deleteHotel(hotel: HotelModel) {
    this.hotelsService.delete(hotel.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.HOTEL_DELETED') });
        this.loadHotels();
      },
      error: error => {
        console.log('Error Deleting Hotel', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.HOTEL_DELETING_ERROR') });
      }
    });
  }

  confirmHotelDeletion(event: Event, hotel: HotelModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_HOTEL_PROFILE_DELETE', { hotelName: hotel.arabicName }),
      header: this.translate.instant('FINANCE.HOTEL_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteHotel(hotel);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.hotels.map(y => {
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

  sendToFrontal(hotel: HotelModel) {
    this.hotelsService.makeFrontal(hotel.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال الفندق إلى الفرونتال بنجاح'
        });
        this.loadHotels();
      },
      error: (error) => {
        console.log('Error sending hotel to frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء إرسال الفندق إلى الفرونتال'
        });
      }
    });
  }
  // ──────────── Import Excel methods ────────────

  showImportInstructionsDialog() {
    this.showImportInstructions = true;
  }

  confirmImportInstructions() {
    this.showImportInstructions = false;
    if (this.importFileInput?.nativeElement) {
      this.importFileInput.nativeElement.click();
    }
  }

  downloadTemplate() {
    this.hotelsService.downloadTemplate().subscribe({
      next: (blob) => FileSaver.saveAs(blob, 'hotels_import_template.xlsx'),
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('COMMON.IMPORT_ERROR_TRANSACTION_FAILED'),
        });
      },
    });
  }

  cancelImportInstructions() {
    this.showImportInstructions = false;
  }

  onImportFileSelect(event: any): void {
    if (this.importInProgress) return;
    const file: File = event?.target?.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('FINANCE.ERROR'),
        detail: this.translate.instant('FINANCE.INVALID_HEADER'),
      });
      if (this.importFileInput?.nativeElement) { this.importFileInput.nativeElement.value = ''; }
      return;
    }

    this.importInProgress = true;
    this.hotelsService.importFromExcel(file).subscribe({
      next: (res) => {
        this.importInProgress = false;
        if (this.importFileInput?.nativeElement) { this.importFileInput.nativeElement.value = ''; }
        this.loadHotels();
        const detailParts = [
          `${this.activeLanguage === 'ar' ? 'مستورد' : 'Imported'}: ${res.imported}`,
          `${this.activeLanguage === 'ar' ? 'محدث' : 'Updated'}: ${res.updated}`,
        ];
        if (res.failed?.length) {
          detailParts.push(`${this.activeLanguage === 'ar' ? 'فشل' : 'Failed'}: ${res.failed.length}`);
        }
        this.messageService.add({
          severity: res.failed?.length ? 'warn' : 'success',
          summary: res.failed?.length ? this.translate.instant('FINANCE.ERROR') : this.translate.instant('FINANCE.SUCCESS'),
          detail: detailParts.join(' — '),
          life: 6000,
        });
      },
      error: (err) => {
        this.importInProgress = false;
        if (this.importFileInput?.nativeElement) { this.importFileInput.nativeElement.value = ''; }
        console.error('Import failed', err);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.activeLanguage === 'ar' ? 'فشل الاستيراد، يرجى المحاولة مرة أخرى' : 'Import failed, please try again.',
        });
      },
    });
  }

  // ──────────── End Import Excel methods ────────────

  private syncSelectedDetailAccountFromMainAccount(mainAccountId?: string, fallbackDetailAccountId?: string): void {
    if (!mainAccountId) return;
    if (fallbackDetailAccountId) {
      this.selectedDetailAccountId = fallbackDetailAccountId;
      return;
    }
    const linkedMainAccount = this.findMainAccountById(mainAccountId);
    if (linkedMainAccount?.detailAccountId) {
      this.selectedDetailAccountId = linkedMainAccount.detailAccountId;
    }
  }

  private findMainAccountById(mainAccountId?: string): MainAccountModel | null {
    if (!mainAccountId || !this.detailAccounts?.length) return null;
    for (const detailAccount of this.detailAccounts) {
      const account = detailAccount.mainAccounts?.find(ma => ma.id === mainAccountId);
      if (account) return account;
    }
    return null;
  }

  @ViewChild('opHotelPanel') opHotelPanel!: OverlayPanel;
  selectedHotelForOverlay: any = null;

  showHotelOverlay(event: MouseEvent, hotel: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opHotelPanel?.overlayVisible;
    const isDifferent = this.selectedHotelForOverlay?.id !== hotel.id;

    this.selectedHotelForOverlay = hotel;

    if (isVisible && isDifferent) {
      this.opHotelPanel.show(event);
    } else {
      this.opHotelPanel.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opHotelPanel?.container as HTMLElement;
      if (!panel) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelRect = panel.getBoundingClientRect();

      let left = event.clientX;
      let top = event.clientY;

      if (left + panelRect.width > viewportWidth) left = viewportWidth - panelRect.width - 10;
      if (top + panelRect.height > viewportHeight) top = viewportHeight - panelRect.height - 10;

      panel.style.position = 'fixed';
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.zIndex = '9999';
    });
  }
}
