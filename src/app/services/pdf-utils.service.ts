import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { unzipSync, strFromU8, zipSync } from 'fflate';
import { jsPDF } from 'jspdf';
import { formatDisplayDate } from '../utils/dateUtils';

@Injectable({
  providedIn: 'root'
})
export class PdfUtilsService {
  private messageService = inject(MessageService, { optional: true });
  private translate = inject(TranslateService, { optional: true });

  constructor() {}

  public showToast(messageKey: string, severity: 'info' | 'success' | 'warn' | 'error' = 'info', life: number = 3500) {
    if (!this.messageService) return;
    this.messageService.clear();
    const msg = this.translate ? (this.translate.instant(messageKey) || messageKey) : messageKey;
    const summary = severity === 'info' ? 'تجهيز' : (severity === 'success' ? 'تم' : 'تنبيه');
    this.messageService.add({
      severity,
      summary,
      detail: msg,
      life
    });
  }

  /** Extract PDFs from zip Blob and print them */
  async unzipAndPrint(zipBlob: Blob): Promise<void> {
    const arrayBuffer = await zipBlob.arrayBuffer();
    const files = unzipSync(new Uint8Array(arrayBuffer));

    const pdfEntries = Object.entries(files).filter(([name]) => name.endsWith('.pdf'));

    for (const [filename, fileContent] of pdfEntries) {
      const blob = new Blob([fileContent], { type: 'application/pdf' });
      await this.printBlobAsync(blob);
    }
  }
  async unzipAndDownload(zipBlob: Blob): Promise<void> {
    const arrayBuffer = await zipBlob.arrayBuffer();
    const files = unzipSync(new Uint8Array(arrayBuffer));

    const pdfEntries = Object.entries(files).filter(([name]) => name.endsWith('.pdf'));

    for (const [filename, fileContent] of pdfEntries) {
      const blob = new Blob([fileContent], { type: 'application/pdf' });
      const nameToSave = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      this.downloadFile(blob, nameToSave);
    }
  }

  /**
   * Checks whether the current device is a mobile or tablet device.
   */
  public isMobileOrTabletDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Silk/i.test(ua);
    const isIPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
    const isTouchTablet = ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) && window.innerWidth <= 1024;
    return isMobileUA || isIPadOS || isTouchTablet;
  }

  /** Utility: print a Blob via hidden iframe on Desktop, or open in native viewer on Mobile/Tablet */
  public printBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);

    // For Mobile and Tablet: open the PDF directly in a new tab / native PDF viewer
    if (this.isMobileOrTabletDevice()) {
      const win = window.open(url, '_blank');
      if (!win) {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    // For Desktop: print via hidden iframe (existing behavior preserved 100%)
    const iframe = document.createElement('iframe');

    iframe.style.display = 'none';
    iframe.src = url;

    document.body.appendChild(iframe);
    iframe.onload = () => {
      const contentWindow = iframe.contentWindow;
      if (!contentWindow) return;
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // Handle cleanup after print
        const cleanup = () => {
          iframe.remove();
          URL.revokeObjectURL(url);
        };
        if ('onafterprint' in contentWindow) {
          contentWindow.onafterprint = cleanup;
        } else {
          // Fallback in case onafterprint is unsupported
          setTimeout(cleanup, 2000);
        }
      }, 200);
    };
  }

  /** Print a Blob via hidden iframe, returning a Promise that resolves after print completes */
  public printBlobAsync(blob: Blob): Promise<void> {
    if (this.isMobileOrTabletDevice()) {
      this.printBlob(blob);
      return new Promise((resolve) => setTimeout(resolve, 500));
    }

    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      // Shared, idempotent cleanup — invoked from onload, onerror and the fallback timer
      // so the iframe/URL can never leak and the promise can never stall.
      let done = false;
      let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (done) return;
        done = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        iframe.remove();
        URL.revokeObjectURL(url);
        resolve();
      };

      // Load-failure safety net: if the hidden iframe never loads, never stall the chain.
      iframe.onerror = () => cleanup();

      iframe.onload = () => {
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) { cleanup(); return; }
        setTimeout(() => {
          iframe.contentWindow?.focus();
          // Hard safety net: if afterprint never fires (known Chrome quirk with hidden
          // iframes / dismissed print dialogs), never stall the print chain or leave the
          // batchProcessing spinner stuck.
          fallbackTimer = setTimeout(cleanup, 45000);
          if ('onafterprint' in contentWindow) {
            contentWindow.onafterprint = cleanup;
          } else {
            setTimeout(cleanup, 2000);
          }
          iframe.contentWindow?.print();
        }, 200);
      };
    });
  }

  /**
   * Build a multi-page PDF Blob from captured page canvases (client-side, no new dependency).
   * Each canvas becomes one A4 page; canvases are added in order.
   */
  public canvasesToPdfBlob(
    canvases: HTMLCanvasElement[],
    orientation: 'portrait' | 'landscape' = 'portrait',
    perCanvasOrientations?: ('portrait' | 'landscape')[]
  ): Blob {
    const firstOrientation = perCanvasOrientations?.[0] ?? orientation;
    const doc = new jsPDF({ orientation: firstOrientation, unit: 'mm', format: 'a4' });
    if (!canvases || canvases.length === 0) {
      return doc.output('blob');
    }

    canvases.forEach((canvas, index) => {
      const pageOrientation = perCanvasOrientations?.[index] ?? orientation;
      const pageHeight = pageOrientation === 'landscape' ? 210 : 297; // A4
      const pageWidth = pageOrientation === 'landscape' ? 297 : 210;
      // Skip degenerate (zero-sized) canvases instead of dividing by zero below.
      if (canvas.width <= 0 || canvas.height <= 0) {
        return;
      }
      if (index > 0) {
        doc.addPage('a4', pageOrientation);
      }
      const imgData = canvas.toDataURL('image/png');

      // Fit the captured page into the printable area with balanced margins.
      // Screen-rendered captures can be taller than the A4 aspect ratio (the
      // @media print spacing does not apply on screen), which previously made
      // the image overflow the page and clip the header/footer. Scaling down to
      // fit (never cropping) keeps the whole rendered page visible.
      const MARGIN_MM = 10; // matches @page { margin: 10mm } in the print templates
      const maxContentWidth = pageWidth - MARGIN_MM * 2;   // 190 portrait / 277 landscape
      const maxContentHeight = pageHeight - MARGIN_MM * 2; // 277 portrait / 190 landscape

      const canvasAspect = canvas.width / canvas.height;
      let contentWidth = maxContentWidth;
      let contentHeight = contentWidth / canvasAspect;
      if (contentHeight > maxContentHeight) {
        contentHeight = maxContentHeight;
        contentWidth = contentHeight * canvasAspect;
      }
      const x = (pageWidth - contentWidth) / 2;
      const y = MARGIN_MM;

      doc.addImage(imgData, 'PNG', x, y, contentWidth, contentHeight);
    });
    return doc.output('blob');
  }

  /**
   * Package blobs into a single client-side ZIP (fflate zipSync) and download it.
   */
  public downloadBlobsAsZip(files: Array<{ name: string; blob: Blob }>, zipName: string): void {
    if (!files || files.length === 0) return;
    void this.buildZipAndDownload(files, zipName);
  }

  private async buildZipAndDownload(files: Array<{ name: string; blob: Blob }>, zipName: string): Promise<void> {
    const entries: Record<string, Uint8Array> = {};
    for (const file of files) {
      entries[file.name] = new Uint8Array(await file.blob.arrayBuffer());
    }
    const zipped = zipSync(entries);
    const zipBlob = new Blob([zipped], { type: 'application/zip' });
    this.downloadFile(zipBlob, zipName);
  }

  /**
   * Print PDF blobs one after another; resolves after each browser print cycle completes.
   */
  public async printBlobsSequentially(blobs: Blob[]): Promise<void> {
    if (!blobs || blobs.length === 0) return;
    for (const blob of blobs) {
      await this.printBlobAsync(blob);
    }
  }

  public downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  public exportToExcel(data: any[], filename: string): void {
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelData: Blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
      });
      this.downloadFile(excelData, `${filename}.xlsx`);
    });
  }

  public generateInventoryPDF(data: any, filename: string, print: boolean = false): void {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      
      // Add Arabic font support if needed
      doc.setFont('helvetica');
      doc.setFontSize(16);
      doc.text(`Inventory Report - ${data.storeName}`, 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Date: ${data.date}`, 14, 30);
      doc.text(`Total Items: ${data.totalItems}`, 14, 37);
      doc.text(`Total Quantity: ${data.totalQuantity}`, 14, 44);
      
      // Add table
      let yPos = 55;
      doc.setFontSize(9);
      
      // Table headers
      doc.text('#', 14, yPos);
      doc.text('Code', 30, yPos);
      doc.text('Product', 60, yPos);
      doc.text('Unit', 120, yPos);
      doc.text('Quantity', 160, yPos);
      
      yPos += 7;
      
      // Table data
      data.items.forEach((item: any) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(String(item['#']), 14, yPos);
        doc.text(String(item['كود الصنف']), 30, yPos);
        doc.text(String(item['اسم الصنف']).substring(0, 30), 60, yPos);
        doc.text(String(item['الوحدة']), 120, yPos);
        doc.text(String(item['الكمية']), 160, yPos);
        
        yPos += 7;
      });
      
      if (print) {
        // Print the PDF
        const blob = doc.output('blob');
        this.printBlob(blob);
      } else {
        // Download the PDF
        doc.save(`${filename}.pdf`);
      }
    });
  }

  public generateStoreTransferPDF(data: any[], filename: string, print: boolean = false): void {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const doc = new jsPDF({
          orientation: 'landscape'
        });
        
        // Apply autotable plugin
        const autoTable = autoTableModule.default;
        
        // Title
        doc.setFontSize(18);
        doc.text('Store Transfer Report', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Date: ${formatDisplayDate(new Date())}`, 14, 30);
        doc.text(`Total Transfers: ${data.length}`, 14, 37);
        
        // Table headers and data
        const tableColumn = ['#', 'Date', 'Reference', 'From Store', 'To Store', 'Products', 'Qty', 'Shipping'];
        const tableRows = data.map((item, index) => [
          index + 1,
          item.transferDate ? formatDisplayDate(item.transferDate) : '',
          item.referenceNumber || '',
          item.fromStore || '',
          item.toStore || '',
          (item.products || '').substring(0, 25),
          item.totalQuantity || 0,
          item.shippingCost ? `${item.shippingCost} SAR` : '-'
        ]);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 50 },
            6: { cellWidth: 20 },
            7: { cellWidth: 25 }
          }
        });
        
        if (print) {
          const blob = doc.output('blob');
          this.printBlob(blob);
        } else {
          doc.save(`${filename}.pdf`);
        }
      });
    });
  }

  /**
   * Generate a generic table PDF report
   * @param title Report title
   * @param columns Array of column headers
   * @param data Array of data rows (each row is an object)
   * @param filename Output filename (without extension)
   * @param print If true, prints instead of downloading
   */
  public generateTablePDF(title: string, columns: string[], data: any[][], filename: string, print: boolean = false): void {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then((autoTableModule) => {
        const doc = new jsPDF({
          orientation: columns.length > 6 ? 'landscape' : 'portrait'
        });
        
        const autoTable = autoTableModule.default;
        
        // Title
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        
        // Date and count
        doc.setFontSize(10);
        doc.text(`Date: ${formatDisplayDate(new Date())}`, 14, 30);
        doc.text(`Total Records: ${data.length}`, 14, 37);
        
        // Table
        autoTable(doc, {
          head: [columns],
          body: data,
          startY: 45,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });
        
        if (print) {
          const blob = doc.output('blob');
          this.printBlob(blob);
        } else {
          doc.save(`${filename}.pdf`);
        }
      });
    });
  }

  /**
   * Print raw HTML content via an isolated hidden iframe without touching document.body or triggering page reloads.
   */
  public printHtml(
    htmlContent: string,
    options: {
      isRtl?: boolean;
      title?: string;
      pageOrientation?: 'portrait' | 'landscape';
    } = {}
  ): void {
    const isRtl = options.isRtl ?? (document.documentElement.dir === 'rtl' || document.body.dir === 'rtl');
    const dir = isRtl ? 'rtl' : 'ltr';
    const lang = isRtl ? 'ar' : 'en';
    const title = options.title || 'Print';
    const orientation = options.pageOrientation || 'portrait';

    // Clone all style elements and stylesheet link tags from document.head
    const headTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    // Extract inline rules from styleSheets (including cross-origin safety)
    const extraStyles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules || [])
            .map((rule) => rule.cssText)
            .join('\n');
        } catch (e) {
          if (sheet.href) {
            return `@import url("${sheet.href}");`;
          }
          return '';
        }
      })
      .join('\n');

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    const baseHref = document.baseURI || (window.location.origin + '/');
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${dir}" lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <base href="${baseHref}">
        <title>${title}</title>
        ${headTags}
        <style>
          ${extraStyles}
          @page {
            size: a4 ${orientation};
            margin: 0.5cm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);
    iframeDoc.close();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 500);
    };

    setTimeout(() => {
      try {
        const contentWindow = iframe.contentWindow;
        if (contentWindow) {
          contentWindow.focus();
          if ('onafterprint' in contentWindow) {
            contentWindow.onafterprint = cleanup;
          }
          contentWindow.print();
          if (!('onafterprint' in contentWindow)) {
            cleanup();
          }
        } else {
          cleanup();
        }
      } catch (err) {
        console.error('Printing error:', err);
        cleanup();
      }
    }, 300);
  }
}
