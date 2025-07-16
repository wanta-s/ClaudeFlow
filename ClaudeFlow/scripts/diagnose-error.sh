#!/bin/bash

# エラー診断スクリプト

# 共通関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

echo -e "${CYAN}=== ClaudeFlowエラー診断 ===${NC}"
echo ""

# 1. 最新のログファイルを確認
latest_log=$(ls -t "$LOG_DIR"/execution_*.log 2>/dev/null | head -1)

if [ -z "$latest_log" ]; then
    echo -e "${YELLOW}警告: ログファイルが見つかりません${NC}"
    echo "実行ログが記録されていない可能性があります。"
else
    echo -e "${GREEN}最新のログファイル: $latest_log${NC}"
    
    # エラーカウント
    error_count=$(grep -c "\[ERROR\]" "$latest_log" 2>/dev/null || echo "0")
    timeout_count=$(grep -c "タイムアウト" "$latest_log" 2>/dev/null || echo "0")
    retry_count=$(grep -c "\[RETRY\]" "$latest_log" 2>/dev/null || echo "0")
    
    echo ""
    echo "エラー統計:"
    echo "  エラー数: $error_count"
    echo "  タイムアウト数: $timeout_count"
    echo "  リトライ数: $retry_count"
    
    if [ $error_count -gt 0 ]; then
        echo ""
        echo -e "${RED}=== 最近のエラー ===${NC}"
        grep -E "\[ERROR\]" "$latest_log" | tail -5
    fi
fi

echo ""
echo -e "${CYAN}=== システムチェック ===${NC}"

# 2. Claude CLIの確認
echo -n "Claude CLI: "
if command -v claude &> /dev/null; then
    echo -e "${GREEN}インストール済み${NC}"
    claude --version 2>&1 | head -1
else
    echo -e "${RED}未インストール${NC}"
    echo "  対処法: Claude CLIをインストールしてください"
fi

# 3. ネットワーク接続確認
echo -n "ネットワーク接続: "
if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}正常${NC}"
else
    echo -e "${RED}接続なし${NC}"
    echo "  対処法: インターネット接続を確認してください"
fi

# 4. APIレート制限の確認
echo ""
echo -e "${CYAN}=== API使用状況 ===${NC}"
if [ -f "$latest_log" ]; then
    api_calls=$(grep -c "\[CLAUDE_API\]" "$latest_log" 2>/dev/null || echo "0")
    api_success=$(grep -c "\[CLAUDE_API\] SUCCESS" "$latest_log" 2>/dev/null || echo "0")
    api_error=$(grep -c "\[CLAUDE_API\] ERROR" "$latest_log" 2>/dev/null || echo "0")
    
    echo "API呼び出し総数: $api_calls"
    echo "  成功: $api_success"
    echo "  失敗: $api_error"
    
    if [ $api_error -gt 5 ]; then
        echo ""
        echo -e "${YELLOW}警告: API呼び出しエラーが多発しています${NC}"
        echo "考えられる原因:"
        echo "  - APIレート制限に達している"
        echo "  - 認証トークンの問題"
        echo "  - ネットワークの不安定性"
        echo ""
        echo "推奨される対処法:"
        echo "  1. 5-10分待ってから再試行"
        echo "  2. 環境変数 CLAUDE_API_KEY を確認"
        echo "  3. より小さいバッチサイズで実行"
    fi
fi

# 5. ディスク容量確認
echo ""
echo -e "${CYAN}=== ディスク容量 ===${NC}"
df -h "$PROJECT_ROOT" | tail -1 | awk '{print "使用率: " $5 " (空き容量: " $4 ")"}'

# 6. プロセス確認
echo ""
echo -e "${CYAN}=== 実行中のプロセス ===${NC}"
if pgrep -f "hybrid-implementation\|claude" > /dev/null; then
    echo -e "${YELLOW}ClaudeFlowまたはClaudeプロセスが実行中です${NC}"
    ps aux | grep -E "(hybrid-implementation|claude)" | grep -v grep
else
    echo "実行中のClaudeFlowプロセスはありません"
fi

# 7. 推奨事項
echo ""
echo -e "${CYAN}=== 推奨事項 ===${NC}"

if [ $error_count -gt 0 ]; then
    echo "1. エラーが発生しています:"
    echo "   - ログファイルを確認: ./view-logs.sh --errors"
    echo "   - 特定の機能でエラーが発生している場合は、その機能をスキップして続行"
fi

if [ $timeout_count -gt 0 ]; then
    echo "2. タイムアウトが発生しています:"
    echo "   - より簡単な実装レベル（rough）を試す"
    echo "   - タイムアウト時間を延長する"
fi

echo ""
echo "詳細なログ確認:"
echo "  ./view-logs.sh          # 最新のログを表示"
echo "  ./view-logs.sh --summary # サマリーを表示"
echo "  ./view-logs.sh --progress # 進捗を表示"