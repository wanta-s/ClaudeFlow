export interface CalendarView {
  year: number;
  month: number;
  days: CalendarDay[];
  resources: Resource[];
}

export interface CalendarDay {
  date: Date;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  reservations: ReservationSummary[];
}

export interface ReservationSummary {
  id: string;
  resourceId: string;
  resourceName: string;
  timeSlot: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  itemCount: number;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export interface Reservation {
  id: string;
  resourceId: string;
  date: Date;
  timeSlot: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  items: any[];
}