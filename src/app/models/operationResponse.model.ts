
export class OperationResponseModel<T> {
  data: T;
  totalCount: number;
  isPaginated: boolean;
  query?: string;
  took?: number;

  constructor(data?: any, totalCount?: number, isPaginated?: boolean, query?: string, took?: number) {
    this.data = data;
    this.totalCount = totalCount;
    this.isPaginated = isPaginated;
    this.query = query;
    this.took = took;
  }
}
