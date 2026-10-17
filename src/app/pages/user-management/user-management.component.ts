import { Table } from "primeng/table";
import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ConfirmationService, MessageService, PrimeNGConfig } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/inputswitch';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TreeModule } from 'primeng/tree';
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { MultiSelectModule } from "primeng/multiselect";
import { ProgressBarModule } from "primeng/progressbar";
import { TagModule } from "primeng/tag";
import { InputNumberModule } from "primeng/inputnumber";
import { CardModule } from 'primeng/card';
import { PermissionModel } from 'src/app/models/auth/permission.model';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { AuthService } from 'src/app/modules/auth';
import { TranslationService } from 'src/app/modules/i18n';
import primengArTranslations from 'src/app/utils/primengArTranslations';
import { UserManagementService } from 'src/app/services/user-management/user-management.service';
import { UserRoleModel } from "src/app/models/auth/userRole.model";
import { RoleService } from "src/app/services/authorization/role.service";
import { RoleModel } from "src/app/models/auth/role.model";
import { AuthorizationService } from "src/app/services/authorization/authorization.service";
import { RouterLink, Router } from "@angular/router";
import { CustomDatePipe } from "../../pipes/custom-date.pipe";
import { OverlayPanel } from "primeng/overlaypanel";
import { StickyHorizontalScrollDirective } from "src/app/shared-components/directives/sticky-horizontal-scroll.directive";

export function minLengthTrimmed(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value.length === 0) {
      return null;
    }
    if (typeof value === 'string' && value.trim().length < minLength) {
      return { 'minlength': { requiredLength: minLength, actualLength: value.trim().length } };
    }
    return null;
  };
}

export function complexPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }

    const errors: ValidationErrors = {};

    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
    const hasWhitespace = /\s/.test(value);

    if (!hasMinLength) {
      errors['requireMinLength'] = true;
    }
    if (!hasUpperCase) {
      errors['requireUppercase'] = true;
    }
    if (!hasLowerCase) {
      errors['requireLowercase'] = true;
    }
    if (!hasNumeric) {
      errors['requireNumeric'] = true;
    }
    if (!hasSpecialChar) {
      errors['requireSpecialChar'] = true;
    }
    if (hasWhitespace) {
      errors['hasWhitespace'] = true;
    }

    if (Object.keys(errors).length > 0) {
      errors['complexPassword'] = true;
      return errors;
    }

    return null;
  };
}

interface Column {
  field: string;
  header: string;
  filter?: boolean;
  filterType?: string;
}

import { PasswordModule } from "primeng/password";
import { TooltipModule } from "primeng/tooltip";

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TreeModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputSwitchModule,
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
    RouterLink,
    CustomDatePipe,
    StickyHorizontalScrollDirective,
    PasswordModule,
    TooltipModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  providers: [ConfirmationService, MessageService, { provide: LOCALE_ID, useValue: 'ar-SA' }]

})
export class UserManagementComponent {
  currentUser: UserAccountModel;
  userForm: FormGroup;
  usersSignal = signal<UserAccountModel[]>([]);
  userRolesSignal = signal<UserRoleModel[]>([]);
  selectedUserSignal = signal<UserAccountModel>(null);
  rolesOptionsSignal = signal<RoleModel[]>([]);
  selectedUserRoleSignal = signal<any>(null);
  selectedUserRolesSignal = signal<RoleModel[]>([]);
  get users() {
    return this.usersSignal();
  }
  set users(value) {
    this.usersSignal.set(value);
  }
  get userRoles() {
    return this.userRolesSignal();
  }
  set userRoles(value) {
    this.userRolesSignal.set(value);
  }
  get selectedUser() {
    return this.selectedUserSignal();
  }
  set selectedUser(value) {
    this.selectedUserSignal.set(value);
  }
  get rolesOptions() {
    return this.rolesOptionsSignal();
  }
  set rolesOptions(value) {
    this.rolesOptionsSignal.set(value);
  }
  get selectedUserRole() {
    return this.selectedUserRoleSignal();
  }
  set selectedUserRole(value) {
    this.selectedUserRoleSignal.set(value);
  }
  get selectedUserRoles(): RoleModel[] {
    return this.selectedUserRolesSignal();
  }
  set selectedUserRoles(value: RoleModel[]) {
    this.selectedUserRolesSignal.set(value || []);
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

  public activeLanguage: string = 'en';
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  public translate: TranslateService;
  columns!: Column[];


  userDialogVisibleSignal = signal(false);
  get userDialogVisible() {
    return this.userDialogVisibleSignal();
  }
  set userDialogVisible(value) {
    this.userDialogVisibleSignal.set(value);
  }

  isFrontalSignal = signal<boolean>(false);
  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  get exportFileName(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = this.isFrontal ? (this.activeLanguage === 'ar' ? 'مستخدمين_فرونتال' : 'frontal_users') : (this.activeLanguage === 'ar' ? 'المستخدمين' : 'users');
    return `${prefix}_${yyyy}-${mm}-${dd}`;
  }

  constructor(
    private userService: UserManagementService,
    private fb: FormBuilder,
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private primengConfig: PrimeNGConfig,
    private roleService: RoleService,
    private authorizationService: AuthorizationService,
    private router: Router
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();

    this.isFrontal = this.router.url.includes('frontal');

    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.currentUser = res;
          this.userPermissions = res.userRoles.map(ur => ur.role.rolePermissions.map(rp => rp.permission))
            .reduce((acc, val) => acc.concat(val), []);
        }
      }
    );
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.initUserForm();
    this.initResetPasswordForm();
    if (this.activeLanguage === 'ar') {
      this.primengConfig.setTranslation(primengArTranslations);
    }

    this.columns = this.isFrontal ? [
      { field: 'isActive', header: this.translate.instant('AUTH.IS_ACTIVE'), filter: true, filterType: 'boolean' },
      { field: 'workId', header: this.translate.instant('AUTH.WORK_ID'), filter: true, filterType: 'text' },
      { field: 'userName', header: this.translate.instant('AUTH.USER_NAME'), filter: true, filterType: 'text' },
      {
        field: 'firstName',
        header: this.translate.instant('AUTH.FIRST_NAME'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'middleName',
        header: this.translate.instant('AUTH.MIDDLE_NAME'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'lastName',
        header: this.translate.instant('AUTH.LAST_NAME'),
        filter: true,
        filterType: 'text'
      },
      { field: 'phoneNumber', header: this.translate.instant('AUTH.PHONE_NUMBER'), filter: true, filterType: 'text' },
      {
        field: 'email',
        header: this.translate.instant('AUTH.EMAIL'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'emailVerified',
        header: this.translate.instant('AUTH.EMAIL_VERIFIED'),
        filter: true,
        filterType: 'boolean'
      },
      {
        field: "twoFactorEnabled",
        header: this.translate.instant('AUTH.TWO_FACTOR_ENABLED'),
        filter: true,
        filterType: 'boolean'
      },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date'
      }
    ] : [
      { field: 'isActive', header: this.translate.instant('AUTH.IS_ACTIVE'), filter: true, filterType: 'boolean' },
      { field: 'workId', header: this.translate.instant('AUTH.WORK_ID'), filter: true, filterType: 'text' },
      { field: 'userName', header: this.translate.instant('AUTH.USER_NAME'), filter: true, filterType: 'text' },
      {
        field: 'firstName',
        header: this.translate.instant('AUTH.FIRST_NAME'),
        filter: true,
        filterType: 'text',
      },
      {
        field: 'middleName',
        header: this.translate.instant('AUTH.MIDDLE_NAME'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'lastName',
        header: this.translate.instant('AUTH.LAST_NAME'),
        filter: true,
        filterType: 'text'
      },
      { field: 'phoneNumber', header: this.translate.instant('AUTH.PHONE_NUMBER'), filter: true, filterType: 'text' },
      {
        field: 'email',
        header: this.translate.instant('AUTH.EMAIL'),
        filter: true,
        filterType: 'text'
      },
      {
        field: 'emailVerified',
        header: this.translate.instant('AUTH.EMAIL_VERIFIED'),
        filter: true,
        filterType: 'boolean'
      },
      {
        field: "twoFactorEnabled",
        header: this.translate.instant('AUTH.TWO_FACTOR_ENABLED'),
        filter: true,
        filterType: 'boolean'
      },
      { field: 'isFrontal', header: "Frontal", filter: true, filterType: 'boolean' },
      {
        field: 'createdAt',
        header: this.translate.instant('FINANCE.CREATED_AT'),
        filter: true,
        filterType: 'date'
      }
    ]
  }
  private initUserForm() {
    this.userForm = this.fb.group({
      id: [null],
      workId: [''],
      userName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      isFrontal: [false],
      isActive: [true],
      dateOfBirth: [null]
    });
  }

  loadUsers() {
    this.loading = true;
    if (this.isFrontal) {
      this.userService.getAllFrontal().subscribe({
        next: users => {
          this.users = users.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          })
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Users', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('AUTH.ERROR'), detail: this.translate.instant('AUTH.USERS_LOADING_ERROR') });
          this.loading = false;
        }
      });
    } else {
      this.userService.getAll().subscribe({
        next: users => {
          this.users = users.map(x => {
            x.createdAt = new Date(x.createdAt);
            return x;
          })
          this.loading = false;
        },
        error: error => {
          console.log('Error Loading Users', error);
          this.messageService.add({ severity: 'error', summary: this.translate.instant('AUTH.ERROR'), detail: this.translate.instant('AUTH.USERS_LOADING_ERROR') });
          this.loading = false;
        }
      });
    }
  }

  loadRoles() {
    if (this.isFrontal) {
      this.roleService.getAllFrontal().subscribe({
        next: roles => {
          this.rolesOptions = roles.filter(roles => roles.name !== "System.Admin")
        },
        error: error => {
          console.log('Error Loading Roles', error)
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('AUTH.ERROR'),
            detail: this.translate.instant('AUTH.ROLES_LOADING_ERROR')
          })
        }
      })
    } else {
      this.roleService.getAll().subscribe({
        next: roles => {
          this.rolesOptions = roles.filter(roles => roles.name !== "System.Admin")
        },
        error: error => {
          console.log('Error Loading Roles', error)
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('AUTH.ERROR'),
            detail: this.translate.instant('AUTH.ROLES_LOADING_ERROR')
          })
        }
      })
    }
  }

  get filteredRolesOptions() {
    // 1️⃣ حالة إضافة مستخدم جديد (مفيش selectedUser لسه)
    if (!this.selectedUser) {
      // رجّع كل الأدوار اللي جت من الـ API زي ما هي
      return this.rolesOptions;
    }

    // 2️⃣ حالة تعديل مستخدم فرونتال
    if (this.selectedUser.isFrontal) {
      return this.rolesOptions.filter(role => role.isFrontal);
    }

    // 3️⃣ حالة تعديل مستخدم عادي (مش فرونتال)
    return this.rolesOptions.filter(role => !role.isFrontal);
  }


  public hasPermission(permission: string): boolean {
    return this.userPermissions.some(x => x.name === permission)
  }
  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  filter(dt1: Table, event: Event) {
    const target = event.target as HTMLInputElement;
    const trimmedValue = target.value.trim();
    this.searchValue = trimmedValue;
    dt1.filterGlobal(trimmedValue, 'contains')
  }


  showUserDialog(selectedUser: UserAccountModel = null) {
    this.opUserPanel?.hide();
    this.selectedUser = selectedUser;
    this.userRoles = selectedUser?.userRoles ?? [];
    this.userDialogVisible = true;

    if (selectedUser && this.userForm) {
      // تحويل dateOfBirth إلى string بصيغة YYYY-MM-DD للـ input[type="date"]
      // استخدام UTC methods لتجنب مشاكل timezone
      let dateOfBirthString = null;
      if (selectedUser.dateOfBirth) {
        const date = new Date(selectedUser.dateOfBirth);
        if (!isNaN(date.getTime())) {
          // استخدام UTC methods لتجنب تغيير التاريخ بسبب timezone
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          dateOfBirthString = `${year}-${month}-${day}`;
        }
      }

      this.userForm.patchValue({
        id: selectedUser.id,
        workId: selectedUser.workId,
        userName: selectedUser.userName,
        firstName: selectedUser.firstName,
        middleName: selectedUser.middleName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        phoneNumber: selectedUser.phoneNumber,
        isFrontal: selectedUser.isFrontal,
        isActive: selectedUser.isActive,
        dateOfBirth: dateOfBirthString
      });
    }
  }

  closeUserDialog() {
    this.userDialogVisible = false;
    this.userRoles = [];
    this.selectedUser = null;
    this.selectedUserRole = null;
    this.selectedUserRoles = [];
    if (this.userForm) {
      this.userForm.reset();
    }
  }
  saveUser() {
    if (!this.selectedUser) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.value;

    // تحويل dateOfBirth من string (YYYY-MM-DD) إلى ISO string
    // استخدام UTC لتجنب تغيير اليوم بسبب timezone
    let dateOfBirthValue = null;
    if (formValue.dateOfBirth && typeof formValue.dateOfBirth === 'string') {
      // input[type="date"] يعيد string بصيغة YYYY-MM-DD
      // تقسيم التاريخ وتكوينه باستخدام UTC لتجنب تغيير اليوم
      const [year, month, day] = formValue.dateOfBirth.split('-').map(Number);
      // استخدام Date.UTC لإنشاء التاريخ في UTC مباشرة
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // 12:00 لتجنب تغيير اليوم
      if (!isNaN(date.getTime())) {
        dateOfBirthValue = date.toISOString();
      }
    }

    // تنظيف userRoles - إرسال فقط userId و roleId
    const cleanedUserRoles = (this.selectedUser.userRoles || []).map(userRole => ({
      userId: userRole.userId,
      roleId: userRole.roleId
    }));

    // بناء payload نظيف حسب API structure
    const updatedUser: any = {
      id: this.selectedUser.id,
      workId: formValue.workId ? formValue.workId.trim() : null,
      userName: formValue.userName,
      firstName: formValue.firstName,
      middleName: formValue.middleName || '',
      lastName: formValue.lastName,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber || '',
      dateOfBirth: dateOfBirthValue || null,
      // التأكد من أن isActive يتم إرساله بشكل صحيح (true أو false)
      isActive: typeof formValue.isActive === 'boolean' ? formValue.isActive : (this.selectedUser?.isActive ?? true),
      isFrontal: typeof formValue.isFrontal === 'boolean' ? formValue.isFrontal : (this.selectedUser?.isFrontal ?? false),
      twoFactorEnabled: this.selectedUser.twoFactorEnabled || false,
      emailVerified: this.selectedUser.emailVerified || false,
      userRoles: cleanedUserRoles,
      profilePicture: this.selectedUser.profilePicture || null
    };

    this.userService.updateUser(updatedUser as UserAccountModel).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('AUTH.SUCCESS'),
          detail: this.translate.instant('AUTH.USER_UPDATED') || 'تم تعديل المستخدم بنجاح'
        });
        this.userDialogVisible = false;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error Updating User', error);
        console.error('Payload sent:', updatedUser);
        console.error('Selected User:', this.selectedUser);

        // عرض رسالة خطأ مفصلة
        let errorMessage = this.translate.instant('AUTH.USER_UPDATE_ERROR') || 'حدث خطأ أثناء تعديل المستخدم';
        if (error?.error?.message) {
          errorMessage += `: ${error.error.message}`;
        } else if (error?.message) {
          errorMessage += `: ${error.message}`;
        }

        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('AUTH.ERROR'),
          detail: errorMessage
        });
      }
    });
  }


  confirmUserDeletion(event: Event, user: UserAccountModel) {
    this.opUserPanel?.hide();
    if (this.currentUser && this.currentUser.id === user.id) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('AUTH.ERROR'),
        detail: this.translate.instant('AUTH.CANNOT_DELETE_OWN_ACCOUNT')
      });
      return;
    }

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('AUTH.CONFIRM_USER_DELETE', { userName: user.firstName + ' ' + user.lastName }),
      header: this.translate.instant('AUTH.USER_DELETE_CONFIRMATION'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('AUTH.YES'),
      rejectLabel: this.translate.instant('AUTH.NO'),
      accept: () => {
        this.deleteUser(user);
      },
    });
  }

  confirmUserRoleUnAssignment(event: Event, userRole: UserRoleModel) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('AUTH.CONFIRM_USER_ROLE_UN_ASSIGNMENT'),
      header: this.translate.instant('AUTH.USER_ROLE_UN_ASSIGNMENT'),
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text rounded-md ",
      rejectButtonStyleClass: "p-button-text p-button-text rounded-md ",
      acceptIcon: "none",
      rejectIcon: "none",
      acceptLabel: this.translate.instant('AUTH.YES'),
      rejectLabel: this.translate.instant('AUTH.NO'),
      accept: () => {
        this.unAssignUserRole(userRole);
      },
    });
  }

  unAssignUserRole(userRole: UserRoleModel) {
    this.authorizationService.unAssignRole(userRole).subscribe({
      next: res => {
        this.messageService.add({ severity: 'info', summary: this.translate.instant('AUTH.CONFIRMED'), detail: this.translate.instant('AUTH.USER_ROLE_UN_ASSIGNED') });
        this.loadUsers();
        this.userRoles = this.selectedUser.userRoles.filter(x => x.roleId !== userRole.roleId);
      },
      error: error => {
        console.log('Error Loading Users', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('AUTH.ERROR'), detail: this.translate.instant('AUTH.USER_ROLE_UN_ASSIGNED_ERROR') });
      }
    })
  }

  getRoleName(roleId: string): string {
    if (!roleId) return '';
    const role = this.rolesOptions.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  deleteUser(user: UserAccountModel) {
    this.userService.delete(user.id).subscribe(res => {
      this.loadUsers();
      this.opUserPanel.hide();
    });
  }

  addUserRole() {
    this.addSelectedUserRoles();
  }

  addSelectedUserRoles() {
    if (!this.selectedUserRoles || this.selectedUserRoles.length === 0) {
      // إذا كان مستخدماً للـ single dropdown القديم
      if (this.selectedUserRole) {
        this.selectedUserRoles = [this.selectedUserRole];
      } else {
        return;
      }
    }

    if (!this.selectedUser) return;

    const existingRoleIds = new Set((this.userRoles || []).map(ur => ur.roleId));
    const newRolesToAdd = this.selectedUserRoles.filter(role => !existingRoleIds.has(role.id));

    if (newRolesToAdd.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.activeLanguage === 'ar' ? 'تنبيه' : 'Warning',
        detail: this.activeLanguage === 'ar' ? 'جميع الأدوار المحددة مسندة للمستخدم بالفعل' : 'All selected roles are already assigned to this user'
      });
      this.selectedUserRoles = [];
      this.selectedUserRole = null;
      return;
    }

    const roleIds = newRolesToAdd.map(r => r.id);

    this.authorizationService.assignRoles(this.selectedUser.id, roleIds).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('AUTH.CONFIRMED') || (this.activeLanguage === 'ar' ? 'تم بنجاح' : 'Success'),
          detail: this.activeLanguage === 'ar'
            ? `تم إسناد ${newRolesToAdd.length} دور للمستخدم بنجاح`
            : `${newRolesToAdd.length} role(s) assigned successfully`
        });

        const createdUserRoles: UserRoleModel[] = newRolesToAdd.map(r => {
          const ur = new UserRoleModel();
          ur.roleId = r.id;
          ur.userId = this.selectedUser.id;
          ur.role = r;
          return ur;
        });

        this.userRoles = [...(this.userRoles || []), ...createdUserRoles];
        this.selectedUserRoles = [];
        this.selectedUserRole = null;
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error assigning roles:', error);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('AUTH.ERROR'),
          detail: this.translate.instant('AUTH.USER_ROLE_ASSIGNED_ERROR') || 'حدث خطأ أثناء إسناد الأدوار'
        });
      }
    });
  }

  makeFrontal(user: UserAccountModel) {
    this.opUserPanel?.hide();
    this.userService.makeFrontal(user.id).subscribe({
      next: res => {
        this.messageService.add({ severity: 'success', summary: this.translate.instant('AUTH.SUCCESS'), detail: "تم تحويل المستخدم إلى مستخدم فرونتال بنجاح" });
        this.loadUsers();
      },
      error: error => {
        console.log('Error Making User Frontal', error);
        this.messageService.add({ severity: 'error', summary: this.translate.instant('AUTH.ERROR'), detail: "حدث خطأ أثناء تحويل المستخدم إلى مستخدم فرونتال" });
      }
    });
  }
  @ViewChild('opUserPanel') opUserPanel!: OverlayPanel;


  copyUser(user: UserAccountModel) {
    if (!user) return;
    this.loading = true;

    // توليد اسم مستخدم وبريد إلكتروني فريد لتجنب أخطاء التكرار
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newUserName = `${user.userName}_copy${randomSuffix}`;

    let newEmail = user.email;
    if (user.email && user.email.includes('@')) {
      const parts = user.email.split('@');
      newEmail = `${parts[0]}_copy${randomSuffix}@${parts[1]}`;
    } else {
      newEmail = `copy${randomSuffix}@smartapro.com`;
    }

    // بناء الكائن الجديد للمستخدم المنسوخ
    const userCopyPayload: any = {
      firstName: user.firstName + (this.activeLanguage === 'ar' ? ' (نسخة)' : ' (Copy)'),
      middleName: user.middleName || '',
      lastName: user.lastName,
      userName: newUserName,
      email: newEmail,
      phoneNumber: user.phoneNumber || '',
      workId: user.workId || '',
      isFrontal: user.isFrontal,
      isActive: true,
      emailVerified: true, // تفعيل الحساب تلقائياً للنسخة
      password: '11223344Aa@', // كلمة مرور معقدة وصالحة
      userRoles: (user.userRoles || []).map(ur => ({
        roleId: ur.roleId
      }))
    };

    this.authService.registration(userCopyPayload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'ar' ? 'تم النسخ' : 'Copied',
          detail: this.activeLanguage === 'ar'
            ? `تم نسخ المستخدم بنجاح. اسم المستخدم الجديد: ${newUserName}`
            : `User copied successfully. New Username: ${newUserName}`
        });
        this.opUserPanel.hide();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error copying user:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
          detail: this.activeLanguage === 'ar' ? 'حدث خطأ أثناء نسخ المستخدم' : 'An error occurred while copying the user'
        });
      }
    });
  }

  showUserOverlay(event: MouseEvent, user: UserAccountModel) {
    event.preventDefault(); // منع القائمة السياقية الافتراضية
    event.stopPropagation();

    const isVisible = this.opUserPanel.overlayVisible;
    const isDifferent = this.selectedUser?.id !== user.id;
    this.selectedUser = user; // ده هيخلي signal تتحدّث

    // Fix double-click issue
    if (isVisible && isDifferent) {
      this.opUserPanel.show(event);
    } else {
      this.opUserPanel.toggle(event);
    }

    // Position panel at mouse location
    setTimeout(() => {
      const panelEl = this.opUserPanel.container as HTMLElement;
      if (!panelEl) return;

      panelEl.style.position = 'fixed';
      panelEl.style.left = `${event.clientX}px`;
      panelEl.style.top = `${event.clientY}px`;
      panelEl.style.zIndex = '9999';
    });
  }

  // ==========================================
  // Reset Password Logic (Admin User Password)
  // ==========================================
  resetPasswordDialogVisible: boolean = false;

  userToResetPassword: UserAccountModel = null;
  resetPasswordForm: FormGroup;
  resetPasswordSaving = signal(false);

  get resetPasswordValue(): string {
    return this.resetPasswordForm?.get('newPassword')?.value || '';
  }

  get resetHasMinLength(): boolean {
    return this.resetPasswordValue.length >= 8;
  }

  get resetHasUpperCase(): boolean {
    return /[A-Z]/.test(this.resetPasswordValue);
  }

  get resetHasLowerCase(): boolean {
    return /[a-z]/.test(this.resetPasswordValue);
  }

  get resetHasNumeric(): boolean {
    return /[0-9]/.test(this.resetPasswordValue);
  }

  get resetHasSpecialChar(): boolean {
    return /[^A-Za-z0-9]/.test(this.resetPasswordValue);
  }

  private initResetPasswordForm() {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, minLengthTrimmed(8), Validators.maxLength(100), complexPasswordValidator()]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  openResetPasswordDialog(user?: UserAccountModel) {
    this.opUserPanel?.hide();
    this.userToResetPassword = user || this.selectedUser;
    if (!this.userToResetPassword) return;
    this.resetPasswordForm?.reset();
    this.resetPasswordDialogVisible = true;
  }

  closeResetPasswordDialog() {
    this.resetPasswordDialogVisible = false;
  }

  onResetPasswordDialogHide() {
    this.resetPasswordDialogVisible = false;
    this.userToResetPassword = null;
    this.resetPasswordForm?.reset();
  }

  saveResetPassword() {
    if (this.resetPasswordForm.invalid || !this.userToResetPassword) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    this.resetPasswordSaving.set(true);

    this.userService.resetPassword(this.userToResetPassword.id, newPassword).subscribe({
      next: () => {
        this.resetPasswordSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: this.activeLanguage === 'ar' ? 'نجاح' : 'Success',
          detail: this.activeLanguage === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully'
        });
        this.closeResetPasswordDialog();
      },
      error: (err) => {
        this.resetPasswordSaving.set(false);
        console.error('Error resetting password:', err);
        let errorMsg = this.activeLanguage === 'ar' ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Error changing password';
        if (err?.error?.message) {
          errorMsg = err.error.message;
        } else if (typeof err?.error === 'string') {
          errorMsg = err.error;
        }
        this.messageService.add({
          severity: 'error',
          summary: this.activeLanguage === 'ar' ? 'خطأ' : 'Error',
          detail: errorMsg
        });
      }
    });
  }
}


