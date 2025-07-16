#!/bin/bash

# safe_claude_exec関数のテストスクリプト

echo "=== safe_claude_exec関数テスト ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# テスト用のsafe_claude_exec関数をロード
source "$SCRIPT_DIR/hybrid-implementation.sh" 2>/dev/null || true

# ログ初期化
init_log_file "test-safe-claude-exec"

echo ""
echo "テスト1: 特殊文字を含むプロンプト"
echo "======================================"

# 問題のあった文字を含むプロンプト
test_prompt='以下のコードパターンに従ってください：

1. **DRY (Don'\''t Repeat Yourself)** - 重複コードは即座に抽象化
2. **Single Responsibility** - 各関数は1つの責任のみ
3. **Error-First** - エラーケースを先に処理

```typescript
const example = () => {
    // Don'\''t do this
    if (condition) {
        // nested code
    }
}
```

特殊文字テスト: $, ", '\''", `, \, |, &, ;, >, <, (, ), {, }, [, ]'

echo "プロンプト内容:"
echo "$test_prompt" | head -5
echo "..."
echo ""

# テスト実行
output_file="/tmp/test_output.txt"
echo "safe_claude_exec実行中..."

# モック実行（実際のClaude呼び出しは行わない）
if command -v claude &> /dev/null; then
    echo "Claude CLIが見つかりました。実際のAPIをテストします。"
    echo "注意: これは実際のAPI呼び出しを行います。"
    echo -n "続行しますか？ (y/N): "
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        if safe_claude_exec "$test_prompt" "$output_file" "特殊文字テスト" 1 10; then
            echo "✅ テスト成功！"
            echo ""
            echo "出力ファイルの最初の10行:"
            head -10 "$output_file"
        else
            echo "❌ テスト失敗"
        fi
    else
        echo "テストをスキップしました。"
    fi
else
    echo "Claude CLIが見つかりません。モックテストを実行します。"
    
    # モック用の一時ファイルテスト
    temp_prompt=$(mktemp)
    echo "$test_prompt" > "$temp_prompt"
    
    # ファイルが正しく作成されたか確認
    if [ -f "$temp_prompt" ]; then
        echo "✅ 一時ファイル作成成功"
        
        # 特殊文字が正しく保存されているか確認
        if grep -q "Don't Repeat Yourself" "$temp_prompt"; then
            echo "✅ 特殊文字が正しく保存されています"
        else
            echo "❌ 特殊文字の保存に問題があります"
        fi
        
        # catコマンドでファイルを読めるか確認
        if cat_output=$(cat "$temp_prompt" 2>&1); then
            echo "✅ catコマンドで正常に読み込めます"
        else
            echo "❌ catコマンドでエラー: $cat_output"
        fi
        
        rm -f "$temp_prompt"
    else
        echo "❌ 一時ファイル作成失敗"
    fi
fi

echo ""
echo "テスト2: エラーハンドリング"
echo "=========================="

# 存在しないコマンドでテスト
echo "存在しないコマンドでのテストをシミュレート..."
log_step "エラーテスト" "START"
log_error_detail "テストエラー" "これはテストエラーです"
log_step "エラーテスト" "ERROR" "意図的なエラー"

echo "✅ エラーログ記録完了"

echo ""
echo "=== テスト完了 ==="
echo ""
echo "ログファイル: $LOG_FILE"
echo "最新のログエントリ:"
tail -10 "$LOG_FILE"