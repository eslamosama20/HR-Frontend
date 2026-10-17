import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal } from '@angular/core';

import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { TranslateModule } from '@ngx-translate/core';
import { PrintDocumentComponent } from "../../../shared-components/print-document/print-document.component";

import {RadioButtonModule} from "primeng/radiobutton";
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-supplier-report-by-store',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TranslateModule,
    RadioButtonModule,
    ButtonModule
  ],
  templateUrl: './supplier-report-by-store.component.html',
  styleUrls: ['./supplier-report-by-store.component.scss'],
})
export class SupplierReportByStoreComponent implements OnInit {

  constructor(
    private sanitizer: DomSanitizer
  ) {
    this.sanitizedReportSrc = this.sanitizeUrl(this.reportSrc);
  }

  sanitizedReportSrc: SafeResourceUrl;
  reportSrc: string = 'https://sql5090.site4now.net/ReportServer/Pages/ReportViewer.aspx?/smartpro7-001/supplierReportByStore&rs:Command=Render';

  ngOnInit(): void {

  }
  private sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
