import { Routes } from '@angular/router';
import { EquipmentList } from './features/equipment/pages/equipment-list/equipment-list';
import { EquipmentForm } from './features/equipment/pages/equipment-form/equipment-form';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'equipment',
        pathMatch: 'full'
    },
    {
        path: 'equipment',
        component: EquipmentList
    },
    {
        path: 'equipment/new',
        component: EquipmentForm
    }
];
