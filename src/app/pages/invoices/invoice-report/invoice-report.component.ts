import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-invoice-report',
  standalone: true,
  imports: [],
  templateUrl: './invoice-report.component.html',
  styleUrl: './invoice-report.component.scss'
})
export class InvoiceReportComponent implements OnInit {
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