import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountComponent } from './account.component';
import { SettingsComponent } from './settings/settings.component';

const routes: Routes = [
  {
    path: '',
    component: AccountComponent,
    children: [

      {
        path: 'settings',
        component: SettingsComponent,
      },
      { path: '', redirectTo: 'settings', pathMatch: 'full' },
      { path: '**', redirectTo: 'settings', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountRoutingModule { }
