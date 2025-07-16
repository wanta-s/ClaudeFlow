import { Reservation, EditData, EditResponse } from './types';

const reservations = new Map<string, Reservation>();

export function editReservation(
  reservationId: string,
  editData: EditData,
  requesterId: string
): EditResponse {
  const reservation = reservations.get(reservationId);
  
  if (!reservation || reservation.createdBy !== requesterId) {
    return { success: false };
  }
  
  const updatedReservation = {
    ...reservation,
    ...editData
  };
  
  reservations.set(reservationId, updatedReservation);
  
  return {
    success: true,
    reservation: updatedReservation
  };
}

export function canEditReservation(
  reservationId: string,
  requesterId: string
): boolean {
  const reservation = reservations.get(reservationId);
  return reservation?.createdBy === requesterId;
}

export function addReservation(reservation: Reservation): void {
  reservations.set(reservation.id, reservation);
}

export function getReservation(id: string): Reservation | undefined {
  return reservations.get(id);
}