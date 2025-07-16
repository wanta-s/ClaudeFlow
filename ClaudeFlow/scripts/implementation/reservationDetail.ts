import { InMemoryDataStore, ReservationRecord, ResourceRecord } from './dataStore';

export interface ReservationDetail {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'cancelled' | 'completed';
  purpose?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceInfo {
  id: string;
  name: string;
  type: string;
  location?: string;
  capacity?: number;
  description?: string;
  availability: boolean;
}

export class ReservationDetailService {
  private dataStore: InMemoryDataStore;

  constructor() {
    this.dataStore = new InMemoryDataStore();
  }

  async getReservationDetail(reservationId: string): Promise<ReservationDetail> {
    const reservation = await this.dataStore.findReservationById(reservationId);
    return this.mapToReservationDetail(reservation!);
  }

  async getResourceInfo(resourceId: string): Promise<ResourceInfo> {
    const resource = await this.dataStore.findResourceById(resourceId);
    return this.mapToResourceInfo(resource!);
  }

  async checkEditPermission(reservationId: string): Promise<boolean> {
    const reservation = await this.getReservationDetail(reservationId);
    if (reservation.status !== 'active') {
      return false;
    }
    const oneHourBefore = new Date(reservation.startTime.getTime() - 60 * 60 * 1000);
    return new Date() <= oneHourBefore;
  }

  async checkDeletePermission(reservationId: string): Promise<boolean> {
    const reservation = await this.getReservationDetail(reservationId);
    if (reservation.status !== 'active') {
      return false;
    }
    const twentyFourHoursBefore = new Date(reservation.startTime.getTime() - 24 * 60 * 60 * 1000);
    return new Date() <= twentyFourHoursBefore;
  }

  private mapToReservationDetail(record: ReservationRecord): ReservationDetail {
    return {
      id: record.id,
      resourceId: record.resourceId,
      resourceName: record.resourceName,
      resourceType: record.resourceType,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status,
      purpose: record.purpose,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  private mapToResourceInfo(record: ResourceRecord): ResourceInfo {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      location: record.location,
      capacity: record.capacity,
      description: record.description,
      availability: record.availability
    };
  }
}