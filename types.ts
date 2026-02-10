
export type AppointmentStatus = 'pending' | 'confirmed';

export interface Appointment {
  id?: string;
  clientName: string;
  phone: string;
  services: string[]; // Alterado para array
  totalPrice: number;
  totalDuration: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  userId?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  icon: string;
}

export interface BlockedSlot {
  id?: string;
  time: string;
}

export interface CustomSlot {
  id?: string;
  time: string;
}

export interface BlockedDate {
  id?: string;
  date: string;
}
