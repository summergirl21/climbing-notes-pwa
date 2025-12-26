# Climbing Notes PWA - Requirements

## Goals
- Log climbs with full route details and attempt outcomes.
- Search past routes to see previous completions and dates.
- View session/day stats with grade distribution and max grade.
- Support multiple gyms with gym-specific route data.

## Core data requirements
### Gym
- `name` (string, required, unique)

### Route
- `gym_name` (string, required, matches Gym.name)
- `rope_number` (string or number, required)
- `color` (string, required)
- `set_date` (date, required)
- `grade` (string, required, Yosemite format like `5.7`, `5.10a`)
- `route_id` (string, required, unique per gym, generated)
  - Generated from: `${gym_name}:${rope_number}:${color}:${set_date}`
  - Not user-entered; the user only provides rope number, color, and set date.

### Climb attempt
- `route_id` (string, required, matches Route.route_id)
- `climb_date` (date, required)
- `attempt_index` (number, required, starts at 1 per route per day)
- `completion_style` (enum, required)
  - `send_clean` (no resting)
  - `send_rested` (rested)
  - `attempt` (did not complete)
- `notes` (string, optional)

## Functional requirements
- Create/edit/delete a gym.
- Create/edit/delete a route for a specific gym.
- Log multiple attempts for the same route on the same day.
- Allow creating a new route directly from the attempt flow if it does not exist.
- View a list of climbs with filters:
  - Gym, rope number, color, grade, set date, climb date, completion style.
- Search routes using any combination of rope number, color, and set date (within a gym), and show:
  - Previous attempts and outcomes
  - Dates of prior climbs
  - Notes and grades from those attempts
- Session/day view (per calendar date) with stats:
  - Total climbs (attempts)
  - Grade distribution (graphical)
  - Max grade
- Session stats default to the most recent session date with logged attempts.
- Use tabs/pages to separate major sections of the app, with bottom tab navigation on mobile and the current top layout on desktop.

## Data rules and validation
- Route identity is unique within a gym by `rope_number + color + set_date`.
- A route may have many attempts across multiple dates.
- A route may have multiple attempts on the same day; `attempt_index` orders them.
- Attempts are stored individually, but can be aggregated for stats and summaries.
- Grades must be Yosemite format (`5.x`, including letter suffixes like `5.10a`).

## Non-functional requirements
- Use a persistent storage API to save data locally.
- App is usable on mobile and desktop form factors.
- Provide a dark mode option that respects system settings.
- All features work offline.

## Auth requirements
- Use Clerk magic-link authentication with a custom UI flow in the PWA.
- After a successful sign-in, fetch the Clerk JWT for the "convex" template and call `convexClient.setAuth(token)`.
- On app start, if a Clerk session exists, immediately set Convex auth before making queries/mutations.
- Handle auth state changes and token refresh by re-calling `setAuth` when the session token changes.
- Gate all backend queries/mutations on authenticated identity; unauthenticated callers must be rejected.

## Backend
### Data model (align to current app)
- Keep the current stable IDs and shapes from `src/main.ts` so offline data maps 1:1:
  - Gym: `name`, `createdAt`, `updatedAt?`, `deleted?`, `userId`.
  - Route: `routeId` (string), `gymName`, `ropeNumber`, `color`, `setDate`, `grade`, `createdAt`, `updatedAt?`, `deleted?`, `userId`.
  - Attempt: `attemptId` (string), `routeId` (string), `climbDate`, `attemptIndex`, `completionStyle`, `notes`, `createdAt`, `updatedAt?`, `deleted?`, `userId`.
- Use `routeId` as the canonical cross-device identifier (do not replace with Convex IDs).
- Store `updatedAt` as server-authoritative time for conflict resolution; keep a separate `localUpdatedAt` in IndexedDB only.
- Add backend indexes on `userId` for each table and on `routeId` for attempts.
- Prefer soft deletes (`deleted=true` + `updatedAt`) to allow reliable sync of deletions.

### Backend functions (Convex)
- Implement CRUD mutations for gyms, routes, and attempts that:
  - Require auth and derive `userId` from `ctx.auth.getUserIdentity()`.
  - Validate ownership by `userId` and disallow cross-user access.
  - Enforce route identity uniqueness via `routeId` (gymName + ropeNumber + color + setDate).
  - Set/overwrite `updatedAt` with server time on every write.
- Implement queries for:
  - List all gyms/routes/attempts for the authenticated user.
  - List attempts by `routeId` for the authenticated user.
- Implement a pull query `getAllDataSince(lastSyncAt)` that returns gyms/routes/attempts updated after `lastSyncAt`.

### Sync strategy (client)
- Keep IndexedDB as the UI source of truth; sync is background.
- Maintain:
  - `lastSyncAt` (server time) in local metadata.
  - An outbox of pending operations (create/update/delete) for offline usage.
- Upload phase:
  - Process outbox sequentially (preserve order).
  - For each item, call the appropriate Convex mutation.
  - On success, mark the local record as synced and remove from outbox.
- Download phase:
  - Call `getAllDataSince(lastSyncAt)` and merge into IndexedDB.
  - If server `updatedAt` is newer than local, replace local (LWW).
  - If local has newer `localUpdatedAt`, keep local and re-queue the change.
- Conflict policy:
  - Use server `updatedAt` as the authoritative clock.
  - Do not compare client clocks directly to server clocks for conflict resolution.
  - Prefer server version when timestamps are equal; re-apply local changes as needed.

### Migration
- On first authenticated run, upload existing local data into Convex (preserving IDs).
- After migration completes, set `lastSyncAt` and continue normal sync.

## Caveats, trade-offs, and corner cases
- Offline sync complexity: outbox ordering, retries, and partial failures can introduce duplicates or missing data if not handled carefully; prefer idempotent mutations and strict sequencing.
- Conflict resolution: last-write-wins can drop concurrent edits; define which fields are authoritative and document that later edits overwrite earlier ones.
- Clock skew: do not trust client time for conflict resolution; always use server `updatedAt` and treat client times as advisory only.
- Deletion vs edit: if a record is deleted on one device and edited on another, deletion wins only if its server `updatedAt` is newer; otherwise the edit may resurrect the item.
- ID stability: route/attempt IDs must remain stable across devices; any change to ID composition requires a migration plan.
- IndexedDB corruption or wipe: app must handle empty local data gracefully and rehydrate from server on next sync.


# TODOs:
- [x] Icon for app
- [x] Combine gyms tab with one of the other pages, maybe settings?
- [x] Make the top header smaller, remove the offline indicator?
- [x] Add a version number or build date so you can see which version is loaded, in settings
- [x] Add import and export data feature
- [ ] Work more on making data persistent
- [x] Add option for lead vs top rope
- [ ] show multiple recent session on the stats page
- [ ] show stats for type of send, with/without rest, didn't finish
- [ ] stats show number of attempts in x recent sessions
- [ ] Set date and climb date in the attempts tab doesn't seem to be sized correctly, set date also in routes doesn't seem to be sized correctly
- [ ] Make sure you can list all previous attempts
- [ ] Picture recognition of the route
- [ ] Make it work with ratings at Edge works, like 5.10+/-
- [ ] Why did show install button on android and not iOS?
- [ ] Proper backend with account and syncing etc
- [x] The attempts list on desktop didn't seem to size the cards nicely
