# コードレビューフェーズ

## 目的
実装されたコードの品質、保守性、セキュリティを検証し、改善点を特定する。

## タスク
1. コード品質の自動チェック
2. アーキテクチャレビュー
3. セキュリティレビュー
4. パフォーマンスレビュー
5. 改善提案と修正

## 入力
- 実装結果（06_implementation_result.md）
- テスト結果（07_testing_result.md）
- コーディング規約

## 出力フォーマット
```markdown
# コードレビューレポート

## レビューサマリー
- **レビュー期間**: [期間]
- **レビュー対象**: [ファイル数]行
- **検出問題数**: [数]
- **重大度別**: Critical: X, Major: Y, Minor: Z

## 自動チェック結果
### 静的解析（ESLint/TSLint）
```
総エラー数: 15
総警告数: 42

主な問題:
- any型の使用: 8箇所
- 未使用変数: 5箇所
- 複雑度超過: 2関数
```

### コードカバレッジ
| モジュール | 行カバレッジ | 分岐カバレッジ | 関数カバレッジ |
|-----------|-------------|---------------|---------------|
| components | 85% | 78% | 90% |
| services | 92% | 88% | 95% |
| utils | 78% | 70% | 85% |
| **全体** | **85%** | **79%** | **90%** |

## アーキテクチャレビュー
### 良い点
1. **レイヤー分離**: プレゼンテーション層とビジネスロジックが適切に分離
2. **依存性注入**: テスタビリティが高い設計
3. **デザインパターン**: Repositoryパターンの適切な使用

### 改善点
| 項目 | 現状 | 改善案 | 優先度 |
|------|------|--------|--------|
| 状態管理 | 分散している | 統一的な状態管理導入 | 高 |
| エラー処理 | 不統一 | エラーハンドリング戦略策定 | 高 |
| 循環依存 | 3箇所検出 | 依存関係の整理 | 中 |

## セキュリティレビュー
### 脆弱性スキャン結果
```
npm audit結果:
- Critical: 0
- High: 2
- Moderate: 5
- Low: 8
```

### セキュリティ問題
| 問題 | 箇所 | リスク | 対策 |
|------|------|--------|------|
| SQLインジェクション対策不足 | UserRepository | 高 | パラメータバインディング使用 |
| XSS対策不足 | 表示処理 | 中 | サニタイゼーション実装 |
| 認証トークンの扱い | localStorage | 中 | httpOnly Cookie使用 |

## パフォーマンスレビュー
### ボトルネック分析
1. **N+1クエリ問題**
   - 場所: getUsersWithPosts()
   - 影響: レスポンス時間3秒増
   - 対策: JOINまたはバッチ取得

2. **不要な再レンダリング**
   - 場所: UserList component
   - 影響: UIのもたつき
   - 対策: React.memo, useMemo使用

3. **バンドルサイズ**
   - 現状: 2.5MB
   - 目標: 1MB以下
   - 対策: コード分割、Tree shaking

## コード品質メトリクス
| メトリクス | 値 | 評価 | 目標値 |
|-----------|-----|------|--------|
| 循環的複雑度 | 8.2 | △ | < 10 |
| 重複コード率 | 12% | × | < 5% |
| 技術的負債 | 3.5日 | △ | < 2日 |

## 具体的な改善提案

### Critical Issues（即座に修正）
```typescript
// Before: SQLインジェクションの脆弱性
const query = `SELECT * FROM users WHERE id = ${userId}`;

// After: パラメータバインディング使用
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
```

### Major Issues（次スプリントで対応）
```typescript
// Before: any型の使用
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// After: 適切な型定義
interface DataItem {
  value: string;
  // 他のプロパティ
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}
```

## アクションアイテム
1. **即座対応（Critical）**
   - [ ] SQLインジェクション対策
   - [ ] XSS脆弱性修正
   - [ ] 認証トークンの安全な管理

2. **短期対応（Major）**
   - [ ] any型の排除
   - [ ] エラーハンドリング統一
   - [ ] パフォーマンス最適化

3. **中期対応（Minor）**
   - [ ] コード重複の削減
   - [ ] ドキュメント整備
   - [ ] テストカバレッジ向上

## レビュー承認条件
- ✅ Critical issuesがすべて解決
- ✅ テストがすべてパス
- ✅ カバレッジ80%以上
- ⬜ ドキュメント更新（推奨）
```

## 実行例
```bash
claude --file 08_code_review.md --file ../results/06_implementation_result.md --file ../results/07_testing_result.md > ../results/08_code_review_result.md
```