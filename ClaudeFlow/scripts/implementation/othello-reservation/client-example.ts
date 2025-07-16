// クライアント側の使用例

// 予約作成
async function createGameReservation(userId: string, scheduledAt: Date) {
  const response = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, scheduledAt })
  });
  return response.json();
}

// 予約リスト取得
async function getUserReservations(userId: string) {
  const response = await fetch(`/api/reservations?userId=${userId}`);
  return response.json();
}

// 使用例
async function example() {
  // 1時間後の対戦予約を作成
  const futureDate = new Date(Date.now() + 60 * 60 * 1000);
  const reservation = await createGameReservation('user123', futureDate);
  console.log('予約作成:', reservation);
  
  // 予約リストを取得
  const myReservations = await getUserReservations('user123');
  console.log('予約一覧:', myReservations);
}