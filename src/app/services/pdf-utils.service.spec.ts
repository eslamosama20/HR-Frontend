import { TestBed } from '@angular/core/testing';
import { unzipSync } from 'fflate';

import { PdfUtilsService } from './pdf-utils.service';
import { sliceCanvasAtBreaks } from '../shared-components/print-document/print-document.component';

describe('PdfUtilsService', () => {
  let service: PdfUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadBlobsAsZip', () => {
    it('packages the given blobs into one zip and downloads it', async () => {
      const downloadSpy = spyOn(service, 'downloadFile').and.stub();
      const files = [
        { name: 'invoice-1.pdf', blob: new Blob(['%PDF-1'], { type: 'application/pdf' }) },
        { name: 'invoice-2.pdf', blob: new Blob(['%PDF-2'], { type: 'application/pdf' }) },
      ];

      service.downloadBlobsAsZip(files, 'invoices-format-1.zip');

      // buildZipAndDownload is async (awaits arrayBuffer()); flush microtasks + a macrotask
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [zipBlob, zipName] = downloadSpy.calls.mostRecent().args as [Blob, string];
      expect(zipName).toBe('invoices-format-1.zip');

      const bytes = new Uint8Array(await zipBlob.arrayBuffer());
      const entries = unzipSync(bytes);
      expect(Object.keys(entries).sort()).toEqual(['invoice-1.pdf', 'invoice-2.pdf']);
    });

    it('does nothing when the file list is empty', () => {
      const downloadSpy = spyOn(service, 'downloadFile').and.stub();
      service.downloadBlobsAsZip([], 'empty.zip');
      expect(downloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('printBlobsSequentially', () => {
    it('prints each blob once via printBlobAsync', async () => {
      const printSpy = spyOn(service, 'printBlobAsync').and.resolveTo();

      await service.printBlobsSequentially([
        new Blob(['a'], { type: 'application/pdf' }),
        new Blob(['b'], { type: 'application/pdf' }),
        new Blob(['c'], { type: 'application/pdf' }),
      ]);

      expect(printSpy).toHaveBeenCalledTimes(3);
    });

    it('does nothing for an empty blob list', async () => {
      const printSpy = spyOn(service, 'printBlobAsync').and.resolveTo();
      await service.printBlobsSequentially([]);
      expect(printSpy).not.toHaveBeenCalled();
    });
  });

  describe('canvasesToPdfBlob', () => {
    it('builds a non-empty application/pdf blob from a single canvas', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 141;
      canvas.getContext('2d')?.fillRect(0, 0, 100, 141);

      const blob = service.canvasesToPdfBlob([canvas], 'portrait');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('supports mixed per-canvas orientations and produces one PDF page per canvas', async () => {
      const portrait = document.createElement('canvas');
      portrait.width = 100;
      portrait.height = 141;
      portrait.getContext('2d')?.fillRect(0, 0, 100, 141);

      const landscape = document.createElement('canvas');
      landscape.width = 141;
      landscape.height = 100;
      landscape.getContext('2d')?.fillRect(0, 0, 141, 100);

      const blob = service.canvasesToPdfBlob(
        [portrait, landscape],
        'portrait',
        ['portrait', 'landscape']
      );
      const text = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));

      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
      expect((text.match(/\/Type \/Page\b/g) || []).length).toBe(2);
    });

    it('returns an empty PDF blob when given no canvases', () => {
      const blob = service.canvasesToPdfBlob([], 'portrait');
      expect(blob).toBeInstanceOf(Blob);
    });

    it('fits a tall canvas (taller than A4 aspect) into one page without throwing (PDF scaling fix)', () => {
      // Regression: screen-rendered captures can be taller than the A4 aspect
      // ratio; previously the image overflowed the page and clipped the
      // header/footer. It must now be scaled down to fit and still produce a
      // valid single-page PDF.
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 160; // 100:160 is taller than A4 portrait (210:297)
      canvas.getContext('2d')?.fillRect(0, 0, 100, 160);

      const blob = service.canvasesToPdfBlob([canvas], 'portrait');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('skips a degenerate (zero-width) canvas without throwing', () => {
      const goodCanvas = document.createElement('canvas');
      goodCanvas.width = 100;
      goodCanvas.height = 141;
      goodCanvas.getContext('2d')?.fillRect(0, 0, 100, 141);

      const badCanvas = document.createElement('canvas');
      badCanvas.width = 0;
      badCanvas.height = 141;

      const blob = service.canvasesToPdfBlob([badCanvas, goodCanvas], 'portrait');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('sliceCanvasAtBreaks', () => {
    it('slices a canvas at CSS break offsets, dropping sub-threshold slices', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      const slices = sliceCanvasAtBreaks(canvas, [25, 60], 1);

      expect(slices.map((slice) => slice.height)).toEqual([25, 35, 40]);
      expect(slices.every((slice) => slice.width === 100)).toBeTrue();
    });

    it('drops a trailing empty slice left by a final page-break (blank page fix)', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      const slices = sliceCanvasAtBreaks(canvas, [25, 98], 1);

      expect(slices.map((slice) => slice.height)).toEqual([25, 73]);
    });

    it('returns the same canvas instance when there are no breaks', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;

      expect(sliceCanvasAtBreaks(canvas, [], 1)).toEqual([canvas]);
    });
  });

  describe('isMobileOrTabletDevice & printBlob', () => {
    it('detects mobile and opens window for PDF on mobile devices', () => {
      spyOn(service, 'isMobileOrTabletDevice').and.returnValue(true);
      const openSpy = spyOn(window, 'open').and.returnValue({} as Window);

      const blob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      service.printBlob(blob);

      expect(openSpy).toHaveBeenCalled();
      const calledUrl = openSpy.calls.mostRecent().args[0] as string;
      expect(calledUrl.startsWith('blob:')).toBeTrue();
    });

    it('uses hidden iframe for PDF print on desktop devices', () => {
      spyOn(service, 'isMobileOrTabletDevice').and.returnValue(false);
      const openSpy = spyOn(window, 'open');
      const appendSpy = spyOn(document.body, 'appendChild').and.callThrough();

      const blob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      service.printBlob(blob);

      expect(openSpy).not.toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
    });
  });
});
