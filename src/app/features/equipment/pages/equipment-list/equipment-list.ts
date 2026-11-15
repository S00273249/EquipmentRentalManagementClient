import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, of, startWith, switchMap } from 'rxjs';
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

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger an equipment list refresh
    private refreshEquipment$ = new Subject<void>();

    // Observable containing the equipment returned by the API
    equipment$!: Observable<Equipment[]>;

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve equipment when the component is initialised
    ngOnInit(): void {
        this.equipment$ = this.refreshEquipment$.pipe(
            // Automatically retrieve equipment when the component loads
            startWith(undefined),

            // Retrieve equipment whenever the refresh Subject emits
            switchMap(() => {
                this.errorMessage = '';

                return this.equipmentService.getEquipment().pipe(
                    catchError(error => {
                        console.error('Error retrieving equipment:', error);
                        this.errorMessage = 'Unable to load equipment. Please try again later.';
                        return of([]);
                    })
                );
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

                // Trigger a refresh of the equipment inventory
                this.refreshEquipment$.next();
            },
            error: (error: Error) => {
                console.error('Error deleting equipment:', error);
                this.errorMessage = 'Unable to delete equipment. Please try again.';
            }
        });
    }

}
