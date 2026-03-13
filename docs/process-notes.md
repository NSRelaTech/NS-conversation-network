# Process Notes — NS-conversation-network

## 2026-03-13 — Frontend MVP design & planning

- **Done:** Explored upstream repo, brainstormed frontend approach with user, wrote design spec, ran code review (found 8 backend bugs), wrote 13-task implementation plan, ran plan review (found 10 issues, all fixed), renamed repo from community-social-network.
- **Decisions:** React + shadcn/ui (New York, warm style), Neon + Railway deployment, monorepo with `frontend/` dir, fix backend first then build frontend, scope = auth + feed + groups + profiles + follow.
- **State:** Spec and plan committed, 4 commits unpushed. No implementation started yet.
- **Next:** Push commits, execute plan starting with Chunk 1 (backend type fixes + Prisma repositories + route wiring + Neon DB setup).

## 2026-03-13 — Features, fixes, and cleanup (session 3)
- **Done:** Comments system (backend endpoints + frontend CommentSection), feed sorting (latest/popular) across all feeds, group admin edit/delete, display name on posts, GitHub link moved to dropdown menu, settings page trimmed, profile feed reaction state fixed, SPARC/Claude-Flow scaffolding removed (74 files, 73k lines), README rewritten with Conversation Networks paper reference, arxiv paper saved to memory.
- **Decisions:** SPARC scaffolding removed as noise — kept original CLAUDE.md as `docs/original-CLAUDE.md` for reference. Fork assessed as net-negative for velocity but positive for community contribution story.
- **State:** MVP feature-complete. Deployed on Railway. Remaining tech debt: dual SQL/Prisma data access, ~50 TS strict errors, smoke test user cleanup.
- **Next:** Clean up test users in Neon, consider Prisma migration for feed repositories, password requirements hint on register page.
