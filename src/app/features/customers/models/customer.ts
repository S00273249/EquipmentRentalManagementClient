export interface Customer {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCustomerDto {
    name: string;
    email: string;
    phone: string;
    address: string;
}