# Meal Hacker frontend

Next.js (App Router) app for Meal Hacker. It talks to the Django API in `../backend`.

## Setup

1. Copy `.env.example` to `.env.local`. `BACKEND_URL` is the Django origin (`http://127.0.0.1:8000` locally, the Render URL on Vercel). Next rewrites `/api`, `/admin` and `/static` to it, so the browser only ever talks to the Next origin.
2. Start Django on port 8000:
   ```bash
   cd ../backend && source .venv/bin/activate && python manage.py runserver 8000
   ```
3. Install and start the frontend:
   ```bash
   npm install
   npm run dev
   ```

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Vitest unit and component tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |

## Layout

- `app/(marketing)/` public landing pages
- `app/(auth)/` login and signup; signed-in non-demo users are redirected to `/dashboard`
- `app/(app)/` signed-in pages inside the app shell; signed-out visitors are redirected to `/login?next=...`
- `app/styleguide/` design token and component reference
- `components/ui/` primitives (Button, Menu, Dialog, Toaster, ...), `components/shell/` sidebar, header and tabs, `components/auth/`, `components/marketing/`, `components/brand/`
- `lib/` API client (`api.ts`), React Query hooks (`queries.ts`), server session lookup (`session.ts`), `backend.ts` (`BACKEND_URL`)
- `middleware.ts` guards the app routes and forwards the request path as `x-pathname`
- `test/` Vitest suites
