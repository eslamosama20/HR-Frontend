import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  /**
   * Validator that checks if a field contains only whitespace characters
   * Returns error if the trimmed value is empty
   */
  static noWhitespaceOnly(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null || control.value === '') {
        return null; // Let required validator handle empty values
      }

      const trimmedValue = control.value.toString().trim();
      if (trimmedValue.length === 0) {
        return { whitespaceOnly: true };
      }

      return null;
    };
  }

  /**
   * Validator that combines required validation with whitespace checking
   * This ensures the field is not empty and doesn't contain only whitespace
   */
  static requiredNoWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null || control.value === '') {
        return { required: true };
      }

      const trimmedValue = control.value.toString().trim();
      if (trimmedValue.length === 0) {
        return { required: true };
      }

      return null;
    };
  }


  static minNonWhitespaceLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null || control.value === '') {
        return null; 
      }

      const trimmedValue = control.value.toString().trim();
      if (trimmedValue.length < minLength) {
        return { 
          minNonWhitespaceLength: { 
            requiredLength: minLength, 
            actualLength: trimmedValue.length 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Validator that checks if a role name already exists (case-insensitive, trimmed)
   * @param existingRoles Array of existing role names
   * @param currentRoleId Current role ID (for edit mode)
   */
  static uniqueRoleName(existingRoles: string[], currentRoleId?: string | number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null || control.value === '') {
        return null;
      }

      const trimmedValue = control.value.toString().trim().toLowerCase();
      if (trimmedValue.length === 0) {
        return null;
      }

      // Check if role name already exists (case-insensitive, trimmed)
      const isDuplicate = existingRoles.some(roleName => {
        const trimmedExisting = roleName.trim().toLowerCase();
        return trimmedExisting === trimmedValue;
      });

      if (isDuplicate) {
        return { duplicateRoleName: true };
      }

      return null;
    };
  }

  /**
   * Validator that rejects zero values
   * Returns error if the value is exactly 0
   * Used for numeric fields that must be greater than zero
   */
  static greaterThanZero(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null || control.value === '') {
        return null; // Let required validator handle empty values
      }

      const numValue = Number(control.value);
      
      // Check if it's a valid number and greater than zero
      if (!isNaN(numValue) && numValue <= 0) {
        return { zeroNotAllowed: true };
      }

      return null;
    };
  }

}
