# NS Conversation Network

A community social network for Novi Sad residents, built by [NSRelaTech](https://github.com/NSRelaTech).

**Live app: [empathetic-stillness-production.up.railway.app](https://empathetic-stillness-production.up.railway.app)**

## Features

- **User accounts** — register, login, JWT auth with refresh tokens
- **Profiles** — avatar upload, bio, editable username/email/password
- **Posts** — create, edit, delete with optimistic UI updates
- **Feed** — home feed (followed users + joined groups), sortable by latest or popular (engagement score)
- **Reactions** — like, love, laugh, wow, sad, angry with toggle
- **Comments** — threaded comments on posts with inline create/delete
- **Groups** — create, join/leave, group feeds, admin edit/delete
- **Account management** — change username, email, password, delete account (soft delete)

## Tech Stack

### Backend
- Express 4 + TypeScript
- Prisma ORM + raw SQL (pg Pool) for feeds
- PostgreSQL (Neon)
- JWT authentication with bcrypt
- Multer + Sharp for avatar processing

### Frontend
- React 19 + TypeScript
- Vite 6
- shadcn/ui + Tailwind CSS
- TanStack Query v5 (infinite queries, optimistic updates)
- Zustand (persisted auth state)
- React Router v7

### Infrastructure
- Railway (backend + frontend services)
- Neon PostgreSQL
- Auto-deploy from GitHub push to main

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL (or Neon account)

### Setup

```bash
# Clone
git clone https://github.com/NSRelaTech/NS-conversation-network.git
cd NS-conversation-network

# Backend
npm install
cp .env.example .env  # configure DATABASE_URL, JWT_SECRET
npx prisma migrate dev
npx tsx src/bootstrap.ts

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:3000`, frontend on `http://localhost:5173`.

## Project Structure

```
├── src/                  # Backend (Express + TypeScript)
│   ├── auth/             # Authentication (JWT, refresh tokens)
│   ├── posts/            # Posts, feeds, reactions
│   ├── groups/           # Groups, memberships
│   ├── social/           # Follow system
│   ├── profiles/         # User profiles
│   └── bootstrap.ts      # App wiring & route mounting
├── frontend/             # Frontend (React + Vite)
│   └── src/
│       ├── components/   # Reusable components (feed, groups, profiles, ui)
│       ├── pages/        # Route pages
│       ├── stores/       # Zustand stores
│       └── lib/          # API client, utilities
├── prisma/               # Database schema & migrations
└── docs/                 # Planning documents
```

## Contributing

Open to contributions from the NSRelaTech community. Fork, branch, PR.

## License

MIT
