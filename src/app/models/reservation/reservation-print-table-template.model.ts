import { EntityBase } from '../base/entity-base';
import { PrintTableColumnModel } from './print-table-column.model';

export class ReservationPrintTableTemplateModel extends EntityBase {
  name: string;
  description: string;
  pageOrientation: 'Portrait' | 'Landscape' = 'Portrait';
  columns: PrintTableColumnModel[];
  displayOrder: number = 0;

  constructor(data?: Partial<ReservationPrintTableTemplateModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate() && !!this.name;
  }
}
