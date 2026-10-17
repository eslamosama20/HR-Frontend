export enum DocumentStatus {
  Draft = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Expired = 4,
  Cancelled = 5
}

export enum CheckType {
  Incoming = 0,
  Outgoing = 1
}

export enum CheckStatus {
  Pending = 0,
  Cashed = 1,
  Bounced = 2,
  Cancelled = 3
}

export enum LeaveType {
  Annual = 0,
  Sick = 1,
  Emergency = 2,
  Unpaid = 3,
  Maternity = 4,
  Paternity = 5,
  Other = 6
}

export enum LeaveStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3
}

export enum MaintenanceCycleType {
  Daily = 0,
  Weekly = 1,
  BiWeekly = 2,
  Monthly = 3,
  Quarterly = 4,
  SemiAnnual = 5,
  Annual = 6
}

export enum MachineStatus {
  Operational = 0,
  UnderMaintenance = 1,
  OutOfService = 2,
  Idle = 3
}

export enum EmploymentApplicationStatus {
  Received = 0,
  UnderReview = 1,
  InterviewScheduled = 2,
  Hired = 3,
  Rejected = 4,
  Withdrawn = 5
}

export enum InsuranceType {
  Social = 0,
  Health = 1,
  Life = 2,
  Accident = 3
}

export enum DocumentTemplateType {
  Authorization = 0,
  CashReceipt = 1,
  PriceQuotation = 2,
  TrustReceipt = 3,
  CheckRegister = 4,
  ProductAgreement = 5,
  CompanyDocument = 6,
  ResignationRequest = 7,
  HRTrustReceipt = 8,
  EmploymentApplication = 9,
  BankDocument = 10,
  InsuranceRecord = 11,
  SalarySlip = 12,
  LeaveApplication = 13,
  MaintenanceLog = 14,
  MaintenanceCycle = 15,
  CompanyBankAccount = 16,
  Contract = 17,
  Agreement = 18,
  Other = 19
}
