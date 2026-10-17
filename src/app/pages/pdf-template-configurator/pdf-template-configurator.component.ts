import {Component, EventEmitter, Input, LOCALE_ID, OnInit, Output, signal} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CompanyDetailsService} from "../../services/inventory/company-details.service";
import { CompanyDetailsModel } from 'src/app/models/inventory/companyDetails.model';
import {PdfTemplateConfiguratorModel} from "../../models/pdf-template-configurator/pdf-template-configurator.model";
import {PdfItemModel} from "../../models/pdf-template-configurator/pdf-item.model";
import {PdfCustomTextsModel} from "../../models/pdf-template-configurator/pdf-custom-texts.model";
import {PdfColumnGroupModel} from "../../models/pdf-template-configurator/pdf-column-group.model";
import {ConfirmationService, MessageService} from "primeng/api";
import {
  PdfTemplateConfiguratorService
} from "../../services/pdf-template-configurator/pdf-template-configurator.service";
import {ToastModule} from "primeng/toast";
import {ConfirmDialogModule} from "primeng/confirmdialog";

interface CompanyDetailsField {
  key: string;
  label: string;
  isAddress?: boolean;
  subfields?: { key: string; label: string }[];
}


type Section = 'header' | 'footer';


@Component({
  selector: 'app-pdf-template-configurator',
  templateUrl: './pdf-template-configurator.component.html',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, ToastModule, ConfirmDialogModule],
  providers: [ConfirmationService, MessageService, {provide: LOCALE_ID, useValue: 'ar-SA'}]
})
export class PdfTemplateConfiguratorComponent implements OnInit {
  @Input() availableFields: CompanyDetailsField[] = [
    { key: 'arabicName', label: 'الاسم' },
    { key: 'englishName', label: 'Name' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'address', label: 'Address', isAddress: true, subfields: [
        { key: 'street', label: 'Street' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
        { key: 'zipCode', label: 'Zip Code' }
      ]
    },
    { key: 'arabicAddress', label: 'العنوان', isAddress: true, subfields: [
        { key: 'street', label: 'الشارع' },
        { key: 'city', label: 'المدينة' },
        { key: 'country', label: 'الدولة' },
        { key: 'zipCode', label: 'الرمز البريدي' }
      ]
    },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'bankName', label: 'اسم البنك' },
    { key: 'bankAccountNumber', label: 'رقم الحساب البنكي' },
    { key: 'accountName', label: 'اسم الحساب' },
    { key: 'bankBranchName', label: 'اسم فرع البنك' },
    { key: 'swiftCode', label: 'رمز السويفت (SWIFT)' },
    { key: 'iban', label: 'رقم الآيبان (IBAN)' },
    { key: 'taxNumber', label: 'الرقم الضريبي' },
    { key: 'businessCategory', label: 'نوع النشاط التجاري' },
    { key: 'logo', label: 'الشعار' },
    { key: 'website', label: 'الموقع الإلكتروني' },
    { key: 'unifiedNumber', label: 'الرقم الموحد' },
    { key: 'registrationNumber', label: 'رقم السجل' },
    { key: 'policyParagraph', label: 'السياسة' }
  ]

  templateSignal = signal<PdfTemplateConfiguratorModel>(null);
  get template() {
    return this.templateSignal();
  }
  set template(value) {
    this.templateSignal.set(value);
  }

  // Signals for array-based columns
  headerFieldsSignal = signal<PdfColumnGroupModel[]>([
    new PdfColumnGroupModel({ rows: [
        {
          items:[]
        }
      ] }),
  ]);
  get headerFields() {
    return this.headerFieldsSignal();
  }
  set headerFields(value) {
    this.headerFieldsSignal.set(value);
  }
  footerFieldsSignal = signal<PdfColumnGroupModel[]>([
    new PdfColumnGroupModel({ rows: [
        {
          items:[]
        }
      ] }),
  ]);
  get footerFields() {
    return this.footerFieldsSignal();
  }
  set footerFields(value) {
    this.footerFieldsSignal.set(value);
  }

  headerCustomTextsSignal = signal<PdfCustomTextsModel[]>([]);
  get headerCustomTexts() {
    return this.headerCustomTextsSignal();
  }
  set headerCustomTexts(value) {
    this.headerCustomTextsSignal.set(value);
  }
  footerCustomTextsSignal = signal<PdfCustomTextsModel[]>([]);
  get footerCustomTexts() {
    return this.footerCustomTextsSignal();
  }
  set footerCustomTexts(value) {
    this.footerCustomTextsSignal.set(value);
  }

  headerAddressSubfieldsSignal = signal<string[]>([]);
  get headerAddressSubfields() {
    return this.headerAddressSubfieldsSignal();
  }
  set headerAddressSubfields(value) {
    this.headerAddressSubfieldsSignal.set(value);
  }
  footerAddressSubfieldsSignal = signal<string[]>([]);
  get footerAddressSubfields() {
    return this.footerAddressSubfieldsSignal();
  }
  set footerAddressSubfields(value) {
    this.footerAddressSubfieldsSignal.set(value);
  }
  headerNewCustomText: Record<string, string> = {};
  footerNewCustomText: Record<string, string> = {};

  @Output() configChanged = new EventEmitter<any>();

  constructor(
    private companyDetailsService: CompanyDetailsService,
    private pdfTemplateConfiguratorService: PdfTemplateConfiguratorService,
    private messageService: MessageService
    ) { }

  companyDetailsSignal = signal<CompanyDetailsModel>(null);
  get companyDetails() {
    return this.companyDetailsSignal();
  }
  set companyDetails(value) {
    this.companyDetailsSignal.set(value);
  }

  ngOnInit(): void {
    this.loadCompanyDetails();
    this.loadTemplate();
  }
  loadTemplate() {
    this.pdfTemplateConfiguratorService.getAll().subscribe({
      next: res => {
        const template =res[0];
        if (template == null) return;
        this.template = template;
        this.headerFields = template.header.columns;
        this.footerFields = template.footer.columns;
        this.headerCustomTexts = template.header.customTexts;
        this.footerCustomTexts = template.footer.customTexts;
        this.headerAddressSubfields = template.header.addressSubfields;
        this.footerAddressSubfields = template.footer.addressSubfields;
      },
      error: error => {
        console.log('Error Loading Template', error);
      }
    });
  }

  loadCompanyDetails() {
    this.companyDetailsService.getAll().subscribe({
      next: companyDetails => {
        this.companyDetails = companyDetails[0]
      },
      error: error => {
        console.log('Error Loading Company details', error);
      }
    });
  }

  // --- COLUMN MANAGEMENT ---
  addHeaderColumn() {
    this.headerFields.push(new PdfColumnGroupModel({ rows: [
        {
          items:[]
        }
      ] }));
    this.emitConfig();
  }
  addFooterColumn() {
    this.footerFields.push(new PdfColumnGroupModel({ rows: [
        {
          items:[]
        }
      ] }));
    this.emitConfig();
  }
  removeHeaderColumn(idx: number) {
    if (this.headerFields.length > 1) {
      this.headerFields.splice(idx, 1);
      this.emitConfig();
      return true;
    }
    return false;
  }
  removeFooterColumn(idx: number) {
    if (this.footerFields.length > 1) {
      this.footerFields.splice(idx, 1);
      this.emitConfig();
      return true;
    }
    return false;
  }

  // Methods to work with dynamic columns
  addHeaderRow(columnIdx: number) {
    this.headerFields[columnIdx].rows.push({ items: [] });
    this.emitConfig();
  }
  addFooterRow(columnIdx: number) {
    this.footerFields[columnIdx].rows.push({ items: [] });
    this.emitConfig();
  }
  removeHeaderRow(columnIdx: number, rowIndex: number) {
    if (this.headerFields[columnIdx].rows.length > 1) {
      this.headerFields[columnIdx].rows.splice(rowIndex, 1);
      this.emitConfig();
      return true;
    }
    return false;
  }
  removeFooterRow(columnIdx: number, rowIndex: number) {
    if (this.footerFields[columnIdx].rows.length > 1) {
      this.footerFields[columnIdx].rows.splice(rowIndex, 1);
      this.emitConfig();
      return true;
    }
    return false;
  }

  // --- ADD FIELD TO ROW ---
  addField(section: Section, columnIdx: number, rowIdx: number, key: string) {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    const fieldDef = this.getFieldByKey(key);
    if (!fieldDef) return;
    const fontSize = key === 'logo' ? '120px' : 'inherit';
    const item = new PdfItemModel({
      id: key,
      type: 'field',
      fontSize: fontSize,
      align: 'center',
      label: key === 'logo'? '' : fieldDef.label,
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrikethrough: false
    });
    fields[columnIdx].rows[rowIdx].items.push(item);
    this.emitConfig();
  }

  // --- REMOVE FIELD FROM ROW ---
  removeField(section: Section, key: string) {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    fields.forEach(col => {
      col.rows.forEach(row => {
        row.items = row.items.filter(item => !(item.id === key && item.type === 'field'));
      });
    });
    if (section === 'header' && key === 'address') this.headerAddressSubfields = [];
    if (section === 'footer' && key === 'address') this.footerAddressSubfields = [];
    if (section === 'header' && key === 'arabicAddress') this.headerAddressSubfields = [];
    if (section === 'footer' && key === 'arabicAddress') this.footerAddressSubfields = [];
    this.emitConfig();
  }

  // --- REMOVE CUSTOM TEXT ---
  removeCustomText(section: Section, id: string) {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    fields.forEach(col => {
      col.rows.forEach(row => {
        row.items = row.items.filter(item => !(item.id === id && item.type === 'custom'));
      });
    });
    const arr = section === 'header' ? this.headerCustomTexts : this.footerCustomTexts;
    const idx = arr.findIndex(t => t.id === id);
    if (idx !== -1) arr.splice(idx, 1);
    this.emitConfig();
  }

  // --- REMOVE CUSTOM TEXT INSTANCE ---
  removeCustomTextInstance(section: Section, colIdx: number, rowIdx: number, itemIdx: number) {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    const item = fields[colIdx].rows[rowIdx].items[itemIdx];
    if (item && item.type === 'custom') {
      fields[colIdx].rows[rowIdx].items.splice(itemIdx, 1);
      let isLastInstance = true;
      fields.forEach(col => {
        col.rows.forEach(row => {
          if (row.items.some(i => i.id === item.id && i.type === 'custom')) {
            isLastInstance = false;
          }
        });
      });
      if (isLastInstance) {
        const arr = section === 'header' ? this.headerCustomTexts : this.footerCustomTexts;
        const idx = arr.findIndex(t => t.id === item.id);
        if (idx !== -1) arr.splice(idx, 1);
      }
      this.emitConfig();
    }
  }

  // --- DRAG & DROP ---
  drop(event: CdkDragDrop<PdfItemModel[]>, section: Section, colIdx: number, rowIdx: number) {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    const items = fields[colIdx].rows[rowIdx].items;
    if (event.previousContainer === event.container) {
      moveItemInArray(items, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.emitConfig();
  }

  toggleAddressSubfield(section: Section, subkey: string, event: any) {
    const checked = event.target.checked;
    const arr = section === 'header' ? this.headerAddressSubfields : this.footerAddressSubfields;
    if (checked) {
      if (!arr.includes(subkey)) arr.push(subkey);
    } else {
      const idx = arr.indexOf(subkey);
      if (idx !== -1) arr.splice(idx, 1);
    }
    this.emitConfig();
  }

  /**
   * Remove a field/item from a specific column and row (header or footer)
   */
  removeFieldInstance(section: 'header' | 'footer', colIdx: number, rowIdx: number, itemIdx: number): void {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    if (fields[colIdx] && fields[colIdx].rows[rowIdx]) {
      fields[colIdx].rows[rowIdx].items.splice(itemIdx, 1);
    }
  }

  // --- EMIT CONFIG ---
  emitConfig() {
    const headerColumns = this.headerFields.map(col => ({
      rows: col.rows.map(row => ({
        items: row.items.map(x => ({ ...x }))
      }))
    }));
    const footerColumns = this.footerFields.map(col => ({
      rows: col.rows.map(row => ({
        items: row.items.map(x => ({ ...x }))
      }))
    }));
    this.configChanged.emit({
      header: {
        columns: headerColumns,
        customTexts: this.headerCustomTexts.map(x => ({...x})),
        addressSubfields: [...this.headerAddressSubfields]
      },
      footer: {
        columns: footerColumns,
        customTexts: this.footerCustomTexts.map(x => ({...x})),
        addressSubfields: [...this.footerAddressSubfields]
      }
    });
  }

  // --- SAVE TEMPLATE ---
  saveTemplate() {
    const columnsGroupHeader = this.headerFields.map(col => ({
      rows: col.rows.map(row => ({
        items: row.items.map(x => ({ ...x }))
      }))
    }));
    const customTextsHeader = this.headerCustomTexts;
    const addressSubfieldsHeader = this.headerAddressSubfields;
    const columnsGroupFooter = this.footerFields.map(col => ({
      rows: col.rows.map(row => ({
        items: row.items.map(x => ({ ...x }))
      }))
    }));
    const customTextsFooter = this.footerCustomTexts;
    const addressSubfieldsFooter = this.footerAddressSubfields;
    const template = new PdfTemplateConfiguratorModel({
      id: this.template?.id,
      header: {
        columns: columnsGroupHeader,
        customTexts: customTextsHeader,
        addressSubfields: addressSubfieldsHeader
      },
      footer: {
        columns: columnsGroupFooter,
        customTexts: customTextsFooter,
        addressSubfields: addressSubfieldsFooter
      }
    });
    console.log(template);
    if (this.template?.id != null) {
      this.pdfTemplateConfiguratorService.update(template).subscribe({
        next: res => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Template has been updated successfully.'
          });
          this.loadTemplate();
        },
        error: error => {
          console.log('Error Saving Template', error);
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update template.'});
        }
      });
    }else{
      this.pdfTemplateConfiguratorService.create(template).subscribe({
        next: res => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Template has been created successfully.'
          });
          this.loadTemplate();
        },
        error: error => {
          console.log('Error Saving Template', error);
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to create template.'});
        }
      });
    }
  }

  // --- IS FIELD IN SECTION ---
  isFieldInSection(section: 'header' | 'footer', key: string): boolean {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    return fields.some(col =>
      col.rows.some(row =>
        row.items.some(item => item.id === key && item.type === 'field')
      )
    );
  }

  public getCustomText(section: 'header' | 'footer', id: string): PdfCustomTextsModel | undefined {
    return section === 'header'
      ? this.headerCustomTexts.find(t => t.id === id)
      : this.footerCustomTexts.find(t => t.id === id);
  }

  public getFieldValue(key: string, subkey?: string): string {
    if (key === 'address' && subkey) {
      return this.companyDetails?.address?.[subkey] || '';
    }
    if (key === 'arabicAddress' && subkey) {
      return this.companyDetails?.arabicAddress?.[subkey] || '';
    }
    return this.companyDetails?.[key] || '';
  }

  getFieldByKey(key: string): CompanyDetailsField | undefined {
    return this.availableFields.find(f => f.key === key);
  }

  /**
   * Returns the label for an address subfield key (e.g., 'street', 'city', etc.)
   */
  public getAddressSubfieldLabel(subkey: string): string {
    const addressField = this.availableFields.find(f => f.key === 'address');
    if (addressField && addressField.subfields) {
      const sub = addressField.subfields.find(s => s.key === subkey);
      return sub ? sub.label : subkey;
    }
    return subkey;
  }
  public getArabicAddressSubfieldLabel(subkey: string): string {
    const addressField = this.availableFields.find(f => f.key === 'arabicAddress');
    if (addressField && addressField.subfields) {
      const sub = addressField.subfields.find(s => s.key === subkey);
      return sub ? sub.label : subkey;
    }
    return subkey;
  }

  /**
   * Update the value of a custom text by id for header or footer
   */
  public editCustomText(section: 'header' | 'footer', id: string, value: string): void {
    const arr = section === 'header' ? this.headerCustomTexts : this.footerCustomTexts;
    const customText = arr.find(t => t.id === id);
    if (customText) {
      customText.value = value;
      this.emitConfig();
    }
  }

  /**
   * Add a new custom text item to the specified section, column, and row
   */
  public addCustomText(section: 'header' | 'footer', colIdx: number, rowIdx: number): void {
    const fields = section === 'header' ? this.headerFields : this.footerFields;
    const customTexts = section === 'header' ? this.headerCustomTexts : this.footerCustomTexts;
    const newCustomTextInput = section === 'header' ? this.headerNewCustomText : this.footerNewCustomText;
    const key = colIdx + '-' + rowIdx;
    const label = newCustomTextInput[key]?.trim();
    // Generate a unique id for the custom text
    const id = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    // Add to customTexts array
    customTexts.push({ id, value: ''});
    // Add to row items
    fields[colIdx].rows[rowIdx].items.push({ id, type: 'custom', label, fontSize: 'inherit', align: 'left',isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false });
    // Clear the input
    newCustomTextInput[key] = '';
    this.emitConfig();
  }
}
