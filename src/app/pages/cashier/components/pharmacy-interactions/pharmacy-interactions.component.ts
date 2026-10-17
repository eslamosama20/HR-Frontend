import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PharmacySimulationService } from 'src/app/services/cashier/pharmacy-simulation.service';
import { InteractionViewModel, mapApiToInteractionViewModel, mapInteractionError } from 'src/app/adapters/pharmacy/interactions.adapter';
import { environment } from 'src/environments/environment';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';
type InteractionSeverity = 'critical' | 'major' | 'moderate' | 'minor';


@Component({
  selector: 'app-pharmacy-interactions',
  standalone: true,
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './pharmacy-interactions.component.html',
  styleUrls: ['./pharmacy-interactions.component.scss']
})
export class PharmacyInteractionsComponent implements OnInit {
  interactions = signal<InteractionViewModel[]>([]);
  selectedCase = signal<InteractionViewModel | null>(null);

  loading = signal(false);
  error = signal<string | null>(null);
  readonly enableInteractions = (environment as any).enableInteractions === true;

  searchTerm = '';
  selectedSeverity: string | 'all' = 'all';
  selectedState: string | 'all' = 'all';
  showDetailsDialog = false;

  get severityOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_CRITICAL'), value: 'critical' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MAJOR'), value: 'major' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MODERATE'), value: 'moderate' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MINOR'), value: 'minor' }
    ];
  }

  get stateOptions() {
    return [
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_ALL'), value: 'all' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_NEW'), value: 'new' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_DR_CONTACTED'), value: 'doctor_contacted' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_APPROVED_OVERRIDE'), value: 'approved_override' },
      { label: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_BLOCKED'), value: 'blocked' }
    ];
  }

  constructor(
    private messageService: MessageService,
    private translateService: TranslateService,
    private simulationService: PharmacySimulationService
  ) {}

  ngOnInit(): void {
    if (this.enableInteractions) {
      this.loadInteractions();
    }
  }

  get filteredInteractions(): InteractionViewModel[] {
    const keyword = this.searchTerm.trim().toLowerCase();
    return this.interactions().filter(item => {
      const severityMatch = this.selectedSeverity === 'all' || item.severity === this.selectedSeverity;
      const stateMatch = this.selectedState === 'all' || item.state === this.selectedState;
      const textMatch = !keyword || `${item.rxNo} ${item.patientName} ${item.primaryDrug} ${item.interactingDrug}`
        .toLowerCase()
        .includes(keyword);
      return severityMatch && stateMatch && textMatch;
    });
  }

  get criticalCount(): number {
    return this.interactions().filter(item => item.severity === 'critical').length;
  }

  get openCount(): number {
    return this.interactions().filter(item => item.state === 'new' || item.state === 'doctor_contacted').length;
  }

  get blockedCount(): number {
    return this.interactions().filter(item => item.state === 'blocked').length;
  }

  loadInteractions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.simulationService.getInteractions({ simulateError: false }).subscribe({
      next: (res) => {
        const mapped = res.map(item => mapApiToInteractionViewModel(item));
        this.interactions.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mapInteractionError(err?.error?.errorCode));
        this.loading.set(false);
      }
    });
  }

  openDetails(item: InteractionViewModel): void {
    this.selectedCase.set(item);
    this.showDetailsDialog = true;
  }

  updateState(item: InteractionViewModel, state: string): void {
    this.loading.set(true);
    this.simulationService.updateInteractionState(Number(item.id), state).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.interactions.update(list => list.map(record => {
          if (record.id !== item.id) {
            return record;
          }
          return { ...record, state: res.state as any };
        }));

        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('PHARMACY_INTERACTIONS.NOTIFY_UPDATED'),
          detail: this.translateService.instant('PHARMACY_INTERACTIONS.NOTIFY_STATE_SUCCESS', { no: item.rxNo })
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update interaction state.'
        });
      }
    });
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<InteractionSeverity, string> = {
      critical: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_CRITICAL'),
      major: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MAJOR'),
      moderate: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MODERATE'),
      minor: this.translateService.instant('PHARMACY_INTERACTIONS.SEVERITY_MINOR')
    };
    return labels[severity] || severity;
  }

  getSeverityTag(severity: string): TagSeverity {
    const map: Record<string, TagSeverity> = {
      critical: 'danger',
      major: 'warning',
      moderate: 'info',
      minor: 'secondary'
    };
    return map[severity] || 'secondary';
  }

  getStateLabel(state: string): string {
    const labels: Record<string, string> = {
      new: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_NEW'),
      doctor_contacted: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_DR_CONTACTED'),
      approved_override: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_APPROVED_OVERRIDE'),
      blocked: this.translateService.instant('PHARMACY_INTERACTIONS.STATE_BLOCKED')
    };
    return labels[state] || state;
  }

  getStateTag(state: string): TagSeverity {
    const map: Record<string, TagSeverity> = {
      new: 'warning',
      doctor_contacted: 'info',
      approved_override: 'success',
      blocked: 'danger'
    };
    return map[state] || 'secondary';
  }
}
