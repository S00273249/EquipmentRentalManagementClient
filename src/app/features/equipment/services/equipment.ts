import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipment } from '../models/equipment.model';

@Injectable({
    providedIn: 'root'
})
export class EquipmentService {

    // Base URL of the equipment endpoint in the Express API
    private apiUrl = 'http://localhost:3000/api/v1/equipment';

    // API key required by the Express authentication middleware
    private apiKey = 'blahblah';

    constructor(private http: HttpClient) { }

    // Retrieve all equipment from the backend
    getEquipment(): Observable<Equipment[]> {

        return this.http.get<Equipment[]>(this.apiUrl, {
            headers: {
                'x-api-key': this.apiKey
            }
        });
    }

}
