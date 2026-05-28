# Git & Repository Workflow

Applies to all sub-projects (`backend/`, `frontend/react-web/`, `frontend/android-app/`).

## Repository structure

```
{product-name}-{service-name}/
├── docs/       # product documentation (*.md)
├── src/        # solution and projects
│   ├── Solution.slnx
│   ├── Project1/
│   └── Project.../
└── README.md
```

## GitFlow methodology

Two permanent branches:

| Branch | Purpose |
|---|---|
| `main` | Production code |
| `develop` | Active development — all features merge here |

Temporary branch types:

| Type | Prefix | Base | Purpose |
|---|---|---|---|
| Feature | `feature/` | `develop` (or User Story branch) | New functionality |
| Hotfix | `hotfix/` | `main` (or User Story branch if tied to one) | Production bug fix |
| Release | `release/` | `develop` or hotfix | Version bump before merging to `main` |

## Branch naming

Format: `{prefix}/{JIRA-KEY}-{summary-with-hyphens}`

```
feature/PROJ-123-update-customer-onboarding-flow   ← User Story, base: develop
feature/PROJ-456-add-audit-log-endpoint            ← Dev task, base: User Story branch
hotfix/PROJ-789-fix-null-reference-on-login        ← Bug not tied to story, base: main
hotfix/PROJ-321-correct-date-parsing-on-reports    ← Bug tied to story, base: story branch
```

## Jira → branch mapping

| Jira issue type | GitFlow branch type | Base branch |
|---|---|---|
| User Story | `feature/` | `develop` |
| Development task | `feature/` | User Story branch that originated the task |
| Hotfix / Bug (no User Story) | `hotfix/` | `main` |
| Hotfix / Bug (linked to User Story) | `hotfix/` | User Story branch |

**Rule**: if the base branch does not exist yet, create it first before creating the ticket branch.

## Branch decision flow

```
What is the Jira issue type?
├── User Story
│   └── base = develop
├── Development task
│   ├── Has linked User Story? → base = feature/{US-KEY}-{summary}
│   └── No linked User Story  → base = develop
└── Hotfix / Bug
    ├── Linked to User Story? → base = feature/{US-KEY}-{summary}
    └── Not linked           → base = main
```

## Commit conventions

Use Conventional Commits format:
```
feat(contact): add ContactAdd use case
fix(auth): correct null reference on token validation
chore(deps): update EF Core to 10.0.7
docs(readme): update setup instructions
```

## Rules

- No direct commits to `main` or `develop`
- Always pull the base branch before creating a new branch
- Branch names use hyphens, not underscores or spaces
- One branch per Jira ticket
