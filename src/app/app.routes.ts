import { Routes } from '@angular/router';
import { EquipmentList } from './features/equipment/pages/equipment-list/equipment-list';
import { EquipmentForm } from './features/equipment/pages/equipment-form/equipment-form';
import { CustomerList } from './features/customers/pages/customer-list/customer-list';
import { CustomerForm } from './features/customers/pages/customer-form/customer-form';
import { BookingList } from './features/bookings/pages/booking-list/booking-list';
import { BookingForm } from './features/bookings/pages/booking-form/booking-form';
import { MaintenanceList } from './features/maintenance/pages/maintenance-list/maintenance-list';
import { MaintenanceForm } from './features/maintenance/pages/maintenance-form/maintenance-form';

// Define the application routes and the components displayed for each URL
export const routes: Routes = [
    // Redirect the root URL to the equipment inventory
    { path: '', redirectTo: 'equipment', pathMatch: 'full' },

    // Equipment routes for viewing, creating and editing records
    { path: 'equipment', component: EquipmentList },
    { path: 'equipment/new', component: EquipmentForm },
    { path: 'equipment/:id/edit', component: EquipmentForm },

    // Customer routes for viewing, creating and editing records
    { path: 'customers', component: CustomerList },
    { path: 'customers/new', component: CustomerForm },
    { path: 'customers/:id/edit', component: CustomerForm },

    // Booking routes for viewing, creating and editing records
    { path: 'bookings', component: BookingList },
    { path: 'bookings/new', component: BookingForm },
    { path: 'bookings/:id/edit', component: BookingForm },

    // Maintenance routes for viewing, creating and editing records
    { path: 'maintenance', component: MaintenanceList },
    { path: 'maintenance/new', component: MaintenanceForm },
    { path: 'maintenance/:id/edit', component: MaintenanceForm }
];
