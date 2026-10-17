import {EntityBase} from "../base/entity-base";

export class PrintTableColumnModel extends EntityBase {

  columnName: string;
  displayName: string;
  dataType: "string" | "number" | "date" | "boolean" | "currency";
  orderIndex: number;
  isVisible: boolean;
  width: number;
  alignment: "left" | "center" | "right";
  constructor(data?: Partial<PrintTableColumnModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.columnName
      && !!this.displayName
  }
}
