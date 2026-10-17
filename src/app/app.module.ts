import {APP_INITIALIZER, LOCALE_ID, NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {ClipboardModule} from 'ngx-clipboard';
import {TranslateModule} from '@ngx-translate/core';
import {InlineSVGModule} from 'ng-inline-svg-2';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
//import {AuthService} from './modules/auth/services/auth.service';
import {HttpRequestInterceptor} from './services/http-interceptor.service';
import {AuthService} from "./modules/auth";
import {DatePipe, HashLocationStrategy, LocationStrategy} from '@angular/common';
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {MessageService} from 'primeng/api';
import {ToastModule} from 'primeng/toast';
import {DialogModule} from 'primeng/dialog';
import {ButtonModule} from 'primeng/button';
import {applyPrimeNGRtlTablePatch} from './utils/primeng-rtl-table.patch';


function appInitializer(authService: AuthService) {
  return () => {
    return new Promise((resolve) => {
      // @ts-ignore
      authService.getUserByToken().subscribe().add(resolve);
    });
  };
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    FontAwesomeModule,
    BrowserModule,
    BrowserAnimationsModule,
    TranslateModule.forRoot(),
    HttpClientModule,
    ClipboardModule,

    AppRoutingModule,
    InlineSVGModule.forRoot(),
    ToastModule, // ✅ PrimeNG ToastModule for global toast notifications
    DialogModule,
    ButtonModule,

  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      multi: true,
      deps: [AuthService],
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpRequestInterceptor,
      multi: true,
    },
    {
      provide: LOCALE_ID,
      useValue: 'ar-SA'
    },
    {
      provide: LOCALE_ID,
      useValue: 'en-US'
    },
    DatePipe,
    MessageService // ✅ Global MessageService for toast notifications that persist across navigation
  ],

  bootstrap: [AppComponent],
})
export class AppModule {
  constructor() {
    applyPrimeNGRtlTablePatch();
  }
}
