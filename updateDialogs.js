const fs = require('fs');
const files = [
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/sales-invoice-list/sales-invoice-list.component.html',
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/invoice-details/invoice-details.component.html',
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/reservation-invoices-list/reservation-invoices-list.component.html'
];

const newDialog = `
<p-dialog [visible]="zatcaSendingStatus !== 'none' && zatcaSending" [modal]="true" [closable]="false" [showHeader]="false" [style]="{width: '300px'}">
  <div class="flex flex-column align-items-center justify-content-center p-4">
      <i class="pi pi-spin pi-spinner" style="font-size: 3rem; color: var(--primary-color)"></i>
      <h4 class="mt-3 mb-0 text-center" *ngIf="zatcaSendingStatus === 'validating'">{{ activeLanguage === 'ar' ? 'جاري مراجعة البيانات للإرسال...' : 'Reviewing data for sending...' }}</h4>
      <h4 class="mt-3 mb-0 text-center" *ngIf="zatcaSendingStatus === 'sending'">{{ activeLanguage === 'ar' ? 'جاري الإرسال لزاتكا، يرجى الانتظار...' : 'Sending to ZATCA, please wait...' }}</h4>
  </div>
</p-dialog>
`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const dialogStart = content.indexOf('<p-dialog [(visible)]="zatcaSending"');
  if (dialogStart !== -1) {
    content = content.substring(0, dialogStart);
  }
  content += newDialog;
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Dialogs updated successfully.');
