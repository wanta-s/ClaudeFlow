# エラー防止要件

## 必須のエラー防止実装

実装時には以下のエラー防止策を必ず含めてください：

### 1. DOM操作の安全性
```javascript
// ❌ 悪い例
document.getElementById('button').addEventListener('click', handler);

// ✅ 良い例
const button = document.getElementById('button');
if (button) {
    button.addEventListener('click', handler);
}
```

### 2. 配列境界チェック
```javascript
// ❌ 悪い例
return array[index];

// ✅ 良い例
if (index >= 0 && index < array.length) {
    return array[index];
}
return undefined;
```

### 3. オブジェクトプロパティの安全なアクセス
```javascript
// ❌ 悪い例
const value = obj.nested.property;

// ✅ 良い例
const value = obj?.nested?.property;
```

### 4. 非同期処理のエラーハンドリング
```javascript
// ✅ 良い例
async function fetchData() {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        // 適切なエラー処理
        return null;
    }
}
```

### 5. イベントリスナーのクリーンアップ
```javascript
// ✅ 良い例
function setupComponent() {
    const element = document.getElementById('element');
    if (!element) return;
    
    const handler = (e) => { /* ... */ };
    element.addEventListener('click', handler);
    
    // クリーンアップ関数を返す
    return () => {
        element.removeEventListener('click', handler);
    };
}
```

### 6. 型安全性（TypeScript）
```typescript
// ❌ 悪い例
function process(data: any) { /* ... */ }

// ✅ 良い例
interface Data {
    id: number;
    name: string;
}
function process(data: Data) { /* ... */ }
```

## 実装時の注意事項

1. **すべての外部入力を検証する**
2. **nullやundefinedの可能性を常に考慮する**
3. **try-catchで適切にエラーを処理する**
4. **メモリリークを防ぐためリソースを適切に解放する**
5. **セキュリティを考慮し、ユーザー入力をそのまま信用しない**