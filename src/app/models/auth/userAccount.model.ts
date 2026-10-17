import {EntityBase} from '../base/entity-base';
import {UserRoleModel} from "./userRole.model";

export class UserAccountModel extends EntityBase {


  userName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  workId: string;
  dateOfBirth: Date;
  userRoles: UserRoleModel[];
  twoFactorEnabled: boolean;
  emailVerified : boolean;
  isFrontal: boolean;
  profilePicture: string | null;

  constructor(data?: Partial<UserAccountModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
