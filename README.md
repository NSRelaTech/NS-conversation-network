# NS Conversation Network

A community social network for Novi Sad residents, built by [NSRelaTech](https://github.com/NSRelaTech).

Inspired by the [Conversation Networks](https://arxiv.org/abs/2503.11714) paper (Roy, Lessig, Tang 2025), which proposes digital infrastructure for civic communication — where quality comes from structured, facilitated conversations rather than algorithmic feeds.

**Live app: [empathetic-stillness-production.up.railway.app](https://empathetic-stillness-production.up.railway.app)**

## Vision

The long-term goal is to evolve from a traditional social network toward a conversation network — a platform where community members engage through structured dialogue, not just posts and likes.

Key principles from the paper guiding our direction:

- **Conversations over content** — meaningful community discourse, not engagement-optimized feeds
- **Three forms of civic communication** — bridging (across divides), listening (leaders hearing authentic voices), deliberation (collective reasoning toward decisions)
- **AI as assistive, never mediating** — technology should expand participation and reveal patterns, but never come between people
- **Interoperability** — open standards that allow community tools to work together

The current MVP establishes the social foundation. Future iterations will introduce facilitated group conversations, structured deliberation flows, and conversation-first features.

## Current Features

- **User accounts** — register, login, JWT auth with refresh tokens
- **Profiles** — avatar upload, bio, editable username/email/password
- **Posts** — create, edit, delete with optimistic UI updates
- **Feed** — home feed (followed users + joined groups), sortable by latest or popular
- **Likes** — toggle like on posts
- **Comments** — inline comments on posts
- **Groups** — create, join/leave, group feeds, admin edit/delete
- **Account management** — change username, email, password, delete account

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

## References

- Roy, D., Lessig, L., & Tang, A. (2025). *Conversation Networks*. arXiv:2503.11714. https://arxiv.org/abs/2503.11714

## License

MIT
