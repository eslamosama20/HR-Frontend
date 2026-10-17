import {EntityBase} from '../base/entity-base';
import {DomainDetailsModel} from "./domainDetails.model";
import {RolePermissionModel} from "./rolePermission.model";

export class RoleModel extends EntityBase {

  name: string;
  domainDetailsId: string;
  domainDetails: DomainDetailsModel;
  rolePermissions: RolePermissionModel[];
  isFrontal?: boolean;

  maxUsersCount?: number | null;
  maxCompaniesCount?: number | null;
  maxBranchesCount?: number | null;
  maxStoresCount?: number | null;
  maxBanksCount?: number | null;
  maxTreasuriesCount?: number | null;
  maxSuppliersCount?: number | null;
  maxCustomersCount?: number | null;

  constructor(data?: Partial<RoleModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }


}
