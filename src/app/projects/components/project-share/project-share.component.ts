import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ProjectDetails } from '../../models/project.model';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule } from '@ngx-translate/core';
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe';

@Component({
  selector: 'app-project-share',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ProgressBarModule,
    CardModule,
    ProgressSpinnerModule,
    TranslateModule,
    CustomDatePipe
  ],
  template: `
    <div class="share-container" dir="rtl">
      <!-- Loading Spinner -->
      <div *ngIf="loading" class="loading-wrapper">
        <p-progressSpinner></p-progressSpinner>
        <p class="mt-3 text-muted">جاري تحميل بيانات مراحل المشروع المعتمد...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && !project" class="error-wrapper card p-5 text-center shadow-sm">
        <i class="pi pi-exclamation-circle text-danger mb-3" style="font-size: 3rem;"></i>
        <h4 class="text-danger">رابط مشاركة غير صالح أو منتهي الصلاحية</h4>
        <p class="text-muted">يرجى التحقق من الرابط المرسل إليكم من إدارة النظام أو التواصل مع المسؤول.</p>
      </div>

      <!-- Project Details -->
      <div *ngIf="!loading && project" class="project-view card shadow-lg border-0">
        <!-- Premium Header Cover -->
        <div class="header-cover text-white p-4 p-md-5 d-flex flex-column justify-content-between">
          <div class="d-flex justify-content-between align-items-start">
            <span class="badge bg-light text-dark px-3 py-2 font-weight-bold" style="border-radius: 20px;">
              {{ project.status }}
            </span>
            <div class="text-left">
              <h6 class="mb-0 text-white-50">رقم المشروع: {{ project.projectNumber || '-' }}</h6>
              <small class="text-white-50">تاريخ البدء: {{ project.createdAt | customDate: 'dd/MM/yyyy' }}</small>
            </div>
          </div>
          <div class="mt-4">
            <h1 class="display-5 font-weight-bold mb-2">{{ project.projectName }}</h1>
            <p class="lead mb-0 text-white-50"><i class="pi pi-map-marker mr-2"></i>دولة التنفيذ: {{ project.country || '-' }}</p>
          </div>
        </div>

        <div class="card-body p-4 p-md-5">
          <!-- Stats Summary Grid -->
          <div class="row g-4 mb-5">
            <div class="col-md-3">
              <div class="stat-card p-3 shadow-sm border-0 bg-light rounded text-center">
                <span class="text-muted d-block mb-1" style="font-size: 0.85rem;">الميزانية الإجمالية للمشروع</span>
                <h3 class="mb-0 text-primary font-weight-bold">{{ formatCurrency(project.totalAmount) }} SAR</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card p-3 shadow-sm border-0 bg-light rounded text-center">
                <span class="text-muted d-block mb-1" style="font-size: 0.85rem;">مبلغ التنفيذ الميداني</span>
                <h3 class="mb-0 text-success font-weight-bold">{{ formatCurrency(project.executionAmount) }} SAR</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card p-3 shadow-sm border-0 bg-light rounded text-center">
                <span class="text-muted d-block mb-1" style="font-size: 0.85rem;">الملاءة المالية المعتمدة</span>
                <h3 class="mb-0 font-weight-bold" [ngClass]="project.isFinancialSolvency ? 'text-info' : 'text-warning'">
                  {{ project.isFinancialSolvency ? 'مستوفي الملاءة' : 'معلّق' }}
                </h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card p-3 shadow-sm border-0 bg-light rounded text-center">
                <span class="text-muted d-block mb-1" style="font-size: 0.85rem;">نسبة الإنجاز الفعلية بالمشروع</span>
                <h3 class="mb-0 text-dark font-weight-bold">{{ project.executionPhase?.completionPercentage || 0 }}%</h3>
              </div>
            </div>
          </div>

          <!-- Progress Bar Section -->
          <div class="mb-5">
            <h5 class="section-title mb-3">مستوى إنجاز المشروع الميداني</h5>
            <p-progressBar [value]="project.executionPhase?.completionPercentage || 0" [showValue]="true" styleClass="premium-progress"></p-progressBar>
          </div>

          <div class="row g-5">
            <!-- Left Column: Details -->
            <div class="col-lg-6">
              <h5 class="section-title mb-4">بيانات الجهات ومراحل الإسناد</h5>
              
              <ul class="list-group list-group-flush border rounded p-3 bg-light">
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                  <span class="text-muted">الجهة المشرفة على التنفيذ</span>
                  <strong>{{ project.assignmentPhase?.supervisingEntityName || '-' }}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                  <span class="text-muted">الشركة المنفذة الميدانية</span>
                  <strong>{{ project.assignmentPhase?.executingEntityName || '-' }}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                  <span class="text-muted">الإدارة المسؤولة</span>
                  <strong>{{ project.assignmentPhase?.departmentName || '-' }}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                  <span class="text-muted">تاريخ اعتماد الإسناد</span>
                  <strong>{{ formatDate(project.assignmentPhase?.assignmentApprovalDate) }}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                  <span class="text-muted">مدة التنفيذ المقدرة</span>
                  <strong>{{ project.assignmentPhase?.executionDuration || '-' }} {{ project.assignmentPhase?.executionDurationUnit || '' }}</strong>
                </li>
              </ul>

              <!-- Execution Notes -->
              <div class="card border-0 bg-light p-4 mt-4" *ngIf="project.executionPhase?.notes">
                <h6 class="font-weight-bold text-dark mb-2">ملاحظات وتقارير المتابعة</h6>
                <p class="text-muted mb-0" style="line-height: 1.6;">{{ project.executionPhase?.notes }}</p>
              </div>
            </div>

            <!-- Right Column: Documents and Payments -->
            <div class="col-lg-6">
              <h5 class="section-title mb-4">الملفات والمرفقات الرسمية</h5>
              <div *ngIf="project.documents && project.documents.length > 0; else noDocs" class="table-responsive">
                <table class="table table-sm table-striped border rounded text-right">
                  <thead class="table-dark">
                    <tr>
                      <th>نوع المستند</th>
                      <th>اسم الملف</th>
                      <th>تاريخ الرفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let doc of project.documents">
                      <td>{{ doc.documentType }}</td>
                      <td>
                        <!-- Read-only name as we don't expose local filesystem files to public -->
                        <span class="text-dark font-weight-bold">{{ doc.documentName }}</span>
                      </td>
                      <td>{{ doc.uploadedAt | customDate: 'dd/MM/yyyy' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #noDocs>
                <div class="text-center p-4 border rounded bg-light text-muted">
                  لا توجد ملفات أو مرفقات عامة مدرجة حالياً.
                </div>
              </ng-template>

              <!-- Payments -->
              <h5 class="section-title mb-4 mt-5">سجل الدفعات والتحويلات المالية</h5>
              <div *ngIf="project.payments && project.payments.length > 0; else noPayments" class="table-responsive">
                <table class="table table-sm table-striped border rounded text-right">
                  <thead class="table-success">
                    <tr>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>طريقة التحويل</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let pay of project.payments">
                      <td>{{ pay.paymentDate | customDate: 'dd/MM/yyyy' }}</td>
                      <td class="font-weight-bold text-success">{{ formatCurrency(pay.paymentAmount) }} SAR</td>
                      <td>{{ pay.paymentMethod || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #noPayments>
                <div class="text-center p-4 border rounded bg-light text-muted">
                  لا توجد دفعات مالية مسجلة في هذا المشروع بعد.
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .share-container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 15px;
      font-family: 'Outfit', 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .loading-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
    }
    .header-cover {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      border-radius: 12px 12px 0 0;
      min-height: 220px;
    }
    .section-title {
      font-weight: 700;
      color: #1e3c72;
      border-right: 4px solid #1e3c72;
      padding-right: 12px;
      font-size: 1.15rem;
    }
    .stat-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
    }
    ::ng-deep .premium-progress .p-progressbar-value {
      background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%) !important;
      border-radius: 10px;
    }
    ::ng-deep .premium-progress.p-progressbar {
      height: 1.25rem !important;
      border-radius: 10px;
      background-color: #eef2f3;
    }
    .list-group-item {
      padding: 12px 8px;
    }
  `]
})
export class ProjectShareComponent implements OnInit {
  project: ProjectDetails | null = null;
  loading: boolean = true;
  shareToken: string = '';

  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['shareToken']) {
        this.shareToken = params['shareToken'];
        this.loadProjectDetails();
      } else {
        this.loading = false;
      }
    });
  }

  loadProjectDetails(): void {
    this.loading = true;
    this.projectService.getByShareToken(this.shareToken).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.project = res.data;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading project by share token:', err);
        this.loading = false;
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
