import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError, switchMap, timer } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SimulationOptions {
  simulateError?: boolean;
  errorCode?: string;
  delayMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacySimulationService {
  private readonly isSimulationMode = (environment as any).simulateBackend === true;

  constructor() {}

  /**
   * Logs an End-to-End flow step.
   */
  logFlowStep(stepName: string, payload: any): void {
    if (this.isSimulationMode) {
      console.log(`[E2E SIMULATION] Step: ${stepName}`, payload);
    }
  }

  /**
   * Simulates a network request with optional error generation.
   */
  private simulateRequest<T>(data: T, options?: SimulationOptions): Observable<T> {
    const defaultDelay = options?.delayMs || 1000;
    
    return timer(defaultDelay).pipe(
      switchMap(() => {
        if (options?.simulateError) {
          const errorPayload = {
            status: 400,
            error: {
              success: false,
              errorCode: options.errorCode || 'UNKNOWN_ERROR',
              message: `Simulated error: ${options.errorCode}`
            }
          };
          return throwError(() => errorPayload);
        }
        return of(data);
      })
    );
  }

  // --- MOCK DATA GENERATORS ---

  getBatches(options?: SimulationOptions): Observable<any[]> {
    this.logFlowStep('Fetching Batches', options);
    const mockBatches = [
      { id: 1, itemCode: 'DRG-1101', itemName: 'Amoxicillin 500mg', batchNo: 'AMX-24012', expiryDate: new Date(2026, 8, 10).toISOString(), quantity: 220, minQuantity: 80, storeName: 'المخزن الرئيسي', isQuarantined: false, notes: 'دفعة متاحة للصرف.' },
      { id: 2, itemCode: 'DRG-1102', itemName: 'Insulin FlexPen', batchNo: 'INS-24077', expiryDate: new Date(2026, 3, 21).toISOString(), quantity: 24, minQuantity: 20, storeName: 'الصيدلية الرئيسية', isQuarantined: false, notes: 'قريبة من الانتهاء.' },
      { id: 3, itemCode: 'DRG-1103', itemName: 'Atorvastatin 20mg', batchNo: 'ATR-23193', expiryDate: new Date(2026, 1, 27).toISOString(), quantity: 0, minQuantity: 30, storeName: 'المخزن الرئيسي', isQuarantined: true, notes: 'تم العزل في مخزن التوالف.' },
      { id: 4, itemCode: 'DRG-1104', itemName: 'Paracetamol Syrup', batchNo: 'PAR-24034', expiryDate: new Date(2027, 0, 9).toISOString(), quantity: 16, minQuantity: 40, storeName: 'فرع الشمال', isQuarantined: false, notes: 'الكمية أقل من الحد الأدنى.' },
      { id: 5, itemCode: 'DRG-1105', itemName: 'Metformin 850mg', batchNo: 'MET-24092', expiryDate: new Date(2027, 4, 14).toISOString(), quantity: 180, minQuantity: 70, storeName: 'المخزن الرئيسي', isQuarantined: false, notes: 'دفعة مستقرة.' }
    ];
    return this.simulateRequest(mockBatches, options);
  }

  getInteractions(options?: SimulationOptions): Observable<any[]> {
    this.logFlowStep('Fetching Interactions', options);
    const mockInteractions = [
      { id: 1, rxNo: 'RX-2026-1088', patientName: 'محمد ياسر', primaryDrug: 'Warfarin 5mg', interactingDrug: 'Aspirin 81mg', severity: 'critical', state: 'new', riskDescription: 'زيادة خطر النزيف عند الجمع بين الدوائين.', recommendation: 'يجب مراجعة الطبيب قبل الصرف وتعديل الجرعة.', pharmacist: 'ليلى أحمد', checkedAt: new Date(2026, 2, 7, 9, 20).toISOString() },
      { id: 2, rxNo: 'RX-2026-1087', patientName: 'رهف سمير', primaryDrug: 'Sertraline 50mg', interactingDrug: 'Tramadol 50mg', severity: 'major', state: 'doctor_contacted', riskDescription: 'احتمالية متلازمة السيروتونين.', recommendation: 'اقتراح بديل مسكن غير متداخل.', pharmacist: 'أحمد فاروق', checkedAt: new Date(2026, 2, 7, 8, 55).toISOString() },
      { id: 3, rxNo: 'RX-2026-1085', patientName: 'سارة صبري', primaryDrug: 'Metformin 850mg', interactingDrug: 'Cimetidine', severity: 'moderate', state: 'approved_override', riskDescription: 'قد يرفع مستوى الميتفورمين في الدم.', recommendation: 'متابعة وظائف الكلى وتوعية المريض.', pharmacist: 'هاني مجدي', checkedAt: new Date(2026, 2, 6, 16, 40).toISOString() },
      { id: 4, rxNo: 'RX-2026-1083', patientName: 'عبدالله سعد', primaryDrug: 'Atorvastatin 20mg', interactingDrug: 'Clarithromycin', severity: 'critical', state: 'blocked', riskDescription: 'ارتفاع خطر اعتلال العضلات الشديد.', recommendation: 'إيقاف الصرف وطلب بديل مضاد حيوي.', pharmacist: 'مريم علي', checkedAt: new Date(2026, 2, 6, 14, 15).toISOString() },
      { id: 5, rxNo: 'RX-2026-1081', patientName: 'ندى حاتم', primaryDrug: 'Levothyroxine', interactingDrug: 'Calcium Carbonate', severity: 'minor', state: 'approved_override', riskDescription: 'انخفاض امتصاص الدواء عند نفس التوقيت.', recommendation: 'فصل الجرعات بين الدواءين على الأقل 4 ساعات.', pharmacist: 'يوسف خالد', checkedAt: new Date(2026, 2, 5, 19, 30).toISOString() }
    ];
    return this.simulateRequest(mockInteractions, options);
  }

  updateInteractionState(interactionId: number, newState: string, options?: SimulationOptions): Observable<any> {
    this.logFlowStep('Updating Interaction State', { interactionId, newState });
    return this.simulateRequest({ success: true, updatedId: interactionId, state: newState }, options);
  }

  getReturns(options?: SimulationOptions): Observable<any[]> {
    this.logFlowStep('Fetching Returns', options);
    // Add realistic mock returns
    const mockReturns = [
      { id: 1, returnNo: 'RET-001', requestorName: 'Customer A', itemCode: 'DRG-1101', itemName: 'Amoxicillin 500mg', quantity: 2, status: 'pending', returnDate: new Date().toISOString() },
      { id: 2, returnNo: 'RET-002', requestorName: 'Customer B', itemCode: 'DRG-1102', itemName: 'Insulin FlexPen', quantity: 1, status: 'approved', returnDate: new Date().toISOString() }
    ];
    return this.simulateRequest(mockReturns, options);
  }
  
  processReturn(returnId: number, action: string, options?: SimulationOptions): Observable<any> {
    this.logFlowStep('Processing Return', { returnId, action });
    return this.simulateRequest({ success: true, returnId, status: action }, options);
  }

  getSallaOrders(options?: SimulationOptions): Observable<any[]> {
    this.logFlowStep('Fetching Salla Orders', options);
    const mockOrders = [
      { id: 1, referenceId: 'SAL-991', customerName: 'Salla Cust 1', total: 150, status: 'new', createdAt: new Date().toISOString() },
      { id: 2, referenceId: 'SAL-992', customerName: 'Salla Cust 2', total: 290, status: 'processing', createdAt: new Date().toISOString() }
    ];
    return this.simulateRequest(mockOrders, options);
  }

  importSallaOrder(orderId: number, options?: SimulationOptions): Observable<any> {
    this.logFlowStep('Importing Salla Order', { orderId });
    return this.simulateRequest({ success: true, orderId, importedAt: new Date().toISOString() }, options);
  }
}
