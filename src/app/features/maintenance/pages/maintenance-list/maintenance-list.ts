import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MaintenanceService } from '../../services/maintenance';
import { Maintenance } from '../../models/maintenance';
import { EquipmentService } from '../../../equipment/services/equipment';

// Extend the Maintenance interface with the equipment name for display in the list
interface MaintenanceListItem extends Maintenance {
    equipmentName: string;
}

@Component({
    selector: 'app-maintenance-list',
    imports: [
        AsyncPipe,
        DatePipe,
        CurrencyPipe,
        RouterLink,
        FormsModule,
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './maintenance-list.html',
    styleUrl: './maintenance-list.scss'
})
export class MaintenanceList implements OnInit {

    // Inject services and utilities required by the component
    private maintenanceService = inject(MaintenanceService);
    private equipmentService = inject(EquipmentService);
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger a refresh of the maintenance list
    // Calling next() on this Subject causes the maintenance Observable to retrieve the latest data
    private refreshMaintenance$ = new Subject<void>();

    // Observable containing maintenance records with their associated equipment names
    maintenance$!: Observable<MaintenanceListItem[]>;

    // Store all maintenance records retrieved from the API
    // This allows the search to filter the existing records without making additional API requests
    allMaintenanceRecords: MaintenanceListItem[] = [];

    // Store the text entered into the maintenance search field
    searchTerm = '';

    // Store an error message if retrieving maintenance records fails
    errorMessage = '';

    // Retrieve maintenance records when the component is initialised
    ngOnInit(): void {
        this.maintenance$ = this.refreshMaintenance$.pipe(
            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval
            startWith(undefined),

            // Retrieve the latest data whenever the refresh Subject emits
            // switchMap switches to the new Observable and unsubscribes from the previous one if necessary
            switchMap(() => {
                this.errorMessage = '';

                // Execute both API requests in parallel and wait until they have completed
                // forkJoin combines their responses after both requests have completed
                return forkJoin({
                    maintenance: this.maintenanceService.getMaintenanceRecords(),
                    equipment: this.equipmentService.getEquipment()
                }).pipe(
                    // Match equipment IDs to their names and add the names to the maintenance records
                    // Map stores each ID alongside its name, allowing efficient lookups
                    map(({ maintenance, equipment }) => {

                        // Create a lookup map using equipment IDs as keys and names as values
                        const equipmentNames = new Map(
                            equipment.map(item => [item._id, item.name])
                        );

                        // Add the corresponding equipment name to each maintenance record
                        // The spread operator preserves the original properties while adding the display name
                        const records = maintenance.map(record => ({
                            ...record,
                            equipmentName: equipmentNames.get(record.equipmentId) ?? 'Unknown equipment'
                        }));

                        // Sort all maintenance records chronologically by their start date
                        // Records with earlier start dates appear first, regardless of whether they are past or upcoming
                        const sortedRecords = records.sort((a, b) => {
                            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                        });

                        // Store the complete sorted list so the search can filter it locally
                        this.allMaintenanceRecords = sortedRecords;

                        return sortedRecords;
                    }),

                    // Handle errors from either API request and return an empty array
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving maintenance records:', error);
                        this.errorMessage = typeof error.error?.message === 'string'
                            ? error.error.message
                            : 'Unable to load maintenance records. Please try again later.';
                        this.allMaintenanceRecords = [];
                        return of([]);
                    })
                );
            })
        );
    }

    // Filter maintenance records using the text entered into the search field
    // The search checks equipment name, notes, description and maintenance type
    // The search is case-insensitive so uppercase and lowercase letters produce the same results
    get filteredMaintenanceRecords(): MaintenanceListItem[] {
        const search = this.searchTerm.toLowerCase().trim();

        // Return the complete maintenance list when the search field is empty
        if (!search) {
            return this.allMaintenanceRecords;
        }

        // Return records where at least one of the four searchable fields contains the search text
        return this.allMaintenanceRecords.filter(record =>
            record.equipmentName.toLowerCase().includes(search) ||
            record.notes.toLowerCase().includes(search) ||
            record.description.toLowerCase().includes(search) ||
            record.maintenanceType.toLowerCase().includes(search)
        );
    }

    // Clear the search field and restore the complete maintenance list
    clearSearch(): void {
        this.searchTerm = '';
    }

    // Delete a maintenance record after user confirmation
    deleteMaintenanceRecord(id: string, equipmentName: string): void {

        // Ask the user to confirm before deleting the maintenance record
        const confirmed = confirm(`Are you sure you want to delete this maintenance record for ${equipmentName}?`);

        if (!confirmed) {
            return;
        }

        // Send the delete request to the backend
        this.maintenanceService.deleteMaintenanceRecord(id).subscribe({
            next: () => {
                // Display a success notification
                this.snackBar.open('Maintenance record deleted successfully', 'Close', {
                    duration: 5000
                });

                // Trigger a refresh of the maintenance list
                // The Subject emission causes the switchMap pipeline to retrieve the updated records
                this.refreshMaintenance$.next();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error deleting maintenance record:', error);

                // Display the error returned by the backend, or a fallback message
                const message = typeof error.error?.message === 'string'
                    ? error.error.message
                    : 'Unable to delete maintenance record.';

                this.snackBar.open(message, 'Close', { duration: 5000 });
            }
        });
    }
}
