// 予約データの型定義
interface GameReservation {
  id: string;
  userId: string;
  opponentId?: string;
  scheduledAt: Date;
  createdAt: Date;
}

// インメモリストレージ
const reservations: GameReservation[] = [];

// 予約作成
export function createReservation(userId: string, scheduledAt: Date): GameReservation {
  const reservation: GameReservation = {
    id: Date.now().toString(),
    userId,
    scheduledAt,
    createdAt: new Date()
  };
  
  reservations.push(reservation);
  return reservation;
}

// 予約リスト取得
export function getReservations(userId: string): GameReservation[] {
  return reservations.filter(r => r.userId === userId || r.opponentId === userId);
}

// 予約詳細取得
export function getReservation(id: string): GameReservation | undefined {
  return reservations.find(r => r.id === id);
}