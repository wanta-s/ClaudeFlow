import { 
  ReservationUpdateRequest, 
  ReservationUpdateResponse, 
  Reservation,
  ReservationDataStore 
} from './types';

export class ReservationEditService {
  constructor(private dataStore: ReservationDataStore) {}

  async updateReservation(request: ReservationUpdateRequest): Promise<ReservationUpdateResponse> {
    const existing = await this.dataStore.findById(request.id);
    
    if (!existing) {
      return {
        success: false,
        error: {
          code: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found'
        }
      };
    }

    const updateData: Partial<Reservation> = {};
    
    if (request.title !== undefined) updateData.title = request.title;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.startDateTime !== undefined) updateData.startDateTime = request.startDateTime;
    if (request.endDateTime !== undefined) updateData.endDateTime = request.endDateTime;
    if (request.location !== undefined) updateData.location = request.location;
    if (request.participants !== undefined) updateData.participants = request.participants;
    if (request.resourceId !== undefined) updateData.resourceId = request.resourceId;
    if (request.status !== undefined) updateData.status = request.status;

    const updated = await this.dataStore.update(
      request.id, 
      updateData, 
      existing.version
    );

    if (!updated) {
      return {
        success: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Version conflict'
        }
      };
    }

    const updatedReservation = await this.dataStore.findById(request.id);

    return {
      success: true,
      reservation: updatedReservation!
    };
  }

  async getReservationForEdit(id: string): Promise<Reservation | null> {
    return await this.dataStore.findById(id);
  }
}