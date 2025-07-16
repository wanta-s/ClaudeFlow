#!/bin/bash

# コア機能実装のテストスクリプト（最初の1機能のみ）

echo "=== コア機能実装テスト ==="
echo ""

# テストディレクトリ作成
TEST_DIR="test_impl_$$"
mkdir -p "$TEST_DIR/src"
cd "$TEST_DIR"

# 簡易的な要件と設計
cat > requirements.md << 'EOF'
# シンプルなタスク管理
- タスクの作成と管理
EOF

cat > design.md << 'EOF'
# 技術設計
- TypeScript
- Node.js
EOF

# 最小限のfeatures.json（コア機能1つだけ）
cat > src/features.json << 'EOF'
{
  "features": [
    {
      "id": "feature_001",
      "name": "タスク作成",
      "description": "新しいタスクの作成機能",
      "priority": 1,
      "core": true,
      "dependencies": []
    }
  ]
}
EOF

echo "テスト実行: コア機能（タスク作成）のみを実装"
echo "入力: 実装レベル=1(ラフ), 機能選択=C(コア)"
echo ""

# 実装を実行（タイムアウトを設定）
echo -e "1\nC" | timeout 60 bash ../scripts/hybrid-implementation.sh requirements.md design.md 2>&1 | \
    grep -E "(CORE|コア機能|ステップ|完了|生成)" | head -30

# 生成されたファイルを確認
echo ""
echo "=== 生成されたファイル ==="
if [ -d "../implementation" ]; then
    find ../implementation -name "feature_001*" -type f 2>/dev/null | head -10
fi

# クリーンアップ
cd ..
rm -rf "$TEST_DIR"

echo ""
echo "=== テスト完了 ==="