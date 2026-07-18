# Product Blueprint

## Navigation model

The product has five primary spaces, consistent on desktop and mobile:

1. **Today** — exceptions, shared agenda, dinner, groceries, and one-tap scenes.
2. **Plan** — tasks, recurring chores, calendar, meal plan, and shared lists.
3. **Home** — rooms, sensors, devices, energy, doors/water, and automations.
4. **Cinema** — continue watching, watchlist, discovery, movie-night queue, playback targets, and remote controls.
5. **Library** — belongings, warranties, documents, manuals, and maintenance.

Vault, monitoring, and administration live in a compact utility drawer rather than primary navigation.

## Core interaction rule

The dashboard owns intents, not records. A user says “buy milk”, “movie night”, “mark this done”, or “where is the drill”; server-side adapters translate the intent into Mealie, Vikunja, Homebox, Jellyfin, or Home Assistant operations.

## Today surface

- Contextual greeting and date, without decorative weather unless it affects a decision.
- One attention strip ranked by safety, deadline, household friction, then system health.
- Shared tasks: create, complete, postpone, assign, and expand recurring details inline.
- Dinner: planned recipe, servings, missing ingredients, replace meal, add ingredients to groceries.
- Groceries: quick add, check off, grouping, and “shopping mode” optimized for one hand.
- Scenes: Movie Night, Sleep, Leaving, Arriving; confirmation only for security-sensitive actions.

## Cinema module

### Foundation

- Jellyfin remains the media authority and playback engine.
- Dashboard adapter reads users, libraries, latest media, resume state, sessions, and devices.
- No media file is proxied through the dashboard.

### Household experience

- “Continue together” reconciles both residents’ progress without overwriting personal history.
- Movie-night queue supports voting, veto, runtime filters, and a random “pick for us” action.
- Detail drawer shows poster, synopsis, runtime, genres, rating, availability, trailer link, and playback targets.
- One action starts playback on a selected TV/client and activates the Home Assistant Movie Night scene.
- Remote mode exposes play/pause, seek, volume, subtitles, lights, and “snack break”.
- Phone view becomes a remote; TV view becomes a ten-foot browsing interface.

### Later enhancements

- Download/ingest status, subtitle health, storage forecast, and duplicate detection.
- Optional recommendations based only on local watch history.
- Shared “memories” shelf for photos and home videos, explicitly separated from commercial media.

## Home module

- Room-first overview with state summaries, not a grid of device toggles.
- Automations are event-driven; manual controls are exceptions.
- Safety states (water leak, open door, smoke, offline critical sensor) always override decorative content.
- Every scene is reversible and reports partial failure.

## Library module

- Global search across name, location, tag, serial number, warranty, and manual.
- Quick capture supports barcode/QR, photo, location, quantity, and receipt.
- Maintenance timeline creates Vikunja follow-up tasks without duplicating schedules.

## Security boundaries

- API tokens remain server-side and receive minimum scopes.
- Dashboard writes use an explicit action allowlist and validated payloads.
- Destructive and physical-security actions require confirmation and an audit event.
- Vaultwarden secrets are never fetched, indexed, cached, logged, or rendered.
- Remote access is VPN-only; LAN access is not treated as sufficient authorization forever.

## Product metrics

- Routine action completion: ≤3 interactions.
- First useful content: ≤1.5 s on wired LAN, ≤2.5 s on mid-range Wi-Fi phone.
- Action acknowledgement: ≤300 ms optimistic feedback; authoritative result ≤2 s.
- Dashboard availability target: 99.5% monthly within the LAN.
- Accessibility: WCAG 2.2 AA target and complete keyboard operation.
- Motion: stable 60 fps desktop, ≥45 fps mid-range mobile, zero continuous motion in reduced-motion mode.
