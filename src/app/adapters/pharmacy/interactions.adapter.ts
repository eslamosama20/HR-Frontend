import { normalizeId } from '../../core/types/ids.types';

export interface InteractionViewModel {
  id: string;
  rxNo: string;
  patientName: string;
  primaryDrug: string;
  interactingDrug: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  state: 'new' | 'doctor_contacted' | 'approved_override' | 'blocked';
  riskDescription: string;
  recommendation: string;
  pharmacist: string;
  checkedAt: Date;
}

export function mapApiToInteractionViewModel(apiResponse: any): InteractionViewModel {
  if (!apiResponse) {
    return {
      id: '', rxNo: '', patientName: 'Unknown', primaryDrug: '', interactingDrug: '',
      severity: 'minor', state: 'new', riskDescription: '', recommendation: '',
      pharmacist: '', checkedAt: new Date()
    };
  }

  return {
    id: normalizeId(apiResponse.id || apiResponse.interactionId),
    rxNo: apiResponse.rxNo || apiResponse.prescriptionNo || '',
    patientName: apiResponse.patientName || apiResponse.customerName || 'Unknown',
    primaryDrug: apiResponse.primaryDrug || apiResponse.drugA || '',
    interactingDrug: apiResponse.interactingDrug || apiResponse.drugB || '',
    severity: (apiResponse.severity || 'minor').toLowerCase(),
    state: (apiResponse.state || apiResponse.status || 'new').toLowerCase(),
    riskDescription: apiResponse.riskDescription || apiResponse.risk || '',
    recommendation: apiResponse.recommendation || apiResponse.action || '',
    pharmacist: apiResponse.pharmacist || apiResponse.user || '',
    checkedAt: new Date(apiResponse.checkedAt || apiResponse.createdAt || Date.now())
  };
}

export function mapInteractionError(errorCode: string): string {
  switch (errorCode?.toUpperCase()) {
    case 'INTERACTION_NOT_FOUND': return 'Interaction record was not found.';
    case 'OVERRIDE_DENIED': return 'You do not have permission to override this interaction.';
    default: return 'An unknown error occurred while fetching interactions.';
  }
}
