# AI駆動開発フローチャート

## 全体フロー図（改訂版：100%品質達成）

```mermaid
graph TB
    Start([開始: 新機能要求]) --> Design[詳細設計書作成]
    
    Design --> |コンテキスト圧縮| Context[設計コンテキスト作成]
    
    Context --> Phase1[フェーズ1: 最小実装]
    
    Phase1 --> Check1{動作確認}
    Check1 -->|NG| Phase1
    Check1 -->|OK| NewContext1[新Claudeインスタンス起動]
    
    NewContext1 --> Phase2[フェーズ2: リファクタリング]
    
    Phase2 --> Check2{品質確認}
    Check2 -->|NG| Phase2
    Check2 -->|OK| NewContext2[新Claudeインスタンス起動]
    
    NewContext2 --> Phase3[フェーズ3: 多角的テスト]
    
    Phase3 --> TestCheck{テスト品質<br/>100%?}
    TestCheck -->|No < 100%| Analyze[問題分析]
    
    Analyze --> ProblemType{問題種別}
    ProblemType -->|実装不足| Phase1
    ProblemType -->|設計問題| Phase2
    ProblemType -->|テスト不足| Phase3
    
    TestCheck -->|Yes 100%| NewContext3[新Claudeインスタンス起動]
    NewContext3 --> Phase4[フェーズ4: ドキュメント]
    
    Phase4 --> Complete([完了])
    
    style Start fill:#90EE90
    style Complete fill:#90EE90
    style TestCheck fill:#FFB6C1
    style NewContext1 fill:#FFE4B5
    style NewContext2 fill:#FFE4B5
    style NewContext3 fill:#FFE4B5
```

## 詳細設計フェーズ

```mermaid
graph LR
    Req[要件] --> Analysis[要件分析]
    Analysis --> FileMap[ファイルマッピング作成]
    FileMap --> Deps[依存関係定義]
    Deps --> Compress[コンテキスト圧縮]
    
    Compress --> Output{設計書出力}
    Output --> YAML[YAML形式]
    Output --> Matrix[実装マトリックス]
    Output --> Graph[依存グラフ]
```

## 最小実装フェーズ

```mermaid
graph TB
    StartImpl[最小実装開始] --> Rules{実装ルール}
    Rules --> R1[既存コード変更最小]
    Rules --> R2[新規ファイルで完結]
    Rules --> R3[1-2箇所の統合のみ]
    
    R1 & R2 & R3 --> Implement[実装]
    
    Implement --> Patterns{実装パターン選択}
    Patterns --> Adapter[アダプター]
    Patterns --> Plugin[プラグイン]
    Patterns --> Event[イベント駆動]
    
    Adapter & Plugin & Event --> Verify[動作確認]
    Verify --> QualityGate1{品質ゲート 60%}
    QualityGate1 -->|Pass| NextPhase[次フェーズへ]
    QualityGate1 -->|Fail| Implement
```

## リファクタリングフェーズ

```mermaid
graph TB
    StartRefactor[リファクタリング開始] --> PreCheck{前提条件確認}
    PreCheck -->|NG| Wait[最小実装の修正待ち]
    PreCheck -->|OK| Refactor[リファクタリング実施]
    
    Refactor --> RF1[重複除去]
    Refactor --> RF2[関数分割]
    Refactor --> RF3[命名改善]
    Refactor --> RF4[パフォーマンス改善]
    
    RF1 & RF2 & RF3 & RF4 --> Test[テスト実行]
    Test --> QualityGate2{品質ゲート 80%}
    QualityGate2 -->|Pass| Done[完了]
    QualityGate2 -->|Fail| Refactor
```

## テストフェーズ

```mermaid
graph TB
    StartTest[テスト作成開始] --> TestTypes{テストタイプ}
    TestTypes --> Unit[ユニットテスト]
    TestTypes --> Integration[統合テスト]
    TestTypes --> E2E[E2Eテスト]
    
    Unit & Integration & E2E --> Coverage{カバレッジ確認}
    Coverage -->|< 80%| AddTests[テスト追加]
    Coverage -->|>= 80%| QualityGate3{品質ゲート 95%}
    
    AddTests --> Coverage
    QualityGate3 -->|Pass| TestComplete[テスト完了]
    QualityGate3 -->|Fail| AddTests
```

## フェーズ間の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> 設計
    設計 --> 最小実装: コンテキスト作成
    
    state 最小実装 {
        [*] --> 実装中
        実装中 --> 動作確認
        動作確認 --> 実装中: NG
        動作確認 --> [*]: OK(60%)
    }
    
    最小実装 --> リファクタリング: 新Claudeインスタンス
    
    state リファクタリング {
        [*] --> 改善中
        改善中 --> 品質確認
        品質確認 --> 改善中: NG
        品質確認 --> [*]: OK(80%)
    }
    
    リファクタリング --> ドキュメント: 新Claudeインスタンス
    
    state ドキュメント {
        [*] --> 文書作成
        文書作成 --> レビュー
        レビュー --> 文書作成: NG
        レビュー --> [*]: OK
    }
    
    ドキュメント --> テスト: 新Claudeインスタンス
    
    state テスト {
        [*] --> テスト作成
        テスト作成 --> カバレッジ確認
        カバレッジ確認 --> テスト作成: < 80%
        カバレッジ確認 --> [*]: >= 80%(95%)
    }
    
    テスト --> [*]: 開発完了
```

## エラー処理とロールバック

```mermaid
graph TB
    Error[エラー発生] --> ErrorType{エラータイプ}
    
    ErrorType -->|実装エラー| Rollback1[最小実装ロールバック]
    ErrorType -->|品質エラー| Rollback2[リファクタリング取消]
    ErrorType -->|テスト失敗| Rollback3[修正または取消]
    
    Rollback1 --> FeatureFlag[フィーチャーフラグOFF]
    Rollback2 --> GitRevert[Git Revert]
    Rollback3 --> Analysis[原因分析]
    
    FeatureFlag & GitRevert & Analysis --> Recovery[復旧完了]
```

## コンテキスト管理フロー

```mermaid
graph LR
    FullContext[完全なコンテキスト] --> Compress[圧縮]
    Compress --> Phase[各フェーズ用コンテキスト]
    
    Phase --> Extract{必要情報抽出}
    Extract --> Essential[必須情報のみ]
    Extract --> Reference[参照情報]
    
    Essential --> Claude1[Claude Instance 1]
    Reference --> Claude1
    
    Claude1 --> Output1[成果物]
    Output1 --> Summary[要約作成]
    Summary --> Claude2[Claude Instance 2]
```

## 品質ゲートの詳細

```mermaid
graph TB
    Implementation[実装] --> QG1{品質ゲート1<br/>60%}
    QG1 -->|基準| C1[✓ ビルド成功]
    QG1 -->|基準| C2[✓ 基本動作]
    QG1 -->|基準| C3[✓ 影響最小]
    
    C1 & C2 & C3 -->|全てOK| Refactoring[リファクタリング]
    
    Refactoring --> QG2{品質ゲート2<br/>80%}
    QG2 -->|基準| C4[✓ 複雑度 < 10]
    QG2 -->|基準| C5[✓ 重複率 < 5%]
    QG2 -->|基準| C6[✓ テストパス]
    
    C4 & C5 & C6 -->|全てOK| Testing[テスト]
    
    Testing --> QG3{品質ゲート3<br/>95%}
    QG3 -->|基準| C7[✓ カバレッジ 80%+]
    QG3 -->|基準| C8[✓ E2Eテスト]
    QG3 -->|基準| C9[✓ ドキュメント]
    
    C7 & C8 & C9 -->|全てOK| Release[リリース準備]
```

## 全体の時間軸

```mermaid
gantt
    title AI駆動開発タイムライン
    dateFormat  YYYY-MM-DD
    section 設計
    要件分析           :a1, 2024-01-01, 1d
    詳細設計書作成     :a2, after a1, 2d
    コンテキスト圧縮   :a3, after a2, 1d
    
    section 実装
    最小実装(Claude1)  :b1, after a3, 3d
    動作確認          :b2, after b1, 1d
    
    section リファクタリング
    コード改善(Claude2):c1, after b2, 2d
    品質確認          :c2, after c1, 1d
    
    section ドキュメント
    文書作成(Claude3)  :d1, after c2, 1d
    レビュー          :d2, after d1, 1d
    
    section テスト
    テスト作成(Claude4):e1, after d2, 2d
    カバレッジ確認    :e2, after e1, 1d
```

## まとめ

このフローチャートは以下を示しています：

1. **4つの独立したClaudeインスタンス**で開発を分割
2. **各フェーズの品質ゲート**で段階的な品質向上
3. **最小限のコンテキスト**で効率的な開発
4. **明確なロールバック手順**でリスク管理

これにより、トークン使用量を最小化しながら、高品質な開発を実現できます。