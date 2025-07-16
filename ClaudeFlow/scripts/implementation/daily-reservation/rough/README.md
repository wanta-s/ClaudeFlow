# 日別予約表示機能 - Roughレベル実装

## 概要
最小限の機能のみを実装したシンプルな日別予約表示システム。

## 実装内容
- **index.ts**: コアロジック（サービスクラス、ユーティリティ関数）
- **view.tsx**: Reactビューコンポーネント
- **demo.js**: 使用例

## 特徴（Roughレベル）
- エラーハンドリングなし
- 型定義は最小限
- ハッピーパスのみ考慮
- メモリ内データストア使用

## 使い方
```bash
# デモ実行
npm run demo
```

## サンプルコード
```javascript
const service = new DailyReservationService();
const result = service.getDailyReservations('2024-01-20');
console.log(result);
```