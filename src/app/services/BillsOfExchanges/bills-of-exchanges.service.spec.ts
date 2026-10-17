import { TestBed } from '@angular/core/testing';

import { BillsOfExchangesService } from './bills-of-exchanges.service';

describe('BillsOfExchangesService', () => {
  let service: BillsOfExchangesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BillsOfExchangesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
