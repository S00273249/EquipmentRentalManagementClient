import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { Customer } from '../../models/customer';
import { CustomerService } from '../../services/customer';

@Component({
    selector: 'app-customer-list',
    imports: [
        AsyncPipe,
        RouterLink,
        FormsModule,
        MatButtonModule
    ],
    templateUrl: './customer-list.html',
    styleUrl: './customer-list.scss'
})
export class CustomerList implements OnInit {

    // Inject services and utilities required by the component
    private customerService = inject(CustomerService);
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger a refresh of the customer list
    // Calling next() on this Subject causes the customers Observable to retrieve the latest data
    private refreshCustomers$ = new Subject<void>();

    // Observable containing the customers returned by the API
    customers$!: Observable<Customer[]>;

    // Store all customers retrieved from the API
    // This allows the search to filter the existing data without making another API request
    allCustomers: Customer[] = [];

    // Store the text entered into the customer search field
    searchTerm = '';

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve customers when the component is initialised
    ngOnInit(): void {
        this.customers$ = this.refreshCustomers$.pipe(
            // Emit an initial value when the Observable is subscribed to, triggering the first data retrieval
            startWith(undefined),

            // Retrieve customers whenever the refresh Subject emits
            // switchMap switches to the latest API request if another refresh is triggered
            switchMap(() => {
                this.errorMessage = '';

                return this.customerService.getCustomers().pipe(
                    // Store the latest customer list so it can be filtered locally
                    // map transforms the API response while passing the original list through the Observable
                    map(customers => {
                        this.allCustomers = customers;
                        return customers;
                    }),

                    // Handle API errors and return an empty array so the list can still display its empty state
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving customers:', error);
                        this.errorMessage = typeof error.error?.message === 'string'
                            ? error.error.message
                            : 'Unable to load customers. Please try again later.';
                        this.allCustomers = [];
                        return of([]);
                    })
                );
            })
        );
    }

    // Filter customers using the text entered into the search field
    // The search checks the customer's name, email, phone number and address
    // to allow customers to be found using any of their contact details
    get filteredCustomers(): Customer[] {
        const search = this.searchTerm.toLowerCase().trim();

        // Return the complete customer list when the search field is empty
        if (!search) {
            return this.allCustomers;
        }

        // Return customers where at least one of their details contains the search text
        // toLowerCase() makes the search case-insensitive
        return this.allCustomers.filter(customer =>
            customer.name.toLowerCase().includes(search) ||
            customer.email.toLowerCase().includes(search) ||
            customer.phone.toLowerCase().includes(search) ||
            customer.address.toLowerCase().includes(search)
        );
    }

    // Clear the search field and restore the complete customer list
    clearSearch(): void {
        this.searchTerm = '';
    }

    // Delete a customer after user confirmation
    deleteCustomer(id: string, name: string): void {

        // Ask the user to confirm before deleting
        const confirmed = confirm(`Are you sure you want to delete "${name}"?`);

        if (!confirmed) {
            return;
        }

        // Clear previous error messages
        this.errorMessage = '';

        // Send the delete request to the backend
        this.customerService.deleteCustomer(id).subscribe({
            next: (response) => {
                console.log('Customer deleted successfully:', response);

                // Display a success notification
                this.snackBar.open(`${name} deleted successfully`, 'Close', { duration: 10000 });

                // Trigger a refresh of the customer directory
                this.refreshCustomers$.next();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error deleting customer:', error);
                this.errorMessage = typeof error.error?.message === 'string'
                    ? error.error.message
                    : 'Unable to delete customer. Please try again.';
            }
        });
    }
}
