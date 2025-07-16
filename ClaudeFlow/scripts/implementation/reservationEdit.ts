// Rough implementation - 最小限の機能のみ実装

// 基本的な型定義
interface ReservationEditRequest {
  reservationId: string;
  changes: {
    title?: string;
    description?: string;
    startDateTime?: Date;
    endDateTime?: Date;
    location?: string;
    participants?: any[];
    resourceId?: string;
  };
}

interface Reservation {
  id: string;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  location: string;
  resourceId: string;
  participants: any[];
  version: number;
  updatedAt: Date;
}

// インメモリデータストア
const dataStore = new Map<string, Reservation>();

// サンプルデータ
dataStore.set('res_001', {
  id: 'res_001',
  title: '会議室予約',
  description: '定例会議',
  startDateTime: new Date('2024-01-20T10:00:00'),
  endDateTime: new Date('2024-01-20T11:00:00'),
  location: '会議室A',
  resourceId: 'room_a',
  participants: ['user_001', 'user_002'],
  version: 1,
  updatedAt: new Date()
});

class ReservationEditService {
  async editReservation(request: ReservationEditRequest) {
    // 予約取得
    const reservation = dataStore.get(request.reservationId);
    if (!reservation) {
      return { success: false };
    }

    // 変更を適用
    const updatedReservation = { ...reservation };
    const appliedChanges = [];

    if (request.changes.title !== undefined) {
      appliedChanges.push({
        field: 'title',
        oldValue: reservation.title,
        newValue: request.changes.title,
        appliedAt: new Date()
      });
      updatedReservation.title = request.changes.title;
    }

    if (request.changes.description !== undefined) {
      updatedReservation.description = request.changes.description;
    }

    if (request.changes.startDateTime !== undefined) {
      updatedReservation.startDateTime = request.changes.startDateTime;
    }

    if (request.changes.endDateTime !== undefined) {
      updatedReservation.endDateTime = request.changes.endDateTime;
    }

    if (request.changes.location !== undefined) {
      updatedReservation.location = request.changes.location;
    }

    if (request.changes.resourceId !== undefined) {
      updatedReservation.resourceId = request.changes.resourceId;
    }

    if (request.changes.participants !== undefined) {
      updatedReservation.participants = request.changes.participants;
    }

    // 更新情報
    updatedReservation.version = reservation.version + 1;
    updatedReservation.updatedAt = new Date();

    // 保存
    dataStore.set(request.reservationId, updatedReservation);

    return {
      success: true,
      reservation: updatedReservation,
      changes: appliedChanges
    };
  }

  async validateEdit(reservationId: string, changes: any) {
    // 簡易検証 - 常にtrue
    return { isValid: true };
  }
}

// エクスポート
export { ReservationEditService, ReservationEditRequest, Reservation };

// 使用例
const main = async () => {
  const editService = new ReservationEditService();
  
  const editRequest: ReservationEditRequest = {
    reservationId: 'res_001',
    changes: {
      title: '更新された会議',
      startDateTime: new Date('2024-01-20T14:00:00'),
      endDateTime: new Date('2024-01-20T15:30:00')
    }
  };

  const result = await editService.editReservation(editRequest);
  console.log('Edit result:', result);
};

// テスト実行
if (require.main === module) {
  main();
}