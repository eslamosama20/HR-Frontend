import {EntityBase} from '../base/entity-base';
import {EmployeeModel} from "./employee.model";

export class FingerprintDeviceSettingsModel extends EntityBase {

  factory1DeviceIP: string;
  factory1DevicePort: string;
  factory1DeviceEnabled: boolean;
  factory1LastSyncTime?: Date | string;
  factory1LastSyncStatus?: string;
  factory1LastSyncMessage?: string;
  factory1LastSyncFetchedCount?: number;
  factory1LastSyncInsertedCount?: number;
  factory1LastSyncSkippedCount?: number;

  factory2DeviceIP: string;
  factory2DevicePort: string;
  factory2DeviceEnabled: boolean;
  factory2LastSyncTime?: Date | string;
  factory2LastSyncStatus?: string;
  factory2LastSyncMessage?: string;
  factory2LastSyncFetchedCount?: number;
  factory2LastSyncInsertedCount?: number;
  factory2LastSyncSkippedCount?: number;

  factory3DeviceIP: string;
  factory3DevicePort: string;
  factory3DeviceEnabled: boolean;
  factory3LastSyncTime?: Date | string;
  factory3LastSyncStatus?: string;
  factory3LastSyncMessage?: string;
  factory3LastSyncFetchedCount?: number;
  factory3LastSyncInsertedCount?: number;
  factory3LastSyncSkippedCount?: number;

  constructor(data?: Partial<FingerprintDeviceSettingsModel>) {
    super(data);
    if (data) {
      Object.assign(this, data);
    }
  }
}

export interface ZkTecoSyncResultModel {
  success: boolean;
  deviceIp: string;
  devicePort: number;
  factoryType: string;
  fetchedCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
  message: string;
}
