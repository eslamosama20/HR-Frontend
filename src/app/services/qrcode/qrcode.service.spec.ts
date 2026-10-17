/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { QrcodeService } from './qrcode.service';

describe('Service: Qrcode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QrcodeService]
    });
  });

  it('should ...', inject([QrcodeService], (service: QrcodeService) => {
    expect(service).toBeTruthy();
  }));
});
