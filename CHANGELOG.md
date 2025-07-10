# Changelog

All notable changes to ClaudeFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.1] - 2025-01-10

### Restored
- Hybrid implementation mode (combining Context Engineering and Incremental approaches)
- Implementation mode selection in run-pipeline.sh (4 options)
- `hybrid-implementation.sh` script with quality validation
- `incremental-implementation.sh` script
- `HYBRID-IMPLEMENTATION.md` documentation
- `06_implementation_incremental.md` task file

### Changed
- run-pipeline.sh now offers 4 implementation modes again:
  1. Context Engineering
  2. Incremental
  3. Hybrid (recommended)
  4. Standard

## [2.6.0] - 2025-01-10

### Added
- External prompt files in `prompts/` directory for better maintainability
- Common functions library (`common-functions.sh`) with prompt loading utilities
- `load_prompt` and `apply_prompt_vars` functions for dynamic prompt management

### Changed
- Simplified implementation phase to use only Context Engineering mode
- Removed implementation mode selection from run-pipeline.sh
- All prompts are now stored in separate MD files for easier version control

### Removed
- Incremental implementation mode and related scripts
- Hybrid implementation mode and documentation
- Implementation mode selection during phase 6
- Files removed: `incremental-implementation.sh`, `hybrid-implementation.sh`, `HYBRID-IMPLEMENTATION.md`

## [2.5.0] - 2025-01-10

### Added
- Quality Validation Research phase after minimal implementation
- Automatic code quality analysis for reliability, maintainability, and reusability
- Iterative improvement process (up to 3 iterations) until quality standards are met
- Quality scoring system (5-point scale, must achieve 3+ on all items, 4+ average)
- Research results saved to context for future reference

### Changed
- Hybrid implementation now has 9 steps instead of 8
- Updated all documentation to reflect the new quality validation phase
- Improved code quality through systematic validation before testing

## [2.4.0] - 2025-01-10

### Added
- New Hybrid Implementation mode combining Context Engineering and Incremental approaches
- Created hybrid-implementation.sh script with 8-step process per feature
- Comprehensive HYBRID-IMPLEMENTATION.md documentation
- Pattern library mechanism that grows with each implemented feature
- Code metrics tracking for quality assurance
- Immediate testing after minimal implementation for early failure detection

### Changed
- Updated DEVELOPMENT-FLOW.md to include 4 implementation modes (added Hybrid)
- Modified USAGE-JP.md to recommend Hybrid implementation for new projects
- Hybrid mode is now the recommended default approach

## [2.3.0] - 2025-01-10

### Added
- Comprehensive development flowchart documentation (DEVELOPMENT-FLOW.md)
- Detailed step-by-step analysis of the entire ClaudeFlow process
- Visual flowchart showing all decision points and phases
- Explanation of three implementation modes (Context Engineering, Incremental, Standard)
- File structure diagrams showing generated outputs
- Feedback loop and testing integration documentation

### Changed
- Added links to new flowchart documentation in README.md and USAGE-JP.md

## [2.2.0] - 2025-01-10

### Added
- Context Engineering philosophy section emphasizing incremental development
- Detailed guidance on managing Claude Code's context window limitations
- "Build small, test small" approach throughout documentation
- Practical examples of context-aware development patterns
- Advanced context optimization techniques
- Troubleshooting section for context window-related issues

### Changed
- Enhanced README.md with context engineering principles
- Updated USAGE-JP.md with comprehensive small iteration examples
- Improved step-by-step implementation guidance with testing at each stage
- Added concrete examples showing proper task decomposition

## [2.1.0] - 2025-01-10

### Changed
- Reframed documentation to emphasize ClaudeFlow as a Claude Code enabler
- Updated README.md to show how ClaudeFlow helps Claude Code generate better code
- Rewrote USAGE-JP.md with practical examples of ClaudeFlow + Claude Code workflow
- Updated CLAUDE.md to explain the synergy between ClaudeFlow and Claude Code
- Changed package.json description to reflect the tool's true purpose

### Added
- Clear workflow examples showing ClaudeFlow → Claude Code process
- Practical use cases for different development scenarios
- Step-by-step guides for using both tools together

## [2.0.0] - 2025-01-10

### Changed - BREAKING
- Complete documentation overhaul to accurately reflect actual functionality
- Removed all false claims about AI automation and Claude Code integration
- Clarified that ClaudeFlow is a template generation tool, not an AI enhancement
- Updated README.md to clearly state limitations and actual features
- Rewrote USAGE-JP.md with prominent disclaimers about what the tool does NOT do
- Updated CLAUDE.md to clarify it's just a placeholder file

### Added
- Clear limitation sections in documentation
- Accurate descriptions of template generation functionality
- Honest expectations management in user guides

### Removed
- False claims about "advanced thinking modes"
- Misleading references to "token optimization"
- Unsubstantiated "AI development workflow" automation claims
- References to non-existent MCP tools and integrations

## [1.1.0] - 2025-01-10

### Changed
- Toned down overly enthusiastic language in Japanese documentation
- Fixed broken relative links in Japanese documentation
- Updated project name references from "AI-Context Flow" to "ClaudeFlow"

### Added
- Version management system with CHANGELOG.md
- Version information display in documentation

## [1.0.0] - 2025-01-09

### Added
- Initial release of ClaudeFlow
- Complete rebranding from SuperClaude to ClaudeFlow
- Japanese usage documentation (docs/USAGE-JP.md)
- Automated installation scripts for Unix/Linux/Mac
- MCP tools integration
- AI development workflow templates
- Context engineering features
- Task management system
- Compression modes for token optimization
- Extended thinking capabilities

### Removed
- PowerShell support (focusing on Unix-based systems)
- Legacy ai-development-flow directory structure