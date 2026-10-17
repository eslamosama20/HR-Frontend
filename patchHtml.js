const fs = require('fs');
let content = fs.readFileSync('I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/sales-invoice-list/sales-invoice-list.component.html', 'utf8');

content = content.replace(/\{\{ bulkZatcaValidationResults \| filterByStatus:'ready':true \}\}/g, '{{ bulkReadyCount }}');
content = content.replace(/\{\{ bulkZatcaValidationResults \| filterByStatus:'warnings':true \}\}/g, '{{ bulkWarningsCount }}');
content = content.replace(/\{\{ bulkZatcaValidationResults \| filterByStatus:'error':true \}\}/g, '{{ bulkErrorCount }}');
content = content.replace(`*ngIf="bulkZatcaValidationResults | filterByStatus:'error':true as errCount"`, `*ngIf="bulkErrorCount < bulkZatcaValidationResults.length"`);

fs.writeFileSync('I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/sales-invoice-list/sales-invoice-list.component.html', content, 'utf8');
console.log('Done');
