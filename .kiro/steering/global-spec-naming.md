# Spec Naming Convention

## Rule: GitHub Issue Prefix

When a spec originates from a GitHub issue, the spec folder name MUST include the issue number as a prefix.

**Format:** `gh{issue-number}-{feature-name}`

**Examples:**
- GitHub issue #1 about bootstrapping → `.kiro/specs/gh1-bootstrap-projects/`
- GitHub issue #42 about user auth → `.kiro/specs/gh42-user-authentication/`
- GitHub issue #7 about shift CRUD → `.kiro/specs/gh7-shift-management/`

## When to apply

- **Always** when the user mentions a GitHub issue number, links to a GitHub issue, or the task is clearly tied to a specific issue
- **Ask the user** if unsure whether the spec is tied to a GitHub issue
- If no GitHub issue exists, use the standard format: `.kiro/specs/{feature-name}/`

## How to determine the issue number

1. If the user explicitly says "issue #N" or "gh-N" → use that number
2. If the user provides a GitHub issue URL → extract the number from the URL
3. If the user asks to "work on issue N" → use that number
4. If creating a spec from scratch with no issue reference → do NOT add a prefix

## Additional rules

- The `{feature-name}` part follows the same kebab-case convention as always
- The prefix does NOT affect the internal spec files (requirements.md, design.md, tasks.md, .config.kiro)
- The `.config.kiro` file's `featureName` field should match the full folder name (e.g., `gh1-bootstrap-projects`)
