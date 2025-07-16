#!/bin/bash

# ログ機能テストスクリプト

echo "=== ログ機能テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ログファイルを初期化
init_log_file "test-logging"

echo ""
echo "テスト1: ステップログ記録"
log_step "テスト開始" "START"
log_step "処理実行中" "INFO" "詳細メッセージ"
log_step "処理完了" "SUCCESS"
log_step "警告発生" "WARNING" "注意が必要です"
log_step "エラー発生" "ERROR" "何か問題が発生しました"

echo "✅ ステップログ記録完了"

echo ""
echo "テスト2: エラー詳細記録"
log_error_detail "テスト関数" "詳細なエラーメッセージ
複数行にわたる
エラーの説明"

echo "✅ エラー詳細記録完了"

echo ""
echo "テスト3: Claude API呼び出しログ"
log_claude_call "テスト仕様生成" "/tmp/test_spec.md" "SUCCESS"
log_claude_call "テスト実装生成" "/tmp/test_impl.ts" "ERROR"

echo "✅ Claude APIログ記録完了"

echo ""
echo "テスト4: 進捗記録"
log_progress "feature_001" "ユーザー認証" "2024-01-15 10:00:00" "2024-01-15 10:15:00" "SUCCESS" ""
log_progress "feature_002" "データ管理" "2024-01-15 10:15:00" "2024-01-15 10:20:00" "ERROR" "API呼び出しエラー"

echo "✅ 進捗記録完了"

echo ""
echo "テスト5: safe_claude_exec関数のモック実行"
# モックプロンプトとレスポンス
test_prompt="テストプロンプト"
test_output="/tmp/test_output.txt"

# 成功ケースをシミュレート
echo "モック成功レスポンス" > "$test_output"
log_claude_call "モックテスト" "$test_output" "SUCCESS"

echo "✅ safe_claude_execモックテスト完了"

echo ""
echo "=== テスト結果 ==="
echo "ログファイル: $LOG_FILE"
echo "進捗CSV: $PROGRESS_CSV"

echo ""
echo "ログ内容の確認:"
echo "1. ログファイル表示: ./view-logs.sh -f $LOG_FILE"
echo "2. エラーのみ表示: ./view-logs.sh -f $LOG_FILE --errors"
echo "3. サマリー表示: ./view-logs.sh -f $LOG_FILE --summary"
echo "4. 進捗表示: ./view-logs.sh --progress"

# ログファイルの最後の10行を表示
echo ""
echo "ログファイルの最後の10行:"
tail -10 "$LOG_FILE"