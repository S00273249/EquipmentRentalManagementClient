import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
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

}
