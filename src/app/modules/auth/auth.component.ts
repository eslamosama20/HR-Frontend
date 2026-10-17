import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslationService } from '../i18n';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '<body[root]>',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent implements OnInit, OnDestroy {
  today: Date = new Date();

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {}

  get currentLang(): string {
    return this.translationService.getSelectedLanguage();
  }

  changeLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
    document.location.reload();
  }

  toggleLanguage(): void {
    const nextLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.changeLanguage(nextLang);
  }

  ngOnDestroy() {}
}