import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit, signal, ViewChild } from '@angular/core';
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
import { RoomTypeModel } from 'src/app/models/accounting/room-type-model';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { OnDestroy } from '@angular/core';
import { PERMISSIONS } from 'src/app/config/permissions';

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

@Component({
  selector: 'app-room-type',
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

  templateUrl: './room-type.component.html',
  styleUrl: './room-type.component.scss'
})
export class RoomTypeComponent implements OnInit, OnDestroy {
  readonly PERMISSIONS = PERMISSIONS;
  showRoomTypeView(entry: any) {
    if (this.opRoomTypePanel?.overlayVisible) {
      this.opRoomTypePanel.hide();
      return;
    }
    this.showAddRoomTypeDialog(entry);
  }
  roomTypesSignal = signal<RoomTypeModel[]>([]);
  get roomTypes() {
    return this.roomTypesSignal();
  }
  set roomTypes(value) {
    this.roomTypesSignal.set(value);
  }
  loading: boolean = true;
  searchValueSignal = signal('');
  get searchValue() {
    return this.searchValueSignal();
  }
  set searchValue(value) {
    this.searchValueSignal.set(value);
  }
  totalRecords: number = 0;
  pageSize: number = 10;
  searchSubject = new Subject<string>();
  useServerSearch = true;
  private searchSub: any;
  userPermissionsSignal = signal<PermissionModel[]>([]);
  get userPermissions(): PermissionModel[] {
    return this.userPermissionsSignal()
  }
  set userPermissions(permissions: PermissionModel[]) {
    this.userPermissionsSignal.set(permissions);
  }

  roomTypeVisibleDialogSignal = signal(false);
  get roomTypeVisibleDialogVisible() {
    return this.roomTypeVisibleDialogSignal();
  }
  set roomTypeVisibleDialogVisible(value) {
    this.roomTypeVisibleDialogSignal.set(value);
  }
  roomTypeFormGroup: FormGroup;
  @ViewChild('roomTypeFileUploader') roomTypeFileUploader!: FileUpload;
  isFileUploadingSignal = signal(false);
  get isFileUploading(){ return this.isFileUploadingSignal(); }
  set isFileUploading(v:boolean){ this.isFileUploadingSignal.set(v); }
  
  // For multiple images
  uploadedImagesSignal = signal<string[]>([]);
  get uploadedImages() { return this.uploadedImagesSignal(); }
  set uploadedImages(value: string[]) { this.uploadedImagesSignal.set(value); }
  
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

  constructor(
    private primengConfig: PrimeNGConfig,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    public roomTypeService: RoomTypeService,
    public detailAccountService: DetailAccountService,
    private router: Router,
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

    this.roomTypeFormGroup = this.fb.group({
      id: [null],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      personNo: [1, [Validators.required, Validators.min(1)]],
      isFrontal: [this.isFrontal],
      logo: ['']
    });

    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = [
      { field: 'logo', header: this.translate.instant('FINANCE.LOGO'), filter: false },
      { field: 'arabicName', header: this.translate.instant('FINANCE.ARABIC_NAME'), filter: true, filterType: 'text' },
      { field: 'englishName', header: this.translate.instant('FINANCE.ENGLISH_NAME'), filter: true, filterType: 'text' },
      { field: 'personNo', header: this.translate.instant('FINANCE.PERSON_NO'), filter: true, filterType: 'number' },
      { field: 'createdAt', header: this.translate.instant('FINANCE.CREATED_AT'), filter: true, filterType: 'date' }
    ];
  }

  ngOnInit(): void {
    if (this.useServerSearch && !this.isFrontal) {
      this.loadRoomTypeLazy({ first: 0, rows: this.pageSize });
    } else {
      this.loadRoomType();
    }

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
          return this.roomTypeService.searchPaged(query, page, size, sortField, sortOrder);
        })
      ).subscribe({
        next: response => {
          this.roomTypes = (response.data || []).map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          });
          this.totalRecords = response.totalCount ?? 0;
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
            detail: this.translate.instant('FINANCE.ROOM_TYPES_LOADING_ERROR')
          });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadRoomType() {
    this.loading = true;
    if (this.isFrontal) {
      this.roomTypeService.getAllFrontal().subscribe({
        next: roomTypes => {
          this.roomTypes = roomTypes.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          })
          this.loading = false;
        },
        error: error => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء تحميل أنواع الغرف الأمامية'
          });
        }
      })
    } else {
      this.roomTypeService.getAll().subscribe({
        next: roomTypes => {
          this.roomTypes = roomTypes.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          })
          this.loading = false;
        },
        error: error => {
          this.loading = false;

          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOM_TYPES_LOADING_ERROR')
          });
        }
      })
    }
  }

  loadRoomTypeLazy(event: any) {
    if (!this.useServerSearch || this.isFrontal) return;

    this.loading = true;
    const page = Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1;
    const size = event.rows || this.pageSize;
    const searchQuery = event.filters?.['global']?.value || this.searchValue || '';
    const sortField = event.sortField || 'createdAt';
    const sortOrder = event.sortOrder ?? -1;

    this.roomTypeService.searchPaged(searchQuery, page, size, sortField, sortOrder).subscribe({
      next: response => {
      this.roomTypes = (response.data || []).map(x => {
        x.createdAt = new Date(x.createdAt);
        return x;
      });
        this.totalRecords = response.totalCount ?? 0;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('FINANCE.ERROR'),
          detail: this.translate.instant('FINANCE.ROOM_TYPES_LOADING_ERROR')
        });
      }
    });
  }

  showAddRoomTypeDialog(roomType: RoomTypeModel = null) {
    this.roomTypeFormGroup.reset();
    this.uploadedImages = []; // Clear images

    const applyRoomType = (roomTypeData: RoomTypeModel) => {
      this.roomTypeFormGroup.controls.id.setValue(roomTypeData.id);
      this.roomTypeFormGroup.controls.arabicName.setValue(roomTypeData.arabicName);
      this.roomTypeFormGroup.controls.englishName.setValue(roomTypeData.englishName);
      this.roomTypeFormGroup.controls.personNo.setValue(roomTypeData.personNo);
      this.roomTypeFormGroup.controls.isFrontal.setValue(roomTypeData.isFrontal || this.isFrontal);
      this.roomTypeFormGroup.controls.logo.setValue(roomTypeData.logoUrl || '');

      // Load existing images
      if (roomTypeData.imageUrls) {
        try {
          const imagesArray = JSON.parse(roomTypeData.imageUrls);
          this.uploadedImages = Array.isArray(imagesArray) ? imagesArray : [];
        } catch (e) {
          console.error('Error parsing images JSON', e);
        }
      }

      this.roomTypeVisibleDialogVisible = true;
    };

    if (roomType?.id) {
      this.roomTypeService.getById(roomType.id).subscribe({
        next: fullRoomType => applyRoomType(fullRoomType ?? roomType),
        error: () => applyRoomType(roomType),
      });
    } else {
      this.roomTypeFormGroup.controls.isFrontal.setValue(this.isFrontal);
      this.roomTypeVisibleDialogVisible = true;
    }
  }

  closeRoomTypeDialog() {
    this.roomTypeVisibleDialogVisible = false;
    this.roomTypeFormGroup.reset();
    this.uploadedImages = []; // Clear images
    if(this.roomTypeFileUploader){ this.roomTypeFileUploader.clear(); }
    this.isFileUploading = false;
  }

  public hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission) || (this.userPermissions && this.userPermissions.some(x => x.name === permission));
  }

  clear(table: Table) {
    table.clear();
    this.searchValue = '';
    if (this.useServerSearch && !this.isFrontal) {
      this.totalRecords = 0;
      this.loadRoomTypeLazy({ first: 0, rows: this.pageSize });
    }
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    if (this.useServerSearch) {
      this.searchSubject.next(target.value.trim());
    } else {
      dt1.filterGlobal(target.value, 'contains');
    }
  }

  saveExpesnseCenter() {
    if (this.roomTypeFormGroup.invalid) {
      return;
    }
    const roomTypeValues = this.roomTypeFormGroup.value;
    
    // Prepare cloudinary image URLs JSON
    const imagesJson = this.uploadedImages.length > 0 
      ? JSON.stringify(this.uploadedImages)
      : null;
    
    if (roomTypeValues.id) {
      const roomType = new RoomTypeModel();
      roomType.id = roomTypeValues.id;
      roomType.arabicName = roomTypeValues.arabicName;
      roomType.englishName = roomTypeValues.englishName;
      roomType.personNo = roomTypeValues.personNo;
      roomType.isFrontal = roomTypeValues.isFrontal;
      roomType.logoUrl = roomTypeValues.logo || null;
      roomType.imageUrls = imagesJson;
      
      this.roomTypeService.update(roomType).subscribe({
        next: res => {
          this.closeRoomTypeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.SUCCESS'), detail: this.translate.instant('FINANCE.ROOM_TYPE_UPDATED') });
          this.loadRoomType();
        },
        error: error => {
          console.log('Error Saving Customer Profile', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ROOM_TYPE_SAVING_ERROR') });
          this.closeRoomTypeDialog();
        }
      });
    } else {
      const roomType = new RoomTypeModel();
      roomType.arabicName = roomTypeValues.arabicName;
      roomType.englishName = roomTypeValues.englishName;
      roomType.personNo = roomTypeValues.personNo;
      roomType.isFrontal = roomTypeValues.isFrontal;
      roomType.logoUrl = roomTypeValues.logo || null;
      roomType.imageUrls = imagesJson;
      
      this.roomTypeService.create(roomType).subscribe({
        next: res => {
          this.closeRoomTypeDialog();
          this.messageService.add({ severity: 'success', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.ROOM_TYPE_CREATED') });
          this.loadRoomType();
        },
        error: error => {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ROOM_TYPE_SAVING_ERROR') });
          this.closeRoomTypeDialog();
        }
      });
    }
  }

  deleteRoomType(roomType: RoomTypeModel) {
    this.roomTypeService.delete(roomType.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('FINANCE.CONFIRMED'), detail: this.translate.instant('FINANCE.ROOM_TYPE_DELETED') });
        this.loadRoomType();
      },
      error: error => {
        console.log('Error Deleting Room Type', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('FINANCE.ERROR'), detail: this.translate.instant('FINANCE.ROOM_TYPE_SAVING_ERROR') });
      }
    });
  }

  confirmRoomTypeDeletion(event: Event, roomType: RoomTypeModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('FINANCE.CONFIRM_ROOM_TYPE_PROFILE_DELETE', { roomTypeName: roomType.arabicName }),
      header: this.translate.instant('FINANCE.ROOM_TYPE_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('FINANCE.YES'),
      rejectLabel: this.translate.instant('FINANCE.NO'),
      accept: () => {
        this.deleteRoomType(roomType);
      },
    });
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
      const data = this.roomTypes.map(y => {
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

  sendToFrontal(roomType: RoomTypeModel) {
    this.roomTypeService.makeFrontal(roomType.id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: 'تم إرسال نوع الغرفة إلى الفرونتال بنجاح'
        });
        this.loadRoomType();
      },
      error: (error) => {
        console.log('Error sending room type to frontal', error);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء إرسال نوع الغرفة إلى الفرونتال'
        });
      }
    });
  }
  @ViewChild('opRoomTypePanel') opRoomTypePanel!: OverlayPanel;
  selectedRoomTypeForOverlay: any | null = null;

  showRoomTypeOverlay(event: MouseEvent, roomType: any) {
    event.preventDefault();
    event.stopPropagation();

    const isVisible = this.opRoomTypePanel?.overlayVisible;
    const isDifferent = this.selectedRoomTypeForOverlay?.id !== roomType.id;

    this.selectedRoomTypeForOverlay = roomType;

    if (isVisible && isDifferent) {
      this.opRoomTypePanel.show(event);
    } else {
      this.opRoomTypePanel.toggle(event);
    }

    setTimeout(() => {
      const panel = this.opRoomTypePanel?.container as HTMLElement;
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

  onRoomTypeFileSelected(event:any){
    this.isFileUploading = true;
    const file = event.files?.[0];
    if(!file){ this.isFileUploading = false; return; }
    if(!file.type.startsWith('image/')){
      this.messageService.add({severity:'error', summary:'Error', detail:'Unsupported file type. Please choose an image.'});
      this.isFileUploading = false; return;
    }
    const roomTypeId = this.roomTypeFormGroup.controls.id.value;
    const uploadRequest = roomTypeId
      ? this.roomTypeService.uploadLogo(roomTypeId, file)
      : this.roomTypeService.uploadLogoTemp(file);

    uploadRequest.subscribe({
      next: ({ url }) => {
        this.roomTypeFormGroup.controls.logo.setValue(url);
        this.isFileUploading = false;
        this.messageService.add({severity:'success', summary:'Success', detail:'Image uploaded successfully.'});
        if(this.roomTypeFileUploader) this.roomTypeFileUploader.clear();
      },
      error: () => {
        this.isFileUploading = false;
        this.messageService.add({severity:'error', summary:'Error', detail:'Failed uploading file.'});
      }
    });
  }

  // Handle multiple images upload
  onRoomImagesSelected(event: any) {
    const files = event.files as File[] | undefined;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const invalidFile = fileList.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'en' ? 'Warning' : 'تحذير',
        detail: this.activeLanguage === 'en'
          ? `File ${invalidFile.name} is not an image`
          : `الملف ${invalidFile.name} ليس صورة`
      });
      return;
    }

    const roomTypeId = this.roomTypeFormGroup.controls.id.value;
    const uploadRequest = roomTypeId
      ? this.roomTypeService.uploadImages(roomTypeId, fileList)
      : this.roomTypeService.uploadImagesTemp(fileList);

    uploadRequest.subscribe({
      next: ({ imageUrls }) => {
        this.uploadedImages = imageUrls ?? [];
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'en' ? 'Success' : 'نجح',
          detail: this.activeLanguage === 'en'
            ? 'Images uploaded successfully'
            : 'تم رفع الصور بنجاح'
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'en' ? 'Error' : 'خطأ',
          detail: this.activeLanguage === 'en'
            ? 'Failed uploading images'
            : 'فشل في رفع الصور'
        });
      }
    });
  }

  // Remove image from uploaded images array
  removeImage(index: number) {
    this.uploadedImages = this.uploadedImages.filter((_, i) => i !== index);
    this.messageService.add({
      severity: 'info',
      summary: this.activeLanguage === 'en' ? 'Removed' : 'تم الحذف',
      detail: this.activeLanguage === 'en' ? 'Image removed' : 'تم حذف الصورة'
    });
  }
}
