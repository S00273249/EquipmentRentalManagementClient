import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Maintenance, CreateMaintenanceDto } from '../models/maintenance';

@Injectable({
    providedIn: 'root'
})
export class MaintenanceService {

    // Inject HttpClient to communicate with the backend API
    private http = inject(HttpClient);

    // Define the API endpoint for maintenance records
    private apiUrl = 'http://localhost:3000/api/v1/maintenance';

    // Define the API key required to authenticate requests
    private apiKey = 'blahblah';

    // Add the API key header to authenticate requests
    private headers = new HttpHeaders({
        'x-api-key': this.apiKey
    });

    // Retrieve all maintenance records, optionally filtering by equipment ID
    getMaintenanceRecords(equipmentId?: string): Observable<Maintenance[]> {
        let params = new HttpParams();

        // Add the equipment ID as a query parameter when a filter is provided
        if (equipmentId) {
            params = params.set('equipmentId', equipmentId);
        }

        return this.http.get<Maintenance[]>(this.apiUrl, {
            headers: this.headers,
            params
        });
    }

    // Retrieve a single maintenance record by its ID
    getMaintenanceRecordById(id: string): Observable<Maintenance> {
        return this.http.get<Maintenance>(`${this.apiUrl}/${id}`, {
            headers: this.headers
        });
    }

    // Create a new maintenance record
    addMaintenanceRecord(maintenanceData: CreateMaintenanceDto): Observable<Maintenance> {
        return this.http.post<Maintenance>(this.apiUrl, maintenanceData, {
            headers: this.headers
        });
    }

    // Update an existing maintenance record
    updateMaintenanceRecord(id: string, maintenanceData: CreateMaintenanceDto): Observable<Maintenance> {
        return this.http.put<Maintenance>(`${this.apiUrl}/${id}`, maintenanceData, {
            headers: this.headers
        });
    }

    // Delete a maintenance record by its ID
    deleteMaintenanceRecord(id: string): Observable<Maintenance> {
        return this.http.delete<Maintenance>(`${this.apiUrl}/${id}`, {
            headers: this.headers
        });
    }
}
