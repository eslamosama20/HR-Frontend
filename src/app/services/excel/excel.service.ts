import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from "html2canvas";

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

  exportAsExcelFile(data: any[], excelFileName: string): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'data': worksheet },
      SheetNames: ['data']
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, excelFileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const blob: Blob = new Blob([buffer], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${fileName}.xlsx`;
    link.click();
  }

  exportTableToExcelWithHeader(header: string[], tableId: string, fileName: string): void {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error(`Table with id '${tableId}' not found.`);
      return;
    }

    const worksheet = XLSX.utils.table_to_sheet(table);

    // Insert header row at the top
    XLSX.utils.sheet_add_aoa(worksheet, [header], { origin: 'A1' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Corrected template literal
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /*exportPDF(printSectionID: string, fileName: string): void {
    const reportElement = document.getElementById(printSectionID);

    if (reportElement) {
      // Temporarily make the element visible
      const originalDisplay = reportElement.style.display;
      reportElement.style.display = 'block';

      html2canvas(reportElement, { scale: 2 }).then((canvas) => {
        const imageData = canvas.toDataURL('image/png'); // Convert canvas to image
        const pdf = new jsPDF('p', 'mm', 'a4'); // Initialize jsPDF

        // Calculate dimensions for the PDF
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`); // Save the PDF

        // Restore the original visibility
        reportElement.style.display = originalDisplay;
      }).catch((error) => {
        console.error('Error generating PDF:', error);
        // Restore the original visibility even in case of an error
        reportElement.style.display = originalDisplay;
      });
    }
  }*/

  /*exportPDF(printSectionID: string, fileName: string): void {
    const reportElement = document.getElementById(printSectionID);

    let counter = 1;
    if (reportElement) {
      // Temporarily make the element visible
      const originalDisplay = reportElement.style.display;
      reportElement.style.display = 'block';

      html2canvas(reportElement, { scale: 2 }).then((canvas) => {
        const imageData = canvas.toDataURL('image/png'); // Convert canvas to image
        const pdf = new jsPDF('p', 'mm', 'a4'); // Initialize jsPDF

        // Calculate the dimensions for the PDF
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Start adding pages
        let currentY = 0;
        let imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // If the content is taller than a single page, create multiple pages
        while (currentY < imgHeight) {
          console.log(`Processing page: ${counter++}`);

          const pageHeight = pdf.internal.pageSize.height;

          // If the content doesn't fit on the current page, create a new page
          if (currentY + pageHeight > imgHeight) {
            const remainingHeight = imgHeight - currentY;
            pdf.addImage(imageData, 'PNG', 0, -currentY, pdfWidth, remainingHeight);
          } else {
            // Add image to the current page
            pdf.addImage(imageData, 'PNG', 0, currentY, pdfWidth, pageHeight);
            currentY += pageHeight;

            // If there's still content left, add a new page
            if (currentY < imgHeight) {
              pdf.addPage();
            }
          }
        }

        // Save the PDF
        pdf.save(`${fileName}.pdf`);

        // Restore the original visibility
        reportElement.style.display = originalDisplay;
      }).catch((error) => {
        console.error('Error generating PDF:', error);
        // Restore the original visibility even in case of an error
        reportElement.style.display = originalDisplay;
      });
    }
  }*/

  /*exportPDF(printSectionID: string, fileName: string): void {
    const reportElement = document.getElementById(printSectionID);
    const reportElement = document.getElementById(printSectionID);
    let counter = 1

    if (reportElement) {
      // Temporarily make the element visible
      const originalDisplay = reportElement.style.display;
      reportElement.style.display = 'block';

      html2canvas(reportElement, { scale: 2 }).then((canvas) => {
        const imageData = canvas.toDataURL('image/png'); // Convert canvas to image
        const pdf = new jsPDF('p', 'mm', 'a4'); // Initialize jsPDF

        // Calculate the dimensions for the PDF
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        let currentY = 0; // Start from the top of the first page

        // Calculate the total height of the content
        const pageHeight = pdf.internal.pageSize.height;
        let imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // Add image to the first page
        pdf.addImage(imageData, 'PNG', 0, currentY, pdfWidth, imgHeight);

        // Adjust `currentY` after the image is added
        currentY += imgHeight;

        // If the content is taller than one page, we need to add pages
        while (currentY < pdfHeight) {
          console.log(`Processing page: ${counter++}`);

          pdf.addPage(); // Add a new page
          pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, imgHeight); // Add the image to the new page
          currentY += pageHeight; // Move the `currentY` position down
        }

        // Save the PDF
        pdf.save(`${fileName}.pdf`);

        // Restore the original visibility
        reportElement.style.display = originalDisplay;
      }).catch((error) => {
        console.error('Error generating PDF:', error);
        // Restore the original visibility even in case of an error
        reportElement.style.display = originalDisplay;
      });
    }
  }*/



  exportPDF(printSectionID: string, fileName: string): void {
    const reportElements = document.getElementsByClassName('page');
    let counter = 1;

    const pdf = new jsPDF('p', 'mm', 'a4'); // Initialize jsPDF

    const scaleFactor = 0.9; // Adjust this value to reduce the height (e.g., 0.9 for 90% of the size)

    if (reportElements.length > 0) {
      // Temporarily make the elements visible
      Array.from(reportElements).forEach((reportElement: HTMLElement) => {
        const originalDisplay = reportElement.style.display;
        reportElement.style.display = 'block';

        html2canvas(reportElement, { scale: 2 }).then((canvas) => {
          const imageData = canvas.toDataURL('image/png'); // Convert canvas to image

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasHeight = canvas.height;
          const canvasWidth = canvas.width;

          // Calculate the height of the image based on the pdf width
          const imgHeight = ((canvasHeight * pdfWidth) / canvasWidth)  * scaleFactor;;

          // Add the image of the first page (no need for currentY logic here)
          pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, imgHeight);

          // If it's not the last page, add a new page for the next content
          if (counter < reportElements.length) {
            pdf.addPage(); // Add a new page for the next section
          }

          // Save the PDF if it's the last page or continue for the next page
          if (counter === reportElements.length) {
            pdf.save(`${fileName}.pdf`);
          }

          // Restore the original visibility of the element
          reportElement.style.display = originalDisplay;
          counter++; // Increment the counter for the next page
        }).catch((error) => {
          console.error('Error generating PDF:', error);
          // Restore the original visibility even in case of an error
          reportElement.style.display = originalDisplay;
        });
      });
    }
  }

}

