// Rough implementation - React View Component

import React, { useState, useEffect } from 'react';
import { DailyReservationService, formatDate } from './index';

// シンプルなコンポーネント実装
const DailyReservationView = ({ selectedDate, onDateChange }) => {
  const [reservations, setReservations] = useState([]);
  const service = new DailyReservationService();

  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    const result = service.getDailyReservations(dateStr);
    setReservations(result.reservations);
  }, [selectedDate]);

  return (
    <div>
      <h2>予約一覧 - {formatDate(selectedDate)}</h2>
      <input
        type="date"
        value={formatDate(selectedDate)}
        onChange={(e) => onDateChange(new Date(e.target.value))}
      />
      <div>
        {reservations.map(reservation => (
          <div key={reservation.id}>
            <p>{reservation.time} - {reservation.resourceName}</p>
            <p>{reservation.purpose}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// 予約アイテムコンポーネント
const ReservationListItem = ({ reservation }) => {
  return (
    <div>
      <strong>{reservation.time}</strong>
      <span> - {reservation.resourceName}</span>
      <p>{reservation.purpose}</p>
    </div>
  );
};

export { DailyReservationView, ReservationListItem };