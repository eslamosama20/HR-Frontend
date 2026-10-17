import {EntityBase} from '../base/entity-base';
import {RoleModel} from "./role.model";

export class UserRoleModel extends EntityBase {


  userId: string;
  roleId: string;
  role: RoleModel;

  constructor(data?: Partial<UserRoleModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
