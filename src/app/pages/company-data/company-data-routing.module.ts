import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CompanyFormComponent } from './company-form/company-form.component';
import { CompanyProfileComponent } from './company-profile/company-profile.component';



const routes: Routes = [
  { path: 'add', component: CompanyFormComponent },
  { path: 'edit/:id', component: CompanyFormComponent },
  { path: 'company-profile/:id', component: CompanyProfileComponent },
  { path: '', redirectTo: 'company-profile/:id', pathMatch: 'full' }
];



@NgModule({
  
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CompanyDataRoutingModule { }
