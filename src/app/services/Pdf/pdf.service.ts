import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  exportPDF(data: any[], pdfFileName: string) {
    const doc = new jsPDF();

    doc.text('Server Response Data:', 10, 10);
    doc.text(JSON.stringify(data), 10, 20);

    doc.save(`${pdfFileName}.pdf`);
  }

}
