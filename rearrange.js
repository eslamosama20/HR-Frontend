const fs = require('fs');

const files = [
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/sales-invoice-list/sales-invoice-list.component.html',
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/invoice-details/invoice-details.component.html',
  'I:/SmartAndPro/Front/SmartAndPro.ERP.ClientApp/src/app/pages/invoices/reservation-invoices-list/reservation-invoices-list.component.html'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Regexes to capture the blocks
  const companyErrorsRegex = /<!-- Company Errors -->\s*<div \*ngIf="zatcaPreCheck\.companyErrors\.length > 0"[\s\S]*?<\/div>\s*<\/div>/;
  const customerErrorsRegex = /<!-- Customer Errors -->\s*<div \*ngIf="zatcaPreCheck\.customerErrors\.length > 0"[\s\S]*?<\/div>\s*<\/div>/;
  const warningsRegex = /<!-- Warnings \(non-blocking\) -->\s*<div \*ngIf="zatcaPreCheck\.warnings\.length > 0"[\s\S]*?<\/ul>\s*<\/div>/;

  const companyMatch = content.match(companyErrorsRegex);
  const customerMatch = content.match(customerErrorsRegex);
  const warningsMatch = content.match(warningsRegex);

  if (companyMatch && customerMatch && warningsMatch) {
    // Modify text sizes inside the blocks
    let warningsStr = warningsMatch[0]
      .replace(/text-sm/g, 'text-base font-medium')
      .replace(/font-size:\s*0\.5rem/g, 'font-size: 0.75rem');

    let companyStr = companyMatch[0]
      .replace(/text-sm/g, 'text-base font-medium')
      .replace(/font-size:\s*0\.5rem/g, 'font-size: 0.75rem');

    let customerStr = customerMatch[0]
      .replace(/text-sm/g, 'text-base font-medium')
      .replace(/font-size:\s*0\.5rem/g, 'font-size: 0.75rem');

    const combinedStr = warningsStr + '\n\n' + companyStr + '\n\n' + customerStr;

    // Remove the old blocks
    content = content.replace(companyMatch[0], '');
    content = content.replace(customerMatch[0], '');
    content = content.replace(warningsMatch[0], '');

    // Insert the combined new blocks before <!-- All Clear message -->
    content = content.replace(/<!-- All Clear message -->/, combinedStr + '\n\n      <!-- All Clear message -->');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('Failed to match blocks in ' + file);
  }
}
