#!/bin/bash

# Test feature selection in hybrid-implementation.sh

echo "=== Feature Selection Test ==="
echo ""

# Create test environment
TEST_DIR="test_feature_selection"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create test requirements
cat > requirements.md << 'EOF'
# Test Application
- ユーザー登録機能
- ユーザーログイン機能
- タスク作成機能
- タスク一覧機能
- タスク更新機能
EOF

# Create test design
cat > design.md << 'EOF'
# Technical Design
- Node.js + Express
- TypeScript
- JWT Authentication
EOF

# Create features.json with priorities
cat > features.json << 'EOF'
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

echo "Test 1: Checking feature display"
echo "Expected: 5 features total, 2 marked as [CORE]"
echo ""

# Test different selection modes
echo "Test 2: Testing 'C' selection (Core features only)"
echo "C" | timeout 5 bash ../hybrid-implementation.sh requirements.md design.md | grep -E "(検出された機能|CORE|コア機能のみを実装)" | head -20

echo ""
echo "Test 3: Testing number selection (1,3)"
echo "1,3" | timeout 5 bash ../hybrid-implementation.sh requirements.md design.md | grep -E "(選択しました|実装します)" | head -5

echo ""
echo "Test 4: Testing 'A' selection (All features)"
echo "A" | timeout 5 bash ../hybrid-implementation.sh requirements.md design.md | grep -E "(すべての機能を実装)" | head -5

# Cleanup
cd ..
rm -rf "$TEST_DIR"

echo ""
echo "=== Test Complete ==="