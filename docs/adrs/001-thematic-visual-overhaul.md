# ADR-001: Thematic Visual Overhaul

**Status:** Proposed  
**Date:** 2026-06-13

## Context

The game UI is functional but looks like a corporate dashboard — flat dark slate surfaces, system sans-serif fonts, smooth glass morphism. The physical Munchkin game has strong visual identity: parchment textures, medieval cartoon art, dungeon stone boards, thick card borders, and playful typography. Users expect that level of personality in a digital adaptation.

## Decisions

### 1. Background Texture: CSS-only parchment/dungeon

**Decision:** Replace flat navy (#0b1120) with layered CSS gradients simulating warm parchment/dungeon stone. No image assets.

**Why:** Pure CSS is performant (GPU-composited), cacheable, and avoids asset loading. The shift from cold navy to warm dark brown (#1a1208) changes the entire feel without touching component code.

**Trade-off:** Less realistic than a real texture image, but good enough and zero-latency.

### 2. Typography: MedievalSharp for display

**Decision:** Add MedievalSharp (Google Fonts) for headers, card names, section labels, level numbers. Keep system sans-serif for body text, stats, and action buttons.

**Why:** MedievalSharp is ~18KB woff2, has one weight (400), renders well at large sizes, and has the playful medieval feel that matches Munchkin's art style. System font for body preserves readability on mobile.

**Trade-off:** One additional HTTP request. Mitigated with `display=swap` (no FOIT).

### 3. Card Borders: Thicker, double-frame effect

**Decision:** Increase card border from 2px to 3px, add inset box-shadow for inner frame, reduce rounding from 2xl to xl. Keep per-type color coding.

**Why:** Physical cards have visible borders and inner frames. Slightly less rounded corners feel more like real cards.

**Constraint:** `ring-4 ring-amber-400` on selected cards must stay (test dependency).

### 4. Level Tracker: Step-stone track (1-10)

**Decision:** Replace the big level number with a row of 10 numbered circles. Filled = achieved, empty = remaining. Current level pulses on level-up.

**Why:** Maps to the physical game's level dial/track. Immediately readable, compact, and visually distinctive.

**Trade-off:** Takes more horizontal space than a single number. Acceptable on mobile (10 small circles fit in ~200px).

### 5. Equipment Slots: Visual slot grid

**Decision:** Replace the scrollable tag strip with a visual grid showing head/body/feet/hand slots. Empty slots shown as dashed outlines. Mirrors the physical playmat layout.

**Layout:**
```
     [  Head  ]
[Hand] [ Body ] [Hand]
     [  Feet  ]
```

**Why:** The playmat's slot layout is iconic to Munchkin. Players immediately understand where their gear goes.

### 6. Thematic Icons: Deferred

**Decision:** Keep emoji icons for now. Replace only the `typeIcons` record in Card.tsx (rendered with aria-hidden, not tested) in a follow-up.

**Why:** Icon strings appear in i18n button labels matched by test regexes. Changing them risks test breakage for low visual gain. The emoji actually fit Munchkin's playful tone.

## Color Palette Shift

| Element | Before (cold) | After (warm) |
|---------|--------------|--------------|
| Background | #0b1120 (navy) | #1a1208 (dark brown) |
| Surface | #1c2433 (slate) | #2a1f14 (warm brown) |
| Surface 2 | #232f44 | #3d2e1e |
| Border | #334155 (slate) | #5c4a35 (amber-brown) |
| Text | #e2e8f0 (cool white) | #e8dcc8 (warm parchment) |
| Accent | #fbbf24 (amber) | #fbbf24 (unchanged) |

## Consequences

- All 229 tests must pass with zero changes to test files
- No i18n keys renamed
- Performance: +1 HTTP request (font), CSS changes only otherwise
- The warm palette affects every screen — Home, Lobby, PlayerView, BoardView all shift together via CSS variables
