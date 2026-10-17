import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-zid-empty-state',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule],
  template: `
    <div class="zid-empty-state">
      <i [class]="icon"></i>
      <div>
        <strong>{{ titleKey | translate }}</strong>
        <span *ngIf="descriptionKey">{{ descriptionKey | translate }}</span>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class ZidEmptyStateComponent {
  @Input() icon = 'pi pi-inbox';
  @Input({ required: true }) titleKey = '';
  @Input() descriptionKey = '';
}
