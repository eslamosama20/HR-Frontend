import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CompanyDataRoutingModule } from './company-data-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CompanyFormComponent } from './company-form/company-form.component';
import { CompanyProfileComponent } from './company-profile/company-profile.component';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule,
    CompanyDataRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    CompanyFormComponent,
    CompanyProfileComponent
  ]
})
export class CompanyDataModule { }
