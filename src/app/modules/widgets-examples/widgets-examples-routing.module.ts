import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TablesComponent } from './tables/tables.component';
import { WidgetsExamplesComponent } from './widgets-examples.component';

const routes: Routes = [
  {
    path: '',
    component: WidgetsExamplesComponent,
    children: [

      {
        path: 'tables',
        component: TablesComponent,
      },

      { path: '', redirectTo: 'tables', pathMatch: 'full' },
      { path: '**', redirectTo: 'tables', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WidgetsExamplesRoutingModule { }
