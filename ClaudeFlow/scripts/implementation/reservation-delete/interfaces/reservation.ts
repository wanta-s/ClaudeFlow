// Rough implementation - minimal types only
export interface Reservation {
  id: string;
  status: string;
  deletedAt?: Date;
}

export interface DeleteReservationRequest {
  id: string;
  reason?: string;
}

export interface DeleteReservationResponse {
  success: boolean;
  reservationId?: string;
}