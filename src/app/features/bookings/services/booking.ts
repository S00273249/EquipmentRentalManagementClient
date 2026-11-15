import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking, CreateBookingDto, BookingStatus } from '../models/booking';

@Injectable({
    providedIn: 'root'
})
export class BookingService {

    private apiUrl = 'http://localhost:3000/api/v1/bookings';
    private apiKey = 'blahblah';

    constructor(private http: HttpClient) { }

    // Retrieve all bookings, with optional filters
    getBookings(customerId?: string, equipmentId?: string, status?: BookingStatus): Observable<Booking[]> {
        let params = new HttpParams();

        if (customerId) {
            params = params.set('customerId', customerId);
        }

        if (equipmentId) {
            params = params.set('equipmentId', equipmentId);
        }

        if (status) {
            params = params.set('status', status);
        }

        return this.http.get<Booking[]>(this.apiUrl, {
            headers: { 'x-api-key': this.apiKey },
            params
        });
    }

    // Retrieve a booking by ID
    getBookingById(id: string): Observable<Booking> {
        return this.http.get<Booking>(`${this.apiUrl}/${id}`, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Create a new booking
    addBooking(booking: CreateBookingDto): Observable<Booking> {
        return this.http.post<Booking>(this.apiUrl, booking, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Update an existing booking
    updateBooking(id: string, booking: CreateBookingDto): Observable<Booking> {
        return this.http.put<Booking>(`${this.apiUrl}/${id}`, booking, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Delete a booking
    deleteBooking(id: string): Observable<Booking> {
        return this.http.delete<Booking>(`${this.apiUrl}/${id}`, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

}
