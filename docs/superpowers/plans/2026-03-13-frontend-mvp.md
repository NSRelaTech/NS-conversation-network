# Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working React + shadcn/ui frontend and wire up the existing Express backend so the community social network is end-to-end functional.

**Architecture:** Monorepo — backend at root (`src/`), frontend in `frontend/`. Backend needs type fixes, Prisma repository implementations, and route wiring. Frontend is a new Vite + React + shadcn/ui app with TanStack Query for data fetching and Zustand for auth state.

**Tech Stack:** React 18, TypeScript, Vite 5, shadcn/ui (New York), Tailwind CSS, TanStack Query v5, Zustand, React Router v6, React Hook Form + Zod

**Spec:** `docs/superpowers/specs/2026-03-13-frontend-mvp-design.md`

---

## Chunk 1: Backend Fixes & Wiring

### Task 1: Fix auth types — number → string (UUID)

The auth module uses `number` for all IDs but Prisma uses UUID strings. Fix all auth types to use `string`.

**Files:**
- Modify: `src/auth/auth.types.ts`
- Modify: `src/auth/auth.routes.ts`
- Modify: `src/auth/auth.service.ts`
- Modify: `src/profiles/profile.controller.ts` (has local `AuthenticatedRequest` with `id: number`)
- Modify: `src/social/follow.controller.ts` (has local `AuthenticatedRequest` with `userId: number`)
- Modify: `src/posts/post.controller.ts` (verify it reads `req.user?.id` correctly)

**Important:** Multiple controllers define their own local `AuthenticatedRequest` interface that shadows the global Express type. After fixing the global type in `auth.routes.ts`, you MUST also fix these local interfaces in `profile.controller.ts`, `follow.controller.ts`, and `post.controller.ts` to use `{ id: string; email: string; role: string }`. Otherwise the controllers will read `req.user?.userId` (undefined after the fix) or use `number` types that don't match UUID strings.

- [ ] **Step 1: Fix User, UserPublic, CreateUserData, RegisterResponse IDs**

In `src/auth/auth.types.ts`, change every `id: number` and `userId: number` to `string`:

```typescript
// RegisterRequest — add username
export interface RegisterRequest {
  email: string;
  username: string;  // ADD THIS
  password: string;
}

// RegisterResponse
export interface RegisterResponse {
  success: boolean;
  userId: string;  // was number
  email: string;
  message: string;
}

// AccessTokenPayload
export interface AccessTokenPayload {
  userId: string;  // was number
  email: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

// RefreshToken
export interface RefreshToken {
  id: string;  // was number
  userId: string;  // was number
  // ... rest stays same
}

// User
export interface User {
  id: string;  // was number
  // ... rest stays same
}

// UserPublic
export interface UserPublic {
  id: string;  // was number
  // ... rest stays same
}

// CreateUserData — add username
export interface CreateUserData {
  email: string;
  username: string;  // ADD THIS
  passwordHash: string;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
}
```

- [ ] **Step 2: Fix UserRepository and TokenRepository interfaces**

Same file — change all `id: number` params to `string`:

```typescript
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;  // was number
  // ... all other methods: id: number → id: string
}

export interface TokenRepository {
  // ... all userId: number → userId: string
  // ... all id: number → id: string
}
```

- [ ] **Step 3: Fix auth middleware req.user shape**

In `src/auth/auth.routes.ts`, change the global type augmentation and middleware:

```typescript
// In createAuthMiddleware, change:
(req as any).user = {
  id: payload.userId,  // was userId: payload.userId
  email: payload.email,
  role: 'USER',  // default, can be enhanced later
};

// Fix global type augmentation:
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;      // was userId: number
        email: string;
        role: string;     // was emailVerified: boolean
      };
    }
  }
}
```

- [ ] **Step 4: Fix AuthService.register to pass username**

In `src/auth/auth.service.ts`, update `register()`:

```typescript
// In register method, change Step 6:
const user = await this.userRepository.create({
  email,
  username: request.username,  // ADD THIS
  passwordHash,
  emailVerificationToken: verificationTokenHash,
  emailVerificationExpiry: verificationExpiry,
});
```

- [ ] **Step 5: Commit**

```bash
git add src/auth/auth.types.ts src/auth/auth.routes.ts src/auth/auth.service.ts
git commit -m "fix: align auth types with Prisma schema (number → UUID string, add username)"
```

---

### Task 2: Implement Prisma-backed repositories for auth

The auth module defines `UserRepository` and `TokenRepository` interfaces but has no implementations. Create Prisma-backed implementations.

**Files:**
- Create: `src/auth/prisma-user.repository.ts`
- Create: `src/auth/prisma-token.repository.ts`

- [ ] **Step 1: Create PrismaUserRepository**

```typescript
// src/auth/prisma-user.repository.ts
import { PrismaClient } from '@prisma/client';
import { User, UserRepository, CreateUserData } from './auth.types';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByVerificationToken(tokenHash: string): Promise<User | null> {
    // Store verification token in a metadata field or separate table
    // For MVP: use a simple approach — store in user record
    // The Prisma schema doesn't have emailVerificationToken on User
    // We'll need to handle this via Session or a new field
    // WORKAROUND for MVP: auto-verify users (skip email verification)
    return null;
  }

  async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    return null; // MVP: skip password reset flow
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        isVerified: true,  // MVP: auto-verify
        isActive: true,
      },
    });
    return this.toDomain(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.passwordHash && { passwordHash: data.passwordHash }),
      },
    });
    return this.toDomain(user);
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    // MVP: no-op (no failedLoginAttempts column in Prisma schema)
  }

  async resetFailedAttempts(id: string): Promise<void> {
    // MVP: no-op
  }

  async setAccountLocked(id: string, lockedUntil: Date): Promise<void> {
    // MVP: no-op
  }

  async savePasswordResetToken(id: string, tokenHash: string, expiry: Date): Promise<void> {
    // MVP: no-op
  }

  async clearPasswordResetToken(id: string): Promise<void> {
    // MVP: no-op
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async setEmailVerified(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { isVerified: true } });
  }

  private toDomain(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      emailVerified: prismaUser.isVerified,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      passwordResetToken: null,
      passwordResetExpiry: null,
      accountLocked: false,
      lockoutExpiry: null,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
```

- [ ] **Step 2: Create PrismaTokenRepository**

```typescript
// src/auth/prisma-token.repository.ts
import { PrismaClient } from '@prisma/client';
import { RefreshToken, TokenRepository } from './auth.types';

export class PrismaTokenRepository implements TokenRepository {
  constructor(private prisma: PrismaClient) {}

  async saveRefreshToken(token: Omit<RefreshToken, 'id'>): Promise<RefreshToken> {
    const saved = await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        token: token.tokenHash,
        family: 'default',
        expiresAt: token.expiresAt,
        isRevoked: false,
      },
    });
    return this.toDomain(saved);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });
    return token ? this.toDomain(token) : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: tokenHash },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    // Prisma RefreshToken doesn't have lastUsedAt — skip for MVP
  }

  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private toDomain(t: any): RefreshToken {
    return {
      id: t.id,
      userId: t.userId,
      tokenHash: t.token,
      expiresAt: t.expiresAt,
      isRevoked: t.isRevoked,
      createdAt: t.createdAt,
      lastUsedAt: t.createdAt,
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/auth/prisma-user.repository.ts src/auth/prisma-token.repository.ts
git commit -m "feat: add Prisma-backed auth repositories"
```

---

### Task 3: Create the bootstrap/wiring module

Wire up all dependencies and mount real routes in `app.ts`.

**Files:**
- Create: `src/bootstrap.ts`
- Modify: `src/app.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create bootstrap.ts — dependency wiring**

```typescript
// src/bootstrap.ts
import { PrismaClient } from '@prisma/client';
import { Application } from 'express';

// Auth
import { AuthService } from './auth/auth.service';
import { TokenManager } from './auth/token.manager';
import { RateLimiter } from './auth/rate.limiter';
import { PasswordHasher } from './auth/password.hasher';
import { EmailService } from './auth/email.service';
import { PrismaUserRepository } from './auth/prisma-user.repository';
import { PrismaTokenRepository } from './auth/prisma-token.repository';
import { createAuthRouter, createAuthMiddleware } from './auth/auth.routes';

// Posts
import { PostController } from './posts/post.controller';
import { CacheService } from './posts/cache.service';
import {
  createPostRoutes,
  createFeedRoutes,
  createGroupFeedRoutes,
  createUserProfileRoutes,
} from './posts/post.routes';

// Groups
import { createGroupRoutes } from './groups/group.routes';

// Profiles
import { createProfileRoutes } from './profiles/profile.routes';

// Social — NOTE: the export is `createSocialRoutes`, NOT `createFollowRoutes`
import { createSocialRoutes } from './social/follow.routes';

export async function bootstrap(app: Application): Promise<{ prisma: PrismaClient }> {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Database connected');

  const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

  // --- Auth module ---
  const tokenManager = new TokenManager();
  const rateLimiter = new RateLimiter();
  const passwordHasher = new PasswordHasher();
  const emailService = new EmailService();
  const userRepository = new PrismaUserRepository(prisma);
  const tokenRepository = new PrismaTokenRepository(prisma);

  const authService = new AuthService({
    userRepository,
    tokenRepository,
    tokenManager,
    rateLimiter,
    passwordHasher,
    emailService,
  });

  const authMiddleware = createAuthMiddleware(tokenManager);
  const authRouter = createAuthRouter(authService);
  app.use(`${apiPrefix}/auth`, authRouter);

  // --- Posts module ---
  // CacheService({}) = memory-only LRU cache (no Redis needed for MVP)
  const cacheService = new CacheService();

  // Wiring chain (read each constructor during implementation):
  //   PostRepository(prisma) → PostService(postRepository, sanitizerService, cacheService, eventEmitter)
  //   FeedRepository(prisma) → FeedService(feedRepository, cacheService, followRepository, groupMemberRepository)
  //   ReactionRepository(prisma) → ReactionService(reactionRepository, postRepository, cacheService, eventEmitter)
  //   PostController(postService, feedService, reactionService)
  //
  // NOTE: You also need SanitizerService and an EventEmitter (from 'events' or a simple emitter).
  //   For MVP, EventEmitter can be `new (require('events').EventEmitter)()`.
  //
  // Mount routes:
  //   app.use(`${apiPrefix}/posts`, authMiddleware, createPostRoutes(postController));
  //   app.use(`${apiPrefix}/feed`, authMiddleware, createFeedRoutes(postController));
  //   app.use(`${apiPrefix}/groups`, authMiddleware, createGroupFeedRoutes(postController));
  //   app.use(`${apiPrefix}/users`, authMiddleware, createUserProfileRoutes(postController));

  // --- Groups module ---
  // GroupMemberRepository(prisma) → MembershipService, RbacService, GroupService → GroupController
  // createGroupRoutes(groupController, authMiddleware)

  // --- Profiles module ---
  // WARNING: `createProfileRoutes(authMiddleware)` internally calls `new ProfileController()` with NO args.
  // You must PATCH `profile.routes.ts` to accept a `ProfileController` or `ProfileService`,
  // OR ensure `ProfileRepository` default-constructs with DATABASE_URL from env.
  // Read the constructor chain before wiring.

  // --- Social module ---
  // FollowRepository(prisma) → FollowService → FollowController
  // createSocialRoutes(followController, authMiddleware) — takes 2 args

  return { prisma };
}
```

**Note to implementer:** The bootstrap file above is a skeleton. Each module (posts, groups, profiles, social) has its own constructor dependency chain that needs to be traced by reading the service/controller/repository files. The auth module is fully wired as an example. Wire each subsequent module following the same pattern:
1. Read the module's `*.service.ts` constructor to see what it needs
2. Read the module's `*.repository.ts` constructor (usually just `PrismaClient`)
3. Read the module's `*.controller.ts` constructor
4. Read the module's `*.routes.ts` factory function signature
5. Instantiate in order: repository → service → controller → routes

- [ ] **Step 2: Update index.ts to call bootstrap**

```typescript
// src/index.ts — replace the existing bootstrap function body
import { createApp } from './app';
import { bootstrap } from './bootstrap';

async function start(): Promise<void> {
  const app = createApp();
  const { prisma } = await bootstrap(app);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Remove 503 placeholder routes from app.ts**

In `src/app.ts`, remove the `modules.forEach(...)` block that registers placeholder 503 routes. Keep everything else (health check, CORS, error handler, 404 handler).

- [ ] **Step 4: Update CORS to allow frontend dev server**

In `src/app.ts`:

```typescript
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));
```

- [ ] **Step 5: Commit**

```bash
git add src/bootstrap.ts src/index.ts src/app.ts
git commit -m "feat: wire up backend with Prisma bootstrap and real routes"
```

---

### Task 4: Database setup with Neon

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Create Neon project and database**

Use Neon MCP tools:
```
mcp__Neon__create_project — name: "NS-conversation-network"
```
Save the connection string.

- [ ] **Step 2: Create .env from example**

```bash
cp .env.example .env
# Set DATABASE_URL to the Neon connection string
# Set JWT_SECRET to a random string
# Set NODE_ENV=development
```

- [ ] **Step 3: Run Prisma migrations**

```bash
npx prisma generate
npx prisma db push  # Push schema to Neon (simpler than migrate for MVP)
```

- [ ] **Step 4: Verify backend starts and /health responds**

```bash
npm run dev
# In another terminal:
curl http://localhost:3000/health
```

- [ ] **Step 5: Test auth registration endpoint**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test1234!"}'
```

- [ ] **Step 6: Commit .env.example updates (NOT .env)**

```bash
git add .env.example
git commit -m "docs: update .env.example with required vars"
```

---

## Chunk 2: Frontend — Project Setup & Auth

### Task 5: Scaffold frontend with Vite + shadcn/ui

**Files:**
- Create: `frontend/` (entire directory)

- [ ] **Step 1: Create Vite React TypeScript project**

```bash
cd /path/to/NS-conversation-network
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @tanstack/react-query zustand react-router-dom react-hook-form @hookform/resolvers zod
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Choose: New York style, stone base color, CSS variables yes.

- [ ] **Step 4: Add core shadcn/ui components**

```bash
npx shadcn@latest add button card input label form avatar dropdown-menu separator skeleton toast badge dialog tabs sheet scroll-area
```

- [ ] **Step 5: Configure warm theme**

Edit `frontend/src/index.css` — adjust the CSS variables for warm stone palette:

```css
:root {
  --radius: 0.75rem;
  /* Warm stone palette — shadcn init with stone base gives us this,
     but verify the values are warm (not cold slate) */
}
```

- [ ] **Step 6: Set up vite.config.ts with API proxy**

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, shadcn/ui, Tailwind"
```

---

### Task 6: API client + auth store + router shell

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Layout.tsx`

- [ ] **Step 1: Create API client**

```typescript
// frontend/src/lib/api.ts
import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (res.status === 401 && token) {
    // Try refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry original request with new token
      const newToken = useAuthStore.getState().accessToken;
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
          ...options?.headers,
        },
      });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}));
        throw new ApiError(retryRes.status, err.error || 'UNKNOWN', err.message || 'Request failed');
      }
      return retryRes.json();
    }
    // Refresh failed — logout
    useAuthStore.getState().logout();
    window.location.href = '/auth/login';
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.error || 'UNKNOWN', err.message || 'Request failed');
  }

  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      logout();
      return false;
    }
    const data = await res.json();
    setTokens(data.accessToken, refreshToken);
    return true;
  } catch {
    logout();
    return false;
  }
}
```

- [ ] **Step 2: Create auth store (Zustand)**

```typescript
// frontend/src/stores/auth.ts
import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (tokens: { accessToken: string; refreshToken: string }, user: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  setAuth: (tokens, user) =>
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
      isAuthenticated: true,
    }),
  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken }),
  logout: () =>
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    }),
}));
```

- [ ] **Step 3: Create App.tsx with router**

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth';
import { Layout } from '@/pages/Layout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { FeedPage } from '@/pages/FeedPage';
import { GroupsPage } from '@/pages/groups/GroupsPage';
import { GroupDetailPage } from '@/pages/groups/GroupDetailPage';
import { CreateGroupPage } from '@/pages/groups/CreateGroupPage';
import { ProfilePage } from '@/pages/profiles/ProfilePage';
import { EditProfilePage } from '@/pages/profiles/EditProfilePage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth — no layout */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />

          {/* Protected — with layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/create" element={<CreateGroupPage />} />
            <Route path="/groups/:slug" element={<GroupDetailPage />} />
            <Route path="/users/:username" element={<ProfilePage />} />
            <Route path="/settings/profile" element={<EditProfilePage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Create Layout shell with nav**

```tsx
// frontend/src/pages/Layout.tsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-stone-900">
              Community
            </Link>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Feed</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/groups">Groups</Link>
              </Button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-stone-200 text-stone-600 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/users/${user?.username}`)}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder pages (empty components so router doesn't crash)**

Create these files with minimal exports:
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/RegisterPage.tsx`
- `frontend/src/pages/auth/VerifyEmailPage.tsx`
- `frontend/src/pages/FeedPage.tsx`
- `frontend/src/pages/groups/GroupsPage.tsx`
- `frontend/src/pages/groups/GroupDetailPage.tsx`
- `frontend/src/pages/groups/CreateGroupPage.tsx`
- `frontend/src/pages/profiles/ProfilePage.tsx`
- `frontend/src/pages/profiles/EditProfilePage.tsx`

Each placeholder:
```tsx
export function PageName() {
  return <div>Page Name — coming soon</div>;
}
```

- [ ] **Step 6: Verify frontend runs**

```bash
cd frontend && npm run dev
# Should see Vite dev server at localhost:5173
# Navigate to /auth/login — see placeholder
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add API client, auth store, router, and layout shell"
```

---

### Task 7: Auth pages — Login & Register

**Files:**
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Modify: `frontend/src/pages/auth/RegisterPage.tsx`
- Create: `frontend/src/components/auth/AuthLayout.tsx`

- [ ] **Step 1: Create AuthLayout (centered card)**

```tsx
// frontend/src/components/auth/AuthLayout.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Build LoginPage**

```tsx
// frontend/src/pages/auth/LoginPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const login = useMutation({
    mutationFn: (data: LoginForm) =>
      api<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setAuth(
        { accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken },
        { id: data.user.id, email: data.user.email }
      );
      navigate('/');
    },
  });

  return (
    <AuthLayout title="Welcome back" description="Sign in to your account">
      <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
        {login.error && (
          <p className="text-sm text-red-500">{login.error.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-stone-500">
          Don't have an account?{' '}
          <Link to="/auth/register" className="font-medium text-stone-900 underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Build RegisterPage**

Same pattern as LoginPage but with username field, password confirm, POST to `/auth/register`. On success, show "Check your email" message (or for MVP auto-verified, redirect to login).

- [ ] **Step 4: Test auth flow end-to-end**

1. Start backend: `npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `localhost:5173/auth/register` → register
4. Navigate to `localhost:5173/auth/login` → login
5. Should redirect to `/` (feed page placeholder)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add login and register pages with auth flow"
```

---

## Chunk 3: Frontend — Feed, Groups, Profiles, Social

### Task 8: Feed page — posts list + create post

**Files:**
- Modify: `frontend/src/pages/FeedPage.tsx`
- Create: `frontend/src/components/feed/PostCard.tsx`
- Create: `frontend/src/components/feed/CreatePostForm.tsx`

- [ ] **Step 1: Create PostCard component**

Displays: author avatar + display name, relative timestamp, content text, reaction count, comment count. Reaction button (like toggle).

- [ ] **Step 2: Create CreatePostForm component**

Text area (5000 char max) + submit button. POST to `/posts` with `{ content, visibility: 'PUBLIC' }`.

- [ ] **Step 3: Build FeedPage**

Uses TanStack Query `useInfiniteQuery` to `GET /feed?limit=20` (first page) then `GET /feed?cursor=<nextCursor>&limit=20` for subsequent pages. The backend uses **cursor-based pagination** (not page numbers) — the response includes `pagination.nextCursor`. Configure `getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor`. Renders `CreatePostForm` at top, then list of `PostCard` components. "Load more" button at bottom.

- [ ] **Step 4: Test — create a post and see it in the feed**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add feed page with post creation and infinite scroll"
```

---

### Task 9: Groups pages — browse, detail, create

**Files:**
- Modify: `frontend/src/pages/groups/GroupsPage.tsx`
- Modify: `frontend/src/pages/groups/GroupDetailPage.tsx`
- Modify: `frontend/src/pages/groups/CreateGroupPage.tsx`
- Create: `frontend/src/components/groups/GroupCard.tsx`
- Create: `frontend/src/components/groups/JoinLeaveButton.tsx`

- [ ] **Step 1: Create GroupCard component**

Shows: name, description snippet (2 lines), member count badge, privacy badge (public/private), cover image placeholder.

- [ ] **Step 2: Build GroupsPage**

Grid of GroupCards. `GET /groups?page=1&limit=20`. Search input at top filtering by name.

- [ ] **Step 3: Build CreateGroupPage**

Form: name, description, privacy (public/private select). POST to `/groups`.

- [ ] **Step 4: Build GroupDetailPage**

`GET /groups/:slug` for group info. Header with cover, name, description, member count, join/leave button. Below: feed of group posts (`GET /groups/:groupId/feed`) + create post form (if member).

- [ ] **Step 5: Create JoinLeaveButton**

`POST /groups/:groupId/members` to join, `DELETE /groups/:groupId/members/me` to leave. Shows current membership state. **Note:** The actual route paths use `/members` not `/join` and `/leave`.

- [ ] **Step 6: Test — create group, join it, post in it**

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add groups pages — browse, create, detail with posts"
```

---

### Task 10: Profile pages + follow system

**Files:**
- Modify: `frontend/src/pages/profiles/ProfilePage.tsx`
- Modify: `frontend/src/pages/profiles/EditProfilePage.tsx`
- Create: `frontend/src/components/social/FollowButton.tsx`
- Create: `frontend/src/components/profiles/ProfileHeader.tsx`

- [ ] **Step 1: Create ProfileHeader component**

Avatar (circle, warm fallback color), display name, @username, bio, location, website link, follower/following counts. Shows `FollowButton` if not own profile, "Edit" button if own.

- [ ] **Step 2: Build ProfilePage**

`GET /profiles/:username` (or by user ID — depends on how profile routes are wired). Shows ProfileHeader + user's posts (`GET /users/:userId/posts`).

- [ ] **Step 3: Build EditProfilePage**

Form: display name, bio (textarea), location, website URL, avatar URL. PUT to `/profiles/me`.

- [ ] **Step 4: Create FollowButton**

`POST /social/follow/:userId` to follow (userId is a URL param, not body), `DELETE /social/unfollow/:userId` to unfollow. **Note:** Unfollow uses `/unfollow/` path, not `/follow/`. Shows "Follow" / "Following" state. Uses TanStack Query mutation + invalidation.

- [ ] **Step 5: Test — view profile, edit profile, follow/unfollow another user**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add profile pages and follow system"
```

---

## Chunk 4: Polish, Responsive, Deploy

### Task 11: Responsive design + mobile nav

**Files:**
- Modify: `frontend/src/pages/Layout.tsx`

- [ ] **Step 1: Add responsive breakpoints to Layout**

- Desktop (lg+): current layout with top nav
- Mobile (< lg): bottom tab bar (Feed, Groups, Profile icons)
- Hide desktop nav on mobile, show bottom tabs

- [ ] **Step 2: Make all pages responsive**

- Feed: full width on mobile, max-w-2xl centered on desktop
- Groups grid: 1 col mobile, 2 col tablet, 3 col desktop
- Profile: stack header vertically on mobile
- Cards: reduce padding on mobile (`p-4` instead of `p-6`)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: add responsive layout with mobile bottom nav"
```

---

### Task 12: Deploy to Neon + Railway

**Files:**
- Create: `Procfile` (or `railway.toml`)
- Create: `frontend/Dockerfile` (if needed)

- [ ] **Step 1: Ensure backend builds cleanly**

```bash
npm run build
npm run typecheck
```

Fix any type errors.

- [ ] **Step 2: Ensure frontend builds cleanly**

```bash
cd frontend && npm run build
```

Verify `frontend/dist/` contains the built app.

- [ ] **Step 3: Configure Railway**

- Create Railway project
- Add backend service (root dir, `npm run build && npm start`)
- Add frontend service (`frontend/` dir, static site serving `dist/`)
- Set env vars on backend service: `DATABASE_URL` (Neon), `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=<frontend URL>`
- Set env vars on frontend service: `VITE_API_URL=<backend URL>/api/v1` (needed at build time — without this, API calls 404 in production since the Vite proxy doesn't exist in static deployment)

- [ ] **Step 4: Deploy and verify**

- Hit `/health` on backend URL
- Load frontend URL
- Register, login, create post, create group, follow user

- [ ] **Step 5: Commit any deploy config**

```bash
git add .
git commit -m "feat: add deployment configuration for Railway"
```

---

### Task 13: Create PR to upstream

- [ ] **Step 1: Push branch to NSRelaTech fork**

```bash
git push origin main
```

Or create a feature branch:
```bash
git checkout -b feat/frontend-mvp
git push -u origin feat/frontend-mvp
```

- [ ] **Step 2: Create PR to upstream repo**

PR title: "Add React + shadcn/ui frontend MVP"

Include:
- What it adds (frontend app, backend wiring, deployment config)
- Screenshots of key pages
- How to run locally
- What's not included (comments, notifications, admin, media upload)
