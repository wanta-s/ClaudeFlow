#!/bin/bash

# コア機能選択のテストスクリプト

echo "=== コア機能選択テスト ==="
echo ""

# カラー定義
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

# テスト用のディレクトリを作成
TEST_DIR="test_core_$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# 簡易的な要件と設計ファイルを作成
cat > requirements.md << 'EOF'
# タスク管理アプリケーション
- タスクの作成、編集、削除機能
- タスクの一覧表示
- ユーザー認証機能
EOF

cat > design.md << 'EOF'
# 技術設計
- Node.js + Express
- TypeScript
- JWT認証
EOF

# 既存のfeatures.jsonをコピー（コア属性が設定されているもの）
mkdir -p ../implementation
cp ../../implementation/features.json ../implementation/

# hybrid-implementation.shの機能選択部分だけを抽出してテスト
echo "機能選択のシミュレーション..."
echo ""

# features.jsonから機能を読み込み
if command -v jq &> /dev/null; then
    echo "検出された機能:"
    jq -r '.features[] | "\(.id): \(.name) (core: \(.core))"' ../implementation/features.json
    
    echo ""
    echo "コア機能のみ:"
    core_features=$(jq -r '.features[] | select(.core == true) | .name' ../implementation/features.json)
    core_count=$(echo "$core_features" | wc -l)
    echo -e "${GREEN}[CORE]${NC} 機能数: $core_count"
    echo "$core_features" | while read -r name; do
        echo -e "${GREEN}[CORE]${NC} - $name"
    done
else
    echo "jqが見つかりません。Pythonを使用します..."
    python3 << 'PYTHON'
import json
with open('../implementation/features.json', 'r') as f:
    data = json.load(f)
    print("検出された機能:")
    for feature in data['features']:
        print(f"{feature['id']}: {feature['name']} (core: {feature.get('core', False)})")
    
    print("\nコア機能のみ:")
    core_features = [f for f in data['features'] if f.get('core', False)]
    print(f"[CORE] 機能数: {len(core_features)}")
    for feature in core_features:
        print(f"[CORE] - {feature['name']}")
PYTHON
fi

echo ""
echo -e "${CYAN}実装時の動作:${NC}"
echo "- コア機能選択時、上記の [CORE] マークが付いた機能のみが実装されます"
echo "- 認証機能（ユーザー登録、ログイン）はスキップされます"
echo "- タスク機能は認証なしで動作するよう実装されます"

# クリーンアップ
cd ..
rm -rf "$TEST_DIR"

echo ""
echo "=== テスト完了 ===