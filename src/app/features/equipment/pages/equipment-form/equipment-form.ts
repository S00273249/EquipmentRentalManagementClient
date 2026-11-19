import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EquipmentCategory, EquipmentStatus, EquipmentCondition, CreateEquipmentDto } from '../../models/equipment';
import { EquipmentService } from '../../services/equipment';
import { notBlank } from '../../../../shared/validators/not-blank.validator';

@Component({
    selector: 'app-equipment-form',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressBarModule
    ],
    templateUrl: './equipment-form.html',
    styleUrl: './equipment-form.scss'
})
export class EquipmentForm implements OnInit {

    // Inject services and utilities required by the component
    private formBuilder = inject(FormBuilder);
    private equipmentService = inject(EquipmentService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    // Store the equipment ID when editing an existing record
    equipmentId: string | null = null;

    // Track loading and saving states using signals
    // Signals notify Angular when their values change so the view can update
    loading = signal(false);
    saving = signal(false);
    saveError = signal<string | null>(null);

    // Create the equipment form and define its validation rules
    equipmentForm = this.formBuilder.nonNullable.group({
        name: ['', [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(100),
            notBlank
        ]],
        description: ['', [
            Validators.required,
            Validators.maxLength(500),
            notBlank
        ]],

        // Daily rate starts as null because the user must enter a value
        dailyRate: this.formBuilder.control<number | null>(null, [
            Validators.required,
            Validators.min(0.01)
        ]),

        // Dropdowns have default values, so they should never be null
        category: this.formBuilder.nonNullable.control<EquipmentCategory>('Camera'),
        status: this.formBuilder.nonNullable.control<EquipmentStatus>('Available'),
        condition: this.formBuilder.nonNullable.control<EquipmentCondition>('Good')
    });

    // Check whether the page is being used to edit existing equipment
    ngOnInit(): void {
        this.equipmentId = this.route.snapshot.paramMap.get('id');

        // If there is no ID, the form is being used to create new equipment
        if (!this.equipmentId) {
            return;
        }

        // Retrieve the existing equipment from the backend
        this.loading.set(true);

        this.equipmentService.getEquipmentById(this.equipmentId).subscribe({
            next: (equipment) => {
                // Populate the form with the existing equipment details
                this.equipmentForm.patchValue({
                    name: equipment.name,
                    description: equipment.description,
                    dailyRate: equipment.dailyRate,
                    category: equipment.category,
                    status: equipment.status,
                    condition: equipment.condition
                });

                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error retrieving equipment:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to retrieve this equipment. Please try again.'
                );
                this.loading.set(false);
            }
        });
    }

    // Validate and submit the equipment form
    onSubmit(): void {

        // Prevent submission while the form is loading or being saved
        if (this.saving() || this.loading()) {
            return;
        }

        // Display validation messages if the form is invalid
        if (this.equipmentForm.invalid) {
            this.equipmentForm.markAllAsTouched();
            return;
        }

        const { name, description, dailyRate, category, status, condition } = this.equipmentForm.getRawValue();

        // Ensure the daily rate has a value before creating the equipment DTO
        if (dailyRate === null) {
            return;
        }

        const equipmentData: CreateEquipmentDto = {
            name,
            description,
            dailyRate,
            category,
            status,
            condition
        };

        // Start saving and clear any previous error
        this.saving.set(true);
        this.saveError.set(null);

        // Disable the form while the equipment is being saved
        this.equipmentForm.disable();

        // Choose the appropriate API operation
        const request = this.equipmentId
            ? this.equipmentService.updateEquipment(this.equipmentId, equipmentData)
            : this.equipmentService.addEquipment(equipmentData);

        request.subscribe({
            next: (response) => {

                // Display a confirmation message after successful saving
                const action = this.equipmentId ? 'updated' : 'saved';

                this.snackBar.open(`${equipmentData.name} ${action} successfully`, 'Close', {
                    duration: 10000
                });

                console.log('Equipment saved successfully:', response);
                this.router.navigate(['/equipment']);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error saving equipment:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to save this equipment. Please try again.'
                );
                this.saving.set(false);

                // Re-enable the form so the user can correct the information
                this.equipmentForm.enable();
            }
        });
    }
}