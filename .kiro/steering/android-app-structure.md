---
inclusion: fileMatch
fileMatchPattern: "frontend/android-app/**"
---

# App — Project Structure (Android/Kotlin)

```
app/
└── app/
    └── src/
        ├── main/
        │   ├── java/com/codenized/planixor/
        │   │   ├── ui/               # Activities, Fragments, ViewModels, Composables
        │   │   │   └── <feature>/    # one folder per feature
        │   │   ├── data/             # repositories, data sources, API models
        │   │   ├── domain/           # use cases, domain models
        │   │   └── di/               # Hilt modules
        │   └── res/
        │       ├── layout/           # XML layouts (if not using Compose)
        │       ├── values/           # strings, colors, themes
        │       └── drawable/
        └── test/                     # unit tests
        └── androidTest/              # instrumented tests
```

## Naming Conventions

| Element              | Convention                                      |
|----------------------|-------------------------------------------------|
| Classes              | PascalCase — `TaskListViewModel`                |
| Functions / vars     | camelCase                                       |
| Constants            | UPPER_SNAKE_CASE                                |
| Resource IDs         | snake_case — `task_list_item`                   |
| Packages             | lowercase — `com.codenized.planixor.ui.tasks`   |

## Rules

- One feature per package under `ui/` — avoid a flat list of screens
- ViewModels own UI state — Activities/Fragments only observe and render
- Domain models are separate from data/API models — map at the repository layer
- No Android framework imports in `domain/` — keep it pure Kotlin
