export interface Reservation {
  id: string;
  title: string;
  startDateTime: Date;
  endDateTime: Date;
  participants: Participant[];
}

export interface Participant {
  name: string;
  email: string;
}

export interface CreateReservationRequest {
  title: string;
  startDateTime: string;
  endDateTime: string;
  participants: { name: string; email: string }[];
}