# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
GradeBook Admin Panel — a React SPA (Vite + TypeScript + Refine/Ant Design) for managing an educational gradebook. It talks to a **remote** backend API at `https://gradebook-backend-xhw2.onrender.com/api/v1`; there is no backend in this repo.

### Dev commands
| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite, port 5173) |
| Type-check | `npx tsc -b` |
| Build | `npm run build` |

### Notes
- No linter or test runner is configured in `package.json`. `npx tsc -b` is the primary correctness check.
- The backend API URL is **hardcoded** in `src/lib/api.ts` and `src/dataProvider.ts` — no `.env` files needed.
- Default login credentials are pre-filled in the Login form: `admin` / `Password123!`.
- The remote backend on Render may cold-start (~30 s) on first request if it has been idle.
- Auth tokens are stored in `localStorage` (`gradebook_access_token`, `gradebook_refresh_token`, `gradebook_user`).
