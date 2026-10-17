import { normalizeId } from '../../core/types/ids.types';

export interface ReadyPrescriptionLineViewModel {
  prescriptionItemId: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  batchNo: string;
  expiryDate: string;
  patientShare: number;
  insuranceShare: number;
  allocationStatus: string;
}

export interface ReadyPrescriptionViewModel {
  id: string;
  prescriptionId: string;
  prescriptionNo: string;
  patientName: string;
  patientId: string;
  pickupStatus: string;
  lines: ReadyPrescriptionLineViewModel[];
  financials: {
    totalAmount: number;
    patientShare: number;
    insuranceShare: number;
  };
}

export function mapApiToViewModel(apiResponse: any): ReadyPrescriptionViewModel {
  if (!apiResponse) {
    return {
      id: '',
      prescriptionId: '',
      prescriptionNo: '',
      patientName: 'Unknown Patient',
      patientId: '',
      pickupStatus: 'pending',
      lines: [],
      financials: {
        totalAmount: 0,
        patientShare: 0,
        insuranceShare: 0
      }
    };
  }

  const lines: ReadyPrescriptionLineViewModel[] = Array.isArray(apiResponse.lines || apiResponse.items)
    ? (apiResponse.lines || apiResponse.items).map((line: any) => ({
        prescriptionItemId: normalizeId(line.prescriptionItemId || line.lineId),
        itemId: normalizeId(line.itemId),
        name: line.name || line.itemName || '',
        quantity: Number(line.quantity || line.qty || 0),
        unitPrice: Number(line.unitPrice || 0),
        taxPercentage: Number(line.taxPercentage || 0),
        batchNo: line.batchNo || '',
        expiryDate: line.expiryDate || '',
        patientShare: Number(line.patientShare || 0),
        insuranceShare: Number(line.insuranceShare || 0),
        allocationStatus: (line.allocationStatus || 'pending').toLowerCase()
      }))
    : [];

  return {
    id: normalizeId(apiResponse.id || apiResponse.pickupId),
    prescriptionId: normalizeId(apiResponse.prescriptionId),
    prescriptionNo: apiResponse.prescriptionNo || apiResponse.rxNo || '',
    patientName: apiResponse.patientName || apiResponse.customerName || 'Unknown Patient',
    patientId: normalizeId(apiResponse.patientId),
    pickupStatus: (apiResponse.pickupStatus || apiResponse.status || 'pending').toLowerCase(),
    lines,
    financials: {
      totalAmount: Number(apiResponse.financials?.totalAmount ?? apiResponse.totalAmount ?? 0),
      patientShare: Number(apiResponse.financials?.patientShare ?? apiResponse.patientShare ?? 0),
      insuranceShare: Number(apiResponse.financials?.insuranceShare ?? apiResponse.insuranceShare ?? 0)
    }
  };
}

export function mapViewModelToApiRequest(viewModel: ReadyPrescriptionViewModel): any {
  return {
    pickupId: viewModel.id,
    prescriptionId: viewModel.prescriptionId,
    status: viewModel.pickupStatus
  };
}
