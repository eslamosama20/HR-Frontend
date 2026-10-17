import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { CustomerProfileService } from '../accounting/customer-profile.service';
import { RootSalesClassService } from '../sales-classes-tree/root-sales-class.service';

/**
 * Singleton cache for heavy invoice lookup data.
 * - First call fires the HTTP request.
 * - All subsequent calls (even across different component instances) get the
 *   cached result instantly — zero additional HTTP requests.
 *
 * Call `invalidate()` after saving a new customer/sales-class so the next
 * open will re-fetch fresh data.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceLookupCacheService {
  private customers$: Observable<any[]> | null = null;
  private rootSalesClasses$: Observable<any[]> | null = null;

  constructor(
    private customerService: CustomerProfileService,
    private rootSalesClassService: RootSalesClassService
  ) {}

  /** Returns cached customers (fetched once per session). */
  getCustomers(): Observable<any[]> {
    if (!this.customers$) {
      this.customers$ = this.customerService.getAll(1, 10000).pipe(
        shareReplay(1)
      );
    }
    return this.customers$;
  }

  /** Returns cached root sales classes (fetched once per session). */
  getRootSalesClasses(): Observable<any[]> {
    if (!this.rootSalesClasses$) {
      this.rootSalesClasses$ = this.rootSalesClassService.getAll(1, 10000).pipe(
        shareReplay(1)
      );
    }
    return this.rootSalesClasses$;
  }

  /** Call this after adding a new customer to force a re-fetch on next use. */
  invalidateCustomers(): void {
    this.customers$ = null;
  }

  /** Call this after adding a new sales class to force a re-fetch on next use. */
  invalidateSalesClasses(): void {
    this.rootSalesClasses$ = null;
  }

  /** Invalidate everything (e.g. after logout). */
  invalidateAll(): void {
    this.customers$ = null;
    this.rootSalesClasses$ = null;
  }
}
