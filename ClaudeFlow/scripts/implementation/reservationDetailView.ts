import { ReservationDetail, ResourceInfo, ReservationDetailService } from './reservationDetail';

export class ReservationDetailView {
  displayReservationDetail(reservation: ReservationDetail) {
    console.log('\n=== 予約詳細 ===');
    console.log(`予約ID: ${reservation.id}`);
    console.log(`リソース名: ${reservation.resourceName}`);
    console.log(`リソースタイプ: ${reservation.resourceType}`);
    console.log(`開始時刻: ${reservation.startTime.toLocaleString()}`);
    console.log(`終了時刻: ${reservation.endTime.toLocaleString()}`);
    console.log(`ステータス: ${reservation.status}`);
    if (reservation.purpose) {
      console.log(`目的: ${reservation.purpose}`);
    }
    if (reservation.notes) {
      console.log(`備考: ${reservation.notes}`);
    }
  }

  displayResourceInfo(resource: ResourceInfo) {
    console.log('\n=== リソース情報 ===');
    console.log(`リソース名: ${resource.name}`);
    console.log(`タイプ: ${resource.type}`);
    if (resource.location) {
      console.log(`場所: ${resource.location}`);
    }
    if (resource.capacity) {
      console.log(`収容人数: ${resource.capacity}`);
    }
    if (resource.description) {
      console.log(`説明: ${resource.description}`);
    }
    console.log(`利用可能: ${resource.availability ? 'はい' : 'いいえ'}`);
  }

  showEditButton(enabled: boolean) {
    if (enabled) {
      console.log('\n[編集] ボタンが表示されます');
    }
  }

  showDeleteButton(enabled: boolean) {
    if (enabled) {
      console.log('[削除] ボタンが表示されます');
    }
  }

  showLoadingState() {
    console.log('読み込み中...');
  }

  showErrorState(error: Error) {
    console.log(`エラー: ${error.message}`);
  }

  showNotFoundState() {
    console.log('予約が見つかりません');
  }
}

export class ReservationDetailController {
  private service: ReservationDetailService;
  private view: ReservationDetailView;

  constructor() {
    this.service = new ReservationDetailService();
    this.view = new ReservationDetailView();
  }

  async loadReservationDetail(reservationId: string) {
    this.view.showLoadingState();
    
    const reservation = await this.service.getReservationDetail(reservationId);
    this.view.displayReservationDetail(reservation);
    
    const resource = await this.service.getResourceInfo(reservation.resourceId);
    this.view.displayResourceInfo(resource);
    
    const canEdit = await this.service.checkEditPermission(reservationId);
    const canDelete = await this.service.checkDeletePermission(reservationId);
    
    this.view.showEditButton(canEdit);
    this.view.showDeleteButton(canDelete);
  }
}