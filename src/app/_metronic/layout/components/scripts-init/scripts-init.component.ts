import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, ResolveEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { LayoutService } from '../../core/layout.service';
import {
  ToggleComponent,
  ScrollTopComponent,
  DrawerComponent,
  StickyComponent,
  MenuComponent,
  ScrollComponent,
} from '../../../kt/components';
import { PageInfoService } from '../../core/page-info.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-scripts-init',
  templateUrl: './scripts-init.component.html',
})
export class ScriptsInitComponent implements OnInit, OnDestroy {
  private unsubscribe: Subscription[] = [];
  constructor(
    private layout: LayoutService,
    private pageInfo: PageInfoService,
    private router: Router,
    private titleService: Title,
  ) {
    const initPageInfo = () => {
      [10, 100, 300].forEach((delay) => {
        setTimeout(() => {
          this.pageInfo.calculateTitle();
          this.pageInfo.calculateBreadcrumbs();

          const currentTitle = this.pageInfo.title.getValue();
          if (currentTitle) {
            this.titleService.setTitle(currentTitle + ' - SmartAndPro ERP');
          }
        }, delay);
      });
    };

    initPageInfo();
    // subscribe to router events
    const routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd || event instanceof ResolveEnd))
      .subscribe(() => {
        initPageInfo();
        DrawerComponent.hideAll();
        this.pluginsReInitialization();
      });
    this.unsubscribe.push(routerSub);
  }

  ngOnInit(): void {
    this.pluginsInitialization();
    const layoutUpdateSubscription = this.layout.layoutConfigSubject
      .asObservable()
      .subscribe(() => {
        this.pluginsReInitialization();
      });
    this.unsubscribe.push(layoutUpdateSubscription);
  }

  pluginsInitialization() {
    setTimeout(() => {
      ToggleComponent.bootstrap();
      ScrollTopComponent.bootstrap();
      DrawerComponent.bootstrap();
      StickyComponent.bootstrap();
      MenuComponent.bootstrap();
      ScrollComponent.bootstrap();
    }, 200);
  }

  pluginsReInitialization() {
    setTimeout(() => {
      ToggleComponent.reinitialization();
      ScrollTopComponent.reinitialization();
      DrawerComponent.reinitialization();
      StickyComponent.bootstrap();
      MenuComponent.reinitialization();
      ScrollComponent.reinitialization();
    }, 100);
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
