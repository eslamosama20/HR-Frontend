import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

type ZidTabId = 'settings' | 'orders' | 'products' | 'stock' | 'cashier-orders' | 'logs';

@Component({
  selector: 'app-zid-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    TagModule
  ],
  template: `
    <div class="zid-page">
      <div class="zid-nav">
        <button
          pButton
          type="button"
          icon="pi pi-arrow-left"
          [label]="'CASHIER_ZID.BACK_TO_POS' | translate"
          class="p-button-text p-button-sm"
          routerLink="/cashier/pos">
        </button>

        <div class="zid-tabs" role="tablist">
          <button
            *ngFor="let tab of tabs"
            pButton
            type="button"
            class="p-button-sm"
            [ngClass]="{ 'p-button-outlined': activeTab !== tab.id }"
            [label]="tab.labelKey | translate"
            [routerLink]="tab.route">
          </button>
        </div>
      </div>

      <div class="zid-header">
        <div class="zid-heading">
          <span class="zid-eyebrow">{{ 'CASHIER_ZID.MODULE_NAME' | translate }}</span>
          <h1>{{ titleKey | translate }}</h1>
          <p>{{ subtitleKey | translate }}</p>
        </div>

        <div class="zid-header-actions">
          <p-tag
            *ngIf="statusLabelKey"
            [severity]="statusSeverity"
            [value]="statusLabelKey | translate">
          </p-tag>
          <ng-content select="[zid-actions]"></ng-content>
        </div>
      </div>

      <ng-content select="[zid-kpis]"></ng-content>
      <ng-content select="[zid-filters]"></ng-content>
      <ng-content></ng-content>
    </div>
  `
})
export class ZidShellComponent {
  @Input({ required: true }) titleKey = '';
  @Input({ required: true }) subtitleKey = '';
  @Input({ required: true }) activeTab: ZidTabId = 'settings';
  @Input() statusLabelKey = '';
  @Input() statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';

  tabs: Array<{ id: ZidTabId; labelKey: string; route: string }> = [
    { id: 'settings', labelKey: 'CASHIER_ZID.TAB_SETTINGS', route: '/cashier/zid-settings' },
    { id: 'orders', labelKey: 'CASHIER_ZID.TAB_ORDERS', route: '/cashier/zid-orders' },
    { id: 'products', labelKey: 'CASHIER_ZID.TAB_PRODUCTS', route: '/cashier/zid-products' },
    { id: 'stock', labelKey: 'CASHIER_ZID.TAB_STOCK', route: '/cashier/zid-stock-sync' },
    { id: 'cashier-orders', labelKey: 'CASHIER_ZID.TAB_CASHIER_ORDERS', route: '/cashier/zid-cashier-orders' },
    { id: 'logs', labelKey: 'CASHIER_ZID.TAB_LOGS', route: '/cashier/zid-logs' }
  ];
}
