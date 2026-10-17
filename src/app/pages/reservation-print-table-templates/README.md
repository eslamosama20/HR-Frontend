# Reservation Print Table Templates Component

## Overview

This component provides a table columns template builder for managing how reservation data is displayed and printed. It allows users to create, edit, and manage column templates with full customization options.

## Features

### Template Management

- Create new table templates
- Edit existing templates
- Delete templates with confirmation
- List all templates with pagination
- Preview templates with sample data

### Column Configuration

- **Quick Selection**: Choose from predefined reservation fields
- **Custom Columns**: Create custom columns with manual configuration
- **Data Types**: Support for string, number, date, boolean, and currency types
- **Alignment**: Left, center, or right alignment options
- **Width Control**: Configurable column width (50-1000px)
- **Visibility**: Show/hide columns
- **Ordering**: Drag and drop or move up/down to reorder columns

### Available Column Options

#### Basic Info

- Reference Number
- Guest Name
- Guest Phone
- Nationality
- Reservation Type

#### Dates

- Arrival Date
- Departure Date
- Number of Nights

#### System Fields

- ID
- Created At
- Created By
- Is Active

#### Calculated Fields

- Total Cost
- Total Amount
- Room Cost
- Room Amount
- Service Cost
- Service Amount
- Total Rooms
- Total Services
- Average Room Rate
- Total Tax
- Total Discount
- Net Amount

---

## مصدر خيارات الأعمدة الجاهزة (Predefined Columns)

قائمة "Select a predefined column" في نافذة إضافة/تعديل العمود **تُملأ من الكود** وليس من قاعدة البيانات.

- **الملف:** `reservation-print-table-templates.component.ts`
- **المتغير:** `availableColumns` (مصفوفة من نوع `ColumnOption[]`)
- **أين تُهيأ:** داخل الدالة `initializeTranslatedData()` في الـ constructor

كل عنصر في `availableColumns` له الشكل:

```ts
{
  value: string;      // اسم الحقل في نموذج الحجز (ReservationModel) أو الـ API
  label: string;      // النص المعروض (عادة عبر this.translate.instant('KEY'))
  dataType: "string" | "number" | "date" | "boolean" | "currency";
  category: string;  // للتجميع في القائمة (مثل: Basic Info, Dates, System, Calculated)
}
```

- **`value`** يجب أن يطابق اسم خاصية موجودة في بيانات الحجز (مثل `referenceNumber`, `guestName`, `arrivalDate`) حتى يظهر القيمة صح في البحث المتقدم والطباعة.
- **`label`** يظهر في الـ dropdown؛ يُفضّل استخدام مفاتيح الترجمة مثل `this.translate.instant('FINANCE.TT_GUEST_NAME')` ثم إضافة المفتاح في ملفات الترجمة (`ar.ts`, `en.ts`) إن لزم.

---

## إضافة عمود جديد (قالب جاهز) أو عمود مخصص

### 1) إضافة خيار جديد في القائمة المنسدلة (عمود جاهز)

1. افتح `reservation-print-table-templates.component.ts`.
2. داخل `initializeTranslatedData()` ابحث عن `this.availableColumns = [...]`.
3. أضف عنصراً جديداً للمصفوفة، مثلاً:

```ts
{ value: 'guestEmail', label: this.translate.instant('FINANCE.TT_GUEST_EMAIL'), dataType: 'string', category: this.translate.instant('FINANCE.TT_BASIC_INFO') }
```

4. إذا استخدمت مفتاح ترجمة جديد (مثل `FINANCE.TT_GUEST_EMAIL`)، أضفه في:
   - `src/app/modules/i18n/vocabs/ar.ts`
   - `src/app/modules/i18n/vocabs/en.ts`

5. تأكد أن **`value`** يطابق اسم الحقل في نموذج الحجز (`ReservationModel`) أو في استجابة الـ API، وإلا لن تظهر بيانات الحقل في الجدول/الطباعة.

### 2) إضافة عمود بدون وضعه في القائمة الجاهزة (عمود مخصص)

- من نفس الشاشة: لا تختر من الـ dropdown "Select a predefined column".
- املأ يدوياً:
  - **Column name (columnName):** اسم الحقل كما في الـ API/الموديل (مثل `guestEmail`).
  - **Display name (displayName):** الاسم الذي يظهر في رأس الجدول.
  - **Data type, Width, Alignment, Visibility** كما تريد.

بهذا يكون العمود مخصصاً للقالب الحالي فقط ولن يظهر كخيار في القائمة الجاهزة.

### 3) إذا كان العمود الجديد تاريخاً أو يحتاج عرضاً خاصاً

- في **البحث المتقدم** (`reservation-advanced-search`)، عرض القيم يتم عبر `getCellValue()`.
- إذا أضفت حقل **تاريخ** جديد، أضف اسم الحقل في `dateFields` داخل `reservation-advanced-search.component.ts` حتى يُنسّق كتاريخ.
- إذا كان الحقل يحتاج تحويلاً خاصاً (مثل نوع الحجز)، أضف شرطاً في `getCellValue()` لمعالجة هذا الحقل.

---

## Technology Stack

- **Angular 17**: Standalone component architecture
- **PrimeNG v17**: UI components and styling
- **Tailwind CSS**: Utility-first CSS framework
- **Reactive Forms**: Form handling and validation

## Component Structure

### Files

- `reservation-print-table-templates.component.ts` - Main component logic
- `reservation-print-table-templates.component.html` - Template markup
- `reservation-print-table-templates.component.scss` - Component styles

### Services

- `ReservationPrintTableTemplateService` - Data service for template CRUD operations

### Models

- `ReservationPrintTableTemplateModel` - Template entity model
- `PrintTableColumnModel` - Column configuration model

## Usage

### Navigation

Access the component via the route: `/reservation-print-table-template`

### Creating a Template

1. Click "New Template" button
2. Enter template name and description
3. Add columns using the "Add Column" button
4. Configure each column's properties:
   - Column name (field name)
   - Display name (user-friendly label)
   - Data type
   - Width in pixels
   - Alignment
   - Visibility
5. Reorder columns as needed
6. Save the template

### Editing a Template

1. Click the edit icon on an existing template
2. Modify template properties or columns
3. Save changes

### Column Configuration

- Use the quick select dropdown to choose predefined fields
- Or manually configure custom columns
- Drag columns to reorder or use up/down arrows
- Set appropriate data types for proper formatting
- Configure width and alignment for optimal display

## Validation

- Template name is required
- At least one column is required per template
- Column names must be unique within a template
- Width must be between 50-1000 pixels
- All required fields must be filled

## Preview Functionality

The preview feature generates sample reservation data to demonstrate how the template would display actual data. This helps users visualize the final output before saving.

## Styling

The component uses Tailwind CSS classes for styling with custom SCSS enhancements for PrimeNG components. The design follows a modern, clean interface with:

- Responsive layout
- Consistent color scheme
- Intuitive icons and buttons
- Proper visual feedback for actions

## Error Handling

- Form validation with visual feedback
- API error handling with toast notifications
- Confirmation dialogs for destructive actions
- Loading states for better UX

## Future Enhancements

- Export/import template configurations
- Template categories and grouping
- Advanced formatting options
- Print preview with actual reservation data
- Template sharing between users
