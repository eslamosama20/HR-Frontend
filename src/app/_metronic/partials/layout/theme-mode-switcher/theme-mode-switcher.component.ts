import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ThemeModeService, ThemeModeType } from './theme-mode.service';
import { ThemeGreenService } from 'src/app/services/themes/theme-green.service';

@Component({
  selector: 'app-theme-mode-switcher',
  templateUrl: './theme-mode-switcher.component.html',
})
export class ThemeModeSwitcherComponent implements OnInit {
  @Input() toggleBtnClass: string = '';
  @Input() toggleBtnIconClass: string = 'svg-icon-2';
  @Input() menuPlacement: string = 'bottom-end';
  @Input() menuTrigger: string = "{default: 'click', lg: 'hover'}";

  mode$!: Observable<ThemeModeType>;
  menuMode$!: Observable<ThemeModeType>;

  private readonly customSidebarThemeKey = 'custom-sidebar-theme';

  // 🎨 الثيمات المخصصة (skins)
  isLightGreenActive = false;
  isLightDarkBlueActive = false;
  isLightIndigoActive = false;


  constructor(
    private modeService: ThemeModeService,
    private themeGreenService: ThemeGreenService
  ) {}

  ngOnInit(): void {
    this.mode$ = this.modeService.mode.asObservable();
    this.menuMode$ = this.modeService.menuMode.asObservable();

    const saved = localStorage.getItem(this.customSidebarThemeKey);

    this.isLightGreenActive = saved === 'light-green';
    this.isLightDarkBlueActive = saved === 'light-darkblue';

    // ✅ تفعيل الثيم المحفوظ سابقًا
    if (this.isLightGreenActive) {
      this.themeGreenService.applyTheme('light-green', this.getSidebarSelector());
      this.applyGlobalCustomFlag('light-green', true);
    }

    if (this.isLightDarkBlueActive) {
      this.themeGreenService.applyTheme('light-darkblue', this.getSidebarSelector());
      this.applyGlobalCustomFlag('light-darkblue', true);
    }
  }

  /** تبديل Light / Dark / System */
  switchMode(mode: ThemeModeType): void {
    // 🧹 تنظيف أي ثيمات مخصصة
    this.clearCustomSidebarTheme();
    this.applyGlobalCustomFlag('', false);
    this.isLightGreenActive = false;
    this.isLightDarkBlueActive = false;
    localStorage.removeItem(this.customSidebarThemeKey);

    this.modeService.switchMode(mode);
  }

  /** تطبيق الثيم Light-Green */
  applyLightGreenSidebar(): void {
    this.applyCustomSidebarTheme('light-green');
    this.isLightGreenActive = true;
    this.isLightDarkBlueActive = false;
  }

  /** تطبيق الثيم Light-DarkBlue */
  applyLightDarkBlueSidebar(): void {
    this.applyCustomSidebarTheme('light-darkblue');
    this.isLightDarkBlueActive = true;
    this.isLightGreenActive = false;
  }
  applyLightIndigoSidebar(): void {
    this.applyCustomSidebarTheme('light-indigo');
    this.isLightIndigoActive = true;
    this.isLightGreenActive = false;
    this.isLightDarkBlueActive = false;
  }
  /** لوجيك عام لتطبيق أي ثيم مخصص */
  private applyCustomSidebarTheme(themeName: string): void {
    this.themeGreenService.applyTheme(themeName, this.getSidebarSelector());
    this.applyGlobalCustomFlag(themeName, true);

    localStorage.setItem(this.customSidebarThemeKey, themeName);
  }

  /** اختيار السيلكتور الصحيح للـ Sidebar */
  private getSidebarSelector(): string {
    return document.querySelector('#kt_app_sidebar') ? '#kt_app_sidebar' : '.app-sidebar';
  }

  /** إضافة/إزالة مؤشر عالمي لتفعيل استايلات SCSS */
  private applyGlobalCustomFlag(themeName: string, enable: boolean): void {
    const html = document.documentElement;
    const body = document.body;

    if (enable) {
      html.setAttribute('data-bs-theme', themeName);
      body.classList.add(themeName);
    } else {
      if (themeName && html.getAttribute('data-bs-theme') === themeName) {
        html.removeAttribute('data-bs-theme');
      }
      if (themeName) {
        body.classList.remove(themeName);
      }
    }
  }

  /** 🧹 إزالة المتغيرات المضافة على الـ Sidebar */
  private clearCustomSidebarTheme(): void {
    const el =
      (document.querySelector('#kt_app_sidebar') ||
        document.querySelector('.app-sidebar')) as HTMLElement | null;
    if (!el) return;

    const vars = [
      '--sidebar-bg',
      '--sidebar-text',
      '--sidebar-active',
      '--button-primary-bg',
      '--button-primary-text',
      '--button-outline-text',
      '--button-outline-border',
      '--table-text',
      '--table-header-bg',
      '--card-bg',
      '--card-text',
      '--input-bg',
      '--input-border',
      '--input-text',
      '--input-placeholder',
      '--input-focus',
      '--kt-app-sidebar-bg',
      '--kt-app-sidebar-base-color',
      '--kt-app-sidebar-link-active-bg',
      '--kt-app-sidebar-link-active-color',
      '--kt-primary',
      '--kt-primary-active',
      '--kt-primary-inverse',
    ];

    vars.forEach((v) => el.style.removeProperty(v));
  }
}
