import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError, timeout } from 'rxjs/operators';
import {
  Project,
  ProjectDetails,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectAssignmentPhaseRequest,
  CreateProjectExecutionPhaseRequest,
  CreateProjectDocumentRequest,
  CreateProjectPaymentRequest,
  UpdateProjectPaymentRequest,
  CreateProjectPriceQuoteRequest,
  CreateProjectAssessmentRequest,
  UpdateProjectAssessmentRequest,
  ApiResponse,
  ProjectExecutionMilestone
} from '../models/project.model';
import { environment, enviroment_types } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
// Force rebuild

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.server_urls[environment.active_server].baseApi}projects`;
  
  // Cache للبيانات الثابتة
  private statusesCache$?: Observable<string[]>;
  
  // Request timeout
  private readonly REQUEST_TIMEOUT = 90000; // 90 ثانية

  constructor(private http: HttpClient, private translate: TranslateService) {}

  /**
   * Get all projects
   */
  getAll(includeInactive: boolean = false): Observable<ApiResponse<Project[]>> {
    const params = new HttpParams().set('includeInactive', includeInactive.toString());
    return this.http.get<ApiResponse<Project[]>>(this.apiUrl, { params }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(error => {
        console.error('Error loading projects:', error);
        return of({ success: false, data: [], message: 'حدث خطأ في التحميل' } as ApiResponse<Project[]>);
      })
    );
  }

  /**
   * Get project by ID (summary)
   */
  getById(id: string): Observable<ApiResponse<Project>> {
    return this.http.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`).pipe(
      timeout(this.REQUEST_TIMEOUT)
    );
  }

  /**
   * Get project details with all related data
   */
  getDetails(id: string): Observable<ApiResponse<ProjectDetails>> {
    return this.http.get<ApiResponse<ProjectDetails>>(`${this.apiUrl}/${id}/details`).pipe(
      timeout(this.REQUEST_TIMEOUT)
    );
  }

  /**
   * Get projects by status
   */
  getByStatus(status: string): Observable<ApiResponse<Project[]>> {
    return this.http.get<ApiResponse<Project[]>>(`${this.apiUrl}/by-status/${status}`).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(error => {
        console.error('Error loading projects by status:', error);
        return of({ success: false, data: [], message: 'حدث خطأ في التحميل' } as ApiResponse<Project[]>);
      })
    );
  }

  /**
   * Create new project
   */
  create(request: CreateProjectRequest): Observable<ApiResponse<Project>> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, request);
  }

  /**
   * Update existing project
   */
  update(id: string, request: UpdateProjectRequest): Observable<ApiResponse<Project>> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Delete project (soft delete)
   */
  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Change project status
   */
  changeStatus(id: string, newStatus: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${id}/status`, { newStatus });
  }

  /**
   * Get available project statuses (from backend API + fallback)
   */
  getStatuses(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/statuses`).pipe(
      map(res => {
        const statuses = res && res.data ? res.data : [];
        if (statuses.length > 0) {
          const defaultList = ['جديد', 'قيد الإسناد', 'مسند', 'قيد التنفيذ', 'منفذ', 'معلق', 'ملغي', 'مؤرشف'];
          const custom = statuses.filter(s => !defaultList.includes(s));
          localStorage.setItem('custom_project_statuses', JSON.stringify(custom));
          return statuses;
        }
        return this.getFallbackStatuses();
      }),
      catchError(() => of(this.getFallbackStatuses()))
    );
  }

  getFallbackStatuses(): string[] {
    const defaultStatuses = [
      'جديد',
      'قيد الإسناد',
      'مسند',
      'قيد التنفيذ',
      'منفذ',
      'معلق',
      'ملغي',
      'مؤرشف'
    ];

    const customStatuses = this.getCustomStatuses();
    const allStatuses = [...defaultStatuses];
    customStatuses.forEach(cs => {
      if (!allStatuses.includes(cs)) {
        allStatuses.push(cs);
      }
    });

    return allStatuses;
  }

  /**
   * Get custom user-added statuses from localStorage
   */
  getCustomStatuses(): string[] {
    try {
      const saved = localStorage.getItem('custom_project_statuses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  /**
   * Add a new custom project status to backend and localStorage
   */
  addCustomStatus(newStatus: string): Observable<string[]> {
    const trimmed = newStatus ? newStatus.trim() : '';
    if (!trimmed) return this.getStatuses();

    const currentCustom = this.getCustomStatuses();
    if (!currentCustom.includes(trimmed)) {
      currentCustom.push(trimmed);
      localStorage.setItem('custom_project_statuses', JSON.stringify(currentCustom));
    }

    return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}/statuses`, { status: trimmed }).pipe(
      map(res => (res && res.data) ? res.data : this.getFallbackStatuses()),
      catchError(() => of(this.getFallbackStatuses()))
    );
  }

  // ========== Assignment Phase Methods ==========
  
  /**
   * Add assignment phase to project
   */
  addAssignmentPhase(request: CreateProjectAssignmentPhaseRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/assignment-phase`, request);
  }

  /**
   * Update assignment phase
   */
  updateAssignmentPhase(projectId: string, request: CreateProjectAssignmentPhaseRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/assignment-phase`, request);
  }

  // ========== Execution Phase Methods ==========
  
  /**
   * Add execution phase to project
   */
  addExecutionPhase(request: CreateProjectExecutionPhaseRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/execution-phase`, request);
  }

  /**
   * Update execution phase
   */
  updateExecutionPhase(projectId: string, request: CreateProjectExecutionPhaseRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/execution-phase`, request);
  }

  // ========== Document Methods ==========
  
  /**
   * Add document to project
   */
  addDocument(request: CreateProjectDocumentRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/documents`, request);
  }

  /**
   * Delete document
   */
  deleteDocument(projectId: string, documentId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${projectId}/documents/${documentId}`);
  }

  // ========== Payment Methods ==========
  
  /**
   * Add payment to project
   */
  addPayment(request: CreateProjectPaymentRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/payments`, request);
  }

  /**
   * Delete payment
   */
  deletePayment(projectId: string, paymentId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${projectId}/payments/${paymentId}`);
  }

  /**
   * Update payment
   */
  updatePayment(projectId: string, paymentId: string, request: UpdateProjectPaymentRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/payments/${paymentId}`, request);
  }

  // ========== Price Quote Methods ==========

  /**
   * Add price quote to project
   */
  addPriceQuote(request: CreateProjectPriceQuoteRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/price-quotes`, request);
  }

  /**
   * Update price quote
   */
  updatePriceQuote(projectId: string, quoteId: string, request: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/price-quotes/${quoteId}`, request);
  }

  /**
   * Delete price quote
   */
  deletePriceQuote(projectId: string, quoteId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${projectId}/price-quotes/${quoteId}`);
  }

  /**
   * Accept price quote
   */
  acceptPriceQuote(projectId: string, quoteId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/${projectId}/price-quotes/${quoteId}/accept`, {});
  }

  // ========== Project Assessment Methods ==========

  /**
   * Add assessment to project
   */
  addAssessment(request: CreateProjectAssessmentRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${request.projectId}/assessments`, request);
  }

  /**
   * Update assessment
   */
  updateAssessment(projectId: string, assessmentId: string, request: UpdateProjectAssessmentRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/assessments/${assessmentId}`, request);
  }

  /**
   * Delete assessment
   */
  deleteAssessment(projectId: string, assessmentId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${projectId}/assessments/${assessmentId}`);
  }

  /**
   * Upload physical document file to project archive
   */
  uploadDocument(projectId: string, documentType: string, documentName: string, file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('documentName', documentName);
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${projectId}/upload-document`, formData);
  }

  /**
   * Update / rename project document
   */
  updateDocumentName(projectId: string, documentId: string, newName: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${projectId}/documents/${documentId}/rename`, { newName });
  }

  /**
   * Download account statement PDF file
   */
  downloadAccountStatementPdf(projectId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${projectId}/account-statement/pdf`, { responseType: 'blob' });
  }

  /**
   * Download project full archive PDF file
   */
  downloadProjectArchivePdf(projectId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${projectId}/archive/pdf`, { responseType: 'blob' });
  }

  /**
   * Get project details by public share token (anonymous)
   */
  getByShareToken(shareToken: string): Observable<ApiResponse<ProjectDetails>> {
    return this.http.get<ApiResponse<ProjectDetails>>(`${this.apiUrl}/share/${shareToken}`);
  }

  // ========== Helper Methods ==========
  
  /**
   * Get document types
   */
  getDocumentTypes(): string[] {
    return [
      this.translate.instant('DATA.DOCUMENT_TYPE_CONTRACT'),
      this.translate.instant('DATA.DOCUMENT_TYPE_PLANS'),
      this.translate.instant('DATA.DOCUMENT_TYPE_REPORT'),
      this.translate.instant('DATA.DOCUMENT_TYPE_IMAGES'),
      this.translate.instant('DATA.DOCUMENT_TYPE_OFFICIAL'),
      this.translate.instant('DATA.DOCUMENT_TYPE_OTHER')
    ];
  }

  /**
   * Get payment methods
   */
  getPaymentMethods(): string[] {
    return [
      this.translate.instant('DATA.PAYMENT_METHOD_CHECK'),
      this.translate.instant('DATA.PAYMENT_METHOD_BANK_TRANSFER'),
      this.translate.instant('DATA.PAYMENT_METHOD_CASH'),
      this.translate.instant('DATA.PAYMENT_METHOD_OTHER')
    ];
  }

  /**
   * Get duration units
   */
  getDurationUnits(): string[] {
    return [
      this.translate.instant('DATA.DURATION_UNIT_DAY'),
      this.translate.instant('DATA.DURATION_UNIT_WEEK'),
      this.translate.instant('DATA.DURATION_UNIT_MONTH'),
      this.translate.instant('DATA.DURATION_UNIT_YEAR')
    ];
  }

  /**
   * Toggle milestone completion status
   */
  toggleMilestone(milestoneId: string, isCompleted: boolean): Observable<ApiResponse<ProjectExecutionMilestone>> {
    return this.http.post<ApiResponse<ProjectExecutionMilestone>>(`${this.apiUrl}/milestones/${milestoneId}/toggle`, { isCompleted }).pipe(
      timeout(this.REQUEST_TIMEOUT)
    );
  }
}
