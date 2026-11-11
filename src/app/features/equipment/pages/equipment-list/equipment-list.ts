import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, catchError, of } from 'rxjs';
import { Equipment } from '../../models/equipment.model';
import { EquipmentService } from '../../services/equipment';

@Component({
    selector: 'app-equipment-list',
    imports: [AsyncPipe],
    templateUrl: './equipment-list.html',
    styleUrl: './equipment-list.scss'
})
export class EquipmentList implements OnInit {

    // Inject the EquipmentService to retrieve equipment from the backend
    private equipmentService = inject(EquipmentService);

    // Observable containing the equipment returned by the API
    equipment$!: Observable<Equipment[]>;

    // Store an error message if the API request fails
    errorMessage = '';

    // Retrieve equipment when the component is initialised
    ngOnInit(): void {
        this.equipment$ = this.equipmentService.getEquipment().pipe(
            catchError(error => {
                console.error('Error retrieving equipment:', error);
                this.errorMessage = 'Unable to load equipment. Please try again later.';
                return of([]);
            })
        );
    }

}
