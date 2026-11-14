import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
export class EquipmentForm implements OnInit {

    // Inject FormBuilder to create and manage the reactive form
    private formBuilder = inject(FormBuilder);

    // Inject EquipmentService to communicate with the backend
    private equipmentService = inject(EquipmentService);

    // Inject ActivatedRoute to retrieve the equipment ID from the URL
    private route = inject(ActivatedRoute);

    // Inject Router to navigate after saving
    private router = inject(Router);

    // Inject MatSnackBar to display success messages
    private snackBar = inject(MatSnackBar);

    // Store the equipment ID when editing an existing record
    equipmentId: string | null = null;

    // Track whether the equipment is currently being loaded
    loading = signal(false);

    // Track whether the equipment is currently being saved
    saving = signal(false);

    // Store an error message if loading or saving fails
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
            error: (error: Error) => {
                console.error('Error retrieving equipment:', error);
                this.saveError.set('Unable to retrieve this equipment. Please try again.');
                this.loading.set(false);
            }
        });
    }

    // Handle form submission
    onSubmit(): void {

        // Prevent submission if the form is invalid or already being saved
        if (this.equipmentForm.invalid || this.saving() || this.loading()) {
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
            error: (error: Error) => {
                console.error('Error saving equipment:', error);
                this.saveError.set(error.message);
                this.saving.set(false);

                // Re-enable the form so the user can correct the information
                this.equipmentForm.enable();
            }
        });
    }

}
