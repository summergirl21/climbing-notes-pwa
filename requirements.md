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
- View a list of climbs with filters:
  - Gym, rope number, color, grade, set date, climb date, completion style.
- Search by route identity (gym + rope + color + set date) and show:
  - Previous attempts and outcomes
  - Dates of prior climbs
  - Notes and grades from those attempts
- Session/day view (per calendar date) with stats:
  - Total climbs (attempts)
  - Grade distribution
  - Max grade

## Data rules and validation
- Route identity is unique within a gym by `rope_number + color + set_date`.
- A route may have many attempts across multiple dates.
- A route may have multiple attempts on the same day; `attempt_index` orders them.
- Attempts are stored individually, but can be aggregated for stats and summaries.
- Grades must be Yosemite format (`5.x`, including letter suffixes like `5.10a`).

## Non-functional requirements
- Data is stored locally by default.
- All features work offline.
