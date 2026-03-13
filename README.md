# NS Conversation Network

A community social network for Novi Sad residents, built by [NSRelaTech](https://github.com/NSRelaTech).

Inspired by ideas from:
- [Conversation Networks](https://arxiv.org/abs/2503.11714) (Roy, Lessig, Tang 2025) — civic communication infrastructure
- [Decentralized Deliberation Standard](https://www.dds.xyz) (DDS) — open protocol for interoperable deliberation
- [Plurality](https://plurality.net/) (Tang, Weyl) — plural governance and collaborative technology

**Live app: [empathetic-stillness-production.up.railway.app](https://empathetic-stillness-production.up.railway.app)**

## Vision

Evolving from a social network toward a conversation network — where community members engage through structured deliberation, not just posts and likes.

**Core principles:**

- **Conversations over content** — meaningful discourse, not engagement-optimized feeds
- **AI as assistive, never mediating** — technology expands participation and reveals patterns, but never comes between people
- **Interoperability** — open standards (DDS, AT Protocol) that allow deliberation tools to work together
- **Plural governance** — decision-making mechanisms that respect diverse perspectives

## Roadmap

The current MVP establishes the social foundation. The roadmap builds toward decentralized civic infrastructure:

| Phase | Focus | Key deliverable |
|-------|-------|-----------------|
| **0** | Tech debt cleanup | Prisma-only data access, TS strict fixes |
| **1** | Decentralized identity | DID:PLC identity with AT Protocol, GitHub OAuth, and wallet sign-in |
| **2** | Structured conversations | DDS-aligned deliberation in groups (Plan/Collect/Analyze) |
| **3** | DDS interop | AT Protocol records, external tool integration, federation |
| **4** | Plural governance | Quadratic voting, ranked choice, quadratic funding |

See [`docs/2026-03-13-roadmap-design.md`](docs/2026-03-13-roadmap-design.md) for the full roadmap spec.

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
- Decentralized Deliberation Standard. https://www.dds.xyz
- Tang, A., & Weyl, E. G. *Plurality: The Future of Collaborative Technology and Democracy*. https://github.com/pluralitybook/plurality

## License

MIT
