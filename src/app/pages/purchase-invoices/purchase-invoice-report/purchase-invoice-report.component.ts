import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-purchase-invoice-report',
  standalone: true,
  imports: [],
  templateUrl: './purchase-invoice-report.component.html',
  styleUrl: './purchase-invoice-report.component.scss'
})
export class PurchaseInvoiceReportComponent implements OnInit {
  reportSrc: SafeResourceUrl | null = null;
  id: string = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      this.id = params['id'];
      const url = `http://localhost/reportserver?/SmartAndPro.ERP.SSRS/Invoice&rs:embed=true&rc:Parameters=false&InvoiceId=${this.id}`;
      this.reportSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      console.log(this.reportSrc);
    });
  }
}