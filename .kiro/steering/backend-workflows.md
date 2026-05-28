---
inclusion: fileMatch
fileMatchPattern: "backend/**"
---

# API — Workflows Index

Three operational workflows available for the API project.
Read this index first, then load the specific workflow document that matches the task.

| Trigger | Workflow | Document to load |
|---|---|---|
| "configure solution for {Organization} {Product} using .NET {N}" / scaffolding the backend / creating backend projects | Create full solution scaffold | `#backend-workflow-configure-solution` |
| Spec task defining a new entity / "configure entity {EntityName}" | Add a new entity | `#backend-workflow-configure-entity` |
| Spec task defining a new use case / "configure use case {Entity} {Action}" | Add a new use case | `#backend-workflow-configure-usecase` |

## MANDATORY — Workflow loading rule

**BEFORE writing ANY code in `backend/`, you MUST:**

1. Check if the task matches a trigger in the table above
2. If it matches → **STOP** and load the corresponding workflow document via `#context-key`
3. Follow that workflow document step-by-step — it contains exact file templates, NuGet packages, and code patterns
4. **NEVER** create simplified or alternative implementations — the workflow documents are the source of truth
5. If a workflow references NuGet packages (e.g., `Codenized.*`), they ARE available — the NuGet source is configured in the user's global `NuGet.Config`

**Trigger matching for "Configure solution":**
- Any spec task that creates the `.slnx`, project files, or scaffolds the backend structure
- Any task that creates `Program.cs`, `DependencyContainer.cs`, `AppSettings.cs`, Docker files, or EF Core contexts
- Keywords: "scaffold", "bootstrap", "configure solution", "create backend", "set up monorepo backend"

**If you skip loading the workflow document, the implementation WILL be wrong.** The workflow documents contain specific NuGet packages, exact property names, method signatures, and file templates that differ from generic .NET patterns.

## How to use

1. Identify which workflow matches the user's request using the trigger column above.
2. Load the corresponding workflow document via its context key (`#`).
3. Follow the workflow steps exactly — do not proceed to code generation until all mandatory gates pass.
4. **All code generation follows TDD** — write the failing test first, then implement.

## Preconditions

| Workflow | Requires |
|---|---|
| Configure solution | Empty `backend/` folder, no `.slnx` present |
| Configure entity | Solution already scaffolded |
| Configure use case | Solution scaffolded + affected entity exists |

## TDD implementation order (applies to all workflows)

When a workflow produces code with logic, follow this order:

1. **Value Object tests** → Value Object `Create()` implementation
2. **Entity tests** → Entity factory method + domain methods
3. **Use Case Service tests** → Service `Run()` implementation
4. **Request Validator tests** → Validator rules

Each step follows Red-Green-Refactor before moving to the next.

## Quality gate

```bash
dotnet test {TestProjectPath}
dotnet build {SolutionPath}
```

All tests must pass and build must succeed before considering a workflow step complete.
