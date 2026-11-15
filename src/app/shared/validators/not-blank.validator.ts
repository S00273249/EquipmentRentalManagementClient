import { AbstractControl, ValidationErrors } from '@angular/forms';

// Custom validator that rejects strings containing only whitespace characters
export function notBlank(control: AbstractControl): ValidationErrors | null {

    const value = control.value;

    // Use trim() to remove leading and trailing whitespace before checking whether the string is empty
    if (typeof value === 'string' && value.length > 0 && value.trim().length === 0) {
        return { blank: true };
    }

    // Return null when the value passes validation
    return null;
}
