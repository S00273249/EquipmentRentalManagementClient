import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { Equipment } from '../../models/equipment';
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

    // Inject services and utilities required by the component
    private equipmentService = inject(EquipmentService);
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger a refresh of the equipment list
    // Calling next() on this Subject causes the equipment Observable to retrieve the latest data
    private refreshEquipment$ = new Subject<void>();

    // Observable containing the equipment returned by the API
    equipment$!: Observable<Equipment[]>;

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve equipment when the component is initialised
    ngOnInit(): void {
        this.equipment$ = this.refreshEquipment$.pipe(
            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval
            startWith(undefined),

            // Retrieve equipment whenever the refresh Subject emits
            // switchMap switches to the latest API request if another refresh is triggered
            switchMap(() => {
                this.errorMessage = '';

                return this.equipmentService.getEquipment().pipe(
                    // Handle API errors and return an empty array so the list can still display its empty state
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving equipment:', error);
                        this.errorMessage = typeof error.error?.message === 'string'
                            ? error.error.message
                            : 'Unable to load equipment. Please try again later.';
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
            error: (error: HttpErrorResponse) => {
                console.error('Error deleting equipment:', error);
                this.errorMessage = typeof error.error?.message === 'string'
                    ? error.error.message
                    : 'Unable to delete equipment. Please try again.';
            }
        });
    }
}
