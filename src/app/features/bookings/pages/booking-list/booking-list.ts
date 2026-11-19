import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { BookingService } from '../../services/booking';
import { Booking } from '../../models/booking';
import { CustomerService } from '../../../customers/services/customer';
import { EquipmentService } from '../../../equipment/services/equipment';

// Extend the Booking interface with additional properties used only for displaying customer and equipment names
interface BookingListItem extends Booking {
    customerName: string;
    equipmentName: string;
}

@Component({
    selector: 'app-booking-list',
    imports: [
        AsyncPipe,
        DatePipe,
        CurrencyPipe,
        RouterLink,
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './booking-list.html',
    styleUrl: './booking-list.scss'
})
export class BookingList implements OnInit {

    // Inject services and utilities required by the component
    private bookingService = inject(BookingService);
    private customerService = inject(CustomerService);
    private equipmentService = inject(EquipmentService);
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger a refresh of the bookings list
    // Calling next() on this Subject causes the bookings Observable to retrieve the latest data
    private refreshBookings$ = new Subject<void>();

    // Observable containing bookings with their associated customer and equipment names
    bookings$!: Observable<BookingListItem[]>;

    // Store an error message if retrieving bookings fails
    errorMessage = '';

    // Retrieve bookings when the component is initialised
    ngOnInit(): void {
        this.bookings$ = this.refreshBookings$.pipe(
            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval
            startWith(undefined),

            // Retrieve the latest data whenever the refresh Subject emits
            // switchMap switches to the new Observable and unsubscribes from the previous one if necessary
            switchMap(() => {
                this.errorMessage = '';

                // Execute all three API requests in parallel and wait until they have completed
                // forkJoin combines their responses into one object
                return forkJoin({
                    bookings: this.bookingService.getBookings(),
                    customers: this.customerService.getCustomers(),
                    equipment: this.equipmentService.getEquipment()
                }).pipe(
                    // Match customer and equipment IDs to their names
                    // Map provides efficient lookups without repeatedly searching the original arrays
                    map(({ bookings, customers, equipment }) => {
                        const customerNames = new Map(
                            customers.map(customer => [customer._id, customer.name])
                        );

                        const equipmentNames = new Map(
                            equipment.map(item => [item._id, item.name])
                        );

                        // Add the corresponding customer and equipment names to each booking
                        return bookings.map(booking => ({
                            ...booking,
                            customerName: customerNames.get(booking.customerId) ?? 'Unknown customer',
                            equipmentName: equipmentNames.get(booking.equipmentId) ?? 'Unknown equipment'
                        }));
                    }),

                    // Handle errors from any of the API requests and return an empty array
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving bookings:', error);
                        this.errorMessage = error.error?.message ?? 'Unable to load bookings. Please try again later.';
                        return of([]);
                    })
                );
            })
        );
    }

    // Delete a booking after user confirmation
    deleteBooking(id: string, customerName: string): void {

        // Ask the user to confirm before deleting the booking
        const confirmed = confirm(`Are you sure you want to delete the booking for ${customerName}?`);

        if (!confirmed) {
            return;
        }

        // Clear previous error messages
        this.errorMessage = '';

        // Send the delete request to the backend
        this.bookingService.deleteBooking(id).subscribe({
            next: () => {
                // Display a success notification
                this.snackBar.open('Booking deleted successfully', 'Close', {
                    duration: 5000
                });

                // Trigger a refresh of the bookings list
                // The Subject emission causes the switchMap pipeline to retrieve the updated data
                this.refreshBookings$.next();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error deleting booking:', error);

                // Display the error returned by the backend, or a fallback message
                this.snackBar.open(
                    error.error?.message ?? 'Unable to delete booking. Please try again.',
                    'Close',
                    { duration: 5000 }
                );
            }
        });
    }
}
