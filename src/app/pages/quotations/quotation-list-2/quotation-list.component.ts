import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import { SharedModule } from "../../../_metronic/shared/shared.module";
import { SalesInvoice } from 'src/app/models/salesInvoice/salesInvoice';
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { SalesInvoiceService } from "../../../services/salesInvoice/sales-invoice.service";
import { TranslationService } from "../../../modules/i18n";
import { FormsModule } from '@angular/forms';
import {CustomDatePipe} from "../../../pipes/custom-date.pipe";
import { MessageService } from 'primeng/api'; // Import FormsModule for ngModel

@Component({
  selector: 'app-quotation-list',
  standalone: true,
    imports: [CommonModule, TranslateModule, SharedModule, FormsModule, RouterLink, CustomDatePipe], // Add FormsModule here
  templateUrl: './quotation-list.component.html',
  styleUrl: './quotation-list.component.scss'
})
export class QuotationListComponent implements OnInit {
  invoicesSignal = signal<SalesInvoice[]>([]);
  get invoices() {
    return this.invoicesSignal();
  }
  set invoices(value: SalesInvoice[]) {
    this.invoicesSignal.set(value);
  }

  filteredInvoicesSignal = signal<SalesInvoice[]>([]);
  get filteredInvoices() {
    return this.filteredInvoicesSignal();
  }
  set filteredInvoices(value: SalesInvoice[]) {
    this.filteredInvoicesSignal.set(value);
  }
  searchText: string = '';  // To hold the search input

  loadingStates: { [id: number]: boolean } = {};

  constructor(
    private invoiceService: SalesInvoiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private messageService: MessageService
  ) {
    this.translate = translateService;
    this.activeLanguage = translationService.getSelectedLanguage();
  }

  translate: TranslateService;
  activeLanguage: string = "en";

  ngOnInit(): void {
    // Fetch all invoices on init
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getAllQuotationInvoices().subscribe(invoices => {
      console.log(invoices)
      this.invoices = invoices;  // Set original invoices
      this.filteredInvoices = invoices;  // Initially set filteredInvoices to all invoices
    });
  }

  // Filter invoices by invoiceNo based on search text
  filterInvoices(): void {
    const searchValue = this.searchText.toLowerCase();  // Convert search text to lowercase
    this.filteredInvoices = this.invoices.filter(invoice =>
      containsStringInObject(invoice, searchValue)
    );
  }



  deleteInvoice(id?: number): void {
    if (id) {
      this.invoiceService.deleteInvoice(id).subscribe({
        next:(re)=>{
          this.invoices = this.invoices.filter(invoice => invoice.id !== id);
          this.filteredInvoices = this.filteredInvoices.filter(invoice => invoice.id !== id);  // Update filteredInvoices
          this.cdr.detectChanges();
        },
        error:(er)=>console.log('error',er)
      });
    }
  }

  viewInvoice(id?: number): void {
    this.router.navigate(['/quotations', id]);
  }

  editInvoice(id?: number): void {
    if (id) {
      this.router.navigate(['/quotations/edit', id]);
    }
  }

  addInvoice(): void {
    this.router.navigate(['/quotations/new']);
  }

  createInvoice(id: number): void {
    if (!id) return;
    
    this.loadingStates[id] = true;
    this.invoiceService.convertQuotationToInvoice(id).subscribe({
      next: (invoice) => {
        this.loadingStates[id] = false;
        this.messageService.add({
          severity: 'success',
          summary: 'نجح',
          detail: `تم تحويل عرض السعر إلى فاتورة مبيعات رقم ${invoice.invoiceNo}`
        });
        // Refresh the list to show the updated quotation with the converted indicator
        this.loadInvoices();
      },
      error: (error) => {
        this.loadingStates[id] = false;
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.error || 'فشل تحويل عرض السعر إلى فاتورة'
        });
      }
    });
  }
}
function containsStringInObject(obj: any, searchString: string): boolean {
  if (!obj || typeof obj !== 'object') return false;  // Ensure obj is valid
  return Object.values(obj).some(value =>
    typeof value === 'string' && value.toLowerCase().includes(searchString)
  );
}
