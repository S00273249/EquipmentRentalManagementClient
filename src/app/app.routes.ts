import { Routes } from '@angular/router';
import { EquipmentList } from './features/equipment/pages/equipment-list/equipment-list';
import { EquipmentForm } from './features/equipment/pages/equipment-form/equipment-form';
import { CustomerList } from './features/customers/pages/customer-list/customer-list';
import { CustomerForm } from './features/customers/pages/customer-form/customer-form';

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
    },
    {
        path: 'customers/new',
        component: CustomerForm
    },
    {
        path: 'customers/:id/edit',
        component: CustomerForm
    }
];
