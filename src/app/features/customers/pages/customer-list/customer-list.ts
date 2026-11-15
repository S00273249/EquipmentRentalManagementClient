import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
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

    // Inject the CustomerService to communicate with the backend
    private customerService = inject(CustomerService);

    // Inject MatSnackBar to display notifications
    private snackBar = inject(MatSnackBar);

    // Subject used to trigger a customer list refresh
    private refreshCustomers$ = new Subject<void>();

    // Observable containing the customers returned by the API
    customers$!: Observable<Customer[]>;

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve customers when the component is initialised
    ngOnInit(): void {
        this.customers$ = this.refreshCustomers$.pipe(
            // Automatically retrieve customers when the component loads
            startWith(undefined),

            // Retrieve customers whenever the refresh Subject emits
            switchMap(() => {
                this.errorMessage = '';

                return this.customerService.getCustomers().pipe(
                    catchError(error => {
                        console.error('Error retrieving customers:', error);
                        this.errorMessage = 'Unable to load customers. Please try again later.';
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
            error: (error: Error) => {
                console.error('Error deleting customer:', error);
                this.errorMessage = 'Unable to delete customer. Please try again.';
            }
        });
    }

}
