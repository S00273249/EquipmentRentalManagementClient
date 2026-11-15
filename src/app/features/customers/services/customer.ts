import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer, CreateCustomerDto } from '../models/customer';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {

    private apiUrl = 'http://localhost:3000/api/v1/customers';
    private apiKey = 'blahblah';

    constructor(private http: HttpClient) { }

    // Retrieve all customers
    getCustomers(): Observable<Customer[]> {
        return this.http.get<Customer[]>(this.apiUrl, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Retrieve a customer by ID
    getCustomerById(id: string): Observable<Customer> {
        return this.http.get<Customer>(`${this.apiUrl}/${id}`, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Create a new customer
    addCustomer(customer: CreateCustomerDto): Observable<Customer> {
        return this.http.post<Customer>(this.apiUrl, customer, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Update an existing customer
    updateCustomer(id: string, customer: CreateCustomerDto): Observable<Customer> {
        return this.http.put<Customer>(`${this.apiUrl}/${id}`, customer, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

    // Delete a customer
    deleteCustomer(id: string): Observable<Customer> {
        return this.http.delete<Customer>(`${this.apiUrl}/${id}`, {
            headers: { 'x-api-key': this.apiKey }
        });
    }

}
