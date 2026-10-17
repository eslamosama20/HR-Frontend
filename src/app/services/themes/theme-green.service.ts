import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

interface Theme {
  name: string;
  properties: { [key: string]: string };
}

@Injectable({
  providedIn: 'root',
})
export class ThemeGreenService {
  private readonly themeFile = 'assets/themes/themes.json'; // ✅ المسار الصحيح

  constructor(private http: HttpClient) {}

  /**
   * تحميل ثيم من JSON وتطبيقه على عنصر معين (بـ CSS variables)
   * - يمسح الثيم السابق من body/html
   * - يضيف علامة الثيم الجديد (class + data-bs-theme)
   * - يطبّق المتغيرات على العنصر الهدف
   *
   * @param themeName اسم الثيم داخل JSON (مثلاً: 'light-green' | 'light-indigo' | 'light-darkblue')
   * @param selector العنصر الهدف لتطبيق المتغيرات عليه (مثلاً '.app-sidebar' أو '#kt_app_sidebar')
   */
  applyTheme(themeName: string, selector: string = '.app-sidebar'): void {
    this.loadThemes().subscribe((themes) => {
      const theme = themes?.[themeName];
      if (!theme) {
        console.warn(`❌ الثيم "${themeName}" غير موجود في ملف JSON.`);
        return;
      }

      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        console.warn(
          `❌ لم يتم العثور على العنصر بالـ selector "${selector}".`
        );
        return;
      }

      const themeKeys = Object.keys(themes);

      // 🧹 1) امسح أي علامات/ثيمات قديمة من الـ body / html
      this.clearGlobalThemeFlags(themeKeys);

      // 🎯 2) ضيف علامة الثيم الجديد علشان :host-context(...) تشتغل
      this.setGlobalThemeFlag(themeName);

      // 🔄 3) امسح أي متغيرات CSS قديمة كانت متطبقة inline على العنصر الهدف
      this.clearCssVariables(el);

      // 🎨 4) طبّق متغيرات الثيم الجديد على العنصر الهدف
      Object.entries(theme.properties).forEach(([key, value]) => {
        if (typeof value === 'string') {
          el.style.setProperty(key, value);
        }
      });
    });
  }

  /**
   * تحميل جميع الثيمات من ملف JSON
   */
  private loadThemes(): Observable<{ [key: string]: Theme }> {
    return this.http.get<{ [key: string]: Theme }>(this.themeFile);
  }

  /**
   * إزالة أي كلاس/سِمة تخص الثيمات المخصصة من html/body
   */
  private clearGlobalThemeFlags(themeKeys: string[]): void {
    const html = document.documentElement;
    const body = document.body;

    // امسح كل كلاسات الثيمات المعروفة
    themeKeys.forEach((k) => {
      body.classList.remove(k);
      html.classList.remove(k);
    });

    // لو data-bs-theme الحالي واحد من الثيمات المخصصة، امسحه
    const current = html.getAttribute('data-bs-theme');
    if (current && themeKeys.includes(current)) {
      html.removeAttribute('data-bs-theme');
    }
  }

  /**
   * إضافة علامة الثيم الحالي
   * - body.<theme>  => لمطابقة :host-context(body.<theme>)
   * - html[data-bs-theme="<theme>"] => لمطابقة :host-context([data-bs-theme="<theme>"])
   */
  private setGlobalThemeFlag(themeName: string): void {
    const html = document.documentElement;
    const body = document.body;
    body.classList.add(themeName);
    html.setAttribute('data-bs-theme', themeName);
  }

  /**
   * إزالة جميع المتغيرات الـ CSS (التي تبدأ بـ --) المطبّقة inline على العنصر
   */
  private clearCssVariables(el: HTMLElement): void {
    for (let i = el.style.length - 1; i >= 0; i--) {
      const prop = el.style[i];
      if (prop && prop.startsWith('--')) {
        el.style.removeProperty(prop);
      }
    }
  }
}
