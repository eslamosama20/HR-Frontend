import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-zid-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="zid-skeleton" aria-hidden="true">
      <span *ngFor="let item of skeletonRows"></span>
    </div>
  `
})
export class ZidSkeletonComponent {
  @Input() rows = 4;

  get skeletonRows(): number[] {
    return Array.from({ length: this.rows }, (_, index) => index);
  }
}
