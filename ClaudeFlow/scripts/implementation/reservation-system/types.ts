interface Reservation {
  id: string;
  title: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  creatorName?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateReservationData {
  title: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  resourceId: string;
  creatorName?: string;
}

export { Reservation, CreateReservationData };