# CLAUDE.md - ClaudeFlow Configuration

This file is placed in ~/.claude/CLAUDE.md by the ClaudeFlow installer.

## ClaudeFlow + Claude Code = Better Development

ClaudeFlow enhances Claude Code's capabilities by providing structured project planning and documentation that Claude Code can reference while generating code.

## How It Works

1. **You design with ClaudeFlow** - Create project structure and task breakdowns
2. **Claude Code implements** - Uses your design documents to generate consistent code
3. **Result** - Well-organized, maintainable codebase

## Workflow Integration

When using Claude Code after installing ClaudeFlow:

1. First, run ClaudeFlow scripts to generate project documentation:
   ```bash
   cd ClaudeFlow/scripts
   ./start.sh
   ```

2. Then, provide the generated documents to Claude Code:
   ```
   "Based on the project plan in [document], please implement [feature]"
   ```

3. Claude Code will generate code that follows your documented structure and requirements.

## Benefits for Claude Code

- **Clear Context**: Structured documentation helps Claude Code understand your project
- **Consistent Output**: Following a plan ensures consistent code generation
- **Better Organization**: Pre-defined structure leads to well-organized code

## Example Usage

```
User: "I need to build an e-commerce platform"

Step 1 (with ClaudeFlow): Generate project structure
Step 2 (with Claude Code): "Using the generated project plan, implement the product catalog feature"

Result: Claude Code creates code that fits perfectly into your planned architecture
```

## Repository

For templates and scripts: https://github.com/wanta-s/ClaudeFlow

## Documentation

- [English README](https://github.com/wanta-s/ClaudeFlow/blob/main/README.md)
- [Japanese Guide](https://github.com/wanta-s/ClaudeFlow/blob/main/docs/USAGE-JP.md)