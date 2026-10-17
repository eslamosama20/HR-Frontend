import {
  Component,
  Input,
  TemplateRef,
  ViewChild,
  ElementRef,
  signal,
  AfterViewChecked, ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  OnInit
} from '@angular/core';
import {CommonModule, } from "@angular/common";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import { QRCodeModule } from 'angularx-qrcode';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {NgxPrintService} from "ngx-print";
import {FormatDecimalPipe} from "../../pipes/format-decimal.pipe";
import {CustomDatePipe} from "../../pipes/custom-date.pipe";
import {PdfUtilsService} from "../../services/pdf-utils.service";

const MIN_SLICE_HEIGHT = 24;

export function sliceCanvasAtBreaks(
  canvas: HTMLCanvasElement,
  breaks: number[],
  scale: number
): HTMLCanvasElement[] {
  if (!breaks.length) {
    return [canvas];
  }

  const safeScale = scale > 0 ? scale : 1;
  const cssHeight = canvas.height / safeScale;
  const normalizedBreaks = [...new Set(breaks)]
    .filter((breakOffset) => Number.isFinite(breakOffset) && breakOffset > 0 && breakOffset < cssHeight)
    .sort((a, b) => a - b);

  if (!normalizedBreaks.length) {
    return [canvas];
  }

  const boundaries = [0, ...normalizedBreaks, cssHeight];
  const slices: HTMLCanvasElement[] = [];

  for (let index = 0; index < boundaries.length - 1; index++) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const cssSliceHeight = end - start;
    if (cssSliceHeight < MIN_SLICE_HEIGHT) continue;
    const pixelSliceHeight = Math.round(cssSliceHeight * safeScale);
    if (pixelSliceHeight <= 0) continue;

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = pixelSliceHeight;
    const context = slice.getContext('2d');
    if (!context) continue;

    context.drawImage(
      canvas,
      0,
      Math.round(start * safeScale),
      canvas.width,
      pixelSliceHeight,
      0,
      0,
      canvas.width,
      pixelSliceHeight
    );
    slices.push(slice);
  }

  return slices.length ? slices : [canvas];
}

@Component({
  selector: 'app-print-document',
  templateUrl: './print-document.component.html',
  standalone: true,
    imports: [
        CommonModule,
        QRCodeModule,
        TranslateModule,
        FormatDecimalPipe,
        CustomDatePipe
    ],
  styleUrls: ['./print-document.component.scss']
})

export class PrintDocumentComponent implements AfterViewChecked, OnInit, OnChanges {
  @Input() headerTemplate: TemplateRef<any>;
  @Input() preTableHeaderTemplate: TemplateRef<any>;
  @Input() bodyTemplate: TemplateRef<any>;
  @Input() footerTemplate: TemplateRef<any>;
  @Input() summaryTemplate: TemplateRef<any>;
  @Input() data: any[] = [];
  @Input() columns: any[] = [];
  @Input() qrImageUrl: string | null = null; // Optional QR image input
  @Input() applyFormatDecimal = true;
  @Input() landscape = false;
  @Input() showStamp = false;

  @ViewChild('printSection', { static: false }) printSection: ElementRef;
  constructor(
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef,  // Inject ChangeDetectorRef
    private printService: NgxPrintService,
    private pdfUtils: PdfUtilsService
  ) {
  }
  get currentLanguage() {
    const lang = this.translateService.currentLang || 'ar';
    return lang.startsWith('ar') ? 'ar' : 'en';
  }
  paginatedDataSignal = signal<any[][]>([])
  get paginatedData(){
    return this.paginatedDataSignal()
  }
  set paginatedData(value){
    this.paginatedDataSignal.set(value)
  }


  /*ngAfterViewInit(): void {
    this.cdr.detectChanges();  // Force Angular to check for changes
    setTimeout(() => this.paginateTable(), 0);
  }*/

  ngOnInit(): void {
    if (this.data.length === 0) {
      this.paginatedData.push([])
    }
    this.applyOrientation();
  }

  private previousPaginatedData: any[] = null;  // To store previous paginated data
  private orientationStyleEl: HTMLStyleElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['landscape']) {
      this.applyOrientation();
    }
  }

  ngAfterViewChecked(): void {  // Changed to AfterViewChecked
    setTimeout(() => {
      const currentPaginatedData = this.paginatedData;  // Assuming paginatedData holds the current state

      // Compare previous and current paginated data
      if (JSON.stringify(currentPaginatedData) !== JSON.stringify(this.previousPaginatedData)) {
        // If data has changed, paginate and update previous data
        this.paginateTable();
        this.previousPaginatedData = [...currentPaginatedData];  // Deep copy to track changes
      }
    }, 0);
  }


  paginateTable() {
    if (this.data.length === 0) {
      return
    }
    this.data = this.data.map((d,index)=>({...d,printRowNo:index+1}))

    // Measure the heights of the header, body, footer, and QR section (if they exist)
    const headerElement = this.printSection.nativeElement.querySelector('.header');
    const bodyElement = this.printSection.nativeElement.querySelector('.body');
    const footerElement = this.printSection.nativeElement.querySelector('.footer');
    const underTableElement = this.printSection.nativeElement.querySelector('.under-table');
    const tableRows = this.printSection.nativeElement.querySelector('#tableElement')?.querySelectorAll('tr'); // Get all rows

    const headerHeight = headerElement ? headerElement.scrollHeight : 0;
    const bodyHeight = bodyElement ? bodyElement.scrollHeight : 0;
    const footerHeight = footerElement ? footerElement.scrollHeight : 0;
    const underTableHeight = underTableElement ? underTableElement.scrollHeight : 0;


    const pageHeight = 1120; // Increased to match standard A4 printable height at 96dpi
    // Calculate the maximum row height by looping through each row
    let maxRowHeight = 0;
    if (tableRows){
      tableRows.forEach((row: HTMLElement) => {
        const rowHeight = row.scrollHeight;
        if (rowHeight > maxRowHeight) {
          maxRowHeight = rowHeight + 5;  // Reduced buffer to 5px
        }
      });
    }
    const rowHeight = Math.max(maxRowHeight, 35); // Set row height to the largest tr element's scrollHeight or fallback to 35
    let rowsPerPage;
    let currentPage: any[] = [];
    this.paginatedData = [];

    // First page includes header, body, and footer in height calculation. We subtract 100px of safety margin to ensure totals and signature fit.
    let availableHeightFirstPage = pageHeight - (headerHeight + bodyHeight + footerHeight) - 140;
    rowsPerPage = Math.max(1, Math.floor(availableHeightFirstPage / rowHeight));

    // Add data for the first page
    for (let i = 0; i < this.data.length; i++) {
      currentPage.push(this.data[i]);

      if (currentPage.length === rowsPerPage || i === this.data.length - 1) {
        this.paginatedData.push(currentPage);
        currentPage = [];

        // From the second page onward, only subtract header and footer height
        if (this.paginatedData.length === 1) {
          let availableHeightNextPages = pageHeight - (headerHeight + footerHeight);
          rowsPerPage = Math.floor(availableHeightNextPages / rowHeight);
        }
      }
    }

    // For the last page, adjust for the QR section height + footerHeight to ensure they fit together
    if (underTableHeight > 0 && this.paginatedData.length > 0) {
      const lastPageIndex = this.paginatedData.length - 1;
      
      // Calculate available height for the table rows on the last page, accounting for the summary block (underTableHeight) and footer (signatures)
      const availableHeightLastPage = pageHeight - (headerHeight + footerHeight + underTableHeight) - 50; 

      const rowsInLastPage = Math.floor(availableHeightLastPage / rowHeight);

      // Adjust the last page's data if necessary
      const lastPageData = this.paginatedData[lastPageIndex];
      if (lastPageData.length > rowsInLastPage) {
        // Leave at least 2 rows on the last page with the summary block to make it look professional
        const splitIndex = Math.max(1, rowsInLastPage);
        const extraData = lastPageData.splice(splitIndex);
        this.paginatedData.push(extraData);
      }
    }
  }
  // currentLanguage: string = 'en';

  triggerPrint() {
    // Ensure data is paginated before capturing HTML
    if (this.data.length > 0) {
      this.paginateTable();
      this.cdr.detectChanges();
    }

    if (!this.printSection?.nativeElement) {
      return;
    }

    const printContent = this.printSection.nativeElement.outerHTML;
    const isAr = this.currentLanguage === 'ar';

    this.pdfUtils.printHtml(printContent, {
      isRtl: isAr,
      title: 'Print Document',
      pageOrientation: this.landscape ? 'landscape' : 'portrait'
    });
  }

  exportPDF(): void {
    const printContent = this.printSection.nativeElement.innerHTML;

    if (printContent) {
      html2canvas(printContent, { scale: 2 }).then((canvas) => {
        const imageData = canvas.toDataURL('image/png'); // Convert canvas to image
        const pdf = new jsPDF('p', 'mm', 'a4'); // Initialize jsPDF

        // Calculate dimensions for the PDF
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('report.pdf'); // Save the PDF
      });
    }
  }

  isItemDetailColumn(field: string): boolean {
    return field.includes('itemDetails');
  }

  /**
   * Capture every rendered .page element as a canvas (scale 2, CORS enabled) for PDF export.
   * Used by the batch/merged frontend renderers; does NOT trigger window.print().
   * Falls back to capturing the whole print section when no .page elements exist.
   *
   * The print components live inside hidden wrapper divs (width:1px, opacity:0, overflow:hidden,
   * and an outer Tailwind `hidden` display:none container), so html2canvas would produce a
   * degenerate/empty canvas. The ancestor chain is temporarily neutralized to real A4 width and
   * restored in a finally block afterwards.
   */
  async captureRenderedPages(orientation: 'portrait' | 'landscape' = this.landscape ? 'landscape' : 'portrait'): Promise<HTMLCanvasElement[]> {
    if (this.data.length > 0) {
      this.paginateTable();
      this.cdr.detectChanges();
    }
    // Wait for the DOM to settle after pagination + change detection.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const section: HTMLElement | undefined = this.printSection?.nativeElement;
    if (!section) return [];

    // Collect the ancestor chain up to (not including) <body> and remember their inline styles.
    const ancestors: HTMLElement[] = [];
    let node: HTMLElement | null = section.parentElement;
    while (node && node !== document.body) {
      ancestors.push(node);
      node = node.parentElement;
    }
    const originalStyles = ancestors.map((el) => ({ el, style: el.getAttribute('style') }));

    try {
      // Temporarily neutralize the hidden wrappers so the section is measurable at A4 size.
      // 794px / 1123px ≈ 210mm / 297mm A4 at 96dpi (matches paginateTable's 1120px pageHeight).
      for (const el of ancestors) {
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        el.style.top = '0';
        el.style.width = orientation === 'portrait' ? '794px' : '1123px';
        el.style.height = 'auto';
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.overflow = 'visible';
      }

      // html2canvas renders with SCREEN media, so print-only elements (e.g. the
      // .print-address-footer address bar, which is display:none on screen and
      // position:fixed in @media print) would be missing from the captured PDF.
      // Inject a temporary screen override so they render in the document flow
      // during capture; removed in the finally block below.
      const printFixStyle = document.createElement('style');
      printFixStyle.setAttribute('data-print-capture-fix', '');
      printFixStyle.textContent = `
        @media screen {
          .print-address-footer {
            display: block !important;
            position: static !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
          }
        }`;
      document.head.appendChild(printFixStyle);

      let pageElements: HTMLElement[] = Array.from(section.querySelectorAll('.page'));
      if (pageElements.length === 0) {
        pageElements = [section];
      }

      const canvases: HTMLCanvasElement[] = [];
      for (const element of pageElements) {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const breaks = Array.from(element.querySelectorAll<HTMLElement>('.page-break'))
          .map((pageBreak) => {
            let node: HTMLElement | null = pageBreak;
            let offset = 0;
            while (node && node !== element) {
              offset += node.offsetTop;
              node = node.offsetParent as HTMLElement | null;
            }
            if (node === element) return offset;
            return pageBreak.getBoundingClientRect().top - element.getBoundingClientRect().top;
          })
          .filter((offset) => {
            const elementHeight = element.getBoundingClientRect().height;
            return offset > 0 && offset < elementHeight;
          });
        canvases.push(...sliceCanvasAtBreaks(canvas, breaks, 2));
      }
      return canvases;
    } finally {
      // Remove the temporary print-only element override before restoring styles.
      document.head.querySelector('[data-print-capture-fix]')?.remove();

      // Restore every element's original inline style, on success or error.
      for (const { el, style } of originalStyles) {
        if (style !== null) {
          el.setAttribute('style', style);
        } else {
          el.removeAttribute('style');
        }
      }
    }
  }
  private applyOrientation(): void {
    if (this.orientationStyleEl) {
      this.orientationStyleEl.remove();
      this.orientationStyleEl = null;
    }
    const styleEl = document.createElement('style');
    const orientation = this.landscape ? 'landscape' : 'portrait';
    styleEl.setAttribute('data-print-orientation', orientation);
    styleEl.textContent = `@media print { @page { size: ${orientation}; margin: 10mm; } }`;
    document.head.appendChild(styleEl);
    this.orientationStyleEl = styleEl;
  }
}
