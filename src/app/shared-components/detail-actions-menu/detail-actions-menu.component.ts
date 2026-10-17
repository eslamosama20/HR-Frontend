import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BackButtonComponent } from '../back-button/back-button.component';

export interface ActionButton {
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
  action: (event?: any) => void;
  visible?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

export interface NavigationControls {
  currentPage: number;
  totalPages: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

@Component({
  selector: 'app-detail-actions-menu',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule, TooltipModule, BackButtonComponent],
  templateUrl: './detail-actions-menu.component.html',
  styleUrls: ['./detail-actions-menu.component.scss']
})
export class DetailActionsMenuComponent {
  constructor(public translate: TranslateService) {}

  // Standard button visibility controls
  @Input() showPrint: boolean = true;
  @Input() showEdit: boolean = true;
  @Input() showCopy: boolean = true;
  @Input() showDelete: boolean = true;
  @Input() showSendToFrontal: boolean = false;
  @Input() showCreateEntry: boolean = false;
  @Input() isDeleting: boolean = false;
  
  // Standard button states
  @Input() disablePrint: boolean = false;
  @Input() disableEdit: boolean = false;
  @Input() editTooltip?: string | null;
  @Input() disableCopy: boolean = false;
  @Input() copyTooltip?: string | null;
  @Input() disableDelete: boolean = false;
  @Input() deleteTooltip?: string | null;
  @Input() disableSendToFrontal: boolean = false;
  @Input() disableCreateEntry: boolean = false;
  
  // Navigation controls (pagination between records)
  @Input() navigationControls?: NavigationControls;
  
  // Custom buttons
  @Input() customButtons: ActionButton[] = [];
  
  // Document title
  @Input() documentTitle?: string;
  
  // Standard button events
  @Output() onPrint = new EventEmitter<void>();
  @Output() onEdit = new EventEmitter<void>();
  @Output() onCopy = new EventEmitter<void>();
  @Output() onDelete = new EventEmitter<Event | undefined>();
  @Output() onSendToFrontal = new EventEmitter<void>();
  @Output() onCreateEntry = new EventEmitter<void>();
  
  // Standard button handlers
  handlePrint(): void {
    this.onPrint.emit();
  }
  
  handleEdit(): void {
    this.onEdit.emit();
  }
  
  handleCopy(): void {
    this.onCopy.emit();
  }
  
  handleDelete(event?: Event): void {
    this.onDelete.emit(event);
  }
  
  handleSendToFrontal(): void {
    this.onSendToFrontal.emit();
  }
  
  handleCreateEntry(): void {
    this.onCreateEntry.emit();
  }
  
  // Navigation handlers
  handlePrevious(): void {
    if (this.navigationControls?.onPrevious) {
      this.navigationControls.onPrevious();
    }
  }
  
  handleNext(): void {
    if (this.navigationControls?.onNext) {
      this.navigationControls.onNext();
    }
  }
  
  // Helper to check if button should be visible
  isButtonVisible(button: ActionButton): boolean {
    return button.visible !== false;
  }
  
  // Helper to get button class based on color
  getButtonClass(color: string): string {
    const colorMap: { [key: string]: string } = {
      primary: 'btn-primary',
      success: 'btn-success',
      danger: 'btn-danger',
      warning: 'btn-warning',
      info: 'btn-info',
      secondary: 'btn-secondary'
    };
    return colorMap[color] || 'btn-primary';
  }
  
  // Handle custom button clicks with proper event handling
  handleCustomButton(button: ActionButton, event: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    
    if (button.disabled) {
      return;
    }

    // Call the button's action
    if (button.action) {
      button.action(event);
    }
  }
}
