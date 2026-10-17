import { normalizeId } from '../../core/types/ids.types';

export interface PrescriptionViewModel {
  id: string;
  prescriptionNo: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  notes: string;
  status: string;
  insuranceStatus: string;
  totalAmount: number;
  date: Date;
  updatedAt: Date;
}

export function mapApiToViewModel(apiResponse: any): PrescriptionViewModel {
  if (!apiResponse) {
    return {
      id: '',
      prescriptionNo: '',
      patientId: '',
      patientName: 'Unknown',
      doctorId: '',
      doctorName: '',
      notes: '',
      status: 'unknown',
      insuranceStatus: 'pending',
      totalAmount: 0,
      date: new Date(),
      updatedAt: new Date()
    };
  }

  return {
    id: normalizeId(apiResponse.id),
    prescriptionNo: apiResponse.prescriptionNo || apiResponse.rxNo || '',
    patientId: normalizeId(apiResponse.patientId || apiResponse.patient?.id),
    patientName: apiResponse.patientName || apiResponse.patient?.fullName || '',
    doctorId: normalizeId(apiResponse.doctorId || apiResponse.doctor?.id),
    doctorName: apiResponse.doctorName || apiResponse.doctor?.fullName || '',
    notes: apiResponse.notes || '',
    status: (apiResponse.status || apiResponse.lifecycleState || 'draft').toLowerCase(),
    insuranceStatus: (apiResponse.insuranceStatus || apiResponse.insuranceApprovalStatus || 'pending').toLowerCase(),
    totalAmount: Number(apiResponse.totalAmount || 0),
    date: new Date(apiResponse.date || apiResponse.createdAt || Date.now()),
    updatedAt: new Date(apiResponse.updatedAt || apiResponse.createdAt || Date.now())
  };
}

export function mapViewModelToApiRequest(viewModel: PrescriptionViewModel): any {
  return {
    id: viewModel.id || undefined,
    prescriptionNo: viewModel.prescriptionNo,
    patientId: viewModel.patientId,
    doctorId: viewModel.doctorId || undefined,
    notes: viewModel.notes,
    status: viewModel.status
  };
}
