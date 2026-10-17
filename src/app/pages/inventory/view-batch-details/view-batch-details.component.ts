import {Component, OnInit, signal} from '@angular/core';
import {BatchProductUnitComponent} from "./product-unit/product-unit.component";
import {BatchDetailsService} from "../../../services/inventory/batch-details.service";
import {ActivatedRoute, Router} from "@angular/router";
import {BatchDetailsModel} from "../../../models/inventory/batchDetails.model";
import {EntityManagerModule} from "../../../shared-components/entity-manager/entity-manager.module";
import {CommonModule, NgIf} from "@angular/common";
import {PageInfoService} from "../../../_metronic/layout";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslationService} from "../../../modules/i18n";
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";

@Component({
  selector: 'app-view-batch-details',
  standalone: true,
    imports: [BatchProductUnitComponent, EntityManagerModule, NgIf, CommonModule, TranslateModule, CustomDatePipe],
  templateUrl: './view-batch-details.component.html',
  styleUrl: './view-batch-details.component.scss'
})
export class ViewBatchDetailsComponent implements OnInit {
  batchDetailsId: string | null = null;
  notFoundSignal = signal<boolean>(false);
  theme = localStorage.getItem('kt_theme_mode_value') || 'light';
  private batchDetailsSignal = signal<BatchDetailsModel>(null);
  public activeLanguage: string = 'en';
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private batchDetailsService: BatchDetailsService,
    private pageInfo: PageInfoService,
    public translate: TranslateService,
    private translationService: TranslationService
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
  }

  get batchDetails(): BatchDetailsModel | null {
    return this.batchDetailsSignal()
  }

  set batchDetails(value: BatchDetailsModel) {
    this.batchDetailsSignal.set(value);
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
      this.batchDetailsId = params.get('id');
      if (this.batchDetailsId) {
        this.loadBatchDetails(this.batchDetailsId);
      }
    });


  }


  goBack(): void {
    this.router.navigate(['/inventory/batch-details']);
  }

  loadBatchDetails(id: string): void {
    this.batchDetailsService.getById(id).subscribe({
      next: batchDetails => {
        if (batchDetails) {
          this.batchDetails = batchDetails;
          this.notFound = false;
          this.pageInfo.setTitle('Batch Details');
          this.pageInfo.updateBreadcrumbs([{
            title: this.translate.instant('DATA.BATCH_DETAILS'),
            path: '/batch-details',
            isActive: false,
          }, {
            title: this.translate.instant('DATA.BATCH_DETAILS'),
            path: '/batch-details/' + this.batchDetailsId,
            isActive: true,
          }]);
        } else {
          this.notFound = true;
        }
      },
      error: error => {
        this.notFound = true;
      }
    });
  }
}
