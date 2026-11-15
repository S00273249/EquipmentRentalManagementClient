import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { BookingService } from '../../services/booking';
import { Booking } from '../../models/booking';
import { CustomerService } from '../../../customers/services/customer';
import { EquipmentService } from '../../../equipment/services/equipment';

// Extend the Booking interface with additional properties used only for displaying customer and equipment names in the list
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

    // Inject BookingService to retrieve and delete bookings
    private bookingService = inject(BookingService);

    // Inject CustomerService to retrieve customer details
    private customerService = inject(CustomerService);

    // Inject EquipmentService to retrieve equipment details
    private equipmentService = inject(EquipmentService);

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Create a Subject that allows the component to manually trigger a new data retrieval operation.
    // Calling next() on this Subject causes the bookings Observable to retrieve the latest data.
    private refreshBookings$ = new Subject<void>();

    // Observable containing the bookings returned by the API
    bookings$!: Observable<BookingListItem[]>;

    // Store an error message if retrieving bookings fails
    errorMessage = '';

    // Retrieve bookings when the component is initialised
    ngOnInit(): void {
        this.bookings$ = this.refreshBookings$.pipe(

            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval automatically
            startWith(undefined),

            // Use switchMap to start a new set of API requests whenever the refresh Subject emits.
            // It switches to the latest Observable and unsubscribes from the previous one if necessary.
            switchMap(() => {
                this.errorMessage = '';

                // Use forkJoin to execute all three API requests in parallel and wait until they have completed.
                // Their results are combined into one object so they can be used together below.
                return forkJoin({
                    bookings: this.bookingService.getBookings(),
                    customers: this.customerService.getCustomers(),
                    equipment: this.equipmentService.getEquipment()
                }).pipe(

                    // Use map to transform the booking results by adding the corresponding customer and equipment names.
                    // The API only returns their IDs, so the customer and equipment collections are searched to find the matching names.
                    map(({ bookings, customers, equipment }) =>
                        bookings.map(booking => ({
                            ...booking,
                            customerName: customers.find(customer => customer._id === booking.customerId)?.name ?? 'Unknown customer',
                            equipmentName: equipment.find(item => item._id === booking.equipmentId)?.name ?? 'Unknown equipment'
                        }))
                    ),

                    // Catch errors from any of the API requests, display an error message and return an empty array
                    catchError(error => {
                        console.error('Error retrieving bookings:', error);
                        this.errorMessage = 'Unable to load bookings. Please try again later.';
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

        // Send the delete request to the backend
        this.bookingService.deleteBooking(id).subscribe({
            next: () => {

                // Display a success notification
                this.snackBar.open('Booking deleted successfully', 'Close', {
                    duration: 5000
                });

                // Trigger a refresh of the bookings list by emitting a value from the Subject.
                // This causes the switchMap pipeline to execute the API requests again and retrieve the updated data.
                this.refreshBookings$.next();
            },
            error: error => {
                console.error('Error deleting booking:', error);

                // Display the error returned by the backend, or a fallback message
                this.snackBar.open(
                    error.error?.message ?? 'Unable to delete booking.',
                    'Close',
                    { duration: 5000 }
                );
            }
        });
    }
}
