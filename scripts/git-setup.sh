#!/bin/bash

# Git setup and push script
cd /mnt/c/makeProc/ClaudeFlow

echo "=== Initializing Git repository ==="
git init

echo "=== Adding remote origin ==="
git remote add origin https://github.com/wanta-s/ClaudeFlow.git

echo "=== Checking git status ==="
git status

echo "=== Adding all files ==="
git add .

echo "=== Creating commit ==="
git commit -m "Initial commit: ClaudeFlow framework

- MCP tools installer (JavaScript and Shell versions)
- Todo app example implementation
- Context engineering documentation and workflows
- Development flow scripts and templates
- Multi-language documentation (English and Japanese)

This repository provides tools and methodologies for AI-first development
using context engineering principles.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "=== Pushing to remote repository ==="
git push -u origin main

echo "=== Done! ==="
git status