import { ReservationDetailService } from './reservationDetail';
import { ReservationDetailController, ReservationDetailView } from './reservationDetailView';

describe('ReservationDetailService (rough level)', () => {
  let service: ReservationDetailService;

  beforeEach(() => {
    service = new ReservationDetailService();
  });

  describe('getReservationDetail', () => {
    it('既存の予約IDで予約詳細を取得できる', async () => {
      const reservationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const detail = await service.getReservationDetail(reservationId);

      expect(detail).toBeDefined();
      expect(detail.id).toBe(reservationId);
      expect(detail.resourceName).toBe('会議室A');
      expect(detail.resourceType).toBe('meeting_room');
      expect(detail.status).toBe('active');
      expect(detail.purpose).toBe('プロジェクトミーティング');
    });
  });

  describe('getResourceInfo', () => {
    it('既存のリソースIDでリソース情報を取得できる', async () => {
      const resourceId = '11111111-1111-1111-1111-111111111111';
      const resource = await service.getResourceInfo(resourceId);

      expect(resource).toBeDefined();
      expect(resource.id).toBe(resourceId);
      expect(resource.name).toBe('会議室A');
      expect(resource.type).toBe('meeting_room');
      expect(resource.location).toBe('3F');
      expect(resource.capacity).toBe(10);
    });
  });

  describe('checkEditPermission', () => {
    it('開始1時間以上前のアクティブな予約は編集可能', async () => {
      const reservationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const canEdit = await service.checkEditPermission(reservationId);

      expect(canEdit).toBe(true);
    });
  });

  describe('checkDeletePermission', () => {
    it('開始24時間以上前のアクティブな予約は削除可能', async () => {
      const reservationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const canDelete = await service.checkDeletePermission(reservationId);

      expect(canDelete).toBe(true);
    });
  });
});

describe('ReservationDetailView (rough level)', () => {
  let view: ReservationDetailView;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    view = new ReservationDetailView();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('予約詳細を表示できる', () => {
    const reservation = {
      id: 'test-id',
      resourceId: 'resource-id',
      resourceName: 'テスト会議室',
      resourceType: 'meeting_room',
      startTime: new Date('2024-12-20T10:00:00'),
      endTime: new Date('2024-12-20T12:00:00'),
      status: 'active' as const,
      purpose: 'テスト目的',
      notes: 'テスト備考',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    view.displayReservationDetail(reservation);

    expect(consoleSpy).toHaveBeenCalledWith('\n=== 予約詳細 ===');
    expect(consoleSpy).toHaveBeenCalledWith('予約ID: test-id');
    expect(consoleSpy).toHaveBeenCalledWith('リソース名: テスト会議室');
    expect(consoleSpy).toHaveBeenCalledWith('目的: テスト目的');
    expect(consoleSpy).toHaveBeenCalledWith('備考: テスト備考');
  });

  it('リソース情報を表示できる', () => {
    const resource = {
      id: 'resource-id',
      name: 'テスト会議室',
      type: 'meeting_room',
      location: '2F',
      capacity: 8,
      description: 'テスト用会議室',
      availability: true
    };

    view.displayResourceInfo(resource);

    expect(consoleSpy).toHaveBeenCalledWith('\n=== リソース情報 ===');
    expect(consoleSpy).toHaveBeenCalledWith('リソース名: テスト会議室');
    expect(consoleSpy).toHaveBeenCalledWith('場所: 2F');
    expect(consoleSpy).toHaveBeenCalledWith('収容人数: 8');
    expect(consoleSpy).toHaveBeenCalledWith('利用可能: はい');
  });
});

describe('ReservationDetailController (rough level)', () => {
  let controller: ReservationDetailController;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    controller = new ReservationDetailController();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('予約詳細をロードして表示できる', async () => {
    const reservationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await controller.loadReservationDetail(reservationId);

    expect(consoleSpy).toHaveBeenCalledWith('読み込み中...');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('=== 予約詳細 ==='));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('=== リソース情報 ==='));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[編集] ボタンが表示されます'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[削除] ボタンが表示されます'));
  });
});