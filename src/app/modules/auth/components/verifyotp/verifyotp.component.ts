import {Component, ElementRef, QueryList, signal, ViewChildren} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-verifyotp',
  templateUrl: './verifyotp.component.html',
  styleUrl: './verifyotp.component.scss'
})
export class VerifyotpComponent {
  //otp: string[] = ['', '', '', '', '', ''];
  hasError: boolean = false;
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
  constructor(private authService: AuthService, private router: Router) {
  }

  get otp(){
    return this.otpSignal()
  }

  set otp(otp:string){
    this.otpSignal.set(otp)
    if (otp.length === 6) {
      this.isButtonActive = true
      this.onSubmit()
    }
  }


  resendOtp() {
    this.authService.ResendOtp().subscribe({
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

  // onKeyUp(event: KeyboardEvent, index: number): void {
  //   const input = this.inputs.toArray()[index].nativeElement;
  //   const nextInput = this.inputs.toArray()[index + 1]?.nativeElement;
  //   const prevInput = this.inputs.toArray()[index - 1]?.nativeElement;

  //   if (input.value.length > 1) {
  //     input.value = input.value[0];
  //     return;
  //   }
  //   if (nextInput && !nextInput.disabled && input.value !== '') {
  //     nextInput.disabled = false;
  //     nextInput.focus();
  //   }

  //   if (event.key === 'Backspace') {
  //     if (prevInput) {
  //       prevInput.disabled = false;
  //       prevInput.focus();
  //     }
  //   }

  //   this.isButtonActive = true
  //   this.otp[index] = event.key;
  //   if (this.otp.every(digit => digit !== '')) {
  //     this.onSubmit(); // Automatically submit the form
  //   }
  // }

  onSubmit() {
    this.isButtonActive = false
    this.authService.VerifyOtp(this.otp).subscribe({
      next: () => {
        this.router.navigate(["/dashboard"])
      },
      error: () => {
        this.hasError = true;
        this.isButtonActive = true
        document.getElementById("otpMessage").style.display = "block"
      },
    })
  }

  // onSubmit(): void {
  //   // Handle OTP submission logic here
  //   console.log('OTP:', );

  // }

  // ngAfterViewInit(): void {
  //   const firstInput = this.inputs.toArray()[0].nativeElement;
  //   firstInput.focus();
  // }
}

// {
//   otpValue : string = ''
// }
