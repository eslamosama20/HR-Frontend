import {EntityBase} from "../base/entity-base";
export class Treasury extends EntityBase {

  name: string;
  mainAccountId: string;
  isFrontal: boolean = false;


  constructor(data?: Partial<Treasury>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.name
      && !!this.mainAccountId
  }
}
