import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import {
  BarcodeProductListItem,
  BarcodeProductsResponse,
  BarcodeService
} from 'src/app/services/barcode/barcode.service';

@Component({
  selector: 'app-barcode-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    PanelModule,
    TableModule,
    PaginatorModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './barcode-management.component.html',
  styleUrl: './barcode-management.component.scss',
  providers: [MessageService]
})
export class BarcodeManagementComponent implements OnInit {
  loadingSignal = signal(false);
  products: BarcodeProductListItem[] = [];
  searchTerm = '';
  pageNumber = 1;
  pageSize = 20;
  totalCount = 0;
  copies = 1;

  selectedProductMap = new Map<string, BarcodeProductListItem>();

  get loading(): boolean {
    return this.loadingSignal();
  }

  set loading(value: boolean) {
    this.loadingSignal.set(value);
  }

  constructor(
    private barcodeService: BarcodeService,
    private translate: TranslateService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.barcodeService
      .getProductsForBarcode(this.pageNumber, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response: BarcodeProductsResponse) => {
          this.products = response?.data ?? [];
          this.totalCount = response?.totalCount ?? 0;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.products = [];
          this.totalCount = 0;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('INVOICE.ERROR'),
            detail: this.translate.instant('BARCODE_MANAGEMENT.LOAD_ERROR')
          });
        }
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadProducts();
  }

  onPageChange(event: any): void {
    this.pageSize = event?.rows || this.pageSize;
    this.pageNumber = (event?.page || 0) + 1;
    this.loadProducts();
  }

  buildRowKey(product: BarcodeProductListItem): string {
    return product.id;
  }

  isSelected(product: BarcodeProductListItem): boolean {
    return this.selectedProductMap.has(this.buildRowKey(product));
  }

  toggleSelection(product: BarcodeProductListItem, checked: boolean): void {
    const rowKey = this.buildRowKey(product);
    if (checked) {
      this.selectedProductMap.set(rowKey, product);
      return;
    }
    this.selectedProductMap.delete(rowKey);
  }

  toggleSelectCurrentPage(checked: boolean): void {
    for (const product of this.products) {
      this.toggleSelection(product, checked);
    }
  }

  allCurrentPageSelected(): boolean {
    return this.products.length > 0 && this.products.every((product) => this.isSelected(product));
  }

  selectedCount(): number {
    return this.selectedProductMap.size;
  }

  getProductName(product: BarcodeProductListItem): string {
    const currentLang = this.translate.currentLang || 'ar';
    if (currentLang === 'en') {
      return product.englishName || product.arabicName || product.referenceCode;
    }
    return product.arabicName || product.englishName || product.referenceCode;
  }

  getBarcodeImageUrl(referenceCode: string): string {
    return this.barcodeService.buildBarcodeImageUrl(referenceCode);
  }

  printSingle(product: BarcodeProductListItem): void {
    this.openPrintWindow([product]);
  }

  printSelected(): void {
    const selected = Array.from(this.selectedProductMap.values());
    if (!selected.length) {
      return;
    }
    this.openPrintWindow(selected);
  }

  private openPrintWindow(products: BarcodeProductListItem[]): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('INVOICE.WARNING'),
        detail: this.translate.instant('BARCODE_MANAGEMENT.POPUP_BLOCKED')
      });
      return;
    }

    const copiesCount = Math.max(1, Number(this.copies) || 1);
    const labelsHtml: string[] = [];

    for (const product of products) {
      for (let i = 0; i < copiesCount; i++) {
        labelsHtml.push(`
          <div class="barcode-label">
            <div class="name">${this.escapeHtml(this.getProductName(product))}</div>
            <img class="barcode-image" src="${this.getBarcodeImageUrl(product.referenceCode)}" alt="${this.escapeHtml(product.referenceCode)}" />
            <div class="code">${this.escapeHtml(product.referenceCode)}</div>
          </div>
        `);
      }
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html lang="en">
        <head>
          <title>${this.escapeHtml(this.translate.instant('BARCODE_MANAGEMENT.PAGE_TITLE'))}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: #fff;
            }
            .labels-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap: 12px;
            }
            .barcode-label {
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 10px;
              text-align: center;
              break-inside: avoid;
            }
            .name {
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .barcode-image {
              width: 100%;
              max-width: 230px;
              height: auto;
              display: block;
              margin: 0 auto 8px;
            }
            .code {
              font-size: 13px;
              font-weight: 600;
            }
            @media print {
              @page {
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">${labelsHtml.join('')}</div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
