import {Component, OnInit, signal} from '@angular/core';
import {BranchDetailsComponent} from "./branch-details/branch-details.component";
import {CompanyDetailsService} from "../../../services/inventory/company-details.service";
import {ActivatedRoute, Router} from "@angular/router";
import {CompanyDetailsModel} from "../../../models/inventory/companyDetails.model";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule, NgIf} from "@angular/common";
import {PageInfoService} from "../../../_metronic/layout";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";

@Component({
  selector: 'app-view-company-details',
  standalone: true,
  imports: [BranchDetailsComponent, EntityManagerModule, NgIf, CommonModule, TranslateModule],
  templateUrl: './view-company-details.component.html',
  styleUrl: './view-company-details.component.scss'
})
export class ViewCompanyDetailsComponent implements OnInit {
  companyDetailsId: string | null = null;
  notFoundSignal = signal<boolean>(false);
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  private companyDetailsSignal = signal<CompanyDetailsModel>(null);
  public activeLanguage: string = 'en';
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyDetailsService: CompanyDetailsService,
    private pageInfo: PageInfoService,
    public translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
  }

  get companyDetails(): CompanyDetailsModel | null {
    return this.companyDetailsSignal()
  }

  set companyDetails(value: CompanyDetailsModel) {
    this.companyDetailsSignal.set(value);
  }

  get notFound(): boolean {
    return this.notFoundSignal()
  }

  set notFound(value: boolean) {
    this.notFoundSignal.set(value);
  }

  ngOnInit(): void {
    // Subscribe to route parameters
    this.route.paramMap.subscribe(params => {
      this.companyDetailsId = params.get('id');
      if (this.companyDetailsId) {
        this.loadCompanyDetails(this.companyDetailsId);
      }
    });


  }


  goBack(): void {
    this.router.navigate(['/inventory/company-details']);
  }

  loadCompanyDetails(id: string): void {
    this.companyDetailsService.getById(id).subscribe({
      next: companyDetails => {
        if (companyDetails) {
          this.companyDetails = companyDetails;
          this.notFound = false;
          this.pageInfo.setTitle(this.companyDetails ? `Company: ${this.companyDetails.englishName}` : 'Company Details');
          this.pageInfo.updateBreadcrumbs([{
            title: this.translate.instant('DATA.COMPANY_DETAILS'),
            path: '/company-details',
            isActive: false,
          }, {
            title: this.companyDetails ? `Company: ${this.companyDetails.englishName}` : 'Company Details',
            path: '/company-details/' + this.companyDetailsId,
            isActive: true,
          }]);
        } else {
          this.notFound = true;
        }
      },
      error: error => {
        console.log('Error Loading Company Details', error);
        this.notFound = true;
      }
    });
  }
}
