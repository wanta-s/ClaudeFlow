#!/bin/bash

# 様々なアプリタイプでコア機能識別をテストするスクリプト

echo "=== 様々なアプリタイプでのコア機能識別テスト ==="
echo ""

# カラー定義
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

# テストケース1: ECサイト
test_ecommerce() {
    echo -e "${CYAN}テスト1: ECサイト${NC}"
    
    TEST_DIR="test_ecommerce"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    cat > requirements.md << 'EOF'
# ECサイト要件
- 商品の一覧表示と検索
- 商品詳細の表示
- ショッピングカート機能
- 注文処理
- ユーザー登録とログイン
- 注文履歴
EOF

    cat > design.md << 'EOF'
# 技術設計
- Node.js + Express
- React フロントエンド
- PostgreSQL
EOF

    # features.jsonが生成されるはずなので、一時的に既存のものを削除
    rm -f ../implementation/features.json
    
    echo "生成中..."
    echo -e "1\nA" | timeout 30 bash ../scripts/hybrid-implementation.sh requirements.md design.md 2>&1 | \
        grep -A1 "features.jsonを生成中" | head -5
    
    # 生成されたfeatures.jsonを確認
    if [ -f "../implementation/features.json" ]; then
        echo ""
        echo "コア機能として識別されたもの:"
        if command -v jq &> /dev/null; then
            jq -r '.features[] | select(.core == true) | "- " + .name' ../implementation/features.json 2>/dev/null
        else
            python3 -c "
import json
with open('../implementation/features.json', 'r') as f:
    data = json.load(f)
    for f in data['features']:
        if f.get('core', False):
            print(f\"- {f['name']}\")
"
        fi
    fi
    
    cd ..
    rm -rf "$TEST_DIR"
}

# テストケース2: ブログシステム
test_blog() {
    echo ""
    echo -e "${CYAN}テスト2: ブログシステム${NC}"
    
    TEST_DIR="test_blog"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    cat > requirements.md << 'EOF'
# ブログシステム要件
- 記事の作成と編集
- 記事の公開と下書き保存
- 記事一覧と詳細表示
- カテゴリとタグ管理
- ユーザー認証
- コメント機能
EOF

    cat > design.md << 'EOF'
# 技術設計
- Next.js
- TypeScript
- Markdown対応
EOF

    rm -f ../implementation/features.json
    
    echo "生成中..."
    echo -e "1\nA" | timeout 30 bash ../scripts/hybrid-implementation.sh requirements.md design.md 2>&1 | \
        grep -A1 "features.jsonを生成中" | head -5
    
    if [ -f "../implementation/features.json" ]; then
        echo ""
        echo "コア機能として識別されたもの:"
        if command -v jq &> /dev/null; then
            jq -r '.features[] | select(.core == true) | "- " + .name' ../implementation/features.json 2>/dev/null
        else
            python3 -c "
import json
with open('../implementation/features.json', 'r') as f:
    data = json.load(f)
    for f in data['features']:
        if f.get('core', False):
            print(f\"- {f['name']}\")
"
        fi
    fi
    
    cd ..
    rm -rf "$TEST_DIR"
}

# テストケース3: チャットアプリ
test_chat() {
    echo ""
    echo -e "${CYAN}テスト3: チャットアプリ${NC}"
    
    TEST_DIR="test_chat"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    cat > requirements.md << 'EOF'
# リアルタイムチャットアプリ
- リアルタイムメッセージ送受信
- チャット履歴の表示
- オンライン状態表示
- ユーザー登録とプロフィール
- ルーム機能
EOF

    cat > design.md << 'EOF'
# 技術設計
- Node.js + Socket.io
- React
- Redis
EOF

    rm -f ../implementation/features.json
    
    echo "生成中..."
    echo -e "1\nA" | timeout 30 bash ../scripts/hybrid-implementation.sh requirements.md design.md 2>&1 | \
        grep -A1 "features.jsonを生成中" | head -5
    
    if [ -f "../implementation/features.json" ]; then
        echo ""
        echo "コア機能として識別されたもの:"
        if command -v jq &> /dev/null; then
            jq -r '.features[] | select(.core == true) | "- " + .name' ../implementation/features.json 2>/dev/null
        else
            python3 -c "
import json
with open('../implementation/features.json', 'r') as f:
    data = json.load(f)
    for f in data['features']:
        if f.get('core', False):
            print(f\"- {f['name']}\")
"
        fi
    fi
    
    cd ..
    rm -rf "$TEST_DIR"
}

# テスト実行
test_ecommerce
test_blog
test_chat

echo ""
echo "=== テスト完了 ==="
echo ""
echo "期待される結果:"
echo "- ECサイト: 商品表示、カート、注文がコア機能"
echo "- ブログ: 記事の作成・編集・表示がコア機能"
echo "- チャット: メッセージ送受信、履歴表示がコア機能"
echo "- 共通: ユーザー認証は非コア機能"