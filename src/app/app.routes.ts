import { Routes } from '@angular/router';
import { EquipmentList } from './features/equipment/pages/equipment-list/equipment-list';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'equipment',
        pathMatch: 'full'
    },
    {
        path: 'equipment',
        component: EquipmentList
    }
];
