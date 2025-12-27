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
- `climb_style` (enum, required)
  - `top_rope`
  - `lead`
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

## Backend (Convex sync)
- Sync exists to keep gyms/routes/attempts consistent across devices for a signed-in user.
- Reuse the CSV export/import mapping as the canonical sync payload shape:
  - `record_type`, `gym_name`, `route_id`, `attempt_id`, `rope_number`, `color`, `set_date`,
    `grade`, `climb_date`, `attempt_index`, `climb_style`, `completion_style`, `notes`,
    `created_at`, `updated_at`.
- `routeId` remains the cross-device identifier (do not replace with Convex IDs).
- Convex stores per-user sync state:
  - `lastSyncAt` (server timestamp).
  - Row data for sync (either full snapshot or an append-only list of events).
- Sync flow (simple):
  - Client builds rows using the CSV export helpers and sends rows since the last sync.
  - Server upserts rows and returns rows updated since `lastSyncAt` plus a new server timestamp.
  - Client merges by `updated_at` and keeps IndexedDB as the UI source of truth.

### CSV import/export
- CSV import/export stays as the manual backup/restore feature.
- CSV column set must stay aligned with the sync payload (includes `climb_style`, `created_at`, `updated_at`).
- Imported rows merge into local data; any further syncing uses the same row shape.


# TODOs:
- [x] Icon for app
- [x] Combine gyms tab with one of the other pages, maybe settings?
- [x] Make the top header smaller, remove the offline indicator?
- [x] Add a version number or build date so you can see which version is loaded, in settings
- [x] Add import and export data feature
- [ ] Work more on making data persistent
- [x] Add option for lead vs top rope
- [x] show multiple recent session on the stats page
- [x] show stats for type of send, with/without rest, didn't finish
- [x] stats show number of attempts in x recent sessions
- [ ] Set date and climb date in the attempts tab doesn't seem to be sized correctly, set date also in routes doesn't seem to be sized correctly
- [ ] Make sure you can list all previous attempts
- [ ] Picture recognition of the route
- [ ] Make it work with ratings at Edge works, like 5.10+/-
- [ ] Why did show install button on android and not iOS?
- [ ] Proper backend with account and syncing etc
- [x] The attempts list on desktop didn't seem to size the cards nicely
