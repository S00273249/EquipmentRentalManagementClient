import { AbstractControl, ValidationErrors } from '@angular/forms';

// Rejects a string containing only whitespace characters
export function notBlank(control: AbstractControl): ValidationErrors | null {

    const value = control.value;

    if (typeof value === 'string' && value.length > 0 && value.trim().length === 0) {
        return { blank: true };
    }

    return null;
}
