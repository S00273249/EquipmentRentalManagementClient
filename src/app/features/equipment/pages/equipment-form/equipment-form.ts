import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EquipmentCategory, EquipmentStatus, EquipmentCondition, CreateEquipmentDto } from '../../models/equipment.model';
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
export class EquipmentForm {

    // Inject FormBuilder to create and manage the reactive form
    private formBuilder = inject(FormBuilder);

    // Inject EquipmentService to send new equipment to the backend
    private equipmentService = inject(EquipmentService);

    // Inject Router to navigate after successful creation
    private router = inject(Router);

    // Inject MatSnackBar to display success messages
    private snackBar = inject(MatSnackBar);

    // Track whether the equipment is currently being saved
    saving = signal(false);

    // Store an error message if the API request fails
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

    // Handle form submission
    onSubmit(): void {

        // Prevent submission if the form is invalid or already being saved
        if (this.equipmentForm.invalid || this.saving()) {
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

        // Send the new equipment to the backend
        this.equipmentService.addEquipment(equipmentData).subscribe({
            next: (response) => {
                // Display a confirmation message after successful creation
                this.snackBar.open(`${equipmentData.name} saved successfully`, 'Close', {
                    duration: 10000
                });

                console.log('Equipment created successfully:', response);
                this.router.navigate(['/equipment']);
            },
            error: (error: Error) => {
                console.error('Error creating equipment:', error);
                this.saveError.set(error.message);
                this.saving.set(false);

                // Re-enable the form so the user can correct the information
                this.equipmentForm.enable();
            }
        });
    }

}
