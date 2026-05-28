---
inclusion: fileMatch
fileMatchPattern: "api/**"
---

# API — Workflows Index

Three operational workflows available for the API project.
Read this index first, then load the specific workflow document that matches the task.

| Trigger | Workflow | Document to load |
|---|---|---|
| "configure solution for {Organization} {Product} using .NET {N}" | Create full solution scaffold | `#api-workflow-configure-solution` |
| Spec task defining a new entity / "configure entity {EntityName}" | Add a new entity | `#api-workflow-configure-entity` |
| Spec task defining a new use case / "configure use case {Entity} {Action}" | Add a new use case | `#api-workflow-configure-usecase` |

## How to use

1. Identify which workflow matches the user's request using the trigger column above.
2. Load the corresponding workflow document via its context key (`#`).
3. Follow the workflow steps exactly — do not proceed to code generation until all mandatory gates pass.

## Preconditions

| Workflow | Requires |
|---|---|
| Configure solution | Empty `api/` folder, no `.slnx` present |
| Configure entity | Solution already scaffolded |
| Configure use case | Solution scaffolded + affected entity exists |
