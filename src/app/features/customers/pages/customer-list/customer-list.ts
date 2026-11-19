import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { Customer } from '../../models/customer';
import { CustomerService } from '../../services/customer';

@Component({
    selector: 'app-customer-list',
    imports: [
        AsyncPipe,
        RouterLink,
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
                    // Handle API errors and return an empty array so the list can still display its empty state
                    catchError((error: HttpErrorResponse) => {
                        console.error('Error retrieving customers:', error);
                        this.errorMessage = typeof error.error?.message === 'string'
                            ? error.error.message
                            : 'Unable to load customers. Please try again later.';
                        return of([]);
                    })
                );
            })
        );
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
