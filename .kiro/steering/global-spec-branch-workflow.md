# Workflow: Branch Creation Before Spec Task Execution

## Rule: Create a dedicated branch BEFORE executing any spec task

When a spec has tasks ready for execution, Kiro MUST ensure a dedicated Git branch exists before writing any implementation code.

---

## When this applies

- **Always** before executing the first task of a spec (task wave 0 or the first `ready` task)
- This includes **bugfix specs** — the branch MUST be created before any code changes are made
- Does NOT apply to spec creation itself (requirements.md, design.md, tasks.md can be written on any branch — they are planning artifacts, not implementation code)

---

## Procedure

### Step 1 — Determine branch name

| Spec origin | Branch name | Base branch |
|---|---|---|
| GitHub issue (spec folder starts with `gh{N}-`) | `feature/GH-{N}-{feature-name}` | `develop` |
| No GitHub issue | `feature/{feature-name}` | `develop` |
| Bugfix spec | `hotfix/GH-{N}-{feature-name}` or `hotfix/{feature-name}` | `main` |

**Examples:**
- Spec folder `gh2-landing-page` → branch `feature/GH-2-landing-page`
- Spec folder `gh7-shift-management` → branch `feature/GH-7-shift-management`
- Spec folder `user-onboarding` (no issue) → branch `feature/user-onboarding`
- Spec folder `fix-android-db-crash` (bugfix, no issue) → branch `hotfix/fix-android-db-crash`
- Spec folder `gh42-fix-login-crash` (bugfix with issue) → branch `hotfix/GH-42-fix-login-crash`

### Step 2 — Check current branch

```bash
git branch --show-current
```

- If already on the correct branch → proceed with task execution
- If on `develop`, `main`, or a different branch → continue to Step 3

### Step 3 — Create or checkout the branch

```bash
# Ensure base branch is up to date
git checkout develop
git pull origin develop

# Create the feature branch (or checkout if it already exists)
git checkout -b feature/GH-{N}-{feature-name}
# If branch already exists remotely:
# git checkout feature/GH-{N}-{feature-name}
# git pull origin feature/GH-{N}-{feature-name}
```

### Step 4 — Confirm and proceed

Report to the user:
> "Created branch `feature/GH-{N}-{feature-name}` from `develop`. Proceeding with task execution."

Then continue with normal task execution.

---

## Rules

- **Never** execute implementation tasks (code changes) directly on `main` or `develop`
- Spec planning files (`.kiro/specs/**`) are exempt — they can be committed on any branch
- If the branch already exists (locally or remotely), check it out instead of creating a new one
- If there are uncommitted changes on the current branch, **stash** them before switching branches, then pop the stash after creating/switching to the target branch — only stage files relevant to the spec
- This rule works in conjunction with `global-git-workflow.md` — branch naming follows the same conventions
- **Bugfix specs** (specType = "bugfix" in `.config.kiro` or folder name starts with `fix-`) use `hotfix/` prefix and branch from `main`
- The branch name for bugfixes is derived directly from the spec folder name: folder `fix-android-db-crash` → branch `hotfix/fix-android-db-crash`

---

## Integration with spec execution

The branch check happens **once** at the start of spec task execution, not before every individual task. Once on the correct branch, all tasks in the spec execute on that branch until completion.

```
User says "run pending tasks" or "execute task X"
├── Is this the first task execution for this spec?
│   ├── YES → Run branch creation procedure (Steps 1–4)
│   └── NO → Verify still on correct branch, then proceed
└── Execute tasks normally
```
