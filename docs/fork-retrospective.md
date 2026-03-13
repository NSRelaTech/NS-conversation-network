# Fork Retrospective

Honest take after spending two sessions deep in this codebase:

**The fork slowed us down more than it helped.** Here's what I've seen:

## What we actually got from the fork
- Prisma schema (but had to fix timestamps, column types)
- Auth flow with JWT/refresh tokens (but had to fix ID types, req.user shape, login response)
- Express app structure

## What we fought against
- Dual data access (raw SQL Pool + Prisma) — constant source of bugs, still tech debt
- Over-engineered service layers with deep dependency chains — I had to bypass the entire comment system and write simple Prisma endpoints because wiring CommentService → MentionService → NotificationService wasn't worth it
- Domain model mapping (owner/ADMIN) causing frontend bugs today
- ~50 pre-existing TS strict errors
- Routes that existed but were never mounted
- No-op implementations everywhere (NoopRequestRepository, NoopPermissionCache, etc.)
- SPARC/Claude-Flow scaffolding that's irrelevant noise

## Verdict

A clean Express + Prisma + shadcn/ui setup would have taken ~2-3 hours and we'd have zero legacy bugs to chase. Instead we've spent significant time debugging someone else's half-wired architecture.

That said — the fork makes political sense for the NSRelaTech community contribution story. "Built on Dragan's project" is better than "replaced Dragan's project." So the decision wasn't purely technical.
