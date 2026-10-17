import { TestBed } from '@angular/core/testing';

import { BillsOfSalesService } from './bills-of-sales.service';

describe('BillsOfSalesService', () => {
  let service: BillsOfSalesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BillsOfSalesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
