import {Component, OnInit, signal} from '@angular/core';
import {PasswordModule} from "primeng/password";
import {CommonModule} from "@angular/common";
import {TranslationModule} from "../../../modules/i18n";
import {AuthRoutingModule} from "../../../modules/auth/auth-routing.module";
import {AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import {HttpClientModule} from "@angular/common/http";
import {InputOtpModule} from "primeng/inputotp";
import {PanelModule} from "primeng/panel";
import {AuthService} from "../../../modules/auth";
import {Router} from "@angular/router";
import {MessageService} from "primeng/api";
import { TranslateService } from '@ngx-translate/core';
import {RoleModel} from "../../../models/auth/role.model";
import {UserRoleModel} from "../../../models/auth/userRole.model";
import {RoleService} from "../../../services/authorization/role.service";
import {CheckboxModule} from "primeng/checkbox";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { TooltipModule } from "primeng/tooltip";
import { ToastModule } from "primeng/toast";

export function minLengthTrimmed(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value.length === 0) {
      return null; // don't validate empty values
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
      return null; // let Validators.required handle empty values
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

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [
    PasswordModule,
    CommonModule,
    TranslationModule,
    AuthRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    PanelModule,
    CheckboxModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule
  ],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss',
  providers: [MessageService]
})
export class AddUserComponent implements OnInit {
  isFrontalSignal = signal<boolean>(false);
  roleSearchQuery = signal<string>('');

  get isFrontal() {
    return this.isFrontalSignal();
  }
  set isFrontal(value: boolean) {
    this.isFrontalSignal.set(value);
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    public translate: TranslateService,
    private roleService : RoleService
  ) {
    this.isFrontal = this.router.url.includes('frontal');
  }
  isLoadingSignal = signal(false);
  get isLoading() {
    return this.isLoadingSignal();
  }
  set isLoading(value) {
    this.isLoadingSignal.set(value);
  }
  hasErrorSignal = signal(false);
  get hasError() {
    return this.hasErrorSignal();
  }
  set hasError(value) {
    this.hasErrorSignal.set(value);
  }

  get filteredRolesOptions() {
    let roles = this.isFrontal 
      ? (this.rolesOptions?.filter(role => role.isFrontal) ?? [])
      : (this.rolesOptions?.filter(role => !role.isFrontal) ?? []);
    
    const query = this.roleSearchQuery()?.trim().toLowerCase();
    if (query) {
      roles = roles.filter(r => r.name?.toLowerCase().includes(query));
    }
    return roles;
  }

  toggleRole(role: RoleModel): void {
    const current = [...this.selectedUserRoles];
    const index = current.findIndex(r => r.id === role.id);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(role);
    }
    this.selectedUserRoles = current;
  }

  isRoleSelected(role: RoleModel): boolean {
    return this.selectedUserRoles.some(r => r.id === role.id);
  }

  selectAllRoles(): void {
    const available = this.filteredRolesOptions;
    const combined = [...this.selectedUserRoles];
    available.forEach(r => {
      if (!combined.some(c => c.id === r.id)) {
        combined.push(r);
      }
    });
    this.selectedUserRoles = combined;
  }

  clearAllRoles(): void {
    this.selectedUserRoles = [];
  }

  ngOnInit() {
    this.initForm();
    this.loadRoles();

  }
  registrationFormGroup: FormGroup;
  get passwordValue(): string {
    return this.registrationFormGroup?.get('password')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.passwordValue);
  }

  get hasNumeric(): boolean {
    return /[0-9]/.test(this.passwordValue);
  }

  get hasSpecialChar(): boolean {
    return /[^A-Za-z0-9]/.test(this.passwordValue);
  }

  initForm() {
    this.registrationFormGroup = this.fb.group(
      {
        firstName: [
          '',
          Validators.compose([
            Validators.required,
            minLengthTrimmed(3),
            Validators.maxLength(50),
            this.noWhitespaceValidator
          ]),
        ],
        middleName: [
          '',
          Validators.compose([
            Validators.maxLength(50),
            this.optionalNoWhitespaceValidator
          ]),
        ],
        lastName: [
          '',
          Validators.compose([
            Validators.required,
            minLengthTrimmed(3),
            Validators.maxLength(50),
            this.noWhitespaceValidator
          ]),
        ],
        userName: [
          '',
          Validators.compose([
            Validators.required,
            minLengthTrimmed(3),
            Validators.maxLength(200),
            Validators.pattern('^[a-zA-Z0-9@._-]*$'),
            this.noWhitespaceValidator
          ]),
        ],
        email: [
          '',
          Validators.compose([
            Validators.required,
            Validators.email,
            minLengthTrimmed(3),
            Validators.maxLength(320),
            this.noWhitespaceValidator
          ]),
        ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            complexPasswordValidator(),
            Validators.maxLength(100),
            this.noWhitespaceValidator
          ]),
        ],
        phoneNumber: [
          '',
          Validators.compose([
            Validators.maxLength(320),
            this.optionalNoWhitespaceValidator
          ]),
        ],
        workId: [
          '',
          Validators.compose([
            Validators.maxLength(320),
            this.optionalNoWhitespaceValidator
          ]),
        ],
        isFrontal: [this.isFrontal, Validators.required],
        roles: [[], [Validators.required, Validators.minLength(1)]]
      },
    );
  }
  loadRoles() {
    if (this.isFrontal) {
      this.roleService.getAllFrontal().subscribe({
        next: roles => {
          this.rolesOptions = roles
        },
        error: error => {
          console.log('Error Loading Frontal Roles', error)
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
          this.rolesOptions = roles.filter(role => !role.isFrontal)
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
  submit() {
    // Mark all fields as touched to show validation errors
    this.registrationFormGroup.markAllAsTouched();

    // Check if form is valid before proceeding
    if (this.registrationFormGroup.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('AUTH.WARNING'),
        detail: this.translate.instant('AUTH.PLEASE_FILL_REQUIRED_FIELDS')
      });
      return; // Exit early if form is invalid
    }

    this.isLoading = true;
    this.hasError = false;

    const user = this.registrationFormGroup.value;
    user.userRoles = this.selectedUserRoles.map(x => ({
      roleId: x.id,
      userId: user.id
    }));
    user.isFrontal = this.isFrontal;

    this.authService
      .registration(user)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('AUTH.SUCCESS'),
            detail: this.translate.instant('AUTH.USER_CREATED_SUCCESSFULLY') || 'تم إنشاء المستخدم بنجاح'
          });
          this.router.navigate(['/user-management']);
        },
        error: (error) => {
          this.hasError = true;
          this.isLoading = false; // Reset loading state on error
          const detailMsg = error?.error?.message || error?.error?.Message || (typeof error?.error === 'string' ? error.error : null) || this.translate.instant('AUTH.USER_CREATED_ERROR');
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('AUTH.ERROR'),
            detail: detailMsg
          });
        },
        complete: () => {
          this.isLoading = false; // Reset loading state on completion
        }
      });
  }

  cancel() {
    const route = this.isFrontal ? '/frontal-user-management' : '/user-management';
    this.router.navigate([route]);
  }

  // Custom validator to prevent whitespace-only values for required fields
  noWhitespaceValidator(control: any) {
    const value = control.value;
    if (value && typeof value === 'string') {
      if (value.trim().length === 0) {
        return { whitespaceOnly: true };
      }
    }
    return null;
  }

  optionalNoWhitespaceValidator(control: any) {
    const value = control.value;
    if (value && typeof value === 'string' && value.trim().length > 0) {
      if (value.trim().length === 0) {
        return { whitespaceOnly: true };
      }
    }
    return null;
  }

  getUnifiedMessage() {
    const currentLang = this.translate.currentLang || 'ar';
    if (currentLang === 'ar') {
      return 'هذه الخانة مطلوبة ولا يمكن أن تحتوي على مسافات فقط';
    } else {
      return 'This field is required and cannot contain only spaces';
    }
  }

  rolesOptionsSignal = signal<RoleModel[]>([]);
  get rolesOptions() {
    return this.rolesOptionsSignal();
  }
  set rolesOptions(value) {
    this.rolesOptionsSignal.set(value);
  }
  userRolesSignal = signal<UserRoleModel[]>([]);
  get userRoles() {
    return this.userRolesSignal();
  }
  set userRoles(value) {
    this.userRolesSignal.set(value);
  }
  selectedUserRolesSignal = signal<any[]>([]);
  get selectedUserRoles() {
    return this.selectedUserRolesSignal();
  }
  set selectedUserRoles(value) {
    this.selectedUserRolesSignal.set(value);
    if (this.registrationFormGroup) {
      this.registrationFormGroup.controls['roles'].setValue(value);
    }
  }

}
