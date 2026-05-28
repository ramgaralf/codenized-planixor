---
inclusion: fileMatch
fileMatchPattern: "web/**"
---

# Web — Project Structure

```
web/
├── public/
├── src/
│   ├── components/       # reusable UI components
│   ├── pages/            # route-level components
│   ├── hooks/            # custom React hooks
│   ├── services/         # API client calls
│   ├── store/            # global state (if needed)
│   ├── types/            # shared TypeScript types/interfaces
│   └── main.tsx          # app entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Naming Conventions

| Element              | Convention                                      |
|----------------------|-------------------------------------------------|
| Component files      | PascalCase — `TaskList.tsx`                     |
| Hook files           | camelCase prefixed with `use` — `useTaskList.ts`|
| Service files        | camelCase — `taskService.ts`                    |
| CSS/style files      | Same name as component — `TaskList.module.css`  |
| Types/interfaces     | PascalCase — `Task`, `TaskListProps`            |

## Rules

- Co-locate component styles and tests with the component file
- No business logic in components — extract to hooks or services
- All API calls go through `services/` — never fetch directly from a component
- Pages only compose components — no logic beyond routing concerns
