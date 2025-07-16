export interface ReservationDetail {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  purpose?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationDetailResponse {
  success: boolean;
  data?: ReservationDetail;
  error?: {
    code: string;
    message: string;
  };
}