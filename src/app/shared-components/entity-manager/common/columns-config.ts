export interface Column<T> {
  label: string;
  field: keyof T | string;
  sortable?: boolean;
  //valueFormatter?: (value: T[keyof T], row: T) => any;
  sortFunction?: (a: T[keyof T], b: T[keyof T], aRow?: T, bRow?: T) => number;
  type: 'text' | 'number' | 'date' | 'boolean' | 'currency';
  filter?: boolean;
  filterType?: 'text' | 'numeric' | 'date' | 'boolean' | 'currency';
  accessorFunction?: (T) => any;
}

