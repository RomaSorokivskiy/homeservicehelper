# Experience and Visual Direction

## Mood

“Quiet cinematic home”: warm editorial typography, deep forest and mineral neutrals, soft evening light, tactile cards, and restrained cinematic depth. It should feel premium and alive without resembling a marketing landing page or a noisy smart-home control panel.

## Scene architecture

Operational screens stay compact. Cinematic treatment is concentrated in transitions and hero modules:

- **Today:** depth-0 ambient day/evening wash; depth-1 room glow; depth-2 contextual accents; depth-3 active household object; depth-4 data and controls; depth-5 transient feedback.
- **Cinema:** poster wall at depth-0, projected light at depth-1, companion posters at depth-2, selected title at depth-3, controls at depth-4, grain/highlight at depth-5.
- **Home:** room silhouette depth-0, environmental state depth-1, room objects depth-2/3, controls depth-4, alerts depth-5.

Every major scene uses at least three layers. UI text and controls remain crisp at depth-4. Decorative elements are `aria-hidden`.

## Motion language

- Route changes: window-pane iris or short curtain reveal, 350–550 ms.
- Cards: staggered clip reveal, never perpetual bouncing.
- Cinema selection: selected poster moves to depth-3; companions scatter subtly.
- State changes: transform/opacity only, immediate optimistic feedback, then authoritative confirmation.
- No layout-property animation. IntersectionObserver activates off-screen motion.
- Touch and ≤4-core devices use lite mode; mouse parallax and particles are disabled.
- A visible motion toggle complements `prefers-reduced-motion`.

## Component system

- Attention strip, action composer, command palette, contextual drawer, shared status chip, resident avatar pair, data freshness label, empty/error/offline states, destructive confirmation, and TV focus ring.
- Minimum touch target: 44×44 px; TV target: 64×64 px.
- Normal text contrast ≥4.5:1; UI and focus contrast ≥3:1.
- One `h1`; logical landmarks; skip link; full keyboard and remote navigation.

## Asset audit and plan

- Router screenshot: 1913×1072 opaque PNG with complex background. Keep intact for documentation only; no depth assignment in product UI.
- Current `og.png`: 1730×909 RGB PNG with a light background. Keep intact as a complete social card; do not remove background or float it.
- Before cinema implementation, capture or source real Jellyfin posters/backdrops only from the household library. Posters remain complete artwork at depth-0/2; backgrounds are never removed.
- Generate one new social card only after the final visual direction and primary copy are stable.

## Performance budgets

- Initial JS ≤180 KB gzip for the dashboard route.
- Above-fold image payload ≤500 KB; total route imagery ≤2 MB.
- Fewer than 20 simultaneously promoted layers and fewer than 40 animated elements.
- No secrets, raw upstream responses, or personal media metadata in static assets or social previews.
