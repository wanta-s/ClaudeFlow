# 自動インストール方法

## 方法1: ワンライナーインストール（最も簡単）

### Linux/macOS:
```bash
curl -sSL https://your-domain.com/install-mcp.js | node
```

### Windows (PowerShell):
```powershell
iwr -useb https://your-domain.com/install-mcp.js | node
```

## 方法2: NPXを使用（npmがインストール済みの場合）

```bash
npx mcp-tools-installer
```

## 方法3: グローバルインストール

```bash
# インストーラー自体をグローバルにインストール
npm install -g mcp-tools-installer

# その後、いつでも実行可能
install-mcp-tools
```

## 方法4: GitHubから直接実行

```bash
# Node.jsがインストールされている場合
node <(curl -s https://raw.githubusercontent.com/your-repo/main/install-mcp-tools.js)
```

## 方法5: 完全自動化スクリプト

以下を `.bashrc` や `.zshrc` に追加すると、シェル起動時に自動チェック：

```bash
# Auto-install MCP tools if not present
if ! command -v mcp-context7 &> /dev/null; then
    echo "MCP tools not found. Installing..."
    curl -sSL https://your-domain.com/install-mcp.js | node
fi
```

## CI/CD環境での自動インストール

### GitHub Actions:
```yaml
- name: Install MCP Tools
  run: |
    curl -sSL https://your-domain.com/install-mcp.js | node
```

### Docker:
```dockerfile
RUN curl -sSL https://your-domain.com/install-mcp.js | node
```

これらの方法により、ユーザーは1つのコマンドを実行するだけで、全てのMCPツールが自動的にインストールされます。