export interface ReservationUpdateRequest {
  id: string;
  title?: string;
  description?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  participants?: string[];
  resourceId?: string;
  status?: 'active' | 'cancelled';
}

export interface ReservationUpdateResponse {
  success: boolean;
  reservation?: Reservation;
  error?: {
    code: string;
    message: string;
  };
}

export interface Reservation {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  participants: string[];
  resourceId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  status: 'active' | 'cancelled';
  version: number;
}

export interface ReservationDataStore {
  findById(id: string): Promise<Reservation | null>;
  update(id: string, data: Partial<Reservation>, version: number): Promise<boolean>;
  findConflictingReservations(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<Reservation[]>;
}