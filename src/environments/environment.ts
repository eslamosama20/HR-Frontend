// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const enviroment_types = {
  local_debug: 'local_debug',
  local_publish: 'local_publish',
  staging: 'staging',
  production: 'production',
  main_production: 'main_production',
  main2_production: 'main2_production',

  vps_erpdemo: 'vps_erpdemo',
  vps_aldewanalmasia: 'vps_aldewanalmasia',
  vps_shahrazadalsamman: 'vps_shahrazadalsamman',

  vps_erp: 'vps_erp',
  vps_Alkairunited: 'vps_Alkairunited',

  vps_rawahel: 'vps_rawahel',
  vps_wardaalbustan: 'vps_wardaalbustan',

  vps_oneinnhotels: 'vps_oneinnhotels',

  vps_tripleonehotel: 'vps_tripleonehotel',

  vps_jadatalghamama: 'vps_jadatalghamama',

  vps_oneinvestment: 'vps_oneinvestment',

  vps_diyaraldewania: 'vps_diyaraldewania',

  vps_areejalahmady: 'vps_areejalahmady',

  vps_netvision: 'vps_netvision',

  vps_alsakraljawal: 'vps_alsakraljawal',

  vps_demo1: 'vps_demo1',
  vps_demo2: 'vps_demo2',
  vps_demo3: 'vps_demo3',
  vps_demo4: 'vps_demo4',
  vps_demo5: 'vps_demo5',

  vps_abwabalthuraya: 'vps_abwabalthuraya',

  vps_zadalmodon: 'vps_zadalmodon',
};

export const environment = {
  serviceWorker: false,
  production: false,
  simulateBackend: false,
  /** POS pharmacy pickup & ready-prescription UI (Saudi pharmacy readiness) */
  enablePharmacyMode: true,
  enablePrescriptionCheckout: true,
  enablePharmacyBatches: true,
  enableInteractions: true,
  enablePrescriptionWorkbench: true,
  appVersion: 'v8.4.7',
  USERDATA_KEY: 'authf649fc9a5f55',
  isMockEnabled: true,
  appThemeName: 'Metronic',
  appPreviewChangelogUrl:
    'https://preview.keenthemes.com/metronic8/angular/docs/changelog',

  application_urls: {
    local_debug: '',
    local_publish: '',
    staging: '',
    production: '',
  },
  server_urls: {
    local_debug: {
      serverUrl: 'http://localhost:5010/',
      baseApi: 'http://localhost:5010/api/',
      inventoryUrl: 'http://localhost:5010/api/inventory/',
      accountingUrl: 'http://localhost:5010/api/accounting/',
      authUrl: 'http://localhost:5010/api/auth/',
      reportUrl: 'http://localhost:5010/api/report/',
      invoiceUrl: 'http://localhost:5010/api/invoice/',
      purchaseInvoiceUrl: 'http://localhost:5010/api/PurchaseInvoice',
      salesInvoiceUrl: 'http://localhost:5010/api/SaleInvoice',
      treasuryUrl: 'http://localhost:5010/api/Treasuries/',
      billsOfSalesUrl: 'http://localhost:5010/api/BillOfSales',
      billsOfExchangesUrl: 'http://localhost:5010/api/BillsOfExchanges',
      receipts: 'http://localhost:5010/api/receipts/',
      notes: 'http://localhost:5010/api/notes/',
      hrUrl: 'http://localhost:5010/api/hr/',
      settingsUrl: 'http://localhost:5010',
      wsUrl: 'ws://localhost:5010/ws',
    },
    local_publish: '',
    staging: '',
    production: {
      serverUrl: 'http://smartpro7-001-site2.atempurl.com/',
      baseApi: 'http://smartpro7-001-site2.atempurl.com/api/',
      inventoryUrl: 'http://smartpro7-001-site2.atempurl.com/api/inventory/',
      accountingUrl: 'http://smartpro7-001-site2.atempurl.com/api/accounting/',
      authUrl: 'http://smartpro7-001-site2.atempurl.com/api/auth/',
      reportUrl: 'http://smartpro7-001-site2.atempurl.com/api/report/',
      invoiceUrl: 'http://smartpro7-001-site2.atempurl.com/api/invoice/',
      purchaseInvoiceUrl:
        'http://smartpro7-001-site2.atempurl.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'http://smartpro7-001-site2.atempurl.com/api/SaleInvoice',
      receipts: 'http://smartpro7-001-site2.atempurl.com/api/receipts/',
      notes: 'http://smartpro7-001-site2.atempurl.com/api/notes/',
      treasuryUrl: 'http://smartpro7-001-site2.atempurl.com/api/Treasuries/',
      wsUrl: 'wss://smartpro7-001-site2.atempurl.com/ws',
    },
    main_production: {
      serverUrl: 'http://smartpro7-001-site1.atempurl.com/',
      baseApi: 'http://smartpro7-001-site1.atempurl.com/api/',
      hrUrl: 'http://smartpro7-001-site1.atempurl.com/api/hr/',
      inventoryUrl: 'http://smartpro7-001-site1.atempurl.com/api/inventory/',
      accountingUrl: 'http://smartpro7-001-site1.atempurl.com/api/accounting/',
      authUrl: 'http://smartpro7-001-site1.atempurl.com/api/auth/',
      reportUrl: 'http://smartpro7-001-site1.atempurl.com/api/report/',
      invoiceUrl: 'http://smartpro7-001-site1.atempurl.com/api/invoice/',
      purchaseInvoiceUrl:
        'http://smartpro7-001-site1.atempurl.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'http://smartpro7-001-site1.atempurl.com/api/SaleInvoice',
      receipts: 'http://smartpro7-001-site1.atempurl.com/api/receipts/',
      notes: 'http://smartpro7-001-site1.atempurl.com/api/notes/',
      treasuryUrl: 'http://smartpro7-001-site1.atempurl.com/api/Treasuries/',
    },
    main2_production: {
      serverUrl: 'http://smartpro7-001-site3.ltempurl.com/',
      baseApi: 'http://smartpro7-001-site3.ltempurl.com/api/',
      hrUrl: 'http://smartpro7-001-site3.ltempurl.com/api/hr/',
      inventoryUrl: 'http://smartpro7-001-site3.ltempurl.com/api/inventory/',
      accountingUrl: 'http://smartpro7-001-site3.ltempurl.com/api/accounting/',
      authUrl: 'http://smartpro7-001-site3.ltempurl.com/api/auth/',
      reportUrl: 'http://smartpro7-001-site3.ltempurl.com/api/report/',
      invoiceUrl: 'http://smartpro7-001-site3.ltempurl.com/api/invoice/',
      purchaseInvoiceUrl:
        'http://smartpro7-001-site3.ltempurl.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'http://smartpro7-001-site3.ltempurl.com/api/SaleInvoice',
      receipts: 'http://smartpro7-001-site3.ltempurl.com/api/receipts/',
      notes: 'http://smartpro7-001-site3.ltempurl.com/api/notes/',
      treasuryUrl: 'http://smartpro7-001-site3.ltempurl.com/api/Treasuries/',
    },
    vps_erp: {
      serverUrl: 'https://server-erp.smartapro.com/',
      baseApi: 'https://server-erp.smartapro.com/api/',
      hrUrl: 'https://server-erp.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-erp.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-erp.smartapro.com/api/accounting/',
      authUrl: 'https://server-erp.smartapro.com/api/auth/',
      reportUrl: 'https://server-erp.smartapro.com/api/report/',
      invoiceUrl: 'https://server-erp.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-erp.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl: 'https://server-erp.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-erp.smartapro.com/api/receipts/',
      notes: 'https://server-erp.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-erp.smartapro.com/api/Treasuries/',
      wsUrl: 'wss://server-erp.smartapro.com/ws',
    },
    vps_Alkairunited: {
      serverUrl: 'https://server-alkairunited.smartapro.com/',
      baseApi: 'https://server-alkairunited.smartapro.com/api/',
      hrUrl: 'https://server-alkairunited.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-alkairunited.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-alkairunited.smartapro.com/api/accounting/',
      authUrl: 'https://server-alkairunited.smartapro.com/api/auth/',
      reportUrl: 'https://server-alkairunited.smartapro.com/api/report/',
      invoiceUrl: 'https://server-alkairunited.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-alkairunited.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-alkairunited.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-alkairunited.smartapro.com/api/receipts/',
      notes: 'https://server-alkairunited.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-alkairunited.smartapro.com/api/Treasuries/',
    },

    vps_erpdemo: {
      serverUrl: 'https://server-erpdemo.smartapro.com/',
      baseApi: 'https://server-erpdemo.smartapro.com/api/',
      hrUrl: 'https://server-erpdemo.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-erpdemo.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-erpdemo.smartapro.com/api/accounting/',
      authUrl: 'https://server-erpdemo.smartapro.com/api/auth/',
      reportUrl: 'https://server-erpdemo.smartapro.com/api/report/',
      invoiceUrl: 'https://server-erpdemo.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-erpdemo.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl: 'https://server-erpdemo.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-erpdemo.smartapro.com/api/receipts/',
      notes: 'https://server-erpdemo.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-erpdemo.smartapro.com/api/Treasuries/',
    },
    vps_aldewanalmasia: {
      serverUrl: 'https://server-aldewanalmasia.smartapro.com/',
      baseApi: 'https://server-aldewanalmasia.smartapro.com/api/',
      hrUrl: 'https://server-aldewanalmasia.smartapro.com/api/hr/',
      inventoryUrl:
        'https://server-aldewanalmasia.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-aldewanalmasia.smartapro.com/api/accounting/',
      authUrl: 'https://server-aldewanalmasia.smartapro.com/api/auth/',
      reportUrl: 'https://server-aldewanalmasia.smartapro.com/api/report/',
      invoiceUrl: 'https://server-aldewanalmasia.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-aldewanalmasia.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-aldewanalmasia.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-aldewanalmasia.smartapro.com/api/receipts/',
      notes: 'https://server-aldewanalmasia.smartapro.com/api/notes/',
      treasuryUrl:
        'https://server-aldewanalmasia.smartapro.com/api/Treasuries/',
    },
    vps_shahrazadalsamman: {
      serverUrl: 'https://server-shahrazadalsamman.smartapro.com/',
      baseApi: 'https://server-shahrazadalsamman.smartapro.com/api/',
      hrUrl: 'https://server-shahrazadalsamman.smartapro.com/api/hr/',
      inventoryUrl:
        'https://server-shahrazadalsamman.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-shahrazadalsamman.smartapro.com/api/accounting/',
      authUrl: 'https://server-shahrazadalsamman.smartapro.com/api/auth/',
      reportUrl: 'https://server-shahrazadalsamman.smartapro.com/api/report/',
      invoiceUrl: 'https://server-shahrazadalsamman.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-shahrazadalsamman.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-shahrazadalsamman.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-shahrazadalsamman.smartapro.com/api/receipts/',
      notes: 'https://server-shahrazadalsamman.smartapro.com/api/notes/',
      treasuryUrl:
        'https://server-shahrazadalsamman.smartapro.com/api/Treasuries/',
    },
    vps_rawahel: {
      serverUrl: 'https://server-rawahel.smartapro.com/',
      baseApi: 'https://server-rawahel.smartapro.com/api/',
      hrUrl: 'https://server-rawahel.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-rawahel.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-rawahel.smartapro.com/api/accounting/',
      authUrl: 'https://server-rawahel.smartapro.com/api/auth/',
      reportUrl: 'https://server-rawahel.smartapro.com/api/report/',
      invoiceUrl: 'https://server-rawahel.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-rawahel.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl: 'https://server-rawahel.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-rawahel.smartapro.com/api/receipts/',
      notes: 'https://server-rawahel.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-rawahel.smartapro.com/api/Treasuries/',
    },
    vps_wardaalbustan: {
      serverUrl: 'https://server-wardaalbustan.smartapro.com/',
      baseApi: 'https://server-wardaalbustan.smartapro.com/api/',
      hrUrl: 'https://server-wardaalbustan.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-wardaalbustan.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-wardaalbustan.smartapro.com/api/accounting/',
      authUrl: 'https://server-wardaalbustan.smartapro.com/api/auth/',
      reportUrl: 'https://server-wardaalbustan.smartapro.com/api/report/',
      invoiceUrl: 'https://server-wardaalbustan.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-wardaalbustan.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-wardaalbustan.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-wardaalbustan.smartapro.com/api/receipts/',
      notes: 'https://server-wardaalbustan.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-wardaalbustan.smartapro.com/api/Treasuries/',
    },

    vps_oneinnhotels: {
      serverUrl: 'https://server-oneinnhotels.smartapro.com/',
      baseApi: 'https://server-oneinnhotels.smartapro.com/api/',
      hrUrl: 'https://server-oneinnhotels.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-oneinnhotels.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-oneinnhotels.smartapro.com/api/accounting/',
      authUrl: 'https://server-oneinnhotels.smartapro.com/api/auth/',
      reportUrl: 'https://server-oneinnhotels.smartapro.com/api/report/',
      invoiceUrl: 'https://server-oneinnhotels.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-oneinnhotels.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-oneinnhotels.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-oneinnhotels.smartapro.com/api/receipts/',
      notes: 'https://server-oneinnhotels.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-oneinnhotels.smartapro.com/api/Treasuries/',
    },

    vps_tripleonehotel: {
      serverUrl: 'https://server-tripleonehotel.smartapro.com/',
      baseApi: 'https://server-tripleonehotel.smartapro.com/api/',
      hrUrl: 'https://server-tripleonehotel.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-tripleonehotel.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-tripleonehotel.smartapro.com/api/accounting/',
      authUrl: 'https://server-tripleonehotel.smartapro.com/api/auth/',
      reportUrl: 'https://server-tripleonehotel.smartapro.com/api/report/',
      invoiceUrl: 'https://server-tripleonehotel.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-tripleonehotel.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-tripleonehotel.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-tripleonehotel.smartapro.com/api/receipts/',
      notes: 'https://server-tripleonehotel.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-tripleonehotel.smartapro.com/api/Treasuries/',
    },

    vps_jadatalghamama: {
      serverUrl: 'https://server-jadatalghamama.smartapro.com/',
      baseApi: 'https://server-jadatalghamama.smartapro.com/api/',
      hrUrl: 'https://server-jadatalghamama.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-jadatalghamama.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-jadatalghamama.smartapro.com/api/accounting/',
      authUrl: 'https://server-jadatalghamama.smartapro.com/api/auth/',
      reportUrl: 'https://server-jadatalghamama.smartapro.com/api/report/',
      invoiceUrl: 'https://server-jadatalghamama.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-jadatalghamama.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-jadatalghamama.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-jadatalghamama.smartapro.com/api/receipts/',
      notes: 'https://server-jadatalghamama.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-jadatalghamama.smartapro.com/api/Treasuries/',
    },
    vps_oneinvestment: {
      serverUrl: 'https://server-oneinvestment.smartapro.com/',
      baseApi: 'https://server-oneinvestment.smartapro.com/api/',
      hrUrl: 'https://server-oneinvestment.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-oneinvestment.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-oneinvestment.smartapro.com/api/accounting/',
      authUrl: 'https://server-oneinvestment.smartapro.com/api/auth/',
      reportUrl: 'https://server-oneinvestment.smartapro.com/api/report/',
      invoiceUrl: 'https://server-oneinvestment.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-oneinvestment.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-oneinvestment.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-oneinvestment.smartapro.com/api/receipts/',
      notes: 'https://server-oneinvestment.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-oneinvestment.smartapro.com/api/Treasuries/',
    },
    vps_diyaraldewania: {
      serverUrl: 'https://server-diyaraldewania.smartapro.com/',
      baseApi: 'https://server-diyaraldewania.smartapro.com/api/',
      hrUrl: 'https://server-diyaraldewania.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-diyaraldewania.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-diyaraldewania.smartapro.com/api/accounting/',
      authUrl: 'https://server-diyaraldewania.smartapro.com/api/auth/',
      reportUrl: 'https://server-diyaraldewania.smartapro.com/api/report/',
      invoiceUrl: 'https://server-diyaraldewania.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-diyaraldewania.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-diyaraldewania.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-diyaraldewania.smartapro.com/api/receipts/',
      notes: 'https://server-diyaraldewania.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-diyaraldewania.smartapro.com/api/Treasuries/',
    },

    vps_areejalahmady: {
      serverUrl: 'https://server-areejalahmady.smartapro.com/',
      baseApi: 'https://server-areejalahmady.smartapro.com/api/',
      hrUrl: 'https://server-areejalahmady.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-areejalahmady.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-areejalahmady.smartapro.com/api/accounting/',
      authUrl: 'https://server-areejalahmady.smartapro.com/api/auth/',
      reportUrl: 'https://server-areejalahmady.smartapro.com/api/report/',
      invoiceUrl: 'https://server-areejalahmady.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-areejalahmady.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-areejalahmady.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-areejalahmady.smartapro.com/api/receipts/',
      notes: 'https://server-areejalahmady.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-areejalahmady.smartapro.com/api/Treasuries/',
    },
    vps_netvision: {
      serverUrl: 'https://server-netvision.smartapro.com/',
      baseApi: 'https://server-netvision.smartapro.com/api/',
      hrUrl: 'https://server-netvision.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-netvision.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-netvision.smartapro.com/api/accounting/',
      authUrl: 'https://server-netvision.smartapro.com/api/auth/',
      reportUrl: 'https://server-netvision.smartapro.com/api/report/',
      invoiceUrl: 'https://server-netvision.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-netvision.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-netvision.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-netvision.smartapro.com/api/receipts/',
      notes: 'https://server-netvision.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-netvision.smartapro.com/api/Treasuries/',
    },
    vps_alsakraljawal: {
      serverUrl: 'https://server-alsakraljawal.smartapro.com/',
      baseApi: 'https://server-alsakraljawal.smartapro.com/api/',
      hrUrl: 'https://server-alsakraljawal.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-alsakraljawal.smartapro.com/api/inventory/',
      accountingUrl:
        'https://server-alsakraljawal.smartapro.com/api/accounting/',
      authUrl: 'https://server-alsakraljawal.smartapro.com/api/auth/',
      reportUrl: 'https://server-alsakraljawal.smartapro.com/api/report/',
      invoiceUrl: 'https://server-alsakraljawal.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-alsakraljawal.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-alsakraljawal.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-alsakraljawal.smartapro.com/api/receipts/',
      notes: 'https://server-alsakraljawal.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-alsakraljawal.smartapro.com/api/Treasuries/',
      wsUrl: 'wss://server-alsakraljawal.smartapro.com/ws',
    },

    vps_demo1: {
      serverUrl: 'https://server-demo1.smartapro.com/',
      baseApi: 'https://server-demo1.smartapro.com/api/',
      hrUrl: 'https://server-demo1.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-demo1.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-demo1.smartapro.com/api/accounting/',
      authUrl: 'https://server-demo1.smartapro.com/api/auth/',
      reportUrl: 'https://server-demo1.smartapro.com/api/report/',
      invoiceUrl: 'https://server-demo1.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-demo1.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-demo1.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-demo1.smartapro.com/api/receipts/',
      notes: 'https://server-demo1.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-demo1.smartapro.com/api/Treasuries/',
    },
    vps_demo2: {
      serverUrl: 'https://server-demo2.smartapro.com/',
      baseApi: 'https://server-demo2.smartapro.com/api/',
      hrUrl: 'https://server-demo2.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-demo2.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-demo2.smartapro.com/api/accounting/',
      authUrl: 'https://server-demo2.smartapro.com/api/auth/',
      reportUrl: 'https://server-demo2.smartapro.com/api/report/',
      invoiceUrl: 'https://server-demo2.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-demo2.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-demo2.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-demo2.smartapro.com/api/receipts/',
      notes: 'https://server-demo2.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-demo2.smartapro.com/api/Treasuries/',
    },
    vps_demo3: {
      serverUrl: 'https://server-demo3.smartapro.com/',
      baseApi: 'https://server-demo3.smartapro.com/api/',
      hrUrl: 'https://server-demo3.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-demo3.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-demo3.smartapro.com/api/accounting/',
      authUrl: 'https://server-demo3.smartapro.com/api/auth/',
      reportUrl: 'https://server-demo3.smartapro.com/api/report/',
      invoiceUrl: 'https://server-demo3.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-demo3.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-demo3.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-demo3.smartapro.com/api/receipts/',
      notes: 'https://server-demo3.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-demo3.smartapro.com/api/Treasuries/',
    },
    vps_demo4: {
      serverUrl: 'https://server-demo4.smartapro.com/',
      baseApi: 'https://server-demo4.smartapro.com/api/',
      hrUrl: 'https://server-demo4.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-demo4.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-demo4.smartapro.com/api/accounting/',
      authUrl: 'https://server-demo4.smartapro.com/api/auth/',
      reportUrl: 'https://server-demo4.smartapro.com/api/report/',
      invoiceUrl: 'https://server-demo4.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-demo4.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-demo4.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-demo4.smartapro.com/api/receipts/',
      notes: 'https://server-demo4.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-demo4.smartapro.com/api/Treasuries/',
    },
    vps_demo5: {
      serverUrl: 'https://server-demo5.smartapro.com/',
      baseApi: 'https://server-demo5.smartapro.com/api/',
      hrUrl: 'https://server-demo5.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-demo5.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-demo5.smartapro.com/api/accounting/',
      authUrl: 'https://server-demo5.smartapro.com/api/auth/',
      reportUrl: 'https://server-demo5.smartapro.com/api/report/',
      invoiceUrl: 'https://server-demo5.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-demo5.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-demo5.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-demo5.smartapro.com/api/receipts/',
      notes: 'https://server-demo5.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-demo5.smartapro.com/api/Treasuries/',
    },

    vps_abwabalthuraya: {
      serverUrl: 'https://server-abwabalthuraya.smartapro.com/',
      baseApi: 'https://server-abwabalthuraya.smartapro.com/api/',
      hrUrl: 'https://server-abwabalthuraya.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-abwabalthuraya.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-abwabalthuraya.smartapro.com/api/accounting/',
      authUrl: 'https://server-abwabalthuraya.smartapro.com/api/auth/',
      reportUrl: 'https://server-abwabalthuraya.smartapro.com/api/report/',
      invoiceUrl: 'https://server-abwabalthuraya.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-abwabalthuraya.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-abwabalthuraya.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-abwabalthuraya.smartapro.com/api/receipts/',
      notes: 'https://server-abwabalthuraya.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-abwabalthuraya.smartapro.com/api/Treasuries/',
    },

    vps_zadalmodon: {
      serverUrl: 'https://server-zadalmodon.smartapro.com/',
      baseApi: 'https://server-zadalmodon.smartapro.com/api/',
      hrUrl: 'https://server-zadalmodon.smartapro.com/api/hr/',
      inventoryUrl: 'https://server-zadalmodon.smartapro.com/api/inventory/',
      accountingUrl: 'https://server-zadalmodon.smartapro.com/api/accounting/',
      authUrl: 'https://server-zadalmodon.smartapro.com/api/auth/',
      reportUrl: 'https://server-zadalmodon.smartapro.com/api/report/',
      invoiceUrl: 'https://server-zadalmodon.smartapro.com/api/invoice/',
      purchaseInvoiceUrl:
        'https://server-zadalmodon.smartapro.com/api/PurchaseInvoice',
      salesInvoiceUrl:
        'https://server-zadalmodon.smartapro.com/api/SaleInvoice',
      receipts: 'https://server-zadalmodon.smartapro.com/api/receipts/',
      notes: 'https://server-zadalmodon.smartapro.com/api/notes/',
      treasuryUrl: 'https://server-zadalmodon.smartapro.com/api/Treasuries/',
    },
  },
  /*
   *  vps_erp
   *  vps_Alkairunited
   *
   *  vps_erpdemo
   *  vps_aldewanalmasia
   *  vps_shahrazadalsamman
   *
   *  vps_rawahel
   *  vps_wardaalbustan
   *  vps_oneinnhotels
   *  vps_tripleonehotel
   *  vps_jadatalghamama
   * 
   *  vps_oneinvestment
   *  vps_diyaraldewania
   *  vps_areejalahmady
   *  vps_netvision
   *  vps_alsakraljawal
   *
   *  vps_demo1
   *  vps_demo2
   *  vps_demo3
   *  vps_demo4
   *  vps_demo5
   * 
   * vps_abwabalthuraya
   * 
   * vps_zadalmodon

   * */
  active_server: enviroment_types.local_debug,
  active_application: enviroment_types.local_publish,

  cloudinary: {
    cloudName: 'dlmkkqpmh',
    uploadPreset: 'ml_default',
  },

  // Paymob Payment Gateway Configuration
  paymob: {
    apiKey: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2T1RJMU9USXdMQ0p1WVcxbElqb2lhVzVwZEdsaGJDSjkubDR0VDR4MWVyZ2lKenpWb3AwdWpNZmQ2VUp6eFFCMTBpYUdLX0YzT1pFNVVVTjlXSG03UF9nRU1RY2U5RGlwMkJDY1ZBV1hXNFVKb2xFc1RRa181cUE=',
    integrationId: 5410149,
    iframeId: null,
    secretKey: '',
    publicKey: 'egy_pk_test_FtCZNs13kuLN6qfJmbrc3wIBb7UjfayR',
    currency: 'EGP',
    callbackUrl: 'http://localhost:4200/payment-callback',
    baseUrl: 'https://accept.paymob.com/api'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error'; // Included with Angular CLI.
