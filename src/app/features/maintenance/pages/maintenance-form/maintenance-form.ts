import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Maintenance, CreateMaintenanceDto } from '../../models/maintenance';
import { MaintenanceService } from '../../services/maintenance';
import { EquipmentService } from '../../../equipment/services/equipment';
import { Equipment } from '../../../equipment/models/equipment';
import { notBlank } from '../../../../shared/validators/not-blank.validator';
import { dateRangeValidator } from '../../../../shared/validators/date-range.validator';
import { dateBoundsValidator } from '../../../../shared/validators/date-bounds.validator';

@Component({
    selector: 'app-maintenance-form',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './maintenance-form.html',
    styleUrl: './maintenance-form.scss'
})
export class MaintenanceForm implements OnInit {

    // Inject FormBuilder to create and manage the reactive form
    private fb = inject(FormBuilder);

    // Inject ActivatedRoute to retrieve the maintenance record ID from the URL
    private route = inject(ActivatedRoute);

    // Inject Router to navigate after saving
    private router = inject(Router);

    // Inject MaintenanceService to communicate with the backend
    private maintenanceService = inject(MaintenanceService);

    // Inject EquipmentService to retrieve equipment for the dropdown
    private equipmentService = inject(EquipmentService);

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Inject ChangeDetectorRef to manually trigger change detection when asynchronous operations update component properties
    private cdr = inject(ChangeDetectorRef);

    // Store the maintenance record ID when editing an existing record
    maintenanceId: string | null = null;

    // Store equipment retrieved from the backend
    equipment: Equipment[] = [];

    // Track whether the form data is currently being loaded or saved
    isLoading = false;

    // Store an error message if loading or saving fails
    errorMessage = '';

    // Define the maintenance types available in the dropdown
    maintenanceTypes: string[] = [
        'Inspection',
        'Repair',
        'Servicing',
        'Cleaning',
        'Replacement',
        'Other'
    ];

    // Calculate the permitted date range as 10 years in the past and 5 years in the future
    minDate = this.formatDate(this.getDateOffset(-10));
    maxDate = this.formatDate(this.getDateOffset(5));

    // Calculate a date a specified number of years before or after today
    private getDateOffset(years: number): Date {
        const date = new Date();
        date.setFullYear(date.getFullYear() + years);
        return date;
    }

    // Format a date as YYYY-MM-DD for use with HTML date inputs
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    // Create the maintenance form and define its validation rules
    maintenanceForm = this.fb.group({
        equipmentId: ['', Validators.required],
        maintenanceType: ['', [Validators.required, notBlank]],
        description: ['', [Validators.required, Validators.minLength(2), notBlank]],
        startDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        endDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        cost: [0, [Validators.required, Validators.min(0)]],
        notes: ['', [Validators.required, notBlank]]
    }, {

        // Apply a custom form-group validator to compare the start and end dates.
        // This allows validation to depend on the values of two separate form controls.
        validators: [dateRangeValidator]
    });

    // Check whether the form is being used to create or edit a maintenance record
    ngOnInit(): void {
        this.maintenanceId = this.route.snapshot.paramMap.get('id');

        // Retrieve the equipment needed to populate the form
        this.loadFormData();
    }

    // Retrieve equipment from the backend
    loadFormData(): void {
        this.isLoading = true;

        this.equipmentService.getEquipment().subscribe({
            next: equipment => {
                this.equipment = equipment;

                // If a maintenance record ID exists, retrieve the record being edited
                if (this.maintenanceId) {
                    this.loadMaintenanceRecord();
                } else {

                    // Finish loading when creating a new maintenance record
                    this.isLoading = false;

                    // Mark the component for change detection so Angular updates the view with the latest values
                    this.cdr.markForCheck();
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading equipment:', error);
                this.errorMessage = 'Unable to load equipment.';
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // Retrieve an existing maintenance record and populate the form when editing
    loadMaintenanceRecord(): void {
        if (!this.maintenanceId) {
            return;
        }

        this.maintenanceService.getMaintenanceRecordById(this.maintenanceId).subscribe({
            next: record => {

                // Populate the form with the existing maintenance record details
                this.maintenanceForm.patchValue({
                    equipmentId: record.equipmentId,
                    maintenanceType: record.maintenanceType,
                    description: record.description,
                    startDate: record.startDate.substring(0, 10),
                    endDate: record.endDate.substring(0, 10),
                    cost: record.cost,
                    notes: record.notes
                });

                this.isLoading = false;

                // Mark the component for change detection so Angular updates the view with the latest values
                this.cdr.markForCheck();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading maintenance record:', error);
                this.errorMessage = 'Unable to load this maintenance record.';
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // Handle maintenance form submission
    onSubmit(): void {

        // Prevent submission if the form is invalid
        if (this.maintenanceForm.invalid) {
            this.maintenanceForm.markAllAsTouched();
            return;
        }

        // Retrieve the form values
        const formValue = this.maintenanceForm.getRawValue();

        // Clear previous errors and indicate that the maintenance record is being saved
        this.errorMessage = '';
        this.isLoading = true;

        // Create the DTO containing the information required by the API
        const maintenanceData: CreateMaintenanceDto = {
            equipmentId: formValue.equipmentId!,
            maintenanceType: formValue.maintenanceType!,
            description: formValue.description!,
            startDate: formValue.startDate!,
            endDate: formValue.endDate!,
            cost: formValue.cost!,
            notes: formValue.notes!
        };

        // Choose the appropriate API operation depending on whether a maintenance ID exists
        const request = this.maintenanceId
            ? this.maintenanceService.updateMaintenanceRecord(this.maintenanceId, maintenanceData)
            : this.maintenanceService.addMaintenanceRecord(maintenanceData);

        request.subscribe({
            next: () => {

                // Display a confirmation message after successfully saving the maintenance record
                const message = this.maintenanceId
                    ? 'Maintenance record updated successfully'
                    : 'Maintenance record created successfully';

                this.snackBar.open(message, 'Close', { duration: 5000 });

                // Navigate back to the maintenance list
                this.router.navigate(['/maintenance']);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error saving maintenance record:', error);

                // Display the error returned by the backend, or a fallback message
                this.errorMessage = error.error?.message ?? 'Unable to save maintenance record. Please try again.';

                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }
}
