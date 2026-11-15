import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Custom form-group validator that compares two date controls to ensure the end date is after the start date
export const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {

    // Retrieve the start and end dates from the form group
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;

    // Allow the required validators to handle missing dates
    if (!startDate || !endDate) {
        return null;
    }

    // Return a validation error if the end date is not after the start date
    return startDate >= endDate
        ? { invalidDateRange: true }
        : null;
};
