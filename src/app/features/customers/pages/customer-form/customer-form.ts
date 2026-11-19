import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CreateCustomerDto } from '../../models/customer';
import { CustomerService } from '../../services/customer';
import { notBlank } from '../../../../shared/validators/not-blank.validator';

@Component({
    selector: 'app-customer-form',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressBarModule
    ],
    templateUrl: './customer-form.html',
    styleUrl: './customer-form.scss'
})
export class CustomerForm implements OnInit {

    // Inject services and utilities required by the component
    private formBuilder = inject(FormBuilder);
    private customerService = inject(CustomerService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private snackBar = inject(MatSnackBar);

    // Store the customer ID when editing an existing customer
    customerId: string | null = null;

    // Track loading and saving states using signals
    // Signals notify Angular when their values change so the view can update
    loading = signal(false);
    saving = signal(false);
    saveError = signal<string | null>(null);

    // Define the customer reactive form and its validation rules
    customerForm = this.formBuilder.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), notBlank]],
        email: ['', [Validators.required, Validators.email, notBlank]],
        phone: ['', [Validators.required, notBlank]],
        address: ['', [Validators.required, notBlank]]
    });

    // Check whether the form is creating or editing a customer
    ngOnInit(): void {
        this.customerId = this.route.snapshot.paramMap.get('id');

        // If there is no ID, this is a new customer
        if (!this.customerId) {
            return;
        }

        // Retrieve the existing customer
        this.loading.set(true);

        this.customerService.getCustomerById(this.customerId).subscribe({
            next: (customer) => {
                // Populate the form with the existing customer details
                this.customerForm.patchValue({
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address
                });

                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error retrieving customer:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to retrieve this customer. Please try again.'
                );
                this.loading.set(false);
            }
        });
    }

    // Validate and submit the customer form
    onSubmit(): void {
        if (this.saving() || this.loading()) {
            return;
        }

        // Display validation messages if the form is invalid
        if (this.customerForm.invalid) {
            this.customerForm.markAllAsTouched();
            return;
        }

        // Retrieve the form values
        const { name, email, phone, address } = this.customerForm.getRawValue();

        // Prepare the customer data for the API
        const customerData: CreateCustomerDto = {
            name,
            email,
            phone,
            address
        };

        // Set the saving state and clear any previous error
        this.saving.set(true);
        this.saveError.set(null);

        // Disable the form while the customer is being saved
        this.customerForm.disable();

        // Choose between creating and updating a customer
        const request = this.customerId
            ? this.customerService.updateCustomer(this.customerId, customerData)
            : this.customerService.addCustomer(customerData);

        request.subscribe({
            next: (response) => {
                const action = this.customerId ? 'updated' : 'saved';

                // Display a success notification
                this.snackBar.open(`${customerData.name} ${action} successfully`, 'Close', { duration: 10000 });

                console.log('Customer saved successfully:', response);

                // Return to the customer directory
                this.router.navigate(['/customers']);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error saving customer:', error);
                this.saveError.set(
                    typeof error.error?.message === 'string'
                        ? error.error.message
                        : 'Unable to save this customer. Please try again.'
                );
                this.saving.set(false);

                // Re-enable the form so the user can correct the information
                this.customerForm.enable();
            }
        });
    }
}