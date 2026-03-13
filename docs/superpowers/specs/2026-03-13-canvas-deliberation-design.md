# Canvas Deliberation Interface — Design Spec

Spatial whiteboard interface for structured conversations, replacing threaded/feed-style deliberation UI with an infinite canvas powered by React Flow.

## Context

The Conversation Networks paper (Roy, Lessig, Tang 2025) envisions civic infrastructure where content is conversation excerpts, communication is structured, and tools interoperate. The current MVP is a standard social feed. This design introduces the canvas as the **visualization layer for deliberation** — making the community's thinking spatially legible rather than chronologically listed.

## Three-Layer Model

### Layer 1: Feed (unchanged)
Posts, likes, comments. Casual social layer. Posts can reference conversations — clicking the link opens the conversation's whiteboard instead of a comment thread.

### Layer 2: Group Canvas
Top-level view of a group. Conversation sessions displayed as cards on an infinite whiteboard, spatially arranged by theme. Answers: "what is this community deliberating on right now?"

### Layer 3: Conversation Canvas
Inside a single deliberation session. Participant responses as sticky notes. AI synthesis visually clusters and connects them. Replaces threaded comment pages with a spatial map of perspectives.

## Technology Choice: React Flow

MIT license, 27k+ GitHub stars. Built for node-based interactive canvases in React.

**Why it fits:**
- Nodes = conversation cards / response cards, edges = connections. Exact conceptual match.
- Built-in: pan/zoom, drag-to-arrange, edge drawing, minimap, auto-layout plugins.
- Custom node components — existing PostCard-style components become React Flow nodes.
- DOM-based, performant up to ~500-1000 visible nodes (sufficient for community scale).
- Works with dagre/elkjs for auto-layout of default arrangements.

**Rejected alternatives:**
- tldraw: source-available, $6,000/year commercial license for production. Not open source.
- Excalidraw: drawing tool first, structured content second. Fighting the API to embed React components as first-class objects.
- Custom canvas (Konva/Pixi): massive effort to reinvent pan/zoom, hit testing, edge routing, drag handling.

## Dependencies

This spec is Phase 2 work. Implementation depends on:
- **Phase 0** (tech debt): Prisma-only migration, TypeScript fixes — hard gate
- **Phase 1** (identity): DID-based user model — canvas references users by DID
- **Conversation data model**: The Plan/Collect/Analyze tables (sessions, rounds, responses, analyses) described in the roadmap's Phase 2 must be designed alongside or before the canvas tables. The `NativeAdapter` needs a concrete schema to adapt from. A companion spec for the deliberation data model is needed before implementation.

## Data Model

### `canvases`
The canvas container. Uses two nullable FKs (not polymorphic `owner_type`/`owner_id`) for referential integrity.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| group_id | uuid | Nullable FK to groups. Check constraint: exactly one of group_id/conversation_id is non-null |
| conversation_id | uuid | Nullable FK to conversations. Check constraint: exactly one of group_id/conversation_id is non-null |
| default_layout_by | uuid | User who last saved the default layout |
| updated_at | timestamp | Last modification |

### `canvas_cards`
Any unit of content rendered on a canvas. Lightweight wrapper pointing to real data elsewhere.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| canvas_id | uuid | FK to canvases |
| source_type | enum | `native`, `harmonica`, `polis`, `agora` |
| source_id | text | Reference to original record in source system |
| content_snapshot | jsonb | Rendering data (see shapes below). Avoids fetching source on every canvas load |
| card_type | enum | `session`, `response`, `theme`, `proposal`, `opinion-group` |
| created_at | timestamp | |

### `canvas_positions`
Where cards sit on the canvas. Supports default layout + personal overrides.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| card_id | uuid | FK to canvas_cards |
| canvas_id | uuid | FK to canvases |
| x | float | X coordinate |
| y | float | Y coordinate |
| is_default | boolean | True = admin/system layout, false = personal override |
| user_id | uuid | Null for defaults, set for personal overrides |

**Unique constraint:** `UNIQUE(card_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'))` — prevents duplicate positions for the same card+user.

**Fallback logic:** When rendering, use the user's personal position if it exists, otherwise fall back to the default position.

**Simplification for MVP:** Personal overrides stored in localStorage initially (no server-side personal positions). Only admin default layouts persisted server-side. Server-side personal positions added later if users need cross-device consistency.

### `canvas_connections`
Edges between cards.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source_card_id | uuid | FK to canvas_cards |
| target_card_id | uuid | FK to canvas_cards |
| canvas_id | uuid | FK to canvases |
| connection_type | enum | `thematic`, `reply`, `agrees`, `contradicts`, `clusters-with` |
| label | text | Optional label |
| origin | enum | `manual`, `auto`, `adapter` |
| created_by | uuid | User who created (null for auto/adapter) |
| created_at | timestamp | |

**`content_snapshot` shapes by card_type:**
- `session`: `{ title, status, participantCount, activeRound?, description? }`
- `response`: `{ text, authorDisplayName?, isAnonymous, roundTitle }`
- `theme`: `{ label, responseCount, keyQuotes: string[] }`
- `proposal`: `{ title, voteCountFor, voteCountAgainst, summary? }`
- `opinion-group`: `{ label, memberCount, definingStatements: string[] }`

**Key principle:** Cards are lightweight wrappers pointing to real data elsewhere. The canvas stores spatial layout and connections, not content.

## API Endpoints

All under `/api/v1/canvas`.

### `GET /canvas/:type/:id`
Get canvas state (cards, positions, connections).
- `type` = `group` or `conversation`
- `id` = groupId or conversationId
- Returns default positions merged with requesting user's personal overrides
- Includes connections filtered by canvas scope

### `PUT /canvas/:type/:id/positions`
Save position(s).
- Body: `{ positions: [{ cardId, x, y }], saveAsDefault?: boolean }`
- Regular users: saves as personal override
- `saveAsDefault: true`: requires admin role (groups) or conversation owner

### `POST /canvas/:type/:id/connections`
Create manual connection.
- Body: `{ sourceCardId, targetCardId, connectionType, label? }`

### `DELETE /canvas/connections/:connectionId`
Remove/dismiss a connection.

### `POST /canvas/:type/:id/reset`
Reset personal overrides back to defaults.

## Adapter Pattern for Tool Integration

Each external deliberation tool writes results in its own format. Adapters translate tool output into canvas primitives (cards, positions, connections).

### Interface

```typescript
interface Position {
  cardId: string;
  x: number;
  y: number;
}

// Card dimensions are fixed per card_type (not dynamic):
// session: 280x120, response: 240x100, theme: 320x140, proposal: 280x160, opinion-group: 300x120

interface CanvasAdapter {
  extractCards(sourceData: unknown): CanvasCard[];
  extractConnections(sourceData: unknown, cards: CanvasCard[]): CanvasConnection[];
  suggestLayout(cards: CanvasCard[], connections: CanvasConnection[]): Position[];
}
```

### Built-in Adapters

| Adapter | Cards | Connections | Layout |
|---------|-------|-------------|--------|
| `NativeAdapter` | Responses from deliberation rounds | Reply chains, same-author | Chronological grid, clustered by round |
| `HarmonicaAdapter` | Participant responses + synthesis themes | Response-to-theme clustering | Themes as clusters, responses orbiting their theme |
| `PolisAdapter` | Statements + opinion groups | Agreement/disagreement edges | 2D opinion map (preserving Polis's spatial logic) |
| `AgoraAdapter` | Proposals + pro/con arguments | Argument-to-proposal, related proposals | Proposal-centric radial layout |

### When Adapters Run

- **On conversation creation:** initial card extraction + layout
- **On sync/refresh:** pull latest data from tool, diff cards, update positions for new cards only (don't disrupt existing user-arranged layout)
- **Server-side:** adapters write to canvas tables, the frontend just renders

### Adapter Rollout

- Phase 2: `NativeAdapter` only
- Phase 3: `HarmonicaAdapter` ships with DDS interop; adapter interface formalized
- Phase 3+: `PolisAdapter`, `AgoraAdapter` as tools are integrated

## Frontend Components

### Shared Canvas Layer

**`Canvas`** — React Flow wrapper, fully generic.
- Props: `canvasId`, `cards`, `connections`, `isAdmin`, `onPositionChange`, `onConnectionCreate`
- Handles pan/zoom/drag, fetches positions, merges personal overrides on defaults
- On drag end: debounced save to API (personal override)

**`CanvasCard`** — custom React Flow node. Renders differently based on `card_type`:
- `session` — title, status badge, participant count, active round indicator
- `response` — participant text (or anonymous), reaction indicators
- `theme` — synthesis cluster label, response count, key quotes
- `proposal` — title, vote counts, pro/con summary
- `opinion-group` — group label, member count, defining statements

**`CanvasConnection`** — custom React Flow edge, styled by `connection_type`:
- `thematic` — solid, color-coded by theme
- `agrees/contradicts` — green/red with directional arrow
- `clusters-with` — soft dotted boundary (visual grouping rather than a line)

**`CanvasToolbar`** — floating toolbar:
- Zoom controls, minimap toggle, reset to default layout, list view toggle
- Admins: "save as default layout" button

### Page Integration

- **`GroupDetailPage`** — adds canvas tab alongside post feed. Canvas shows conversation sessions as cards.
- **`ConversationPage`** (new) — full canvas view of a single deliberation session. Responses, themes, connections laid out spatially.
- **`FeedPage`** — unchanged, but conversation-referencing posts get a card preview that links to `ConversationPage`.
- **Mobile** — defaults to list view (< 768px). Canvas available via toggle. React Flow supports touch pan/zoom/drag.

## Interaction Details

### Drag Behavior
- Drag a card → on drag end, debounced save (personal override). No save button.
- Admin clicks "Save as default" → batch-saves all current positions as default layout.

### Drawing Connections
- Hover a card → connection ports appear on edges
- Drag from port to another card → creates manual connection
- Optional label prompt after connecting

### Auto-Suggested Connections
- System suggests connections (same author, similar content, shared group heuristics)
- Rendered as dotted/dimmed edges with dismiss option
- Dismissing prevents reappearance; accepting converts to manual connection

### New Card Placement
- New cards auto-positioned near related cards (same theme, same round)
- Brief entrance animation for visibility

### List View Fallback
- Toggle in toolbar: canvas / list view
- List view = current feed-style layout
- Preference saved in localStorage

## Roadmap Integration

### Phase 2 — Structured Conversations (canvas ships here)
- Canvas data model (4 new tables)
- `Canvas` React Flow component + `CanvasCard` + `CanvasConnection` + `CanvasToolbar`
- `NativeAdapter` for deliberation rounds/responses
- Group canvas view (conversation sessions as cards)
- Conversation canvas view (responses + AI synthesis as spatial clusters)
- Feed posts linking to conversations (open canvas, not comment thread)
- Personal position overrides + admin default layouts
- List view fallback

### Phase 3 — DDS Interop (adapters formalized here)
- Adapter interface as part of DDS tool integration
- `HarmonicaAdapter` — first external adapter
- Adapter sync mechanism (pull, diff, update)
- `PolisAdapter`, `AgoraAdapter` — as tools integrate
- Canvas data mirrored to AT Protocol records

### Phase 4 — Plural Governance (canvas extended here)
- Voting mechanisms render on canvas (vote cards, quadratic weight visualization)
- Funding proposals as canvas cards with contribution visualization

### Unchanged
- Phase 0 (tech debt) — still hard gate
- Phase 1 (identity) — unaffected

## Known Limitations (v1)

- **No real-time updates:** If two users view the same conversation canvas and one adds a response, the other must refresh. WebSocket/SSE for live canvas updates is a follow-up.
- **Pagination:** Group canvases (few session cards) load fully. Conversation canvases with many responses may need lazy loading — load positions first, then fetch content snapshots in batches within the viewport. Not needed for MVP scale but should be designed for.
- **Personal overrides in localStorage:** Cross-device sync of personal arrangements is deferred. Only admin default layouts are server-persisted in v1.
