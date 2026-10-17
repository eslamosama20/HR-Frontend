import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ZidProductMappingService } from 'src/app/services/cashier/zid-product-mapping.service';
import { ZidMapProductRequest, ZidProduct } from 'src/app/models/cashier/zid-integration.model';
import { CashierProduct } from 'src/app/models/cashier/cashier-product.model';
import { CashierService } from 'src/app/services/cashier/cashier.service';
import { mapError } from 'src/app/shared/utils/runtime-error.util';
import { ZidShellComponent } from '../zid-shared/zid-shell.component';
import { ZidEmptyStateComponent } from '../zid-shared/zid-empty-state.component';
import { ZidSkeletonComponent } from '../zid-shared/zid-skeleton.component';

@Component({
  selector: 'app-zid-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AutoCompleteModule,
    TableModule,
    ButtonModule,
    TagModule,
    DropdownModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    TranslateModule,
    ZidShellComponent,
    ZidEmptyStateComponent,
    ZidSkeletonComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './zid-products.component.html',
  styleUrls: ['../zid-integration.shared.scss']
})
export class ZidProductsComponent implements OnInit {
  loading = signal(false);
  actionLoading = signal('');
  error = signal('');
  products = signal<ZidProduct[]>([]);
  totalRecords = signal(0);
  erpItemSuggestions = signal<CashierProduct[]>([]);

  private activeMappingProductId: string | null = null;

  page = 1;
  pageSize = 20;
  mappedOnly: boolean | null = null;

  mappingFilterOptions: Array<{ label: string; value: boolean | null }> = [];

  constructor(
    private productMapping: ZidProductMappingService,
    private cashierService: CashierService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.configureOptions();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.configureOptions());
    this.loadProducts();
  }

  private configureOptions(): void {
    this.mappingFilterOptions = [
      { label: this.t('ALL'), value: null },
      { label: this.t('MAPPED_ONLY'), value: true },
      { label: this.t('UNMAPPED_ONLY'), value: false }
    ];
  }

  loadProducts(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.productMapping.getProducts(this.page, this.pageSize, this.mappedOnly)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.products.set(response.items);
          this.totalRecords.set(response.totalCount);
          this.loading.set(false);
        },
        error: error => {
          this.products.set([]);
          this.totalRecords.set(0);
          this.error.set(this.readError(error, this.t('LOAD_PRODUCTS_ERROR')));
          this.loading.set(false);
        }
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadProducts();
  }

  onPageChange(event: any): void {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.loadProducts();
  }

  requestSyncProducts(): void {
    this.confirmationService.confirm({
      header: this.t('CONFIRM_SYNC'),
      message: this.t('CONFIRM_SYNC_PRODUCTS_MESSAGE'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.syncProducts()
    });
  }

  private syncProducts(): void {
    this.actionLoading.set('syncProducts');
    this.productMapping.syncProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('PRODUCTS_SYNCED'));
          this.loadProducts();
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('SYNC_PRODUCTS_ERROR')));
        }
      });
  }

  requestMapSingle(product: ZidProduct): void {
    this.confirmationService.confirm({
      header: this.t('CONFIRM_MAPPING'),
      message: this.translate.instant('CASHIER_ZID.CONFIRM_MAP_PRODUCT_MESSAGE', { name: product.zidProductName }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.mapSingle(product)
    });
  }

  private mapSingle(product: ZidProduct): void {
    const mainPurchaseClassId = (product.mappingDraftId || '').trim();
    if (!mainPurchaseClassId) {
      this.showError(this.t('SELECT_ERP_ITEM_FIRST'));
      return;
    }

    this.actionLoading.set(`map-${product.zidProductId}`);
    this.productMapping.mapProduct({ zidProductId: product.zidProductId, mainPurchaseClassId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('PRODUCT_MAPPING_SAVED'));
          this.loadProducts();
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('MAP_PRODUCT_ERROR')));
        }
      });
  }

  requestBulkMapSelected(): void {
    this.confirmationService.confirm({
      header: this.t('CONFIRM_BULK_MAPPING'),
      message: this.t('CONFIRM_BULK_MAP_MESSAGE'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.bulkMapSelected()
    });
  }

  private bulkMapSelected(): void {
    const mappings: ZidMapProductRequest[] = this.products()
      .filter(product => product.selected)
      .map(product => ({
        zidProductId: product.zidProductId,
        mainPurchaseClassId: (product.mappingDraftId || '').trim()
      }))
      .filter(mapping => Boolean(mapping.mainPurchaseClassId));

    const selectedCount = this.products().filter(product => product.selected).length;
    if (!selectedCount) {
      this.showError(this.t('SELECT_ONE_PRODUCT'));
      return;
    }
    if (mappings.length !== selectedCount) {
      this.showError(this.t('EVERY_SELECTED_REQUIRES_ITEM'));
      return;
    }

    this.actionLoading.set('bulk');
    this.productMapping.bulkMapProducts(mappings)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.actionLoading.set('');
          this.showSuccess(response.message || this.t('BULK_MAPPING_COMPLETED'));
          this.loadProducts();
        },
        error: error => {
          this.actionLoading.set('');
          this.showError(this.readError(error, this.t('BULK_MAP_ERROR')));
        }
      });
  }

  toggleAllSelected(selected: boolean): void {
    this.products.update(products => products.map(product => ({ ...product, selected })));
  }

  beginErpItemSearch(product: ZidProduct): void {
    this.activeMappingProductId = product.id;
  }

  searchErpItems(event: AutoCompleteCompleteEvent): void {
    const term = `${event.query ?? ''}`.trim();
    if (!term) {
      this.erpItemSuggestions.set([]);
      return;
    }

    const storeDetailsId = this.cashierService.getCurrentSessionSnapshot()?.storeDetailsId;
    this.cashierService.searchProducts({
      searchTerm: term,
      pageSize: 15,
      inStock: true,
      storeDetailsId
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: products => this.erpItemSuggestions.set(products || []),
        error: () => this.erpItemSuggestions.set([])
      });
  }

  applyErpItem(product: ZidProduct, selected: CashierProduct | null): void {
    this.products.update(products => products.map(item => {
      if (item.id !== product.id) {
        return item;
      }

      return {
        ...item,
        mappingDraftId: selected ? String(selected.id) : '',
        mappingDraftLabel: selected ? `${selected.nameAr || selected.nameEn} (${selected.code || selected.id})` : ''
      };
    }));
  }

  isBusy(key: string): boolean {
    return this.actionLoading() === key;
  }

  selectedCount(): number {
    return this.products().filter(product => product.selected).length;
  }

  mappedCount(): number {
    return this.products().filter(product => product.isMapped).length;
  }

  unmappedCount(): number {
    return this.products().filter(product => !product.isMapped).length;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 3500 });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: this.t('CASHIER_ZID.MODULE_NAME'), detail, life: 5500 });
  }

  private readError(error: any, fallback: string): string {
    return mapError(error, fallback);
  }

  private t(key: string): string {
    return this.translate.instant(`CASHIER_ZID.${key}`);
  }
}
