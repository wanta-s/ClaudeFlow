#!/bin/bash

# 機能選択フローのテストスクリプト

echo "=== 機能選択フローテスト ==="
echo ""

# テスト用ディレクトリ作成
TEST_DIR="test_flow_$$"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# 移動
cd "$TEST_DIR"

# 要件ファイル作成
cat > requirements.md << 'EOF'
# テストアプリケーション
- ユーザー管理機能
- タスク管理機能
EOF

# 設計ファイル作成
cat > design.md << 'EOF'
# 技術設計
- Node.js + Express
- TypeScript
EOF

# 実行結果を確認
echo "Test 1: 構文チェック"
if bash -n ../hybrid-implementation.sh; then
    echo "✓ 構文OK"
else
    echo "✗ 構文エラー"
fi

echo ""
echo "Test 2: 実装フロー開始（ラフレベル、全機能）"
echo -e "1\nA" | timeout 60 bash ../hybrid-implementation.sh requirements.md design.md 2>&1 | tee output.log | grep -E "(機能を特定|検出された機能|すべての機能を実装|ステップ[0-9]:|✓|完了)" | head -30

echo ""
echo "Test 3: 実装された機能の確認"
if [ -d "../../implementation" ]; then
    echo "実装ディレクトリ:"
    find ../../implementation -name "*.ts" -o -name "*.js" -o -name "*.md" | head -10
fi

# クリーンアップ
cd ..
rm -rf "$TEST_DIR"

echo ""
echo "=== テスト完了 ==="