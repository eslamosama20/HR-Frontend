import { Directive, ElementRef, HostListener, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[rtlColumnResize]'
})
export class RtlColumnResizeDirective implements OnInit, OnDestroy {
  private resizer!: HTMLElement;
  private startX = 0;
  private startWidth = 0;
  private isResizing = false;
  private minWidth = 40;

  private boundMouseMove!: (e: MouseEvent) => void;
  private boundMouseUp!: (e: MouseEvent) => void;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const th = this.el.nativeElement;
    this.renderer.setStyle(th, 'position', 'relative');
    this.renderer.setStyle(th, 'overflow', 'visible');

    // إنشاء مقبض الـ resize على الحافة اليسرى (RTL)
    this.resizer = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(this.resizer, 'rtl-col-resizer');
    this.renderer.setStyle(this.resizer, 'position', 'absolute');
    this.renderer.setStyle(this.resizer, 'top', '0');
    this.renderer.setStyle(this.resizer, 'bottom', '0');
    this.renderer.setStyle(this.resizer, 'left', '0');
    this.renderer.setStyle(this.resizer, 'width', '6px');
    this.renderer.setStyle(this.resizer, 'cursor', 'col-resize');
    this.renderer.setStyle(this.resizer, 'z-index', '10');
    this.renderer.setStyle(this.resizer, 'background', 'transparent');

    this.resizer.addEventListener('mousedown', this.onMouseDown.bind(this));

    this.renderer.appendChild(th, this.resizer);

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.el.nativeElement.offsetWidth;

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    // في RTL: السحب لليسار (deltaX سالب) = تكبير العمود
    //          السحب لليمين (deltaX موجب) = تصغير العمود
    const deltaX = event.clientX - this.startX;
    const newWidth = this.startWidth - deltaX; // معكوس لـ RTL

    if (newWidth >= this.minWidth) {
      this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
      this.renderer.setStyle(this.el.nativeElement, 'min-width', `${newWidth}px`);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.resizer) {
      this.resizer.removeEventListener('mousedown', this.onMouseDown.bind(this));
    }
  }
}
