---
inclusion: fileMatch
fileMatchPattern: "frontend/react-web/**"
---

# Web — Tech Stack (React)

- **Runtime:** Node.js LTS
- **Language:** TypeScript (strict mode)
- **Framework:** React
- **Build tool:** Vite
- **Routing:** React Router
- **Server state:** React Query (TanStack Query)
- **Testing:** Vitest + React Testing Library

## Conventions

- Functional components only — no class components
- Use `const` arrow functions for components: `const MyComponent = () => {}`
- Prefer named exports over default exports
- Use React Query for all server state — no manual `useEffect` for data fetching
- Keep component props typed with explicit interfaces
- No `any` — use `unknown` and narrow types properly

## Common Commands

```bash
npm install           # install dependencies
npm run dev           # start dev server
npm run build         # production build
npm run preview       # preview production build locally
npm run test -- --run # run tests (single pass, no watch)
npm run lint          # lint
```
