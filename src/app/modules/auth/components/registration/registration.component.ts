import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Observable, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent implements OnInit, OnDestroy {
  registrationForm: FormGroup;
  hasError: boolean;
  isLoading$: Observable<boolean>;
  
  // Profile picture upload
  isFileUploading: boolean = false;
  profilePictureBase64: string | null = null;
  @ViewChild('profilePictureUploader') profilePictureUploader: any;

  // private fields
  private unsubscribe: Subscription[] = []; // Read more: => https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.isLoading$ = this.authService.isLoading$;
    // redirect to home if already logged in
    if (this.authService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.registrationForm.controls;
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm() {
    this.registrationForm = this.fb.group(
      {
        firstName: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        middleName: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        lastName: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ]),
        ],
        userName: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(200),
            Validators.pattern('^[a-zA-Z0-9@._-]*$')
          ]),
        ],
        email: [
          '',
          Validators.compose([
            Validators.required,
            Validators.email,
            Validators.minLength(3),
            Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
          ]),
        ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100),
          ]),
        ],
        phoneNumber: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
          ]),
        ],
        workId: [
          '',
          Validators.compose([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(320), // https://stackoverflow.com/questions/386294/what-is-the-maximum-length-of-a-valid-email-address
          ]),
        ],
        /*dateOfBirth: [
          '',
          Validators.compose([
            Validators.required,
            this.validateDate
          ]),
        ],*/

        // cPassword: [
        //   '',
        //   Validators.compose([
        //     Validators.required,
        //     Validators.minLength(3),
        //     Validators.maxLength(100),
        //   ]),
        // ],
        // agree: [false, Validators.compose([Validators.required])],
      },
      // {
      //   validator: ConfirmPasswordValidator.MatchPassword,
      // }
    );
  }

  validateDate(control: FormControl): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {invalidDate: true};
    }
    return null;
  }

  onProfilePictureSelected(event: any) {
    this.isFileUploading = true;
    const file = event.files?.[0];

    if (!file) {
      this.isFileUploading = false;
      return;
    }

    // Only image files allowed (jpeg, png, jpg)
    if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/jpg') {
      alert('نوع الملف غير مدعوم، الرجاء اختيار صورة (JPEG أو PNG)');
      this.isFileUploading = false;
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الملف كبير جداً، الحد الأقصى 2 ميجابايت');
      this.isFileUploading = false;
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64File = reader.result as string;
      const value = base64File.split(',')[1]; // Remove data:image/...;base64, prefix
      this.profilePictureBase64 = value;
      this.isFileUploading = false;
      this.profilePictureUploader?.clear();
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('حدث خطأ أثناء قراءة الملف');
      this.isFileUploading = false;
    };

    reader.readAsDataURL(file); // Convert file to base64
  }

  removeProfilePicture() {
    this.profilePictureBase64 = null;
    this.profilePictureUploader?.clear();
  }

  submit() {
    this.hasError = false;
    
    if (this.registrationForm.status == "VALID") {
      const formData = {
        ...this.registrationForm.value,
        profilePicture: this.profilePictureBase64 // Add the base64 image
      };
      
      this.authService
        .registration(formData)
        .subscribe(
          {
            next: () => {
              this.router.navigate(["auth/OTP-Verification"]);
            }
            , error: (error) => {
              console.log(error)
              this.hasError = true;
            }
          }
        );
    }
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
