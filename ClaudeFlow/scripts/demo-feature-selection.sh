#!/bin/bash

# Demo script for feature selection

echo "=== Feature Selection Demo ==="
echo ""

# Ensure we have test files
if [ ! -d "test_feature_select" ]; then
    mkdir -p test_feature_select/src
    
    cat > test_feature_select/requirements.md << 'EOF'
# テストアプリケーション要件
- ユーザー登録機能 (コア機能)
- ユーザーログイン機能 (コア機能)  
- タスク作成機能
- タスク一覧機能
- タスク更新機能
EOF

    cat > test_feature_select/design.md << 'EOF'
# 技術設計
- Node.js + Express
- TypeScript
- JWT認証
EOF

    cat > test_feature_select/src/features.json << 'EOF'
{
  "features": [
    {
      "id": "feature_001",
      "name": "ユーザー登録",
      "description": "新規ユーザー登録機能",
      "priority": 1
    },
    {
      "id": "feature_002", 
      "name": "ユーザーログイン",
      "description": "JWT認証によるログイン",
      "priority": 1
    },
    {
      "id": "feature_003",
      "name": "タスク作成",
      "description": "新規タスクの作成",
      "priority": 2
    },
    {
      "id": "feature_004",
      "name": "タスク一覧",
      "description": "タスクの一覧表示",
      "priority": 2
    },
    {
      "id": "feature_005",
      "name": "タスク更新",
      "description": "タスクの更新・削除",
      "priority": 3
    }
  ]
}
EOF
fi

echo "Demo 1: コア機能のみを選択"
echo "------------------------------"
echo -e "1\nC" | bash hybrid-implementation.sh test_feature_select/requirements.md test_feature_select/design.md 2>&1 | \
    sed -n '/検出された機能/,/実装します/p' | \
    grep -E "(検出された機能|CORE|feature_|実装する機能|コア機能|個の機能)"

echo ""
echo ""
echo "Demo 2: 手動選択 (1,3番を選択)"
echo "------------------------------"
echo -e "1\n1,3" | bash hybrid-implementation.sh test_feature_select/requirements.md test_feature_select/design.md 2>&1 | \
    sed -n '/検出された機能/,/選択しました/p' | \
    grep -E "(検出された機能|CORE|feature_|実装する機能|個の機能を選択)"

echo ""
echo "=== Demo Complete ==="