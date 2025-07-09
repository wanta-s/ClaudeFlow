# Claude自動実行設定ガイド

## 概要
`--dangerously-skip-permissions --allowedTools all`を使用して、Claudeが自動的に全ツールを使用し、確認なしで動作する設定方法。

## 1. 基本的な自動実行設定

### 1.1 コマンドライン起動
```bash
# 基本的な自動実行コマンド
claude --dangerously-skip-permissions --allowedTools all

# エイリアス設定（.bashrc or .zshrc）
alias claude-auto='claude --dangerously-skip-permissions --allowedTools all'

# プロジェクト専用エイリアス
alias claude-dev='claude --dangerously-skip-permissions --allowedTools all --cwd /path/to/project'
```

### 1.2 設定ファイルでの永続化
```json
// ~/.claude/settings.json
{
  "dangerouslySkipPermissions": true,
  "allowedTools": "all",
  "autoConfirm": true,
  "defaultFlags": [
    "--dangerously-skip-permissions",
    "--allowedTools", "all"
  ]
}
```

## 2. フェーズ別自動実行スクリプト

### 2.1 実装フェーズ自動化
```bash
#!/bin/bash
# auto-implement.sh

# 実装フェーズを自動実行
run_implementation() {
  local design_file=$1
  local context=$(cat $design_file)
  
  # Claudeを自動モードで起動
  claude --dangerously-skip-permissions --allowedTools all << EOF
実装フェーズを開始します。

設計書:
$context

以下を実行してください：
1. 設計に基づいて最小実装を作成
2. 必要なファイルを自動的に作成・編集
3. 基本的な動作確認テストを実行
4. 実装完了サマリーを生成

全て自動で進めてください。
EOF
}

# 使用例
run_implementation "design/auth-api.yaml"
```

### 2.2 完全自動化ワークフロー
```bash
#!/bin/bash
# full-auto-workflow.sh

# 設定
CLAUDE_CMD="claude --dangerously-skip-permissions --allowedTools all"
PROJECT_DIR="/mnt/c/makeProc/ClaudeFlow"
LOG_DIR="$PROJECT_DIR/logs"

# フェーズ1: 実装
echo "=== Phase 1: Implementation ==="
$CLAUDE_CMD << 'EOF'
最小実装フェーズ:
- auth/AuthService.tsを作成
- 基本的な認証機能を実装
- app.tsに統合（3行以内）
- 動作確認
- 実装サマリーを/tmp/phase1-summary.yamlに出力
EOF

# フェーズ2: リファクタリング
echo "=== Phase 2: Refactoring ==="
$CLAUDE_CMD << 'EOF'
リファクタリングフェーズ:
- /tmp/phase1-summary.yamlを読み込み
- コード品質を改善
- 重複を除去
- パフォーマンスを最適化
- リファクタリングサマリーを/tmp/phase2-summary.yamlに出力
EOF

# フェーズ3: テスト
echo "=== Phase 3: Testing ==="
$CLAUDE_CMD << 'EOF'
テストフェーズ:
- /tmp/phase2-summary.yamlを読み込み
- 包括的なテストを作成
- カバレッジ100%を目指す
- 必要に応じてWeb検索でベストプラクティスを調査
- テスト結果を/tmp/phase3-results.yamlに出力
- カバレッジが100%でない場合は問題を報告
EOF

# 結果確認
if grep -q "coverage: 100" /tmp/phase3-results.yaml; then
  echo "✅ Development completed successfully!"
else
  echo "❌ Tests did not reach 100% coverage"
  # フィードバックループを開始
  ./feedback-loop.sh
fi
```

### 2.3 フィードバックループ自動化
```bash
#!/bin/bash
# feedback-loop.sh

MAX_ITERATIONS=5
ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo "=== Feedback Loop Iteration $ITERATION ==="
  
  # テスト結果を分析
  claude --dangerously-skip-permissions --allowedTools all << 'EOF'
テスト結果分析:
- /tmp/phase3-results.yamlを読み込み
- 問題の種類を特定（実装/設計/テスト）
- 修正が必要なフェーズを判定
- /tmp/fix-required.yamlに出力
EOF

  # 修正フェーズを特定
  FIX_PHASE=$(grep "phase:" /tmp/fix-required.yaml | cut -d' ' -f2)
  
  case $FIX_PHASE in
    "implementation")
      claude --dangerously-skip-permissions --allowedTools all << 'EOF'
実装修正:
- 問題箇所を修正
- 最小限の変更で対処
- 修正完了後、サマリーを更新
EOF
      ;;
    "refactoring")
      claude --dangerously-skip-permissions --allowedTools all << 'EOF'
リファクタリング再実行:
- 設計上の問題を解決
- コード構造を改善
- サマリーを更新
EOF
      ;;
    "test")
      claude --dangerously-skip-permissions --allowedTools all << 'EOF'
テスト追加:
- 不足しているテストケースを追加
- エッジケースをカバー
- 再度カバレッジを測定
EOF
      ;;
  esac
  
  # カバレッジ再確認
  claude --dangerously-skip-permissions --allowedTools all << 'EOF'
カバレッジ確認:
- 全テストを再実行
- カバレッジレポートを生成
- 100%達成か確認
- 結果を/tmp/phase3-results.yamlに更新
EOF
  
  if grep -q "coverage: 100" /tmp/phase3-results.yaml; then
    echo "✅ 100% coverage achieved!"
    break
  fi
done
```

## 3. 安全性を考慮した自動実行

### 3.1 制限付き自動実行
```bash
#!/bin/bash
# safe-auto-claude.sh

# 特定のディレクトリ内でのみ自動実行を許可
SAFE_DIR="/mnt/c/makeProc/ClaudeFlow"
CURRENT_DIR=$(pwd)

if [[ ! "$CURRENT_DIR" =~ ^"$SAFE_DIR" ]]; then
  echo "❌ Error: Auto mode only allowed in $SAFE_DIR"
  exit 1
fi

# ツールを制限した自動実行
claude --dangerously-skip-permissions \
  --allowedTools Bash,Read,Write,Edit,MultiEdit \
  "$@"
```

### 3.2 ログ付き自動実行
```bash
#!/bin/bash
# logged-auto-claude.sh

LOG_FILE="claude-auto-$(date +%Y%m%d-%H%M%S).log"

# 全ての操作をログに記録
claude --dangerously-skip-permissions --allowedTools all "$@" 2>&1 | tee "$LOG_FILE"

# 実行後のサマリー
echo "=== Execution Summary ==="
echo "Log file: $LOG_FILE"
echo "Tools used:"
grep -E "(Bash|Read|Write|Edit|WebSearch)" "$LOG_FILE" | sort | uniq -c
```

## 4. プロジェクト設定での自動化

### 4.1 プロジェクト固有の設定
```json
// project/.claude/config.json
{
  "autoMode": {
    "enabled": true,
    "permissions": {
      "dangerouslySkipPermissions": true,
      "allowedTools": "all"
    },
    "phases": {
      "implementation": {
        "autoConfirm": true,
        "maxDuration": "10m"
      },
      "refactoring": {
        "autoConfirm": true,
        "requireTests": true
      },
      "testing": {
        "autoConfirm": true,
        "coverageTarget": 100,
        "autoRetry": true
      }
    }
  }
}
```

### 4.2 Makefileでの統合
```makefile
# Makefile

CLAUDE_AUTO = claude --dangerously-skip-permissions --allowedTools all

.PHONY: implement refactor test full-cycle

implement:
	@echo "Starting implementation phase..."
	@$(CLAUDE_AUTO) < prompts/implement.txt

refactor: implement
	@echo "Starting refactoring phase..."
	@$(CLAUDE_AUTO) < prompts/refactor.txt

test: refactor
	@echo "Starting testing phase..."
	@$(CLAUDE_AUTO) < prompts/test.txt

full-cycle:
	@echo "Running full development cycle..."
	@make implement
	@make refactor
	@make test
	@echo "Development cycle completed!"

auto-fix:
	@echo "Running auto-fix loop..."
	@./scripts/feedback-loop.sh
```

## 5. CI/CD統合

### 5.1 GitHub Actions設定
```yaml
# .github/workflows/ai-development.yml
name: AI-Driven Development

on:
  issue_comment:
    types: [created]

jobs:
  auto-implement:
    if: contains(github.event.comment.body, '/ai-implement')
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Claude
      run: |
        # Claude CLIのインストール
        npm install -g @anthropic/claude-cli
        
    - name: Run Implementation
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      run: |
        claude --dangerously-skip-permissions --allowedTools all \
          "Implement the feature described in issue #${{ github.event.issue.number }}"
        
    - name: Create Pull Request
      uses: peter-evans/create-pull-request@v5
      with:
        commit-message: "AI: Implement feature from issue #${{ github.event.issue.number }}"
        branch: ai/feature-${{ github.event.issue.number }}
        title: "AI Implementation: Issue #${{ github.event.issue.number }}"
```

## 6. 監視とロールバック

### 6.1 自動実行の監視
```bash
#!/bin/bash
# monitor-auto-claude.sh

# リアルタイム監視
watch_claude() {
  local pid=$1
  local timeout=$2
  local start_time=$(date +%s)
  
  while kill -0 $pid 2>/dev/null; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [ $elapsed -gt $timeout ]; then
      echo "⏱️ Timeout reached, terminating Claude..."
      kill -TERM $pid
      break
    fi
    
    # ファイル変更を監視
    if command -v inotifywait &> /dev/null; then
      inotifywait -r -e modify,create,delete . --timeout 1
    fi
    
    sleep 1
  done
}

# 使用例
claude --dangerously-skip-permissions --allowedTools all "$@" &
CLAUDE_PID=$!
watch_claude $CLAUDE_PID 600  # 10分でタイムアウト
```

## 7. ベストプラクティス

### 7.1 段階的な自動化導入
```yaml
自動化レベル:
  レベル1: # 読み取り専用
    - allowedTools: [Read, Grep, Glob]
    - 影響: なし
    
  レベル2: # 限定的な書き込み
    - allowedTools: [Read, Write, Edit]
    - 影響: ファイル変更
    
  レベル3: # フル自動化
    - allowedTools: all
    - 影響: 全操作可能
```

### 7.2 安全装置の実装
```bash
# 重要ファイルの保護
echo "*.prod.config" >> .claude-ignore
echo "secrets/*" >> .claude-ignore
echo ".env" >> .claude-ignore

# バックアップの自動作成
alias claude-auto-safe='git stash && claude --dangerously-skip-permissions --allowedTools all'
```

## まとめ

`--dangerously-skip-permissions --allowedTools all`による自動実行により：

1. **完全自動化**: 人の介入なしで全フェーズ実行
2. **高速開発**: 確認待ちがなく連続実行
3. **一貫性**: 同じ手順で確実に実行
4. **CI/CD統合**: 自動化パイプラインに組み込み可能

適切な安全対策と組み合わせることで、効率的かつ安全な自動開発が実現できます。