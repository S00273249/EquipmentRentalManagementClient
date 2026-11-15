import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, of } from 'rxjs';
import { Equipment } from '../../models/equipment.model';
import { EquipmentService } from '../../services/equipment';

@Component({
    selector: 'app-equipment-list',
    imports: [
        AsyncPipe,
        RouterLink,
        MatButtonModule
    ],
    templateUrl: './equipment-list.html',
    styleUrl: './equipment-list.scss'
})
export class EquipmentList implements OnInit {

    // Inject the EquipmentService to communicate with the backend
    private equipmentService = inject(EquipmentService);

    // Inject ChangeDetectorRef to notify Angular when the component needs checking
    private changeDetector = inject(ChangeDetectorRef);

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Observable containing the equipment returned by the API
    equipment$!: Observable<Equipment[]>;

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve equipment when the component is initialised
    ngOnInit(): void {
        this.loadEquipment();
    }

    // Retrieve equipment from the backend
    loadEquipment(): void {
        this.errorMessage = '';

        this.equipment$ = this.equipmentService.getEquipment().pipe(
            catchError(error => {
                console.error('Error retrieving equipment:', error);
                this.errorMessage = 'Unable to load equipment. Please try again later.';
                return of([]);
            })
        );
    }

    // Delete an equipment item after user confirmation
    deleteEquipment(id: string, name: string): void {

        // Ask the user to confirm before deleting
        const confirmed = confirm(`Are you sure you want to delete "${name}"?`);

        if (!confirmed) {
            return;
        }

        // Clear previous error messages
        this.errorMessage = '';

        // Send the delete request to the backend
        this.equipmentService.deleteEquipment(id).subscribe({
            next: (response) => {
                console.log('Equipment deleted successfully:', response);

                // Display a success notification
                this.snackBar.open(`${name} deleted successfully`, 'Close', { duration: 10000 });

                // Refresh the equipment inventory
                this.loadEquipment();

                // Notify Angular that the component needs checking
                this.changeDetector.markForCheck();
            },
            error: (error: Error) => {
                console.error('Error deleting equipment:', error);
                this.errorMessage = 'Unable to delete equipment. Please try again.';
                this.changeDetector.markForCheck();
            }
        });
    }

}
