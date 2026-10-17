import {Component, OnInit, signal} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { first } from 'rxjs/operators';
import {Router} from "@angular/router";

enum ErrorStates {
  NotSubmitted,
  HasError,
  NoError,
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  errorState: ErrorStates = ErrorStates.NotSubmitted;
  errorStates = ErrorStates;
  isLoadingSignal = signal(false);
  get isLoading(): boolean {
    return this.isLoadingSignal();
  }
  set isLoading(value: boolean) {
    this.isLoadingSignal.set(value);
  }

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
  }

  ngOnInit(): void {
    this.initForm();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.forgotPasswordForm.controls;
  }

  initForm() {
    this.forgotPasswordForm = this.fb.group({
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.email,
          Validators.minLength(3),
          Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
        ]),
      ],
    });
  }
  isEmailReadOnlySignal =  signal(false)
  get isEmailReadOnly(): boolean {
    return this.isEmailReadOnlySignal()
  }
  set isEmailReadOnly(value: boolean) {
    this.isEmailReadOnlySignal.set(value)
  }

  submit() {
    this.isLoading = true;
    this.errorState = ErrorStates.NotSubmitted;
    const forgotPasswordSubscr = this.authService
      .forgotPassword(this.f.email.value)
      .subscribe({
        next: (res) => {
          console.log('Forgot Password Result', res);
          this.isEmailReadOnly = true;
          //@ts-ignore
          this.emailResponse = res;
        },
        error: (err) => {
          console.log(err);
          this.errorState = ErrorStates.HasError;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    this.unsubscribe.push(forgotPasswordSubscr);
  }

  emailResponseSignal = signal<{
    otpId: string;
    userId: string;
  } | null >(null);
  get emailResponse(): {
    otpId: string;
    userId: string;
  } | null {
    return this.emailResponseSignal();
  }
  set emailResponse(value: {
    otpId: string;
    userId: string;
  } | null) {
    this.emailResponseSignal.set(value);
  }

  isButtonActiveSignal = signal(true)
  get isButtonActive(): boolean {
    return this.isButtonActiveSignal()
  }
  set isButtonActive(value: boolean) {
    this.isButtonActiveSignal.set(value)
  }
  //@ViewChildren('input0, input1, input2, input3,input4,input5') inputs: QueryList<ElementRef>;
  otpSignal = signal<string>('')
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';


  get otp(){
    return this.otpSignal()
  }

  set otp(otp:string){
    this.otpSignal.set(otp)
    if (otp.length === 6) {
      this.isButtonActive = true
      this.onSubmitOtp()
    }
  }


  resendOtp() {
    this.authService.ResendOtp(this.emailResponse.userId).subscribe({
      next: () => {
        document.getElementById('resendOtpMessage').style.display = 'block';
        setTimeout(() => {
          document.getElementById('resendOtpMessage').style.display = 'none';
        }, 5000); // Hide the message after 5 seconds
      },
      error: () => {
        // Handle error if needed
      }
    });
    this.isButtonActive = true
  }

  newPasswordSignal = signal('');
  get newPassword(): string {
    return this.newPasswordSignal();
  }
  set newPassword(value: string) {
    this.newPasswordSignal.set(value);
  }
  onSubmitOtp() {
    this.isButtonActive = false;

    if (this.newPassword.length === 0) {
      alert('يجب إدخال كلمة المرور الجديدة');
      return;
    }
    this.authService.verifyOtpAndSetNewPassword(this.otp, this.emailResponse.userId, this.emailResponse.otpId, this.newPassword).subscribe({
      next: () => {
        console.log('OTP verified successfully')
        this.router.navigate(['/dashboard'])
      },
      error: () => {
        this.isButtonActive = true
        document.getElementById("otpMessage").style.display = "block"
      },
    })
  }
}
