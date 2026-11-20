import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { BookingService } from '../../services/booking';
import { Booking, BookingStatus } from '../../models/booking';
import { CustomerService } from '../../../customers/services/customer';
import { EquipmentService } from '../../../equipment/services/equipment';
import { Customer } from '../../../customers/models/customer';
import { Equipment } from '../../../equipment/models/equipment';

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
        FormsModule,
        MatButtonModule,
        MatAutocompleteModule,
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

    // Store the selected customer, equipment and status filters
    filters: {
        customerId: string;
        equipmentId: string;
        status: BookingStatus | '';
    } = {
        customerId: '',
        equipmentId: '',
        status: ''
    };

    // Store the selected customer and equipment for the autocomplete fields
    // Each property can contain a complete object, a string being typed or null when cleared
    customerSelection: Customer | string | null = '';
    equipmentSelection: Equipment | string | null = '';

    // Store the text entered into the autocomplete search fields
    // These values are used to find matching customers and equipment
    customerSearch = '';
    equipmentSearch = '';

    // Store customers and equipment retrieved from the backend for the autocomplete suggestions
    customers: Customer[] = [];
    equipment: Equipment[] = [];

    // Define the available booking statuses using the BookingStatus type
    bookingStatuses: BookingStatus[] = [
        'Pending',
        'Confirmed',
        'Active',
        'Completed',
        'Cancelled'
    ];

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
                // forkJoin combines their responses into one object after all requests complete
                return forkJoin({
                    bookings: this.bookingService.getBookings(
                        this.filters.customerId || undefined,
                        this.filters.equipmentId || undefined,
                        this.filters.status || undefined
                    ),
                    customers: this.customerService.getCustomers(),
                    equipment: this.equipmentService.getEquipment()
                }).pipe(
                    // Match customer and equipment IDs to their names
                    // Map stores each ID alongside its corresponding name, allowing efficient lookups
                    map(({ bookings, customers, equipment }) => {
                        // Store the retrieved records so they can be used by the autocomplete fields
                        this.customers = customers;
                        this.equipment = equipment;

                        // Create lookup maps using the IDs as keys and names as values
                        const customerNames = new Map(
                            customers.map(customer => [customer._id, customer.name])
                        );

                        const equipmentNames = new Map(
                            equipment.map(item => [item._id, item.name])
                        );

                        // Add the corresponding customer and equipment names to each booking
                        // The spread operator preserves the original booking properties while adding the display names
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

    // Display the customer name when a customer is selected in the autocomplete field
    // Angular Material passes the selected Customer object to this method
    // Returning the name prevents the input from displaying the entire object
    displayCustomer(customer: Customer | string | null): string {
        return typeof customer === 'string' ? customer : customer?.name ?? '';
    }

    // Display the equipment name when equipment is selected in the autocomplete field
    displayEquipment(item: Equipment | string | null): string {
        return typeof item === 'string' ? item : item?.name ?? '';
    }

    // Filter customer suggestions based on the text entered into the search field
    // slice(0, 10) limits the suggestions to ten records to keep the autocomplete list manageable
    get filteredCustomers(): Customer[] {
        const search = this.customerSearch.toLowerCase().trim();

        // Display the first ten customers when no search text has been entered
        if (!search) {
            return this.customers.slice(0, 10);
        }

        // Return customers whose names contain the entered search text
        return this.customers
            .filter(customer => customer.name.toLowerCase().includes(search))
            .slice(0, 10);
    }

    // Filter equipment suggestions based on the text entered into the search field
    // The search is case-insensitive and limited to ten matching records
    get filteredEquipment(): Equipment[] {
        const search = this.equipmentSearch.toLowerCase().trim();

        // Display the first ten equipment records when no search text has been entered
        if (!search) {
            return this.equipment.slice(0, 10);
        }

        // Return equipment whose names contain the entered search text
        return this.equipment
            .filter(item => item.name.toLowerCase().includes(search))
            .slice(0, 10);
    }

    // Update the customer filter when the autocomplete value changes
    // The value can be a Customer object, a string or null
    // A Customer object is supplied when the user selects a suggestion
    // A string is supplied when the user types into the search field
    // Only a selected Customer object provides a valid ID for the backend filter
    // Typing new text clears the previously selected ID to prevent filtering by the wrong customer
    onCustomerSelectionChange(value: Customer | string | null): void {
        this.customerSelection = value;

        if (typeof value === 'string') {
            this.customerSearch = value;
            this.filters.customerId = '';
        } else if (value) {
            this.customerSearch = value.name;
            this.filters.customerId = value._id;
        } else {
            this.customerSearch = '';
            this.filters.customerId = '';
        }
    }

    // Update the equipment filter when the autocomplete value changes
    // Selecting an Equipment object stores its ID for the backend request
    // Typing new search text or clearing the field removes the previously selected equipment ID
    onEquipmentSelectionChange(value: Equipment | string | null): void {
        this.equipmentSelection = value;

        if (typeof value === 'string') {
            this.equipmentSearch = value;
            this.filters.equipmentId = '';
        } else if (value) {
            this.equipmentSearch = value.name;
            this.filters.equipmentId = value._id;
        } else {
            this.equipmentSearch = '';
            this.filters.equipmentId = '';
        }
    }

    // Apply the selected filters and retrieve matching bookings from the backend
    applyFilters(): void {
        this.errorMessage = '';
        this.refreshBookings$.next();
    }

    // Clear all selected filters and retrieve all bookings
    clearFilters(): void {
        this.filters = {
            customerId: '',
            equipmentId: '',
            status: ''
        };

        // Reset both autocomplete fields as well as their search text
        this.customerSelection = '';
        this.equipmentSelection = '';
        this.customerSearch = '';
        this.equipmentSearch = '';

        // Trigger a new request without any filters
        this.applyFilters();
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
