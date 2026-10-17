import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesInvoiceService } from '../../../services/salesInvoice/sales-invoice.service';

type ItemStatus = 'pending' | 'downloading' | 'done' | 'error';

@Component({
  selector: 'app-invoice-download',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  styles: [`
    :host { display: block; min-height: 100dvh; background:#fcfcfc; }
    .wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
    .card {
      width: min(720px, 94vw);
      background: #fff;
      border: 1px solid rgba(0,0,0,.06);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(2,132,199,.06), 0 2px 10px rgba(0,0,0,.04);
    }
    .header { display:flex; align-items:center; gap:12px; margin-bottom: 12px; }
    .logo { width:40px; height:40px; border-radius:10px; display:grid; place-items:center;
      color:#fff; font-weight:800; background:linear-gradient(135deg,#0ea5e9,#22c55e); }
    h1 { margin:0; font-size:1.1rem; color:#0f172a; }
    .muted { color:#64748b; font-size:.92rem; margin:.25rem 0 0; }
    .progress-box {
      margin: 20px 0;
      padding: 18px 20px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .bar-container {
      height: 12px;
      width: 100%;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7, #0d9488);
      border-radius: 999px;
      transition: width 0.35s ease-in-out;
    }
    .percent-badge {
      font-size: 1.35rem;
      font-weight: 900;
      color: #0284c7;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 4px 22px;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.12);
      display: inline-block;
    }
    .list { margin-top: 18px; border-top: 1px dashed #e2e8f0; padding-top: 16px; max-height: 40vh; overflow: auto; }
    .item { display:grid; grid-template-columns: 14px 1fr auto; align-items:center; gap:10px; padding:8px 4px; }
    .item-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #0f172a; }
    .ref-badge {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      padding: 3px 12px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.88rem;
      box-shadow: 0 1px 4px rgba(2, 132, 199, 0.1);
    }
    .dot { width:10px; height:10px; border-radius:50%; background:#94a3b8; }
    .dot.downloading { background:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,.18); }
    .dot.done { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.18); }
    .dot.error { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.18); }
    .badge { font-size:.78rem; border-radius:999px; padding:3px 10px; font-weight:600; }
    .pending-b { background:#f1f5f9; color:#475569; }
    .downloading-b { background:#dbeafe; color:#1e40af; }
    .done-b { background:#dcfce7; color:#166534; }
    .error-b { background:#fee2e2; color:#991b1b; }
    .actions { margin-top: 20px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 18px; }
    .btn-download {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #0284c7, #0d9488);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 12px 32px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
    }
    .btn-download:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.38);
      background: linear-gradient(135deg, #0369a1, #0f766e);
    }
    .btn-download:active { transform: translateY(0); }
    .hint-text { color: #94a3b8; font-size: 0.84rem; margin-top: 10px; margin-bottom: 0; }
  `],
  template: `
    <div class="wrap">
      <div class="card" dir="rtl">
        <div class="header">
          <div class="logo">INV</div>
          <div>
            <h1>جاري تجهيز وتنزيل الفاتورة/الفواتير</h1>
            <p class="muted">
              {{ total() > 1 ? 'سيتم تنزيل الفواتير بالتتابع لتجنّب حظر المتصفح' : 'سيبدأ التنزيل تلقائيًا' }}
            </p>
          </div>
        </div>

        <div class="progress-box" *ngIf="total() > 0">
          <div class="bar-container">
            <div class="bar-fill" [style.width.%]="percent()"></div>
          </div>
          <div class="percent-badge">
            {{ percent() | number:'1.0-0' }}%
          </div>
        </div>

        <div class="list" *ngIf="total()">
          <div class="item" *ngFor="let id of ids(); let i = index">
            <span class="dot" [ngClass]="dotClass(i)"></span>
            <div class="item-title">
              <span>فاتورة رقم</span>
              <span class="ref-badge">{{ invoiceMap()[id] || id }}</span>
            </div>
            <span class="badge" [ngClass]="badgeClass(i)">{{ statusLabel(i) }}</span>
          </div>
        </div>

        <div class="actions" *ngIf="total() > 0 && isFinished()">
          <button class="btn-download" (click)="redownload()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>تحميل الفاتورة يدويًا</span>
          </button>
          <p class="hint-text">اضغط على الزر أعلاه إذا أردت تنزيل نسخة إضافية من الفاتورة</p>
        </div>

        <p class="muted" *ngIf="!total()">لا توجد فواتير صالحة للتنزيل.</p>
      </div>
    </div>
  `
})
export class InvoiceDownloadComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private salesInvoiceService = inject(SalesInvoiceService);

  // الحالة
  ids = signal<number[]>([]);
  completed = signal<number>(0);
  isFinished = signal<boolean>(false);
  invoiceMap = signal<{ [id: number]: string }>({});

  total = computed(() => this.ids().length);
  percent = computed(() => {
    if (this.isFinished()) return 100;
    return this.total() ? Math.round((this.completed() / this.total()) * 100) : 0;
  });
  nextIndex = computed(() => Math.min(this.completed() + 1, this.total()));

  private hasExecuted = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (this.hasExecuted) return;

      let ids = params.getAll('id');

      if (ids.length === 1 && ids[0]?.includes(',')) {
        ids = ids[0].split(',').map(x => x.trim()).filter(Boolean);
      }

      const numeric = Array.from(new Set(
        ids.map(x => Number(x)).filter(n => Number.isFinite(n) && n > 0)
      ));

      this.ids.set(numeric);
      this.completed.set(0);

      if (!numeric.length) {
        this.toast('لا يوجد أي رقم فاتورة صالح في الرابط', 'warn', 4000);
        return;
      }

      this.hasExecuted = true;
      this.startDownloadProcess(numeric);
    });
  }

  redownload(): void {
    const numeric = this.ids();
    if (!numeric.length) return;
    this.completed.set(0);
    this.isFinished.set(false);
    this.toast('جاري تنزيل الفاتورة...', 'info', 2000);
    this.startDownloadProcess(numeric);
  }

  /** UI Helpers */
  dotClass(i: number) {
    if (i < this.completed()) return 'done';
    if (i === this.completed()) return 'downloading';
    return '';
  }
  badgeClass(i: number) {
    if (i < this.completed()) return 'done-b';
    if (i === this.completed()) return 'downloading-b';
    return 'pending-b';
  }
  statusLabel(i: number) {
    if (i < this.completed()) return 'تم';
    if (i === this.completed()) return 'جاري التنزيل';
    return 'قيد الانتظار';
  }

  /** بدء عملية تنزيل مفردة ومحددة */
  private startDownloadProcess(ids: number[]) {
    ids.forEach((id, idx) => {
      this.downloadOne(id, idx + 1, ids.length);
    });
  }

  /** تنزيل فاتورة واحدة */
  private downloadOne(id: number, index1?: number, total?: number) {
    if (index1 && total) this.toast(`بدء تنزيل الفاتورة رقم ${index1}...`, 'info', 1500);

    this.salesInvoiceService.getInvoiceById(id).subscribe({
      next: (inv: any) => {
        const target = inv?.data || inv?.result || inv;
        const invNo = target?.invoiceNo || target?.invoiceNumber || target?.code || target?.referenceNo || target?.referenceNumber || target?.docNo || `${id}`;
        this.invoiceMap.update(m => ({ ...m, [id]: invNo }));
        const filename = `${invNo}.pdf`;
        this.fetchAndSaveDocument(id, filename, index1, total);
      },
      error: () => {
        const filename = `${id}.pdf`;
        this.fetchAndSaveDocument(id, filename, index1, total);
      }
    });
  }

  private fetchAndSaveDocument(id: number, filename: string, index1?: number, total?: number) {
    try {
      this.salesInvoiceService.getDocumentBlob(id).subscribe({
        next: (blob: Blob) => {
          if (blob) {
            this.saveBlob(blob, filename);
            this.toast(`تم تنزيل الفاتورة${index1 ? ' رقم ' + index1 : ''} بنجاح ✅`, 'success', 3500);
          }
        },
        error: (err: any) => {
          console.error('[InvoiceDownload] خطأ تنزيل فردي:', err);
          this.toast(`فشل تنزيل الفاتورة${index1 ? ' رقم ' + index1 : ''} ❌`, 'error', 4500);
          this.isFinished.set(true);
        },
        complete: () => {
          const nextVal = Math.min(this.completed() + 1, total || this.total());
          this.completed.set(nextVal);
          if (nextVal >= (total || this.total())) {
            this.isFinished.set(true);
          }
        }
      });
    } catch (e) {
      console.error('[InvoiceDownload] استثناء فردي:', e);
      this.toast(`استثناء أثناء تنزيل الفاتورة${index1 ? ' رقم ' + index1 : ''} ❌`, 'error', 4500);
      this.completed.set(Math.min(this.completed() + 1, total || this.total()));
      this.isFinished.set(true);
    }
  }

  /** Utilities */
  private extractBlob(res: any): Blob | null {
    if (!res) return null;
    if (res.body instanceof Blob) return res.body;
    if (res instanceof Blob) return res;
    return null;
  }

  private extFromMime(mime?: string): string {
    if (!mime) return '.bin';
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('zip')) return '.zip';
    if (mime.includes('json')) return '.json';
    if (mime.includes('csv')) return '.csv';
    if (mime.includes('image/jpeg')) return '.jpg';
    if (mime.includes('image/png')) return '.png';
    return '.bin';
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  /** ✅ Snackbar من أعلى الصفحة */
  private toast(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info', duration = 3000) {
    this.snack.open(message, 'إغلاق', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`snack-${type}`], // هنلوّنه بأنماط عامة تحت
    });
  }
}
