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
  selector: 'app-inventory-report-3',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TranslateModule,
    PrintDocumentComponent,
    NgOptimizedImage,
    RadioButtonModule,
    ButtonModule
  ],
  templateUrl: './inventory-report-3.component.html',
  styleUrls: ['./inventory-report-3.component.scss']
})
export class InventoryReport3Component implements OnInit {

  constructor(
    private sanitizer: DomSanitizer
  ) {
    this.sanitizedReportSrc = this.sanitizeUrl(this.reportSrc);
  }

  sanitizedReportSrc: SafeResourceUrl;
  reportSrc: string = 'https://sql5090.site4now.net/ReportServer/Pages/ReportViewer.aspx?/smartpro7-001/inventoryReport&rs:Command=Render';
  
  ngOnInit(): void {
      
  }
  private sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
