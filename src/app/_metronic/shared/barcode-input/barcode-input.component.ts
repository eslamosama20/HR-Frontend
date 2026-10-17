import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Observable, Subscription, take } from 'rxjs';
import { finalize } from 'rxjs/operators';

export interface BarcodeResolvedEvent {
  barcode: string;
  result: unknown;
}

export interface BarcodeFailedEvent {
  barcode: string;
  error: unknown;
}

@Component({
  selector: 'app-barcode-input',
  templateUrl: './barcode-input.component.html',
  styleUrls: ['./barcode-input.component.scss']
})
export class BarcodeInputComponent implements OnDestroy {
  @Input() placeholder: string = 'Scan or enter barcode';
  @Input() disabled: boolean = false;
  @Input() debounceTimeMs: number = 300;
  @Input() autoClearOnSuccess: boolean = true;
  @Input() errorText: string = 'Barcode lookup failed. Please try again.';
  @Input() scanHandler?: (barcode: string) => Observable<unknown>;

  @Output() barcodeSubmitted: EventEmitter<string> = new EventEmitter<string>();
  @Output() barcodeResolved: EventEmitter<BarcodeResolvedEvent> = new EventEmitter<BarcodeResolvedEvent>();
  @Output() barcodeFailed: EventEmitter<BarcodeFailedEvent> = new EventEmitter<BarcodeFailedEvent>();

  barcodeValue: string = '';
  loading: boolean = false;
  hasError: boolean = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private submitSubscription?: Subscription;

  onBarcodeValueChange(value: string): void {
    this.barcodeValue = value;
    this.hasError = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.submitBarcode();
    }, this.debounceTimeMs);
  }

  onEnterPressed(event: Event): void {
    event.preventDefault();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.submitBarcode();
  }

  clear(): void {
    this.barcodeValue = '';
    this.hasError = false;
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.submitSubscription?.unsubscribe();
  }

  private submitBarcode(): void {
    const barcode = this.barcodeValue.trim();
    if (!barcode || this.disabled || this.loading) {
      return;
    }

    this.barcodeSubmitted.emit(barcode);

    if (!this.scanHandler) {
      return;
    }

    this.submitSubscription?.unsubscribe();
    this.loading = true;
    this.hasError = false;

    this.submitSubscription = this.scanHandler(barcode)
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (result: unknown) => {
          this.barcodeResolved.emit({ barcode, result });
          if (this.autoClearOnSuccess) {
            this.clear();
          }
        },
        error: (error: unknown) => {
          this.hasError = true;
          this.barcodeFailed.emit({ barcode, error });
        }
      });
  }
}
