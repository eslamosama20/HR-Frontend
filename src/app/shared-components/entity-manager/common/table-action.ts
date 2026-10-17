export interface TableAction {
  name: string;
  disabled?: boolean;
  visible?: boolean;
  onClick?: (item: any) => void;
  visibleCondition?: (item: any) => boolean;
}

export interface BulkAction {
  name: string;
  disabled?: boolean;
  visible?: boolean;
  onClick?: (ids: string[]) => void;
}

export interface TableActions {
  add?: TableAction;
  edit?: TableAction;
  delete?: TableAction;
  view?: TableAction;
  bulkDelete?: BulkAction;
  customActions?: TableAction[];
}
