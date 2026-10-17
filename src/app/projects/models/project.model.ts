export interface Project {
  id: string;
  projectName: string;
  projectNumber?: string;
  fileNumber?: string;
  status: string;
  createdBy?: string;
  isActive: boolean;
  isFinancialSolvency?: boolean;
  totalAmount?: number;
  executionAmount?: number;
  profitPercentage?: number;
  createdAt: Date;
  documentsCount: number;
  paymentsCount: number;
  historyCount: number;
  hasAssignmentPhase: boolean;
  hasExecutionPhase: boolean;
  country?: string;
  commissionPercentage?: number;
  checkNumber?: string;
  checkReceiptDate?: Date;
  checkAmount?: number;
  clearingDetails?: string;
  companyDetailsId?: string;
  companyName?: string;
  shareToken?: string;
  departmentName?: string;
  supervisingEntityName?: string;
  executingCompanyName?: string;
  quoteNumber?: string;
  quoteDate?: Date;
  assignmentNumber?: string;
  assignmentApprovalDate?: Date;
  executionDuration?: number;
  executionDurationUnit?: string;
  milestones?: ProjectExecutionMilestone[];
}

export interface ProjectExecutionMilestone {
  id?: string;
  projectId?: string;
  milestoneName: string;
  duration: number;
  durationUnit: string;
  sequenceOrder: number;
  isCompleted?: boolean;
  completionDate?: Date | string;
  targetStartDate?: Date | string;
  targetEndDate?: Date | string;
}

export interface ProjectCheck {
  id?: string;
  checkNumber: string;
  checkReceiptDate: Date | string;
  checkAmount: number;
  treasuryId: string;
  treasuryName?: string;
  mainAccountId: string;
  mainAccountName?: string;
  paymentMethodType?: number;
  bankName?: string;
  bankReferenceNumber?: string;
  voucherNumber?: string;
  transactionNumber?: string;
  checkNumberDetail?: string;
}

export interface ProjectExecutingCompanyPayment {
  id?: string;
  projectId?: string;
  paymentNumber: string;
  paymentMethodType: number;
  amount: number;
  paymentDate: Date | string;
  treasuryId: string;
  treasuryName?: string;
  executingCompanyId?: string;
  executingCompanyName?: string;
  notes?: string;
  voucherNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  bankReferenceNumber?: string;
  transactionNumber?: string;
}

export interface ProjectDetails extends Project {
  assignmentPhase?: ProjectAssignmentPhase;
  executionPhase?: ProjectExecutionPhase;
  documents: ProjectDocument[];
  payments: ProjectPayment[];
  assessments: ProjectAssessment[];
  priceQuotes: ProjectPriceQuote[];
  history: ProjectHistory[];
  statementEntries: ProjectStatementEntry[];
  checks?: ProjectCheck[];
  executingCompanyPayments?: ProjectExecutingCompanyPayment[];
}

export interface ProjectStatementEntry {
  date: Date;
  type: string;
  referenceNumber: string;
  description: string;
  incomingAmount: number;
  outgoingAmount: number;
  runningBalance?: number;
  treasuryOrBankName?: string;
  paymentMethod?: string;
  paymentMethodType?: number;
}


export interface ProjectAssignmentPhase {
  id: string;
  projectId: string;
  executingEntityId?: string;
  executingEntityName?: string;
  supervisingEntityId?: string;
  supervisingEntityName?: string;
  departmentId?: string;
  departmentName?: string;
  assignmentDate?: Date;
  assignmentApprovalDate?: Date;
  executionStartDate?: Date;
  executionDuration?: number;
  executionDurationUnit?: string;
  notes?: string;
}

export interface ProjectExecutionPhase {
  id: string;
  projectId: string;
  companyId?: string;
  companyName?: string;
  grantAmount?: number;
  executionAmount?: number;
  remainingAmount?: number;
  completionPercentage?: number;
  transferIssued: boolean;
  transferDate?: Date;
  contractDataSent: boolean;
  contractSentDate?: Date;
  finalReportSent: boolean;
  finalReportDate?: Date;
  notes?: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  documentType: string;
  documentName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt: Date;
  metaData?: string;
}

export interface ProjectPayment {
  id: string;
  projectId: string;
  paymentDate: Date;
  paymentAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

export interface ProjectAssessment {
  id: string;
  projectId: string;
  documentId?: string;
  documentName?: string;
  assessmentDate: Date;
  assessedBy?: string;
  assessmentAmount?: number;
  notes?: string;
}

export interface ProjectPriceQuote {
  id: string;
  projectId: string;
  companyId?: string;
  companyName?: string;
  documentId?: string;
  documentName?: string;
  filePath?: string;
  quoteDate: Date;
  quoteNumber?: string;
  quoteAmount?: number;
  validUntil?: Date;
  isAccepted: boolean;
  notes?: string;
  saleInvoiceId?: number;
  customerName?: string;
  departmentName?: string;
}

export interface ProjectHistory {
  id: string;
  projectId: string;
  actionType: string;
  actionBy?: string;
  actionDate: Date;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}

export interface Company {
  id: string;
  companyName: string;
  companyType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Department {
  id: string;
  departmentName: string;
  departmentCode?: string;
}

export interface CreateProjectRequest {
  projectName: string;
  projectNumber?: string;
  fileNumber?: string;
  status: string;
  isActive?: boolean;
  isFinancialSolvency?: boolean;
  totalAmount?: number;
  executionAmount?: number;
  profitPercentage?: number;
  country?: string;
  commissionPercentage?: number;
  checkNumber?: string;
  checkReceiptDate?: Date;
  checkAmount?: number;
  clearingDetails?: string;
  companyDetailsId?: string;
  shareToken?: string;
  departmentName?: string;
  supervisingEntityName?: string;
  executingCompanyName?: string;
  quoteNumber?: string;
  quoteDate?: Date;
  assignmentNumber?: string;
  assignmentApprovalDate?: Date;
  executionDuration?: number;
  executionDurationUnit?: string;
  checks?: ProjectCheck[];
}

export interface UpdateProjectRequest {
  id: string;
  projectName: string;
  projectNumber?: string;
  fileNumber?: string;
  status: string;
  isActive: boolean;
  isFinancialSolvency?: boolean;
  totalAmount?: number;
  executionAmount?: number;
  profitPercentage?: number;
  country?: string;
  commissionPercentage?: number;
  checkNumber?: string;
  checkReceiptDate?: Date;
  checkAmount?: number;
  clearingDetails?: string;
  companyDetailsId?: string;
  shareToken?: string;
  departmentName?: string;
  supervisingEntityName?: string;
  executingCompanyName?: string;
  quoteNumber?: string;
  quoteDate?: Date;
  assignmentNumber?: string;
  assignmentApprovalDate?: Date;
  executionDuration?: number;
  executionDurationUnit?: string;
  checks?: ProjectCheck[];
  deletedChecks?: { id: string; reason: string }[];
}

export interface CreateProjectAssignmentPhaseRequest {
  projectId: string;
  executingEntityId?: string;
  executingEntityName?: string;
  supervisingEntityId?: string;
  supervisingEntityName?: string;
  departmentId?: string;
  departmentName?: string;
  assignmentDate?: Date;
  assignmentApprovalDate?: Date;
  executionStartDate?: Date;
  executionDuration?: number;
  executionDurationUnit?: string;
  notes?: string;
}

export interface CreateProjectExecutionPhaseRequest {
  projectId: string;
  companyId?: string;
  grantAmount?: number;
  executionAmount?: number;
  remainingAmount?: number;
  completionPercentage?: number;
  transferIssued?: boolean;
  transferDate?: Date;
  contractDataSent?: boolean;
  contractSentDate?: Date;
  finalReportSent?: boolean;
  finalReportDate?: Date;
  notes?: string;
}

export interface CreateProjectDocumentRequest {
  projectId: string;
  documentType: string;
  documentName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  metaData?: string;
}

export interface CreateProjectPaymentRequest {
  projectId: string;
  paymentDate: Date;
  paymentAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

export interface UpdateProjectPaymentRequest extends CreateProjectPaymentRequest {
  id: string;
}

export interface CreateProjectPriceQuoteRequest {
  projectId: string;
  quoteDate: Date;
  quoteNumber?: string;
  quoteAmount: number;
  validUntil?: Date;
  companyId?: string;
  documentId?: string;
  saleInvoiceId?: number | string;
}

export interface CreateProjectAssessmentRequest {
  projectId: string;
  assessmentDate: Date;
  assessedBy?: string;
  assessmentAmount: number;
  assessmentNotes?: string;
  documentId?: string;
}

export interface UpdateProjectAssessmentRequest extends CreateProjectAssessmentRequest {
  id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
