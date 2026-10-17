# تقرير تكامل وصفات الصيدلية والتأمين (Frontend + متطلبات Backend)

**التاريخ:** 2026-04-28  
**نطاق:** واجهة وصفات الصيدلية، حفظ الوصفة اليدوية، تبويب التأمين داخل الـ popup، صفحة مطالبات التأمين.

---

## A. مشكلة ظهور الأدوية في «وصفة جديدة»

### السبب السابق

- الدالة `searchProducts()` كانت تُصفّر القائمة (`availableProducts = []`) عندما يكون حقل البحث فارغاً، وتستدعي الـ API فقط عند وجود نص.
- عند `openNewPrescription()` لم يكن يُستدعى أي تحميل تلقائي، فبقي الجدول فارغاً حتى يكتب المستخدم في البحث.

### الملفات المعدّلة

- `src/app/services/cashier/pharmacy-inventory.service.ts` — إضافة `getAllAvailableMedicationProducts()`.
- `src/app/pages/cashier/components/pharmacy-prescriptions/pharmacy-prescriptions.component.ts` — `loadAvailableMedicationProducts()`, `filterAvailableMedicationProducts()`, استدعاء التحميل عند الفتح.
- `src/app/pages/cashier/components/pharmacy-prescriptions/pharmacy-prescriptions.component.html` — حالة تحميل، empty state، إزالة `searchProducts` من `(ngModelChange)`.

### السلوك بعد التعديل

- عند فتح «وصفة جديدة» أو «تحرير وصفة» أو «إدارة أصناف الوصفة» يُستدعى `loadAvailableMedicationProducts()` الذي يقرأ **نفس لقطة المخزون** (`getSnapshot`: مخازن صيدلية، أصناف دوائية، كميات، باتش/صلاحية، بدون منتهي) دون اشتراط نص بحث.
- **البحث** أصبح فلتراً محلياً فقط على `medicationCatalog` عبر `filterAvailableMedicationProducts(term)`؛ الحقل الفارغ يعرض **كل** الكتالوج المحمّل.
- **تكرار الاستدعاءات:** `getSnapshot()` داخل الخدمة مع `shareReplay(1)` يقلل إعادة جلب `StoreDetails` + `InventoryStocks` + `MainPurchaseClass` عند فتح النافذة أكثر من مرة في الجلسة؛ بعد حفظ وصفة يُستدعى `refreshSnapshot()` لتحديث المخزون.

### عند عدم وجود أدوية

- يُعرض empty state يشرح: مخازن غير صيدلية، عدم مخزون، شروط باتش/صلاحية، أو أن الفلتر النصي يخفي كل النتائج.

---

## B. حفظ الوصفة

### هل كان محلياً فقط؟

- **نعم سابقاً:** `savePrescription()` كان يحدّث `orders` عبر `orders.update(...)` دون `POST` للخادم.

### هل تم ربطه بـ API؟

- **نعم للإنشاء:** `POST {baseApi}v1/pharmacy/prescriptions/manual` عبر `PharmacySupportApiService.createManualPrescription`.
- **للتحرير:** `PUT {baseApi}v1/pharmacy/prescriptions/{id}` عبر `updatePrescription` لتحديث الحقول المدعومة في الـ payload الحالي (مثل `prescriptionNo`, `notes` المجمّعة من المريض/الطبيب/المرجع).

### الـ endpoint والـ payload (إنشاء)

- **Endpoint:** `POST /api/v1/pharmacy/prescriptions/manual` (المسار الفعلي يبنى من `environment` + `v1/pharmacy/prescriptions/manual`).
- **الجسم:** `ManualCreatePrescriptionRequest` — يتضمن الآن حقلاً اختيارياً: `patientName`, `doctorName`, `prescriptionNo`, `notes`, `storeDetailsId`, `items[]` (مع `batchNo`, `expiryDate`, `unitPrice`, `storeId` لكل بند عند توفرها)، و`insurance` اختياري للـ JSON (قد يتجاهله الخادم حتى يدعم العقد).

### ما زال ناقصاً من ناحية Backend / المنتج

1. **تعديل بنود الوصفة:** واجهة التحرير لا تزامن حذف/إضافة الأسطر مع `POST/PUT/DELETE .../prescriptions/{id}/items` — يحتاج تدفق واضح (استبدال كامل، أو delta).
2. **`patientId`:** الواجهة ترسل `patientId: null` ما لم يُربط مريض بمعرف GUID؛ يحتاج منتقي مريض مربوط بـ `/v1/pharmacy/patients`.
3. **اعتماد الحقول الإضافية في `manual`:** الحقول الجديدة في JSON (تأمين، `prescriptionNo`، باتش لكل سطر) يجب أن يؤكدها الـ Backend (قبول أو رفض صريح) لتفادي صمت التجاهل.
4. **`rxNo`:** أصبح اختيارياً في التحقق على الواجهة؛ يجب أن يقرر الـ Backend توليد `rxNo` تلقائياً عند الفراغ.

---

## C. التأمين داخل «وصفة جديدة»

### قبل التعديل

- تبويب التأمين: **واجهة + حسابات محلية** (نسبة تغطية، حصة مريض) دون حفظ مع الوصفة.

### بعد التعديل (ما تم ربطه)

- بعد **نجاح** `createManualPrescription`، إذا كان نوع السداد «تأمين» ووُجدت بيانات (`hasInsuranceDraftInput`) يُستدعى **`PUT .../prescriptions/{id}`** عبر `PharmacyApiService.updateInsuranceInfo` بنفس معرف الوصفة الراجع من الإنشاء (GUID أو نص).
- لا يُستدعى **`verifyInsuranceCoverage`** من داخل تبويب الوصفة الجديدة (ما زال مستخدماً في نافذة التأمين المنفصلة للوصفة المحفوظة مسبقاً).

### ما يحتاج Backend

- توحيد مسار: إما قبول التأمين ضمن `POST .../manual` دفعة واحدة، أو توثيق أن `PUT .../prescriptions/{id}` هو المسار الرسمي بعد الإنشاء.
- **`verifyInsuranceCoverage`** الحالي: `POST .../v1/pharmacy/insurance/verify` — يحتاج عقداً واضحاً للعناصر (`itemId` رقمي في الخدمة الحالية مقابل GUID في المخزون).

### هل يمكن إنشاء claim من الوصفة؟

- **ليس من داخل popup الوصفة الجديدة.** إنشاء المطالبة يبقى من صفحة **مطالبات التأمين** أو تدفق لاحق `from-prescription` إذا وُفر من الـ Backend (انظر القسم E).

---

## D. صفحة مطالبات التأمين (`pharmacy-insurance`)

| القدرة | الحالة | الملاحظات |
|--------|--------|-----------|
| قائمة المطالبات | **متصلة** | `PharmacySupportApiService.getInsuranceClaimsPage(1, 100)` → `GET .../insurance-claims` مع `page` و`size`. |
| تفاصيل مطالبة | **متصلة** | `getInsuranceClaimById`؛ عند الخطأ يُعرض الـ claim من القائمة كاحتياط. |
| إنشاء مطالبة | **متصلة** | `createInsuranceClaim` مع `mapCreateInsuranceClaimRequest`. |
| تحديث حالة | **متصلة** | `updateInsuranceClaimStatus` + `mapUpdateInsuranceClaimStatusRequest`. |
| Submit claim | **متصلة** | `submitPrescriptionClaim(prescriptionId, ...)` → `POST .../prescriptions/{id}/submit-claim`. |
| Poll NPHIES | **متصلة** | `pollNphiesClaim` → `POST .../insurance-claims/{id}/poll-nphies`. |

### Status mapping

- **محلي:** `normalizeLocalClaimStatus` + `mapLocalToBackendClaimStatus` في `nphies-claim-status.adapter`.
- **NPHIES:** `normalizeNphiesStatus`.
- **المبالغ:** في `mapInsuranceClaim` يُستخرج `totalAmount` من `totalAmount` أو `claimAmount`؛ `insuranceCoveredAmount` من عدة مفاتيح بديلة — **مخاطرة تعارض أسماء الحقول** بين بيئات؛ يُفضّل توثيق عقد الـ API.

### Mock / fallback

- **لا يوجد mock بيانات** في هذه الصفحة؛ عند الخطأ تُفرّغ القائمة وتُعرض رسالة.
- **Fallback محلي:** في `openDetails` عند فشل `getInsuranceClaimById` يُفتح الحوار بالبيانات المخزنة في الجدول فقط.

### مخاطر

- `canSubmitClaim` / `canPollClaim` تعتمد على `nphiesStatus` و`prescriptionId`؛ إن لم يرجع الـ API `prescriptionId` لن يعمل الـ submit.
- `getInsuranceClaimsPage` يستخدم `size` وليس `pageSize` في بعض الاستدعاءات — يجب مواءمة العقد مع الـ Backend.

---

## E. متطلبات Backend (وثيقة جاهزة للإرسال)

> المسارات below تُفترض تحت `/api/v1/pharmacy/` حسب بيئة النشر.

### 1. Manual Prescription Save

```http
POST /api/v1/pharmacy/prescriptions/manual
```

**Request (مقترح موحّد):**

```json
{
  "patientId": "guid|null",
  "patientName": "string",
  "doctorName": "string",
  "prescriptionNo": "string|null",
  "notes": "string",
  "storeDetailsId": "guid",
  "items": [
    {
      "itemId": "guid",
      "itemName": "string",
      "quantity": 2,
      "dosage": "string",
      "instructions": "string",
      "batchNo": "BATCH-001",
      "expiryDate": "2027-12-31",
      "unitPrice": 10,
      "storeId": "guid|null"
    }
  ],
  "insurance": {
    "providerId": "guid|null",
    "policyNo": "string",
    "memberNo": "string",
    "coveragePercent": 80,
    "requiresApproval": true
  }
}
```

**Response:**

```json
{
  "id": "guid",
  "rxNo": "RX-0001",
  "status": "draft",
  "createdAt": "2026-04-28T12:00:00Z"
}
```

**ملاحظات للـ Backend:**

- قبول أو رفض الحقول الإضافية صراحةً (تجنب تجاهل صامت).
- التحقق من أن جميع `items` تنتمي لـ `storeDetailsId` المرسل.
- عند غياب `prescriptionNo` توليد `rxNo` تلقائياً.

---

### 2. Insurance Verification

```http
POST /api/v1/pharmacy/insurance/verify-coverage
```

**Request:**

```json
{
  "patientId": "guid|null",
  "providerId": "guid",
  "policyNo": "string",
  "items": [
    {
      "itemId": "guid",
      "quantity": 2,
      "unitPrice": 10
    }
  ]
}
```

**Response:**

```json
{
  "covered": true,
  "coveragePercent": 80,
  "patientShare": 4,
  "insuranceShare": 16,
  "requiresApproval": false,
  "message": "string"
}
```

**ملاحظة:** اليوم يوجد مسار قريب: `POST .../insurance/verify` — إما توحيد الاسم أو الإبقاء مع توثيق الفرق.

---

### 3. Create Claim From Prescription

```http
POST /api/v1/pharmacy/insurance-claims/from-prescription
```

```json
{
  "prescriptionId": "guid",
  "providerId": "guid",
  "policyNo": "string",
  "memberNo": "string"
}
```

---

### 4. Submit Claim

```http
POST /api/v1/pharmacy/insurance-claims/{id}/submit
```

(أو الاستمرار في المسار الحالي المرتبط بالوصفة: `POST .../prescriptions/{prescriptionId}/submit-claim` — يجب توثيق المسار الرسمي الواحد.)

---

### 5. Poll NPHIES

```http
GET /api/v1/pharmacy/insurance-claims/{id}/nphies-status
```

(أو الاستمرار في: `POST .../insurance-claims/{claimId}/poll-nphies` كما في `PharmacySupportApiService`.)

---

## ملخص الملفات التقنية الم touched بهذا الإصدار

- `pharmacy-api.service.ts` — `serverPrescriptionId`, `normalizePrescriptionNumericId`, معرفات `number | string` في مسارات الوصفة، توسيع `PharmacyDispenseLineCommitDto.prescriptionId`.
- `pharmacy-support-api.service.ts` — توسيع `ManualCreatePrescriptionRequest` / العناصر / التأمين.
- `pharmacy-inventory.service.ts` — `getAllAvailableMedicationProducts()`.
- `pharmacy-prescriptions.component.ts` / `.html` — تحميل كتالوج، فلتر، حفظ عبر API، مسارات التأمين بعد الإنشاء، معرفات REST للوصفة.
- هذا الملف — التقرير.
