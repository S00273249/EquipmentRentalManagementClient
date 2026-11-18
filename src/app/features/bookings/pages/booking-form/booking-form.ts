import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { BookingStatus, CreateBookingDto } from '../../models/booking';
import { BookingService } from '../../services/booking';
import { CustomerService } from '../../../customers/services/customer';
import { EquipmentService } from '../../../equipment/services/equipment';
import { Customer } from '../../../customers/models/customer';
import { Equipment } from '../../../equipment/models/equipment';
import { dateRangeValidator } from '../../../../shared/validators/date-range.validator';
import { dateBoundsValidator } from '../../../../shared/validators/date-bounds.validator';

@Component({
    selector: 'app-booking-form',
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatSnackBarModule
    ],
    templateUrl: './booking-form.html',
    styleUrl: './booking-form.scss'
})
export class BookingForm implements OnInit {

    // Inject FormBuilder to create and manage the reactive form
    private fb = inject(FormBuilder);

    // Inject ActivatedRoute to retrieve the booking ID from the URL
    private route = inject(ActivatedRoute);

    // Inject Router to navigate after saving
    private router = inject(Router);

    // Inject BookingService to communicate with the backend
    private bookingService = inject(BookingService);

    // Inject CustomerService to retrieve customers for the dropdown
    private customerService = inject(CustomerService);

    // Inject EquipmentService to retrieve equipment for the dropdown
    private equipmentService = inject(EquipmentService);

    // Inject MatSnackBar to display success messages
    private snackBar = inject(MatSnackBar);

    // Inject ChangeDetectorRef to manually trigger change detection when asynchronous operations update component properties
    private cdr = inject(ChangeDetectorRef);

    // Store the booking ID when editing an existing booking
    bookingId: string | null = null;

    // Store customers and equipment retrieved from the backend
    customers: Customer[] = [];
    equipment: Equipment[] = [];

    // Track whether the form data is currently being loaded or saved
    isLoading = false;

    // Store an error message if loading or saving fails
    errorMessage = '';

    // Define the available booking statuses for the dropdown
    statuses: BookingStatus[] = [
        'Pending',
        'Confirmed',
        'Active',
        'Completed',
        'Cancelled'
    ];

    // Calculate the permitted date range as 10 years in the past and 5 years in the future
    minDate = this.formatDate(this.getDateOffset(-10));
    maxDate = this.formatDate(this.getDateOffset(5));

    // Calculate a date a specified number of years before or after today
    private getDateOffset(years: number): Date {
        const date = new Date();
        date.setFullYear(date.getFullYear() + years);
        return date;
    }

    // Format a date as YYYY-MM-DD for use with HTML date inputs
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    // Create the booking form and define its validation rules
    bookingForm = this.fb.group({
        customerId: ['', Validators.required],
        equipmentId: ['', Validators.required],
        startDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        endDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        status: ['Pending' as BookingStatus, Validators.required]
    }, {

        // Apply a custom form-group validator to compare the start and end dates.
        // This allows validation to depend on the values of two separate form controls.
        validators: [dateRangeValidator]
    });

    // Check whether the form is being used to create or edit a booking
    ngOnInit(): void {
        this.bookingId = this.route.snapshot.paramMap.get('id');

        // Retrieve the customers and equipment needed to populate the form
        this.loadFormData();
    }

    // Retrieve customers and equipment from the backend
    loadFormData(): void {
        this.isLoading = true;

        // Use forkJoin to execute both API requests in parallel and wait until both have completed.
        // The results are then returned together, allowing the form to be populated with both collections.
        forkJoin({
            customers: this.customerService.getCustomers(),
            equipment: this.equipmentService.getEquipment()
        }).subscribe({
            next: ({ customers, equipment }) => {
                this.customers = customers;
                this.equipment = equipment;

                // If a booking ID exists, retrieve the booking being edited
                if (this.bookingId) {
                    this.loadBooking();
                } else {

                    // Finish loading when creating a new booking
                    this.isLoading = false;

                    // Mark the component for change detection so Angular updates the view with the latest values
                    this.cdr.markForCheck();
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading booking form data:', error);
                this.errorMessage = 'Unable to load customers and equipment.';
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // Retrieve an existing booking and populate the form when editing
    loadBooking(): void {
        if (!this.bookingId) {
            return;
        }

        this.bookingService.getBookingById(this.bookingId).subscribe({
            next: booking => {

                // Populate the form with the existing booking details
                this.bookingForm.patchValue({
                    customerId: booking.customerId,
                    equipmentId: booking.equipmentId,
                    startDate: booking.startDate.substring(0, 10),
                    endDate: booking.endDate.substring(0, 10),
                    status: booking.status
                });

                this.isLoading = false;

                // Mark the component for change detection so Angular updates the view with the latest values
                this.cdr.markForCheck();
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading booking:', error);
                this.errorMessage = 'Unable to load this booking.';
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // Handle booking form submission
    onSubmit(): void {

        // Prevent submission if the form is invalid
        if (this.bookingForm.invalid) {
            this.bookingForm.markAllAsTouched();
            return;
        }

        // Retrieve the form values
        const formValue = this.bookingForm.getRawValue();

        // Clear previous errors and indicate that the booking is being saved
        this.errorMessage = '';
        this.isLoading = true;

        // Create the booking DTO containing the information required by the API
        const bookingData: CreateBookingDto = {
            customerId: formValue.customerId!,
            equipmentId: formValue.equipmentId!,
            startDate: formValue.startDate!,
            endDate: formValue.endDate!,
            status: formValue.status!
        };

        // Choose the appropriate API operation depending on whether a booking ID exists
        const request = this.bookingId
            ? this.bookingService.updateBooking(this.bookingId, bookingData)
            : this.bookingService.addBooking(bookingData);

        request.subscribe({
            next: () => {

                // Display a confirmation message after successfully saving the booking
                const message = this.bookingId
                    ? 'Booking updated successfully'
                    : 'Booking created successfully';

                this.snackBar.open(message, 'Close', { duration: 5000 });

                // Navigate back to the bookings list
                this.router.navigate(['/bookings']);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error saving booking:', error);

                // Display the error returned by the backend, or a fallback message
                this.errorMessage = error.error?.message ?? 'Unable to save booking. Please try again.';

                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }
}
