export interface Maintenance {
    _id: string;
    equipmentId: string;
    maintenanceType: string;
    description: string;
    startDate: string;
    endDate: string;
    cost: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

// Define the data required when creating a maintenance record
export interface CreateMaintenanceDto {
    equipmentId: string;
    maintenanceType: string;
    description: string;
    startDate: string;
    endDate: string;
    cost: number;
    notes: string;
}
