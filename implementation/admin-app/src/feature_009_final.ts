## roughレベルの予約削除機能実装を完了しました

以下のファイルを作成：

1. **reservation-delete-types-rough.ts** - 最小限の型定義
2. **memory-store-rough.ts** - シンプルなメモリストア  
3. **reservation-delete-service-rough.ts** - メインサービス（ハッピーパスのみ）
4. **reservation-delete-example-rough.ts** - 使用例
5. **reservation-delete-test-rough.ts** - 簡易テスト

### 実装内容
- 予約のキャンセル（ソフトデリート）
- 予約の完全削除（ハードデリート）
- 複数予約の一括削除
- 削除済み予約の復元

### roughレベルの特徴
- エラーハンドリングなし（ハッピーパスのみ）
- 最小限の型定義（any型も使用）
- バリデーションなし
- ビジネスルールの省略
