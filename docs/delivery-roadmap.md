# Delivery Roadmap

## Phase 0 — Product foundation (current planning pass)

- Product context, navigation, design direction, cinema scope, quality budgets, and documentation policy.
- No production UI change.

## Phase 1 — Shell and design system

- Responsive application shell, command palette, contextual drawer, tokenized colors/type/spacing, complete states, motion/lite modes, keyboard/remote focus model.
- Capture desktop and mobile screenshots; record Lighthouse and bundle metrics.

## Phase 2 — Daily household completeness

- Full task lifecycle, grocery check-off/edit/grouping, meal replacement and servings, Homebox global search/capture, cross-service quick actions, per-resident attribution.

## Phase 3 — Cinema foundation

- Deploy Jellyfin, storage/library model, hardware transcoding validation, server adapter, continue watching, watchlist, detail drawer, playback targets.

## Phase 4 — Movie Night

- Shared queue/voting, “pick for us”, Home Assistant scene orchestration, phone remote, TV ten-foot mode, playback session controls.

## Phase 5 — Smart apartment

- Home Assistant integration, room summaries, safety alerts, scenes, energy, presence, reversible automation actions.

## Phase 6 — Reliability and identity

- Dashboard authentication/household authorization, scoped tokens, action audit, backups and restore drills, update channels, observability SLOs, offline behavior.

## Definition of done for every UI release

- Tests, lint, production build, API contract tests, keyboard pass, reduced-motion pass, and phone breakpoint pass.
- Real desktop and mobile screenshots updated in `docs/assets/`.
- English README updated with verified feature status and metrics; no aspirational feature presented as shipped.
- Performance numbers include date, device/profile, command/tool, and commit SHA.
- Deployment health and rollback instructions verified.
