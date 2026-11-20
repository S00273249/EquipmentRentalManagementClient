import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { Equipment } from '../../models/equipment';
import { EquipmentFilters, EquipmentService } from '../../services/equipment';

@Component({
    selector: 'app-equipment-list',
    imports: [
        AsyncPipe,
        RouterLink,
        FormsModule,
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

    // Store all equipment retrieved from the API
    // This allows the search to filter existing results without making additional API requests
    allEquipment: Equipment[] = [];

    // Store the text entered into the equipment search field
    searchTerm = '';

    // Store the selected equipment filters
    // Lowest daily rate is selected by default
    filters: EquipmentFilters = {
        category: '',
        status: '',
        condition: '',
        sort: 'dailyRate',
        from: '',
        to: ''
    };

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

                return this.equipmentService.getEquipment(this.filters).pipe(
                    // Store the latest equipment returned by the API
                    // map allows the response to be saved while passing the data through the Observable
                    map(equipment => {
                        this.allEquipment = equipment;
                        return equipment;
                    }),

                    // Handle API errors and return an empty array so the list can still display its empty state
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving equipment:', error);
                        this.errorMessage = typeof error.error?.message === 'string'
                            ? error.error.message
                            : 'Unable to load equipment. Please try again later.';
                        this.allEquipment = [];
                        return of([]);
                    })
                );
            })
        );
    }

    // Filter equipment using the text entered into the search field
    // The search checks both equipment names and descriptions
    // The search is case-insensitive so uppercase and lowercase letters produce the same results
    get filteredEquipment(): Equipment[] {
        const search = this.searchTerm.toLowerCase().trim();

        // Return the complete equipment list when the search field is empty
        if (!search) {
            return this.allEquipment;
        }

        // Return equipment where either the name or description contains the search text
        return this.allEquipment.filter(item =>
            item.name.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search)
        );
    }

    // Apply the selected filters and retrieve matching equipment
    applyFilters(): void {
        this.errorMessage = '';
        this.refreshEquipment$.next();
    }

    // Clear the search and filters, restoring the default lowest-rate sorting
    clearFilters(): void {
        this.searchTerm = '';

        this.filters = {
            category: '',
            status: '',
            condition: '',
            sort: 'dailyRate',
            from: '',
            to: ''
        };

        this.applyFilters();
    }

    // Clear only the search field and restore all equipment matching the selected filters
    clearSearch(): void {
        this.searchTerm = '';
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
