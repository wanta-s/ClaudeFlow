import { DeleteReservationRequest, DeleteReservationResponse } from '../interfaces/reservation';
import { reservationRepository } from '../repositories/reservationRepository';

// Rough implementation - happy path only
class ReservationService {
  deleteReservation(request: DeleteReservationRequest): DeleteReservationResponse {
    const reservation = reservationRepository.findById(request.id);
    
    if (!reservation) {
      return { success: false };
    }

    const deleted = reservationRepository.delete(request.id);
    
    return {
      success: deleted,
      reservationId: deleted ? request.id : undefined
    };
  }

  deleteMultipleReservations(ids: string[]): DeleteReservationResponse {
    const deletedIds = reservationRepository.deleteMultiple(ids);
    
    return {
      success: deletedIds.length > 0,
      reservationId: deletedIds[0]
    };
  }
}

export const reservationService = new ReservationService();