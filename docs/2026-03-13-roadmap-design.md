# NS-conversation-network Roadmap

Revision informed by three foundational sources:
- [Conversation Networks](https://arxiv.org/abs/2503.11714) (Roy, Lessig, Tang 2025) — civic infrastructure where content = conversation excerpts, AI assists but never mediates
- [Decentralized Deliberation Standard (DDS)](https://www.dds.xyz) — open protocol with Plan/Collect/Analyze layers, built on AT Protocol
- [Plurality](https://github.com/pluralitybook/plurality) (Tang, Weyl) — plural voting, quadratic funding, verifiable credentials, collaborative governance

## Design decisions

- **Audience**: NS residents first, architected to generalize into open civic infrastructure
- **Deliberation tools**: Interoperable — Harmonica is one tool among many, connected via DDS-style abstraction
- **Identity**: AT Protocol (DID:PLC) as primary, with GitHub OAuth and wallet connect as additional auth providers
- **Approach**: Protocol-first — identity foundation before features, so everything built is DDS-aligned from the start
- **Governance mechanisms**: Later phase, after deliberation is working

## Current state (MVP)

Posts, feed (latest/popular sorting), likes, comments, groups (create/join/leave, admin edit/delete), user profiles with avatars, JWT auth. Deployed on Railway + Neon.

---

## Phase 1: Decentralized identity foundation

Replace JWT auth with multi-provider identity backed by DIDs.

### Core concept

Every user gets a DID:PLC (AT Protocol's decentralized identifier) as their primary identity. Authentication providers are "linked credentials" — ways to prove you control a DID. A user can link multiple providers to one identity.

### Auth providers

| Provider | Flow | DID creation |
|----------|------|-------------|
| AT Protocol | OAuth via PDS (e.g. Bluesky account) | Uses existing DID:PLC |
| GitHub | GitHub OAuth | Generate new DID:PLC, link GitHub as credential |
| Wallet | Sign message with ETH/Base wallet | Generate new DID:PLC, link wallet address as credential |

### Identity architecture

- DID:PLC registry only (no full PDS yet — that comes in Phase 3)
- DID:PLC creation requires interaction with the PLC Directory (`plc.directory`), operated by Bluesky PBC — this is an external dependency from day one
- Profile data (display name, avatar, bio) stored locally, linked to DID
- Session tokens backed by DID identity

### Identity linking strategy

DID:PLC identifiers cannot be merged after creation. To avoid identity fragmentation:

- **First registration creates the DID:PLC.** Whether the user signs up via AT Protocol, GitHub, or wallet, they get one DID:PLC.
- **Subsequent providers link to the existing DID.** Adding GitHub OAuth or a wallet to an existing account creates a `Credential` record pointing to the same DID — it does not create a second DID.
- **AT Protocol users who already have a DID:PLC** (e.g. Bluesky account): we use their existing DID, no new one created.
- **Edge case — user has two accounts from different providers:** Manual merge flow. User proves ownership of both accounts, we migrate all records to one DID and tombstone the other. This is a destructive operation with confirmation UI.

### Data model changes

- `User` model gains `did` as primary identifier
- New `Credential` relation: `{ provider, externalId, did, metadata }`
- Posts, comments, likes, group memberships reference DIDs instead of UUIDs
- Existing users get migrated — DID:PLC generated for each, current password auth becomes a legacy credential

### What stays the same

- Posts, comments, likes, groups — all still work
- Feed logic unchanged
- UI identical except login/register flow gains provider selection

---

## Phase 2: Structured conversations in groups

First deliberation feature. Data model mirrors DDS Plan/Collect/Analyze layers.

### Core concept

Groups get a new content type: "conversations." A conversation is a structured deliberation session with rounds, questions, and synthesized results.

### Data model (DDS-aligned)

**Plan** (session definition):
- Title, description, created by (DID)
- Belongs to a group
- Rounds: ordered stages, each with a prompt and type (open response, multiple choice, ranking)
- Eligibility: all group members, specific roles, or invite-only
- Status lifecycle: draft → open → collecting → analyzing → closed

**Collect** (participant input):
- Response tied to a round, authored by DID
- Content varies by round type (free text, selection, ranked list)
- Anonymous option: response stored with group membership attestation but author DID hidden from other participants. **Design constraint for Phase 3:** AT Protocol records require an author DID — anonymous responses will need a proxy/blind author mechanism (e.g. a group-level service DID that submits on behalf of anonymous participants, with a separate encrypted membership proof). This must be designed in Phase 2, not discovered during Phase 3 migration.
- Timestamps, edit history

**Analyze** (synthesis):
- Generated per round or per conversation
- Topic clusters, opinion maps, consensus/divergence summaries
- AI-generated but flagged as such (AI assistive, never mediating)
- Multiple analyses possible (different analyzers produce different views)

### UX

- Group feed shows posts and conversation cards side by side
- Conversation card: title, status, participation count, active round
- Conversation view: round-by-round navigation, submit responses, see results
- Group admins create and manage conversations

### Tool integration points

- **Collect layer**: Harmonica, Polis, or other tools can replace native input UI — they gather responses their way, write to standardized format
- **Analyze layer**: Different synthesis engines can operate — built-in AI summary, Harmonica synthesis, community-built analyzers

---

## Phase 3: DDS interop layer

Expose deliberation data as AT Protocol records with DDS-compatible schemas.

### Core concept

Conversations, responses, and analyses become portable AT Protocol records. External tools read and write deliberation data without custom integrations.

### Technical implementation

- Define AT Protocol lexicons for deliberation (e.g. `network.nscn.deliberation.session`, `network.nscn.deliberation.response`, `network.nscn.deliberation.analysis`)
- Run a PDS for deliberation records. **Scope decision needed:** a full AT Protocol PDS (`@atproto/pds`) handles account management, blob storage, DID resolution, and relay (firehose) registration — significant operational overhead. A minimal approach: use `@atproto/pds` but only expose the record read/write surface (no firehose, no relay registration), adding federation incrementally. This is the highest-complexity decision in the roadmap and should be spiked before committing.
- XRPC API endpoints alongside existing REST API
- Phase 2's native DB tables mirrored to AT Protocol records (dual-write initially, AT Protocol becomes primary over time)

### External tool integration

- Harmonica: creates session → writes Plan + Collect + Analyze records to our PDS
- Polis: runs opinion mapping → writes Analyze records alongside native analysis
- Any DDS-compliant tool: discovers conversations via the standard, participates with just a DID

### Federation

- Other communities run their own instances
- DID identity means no separate accounts per instance
- **Cross-instance conversations (stretch goal):** AT Protocol federation replicates records but write authority stays with the originating PDS. A "conversation spanning instances" requires a clear ownership model — likely one instance hosts the conversation (Plan record), and participants from other instances submit responses via their own PDS which get aggregated. This needs a dedicated design spike and may be Phase 3b or later.

### What changes from Phase 2

- External tool registry — group admins connect deliberation tools as Collect/Analyze providers
- API gains XRPC layer
- Data portability — users can export/migrate their deliberation history

---

## Phase 4: Plural governance

Decision-making mechanisms from Plurality, built on top of the deliberation infrastructure.

### Voting mechanisms (incremental rollout)

1. **Approval voting** — approve any number of options (simplest, good starting point)
2. **Ranked choice** — order preferences, instant-runoff
3. **Quadratic voting** — allocate voice credits, cost increases quadratically (prevents majority tyranny)

### Quadratic funding

- Community funding pool for local initiatives
- Residents allocate small amounts, quadratic formula amplifies broadly-supported projects
- Wallet auth from Phase 1 enables on-chain settlement (Base L2 for low fees)

### Verifiable participation

- SoulBound tokens (non-transferable) for deliberation participation, voting, contributions
- Builds reputation without tradeable status economy
- Eligibility for certain conversations/votes can require participation history

### Dependencies

- Phase 1 wallets → funding and token issuance
- Phase 2 conversations → voting as a round type within deliberation
- Phase 3 interop → votes and funding are DDS records, portable and verifiable

---

### Quadratic funding adoption

Wallet connect in Phase 1 is optional — most NS residents won't have crypto wallets initially. Quadratic funding can operate off-chain (internal credit system with fiat payments) with on-chain settlement as an optional layer for users who have wallets. This avoids making wallet adoption a hard requirement for civic participation.

---

## Phase 0: Tech debt (hard gate on Phase 1)

These must be completed before Phase 1 data model work begins. Phase 1 touches the `User` model and migrates foreign keys — doing that on unfixed dual data access is a concrete risk (per fork retrospective).

- **[Must] Migrate raw SQL repositories to Prisma-only** — dual data access has caused repeated bugs
- **[Must] Fix ~50 pre-existing TypeScript strict mode errors** — Phase 1 model changes will compound these
- **[Should] Add password requirements hint to RegisterPage** — will be replaced by provider selection in Phase 1, but needed until then
- **[Should] Clean up smoke test users in Neon DB**
