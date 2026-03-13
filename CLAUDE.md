# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Community social network for Novi Sad residents, evolving toward decentralized civic infrastructure. See `docs/2026-03-13-roadmap-design.md` for the full roadmap (DDS, AT Protocol, Plurality alignment).

Live at: https://empathetic-stillness-production.up.railway.app

## Commands

### Backend (root directory)
```bash
npm run dev              # Start dev server (ts-node-dev, port 3000)
npm run build            # Compile TypeScript (tsc || true)
npm start                # Run compiled JS (dist/index.js)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npx prisma migrate dev   # Run migrations locally
npx prisma studio        # DB browser
```

### Frontend (frontend/)
```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc -b && vite build (STRICT — catches unused vars that tsc --noEmit misses)
npm run preview          # Serve built frontend locally
```

Railway builds use `tsc -b && vite build` — stricter than `tsc --noEmit`. Always verify with `npm run build` in `frontend/` before pushing.

### Environment
```
DATABASE_URL=            # Neon PostgreSQL connection string
JWT_SECRET=              # JWT signing key
NODE_ENV=production      # For Railway
CORS_ORIGIN=             # Frontend URL for CORS
VITE_API_URL=            # Backend API URL (frontend env)
```

## Architecture

### Dual data access (tech debt)
The backend uses **both** Prisma ORM and raw SQL via pg Pool. This is the #1 source of bugs:
- **Prisma**: Auth (`src/auth/`), groups (`src/groups/`), comments, profiles — use `PrismaClient`
- **Raw SQL**: Posts, feeds, reactions (`src/posts/`) — use `Pool` from `pg`

Both are initialized in `src/bootstrap.ts`. Migrating to Prisma-only is Phase 0 of the roadmap.

### Backend structure
`src/bootstrap.ts` is the central wiring file — it instantiates all services and mounts all routes. Some endpoints (comments, account management, avatar upload) are defined inline in bootstrap rather than in separate route files.

Pattern: `Repository → Service → Controller → Routes`, but inconsistently applied. Some modules follow it (posts, groups, auth), some are inline Prisma calls.

**No-op stubs**: Several interfaces are satisfied with no-op implementations (`NoopRequestRepository`, `NoopPermissionCache`, `NoopAuditLogger`, noop block/profile repositories). These exist to satisfy constructor signatures of inherited service classes without implementing the full feature.

### Domain model mapping gotcha
`PrismaMemberRepository.mapRoleFromDb` converts DB `ADMIN` → domain `'owner'`, `MEMBER` → `'member'`. The frontend must check for `'owner'`, not `'ADMIN'`, when checking admin permissions.

### API
All routes under `/api/v1/`. Auth middleware via JWT Bearer token. Responses follow `{ success: boolean, data?: T, error?: string }`.

### Frontend structure
- **State**: Zustand (`stores/auth.ts`) with localStorage persistence (`ns-auth` key)
- **Data fetching**: TanStack Query v5 with infinite queries for feeds
- **API client**: `lib/api.ts` — wraps fetch with auth token injection and automatic refresh on 401
- **Routing**: React Router v7, protected routes via `ProtectedRoute` wrapper in `App.tsx`
- **UI**: shadcn/ui (New York variant) + Tailwind CSS v4 + Geist font
- **Feed sorting**: `latest` (chronological) or `popular` (reaction_count + comment_count * 2)

### Infrastructure
- **Railway**: Backend service (`NS-conversation-network`) + Frontend service (`empathetic-stillness`), auto-deploy from GitHub push to main
- **Neon**: PostgreSQL database (project: `twilight-field-68099751`)
- **Frontend serving**: `serve` package serving `dist/` with SPA fallback (`-s` flag)

## Known issues

- ~50 pre-existing TypeScript strict mode errors
- Prisma schema has models for features not exposed in UI (notifications, blocks, multiple reaction types) — only likes are implemented in the frontend
- Avatars stored as base64 data URLs in the database (no external storage)
