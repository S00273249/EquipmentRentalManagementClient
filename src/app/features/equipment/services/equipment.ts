import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipment, CreateEquipmentDto } from '../models/equipment';

export interface EquipmentFilters {
    category?: string;
    status?: string;
    condition?: string;
    sort?: string;
    from?: string;
    to?: string;
}

@Injectable({
    providedIn: 'root'
})
export class EquipmentService {

    // Base URL of the equipment endpoint in the Express API
    private apiUrl = 'http://localhost:3000/api/v1/equipment';

    // API key required by the Express authentication middleware
    private apiKey = 'blahblah';

    constructor(private http: HttpClient) { }

    // Retrieve equipment from the backend, optionally applying filters
    getEquipment(filters?: EquipmentFilters): Observable<Equipment[]> {

        let params = new HttpParams();

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    params = params.set(key, value);
                }
            });
        }

        return this.http.get<Equipment[]>(this.apiUrl, {
            headers: {
                'x-api-key': this.apiKey
            },
            params
        });
    }

    // Retrieve a single equipment item by ID
    getEquipmentById(id: string): Observable<Equipment> {

        return this.http.get<Equipment>(`${this.apiUrl}/${id}`, {
            headers: {
                'x-api-key': this.apiKey
            }
        });
    }

    // Create new equipment in the backend
    addEquipment(equipment: CreateEquipmentDto): Observable<Equipment> {

        return this.http.post<Equipment>(this.apiUrl, equipment, {
            headers: {
                'x-api-key': this.apiKey
            }
        });
    }

    // Update existing equipment in the backend
    updateEquipment(id: string, equipment: CreateEquipmentDto): Observable<Equipment> {

        return this.http.put<Equipment>(`${this.apiUrl}/${id}`, equipment, {
            headers: {
                'x-api-key': this.apiKey
            }
        });
    }

    // Delete an equipment item from the backend
    deleteEquipment(id: string): Observable<Equipment> {

        return this.http.delete<Equipment>(`${this.apiUrl}/${id}`, {
            headers: {
                'x-api-key': this.apiKey
            }
        });
    }
    
}
