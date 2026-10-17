import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import { AuthService } from 'src/app/modules/auth';
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss']

})
export class CompanyFormComponent implements OnInit {
  companyForm: FormGroup;
  companyId: number | null = null;
  user: UserAccountModel;
  constructor(
    private fb: FormBuilder,
    private companyDataService: CompanyDataService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {

    this.companyId = Number(this.route.snapshot.paramMap.get('id'));

    // Initialize the form
    this.companyForm = this.fb.group({
      id: [''],
      arabicName: ['', Validators.required],
      englishName: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      email: ['', [Validators.required, Validators.email]],
      logo: ['', Validators.required],
      address: ['', Validators.required],
      nationalty: ['', Validators.required],
      city: ['', Validators.required],
      currency: ['', Validators.required],
      vatNumber: ['', [Validators.required, Validators.min(0)]],
      createdBy: ['']
    });
  }
  getUserId() {
    this.authService.getUserByToken().subscribe(
      (res: UserAccountModel) => {
        if (res) {
          this.user = res;
          this.companyForm.controls['createdBy'].setValue(this.user?.id);
        }
      }
    );
  }

  setCompanyId() {
    if (this.companyId) {
      this.companyForm.controls['id'].setValue(this.companyId);
    }
  }

  ngOnInit(): void {
    this.getUserId();


    if (this.companyId) {
      this.loadCompanyProfile(this.companyId);
    }


  }


  // Load the company profile if in edit mode
  loadCompanyProfile(id: number): void {
    this.companyDataService.getCompanySetting(id).subscribe(
      (profile: SettingCompanyProfile) => {
        this.companyForm.patchValue(profile); // Populate the form
      },
      (error) => {
        console.error('Failed to load company profile:', error);
      }
    );
  }

  onSubmit(): void {
    if (this.companyForm.invalid) return;

    const formValue: SettingCompanyProfile = this.companyForm.value;

    if (this.companyId) {
      this.companyDataService.updateCompanySetting(this.companyId, formValue).subscribe(() => {
        this.router.navigate(['/company-data/company-profile', this.companyId]);
      }, error => {
        console.error('Failed to update company profile:', error);
      });
    } else {
      this.companyDataService.addCompanySetting(formValue).subscribe((newProfile) => {
        this.router.navigate(['/company-data/company-profile', newProfile.id]);
      }, error => {
        console.error('Failed to add company profile:', error);
      });
    }
  }


}
