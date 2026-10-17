import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule],
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss']
})
export class BackButtonComponent implements OnInit {
  @Input() customRoute?: string; // Optional: specify a custom route to navigate to
  @Input() label: string = 'COMMON.BACK'; // Translation key for the button label
  @Input() icon: string = 'pi pi-arrow-left'; // Icon for the button
  @Input() styleClass: string = 'p-button-secondary'; // PrimeNG button style class
  @Input() modernStyle: boolean = true; // Use modern gradient style (true) or classic style (false)
  @Input() showLabel: boolean = true; // Show/hide label text
  @Input() disabled: boolean = false; // Disable button state

  isArabic: boolean = false;

  constructor(
    private location: Location,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Check current language
    this.isArabic = this.translate.currentLang === 'ar';
    
    // Subscribe to language changes
    this.translate.onLangChange.subscribe(event => {
      this.isArabic = event.lang === 'ar';
    });
  }

  goBack(): void {
    if (this.customRoute) {
      // If a custom route is provided, navigate to it
      this.router.navigate([this.customRoute]);
    } else {
      // Otherwise, use browser history to go back
      // But first, check if we have a parent route we can infer
      const currentUrl = this.router.url;
      const parentRoute = this.getParentRoute(currentUrl);
      
      if (parentRoute) {
        this.router.navigate([parentRoute]);
      } else {
        this.location.back();
      }
    }
  }

  /**
   * Infer the parent route from the current URL
   * Examples:
   * - /reservations/new -> /reservations
   * - /purchase-invoices/edit/123 -> /purchase-invoices/list
   * - /inventory/product-details/123 -> /inventory/product-details
   */
  private getParentRoute(url: string): string | null {
    // Remove query params and fragments
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segments = cleanUrl.split('/').filter(segment => segment);

    if (segments.length === 0) {
      return null;
    }

    // Special cases for common patterns
    const lastSegment = segments[segments.length - 1];
    const secondLastSegment = segments.length > 1 ? segments[segments.length - 2] : null;

    // Pattern: /module/new -> /module or /module/list
    if (lastSegment === 'new' || lastSegment === 'frontal-new') {
      const parentPath = '/' + segments.slice(0, -1).join('/');
      // Check if a list route exists for common modules
      const module = segments[segments.length - 2];
      
      // For request-quotation, don't add /list, just return parent path
      if (module === 'request-quotation') {
        return parentPath;
      }
      
      if (this.hasListRoute(module)) {
        return parentPath + '/list';
      }
      return parentPath;
    }

    // Pattern: /module/edit/123 or /module/frontal-edit/123 or /module/view/123 -> /module or /module/list
    if (secondLastSegment === 'edit' || secondLastSegment === 'frontal-edit' || secondLastSegment === 'view') {
      const parentPath = '/' + segments.slice(0, -2).join('/');
      const module = segments[segments.length - 3];
      
      // For request-quotation, don't add /list, just return parent path
      if (module === 'request-quotation') {
        return parentPath;
      }
      
      if (this.hasListRoute(module)) {
        return parentPath + '/list';
      }
      return parentPath;
    }

    // Pattern: /module/123 (details page) -> /module or /module/list
    if (lastSegment && !isNaN(Number(lastSegment)) || this.isGuid(lastSegment)) {
      const parentPath = '/' + segments.slice(0, -1).join('/');
      const module = segments[segments.length - 2];
      if (this.hasListRoute(module)) {
        return parentPath + '/list';
      }
      return parentPath;
    }

    // Pattern: /module/frontal/123 -> /module/frontal
    if (secondLastSegment === 'frontal' && (this.isGuid(lastSegment) || !isNaN(Number(lastSegment)))) {
      return '/' + segments.slice(0, -1).join('/');
    }

    // Default: go up one level
    if (segments.length > 1) {
      return '/' + segments.slice(0, -1).join('/');
    }

    return null;
  }

  /**
   * Check if a module typically has a /list route
   */
  private hasListRoute(module: string): boolean {
    const modulesWithList = [
      'purchase-invoices',
      'sales-invoices',
      'invoices',
      'purchase-returns',
      'sales-returns',
      'quotations',
      'receipts',
      'notes',
      'sales-credit-notes',
      'request-quotation' // Added for purchase request quotations
    ];
    return modulesWithList.includes(module);
  }

  /**
   * Check if a string is a GUID
   */
  private isGuid(str: string): boolean {
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidPattern.test(str);
  }
}
