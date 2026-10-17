import { Component, Input, Output, EventEmitter } from '@angular/core';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import { UseFontAwesomeIconPackService } from '../../services/use-font-awesome-icon-pack.service';
import {ButtonModule} from "primeng/button";
import {DividerModule} from "primeng/divider";
import {InputTextModule} from "primeng/inputtext";
import {OverlayPanel, OverlayPanelModule} from "primeng/overlaypanel";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ChangeDetectionStrategy } from '@angular/core';
import {ScrollerModule} from "primeng/scroller";
import {SpinnerModule} from "primeng/spinner";
import {TableModule} from "primeng/table";
import {TranslateService} from "@ngx-translate/core";
import {InfiniteScrollDirective} from "ngx-infinite-scroll";


@Component({
  selector: 'app-font-awesome-icon-picker',
  templateUrl: './font-awesome-icon-picker.component.html',
  styleUrls: ['./font-awesome-icon-picker.component.scss'],
  standalone: true,
  imports: [
    OverlayPanelModule,
    InputTextModule,
    DividerModule,
    ButtonModule,
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    ScrollerModule,
    SpinnerModule,
    TableModule,
    InfiniteScrollDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class FontAwesomeIconPickerComponent {
  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string>();

  loading = false;
  private filterCache: { [key: string]: IconDefinition[] } = {};


  constructor(private iconPackService: UseFontAwesomeIconPackService, public translate: TranslateService) {
    this.iconPack = this.iconPackService.getIconPack();
    this.displayedItems = this.filteredIcons.slice(0, 40);
  }

  searchText = '';
  previousSearchText = '';
  anchorEl: any = null;
  iconPack ;

  public onIconSelect(iconName: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('onIconSelect', iconName);
    this.valueChange.emit(iconName);
  }

  private debounceTimeout: any;
  onSearchTextChange(event: Event) {
    this.searchText = (event.target as HTMLInputElement).value;
    // Debounce the search to avoid too many operations
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      // Your search/filtering logic
      this.filteredIcons; // This will re-evaluate and filter
    }, 300); // 300ms debounce
  }

  get filteredIcons() {
    if (this.filterCache[this.searchText]) {
      return this.filterCache[this.searchText];
    }

    // Filter icons based on search text
    const filtered = this.iconPack.filter(icon =>
      icon.iconName.includes(this.searchText.toLowerCase())
    );

    // Cache the filtered result
    this.filterCache[this.searchText] = filtered;
    return filtered;
  }
  displayedItems = []

  onScroll() {
    console.log('onScroll');
    const currentLength = this.displayedItems.length;
    const moreItems = this.filteredIcons.slice(currentLength, currentLength + 20);
    this.displayedItems = [...this.displayedItems, ...moreItems];
  }

// Helper method to chunk the array into smaller arrays of a specified size

  onHide() {
    this.displayedItems = this.filteredIcons.slice(0, 40);
  }

}
