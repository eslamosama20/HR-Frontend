import {
  Component,
  Input,
  TemplateRef,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef,
  ChangeDetectorRef, SimpleChanges, OnChanges, OnInit, ChangeDetectionStrategy, signal
} from '@angular/core';
import { PageType, pageDimensions } from './types/PageType';
import { CommonModule, NgIf } from "@angular/common";
import { TranslateService } from "@ngx-translate/core";
import { take } from "rxjs";
import { ExcelService } from 'src/app/services/excel/excel.service';
import { PdfService } from '../../services/Pdf/pdf.service';
import { PdfUtilsService } from '../../services/pdf-utils.service';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-reuseable-report',
  standalone: true,
  imports: [
    CommonModule, TableModule
  ],
  templateUrl: './reuseable-report.component.html',
  styleUrl: './reuseable-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReuseableReportComponent implements OnChanges, AfterViewInit {


  @Input() data: any[] = [];
  @Input() columns: { field: string, label: string }[] = [];
  @Input() pageType: PageType = PageType.A4;
  @Input() headerTemplate!: TemplateRef<any>;
  @Input() footerTemplate!: TemplateRef<any>;
  @Input() bodyTemplate!: TemplateRef<any>;
  isPrintingSignal = signal(false)
  get isPrinting(){
    return this.isPrintingSignal();
  }
  set isPrinting(value){
    this.isPrintingSignal.set(value)
  }
  pageDimensions = pageDimensions;
  paginatedDataSignal = signal<any[][]>([]);
  get paginatedData(): any[][] {
    return this.paginatedDataSignal();
  }
  set paginatedData(value: any[][]) {
    this.paginatedDataSignal.set(value);
  }
  currentPage: number = 1;
  totalPages: number = 0;
  isSortedIconShow: boolean = false;
  @ViewChildren('reportPage') reportPages!: QueryList<ElementRef>;
  currentLanguage: string = 'en';
  constructor(
    private cdRef: ChangeDetectorRef,
    private excelService: ExcelService,
    private pdfService: PdfService,
    private pdfUtils: PdfUtilsService,
    translate: TranslateService,
  ) {
    this.currentLanguage = translate.currentLang;
  }
  exportExcelData(): void {
    this.excelService.exportAsExcelFile(this.data, this.currentLanguage === 'ar' ? 'التقرير' : 'Report');
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data || changes.columns || changes.pageType) {
      this.cdRef.detectChanges();
    }
    if (changes.reportPages) {
      console.log('Report Pages', this.reportPages);
      if (this.reportPages.length > 0) {
        this.paginateContent();
      }
    }
  }

  ngAfterViewInit(): void {
    this.cdRef.detectChanges();

    this.reportPages.changes.pipe(take(1)).subscribe(() => {
      if (this.reportPages.length === this.totalPages) {
        this.paginateContent();
      }
    });

    this.paginateContent();

  }
  paginationInProgress = false;  // Flag to prevent infinite loop

  paginateContent() {
    const pageHeight = this.pageDimensions[this.pageType]?.height || '1123px'; // A4 height in pixels
    const contentHeight = this.calculateContentHeight();
    const pageHeightNumber = Number(pageHeight.replace('px', ''));
    if (contentHeight > pageHeightNumber) {
      // Calculate how many pages are needed
      const itemsPerPage = Math.floor(pageHeightNumber / contentHeight * this.data.length);
      this.paginatedData = this.chunkData(this.data, itemsPerPage);
      this.totalPages = this.paginatedData.length;
    } else {
      // No pagination needed, fit all data in one page
      this.paginatedData = [this.data];
      this.totalPages = 1;
    }
  }

  calculateContentHeight(): number {
    // Dynamically calculate content height
    const pages = this.reportPages.toArray();
    let totalHeight = 0;
    console.log('Pages', pages);
    pages.forEach(page => {
      totalHeight += page.nativeElement.scrollHeight;
    });
    console.log('Total Height', totalHeight);
    return totalHeight;
  }

  chunkData(array: any[], chunkSize: number): any[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }

  printReport() {
    this.isSortedIconShow = true;
    this.isPrinting = true;
    this.cdRef.detectChanges();
    this.initPrint()
  }

  initPrint() {
    const el = document.querySelector('.report-container');
    if (el) {
      this.pdfUtils.printHtml(el.outerHTML, {
        isRtl: this.currentLanguage === 'ar',
        title: 'Report'
      });
    }
    this.isPrinting = false;
    this.cdRef.detectChanges();
  }

}
