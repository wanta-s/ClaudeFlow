# Context Engineering Workflow for AI-First Development

## Overview
This workflow divides development tasks into specialized Claude instances to minimize context usage and maximize efficiency.

## Workflow Stages

### 1. Implementation Phase
**Purpose**: Write new features or functionality
**Context Requirements**:
- Project structure overview
- Specific feature requirements
- Related code files (minimal)
- Dependencies and libraries used

**Template**:
```markdown
## Implementation Context

### Project: [Project Name]
### Task: [Feature/Function to implement]

### Project Structure
```
src/
  components/
  utils/
  ...
```

### Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Dependencies
- Framework: [e.g., React, Vue]
- Key libraries: [list]

### Related Code
[Only include directly related files]
```

### 2. Refactoring Phase
**Purpose**: Improve code quality without changing functionality
**Context Requirements**:
- Code to refactor
- Coding standards
- Performance goals
- Design patterns in use

**Template**:
```markdown
## Refactoring Context

### Target Code
[File path and specific code section]

### Refactoring Goals
- [ ] Improve readability
- [ ] Enhance performance
- [ ] Apply design patterns
- [ ] Remove duplication

### Coding Standards
- Style guide: [link or brief description]
- Naming conventions
- File organization

### Current Metrics
- Lines of code: X
- Complexity: Y
- Dependencies: Z
```

### 3. Documentation Phase
**Purpose**: Create or update documentation
**Context Requirements**:
- Code to document
- Documentation style guide
- Target audience
- Existing documentation structure

**Template**:
```markdown
## Documentation Context

### Documentation Type
- [ ] API documentation
- [ ] User guide
- [ ] Developer guide
- [ ] README

### Target Audience
[Developers/Users/Both]

### Code to Document
[Include only the public API or main functionality]

### Documentation Style
- Format: [Markdown/JSDoc/etc.]
- Level of detail: [High/Medium/Low]
- Examples needed: [Yes/No]

### Existing Documentation Structure
[Brief overview of current docs]
```

### 4. Testing Phase
**Purpose**: Write and run tests
**Context Requirements**:
- Code to test
- Testing framework
- Test coverage goals
- Existing test patterns

**Template**:
```markdown
## Testing Context

### Testing Framework
- Framework: [Jest/Mocha/pytest/etc.]
- Test runner config: [location]

### Code to Test
[Include only the functions/modules to test]

### Test Requirements
- [ ] Unit tests
- [ ] Integration tests
- [ ] Edge cases
- [ ] Error handling

### Coverage Goals
- Target: X%
- Current: Y%

### Test Patterns
[Example of existing test structure]
```

## Workflow Orchestration

### Sequential Execution
1. **Implementation** → Generate feature code
2. **Refactoring** → Improve code quality
3. **Documentation** → Document the code
4. **Testing** → Write comprehensive tests

### Context Handoff
Between each phase, extract only essential information:

```markdown
## Handoff from Implementation to Refactoring
- Files created/modified: [list]
- Key functions: [names and purposes]
- Technical debt identified: [list]

## Handoff from Refactoring to Documentation
- Final code structure: [overview]
- Public API: [list of public methods]
- Usage examples: [if any]

## Handoff from Documentation to Testing
- Critical paths: [list]
- Edge cases identified: [list]
- Performance considerations: [list]
```

## Benefits

1. **Reduced Context Size**: Each Claude instance only receives relevant information
2. **Specialized Focus**: Each phase has clear objectives
3. **Better Token Economy**: Minimal context overlap between phases
4. **Cleaner Outputs**: Each instance produces focused results
5. **Easier Debugging**: Issues isolated to specific phases

## Best Practices

1. **Keep Context Minimal**: Only include directly relevant code
2. **Use References**: Instead of full code, use file paths and function names
3. **Summarize Previous Work**: Brief summaries instead of full outputs
4. **Define Clear Boundaries**: Each phase should have distinct start/end points
5. **Version Control**: Commit after each phase for rollback capability

## Example Usage

### Phase 1: Implementation
```bash
# Start new Claude instance
claude "Implement user authentication using the Implementation Context template"
```

### Phase 2: Refactoring
```bash
# New Claude instance with refactoring context
claude "Refactor the authentication code following the Refactoring Context template"
```

### Phase 3: Documentation
```bash
# New Claude instance for documentation
claude "Document the authentication module using the Documentation Context template"
```

### Phase 4: Testing
```bash
# New Claude instance for testing
claude "Write tests for authentication using the Testing Context template"
```

## Monitoring Efficiency

Track these metrics to optimize your workflow:
- Token usage per phase
- Time spent per phase
- Quality of outputs
- Rework required
- Context size trends

## Advanced Techniques

### 1. Context Compression
Use summaries and abstractions instead of full code:
```markdown
Instead of: [500 lines of code]
Use: "UserService class with methods: create(), authenticate(), update(), delete()"
```

### 2. Smart Includes
Only include code that will be modified:
```markdown
# DON'T include entire files
# DO include specific functions or classes
```

### 3. Progressive Enhancement
Start with minimal context, add only when needed:
```markdown
Initial: Function signatures only
If needed: Add implementation details
If needed: Add related dependencies
```

### 4. Context Templates
Create reusable templates for common tasks:
- CRUD operations
- API endpoints
- React components
- Test suites

## Troubleshooting

### Issue: Context Too Large
- Solution: Break into smaller sub-tasks
- Use more aggressive summarization
- Split files into logical chunks

### Issue: Missing Information
- Solution: Create a "shared context" file
- Include only in phases that need it
- Update after each phase

### Issue: Inconsistent Results
- Solution: Standardize templates
- Use consistent terminology
- Define clear success criteria

## Conclusion

This context engineering approach enables efficient AI-first development by:
- Minimizing token usage
- Maximizing output quality
- Maintaining clear separation of concerns
- Enabling parallel development when possible

Adapt these templates to your specific project needs and iterate based on results.