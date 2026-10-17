import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

export interface PageLink {
  title: string;
  path: string;
  isActive: boolean;
  isSeparator?: boolean;
}

export class PageInfo {
  breadcrumbs: Array<PageLink> = [];
  title: string = '';
}

@Injectable({
  providedIn: 'root',
})
export class PageInfoService {
  public title: BehaviorSubject<string> = new BehaviorSubject<string>(
    'Dashboard'
  );
  public description: BehaviorSubject<string> = new BehaviorSubject<string>('');
  public breadcrumbs: BehaviorSubject<Array<PageLink>> = new BehaviorSubject<
    Array<PageLink>
  >([]);

  constructor(private router: Router, private translate: TranslateService) {
    this.translate.onLangChange.subscribe(() => {
      this.calculateTitle();
      this.calculateBreadcrumbs();
    });
  }

  public setTitle(_title: string) {
    let translatedTitle = _title;
    if (_title && this.translate) {
      const translation = this.translate.instant(_title);
      if (translation && translation !== _title) {
        translatedTitle = translation;
      }
    }
    this.title.next(translatedTitle);
  }

  public updateTitle(_title: string) {
    setTimeout(() => {
      this.setTitle(_title);
    }, 1);
  }

  public setDescription(_title: string) {
    this.description.next(_title);
  }

  public updateDescription(_description: string) {
    setTimeout(() => {
      this.setDescription(_description);
    }, 1);
  }

  public setBreadcrumbs(_bs: Array<PageLink>) {
    this.breadcrumbs.next(_bs);
  }

  public updateBreadcrumbs(_bs: Array<PageLink>) {
    setTimeout(() => {
      this.setBreadcrumbs(_bs);
    }, 20);
  }

  public calculateTitle() {
    const asideTitle = this.calculateTitleInMenu('kt_app_sidebar');
    const headerTitle = this.calculateTitleInMenu('kt_app_header_menu');
    const routeTitle = this.calculateTitleFromRoute();
    const title = asideTitle || headerTitle || routeTitle || '';
    if (title) {
      this.setTitle(title);
    }
  }

  public calculateTitleFromRoute(): string | undefined {
    if (!this.router || !this.router.routerState) {
      return undefined;
    }
    let route: ActivatedRoute = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data['title'] || route.snapshot.data['pageTitle'] || undefined;
  }

  public calculateTitleInMenu(menuId: string): string | undefined {
    const menu = document.getElementById(menuId);
    if (!menu) {
      return;
    }

    const currentPath = window.location.pathname.toLowerCase();

    const allLinks = Array.from<HTMLLinkElement>(
      menu.querySelectorAll('a.menu-link')
    );

    // 1. Filter active links (excluding dropdowns / theme mode switchers)
    const activeLinks = allLinks.filter((link) => {
      if (link.closest('[data-kt-element="mode"]') || link.closest('.menu-sub-dropdown')) {
        return false;
      }
      return link.classList.contains('active');
    });

    let targetLink: HTMLLinkElement | undefined;

    if (activeLinks.length > 0) {
      targetLink = activeLinks.reduce((best, link) => {
        const routerLink = link.getAttribute('routerlink') || link.getAttribute('ng-reflect-router-link') || '';
        const href = link.getAttribute('href') || '';
        const linkPath = (routerLink || href).toLowerCase().trim();

        const bestRouterLink = best.getAttribute('routerlink') || best.getAttribute('ng-reflect-router-link') || '';
        const bestHref = best.getAttribute('href') || '';
        const bestPath = (bestRouterLink || bestHref).toLowerCase().trim();

        if (currentPath === linkPath) return link;
        if (currentPath === bestPath) return best;

        return linkPath.length > bestPath.length ? link : best;
      }, activeLinks[0]);
    }

    // 2. Fallback to route path matching if active class has not applied yet
    if (!targetLink) {
      targetLink = allLinks.find((link) => {
        if (link.closest('[data-kt-element="mode"]') || link.closest('.menu-sub-dropdown')) {
          return false;
        }
        const routerLink = link.getAttribute('routerlink') || link.getAttribute('ng-reflect-router-link') || '';
        const href = link.getAttribute('href') || '';
        const linkPath = (routerLink || href).toLowerCase().trim();
        return linkPath && linkPath !== '/' && linkPath !== '#' && (currentPath.endsWith(linkPath) || currentPath === linkPath);
      });
    }

    if (!targetLink) {
      return;
    }

    const titleSpan = targetLink.querySelector(
      'span.menu-title'
    ) as HTMLSpanElement | null;

    return titleSpan ? titleSpan.innerText.trim() : undefined;
  }

  public calculateBreadcrumbs() {
    const asideBc = this.calculateBreadcrumbsInMenu('kt_app_sidebar');
    const headerBc = this.calculateBreadcrumbsInMenu('kt_app_header_menu');
    const routeBc = this.calculateBreadcrumbsFromRoute();
    const bc = asideBc && asideBc.length > 0 ? asideBc : (headerBc && headerBc.length > 0 ? headerBc : routeBc);

    if (!bc) {
      this.setBreadcrumbs([]);
      return;
    }
    this.setBreadcrumbs(bc);
  }

  public calculateBreadcrumbsFromRoute(): Array<PageLink> | undefined {
    if (!this.router || !this.router.routerState) {
      return undefined;
    }
    let route: ActivatedRoute = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const breadcrumb = route.snapshot.data['breadcrumb'] || route.snapshot.data['breadcrumbs'];
    if (!breadcrumb) {
      return undefined;
    }
    if (Array.isArray(breadcrumb)) {
      return breadcrumb;
    } else if (typeof breadcrumb === 'string') {
      return [];
    }
    return undefined;
  }

  public calculateBreadcrumbsInMenu(
    menuId: string
  ): Array<PageLink> | undefined {
    const result: Array<PageLink> = [];
    const menu = document.getElementById(menuId);
    if (!menu) {
      return;
    }

    const allActiveParents = Array.from<HTMLDivElement>(
      menu.querySelectorAll('div.menu-item')
    ).filter((link) => {
      if (link.closest('[data-kt-element="mode"]') || link.closest('.menu-sub-dropdown')) {
        return false;
      }
      return link.classList.contains('here');
    });

    if (!allActiveParents || allActiveParents.length === 0) {
      return;
    }

    allActiveParents.forEach((parent) => {
      const titleSpan = parent.querySelector(
        'span.menu-title'
      ) as HTMLSpanElement | null;
      if (!titleSpan) {
        return;
      }

      const title = titleSpan.innerText;
      let path = titleSpan.getAttribute('data-link');
      if (path && !path.startsWith('/')) {
        path = '/' + path;
      }

      result.push({
        title,
        path: path || '',
        isSeparator: false,
        isActive: false,
      });
      // add separator
      result.push({
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
      });
    });

    return result;
  }
}
