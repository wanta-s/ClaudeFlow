単体テストを生成しました。

**生成ファイル:**
- `index.test.ts`: 基本的な正常系テスト
- `run-tests.sh`: テスト実行スクリプト
- `package.json`: テスト用依存関係を追加

**テスト内容（roughレベル）:**
- getDailyReservations: 指定日の予約取得、時間順ソート、空配列の処理
- getReservationById: ID検索、存在しないIDの処理
- formatDate: 日付フォーマット変換

簡易テストランナーを実装し、最小限の動作確認が可能です。
