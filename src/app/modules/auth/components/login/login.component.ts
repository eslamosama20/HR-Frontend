import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserModel } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthModel, RegisterationAndloginResponse } from '../../models/auth.model';

import { TranslationService } from '../../../i18n';
import { SystemSettingService } from 'src/app/services/system-setting.service';
import { TimezoneService } from 'src/app/services/timezone.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  hasError: boolean;
  errorMessageKey: string = 'AUTH.INVALID_LOGIN';
  returnUrl: string;
  isLoading$: Observable<boolean>;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private translationService: TranslationService,
    private systemSettingService: SystemSettingService,
    private timezoneService: TimezoneService
  ) {
    this.isLoading$ = this.authService.isLoading$;
    // redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  get currentLang(): string {
    return this.translationService.getSelectedLanguage();
  }

  changeLanguage(lang: string): void {
    if (this.currentLang === lang) return;
    this.translationService.setLanguage(lang);
    document.location.reload();
  }

  ngOnInit(): void {
    this.initForm();
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'.toString()] || '/';
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  initForm() {
    this.loginForm = this.fb.group({
      userName: [
        null,
        Validators.compose([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(200),
        ]),
      ],
      password: [
        null,
        Validators.compose([
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ]),
      ],
    });
  }

  get getEmail(){
    return this.loginForm.controls['userName'];
  }


  submit() {
    this.hasError = false;
    this.errorMessageKey = 'AUTH.INVALID_LOGIN';
    const loginSubscr = this.authService
      .login(this.f.userName.value, this.f.password.value)
      .subscribe(
        {
          next:(res : AuthModel | RegisterationAndloginResponse)=>{
            console.log('🔐 Login response received:', res);
            
            // Check if this is an AuthModel response (has authToken)
            if('authToken' in res && res.authToken){
              console.log('🔑 authToken:', res.authToken);
              console.log('🔑 refreshToken:', res.refreshToken);
              console.log('📅 expiresIn:', res.expiresIn);
              
              localStorage.setItem('authToken', res.authToken);
              localStorage.setItem('refreshToken', res.refreshToken);
              localStorage.setItem('expiresIn', res.expiresIn?.toString());
              
              console.log('✅ Token saved to localStorage');
              console.log('📦 localStorage authToken:', localStorage.getItem('authToken')?.substring(0, 20) + '...');
              
              this.systemSettingService.getAll().subscribe({
                next: (elements) => {
                  if (elements && elements.length > 0 && elements[0].timeZone) {
                    this.timezoneService.setTimezone(elements[0].timeZone);
                  }
                },
                error: () => {}
              });

              this.router.navigate(["/dashboard"])
            }
            // Check if this is RegisterationAndloginResponse (has userId/otpId)
            else if('userId' in res && 'otpId' in res){
              console.log('👤 userId:', res.userId);
              console.log('🔐 otpId:', res.otpId);
              console.log('⚠️ OTP required - redirecting to OTP verification');
              this.router.navigate(["auth/OTP-Verification"]);
            }
            else {
              console.error('❌ Unexpected response format:', res);
              this.hasError = true;
              this.errorMessageKey = 'AUTH.INVALID_LOGIN';
            }
          }
          ,error:(err)=>{
            this.hasError = true;
            if (err?.error?.message === 'ACCOUNT_DEACTIVATED' || err?.error?.error === 'ACCOUNT_DEACTIVATED' || err?.error === 'ACCOUNT_DEACTIVATED') {
              this.errorMessageKey = 'AUTH.ACCOUNT_DEACTIVATED';
            } else {
              this.errorMessageKey = 'AUTH.INVALID_LOGIN';
            }
          }
        }
      //   (response) => {
      //   if (response) {
      //
      //   } else {
      //     console.log("IN HAS ERROR")
      //     this.hasError = true;
      //   }
      // }
    );
    this.unsubscribe.push(loginSubscr);
  }


  hasAnyError(control: FormControl): boolean {
    return control.invalid && (control.dirty || control.touched);
  }



  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
