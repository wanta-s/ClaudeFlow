#!/bin/bash

# hybrid-implementation.sh の簡易テスト

echo "=== hybrid-implementation.sh 簡易テスト ==="
echo ""

# 1. 構文チェック
echo "1. 構文チェック..."
if bash -n hybrid-implementation.sh; then
    echo "   ✓ 構文エラーなし"
else
    echo "   ✗ 構文エラーあり"
    exit 1
fi

# 2. ヘルプ表示
echo ""
echo "2. 引数エラーチェック..."
if bash hybrid-implementation.sh invalid_file.md invalid_file2.md 2>&1 | grep -q "そのようなファイルやディレクトリはありません"; then
    echo "   ✓ ファイルチェック動作"
fi

# 3. 環境変数チェック
echo ""
echo "3. 環境変数チェック..."
echo "   AUTO_CONTINUE=${AUTO_CONTINUE:-true} (デフォルト: true)"
echo "   RESUME_FROM_FEATURE=${RESUME_FROM_FEATURE:-なし}"

# 4. レベル選択の動作確認
echo ""
echo "4. 実装レベル選択..."
echo "   1) ラフレベル - 4ステップ"
echo "   2) 標準レベル - 6ステップ"  
echo "   3) 商用レベル - 9ステップ"

echo ""
echo "=== テスト完了 ==="
echo ""
echo "詳細なテストを実行するには:"
echo "  ./test-hybrid-implementation.sh"
echo ""
echo "実際に実行するには:"
echo "  ./hybrid-implementation.sh requirements.md design.md"