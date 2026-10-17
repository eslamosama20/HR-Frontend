import {
  Directive,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * شريط تمرير أفقي عائم يلتصق بأسفل الشاشة (Sticky Horizontal Scrollbar)
 * يظهر تلقائياً عندما يتجاوز عرض الجدول حجم الشاشة ويكون أسفل الجدول خارج نطاق الرؤية (Below Viewport).
 * يتزامن في الاتجاهين (RTL و LTR) بشكل فوري ودقيق.
 */
@Directive({
  selector: '[appStickyHorizontalScroll], [stickyHorizontalScroll]',
  standalone: true,
})
export class StickyHorizontalScrollDirective implements OnInit, OnDestroy {
  private wrapper: HTMLElement | null = null;
  private stickyBar: HTMLElement | null = null;
  private dummyEl: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private isSyncing = false;
  private boundWindowScroll: (() => void) | null = null;
  private boundWindowResize: (() => void) | null = null;
  private isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Run outside Angular to avoid triggering unnecessary change detection cycles
    this.ngZone.runOutsideAngular(() => {
      // Small timeout to allow PrimeNG Table to initialize its DOM
      setTimeout(() => {
        this.initStickyScrollbar();
      }, 100);
    });
  }

  private initStickyScrollbar(): void {
    const host = this.el.nativeElement;
    this.wrapper = host.querySelector('.p-datatable-wrapper') || host;

    if (!this.wrapper) return;

    // Create sticky scrollbar container
    this.stickyBar = this.renderer.createElement('div');
    this.renderer.addClass(this.stickyBar, 'sticky-horizontal-scrollbar');
    this.renderer.setStyle(this.stickyBar, 'position', 'fixed');
    this.renderer.setStyle(this.stickyBar, 'bottom', '0');
    this.renderer.setStyle(this.stickyBar, 'height', '18px');
    this.renderer.setStyle(this.stickyBar, 'overflow-x', 'auto');
    this.renderer.setStyle(this.stickyBar, 'overflow-y', 'hidden');
    this.renderer.setStyle(this.stickyBar, 'z-index', '999');
    this.renderer.setStyle(this.stickyBar, 'background', 'rgba(248, 250, 252, 0.95)');
    this.renderer.setStyle(this.stickyBar, 'backdrop-filter', 'blur(8px)');
    this.renderer.setStyle(this.stickyBar, 'border-top', '1px solid #cbd5e1');
    this.renderer.setStyle(this.stickyBar, 'box-shadow', '0 -3px 12px rgba(0, 0, 0, 0.1)');
    this.renderer.setStyle(this.stickyBar, 'display', 'none');

    // Create inner dummy element to give the stickyBar its scroll width
    this.dummyEl = this.renderer.createElement('div');
    this.renderer.setStyle(this.dummyEl, 'height', '1px');
    this.renderer.setStyle(this.dummyEl, 'pointer-events', 'none');
    this.renderer.appendChild(this.stickyBar, this.dummyEl);

    // Append stickyBar to body
    document.body.appendChild(this.stickyBar);

    // Synchronize scrolling: stickyBar -> table wrapper
    this.stickyBar.addEventListener(
      'scroll',
      () => {
        if (this.isSyncing || !this.wrapper || !this.stickyBar) return;
        this.isSyncing = true;
        this.wrapper.scrollLeft = this.stickyBar.scrollLeft;
        this.isSyncing = false;
      },
      { passive: true }
    );

    // Synchronize scrolling: table wrapper -> stickyBar
    this.wrapper.addEventListener(
      'scroll',
      () => {
        if (this.isSyncing || !this.wrapper || !this.stickyBar) return;
        this.isSyncing = true;
        this.stickyBar.scrollLeft = this.wrapper.scrollLeft;
        this.isSyncing = false;
      },
      { passive: true }
    );

    // Listen to window events
    this.boundWindowScroll = () => this.updatePosition();
    this.boundWindowResize = () => this.updatePosition();
    window.addEventListener('scroll', this.boundWindowScroll, { passive: true });
    window.addEventListener('resize', this.boundWindowResize, { passive: true });

    // Observe size changes in table wrapper and internal table
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updatePosition());
      this.resizeObserver.observe(this.wrapper);
      const table = this.wrapper.querySelector('table');
      if (table) {
        this.resizeObserver.observe(table);
      }
    }

    // Observe DOM mutations (row changes, pagination)
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => this.updatePosition());
      this.mutationObserver.observe(this.wrapper, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    this.updatePosition();
  }

  private updatePosition(): void {
    if (!this.wrapper || !this.stickyBar || !this.dummyEl) return;

    const rect = this.wrapper.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    const hasHorizontalOverflow = this.wrapper.scrollWidth > this.wrapper.clientWidth + 2;
    // Table is visible in the viewport
    const isTopVisible = rect.top < windowHeight - 40;
    // The native bottom scrollbar is below the screen (hidden from view)
    const isBottomHidden = rect.bottom > windowHeight;

    const shouldShow = hasHorizontalOverflow && isTopVisible && isBottomHidden;

    if (shouldShow) {
      const computedDir = window.getComputedStyle(this.wrapper).direction || 'rtl';
      this.stickyBar.dir = computedDir;
      this.stickyBar.style.left = `${Math.max(0, rect.left)}px`;
      this.stickyBar.style.width = `${Math.min(rect.width, window.innerWidth - Math.max(0, rect.left))}px`;
      this.dummyEl.style.width = `${this.wrapper.scrollWidth}px`;
      this.stickyBar.style.display = 'block';

      if (!this.isSyncing) {
        this.isSyncing = true;
        this.stickyBar.scrollLeft = this.wrapper.scrollLeft;
        this.isSyncing = false;
      }
    } else {
      this.stickyBar.style.display = 'none';
    }
  }

  ngOnDestroy(): void {
    if (this.boundWindowScroll) {
      window.removeEventListener('scroll', this.boundWindowScroll);
    }
    if (this.boundWindowResize) {
      window.removeEventListener('resize', this.boundWindowResize);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.stickyBar && this.stickyBar.parentNode) {
      this.stickyBar.parentNode.removeChild(this.stickyBar);
    }
  }
}
