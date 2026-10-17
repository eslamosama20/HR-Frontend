import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { CustomDatePipe } from '../pipes/custom-date.pipe';
// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabViewModule } from 'primeng/tabview';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';

// Translation Module
import { TranslateModule } from '@ngx-translate/core';

// Directives
import { RtlColumnResizeDirective } from './directives/rtl-column-resize.directive';

// Components
import { ProjectListComponent } from './components/project-list/project-list.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { ProjectDetailsComponent } from './components/project-details/project-details.component';

// Services
import { ProjectService } from './services/project.service';
import { MessageService, ConfirmationService } from 'primeng/api';

import { PermissionGuard } from '../guards/permission.guard';
import { PERMISSIONS } from '../config/permissions';

const routes: Routes = [
  {
    path: '',
    component: ProjectListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Read] }
  },
  {
    path: 'archived',
    component: ProjectListComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Read], isArchivedView: true }
  },
  {
    path: 'new',
    component: ProjectFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Create] }
  },
  {
    path: ':id',
    component: ProjectDetailsComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Read] }
  },
  {
    path: ':id/edit',
    component: ProjectFormComponent,
    canActivate: [PermissionGuard],
    data: { permissions: [PERMISSIONS.Projects.Update] }
  }
];

@NgModule({
  declarations: [
    ProjectListComponent,
    ProjectFormComponent,
    ProjectDetailsComponent,
    RtlColumnResizeDirective
  ],
  imports: [CustomDatePipe, 
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CheckboxModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressSpinnerModule,
    TabViewModule,
    ProgressBarModule,
    TimelineModule,
    SkeletonModule,
    DialogModule,
    CalendarModule,
    InputTextareaModule,
    MultiSelectModule,
    TranslateModule
  ],
  providers: [
    ProjectService,
    MessageService,
    ConfirmationService
  ]
})
export class ProjectsModule { }
