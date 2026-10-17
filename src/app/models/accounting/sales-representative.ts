import { EntityBase } from "../base/entity-base";
import {MainAccountModel} from "./mainAccount.model";

export class SalesRepresentative extends EntityBase {

  englishName: string;
  arabicName: string;
  isFrontal: boolean;

  mainAccountId?: string;
  mainAccount: MainAccountModel;
  constructor(data?: Partial<SalesRepresentative>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }

  override validate(): boolean {
    return super.validate()
      && !!this.englishName
      && !!this.arabicName

  }
}
