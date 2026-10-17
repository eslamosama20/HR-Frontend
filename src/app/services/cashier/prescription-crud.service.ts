import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, switchMap, tap, catchError } from 'rxjs/operators';
import {
  PrescriptionDto,
  PrescriptionItemDto,
  PrescriptionLifecycleUiState,
  PrescriptionPatientRefDto,
  InsuranceApprovalUiStatus
} from 'src/app/models/cashier/pharmacy-prescription-pos.model';
import { PharmacySupportApiService, CreatePrescriptionItemApiRequest, ManualCreatePrescriptionRequest } from './pharmacy-support-api.service';
import { environment } from 'src/environments/environment';
import { isGuidString, normalizeId } from 'src/app/core/types/ids.types';

function newClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface PrescriptionPatientOption {
  patientId: string;
  displayName: string;
  nationalId?: string;
  phone?: string;
}

/**
 * Prescription CRUD service.
 *
 * When `simulateBackend` is true — uses in-memory BehaviorSubject store (mock).
 * When `simulateBackend` is false — routes all calls through PharmacySupportApiService (real HTTP).
 */
@Injectable({
  providedIn: 'root'
})
export class PrescriptionCrudService {
  private readonly isSimulation = (environment as any).simulateBackend === true;

  // --- Patient seeds (used by simulation AND by component dropdown) ---
  private readonly patientSeeds: PrescriptionPatientOption[] = [
    { patientId: 'P-100', displayName: 'نورة عبدالله', nationalId: '10*********', phone: '0550001111' },
    { patientId: 'P-101', displayName: 'خالد سالم', nationalId: '11*********', phone: '0550002222' },
    { patientId: 'P-102', displayName: 'ريم فهد', nationalId: '12*********', phone: '0550003333' }
  ];

  // --- In-memory store for simulation mode ---
  private idSeq = 7000;
  private readonly store = new BehaviorSubject<PrescriptionDto[]>([]);

  readonly prescriptions$ = this.isSimulation
    ? this.store.asObservable()
    : new BehaviorSubject<PrescriptionDto[]>([]).asObservable(); // replaced on first load

  // --- Live data store for real backend ---
  private readonly liveStore = new BehaviorSubject<PrescriptionDto[]>([]);

  constructor(private pharmacyApi: PharmacySupportApiService) {
    if (!this.isSimulation) {
      // Wire prescriptions$ to live data
      (this as any).prescriptions$ = this.liveStore.asObservable();
    }
  }

  private normalizeGuid(value: any): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (!str) return null;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(str) ? str.toLowerCase() : null;
  }

  private capitalize(val: string): string {
    if (!val) return '';
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  private buildPrescriptionUpdatePayload(
    id: string,
    patch: Partial<Pick<PrescriptionDto, 'prescriptionNo' | 'patient' | 'doctorName' | 'notes' | 'lifecycleState' | 'insuranceApprovalStatus'>>
  ): any {
    const apiPayload: any = {};
    
    // Pass GUID ID inside body if possible
    const normalizedId = this.normalizeGuid(id);
    if (normalizedId) {
      apiPayload.id = normalizedId;
    }

    if (patch.prescriptionNo !== undefined) {
      apiPayload.prescriptionNo = patch.prescriptionNo;
      apiPayload.rxNo = patch.prescriptionNo;
    }
    
    // Normalize patientId GUID using our safe helper
    if (patch.patient !== undefined) {
      apiPayload.patientId = this.normalizeGuid(patch.patient?.patientId);
    }
    
    if (patch.notes !== undefined) {
      apiPayload.notes = patch.notes;
    }
    if (patch.lifecycleState !== undefined) {
      // Send both status and lifecycleState in PascalCase format for DTO binding
      const stateVal = patch.lifecycleState;
      const capitalizedState = this.capitalize(stateVal); // 'Ready', 'Draft', 'Editing'
      apiPayload.lifecycleState = capitalizedState;
      apiPayload.status = capitalizedState;
    }
    if (patch.insuranceApprovalStatus !== undefined) {
      // Send both insuranceStatus and insuranceApprovalStatus in PascalCase format
      const insVal = patch.insuranceApprovalStatus;
      const capitalizedIns = this.capitalize(insVal); // 'Pending', 'Approved', 'Rejected'
      apiPayload.insuranceApprovalStatus = capitalizedIns;
      apiPayload.insuranceStatus = capitalizedIns;
    }

    console.debug('[Pharmacy CRUD] Built Prescription Update Payload:', apiPayload);

    // Wrap in the "rx" object as strictly expected by the backend
    return { rx: apiPayload };
  }

  getPatientOptions(): PrescriptionPatientOption[] {
    return [...this.patientSeeds];
  }

  loadPatientOptions(): Observable<PrescriptionPatientOption[]> {
    if (this.isSimulation) {
      return of([...this.patientSeeds]);
    }
    return this.pharmacyApi.getPatients(1, 200).pipe(
      map((patients) =>
        patients.map((p) => ({
          patientId: p.id,
          displayName: p.fullName || p.phone || '',
          nationalId: p.nationalId,
          phone: p.phone
        }))
      ),
      catchError((err) => {
        console.warn('[Pharmacy CRUD] Failed to load dynamic patient options, falling back to seeds:', err);
        return of([...this.patientSeeds]);
      })
    );
  }

  /**
   * Load prescriptions list from backend (real mode) or return local store (simulation).
   */
  loadPrescriptions(): Observable<PrescriptionDto[]> {
    if (this.isSimulation) {
      return this.store.pipe(map((rows) => [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
    }

    return this.pharmacyApi.getPrescriptions(1, 200).pipe(
      map((items) => items.map((item: any) => this.mapApiToPrescriptionDto(item))),
      tap((rows) => this.liveStore.next(rows))
    );
  }

  list(): Observable<PrescriptionDto[]> {
    if (this.isSimulation) {
      return this.store.pipe(map((rows) => [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
    }
    return this.loadPrescriptions();
  }

  getById(id: string): Observable<PrescriptionDto | undefined> {
    if (this.isSimulation) {
      return this.store.pipe(
        map((rows) => rows.find((r) => r.id === id || r.serverPrescriptionId === id))
      );
    }

    return this.pharmacyApi.getPrescriptionById(id).pipe(
      map((response) => this.mapApiToPrescriptionDto(response))
    );
  }

  createPrescription(input: {
    prescriptionNo: string;
    patient: PrescriptionPatientRefDto;
    doctorName?: string;
    notes?: string;
    items: Omit<PrescriptionItemDto, 'clientLineId' | 'serverLineId'>[];
    insuranceApprovalStatus?: InsuranceApprovalUiStatus;
  }): Observable<PrescriptionDto> {
    if (this.isSimulation) {
      return this.createPrescriptionMock(input);
    }

    const noteParts: string[] = [];
    if (input.prescriptionNo?.trim()) {
      noteParts.push(`Ref: ${input.prescriptionNo.trim()}`);
    }
    if (input.notes?.trim()) {
      noteParts.push(input.notes.trim());
    }
    if (input.doctorName?.trim()) {
      noteParts.push(`Doctor: ${input.doctorName.trim()}`);
    }
    const combinedNotes = noteParts.length ? noteParts.join(' | ') : undefined;

    const patientGuid = this.normalizeGuid(input.patient.patientId);

    const manualBody: ManualCreatePrescriptionRequest = {
      patientId: patientGuid,
      notes: combinedNotes,
      storeDetailsId: null,
      items: input.items.map((line) => {
        const itemId = this.normalizeGuid(line.catalogItemId);
        return {
          itemId,
          itemName: line.name?.trim() || 'Item',
          quantity: Number(line.qty) || 1,
          dosage: line.dosage?.trim() || null,
          instructions: line.notes?.trim() || null
        };
      })
    };

    return this.pharmacyApi.createManualPrescription(manualBody).pipe(
      map((res: any) => {
        const id = normalizeId(res?.id ?? res?.data?.id);
        const now = new Date().toISOString();
        const rx = `${res?.rxNo ?? res?.prescriptionNo ?? input.prescriptionNo ?? ''}`.trim();
        const dto: PrescriptionDto = {
          id: id || newClientId(),
          serverPrescriptionId: id,
          prescriptionNo: rx || input.prescriptionNo,
          patient: { ...input.patient },
          doctorName: input.doctorName?.trim(),
          notes: input.notes?.trim(),
          items: input.items.map((line) => ({
            ...line,
            clientLineId: newClientId(),
            serverLineId: undefined
          })),
          lifecycleState: 'draft',
          insuranceApprovalStatus: input.insuranceApprovalStatus ?? 'pending',
          createdAt: res?.createdAt ? new Date(res.createdAt).toISOString() : now,
          updatedAt: now
        };
        return dto;
      }),
      tap((dto) => {
        this.liveStore.next([dto, ...this.liveStore.value]);
      })
    );
  }

  updatePrescription(
    id: string,
    patch: Partial<Pick<PrescriptionDto, 'prescriptionNo' | 'patient' | 'doctorName' | 'notes' | 'lifecycleState' | 'insuranceApprovalStatus'>>
  ): Observable<PrescriptionDto> {
    if (this.isSimulation) {
      return this.updatePrescriptionMock(id, patch);
    }

    const wrappedPayload = this.buildPrescriptionUpdatePayload(id, patch);

    return this.pharmacyApi.updatePrescription(id, wrappedPayload).pipe(
      switchMap(() => {
        // Refresh the specific prescription from backend
        return this.pharmacyApi.getPrescriptionById(id).pipe(
          map((response) => this.mapApiToPrescriptionDto(response))
        );
      }),
      tap((updated) => {
        const list = this.liveStore.value.map((r) => r.serverPrescriptionId === id || r.id === id ? updated : r);
        this.liveStore.next(list);
      })
    );
  }

  addItem(
    prescriptionId: string,
    item: Omit<PrescriptionItemDto, 'clientLineId' | 'serverLineId'>
  ): Observable<PrescriptionDto> {
    if (this.isSimulation) {
      return this.addItemMock(prescriptionId, item);
    }

    const apiItem: CreatePrescriptionItemApiRequest = {
      itemId: this.normalizeGuid(item.catalogItemId) || '',
      name: item.name.trim(),
      quantity: Number(item.qty),
      dosage: item.dosage?.trim(),
      notes: item.notes?.trim(),
      batchNo: item.batchNo?.trim(),
      expiryDate: item.expiryDate?.trim()
    };

    return this.pharmacyApi.addPrescriptionItem(prescriptionId, apiItem).pipe(
      switchMap(() => this.pharmacyApi.getPrescriptionById(prescriptionId)),
      map((response) => this.mapApiToPrescriptionDto(response)),
      tap((updated) => {
        const list = this.liveStore.value.map((r) => r.serverPrescriptionId === prescriptionId || r.id === prescriptionId ? updated : r);
        this.liveStore.next(list);
      })
    );
  }

  removeItem(prescriptionId: string, lineId: string): Observable<PrescriptionDto> {
    if (this.isSimulation) {
      return this.removeItemMock(prescriptionId, lineId);
    }

    return this.pharmacyApi.deletePrescriptionItem(prescriptionId, lineId).pipe(
      switchMap(() => this.pharmacyApi.getPrescriptionById(prescriptionId)),
      map((response) => this.mapApiToPrescriptionDto(response)),
      tap((updated) => {
        const list = this.liveStore.value.map((r) => r.serverPrescriptionId === prescriptionId || r.id === prescriptionId ? updated : r);
        this.liveStore.next(list);
      })
    );
  }

  // ══════════════════════════════════════════
  // Backend response → PrescriptionDto mapper
  // ══════════════════════════════════════════

  private mapApiToPrescriptionDto(source: any): PrescriptionDto {
    return {
      id: normalizeId(source?.id),
      serverPrescriptionId: normalizeId(source?.id),
      prescriptionNo: source?.prescriptionNo || source?.rxNo || '',
      patient: {
        patientId: normalizeId(source?.patient?.id || source?.patientId),
        displayName: source?.patient?.fullName || source?.patientName || '',
        nationalId: source?.patient?.nationalId,
        phone: source?.patient?.phone
      },
      doctorName: source?.doctor?.fullName || source?.doctorName || '',
      notes: source?.notes || '',
      items: Array.isArray(source?.items)
        ? source.items.map((item: any) => ({
            clientLineId: normalizeId(item.lineId) || newClientId(),
            serverLineId: normalizeId(item.lineId),
            catalogItemId: normalizeId(item.itemId),
            name: item.name || item.itemName || '',
            qty: Number(item.quantity || item.qty || 0),
            dosage: item.dosage || '',
            notes: item.notes || '',
            batchNo: item.batchNo || '',
            expiryDate: item.expiryDate || ''
          }))
        : [],
      lifecycleState: (source?.lifecycleState || source?.status || 'draft').toLowerCase() as PrescriptionLifecycleUiState,
      insuranceApprovalStatus: (source?.insuranceApprovalStatus || source?.insuranceStatus || 'pending').toLowerCase() as InsuranceApprovalUiStatus,
      createdAt: source?.createdAt || new Date().toISOString(),
      updatedAt: source?.updatedAt || new Date().toISOString()
    };
  }

  // ══════════════════════════════════════════
  // Simulation (mock) methods — kept for fallback
  // ══════════════════════════════════════════

  private createPrescriptionMock(input: {
    prescriptionNo: string;
    patient: PrescriptionPatientRefDto;
    doctorName?: string;
    notes?: string;
    items: Omit<PrescriptionItemDto, 'clientLineId' | 'serverLineId'>[];
    insuranceApprovalStatus?: InsuranceApprovalUiStatus;
  }): Observable<PrescriptionDto> {
    const now = new Date().toISOString();
    const serverId = `SRV-RX-${++this.idSeq}`;
    const dto: PrescriptionDto = {
      id: newClientId(),
      serverPrescriptionId: serverId,
      prescriptionNo: input.prescriptionNo.trim(),
      patient: { ...input.patient },
      doctorName: input.doctorName?.trim(),
      notes: input.notes?.trim(),
      items: input.items.map((line) => ({
        ...line,
        clientLineId: newClientId(),
        serverLineId: `SRV-LN-${++this.idSeq}`
      })),
      lifecycleState: 'draft',
      insuranceApprovalStatus: input.insuranceApprovalStatus ?? 'pending',
      createdAt: now,
      updatedAt: now
    };
    return of(dto).pipe(
      delay(180),
      tap((row) => this.store.next([row, ...this.store.value]))
    );
  }

  private updatePrescriptionMock(
    id: string,
    patch: Partial<Pick<PrescriptionDto, 'prescriptionNo' | 'patient' | 'doctorName' | 'notes' | 'lifecycleState' | 'insuranceApprovalStatus'>>
  ): Observable<PrescriptionDto> {
    const now = new Date().toISOString();
    const next = this.store.value.map((row) => {
      if (row.id !== id && row.serverPrescriptionId !== id) {
        return row;
      }
      return {
        ...row,
        ...patch,
        patient: patch.patient ? { ...patch.patient } : row.patient,
        updatedAt: now,
        lifecycleState: (patch.lifecycleState ?? row.lifecycleState) as PrescriptionLifecycleUiState
      };
    });
    const updated = next.find((r) => r.id === id || r.serverPrescriptionId === id);
    if (!updated) {
      return throwError(() => new Error('PRESCRIPTION_NOT_FOUND'));
    }
    return of(updated).pipe(delay(160), tap(() => this.store.next(next)));
  }

  private addItemMock(
    prescriptionId: string,
    item: Omit<PrescriptionItemDto, 'clientLineId' | 'serverLineId'>
  ): Observable<PrescriptionDto> {
    const now = new Date().toISOString();
    const line: PrescriptionItemDto = {
      ...item,
      clientLineId: newClientId(),
      serverLineId: `SRV-LN-${++this.idSeq}`
    };
    const next = this.store.value.map((row) => {
      if (row.id !== prescriptionId && row.serverPrescriptionId !== prescriptionId) {
        return row;
      }
      return {
        ...row,
        items: [...row.items, line],
        updatedAt: now,
        lifecycleState: 'editing' as PrescriptionLifecycleUiState
      };
    });
    const updated = next.find((r) => r.id === prescriptionId || r.serverPrescriptionId === prescriptionId);
    if (!updated) {
      return throwError(() => new Error('PRESCRIPTION_NOT_FOUND'));
    }
    return of(updated).pipe(delay(120), tap(() => this.store.next(next)));
  }

  private removeItemMock(prescriptionId: string, clientLineId: string): Observable<PrescriptionDto> {
    const now = new Date().toISOString();
    const next = this.store.value.map((row) => {
      if (row.id !== prescriptionId && row.serverPrescriptionId !== prescriptionId) {
        return row;
      }
      return {
        ...row,
        items: row.items.filter((l) => l.clientLineId !== clientLineId),
        updatedAt: now
      };
    });
    const updated = next.find((r) => r.id === prescriptionId || r.serverPrescriptionId === prescriptionId);
    if (!updated) {
      return throwError(() => new Error('PRESCRIPTION_NOT_FOUND'));
    }
    return of(updated).pipe(delay(100), tap(() => this.store.next(next)));
  }
}
