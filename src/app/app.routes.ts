import { Routes } from '@angular/router';
import { EquipmentList } from './features/equipment/pages/equipment-list/equipment-list';
import { EquipmentForm } from './features/equipment/pages/equipment-form/equipment-form';
import { CustomerList } from './features/customers/pages/customer-list/customer-list';

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
    },
    {
        path: 'equipment/:id/edit',
        component: EquipmentForm
    },
    {
        path: 'customers',
        component: CustomerList
    }
];
