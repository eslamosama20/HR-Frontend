// Localization is based on '@ngx-translate/core';
// Please be familiar with official documentations first => https://github.com/ngx-translate/core

import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

export interface Locale {
  lang: string;
  data: any;
}

const LOCALIZATION_LOCAL_STORAGE_KEY = 'language';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  // Private properties
  private langIds: any = [];

  constructor(private translate: TranslateService) {
    // add new langIds to the list
    this.translate.addLangs(['en', 'ar']);

    // this language will be used as a fallback when a translation isn't found in the current language
    this.translate.setDefaultLang('ar');
  }

  loadTranslations(...args: Locale[]): void {

    const locales = [...args];

    locales.forEach((locale) => {
      // use setTranslation() with the third argument set to true
      // to append translations instead of replacing them
      this.translate.setTranslation(locale.lang, locale.data, true);
      this.langIds.push(locale.lang);
    });


    if(!localStorage.getItem(LOCALIZATION_LOCAL_STORAGE_KEY)){
      localStorage.setItem(LOCALIZATION_LOCAL_STORAGE_KEY, this.translate.getDefaultLang())
    }
    // add new languages to the list
    this.translate.addLangs(this.langIds);
    const selectedLanguage = this.getSelectedLanguage();
    this.translate.use(selectedLanguage);
    this.applyDocumentDirection(selectedLanguage);
  }

  setLanguage(lang: string) {
    if (lang) {
      this.translate.use(lang);
      localStorage.setItem(LOCALIZATION_LOCAL_STORAGE_KEY, lang);
      this.applyDocumentDirection(lang);
    }
  }

  /**
   * Returns selected language
   */
  getSelectedLanguage(): any {
    return (
      localStorage.getItem(LOCALIZATION_LOCAL_STORAGE_KEY) ||
      this.translate.getDefaultLang()
    );
  }

  private applyDocumentDirection(lang: string): void {
    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    document.body.style.direction = direction;
    document.body.setAttribute('direction', direction);
  }
}
