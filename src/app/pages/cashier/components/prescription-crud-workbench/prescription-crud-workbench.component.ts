import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PrescriptionCrudService, PrescriptionPatientOption } from 'src/app/services/cashier/prescription-crud.service';
import {
  InsuranceApprovalUiStatus,
  PrescriptionDto,
  PrescriptionLifecycleUiState
} from 'src/app/models/cashier/pharmacy-prescription-pos.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-prescription-crud-workbench',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    TableModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './prescription-crud-workbench.component.html',
  styleUrls: ['./prescription-crud-workbench.component.scss']
})
export class PrescriptionCrudWorkbenchComponent implements OnInit {
  readonly prescriptions = signal<PrescriptionDto[]>([]);
  patientOptions: PrescriptionPatientOption[] = [];
  readonly enablePrescriptionWorkbench = (environment as any).enablePrescriptionWorkbench === true;
  
  readonly isLoading = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);

  readonly lifecycleOptions: { label: string; value: PrescriptionLifecycleUiState }[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Editing', value: 'editing' },
    { label: 'Ready', value: 'ready' }
  ];

  readonly approvalOptions: { label: string; value: InsuranceApprovalUiStatus }[] = [
    { label: 'NPHIES — Pending', value: 'pending' },
    { label: 'NPHIES — Approved', value: 'approved' },
    { label: 'NPHIES — Rejected', value: 'rejected' }
  ];

  form: FormGroup;
  editingId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private crud: PrescriptionCrudService,
    private messageService: MessageService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {
    this.patientOptions = this.crud.getPatientOptions();
    this.form = this.fb.group({
      prescriptionNo: ['', [Validators.required, Validators.maxLength(40)]],
      patientId: ['', Validators.required],
      doctorName: ['', [Validators.required, Validators.maxLength(120)]],
      lifecycleState: ['draft' as PrescriptionLifecycleUiState, Validators.required],
      insuranceApprovalStatus: ['pending' as InsuranceApprovalUiStatus, Validators.required],
      notes: ['', Validators.maxLength(2000)],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.enablePrescriptionWorkbench) {
      // Load patient options dynamically from backend/patient files
      this.crud.loadPatientOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (options) => {
          this.patientOptions = options;
        },
        error: (err) => {
          console.warn('[Pharmacy Workbench] Failed to load dynamic patient options:', err);
        }
      });

      this.crud.prescriptions$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => {
        this.prescriptions.set(rows);
      });
      
      this.isLoading.set(true);
      this.hasError.set(false);
      this.crud.loadPrescriptions().subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('[Pharmacy Workbench] Failed to load prescriptions:', err);
          this.isLoading.set(false);
          this.hasError.set(true);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('CASHIER_POS.WARNING'),
            detail: 'فشل تحميل الوصفات الطبية من الخادم'
          });
        }
      });
      
      this.newDraft();
    }
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItemRow(): void {
    this.items.push(
      this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(200)]],
        qty: [1, [Validators.required, Validators.min(0.01), Validators.max(9999)]],
        dosage: ['', Validators.maxLength(200)],
        notes: ['', Validators.maxLength(500)],
        batchNo: ['', Validators.maxLength(80)],
        expiryDate: ['', Validators.maxLength(32)]
      })
    );
  }

  removeItemRow(index: number): void {
    this.items.removeAt(index);
    if (this.items.length === 0) {
      this.addItemRow();
    }
  }

  newDraft(): void {
    this.editingId = null;
    this.form.reset({
      prescriptionNo: '',
      patientId: '',
      doctorName: '',
      lifecycleState: 'draft',
      insuranceApprovalStatus: 'pending',
      notes: ''
    });
    this.items.clear();
    this.addItemRow();
  }

  loadForEdit(row: PrescriptionDto): void {
    this.editingId = row.id;
    this.form.patchValue({
      prescriptionNo: row.prescriptionNo,
      patientId: row.patient.patientId ?? '',
      doctorName: row.doctorName ?? '',
      lifecycleState: row.lifecycleState,
      insuranceApprovalStatus: row.insuranceApprovalStatus,
      notes: row.notes ?? ''
    });
    this.items.clear();
    for (const it of row.items) {
      this.items.push(
        this.fb.group({
          name: [it.name, [Validators.required, Validators.maxLength(200)]],
          qty: [it.qty, [Validators.required, Validators.min(0.01), Validators.max(9999)]],
          dosage: [it.dosage ?? '', Validators.maxLength(200)],
          notes: [it.notes ?? '', Validators.maxLength(500)],
          batchNo: [it.batchNo ?? '', Validators.maxLength(80)],
          expiryDate: [it.expiryDate ?? '', Validators.maxLength(32)]
        })
      );
    }
    if (this.items.length === 0) {
      this.addItemRow();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('CASHIER_POS.WARNING'),
        detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.VALIDATION_FIX')
      });
      return;
    }

    const patient = this.patientOptions.find((p) => p.patientId === this.form.value.patientId);
    if (!patient) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('CASHIER_POS.WARNING'),
        detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.PATIENT_REQUIRED')
      });
      return;
    }

    const itemPayload = this.items.controls
      .map((c) => c.value)
      .filter((v) => (v.name || '').trim())
      .map((v) => ({
        name: v.name.trim(),
        qty: Number(v.qty),
        dosage: (v.dosage || '').trim() || undefined,
        notes: (v.notes || '').trim() || undefined,
        batchNo: (v.batchNo || '').trim() || undefined,
        expiryDate: (v.expiryDate || '').trim() || undefined
      }));

    if (!itemPayload.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('CASHIER_POS.WARNING'),
        detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.ITEMS_REQUIRED')
      });
      return;
    }

    const patientRef = {
      patientId: patient.patientId,
      displayName: patient.displayName,
      nationalId: patient.nationalId,
      phone: patient.phone
    };

    if (this.editingId) {
      this.crud
        .updatePrescription(this.editingId, {
          prescriptionNo: this.form.value.prescriptionNo,
          patient: patientRef,
          doctorName: this.form.value.doctorName,
          notes: this.form.value.notes,
          lifecycleState: this.form.value.lifecycleState,
          insuranceApprovalStatus: this.form.value.insuranceApprovalStatus
        })
        .subscribe({
          next: (updatedRx) => {
            const requestedState = this.form.value.lifecycleState;
            const actualState = updatedRx.lifecycleState;

            if (actualState !== requestedState) {
              console.warn('[Pharmacy CRUD] Server did not persist state change. Expected:', requestedState, 'Actual:', actualState);
              this.messageService.add({
                severity: 'warn',
                summary: 'تنبيه الاتصال',
                detail: 'تم إرسال الطلب لكن السيرفر لم يثبت تغيير الحالة.'
              });
            } else {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('PHARMACY_CRUD_WORKBENCH.UPDATED'),
                detail: this.form.value.prescriptionNo
              });
            }
            // Force refresh list from backend server
            this.crud.loadPrescriptions().subscribe();
            this.newDraft();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('CASHIER_POS.WARNING'),
              detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.SAVE_FAILED')
            });
          }
        });
      return;
    }

    const lifecycle = this.form.value.lifecycleState as PrescriptionLifecycleUiState;

    this.crud
      .createPrescription({
        prescriptionNo: this.form.value.prescriptionNo,
        patient: patientRef,
        doctorName: this.form.value.doctorName,
        notes: this.form.value.notes,
        items: itemPayload,
        insuranceApprovalStatus: this.form.value.insuranceApprovalStatus
      })
      .pipe(
        switchMap((created) =>
          lifecycle !== 'draft'
            ? this.crud.updatePrescription(created.id, { lifecycleState: lifecycle })
            : of(created)
        )
      )
      .subscribe({
        next: (finalRx) => {
          const requestedState = this.form.value.lifecycleState;
          const actualState = finalRx.lifecycleState;

          if (actualState !== requestedState) {
            console.warn('[Pharmacy CRUD] Server did not persist state change on create. Expected:', requestedState, 'Actual:', actualState);
            this.messageService.add({
              severity: 'warn',
              summary: 'تنبيه الاتصال',
              detail: 'تم إنشاء الوصفة ولكن السيرفر لم يثبت تغيير الحالة المطلوب.'
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('PHARMACY_CRUD_WORKBENCH.CREATED'),
              detail: this.form.value.prescriptionNo
            });
          }
          // Force refresh list from backend server
          this.crud.loadPrescriptions().subscribe();
          this.newDraft();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('CASHIER_POS.WARNING'),
            detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.SAVE_FAILED')
          });
        }
      });
  }

  removeServerLine(row: PrescriptionDto, clientLineId: string): void {
    this.crud.removeItem(row.id, clientLineId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: this.translate.instant('PHARMACY_CRUD_WORKBENCH.LINE_REMOVED'),
          detail: row.prescriptionNo
        });
        // Force refresh list from backend server
        this.crud.loadPrescriptions().subscribe();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('CASHIER_POS.WARNING'),
          detail: this.translate.instant('PHARMACY_CRUD_WORKBENCH.SAVE_FAILED')
        })
    });
  }

  lifecycleSeverity(s: PrescriptionLifecycleUiState): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (s) {
      case 'ready':
        return 'success';
      case 'editing':
        return 'info';
      default:
        return 'warning';
    }
  }

  approvalSeverity(s: InsuranceApprovalUiStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    switch (s) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warning';
    }
  }
}
