import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SalesInvoiceService } from './sales-invoice.service';
import { PdfUtilsService } from '../pdf-utils.service';

describe('SalesInvoiceService', () => {
  let service: SalesInvoiceService;
  let httpMock: HttpTestingController;
  let pdfUtilsSpy: jasmine.SpyObj<PdfUtilsService>;
  let baseUrl: string;

  beforeEach(() => {
    pdfUtilsSpy = jasmine.createSpyObj('PdfUtilsService', [
      'unzipAndPrint',
      'unzipAndDownload',
      'downloadFile',
      'printBlob',
      'showToast',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: PdfUtilsService, useValue: pdfUtilsSpy }],
    });

    service = TestBed.inject(SalesInvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = (service as any).salesInvoiceUrl as string;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('printDocuments', () => {
    it('issues GET /documents with ids and the mapped printType', () => {
      service.printDocuments([1, 2], 'A4Landscape');

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      expect(req.request.urlWithParams).toContain('ids=1');
      expect(req.request.urlWithParams).toContain('ids=2');
      expect(req.request.urlWithParams).toContain('printType=1');
      req.flush(new Blob(['zip'], { type: 'application/zip' }));

      expect(pdfUtilsSpy.unzipAndPrint).toHaveBeenCalledTimes(1);
    });

    it('does not fire a request for an empty id list', () => {
      service.printDocuments([]);
      httpMock.expectNone((r) => r.url.split('?')[0] === `${baseUrl}/documents`);
    });

    it('calls onComplete even when the zip cannot be processed (rejected promise)', async () => {
      const onComplete = jasmine.createSpy('onComplete');
      pdfUtilsSpy.unzipAndPrint.and.returnValue(Promise.reject(new Error('corrupt zip')));

      service.printDocuments([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      expect(req.request.urlWithParams).toContain('printType=4');
      req.flush(new Blob(['not-a-zip'], { type: 'application/zip' }));

      // The rejection is swallowed by the .catch attached to the unzip promise — flush the
      // microtask so the catch handler (and the showToast spy) run before asserting.
      await Promise.resolve();
      await Promise.resolve();

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(pdfUtilsSpy.showToast).toHaveBeenCalledWith('تعذر تجهيز ملفات الطباعة', 'error');
    });
  });

  describe('downloadDocuments', () => {
    it('defaults printType to A4Portrait (0) when omitted', () => {
      service.downloadDocuments([7]);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      expect(req.request.urlWithParams).toContain('printType=0');
      req.flush(new Blob(['zip'], { type: 'application/zip' }));

      expect(pdfUtilsSpy.unzipAndDownload).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete even when the zip cannot be processed (rejected promise)', async () => {
      const onComplete = jasmine.createSpy('onComplete');
      pdfUtilsSpy.unzipAndDownload.and.returnValue(Promise.reject(new Error('corrupt zip')));

      service.downloadDocuments([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      req.flush(new Blob(['not-a-zip'], { type: 'application/zip' }));

      await Promise.resolve();
      await Promise.resolve();

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(pdfUtilsSpy.showToast).toHaveBeenCalledWith('تعذر تجهيز ملفات التنزيل', 'error');
    });
  });

  describe('downloadMerged', () => {
    it('POSTs { ids, printType } to /documents/merged', () => {
      service.downloadMerged([1, 2, 3], 'Thermal80mm');

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${baseUrl}/documents/merged`
      );
      expect(req.request.body).toEqual({ ids: [1, 2, 3], printType: 2 });
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(pdfUtilsSpy.downloadFile).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'invoices-merged.pdf'
      );
    });
  });

  describe('downloadAllMerged', () => {
    it('issues GET /documents/merged/all with the mapped printType', () => {
      service.downloadAllMerged('A4Landscape');

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents/merged/all`
      );
      expect(req.request.urlWithParams).toContain('printType=1');
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(pdfUtilsSpy.downloadFile).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'invoices-merged-all.pdf'
      );
    });
  });

  describe('printTypeToEnum fallback', () => {
    it('falls back to A4Portrait (0) for unknown print types', () => {
      service.downloadDocuments([5], 'UnknownType');

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      expect(req.request.urlWithParams).toContain('printType=0');
      req.flush(new Blob(['zip'], { type: 'application/zip' }));
    });
  });

  describe('buildPrint1Params', () => {
    it('builds lang + signature/stamp flags, omitting empty unchecked lists', () => {
      const params = service.buildPrint1Params({
        lang: 'ar',
        showStamp: true,
        showCompanySignature: false,
        showCustomerSignature: true,
        uncheckedPolicies: [],
        uncheckedBanks: ['11111111-2222-3333-4444-555555555555'],
      });
      const parsed = new URLSearchParams(params);
      expect(parsed.get('lang')).toBe('ar');
      expect(parsed.get('showStamp')).toBe('true');
      expect(parsed.get('showCompanySignature')).toBe('false');
      expect(parsed.get('showCustomerSignature')).toBe('true');
      expect(parsed.get('uncheckedPolicies')).toBeNull();
      expect(parsed.get('uncheckedBanks')).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('includes unchecked lists when non-empty', () => {
      const params = service.buildPrint1Params({
        lang: 'en',
        showStamp: true,
        showCompanySignature: true,
        showCustomerSignature: true,
        uncheckedPolicies: ['a', 'b'],
        uncheckedBanks: [],
      });
      const parsed = new URLSearchParams(params);
      expect(parsed.get('uncheckedPolicies')).toBe('a,b');
      expect(parsed.get('uncheckedBanks')).toBeNull();
    });
  });

  describe('printDocument (Format1Server)', () => {
    it('maps Format1Server to printType=4 and appends the parity params', () => {
      const params = 'lang=ar&showStamp=true&showCompanySignature=true&showCustomerSignature=true';
      service.printDocument(42, 'Format1Server', params);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/document/42`
      );
      expect(req.request.urlWithParams).toContain('printType=4');
      expect(req.request.urlWithParams).toContain('lang=ar');
      expect(req.request.urlWithParams).toContain('showStamp=true');
      expect(req.request.urlWithParams).toContain('showCompanySignature=true');
      expect(req.request.urlWithParams).toContain('showCustomerSignature=true');
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(pdfUtilsSpy.printBlob).toHaveBeenCalledTimes(1);
    });

    it('stays unchanged when no parity params are passed', () => {
      service.printDocument(42, 'A4Portrait');

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/document/42`
      );
      expect(req.request.urlWithParams).toBe(`${baseUrl}/document/42?printType=0`);
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
    });
  });

  describe('batch methods with print1Params', () => {
    it('printDocuments appends parity params to GET /documents', () => {
      const params = 'lang=en&showStamp=false&showCompanySignature=true&showCustomerSignature=true';
      service.printDocuments([1, 2], 'Format1Server', undefined, params);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      expect(req.request.urlWithParams).toContain('printType=4');
      expect(req.request.urlWithParams).toContain('lang=en');
      expect(req.request.urlWithParams).toContain('showStamp=false');
      req.flush(new Blob(['zip'], { type: 'application/zip' }));

      expect(pdfUtilsSpy.unzipAndPrint).toHaveBeenCalledTimes(1);
    });

    it('downloadMerged merges parity params into the POST body with typed values', () => {
      const params = 'lang=ar&showStamp=true&showCompanySignature=false&showCustomerSignature=true&uncheckedPolicies=a,b&uncheckedBanks=c';
      service.downloadMerged([1, 2], 'Format1Server', undefined, params);

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${baseUrl}/documents/merged`
      );
      expect(req.request.body).toEqual({
        ids: [1, 2],
        printType: 4,
        language: 'ar',
        showStamp: true,
        showCompanySignature: false,
        showCustomerSignature: true,
        uncheckedPolicies: 'a,b',
        uncheckedBanks: 'c',
      });
      // Booleans must be real booleans (backend bool model binding), key must be `language`
      expect(typeof req.request.body.showStamp).toBe('boolean');
      expect(typeof req.request.body.showCompanySignature).toBe('boolean');
      expect(req.request.body.language).toBe('ar');
      expect(req.request.body.lang).toBeUndefined();
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(pdfUtilsSpy.downloadFile).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'invoices-merged.pdf'
      );
    });

    it('downloadMerged keeps body unchanged when no parity params are passed', () => {
      service.downloadMerged([1, 2], 'Thermal80mm');

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${baseUrl}/documents/merged`
      );
      expect(req.request.body).toEqual({ ids: [1, 2], printType: 2 });
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
    });

    it('downloadAllMerged appends parity params to GET /documents/merged/all', () => {
      const params = 'lang=en&showStamp=true&showCompanySignature=true&showCustomerSignature=true';
      service.downloadAllMerged('Format1Server', undefined, params);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents/merged/all`
      );
      expect(req.request.urlWithParams).toContain('printType=4');
      expect(req.request.urlWithParams).toContain('lang=en');
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(pdfUtilsSpy.downloadFile).toHaveBeenCalledWith(
        jasmine.any(Blob),
        'invoices-merged-all.pdf'
      );
    });
  });

  describe('batch onComplete guarantee (stuck-spinner fix)', () => {
    // Regression: if blob processing throws (e.g. invalid/corrupt ZIP), onComplete must
    // STILL run so the batchProcessing spinner dialog never stays stuck.

    it('printDocuments invokes onComplete even when unzipAndPrint throws', () => {
      pdfUtilsSpy.unzipAndPrint.and.throwError('corrupt zip');
      const onComplete = jasmine.createSpy('onComplete');

      service.printDocuments([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      req.flush(new Blob(['not-a-zip'], { type: 'application/zip' }));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('downloadDocuments invokes onComplete even when unzipAndDownload throws', () => {
      pdfUtilsSpy.unzipAndDownload.and.throwError('corrupt zip');
      const onComplete = jasmine.createSpy('onComplete');

      service.downloadDocuments([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      req.flush(new Blob(['not-a-zip'], { type: 'application/zip' }));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('downloadMerged invokes onComplete even when downloadFile throws', () => {
      pdfUtilsSpy.downloadFile.and.throwError('download failed');
      const onComplete = jasmine.createSpy('onComplete');

      service.downloadMerged([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'POST' && r.url === `${baseUrl}/documents/merged`
      );
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('downloadAllMerged invokes onComplete even when downloadFile throws', () => {
      pdfUtilsSpy.downloadFile.and.throwError('download failed');
      const onComplete = jasmine.createSpy('onComplete');

      service.downloadAllMerged('Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents/merged/all`
      );
      req.flush(new Blob(['pdf'], { type: 'application/pdf' }));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('printDocuments invokes onComplete on HTTP error too', () => {
      const onComplete = jasmine.createSpy('onComplete');

      service.printDocuments([1], 'Format1Server', onComplete);

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.split('?')[0] === `${baseUrl}/documents`
      );
      req.flush(new Blob(['boom'], { type: 'text/plain' }), { status: 500, statusText: 'Server Error' });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
