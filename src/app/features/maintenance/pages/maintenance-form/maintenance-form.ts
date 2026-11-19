import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CreateMaintenanceDto } from '../../models/maintenance';
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
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSnackBarModule,
        MatProgressBarModule
    ],
    templateUrl: './maintenance-form.html',
    styleUrl: './maintenance-form.scss'
})
export class MaintenanceForm implements OnInit {

    // Inject services and utilities required by the component
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private maintenanceService = inject(MaintenanceService);
    private equipmentService = inject(EquipmentService);
    private snackBar = inject(MatSnackBar);

    // Store the maintenance record ID when editing an existing record
    maintenanceId: string | null = null;

    // Store equipment retrieved from the backend
    equipment: Equipment[] = [];

    // Track loading, saving and error states using signals
    loading = signal(false);
    saving = signal(false);
    saveError = signal<string | null>(null);

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
    maintenanceForm = this.fb.nonNullable.group({
        equipmentId: ['', Validators.required],
        maintenanceType: ['', [Validators.required, notBlank]],
        description: ['', [Validators.required, Validators.minLength(2), notBlank]],
        startDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        endDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        cost: [0, [Validators.required, Validators.min(0)]],
        notes: ['', [Validators.required, notBlank]]
    }, {
        // Validate the relationship between the start and end dates
        // A form-group validator can compare values from multiple form controls
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
        this.loading.set(true);
        this.saveError.set(null);

        this.equipmentService.getEquipment().subscribe({
            next: equipment => {
                this.equipment = equipment;

                // If a maintenance record ID exists, retrieve the record being edited
                if (this.maintenanceId) {
                    this.loadMaintenanceRecord();
                } else {
                    // Finish loading when creating a new maintenance record
                    this.loading.set(false);
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading equipment:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to load equipment.'
                );
                this.loading.set(false);
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

                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading maintenance record:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to load this maintenance record.'
                );
                this.loading.set(false);
            }
        });
    }

    // Validate and submit the maintenance form
    onSubmit(): void {
        // Prevent submission while the form is loading or being saved
        if (this.loading() || this.saving()) {
            return;
        }

        // Display validation messages if the form is invalid
        if (this.maintenanceForm.invalid) {
            this.maintenanceForm.markAllAsTouched();
            return;
        }

        // Retrieve the form values
        const formValue = this.maintenanceForm.getRawValue();

        // Clear previous errors and indicate that the maintenance record is being saved
        this.saveError.set(null);
        this.saving.set(true);

        // Create the DTO containing the information required by the API
        const maintenanceData: CreateMaintenanceDto = {
            equipmentId: formValue.equipmentId,
            maintenanceType: formValue.maintenanceType,
            description: formValue.description,
            startDate: formValue.startDate,
            endDate: formValue.endDate,
            cost: formValue.cost,
            notes: formValue.notes
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
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to save maintenance record. Please try again.'
                );

                this.saving.set(false);
            }
        });
    }
}