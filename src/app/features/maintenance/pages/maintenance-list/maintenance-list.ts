import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './maintenance-list.html',
    styleUrl: './maintenance-list.scss'
})
export class MaintenanceList implements OnInit {

    // Inject MaintenanceService to retrieve and delete maintenance records
    private maintenanceService = inject(MaintenanceService);

    // Inject EquipmentService to retrieve equipment details
    private equipmentService = inject(EquipmentService);

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Create a Subject that allows the component to manually trigger a new data retrieval operation.
    // Calling next() on this Subject causes the maintenance Observable to retrieve the latest data.
    private refreshMaintenance$ = new Subject<void>();

    // Observable containing maintenance records with their associated equipment names
    maintenance$!: Observable<MaintenanceListItem[]>;

    // Store an error message if retrieving maintenance records fails
    errorMessage = '';

    // Retrieve maintenance records when the component is initialised
    ngOnInit(): void {
        this.maintenance$ = this.refreshMaintenance$.pipe(

            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval automatically
            startWith(undefined),

            // Use switchMap to start new API requests whenever the refresh Subject emits.
            // It switches to the latest Observable and unsubscribes from the previous one if necessary.
            switchMap(() => {
                this.errorMessage = '';

                // Use forkJoin to execute both API requests in parallel and wait until they have completed.
                // Their results are combined so the equipment IDs can be matched to their names.
                return forkJoin({
                    maintenance: this.maintenanceService.getMaintenanceRecords(),
                    equipment: this.equipmentService.getEquipment()
                }).pipe(

                    // Use map to add the corresponding equipment name to each maintenance record.
                    // The API only returns the equipment ID, so the equipment collection is searched for a matching ID.
                    map(({ maintenance, equipment }) =>
                        maintenance.map(record => ({
                            ...record,
                            equipmentName: equipment.find(item => item._id === record.equipmentId)?.name ?? 'Unknown equipment'
                        }))
                    ),

                    // Catch errors from either API request, display an error message and return an empty array
                    catchError(error => {
                        console.error('Error retrieving maintenance records:', error);
                        this.errorMessage = 'Unable to load maintenance records. Please try again later.';
                        return of([]);
                    })
                );
            })
        );
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

                // Trigger a refresh of the maintenance list by emitting a value from the Subject.
                // This causes the switchMap pipeline to retrieve the updated records again.
                this.refreshMaintenance$.next();
            },
            error: error => {
                console.error('Error deleting maintenance record:', error);

                // Display the error returned by the backend, or a fallback message
                this.snackBar.open(
                    error.error?.message ?? 'Unable to delete maintenance record.',
                    'Close',
                    { duration: 5000 }
                );
            }
        });
    }
}
