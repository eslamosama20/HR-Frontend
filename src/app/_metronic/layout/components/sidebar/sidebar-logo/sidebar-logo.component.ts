import {Component, Input, OnDestroy, OnInit, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import {Subscription} from 'rxjs';
import {LayoutType} from '../../../core/configs/config';
import {LayoutService} from '../../../core/layout.service';
import {TranslationService} from "../../../../../modules/i18n";
import {ToggleComponent} from '../../../../kt/components';

@Component({
  selector: 'app-sidebar-logo',
  templateUrl: './sidebar-logo.component.html',
  styleUrls: ['./sidebar-logo.component.scss'],
})
export class SidebarLogoComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() toggleButtonClass: string = '';
  @Input() toggleEnabled: boolean;
  @Input() toggleType: string = '';
  @Input() toggleState: string = '';
  currentLayoutType: LayoutType | null;
  toggleAttr: string;
  activeLanguage: string = 'en';
  private unsubscribe: Subscription[] = [];

  constructor(
    private layout: LayoutService, 
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.activeLanguage = this.translationService.getSelectedLanguage();
  }

  ngOnInit(): void {
    this.toggleAttr = `app-sidebar-${this.toggleType}`;
    const layoutSubscr = this.layout.currentLayoutTypeSubject
      .asObservable()
      .subscribe((layout) => {
        this.currentLayoutType = layout;
      });
    this.unsubscribe.push(layoutSubscr);
  }

  ngAfterViewInit(): void {
    // إعادة تهيئة ToggleComponent بعد تحميل العرض لضمان عمل الزر بشكل صحيح
    setTimeout(() => {
      ToggleComponent.reinitialization();
    }, 100);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
