export interface ReservationRecord {
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

export interface ResourceRecord {
  id: string;
  name: string;
  type: string;
  location?: string;
  capacity?: number;
  description?: string;
  availability: boolean;
}

export class InMemoryDataStore {
  private reservations = new Map<string, ReservationRecord>();
  private resources = new Map<string, ResourceRecord>();

  constructor() {
    this.seedData();
  }

  async findReservationById(id: string) {
    return this.reservations.get(id) || null;
  }

  async findResourceById(id: string) {
    return this.resources.get(id) || null;
  }

  private seedData() {
    const resource1: ResourceRecord = {
      id: '11111111-1111-1111-1111-111111111111',
      name: '会議室A',
      type: 'meeting_room',
      location: '3F',
      capacity: 10,
      description: 'プロジェクター付き会議室',
      availability: true
    };

    const resource2: ResourceRecord = {
      id: '22222222-2222-2222-2222-222222222222',
      name: '社用車1',
      type: 'vehicle',
      description: 'プリウス',
      availability: true
    };

    this.resources.set(resource1.id, resource1);
    this.resources.set(resource2.id, resource2);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const reservation1: ReservationRecord = {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      resourceId: resource1.id,
      resourceName: resource1.name,
      resourceType: resource1.type,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      status: 'active',
      purpose: 'プロジェクトミーティング',
      notes: '資料準備済み',
      createdAt: now,
      updatedAt: now
    };

    const reservation2: ReservationRecord = {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      resourceId: resource2.id,
      resourceName: resource2.name,
      resourceType: resource2.type,
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000),
      status: 'active',
      purpose: '客先訪問',
      createdAt: now,
      updatedAt: now
    };

    this.reservations.set(reservation1.id, reservation1);
    this.reservations.set(reservation2.id, reservation2);
  }
}