const fs = require('fs');
const dialogStr = `
<p-dialog [(visible)]="zatcaSending" [modal]="true" [closable]="false" [showHeader]="false" [style]="{width: '300px'}">
  <div class="flex flex-column align-items-center justify-content-center p-4">
      <i class="pi pi-spin pi-spinner" style="font-size: 3rem; color: var(--primary-color)"></i>
      <h4 class="mt-3 mb-0 text-center">{{ activeLanguage === 'ar' ? 'جاري الإرسال لزاتكا، يرجى الانتظار...' : 'Sending to ZATCA, please wait...' }}</h4>
  </div>
</p-dialog>
`;
const fileList = [
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/sales-invoice-list/sales-invoice-list.component.html'
];
for(const f of fileList) {
  fs.appendFileSync(f, dialogStr);
}
console.log('Appended successfully.');
