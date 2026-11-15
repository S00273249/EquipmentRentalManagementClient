// Define the possible statuses of a booking
export type BookingStatus =
    | 'Pending'
    | 'Confirmed'
    | 'Active'
    | 'Completed'
    | 'Cancelled';

// Define the structure of a booking returned by the API
export interface Booking {
    _id: string;
    customerId: string;
    equipmentId: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
    dailyRate: number;
    totalCost: number;
    createdAt: string;
    updatedAt: string;
}

// Define the data required when creating or updating a booking
export interface CreateBookingDto {
    customerId: string;
    equipmentId: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
}
