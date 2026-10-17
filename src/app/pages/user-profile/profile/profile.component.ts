import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/** خدمات المشروع */
import { AuthService } from 'src/app/modules/auth';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { UserHTTPService } from 'src/app/services/user-http.service';
import { formatDateOnlyToString } from 'src/app/utils/dateUtils';

/** PrimeNG */
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';

type TabKey = 'profile' | 'password';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    AvatarModule,
    ToastModule,
    ConfirmDialogModule,
    RippleModule,
    DividerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private messages = inject(MessageService);
  private confirm = inject(ConfirmationService);
  private userHttp = inject(UserHTTPService);

  user: UserAccountModel | null = null;

  // Tabs
  activeTab: TabKey = 'profile';

  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Avatar
  avatarPreviewSignal = signal<string | null>(null);
  avatarFile: File | null = null;

  // Loading flags
  savingProfile = false;
  changingPassword = false;

  // Flag لتحديد إذا كان الحساب admin
  isAdminEmail = false;

  ngOnInit(): void {
    this.buildForms();
    this.auth.getUserByToken().subscribe((u) => {
      if (u) {
        this.user = u;
        this.patchUser(u);
        console.log('Current user email:', this.user?.email);

        // تحقق من البريد
        this.isAdminEmail = this.user?.email?.toLowerCase() === 'admin@admin.com';
      }
    });
  }

  // ============ Forms ============
  private buildForms(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      middleName: ['', [Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
      dateOfBirth: [''],
      profilePicture: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: [this.matchPasswords('newPassword', 'confirmPassword')] }
    );
  }

  private patchUser(u: UserAccountModel): void {
    this.profileForm.patchValue({
      firstName: u.firstName ?? '',
      middleName: u.middleName ?? '',
      lastName: u.lastName ?? '',
      phoneNumber: (u as any)?.phoneNumber ?? '',
      dateOfBirth: (u as any)?.dateOfBirth ? String((u as any).dateOfBirth).split('T')[0] : '',
      profilePicture: (u as any)?.profilePicture ?? '',
    });

    const avatarUrl = (u as any)?.avatarUrl || (u as any)?.profilePictureUrl || null;
    this.avatarPreviewSignal.set(avatarUrl || null);
  }

  private matchPasswords(pass: string, confirm: string) {
    return (group: AbstractControl) => {
      const p = group.get(pass)?.value;
      const c = group.get(confirm)?.value;
      if (p && c && p !== c) {
        group.get(confirm)?.setErrors({ mismatch: true });
      } else {
        const errors = group.get(confirm)?.errors;
        if (errors) {
          delete (errors as any)['mismatch'];
          if (!Object.keys(errors).length) group.get(confirm)?.setErrors(null);
        }
      }
      return null;
    };
  }

  // ============ Tabs ============
  setTab(tab: TabKey): void {
    this.activeTab = tab;
    setTimeout(() => document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  // ============ Avatar upload ============
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.messages.add({ severity: 'warn', summary: '⚠️', detail: 'نوع الصورة غير مدعوم' });
      return;
    }
    const maxSizeMb = 2;
    if (file.size > maxSizeMb * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: '⚠️', detail: `حجم الصورة يجب ألا يتجاوز ${maxSizeMb}MB` });
      return;
    }

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      const fullBase64 = reader.result as string;            // data:image/...;base64,AAA...
      const pureBase64 = fullBase64.split(',')[1] || '';     // AAA...
      this.avatarPreviewSignal.set(fullBase64);              // للمعاينة
      this.profileForm.patchValue({ profilePicture: pureBase64 }); // للإرسال
    };
    reader.readAsDataURL(file);
  }

  // ============ Actions ============
  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile = true;

    const dateStr: string | null = this.profileForm.value.dateOfBirth || null;
    const dto = new UserAccountModel({
      firstName: this.profileForm.value.firstName,
      middleName: this.profileForm.value.middleName || null,
      lastName: this.profileForm.value.lastName,
      phoneNumber: this.profileForm.value.phoneNumber || null,
      dateOfBirth: dateStr ? new Date(`${dateStr}T00:00:00`) : null,
      profilePicture: this.profileForm.value.profilePicture || null,
    });

    const update$ = this.userHttp.updateProfile$(dto);

    update$.subscribe({
      next: () => {
        // نكتفي بتحديث البروفايل (الصورة تُرسل ضمن الـ PATCH)
        this.savingProfile = false;
        this.messages.add({ severity: 'success', summary: 'تم الحفظ', detail: 'تم تحديث البيانات' });
        this.auth.getUserByToken().subscribe((u) => (this.user = u));
      },
      error: () => {
        this.savingProfile = false;
        this.messages.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر حفظ بيانات الملف الشخصي' });
      },
    });
  }

  confirmChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.confirm.confirm({
      header: 'تأكيد الإجراء',
      message: 'هل أنت متأكد من تغيير كلمة المرور؟',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'تأكيد',
      rejectLabel: 'إلغاء',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.changePassword(),
    });
  }
  today = formatDateOnlyToString(new Date()); 
  private changePassword(): void {
    // لو الحساب admin → لا تنفذ أي تغيير
    if (this.isAdminEmail) {
      this.messages.add({ severity: 'warn', summary: '⚠️', detail: 'هذا الحساب لا يمكنه تغيير كلمة المرور' });
      return;
    }

    this.changingPassword = true;
    const dto = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
    };

    const change$ =
      (this.auth as any).changePassword
        ? (this.auth as any).changePassword(dto.currentPassword, dto.newPassword)
        : this.http.post('/api/users/me/change-password', {
            oldPassword: dto.currentPassword,
            newPassword: dto.newPassword,
          });

    change$.subscribe({
      next: () => {
        this.changingPassword = false;
        this.messages.add({ severity: 'success', summary: 'تم التغيير', detail: 'تم تغيير كلمة المرور بنجاح' });
        this.passwordForm.reset();
      },
      error: () => {
        this.changingPassword = false;
        this.messages.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تغيير كلمة المرور. تأكد من كلمة المرور الحالية.',
        });
      },
    });
  }

  // ============ Helpers ============
  get fpf() { return this.profileForm.controls; }
  get pwf() { return this.passwordForm.controls; }

  get fullName(): string {
    const f = this.profileForm?.value?.firstName || this.user?.firstName || '';
    const m = this.profileForm?.value?.middleName || this.user?.middleName || '';
    const l = this.profileForm?.value?.lastName || this.user?.lastName || '';
    return [f, m, l].filter(Boolean).join(' ');
  }
}
