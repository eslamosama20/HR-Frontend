import {ValidatorFn} from '@angular/forms';

type ValidationKey = 'required' | 'minlength' | 'maxlength' | 'pattern' | 'email' | string;

export interface FormFieldConfig {
  field: string;             // Key corresponding to the data model property
  label: string;           // Label for the form field
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox'; // Field type
  options?: { label: string, value: any }[] | (() => { label: string, value: any }[]); // Options for select and checkbox fields
  placeholder?: string;    // Placeholder text for the input
  required?: boolean;      // Whether the field is required
  disabled?: boolean;      // Whether the field is disabled
  hidden?: boolean;        // Whether the field is hidden
  validations?: Array<{ field: ValidationKey, validator: ValidatorFn, message: string }>;
  accessorFunction?: (key: any) => any; // Function to access the data model property
  additionOnly?: boolean;
}

export interface FormConfig {
  title: string;           // Title of the form
  fields: FormFieldConfig[]; // Array of form field configurations
  submitLabel?: string;    // Label for the submit button
  cancelLabel?: string;   // Label for the cancel button
  onSubmit: (formData: any) => void;
  isValidForm?: () => boolean;
  gridCols?: number;       // Optional number of grid columns for layout
}
