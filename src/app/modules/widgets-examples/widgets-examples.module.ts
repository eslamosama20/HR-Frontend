import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsExamplesRoutingModule } from './widgets-examples-routing.module';
import { WidgetsExamplesComponent } from './widgets-examples.component';
import { TablesComponent } from './tables/tables.component';
import { WidgetsModule } from '../../_metronic/partials';

@NgModule({
  declarations: [
    WidgetsExamplesComponent,
    TablesComponent,
  ],
  imports: [CommonModule, WidgetsExamplesRoutingModule, WidgetsModule],
})
export class WidgetsExamplesModule { }
