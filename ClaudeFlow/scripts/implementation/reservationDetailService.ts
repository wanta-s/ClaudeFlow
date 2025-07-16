// Rough level implementation - minimal functionality only

interface ReservationDetail {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StorageAdapter {
  get(id: string): Promise<any>;
  exists(id: string): Promise<boolean>;
}

class ReservationDetailService {
  constructor(private storage: StorageAdapter) {}

  async getDetail(id: string): Promise<ReservationDetail> {
    const data = await this.storage.get(id);
    return data;
  }

  async exists(id: string): Promise<boolean> {
    return await this.storage.exists(id);
  }

  async getStatus(id: string): Promise<string> {
    const data = await this.storage.get(id);
    return data.status;
  }
}

export { ReservationDetailService, ReservationDetail, StorageAdapter };