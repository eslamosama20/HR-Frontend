import { Table } from 'primeng/table';
import { DomHandler } from 'primeng/dom';

let isPatched = false;

/**
 * تصحيح اتجاه سحب وتغيير حجم أعمدة جداول PrimeNG في وضع RTL (اللغة العربية)
 * يضمن أن سحب مقبض العمود لليسار يوسع العمود ولليمين يضيقه بشكل طبيعي وبديهي
 */
export function applyPrimeNGRtlTablePatch(): void {
  if (isPatched) return;
  isPatched = true;

  const originalOnColumnResizeEnd = Table.prototype.onColumnResizeEnd;

  Table.prototype.onColumnResizeEnd = function () {
    try {
      const containerEl = this.containerViewChild?.nativeElement;
      const isRtl =
        (containerEl && window.getComputedStyle(containerEl).direction === 'rtl') ||
        document.documentElement.dir === 'rtl' ||
        document.body.dir === 'rtl';

      const rawDelta =
        (this.resizeHelperViewChild?.nativeElement?.offsetLeft ?? 0) - (this.lastResizerHelperX ?? 0);
      const delta = isRtl ? -rawDelta : rawDelta;

      if (!this.resizeColumnElement) {
        if (this.resizeHelperViewChild?.nativeElement) {
          this.resizeHelperViewChild.nativeElement.style.display = 'none';
        }
        if (containerEl) {
          DomHandler.removeClass(containerEl, 'p-unselectable-text');
        }
        return;
      }

      const columnWidth = this.resizeColumnElement.offsetWidth;
      const newColumnWidth = columnWidth + delta;
      const elementMinWidth = this.resizeColumnElement.style.minWidth
        ? this.resizeColumnElement.style.minWidth.replace(/[^\d.]/g, '')
        : '';
      const minWidth = elementMinWidth ? parseFloat(elementMinWidth) : 15;

      if (newColumnWidth >= minWidth) {
        if (this.columnResizeMode === 'fit') {
          const nextColumn = this.resizeColumnElement.nextElementSibling;
          if (nextColumn) {
            const nextColumnWidth = nextColumn.offsetWidth - delta;
            if (newColumnWidth > 15 && nextColumnWidth > 15) {
              this.resizeTableCells(newColumnWidth, nextColumnWidth);
            }
          }
        } else if (this.columnResizeMode === 'expand') {
          this._initialColWidths = this._totalTableWidth();
          const tableWidth = (this.tableViewChild?.nativeElement?.offsetWidth ?? 0) + delta;
          this.setResizeTableWidth(tableWidth + 'px');
          this.resizeTableCells(newColumnWidth, null);
        }

        this.onColResize.emit({
          element: this.resizeColumnElement,
          delta: delta,
        });

        if (this.isStateful()) {
          this.saveState();
        }
      }

      if (this.resizeHelperViewChild?.nativeElement) {
        this.resizeHelperViewChild.nativeElement.style.display = 'none';
      }
      if (containerEl) {
        DomHandler.removeClass(containerEl, 'p-unselectable-text');
      }
    } catch (e) {
      console.warn('Fallback to original onColumnResizeEnd:', e);
      originalOnColumnResizeEnd?.apply(this);
    }
  };
}
