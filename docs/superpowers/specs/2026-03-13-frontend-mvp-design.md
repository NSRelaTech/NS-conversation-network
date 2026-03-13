# Frontend MVP Design — Community Social Network

**Date:** 2026-03-13
**Status:** Approved
**Contributor:** Artem Zhiganov (NSRelaTech fork)
**Upstream:** github.com/dragan-spiridonov/community-social-network (via NSRelaTech fork)

---

## Goal

Build a complete, production-ready frontend MVP for the Community Social Network and wire up the existing backend so the full stack works end-to-end. The contribution goes back to Dragan Spiridonov's project as a PR from the NSRelaTech fork.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Fix backend + build frontend | End-to-end working stack is more valuable than a UI shell |
| Frontend scope | Auth + Feed + Groups + Profiles + Follow | Covers the complete social loop |
| Visual style | Warm community | Approachable, inclusive — not everyone at meetups is a developer |
| Deployment | Neon (Postgres) + Railway (backend + frontend) | Free DB tier, minimal cost |
| Repo structure | Monorepo (`frontend/` dir) | Matches original README vision, single PR |

## Tech Stack — Frontend

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 18 + TypeScript | Matches research doc, largest ecosystem |
| Build | Vite 5 | Fast, modern, already planned |
| Components | shadcn/ui (New York style) | High quality, customizable, warm defaults |
| Styling | Tailwind CSS 3 | Utility-first, pairs with shadcn/ui |
| Data fetching | TanStack Query v5 | Caching, refetching, loading states |
| Client state | Zustand | Lightweight, for auth/user state |
| Routing | React Router v6 | Standard, file-based layout possible |
| Forms | React Hook Form + Zod | Zod already used in backend validation |

## Repo Structure

```
community-social-network/
├── src/                    # Backend (existing, needs wiring)
├── prisma/                 # Schema (existing)
├── frontend/               # NEW — React frontend
│   ├── src/
│   │   ├── components/     # shadcn/ui + custom components
│   │   │   ├── ui/         # shadcn/ui primitives
│   │   │   ├── layout/     # Shell, nav, sidebar
│   │   │   ├── auth/       # Login, register forms
│   │   │   ├── feed/       # Post card, create post, feed list
│   │   │   ├── groups/     # Group card, group detail, create group
│   │   │   ├── profiles/   # Profile header, edit form, avatar
│   │   │   └── social/     # Follow button, follower lists
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks (useAuth, useApi, etc.)
│   │   ├── lib/            # API client, utils, constants
│   │   ├── stores/         # Zustand stores
│   │   ├── types/          # Shared TypeScript types
│   │   └── App.tsx         # Router + providers
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── components.json     # shadcn/ui config
├── package.json            # Backend
└── docker-compose.yml      # Postgres + Redis (dev)
```

## Pages & Routes

### 1. Auth (`/auth/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/auth/login` | Login | Email + password, link to register |
| `/auth/register` | Register | Username, email, password, confirm |
| `/auth/verify-email/:token` | Email verification | Landing page after clicking email link |

**Components:** `LoginForm`, `RegisterForm`, `AuthLayout` (centered card layout)

**Behavior:**
- JWT stored in memory (Zustand), refresh token in httpOnly cookie
- Redirect to feed after login
- Protected routes redirect to `/auth/login`

### 2. Feed (`/`)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home feed | Posts from followed users + joined groups |

**Components:** `FeedList`, `PostCard`, `CreatePostForm`, `ReactionBar`

**PostCard shows:** Author avatar + name, timestamp, content, reaction counts, comment count, react button

**CreatePostForm:** Text area with character count (5000 max), submit button. No media upload in MVP (simplifies scope — media URLs exist in schema but upload can come later).

**Feed algorithm (MVP):** Reverse chronological from followed users' public posts + posts in joined groups. Paginated with TanStack Query infinite scroll.

### 3. Groups (`/groups/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/groups` | Browse groups | Grid of group cards, search |
| `/groups/:slug` | Group detail | Group info, members, posts feed |
| `/groups/create` | Create group | Name, description, privacy |

**Components:** `GroupCard`, `GroupHeader`, `GroupPostFeed`, `CreateGroupForm`, `MemberList`, `JoinLeaveButton`

**GroupCard shows:** Name, description snippet, member count, privacy badge, cover image

**Group detail:** Header with cover/avatar, description, member count, join/leave button. Below: posts feed scoped to that group + create post form (if member).

### 4. Profiles (`/users/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/users/:username` | Public profile | Bio, avatar, posts, followers/following counts |
| `/settings/profile` | Edit profile | Edit display name, bio, avatar URL, location, website |

**Components:** `ProfileHeader`, `ProfilePosts`, `EditProfileForm`, `FollowButton`, `FollowerCount`

**ProfileHeader shows:** Avatar, display name, username, bio, location, website link, follower/following counts, follow/unfollow button (if not own profile), edit button (if own profile).

**ProfilePosts:** User's posts in reverse chronological order, paginated.

### 5. Social (embedded in profiles)

No standalone pages — follow/unfollow is a button on profile pages, and follower/following lists are modals or expandable sections on the profile.

**Components:** `FollowButton`, `FollowersList` (modal), `FollowingList` (modal)

## Visual Design

### Style: Warm Community

- **shadcn/ui variant:** New York (softer, rounder)
- **Mode:** Light default (no dark mode toggle in MVP)
- **Border radius:** `0.75rem` (rounded, friendly)
- **Colors:** Warm neutrals — stone/warm-gray base instead of cold slate. Primary accent: warm indigo or amber (to be decided during implementation via shadcn/ui theming)
- **Typography:** System font stack (Inter if loaded, falls back to system sans)
- **Spacing:** Generous — `p-6` cards, `gap-4` grids, breathing room
- **Cards:** Subtle shadows, warm borders, not flat
- **Avatars:** Rounded circles with warm placeholder colors

### Layout

```
┌─────────────────────────────────────────────┐
│  Logo    [Feed] [Groups]    [Avatar ▼]      │  ← Top nav
├───────────┬─────────────────┬───────────────┤
│           │                 │               │
│  Sidebar  │   Main Feed     │  Right panel  │  ← Desktop 3-col
│  (groups) │   (scrollable)  │  (suggestions)│
│           │                 │               │
└───────────┴─────────────────┴───────────────┘
```

- **Desktop:** 3-column layout (sidebar, main content, right panel)
- **Tablet:** 2-column (collapse right panel)
- **Mobile:** Single column, bottom navigation

### Navigation

- **Top bar:** Logo/name, main nav links (Feed, Groups), user avatar dropdown (Profile, Settings, Logout)
- **Sidebar (desktop):** Joined groups list, quick links
- **Mobile:** Bottom tab bar (Feed, Groups, Profile)

## Backend Work Required

The existing backend has all modules coded but `app.ts` returns 503 for all routes. To make it work:

### 1. Database Connection Bootstrap

- Add Prisma client initialization in `src/index.ts`
- Connect to Neon Postgres via `DATABASE_URL`
- Redis connection for caching/sessions (can be optional for MVP — skip Redis if it simplifies deployment)

### 2. Route Wiring

Replace the 503 placeholder routes in `app.ts` with actual route handlers:

```typescript
// Replace placeholders with:
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/profiles`, profileRoutes);
app.use(`${apiPrefix}/posts`, postRoutes);
app.use(`${apiPrefix}/groups`, groupRoutes);
app.use(`${apiPrefix}/social`, socialRoutes);
// notifications and admin can stay as 503 for MVP
```

### 3. Dependency Injection

Each module uses constructor injection (service → repository → Prisma). Need to:
- Instantiate Prisma client
- Wire up repositories with Prisma
- Wire up services with repositories
- Wire up controllers with services
- Pass controllers to route factories

### 4. Database Setup

- Create Neon project + database
- Run `prisma migrate dev` to create tables
- Verify with `prisma studio`

### 5. CORS Configuration

Update `CORS_ORIGIN` in backend to allow frontend dev server (`http://localhost:5173`) and production frontend URL.

## API Client (Frontend)

Thin wrapper around `fetch` with TanStack Query:

```typescript
// lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
    credentials: 'include', // for refresh token cookie
  });
  if (!res.ok) throw new ApiError(res);
  return res.json();
}
```

## Auth Flow

1. User registers → backend creates user + sends verification email
2. User verifies email → account activated
3. User logs in → receives JWT access token (15min) + refresh token (7d httpOnly cookie)
4. Frontend stores access token in Zustand (memory only — not localStorage)
5. TanStack Query interceptor auto-refreshes on 401

## What's NOT in MVP

- Media/image upload (posts are text-only, avatar is URL input)
- Comments (module exists in backend, can be added next)
- Notifications (module exists, can be added next)
- Admin panel
- Dark mode toggle
- Real-time/WebSocket features
- Search (basic group search via API query param, no full-text)
- Email service (skip for MVP — mark users as verified directly or use console log)

## Deployment Plan

### Development

- `docker-compose up` for local Postgres + Redis
- Backend: `npm run dev` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5173)

### Production (MVP)

- **Neon:** Free tier Postgres, connection string in Railway env vars
- **Railway:** Two services in one project:
  - Backend service: Node.js, builds from root, `npm run build && npm start`
  - Frontend service: Static site or Node.js, builds from `frontend/`, `npm run build`, serves `dist/`
- Redis: Skip for MVP (use in-memory fallbacks where possible, or Railway Redis add-on if needed)

## Success Criteria

- [ ] User can register, verify (or auto-verify for MVP), and log in
- [ ] Logged-in user sees a feed of posts
- [ ] User can create a text post
- [ ] User can browse and search groups
- [ ] User can create a group
- [ ] User can join/leave a group
- [ ] User can post in a group
- [ ] User can view any user's profile
- [ ] User can edit their own profile
- [ ] User can follow/unfollow other users
- [ ] Feed shows posts from followed users and joined groups
- [ ] All pages are responsive (mobile/tablet/desktop)
- [ ] Deployed and accessible via URL
