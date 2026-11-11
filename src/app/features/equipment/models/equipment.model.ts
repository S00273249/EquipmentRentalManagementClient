/*  Union types restrict a property to a specific set of possible values.
    The | symbol means OR, so the value must match one of the listed strings. */

// Equipment categories supported by the backend
export type EquipmentCategory =
    | 'Camera'
    | 'Audio'
    | 'Lighting'
    | 'Computer'
    | 'Tool'
    | 'Other';

// Equipment statuses supported by the backend
export type EquipmentStatus =
    | 'Available'
    | 'Maintenance'
    | 'Retired';

// Equipment conditions supported by the backend
export type EquipmentCondition =
    | 'Excellent'
    | 'Good'
    | 'Fair'
    | 'Poor';

// Interface describing an equipment object returned by the API
export interface Equipment {
    _id: string;
    name: string;
    description: string;
    dailyRate: number;
    category: EquipmentCategory;
    status: EquipmentStatus;
    condition: EquipmentCondition;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}
