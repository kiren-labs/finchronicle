# AI Optimization Guide for FinChronicle

## Purpose
This document provides guidance for optimizing AI-assisted development with Claude Code for the FinChronicle project.

---

## 1. Context Management Strategy

### Current Documentation Structure

```
.claude/
├── agents/
│   └── finchronicle-dev.md          # Custom development agent
└── skills/
    └── code-review/
        └── SKILL.md                  # Code review skill

Root-level AI context:
├── CLAUDE.md                         # Primary instructions (auto-loaded)
├── AGENTS.md                         # Architecture reference (manual)
└── ARCHITECTURE.md                   # Technical details (manual)
```

### Documentation Hierarchy (Priority Order)

1. **CLAUDE.md** (4.4k tokens) - Auto-loaded by Claude Code
   - Commands and workflows
   - Core patterns and conventions
   - Version management protocol
   - Security guidelines
   - What Claude should/shouldn't do

2. **ARCHITECTURE.md** - Load when needed for deep dives
   - File structure details
   - Data schemas
   - Function references
   - Performance considerations

3. **AGENTS.md** - ⚠️ NEEDS UPDATE - Currently outdated
   - High-level overview
   - Component responsibilities
   - Development protocols

---

## 2. Critical Issues to Fix

### Issue #1: Documentation Drift

**Problem:** AGENTS.md contains outdated information:
- References wrong version (3.3.2 vs actual 3.10.0)
- Says JS is embedded in index.html (it's in app.js)
- Says data uses localStorage (migrated to IndexedDB)
- Has line number references that are now incorrect

**Solution:**
```bash
# Option A: Update AGENTS.md to current state
# Review and update all references

# Option B: Archive it and rely on CLAUDE.md + ARCHITECTURE.md
mv AGENTS.md docs/archive/AGENTS-v3.3.2.md
```

**Recommendation:** Keep AGENTS.md as a high-level overview but remove all line numbers and version-specific details. Make it timeless.

### Issue #2: Redundant Documentation

**Problem:** Content overlap between CLAUDE.md, AGENTS.md, and ARCHITECTURE.md causes:
- Token waste (loading duplicate info)
- Conflicting information
- Maintenance burden

**Solution:**

**CLAUDE.md** (Primary - Auto-loaded)
- Commands (dev server, testing, deployment)
- Core patterns (form handling, modal pattern, etc.)
- Absolute rules (NEVER/ALWAYS sections)
- Version management protocol
- Security best practices

**ARCHITECTURE.md** (Reference - Load when needed)
- File structure with line counts
- Function reference with signatures
- Data schemas with field descriptions
- Performance metrics
- Technical deep-dives

**AGENTS.md** (Optional - Archive or simplify)
- Either remove it entirely
- OR keep only: Tech stack, high-level architecture diagram, component overview
- Remove all code examples (they're in CLAUDE.md)
- Remove all function references (they're in ARCHITECTURE.md)

---

## 3. Optimized AI Interaction Patterns

### Pattern #1: Starting a New Feature

```
User: "Add budget tracking feature"

Claude Response:
1. Reads CLAUDE.md (auto-loaded)
2. Uses finchronicle-dev agent OR enters plan mode
3. Explores codebase (Glob/Grep for relevant patterns)
4. Proposes plan with:
   - Files to modify
   - New data structure changes (IndexedDB schema)
   - UI changes
   - Testing requirements
```

**Optimization:**
- Don't say "can you provide more details?" - propose a concrete plan with assumptions
- Reference specific patterns from CLAUDE.md
- Show code examples following existing conventions

### Pattern #2: Bug Fixes

```
User: "CSV export has extra commas"

Claude Response:
1. Reads app.js exportToCSV function
2. Identifies issue
3. Shows minimal fix
4. Lists test cases
```

**Optimization:**
- Read the code BEFORE responding
- Don't ask "where is the bug?" - find it
- Show before/after code snippets

### Pattern #3: Code Review

```
User: "Review my changes" OR "/review"

Claude Response:
1. Checks git status/diff
2. Uses pr-code-reviewer agent
3. Reviews against CLAUDE.md patterns
4. Provides specific findings with file:line references
```

**Optimization:**
- Use the built-in pr-code-reviewer agent
- Reference CLAUDE.md rules explicitly
- Check IndexedDB usage, updateUI() calls, XSS prevention

### Pattern #4: Architecture Questions

```
User: "How does the filter system work?"

Claude Response:
1. Uses Explore agent with "medium" thoroughness
2. Reads relevant code sections
3. Explains with code references
```

**Optimization:**
- Load ARCHITECTURE.md if needed for context
- Provide file:line references
- Show actual code, not pseudocode

---

## 4. Agent Usage Guidelines

### When to Use Custom Agents

**finchronicle-dev agent:**
- ✅ Adding features
- ✅ Fixing bugs
- ✅ Refactoring code
- ✅ Post-code review of user implementations
- ❌ Simple questions
- ❌ Documentation updates

**pr-code-reviewer agent:**
- ✅ After significant code changes
- ✅ Before committing
- ✅ When user says "review my code"
- ❌ For every tiny change

**Explore agent:**
- ✅ "How does X work?"
- ✅ "Where is X implemented?"
- ✅ Complex codebase questions
- ❌ When you already know the answer

### Agent Invocation Best Practices

```javascript
// DON'T - Vague prompt
Task(subagent_type="finchronicle-dev",
     prompt="Add feature")

// DO - Specific prompt with context
Task(subagent_type="finchronicle-dev",
     prompt="Add budget tracking feature:
     - Add 'budget' field to IndexedDB schema
     - Add budget input form in settings tab
     - Show budget progress in summary cards
     - Calculate remaining budget per category
     - Maintain offline-first, IndexedDB patterns
     - Follow CLAUDE.md security guidelines")
```

---

## 5. Context Budget Management

Current context usage: **25.9k / 200k (13%)**

### Token Allocation Strategy

| Category | Current | Target | Notes |
|----------|---------|--------|-------|
| System prompt | 3.4k | 3.4k | Fixed by Claude |
| System tools | 17k | 17k | Fixed by Claude |
| Custom agents | 721 | <1k | Optimized |
| Memory files (CLAUDE.md) | 4.4k | <5k | Keep lean |
| Skills | 406 | <500 | Minimal |
| Messages | 8 | Variable | Conversation |
| Working space | - | ~100k | For code reading |

### Optimization Tactics

1. **Remove duplicate content** between CLAUDE.md and AGENTS.md
2. **Use references** instead of repeating code examples
3. **Leverage agent context** - agents can explore the codebase themselves
4. **Don't load ARCHITECTURE.md** unless doing deep technical work
5. **Archive old documentation** - move historical docs to docs/archive/

---

## 6. Skill System Recommendations

### Current Skills

- ✅ claude-developer-platform (built-in)
- ✅ code-review:code-review (built-in, via pr-code-reviewer agent)
- ⚠️ .claude/skills/code-review/SKILL.md (needs fixing)

### Skill vs Agent Decision

**Use Skill when:**
- Simple, repeatable command
- No exploration needed
- Example: `/commit`, `/review`

**Use Agent when:**
- Complex, multi-step task
- Needs codebase exploration
- Example: "add feature", "fix bug"

### Your Code Review Skill Issue

Your custom skill at `.claude/skills/code-review/SKILL.md` is missing required YAML frontmatter.

**Option A: Fix it**
```yaml
---
name: code-review
description: Review code changes for FinChronicle focusing on data integrity and offline-first
userInvocable: true
---

[Your content]
```

**Option B: Remove it (Recommended)**
The built-in `pr-code-reviewer` agent already does this. Remove the custom skill to reduce complexity.

---

## 7. Effective Prompting Patterns

### ❌ Ineffective Prompts

```
"Add a feature"
"Fix the bug"
"Make it better"
"Review this"
```

### ✅ Effective Prompts

```
"Add monthly budget tracking:
- Store budgets in IndexedDB
- Show progress bars in summary
- Alert when budget exceeded"

"CSV export adds extra commas in notes field with commas - investigate and fix"

"Review changes on branch feature/budget-tracking for:
- IndexedDB usage
- XSS vulnerabilities
- updateUI() calls
- Offline compatibility"
```

### Pro Tips

1. **Be specific about constraints**: "without adding dependencies", "maintain existing patterns"
2. **Reference existing patterns**: "like the category filter system"
3. **State expected behavior**: "should work offline", "should validate input"
4. **Provide context**: "this is for the insights tab", "users report this fails on mobile"

---

## 8. Version Management with AI

### Current Process (Manual)

When releasing, update 3 files:
1. `app.js` - APP_VERSION constant (line 2)
2. `sw.js` - CACHE_NAME (line 4)
3. `manifest.json` - version field

### Optimized Process (AI-Assisted)

**Option A: Create a skill**

```yaml
# .claude/skills/bump-version/skill.md
---
name: bump-version
description: Bump version in all 3 files (app.js, sw.js, manifest.json)
userInvocable: true
---

When user runs /bump-version [NEW_VERSION]:
1. Read current versions from all 3 files
2. Update APP_VERSION in app.js
3. Update CACHE_NAME in sw.js (finchronicle-vNEW_VERSION)
4. Update version in manifest.json
5. Show diff of changes
6. Ask user to confirm before writing
```

**Option B: Add to CLAUDE.md**

```markdown
## Version Bump Protocol

When user says "bump version to X.X.X":
1. Update APP_VERSION in app.js:2
2. Update CACHE_NAME in sw.js:4 to "finchronicle-vX.X.X"
3. Update version in manifest.json
4. Show all changes for review
5. Remind user to update CHANGELOG.md
```

---

## 9. Testing & Validation with AI

### Current Gap: No Automated Test Prompts

**Problem:** You manually remember test checklist from CLAUDE.md

**Solution:** Add test automation prompts

```markdown
# .claude/prompts/test-checklist.md

After code changes, run this checklist:

## Automated Checks (can run via bash)
- [ ] HTML validation: `html5validator index.html`
- [ ] JSON validation: `python3 -m json.tool manifest.json`
- [ ] Service worker registration check: `grep -q "navigator.serviceWorker.register" app.js`

## Manual Tests Required
- [ ] Open http://localhost:8000
- [ ] Disable network in DevTools → reload → app still works
- [ ] Add transaction → verify in IndexedDB
- [ ] Edit transaction → verify updates
- [ ] Delete transaction → verify removal
- [ ] Export CSV → verify format
- [ ] Import CSV → verify parsing
- [ ] Toggle dark mode → verify persistence
- [ ] Test on mobile (< 480px width)
- [ ] Test keyboard navigation
- [ ] Check console for errors
```

### AI-Assisted Testing Workflow

```
User: "Test my changes"

Claude:
1. Runs automated checks via bash
2. Lists manual test steps
3. Opens relevant DevTools URLs
4. Checks for common issues:
   - Missing updateUI() calls
   - XSS vulnerabilities
   - Offline mode breakage
```

---

## 10. Recommended Documentation Refactor

### Step 1: Update CLAUDE.md (Immediately)

- ✅ Already good, minor updates:
  - Verify all patterns match current app.js code
  - Add any new patterns from v3.7-3.10

### Step 2: Archive AGENTS.md (Next)

```bash
mkdir -p docs/archive
mv AGENTS.md docs/archive/AGENTS-v3.3.2-archived.md

# Create new simplified version
touch AGENTS.md
```

**New AGENTS.md** (Keep it simple, no line numbers):

```markdown
# Development Agents Guide

This project uses Claude Code agents for development. See CLAUDE.md for detailed patterns.

## Available Agents

- **finchronicle-dev**: Development agent for adding features, fixing bugs, refactoring
- **pr-code-reviewer**: Code review agent checking security, patterns, offline-first compliance

## Quick Reference

**Tech Stack:**
- Vanilla HTML5, CSS3, ES6+ JavaScript
- IndexedDB for data persistence
- Service Worker for offline mode
- Zero dependencies, no frameworks, no build tools

**Architecture:**
- app.js: Main application logic (~1900 lines)
- index.html: HTML structure (~440 lines)
- css/: Modular stylesheets (tokens, styles, dark-mode)
- sw.js: Service Worker for caching

**Core Patterns:**
See CLAUDE.md for detailed patterns and examples.
```

### Step 3: Maintain ARCHITECTURE.md

Keep this as detailed technical reference. Update it when:
- File structure changes
- Major refactors occur
- New systems added (e.g., IndexedDB migration)

---

## 11. Gap Analysis Summary

### Critical Gaps (Fix Now)

1. ❌ **Outdated AGENTS.md** causing hallucinations
2. ❌ **Missing YAML frontmatter** in code-review skill
3. ❌ **No version bump automation** (manual process error-prone)

### Important Gaps (Fix Soon)

4. ⚠️ **No test automation** helpers for AI
5. ⚠️ **No prompt templates** for common tasks
6. ⚠️ **Documentation duplication** wasting tokens

### Nice-to-Have Gaps (Future)

7. 📋 Feature templates in .claude/templates/
8. 📋 Pre-commit hooks for version validation
9. 📋 AI-readable test specifications

---

## 12. Action Plan

### Immediate Actions (Today)

1. **Fix AGENTS.md**
   ```bash
   mv AGENTS.md docs/archive/AGENTS-v3.3.2.md
   # Create new simplified version
   ```

2. **Fix or remove code-review skill**
   ```bash
   # Option A: Add frontmatter
   # Option B: Remove it
   rm -rf .claude/skills/code-review
   ```

3. **Review CLAUDE.md**
   - Verify patterns match current code
   - Add any missing v3.10 patterns

### Short-term Actions (This Week)

4. **Add version bump helper**
   - Create skill OR add protocol to CLAUDE.md

5. **Create test checklist file**
   - `.claude/test-checklist.md`
   - Reference from CLAUDE.md

6. **Document AI interaction patterns**
   - Add "Working with Claude" section to CONTRIBUTING.md

### Long-term Actions (Next Month)

7. **Create feature templates**
   - `.claude/templates/new-feature.md`
   - `.claude/templates/bug-fix.md`

8. **Set up automated tests**
   - Shell scripts for validation
   - Pre-commit hooks

9. **Maintain documentation**
   - Monthly review of CLAUDE.md
   - Archive old versions

---

## 13. Best Practices Summary

### For You (Human Developer)

✅ **DO:**
- Provide specific prompts with constraints
- Reference existing patterns by name
- Ask Claude to explore code before suggesting
- Use agents for complex tasks
- Keep CLAUDE.md updated with new patterns
- Archive old documentation versions

❌ **DON'T:**
- Give vague prompts like "add a feature"
- Assume Claude remembers previous conversations
- Let documentation drift from code
- Overload context with duplicate info
- Use agents for simple questions

### For Claude Code

✅ **DO:**
- Read code BEFORE suggesting changes
- Follow patterns in CLAUDE.md strictly
- Use file:line references
- Propose plans before implementing
- Check for IndexedDB usage, updateUI() calls, XSS
- Test offline mode implications

❌ **DON'T:**
- Suggest frameworks or build tools
- Add dependencies
- Make changes without reading existing code
- Ignore security guidelines
- Forget to mention version bumping
- Skip testing recommendations

---

## Appendix: Token Budget Calculator

Estimate context usage:

```
Base Claude Code system: ~20k tokens
CLAUDE.md: ~4.4k tokens
Custom agents: ~0.7k tokens
Skills: ~0.4k tokens
Conversation (10 messages): ~1k tokens
Code reading (5 files): ~10k tokens
---
Total: ~37k tokens
Remaining: ~163k tokens (81% available)
```

**Optimization Target:** Keep base context under 30k tokens, leaving 170k for active work.

---

**Last Updated:** 2026-02-19
**Version:** 3.10.0
**Maintainer:** Kiren Labs
