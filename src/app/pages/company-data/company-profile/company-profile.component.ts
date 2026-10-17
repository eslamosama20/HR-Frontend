import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SettingCompanyProfile } from 'src/app/models/companyData/companyData';
import { CompanyDataService } from 'src/app/services/companyData/company-data.service';

@Component({
  selector: 'app-company-profile',
  standalone:true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule,RouterModule],
  templateUrl: './company-profile.component.html',
  styleUrls: ['./company-profile.component.scss']
})
export class CompanyProfileComponent implements OnInit {
  companyData: SettingCompanyProfile | undefined;
id;
  constructor(
    private route: ActivatedRoute,
    private companyDataService: CompanyDataService,
    private cdr: ChangeDetectorRef
  ) {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    
  }


  ngOnInit(): void {
    this.populateData();
  }

  populateData(){
    
    if (this.id) {
      this.companyDataService.getCompanySetting(this.id).subscribe(
        (data) => {
          this.companyData = data;
      this.cdr.detectChanges();

          console.log('Company Data:', this.companyData);  // Debug output
        },
        (error) => {
          console.error('Failed to load company profile:', error);
        }
      );
    }
  }
  
}
