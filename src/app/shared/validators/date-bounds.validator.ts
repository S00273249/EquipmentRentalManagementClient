import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Create a validator that checks whether a date falls within the permitted minimum and maximum dates
export function dateBoundsValidator(minDate: string, maxDate: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        // Allow the required validator to handle missing dates
        if (!value) {
            return null;
        }

        // Return a validation error if the date falls outside the permitted boundaries
        if (value < minDate || value > maxDate) {
            return {
                dateOutOfBounds: {
                    minDate,
                    maxDate
                }
            };
        }

        return null;
    };
}
