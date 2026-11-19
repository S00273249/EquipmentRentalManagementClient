import { Component, OnInit, inject, signal } from '@angular/core';
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

    // Inject services and utilities required by the component
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private bookingService = inject(BookingService);
    private customerService = inject(CustomerService);
    private equipmentService = inject(EquipmentService);
    private snackBar = inject(MatSnackBar);

    // Store the booking ID when editing an existing booking
    bookingId: string | null = null;

    // Store customers and equipment retrieved from the backend
    customers: Customer[] = [];
    equipment: Equipment[] = [];

    // Track loading, saving and error states using signals
    loading = signal(false);
    saving = signal(false);
    saveError = signal<string | null>(null);

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
    bookingForm = this.fb.nonNullable.group({
        customerId: ['', Validators.required],
        equipmentId: ['', Validators.required],
        startDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        endDate: ['', [Validators.required, dateBoundsValidator(this.minDate, this.maxDate)]],
        status: this.fb.nonNullable.control<BookingStatus>('Pending', Validators.required)
    }, {
        // Validate the relationship between the start and end dates
        // A form-group validator can compare values from multiple form controls
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
        this.loading.set(true);
        this.saveError.set(null);

        // Run both API requests in parallel and wait until both have completed
        // forkJoin emits one combined result containing the response from each request
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
                    this.loading.set(false);
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading booking form data:', error);
                this.saveError.set(
                    error.error?.message ?? 'Unable to load customers and equipment. Please try again.'
                );
                this.loading.set(false);
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

                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                console.error('Error loading booking:', error);
                this.saveError.set(
                    error.error?.message ?? 'Unable to load this booking. Please try again.'
                );
                this.loading.set(false);
            }
        });
    }

    // Validate and submit the booking form
    onSubmit(): void {
        // Prevent submission while the form is loading or being saved
        if (this.loading() || this.saving()) {
            return;
        }

        // Display validation messages if the form is invalid
        if (this.bookingForm.invalid) {
            this.bookingForm.markAllAsTouched();
            return;
        }

        // Retrieve the form values
        const formValue = this.bookingForm.getRawValue();

        // Clear previous errors and indicate that the booking is being saved
        this.saveError.set(null);
        this.saving.set(true);

        // Create the DTO containing the information required by the API
        const bookingData: CreateBookingDto = {
            customerId: formValue.customerId,
            equipmentId: formValue.equipmentId,
            startDate: formValue.startDate,
            endDate: formValue.endDate,
            status: formValue.status
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
                this.saveError.set(
                    error.error?.message ?? 'Unable to save booking. Please try again.'
                );

                this.saving.set(false);
            }
        });
    }
}