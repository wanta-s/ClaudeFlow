# AI駆動開発のためのコンテキストエンジニアリング・ワークフロー

## 概要
このワークフローは、開発タスクを専門化されたClaudeインスタンスに分割し、コンテキスト使用量を最小化し、効率を最大化します。

## ワークフローの段階

### 1. 実装フェーズ
**目的**: 新機能や機能を実装する
**必要なコンテキスト**:
- プロジェクト構造の概要
- 具体的な機能要件
- 関連コードファイル（最小限）
- 使用する依存関係とライブラリ

**テンプレート**:
```markdown
## 実装コンテキスト

### プロジェクト: [プロジェクト名]
### タスク: [実装する機能]

### プロジェクト構造
```
src/
  components/
  utils/
  ...
```

### 要件
- [ ] 要件1
- [ ] 要件2

### 依存関係
- フレームワーク: [例: React, Vue]
- 主要ライブラリ: [リスト]

### 関連コード
[直接関連するファイルのみを含める]
```

### 2. リファクタリングフェーズ
**目的**: 機能を変更せずにコード品質を改善する
**必要なコンテキスト**:
- リファクタリング対象のコード
- コーディング規約
- パフォーマンス目標
- 使用中のデザインパターン

**テンプレート**:
```markdown
## リファクタリングコンテキスト

### 対象コード
[ファイルパスと特定のコードセクション]

### リファクタリング目標
- [ ] 可読性の向上
- [ ] パフォーマンスの改善
- [ ] デザインパターンの適用
- [ ] 重複の除去

### コーディング規約
- スタイルガイド: [リンクまたは簡潔な説明]
- 命名規則
- ファイル構成

### 現在のメトリクス
- コード行数: X
- 複雑度: Y
- 依存関係: Z
```

### 3. ドキュメントフェーズ
**目的**: ドキュメントを作成または更新する
**必要なコンテキスト**:
- ドキュメント化するコード
- ドキュメントスタイルガイド
- 対象読者
- 既存のドキュメント構造

**テンプレート**:
```markdown
## ドキュメントコンテキスト

### ドキュメントタイプ
- [ ] APIドキュメント
- [ ] ユーザーガイド
- [ ] 開発者ガイド
- [ ] README

### 対象読者
[開発者/ユーザー/両方]

### ドキュメント化するコード
[パブリックAPIまたは主要機能のみを含める]

### ドキュメントスタイル
- 形式: [Markdown/JSDoc/など]
- 詳細レベル: [高/中/低]
- 例の必要性: [はい/いいえ]

### 既存のドキュメント構造
[現在のドキュメントの簡潔な概要]
```

### 4. テストフェーズ
**目的**: テストを作成して実行する
**必要なコンテキスト**:
- テスト対象のコード
- テストフレームワーク
- テストカバレッジ目標
- 既存のテストパターン

**テンプレート**:
```markdown
## テストコンテキスト

### テストフレームワーク
- フレームワーク: [Jest/Mocha/pytest/など]
- テストランナー設定: [場所]

### テスト対象コード
[テストする関数/モジュールのみを含める]

### テスト要件
- [ ] ユニットテスト
- [ ] 統合テスト
- [ ] エッジケース
- [ ] エラーハンドリング

### カバレッジ目標
- 目標: X%
- 現在: Y%

### テストパターン
[既存のテスト構造の例]
```

## ワークフローの調整

### 順次実行
1. **実装** → 機能コードを生成
2. **リファクタリング** → コード品質を改善
3. **ドキュメント** → コードを文書化
4. **テスト** → 包括的なテストを作成

### コンテキストの引き継ぎ
各フェーズ間で、必要な情報のみを抽出：

```markdown
## 実装からリファクタリングへの引き継ぎ
- 作成/変更されたファイル: [リスト]
- 主要な関数: [名前と目的]
- 特定された技術的負債: [リスト]

## リファクタリングからドキュメントへの引き継ぎ
- 最終的なコード構造: [概要]
- パブリックAPI: [パブリックメソッドのリスト]
- 使用例: [あれば]

## ドキュメントからテストへの引き継ぎ
- クリティカルパス: [リスト]
- 特定されたエッジケース: [リスト]
- パフォーマンスの考慮事項: [リスト]
```

## メリット

1. **コンテキストサイズの削減**: 各Claudeインスタンスは関連情報のみを受け取る
2. **専門的なフォーカス**: 各フェーズには明確な目標がある
3. **より良いトークンエコノミー**: フェーズ間の最小限のコンテキスト重複
4. **よりクリーンな出力**: 各インスタンスは焦点を絞った結果を生成
5. **デバッグの容易さ**: 問題は特定のフェーズに隔離される

## ベストプラクティス

1. **コンテキストを最小限に保つ**: 直接関連するコードのみを含める
2. **参照を使用**: 完全なコードの代わりに、ファイルパスと関数名を使用
3. **前の作業を要約**: 完全な出力の代わりに簡潔な要約
4. **明確な境界を定義**: 各フェーズには明確な開始/終了ポイントが必要
5. **バージョン管理**: ロールバック機能のために各フェーズ後にコミット

## 使用例

### フェーズ1: 実装
```bash
# 新しいClaudeインスタンスを開始
claude "実装コンテキストテンプレートを使用してユーザー認証を実装"
```

### フェーズ2: リファクタリング
```bash
# リファクタリングコンテキストで新しいClaudeインスタンス
claude "リファクタリングコンテキストテンプレートに従って認証コードをリファクタリング"
```

### フェーズ3: ドキュメント
```bash
# ドキュメント用の新しいClaudeインスタンス
claude "ドキュメントコンテキストテンプレートを使用して認証モジュールを文書化"
```

### フェーズ4: テスト
```bash
# テスト用の新しいClaudeインスタンス
claude "テストコンテキストテンプレートを使用して認証のテストを作成"
```

## 効率性の監視

ワークフローを最適化するために以下のメトリクスを追跡：
- フェーズごとのトークン使用量
- フェーズごとの所要時間
- 出力の品質
- 必要な再作業
- コンテキストサイズの傾向

## 高度なテクニック

### 1. コンテキスト圧縮
完全なコードの代わりに要約と抽象化を使用：
```markdown
代わりに: [500行のコード]
使用: "UserServiceクラス、メソッド: create(), authenticate(), update(), delete()"
```

### 2. スマートインクルード
変更されるコードのみを含める：
```markdown
# ファイル全体を含めない
# 特定の関数やクラスを含める
```

### 3. 段階的な拡張
最小限のコンテキストから始め、必要な場合のみ追加：
```markdown
初期: 関数シグネチャのみ
必要に応じて: 実装の詳細を追加
必要に応じて: 関連する依存関係を追加
```

### 4. コンテキストテンプレート
一般的なタスク用の再利用可能なテンプレートを作成：
- CRUD操作
- APIエンドポイント
- Reactコンポーネント
- テストスイート

## トラブルシューティング

### 問題: コンテキストが大きすぎる
- 解決策: より小さなサブタスクに分割
- より積極的な要約を使用
- ファイルを論理的なチャンクに分割

### 問題: 情報不足
- 解決策: 「共有コンテキスト」ファイルを作成
- 必要なフェーズでのみ含める
- 各フェーズ後に更新

### 問題: 一貫性のない結果
- 解決策: テンプレートを標準化
- 一貫した用語を使用
- 明確な成功基準を定義

## まとめ

このコンテキストエンジニアリングアプローチは、以下によってAI駆動開発を効率化します：
- トークン使用量の最小化
- 出力品質の最大化
- 関心事の明確な分離の維持
- 可能な場合の並行開発の実現

これらのテンプレートを特定のプロジェクトのニーズに合わせて調整し、結果に基づいて反復してください。