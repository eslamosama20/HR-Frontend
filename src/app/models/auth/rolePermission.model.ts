import {EntityBase} from '../base/entity-base';
import {PermissionModel} from "./permission.model";

export class RolePermissionModel extends EntityBase {

  roleId: string;
  permissionId: string;
  permission: PermissionModel;

  constructor(data?: Partial<RolePermissionModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
