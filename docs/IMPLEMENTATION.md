# Halı Saha Kadro — Implementation Reference

Agent-oriented guide for the **current** codebase. Use this file as the single source of truth for architecture, feature boundaries, and where to add code.

**Companion files:**
- `docs/TODO.md` — retrospective checklist of completed work (what exists today)
- `docs/QA-CHECKLIST.md` — manual smoke tests per feature

---

## 1. What this app does

Single-page **football pitch poster editor** for amateur league matches (halı saha). Users configure:

- Two teams (roster, formation, captain, jersey, logo)
- Player photos with optional background removal
- Match title, venue, date, time
- Visual theme and layout sliders
- Bench/substitute pool
- PNG export

**Optional Firebase:** signed-in users sync poster data to Firestore; media can upload to Firebase Storage. Without Firebase config the app works offline in the browser via `localStorage`.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| State | Zustand + `persist` middleware |
| Auth / DB / Storage | Firebase (Auth, Firestore, Storage) |
| BG removal | `@imgly/background-removal` + ONNX runtime |
| Export | `html-to-image` (`toPng`) |
| Icons | `lucide-react` |

**Entry:** `src/app/page.tsx` → `AppProviders` → `AppShell`

---

## 3. Architecture layers

```
┌─────────────────────────────────────────────────────────────┐
│  UI (src/components/)                                       │
│  AppShell orchestrates modals, toolbar, poster, bench       │
└───────────────────────────┬─────────────────────────────────┘
                            │ useAppStore()
┌───────────────────────────▼─────────────────────────────────┐
│  State (src/store/useAppStore.ts)                             │
│  All poster mutations; persist v35; editVersion counter     │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌───────────────────┐
│ Domain lib/   │  │ Snapshot lib/  │  │ Cloud lib/        │
│ formations,   │  │ posterSnapshot │  │ lib/cloud/*       │
│ logos, photos │  │ brandingSnap.  │  │ SyncController    │
└───────────────┘  └────────────────┘  └───────────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
              localStorage (partialize)     Firestore posters/{uid}
                                            Firebase Storage (media)
```

### Layer rules for agents

1. **UI components** read/write store; avoid duplicating business logic in components.
2. **Domain logic** lives in `src/lib/` — pure functions, no React.
3. **Serialization** (build/parse/merge snapshots) lives in `posterSnapshot.ts` and `brandingSnapshot.ts`.
4. **Cloud I/O** only through `src/lib/cloud/posterRepository.ts` (+ `mediaSync.ts` for uploads). Sync decisions only in `src/lib/cloud/syncController.ts`; `AuthContext.tsx` just starts/stops it and renders its state.
5. **Never** persist blob URLs; use **data URLs** locally, **Storage paths** in cloud.

---

## 4. Bootstrap & render flow

```
page.tsx
└── MobileGate            → phones/tablets get "Mobil uygulamamız yakında"; app never boots
    └── AppProviders
AppProviders
├── AuthProvider          → Firebase auth; starts/stops SyncController; exposes `sync` state; renders LoginConflictModal
├── AppBootstrapGate      → waits: store hydrate + auth + first cloud load (`sync.phase === "loading" && !sync.error`)
│   └── idle: compressAllSavedPlayers() once
└── AuthModal

AppShell
├── PosterToolbar
├── MatchPoster           → id="match-poster" (export target)
├── BenchPanel
├── PlayerEditModal       → dynamic import, ssr: false
└── LogoDesignerModal
```

**Hydration order:**
1. Zustand rehydrates from IndexedDB/localStorage (`halisaha-kadro`, persist v35)
2. `onRehydrateStorage` runs `finalizePosterSnapshot`
3. If user signed in, `SyncController.start(uid)` fetches `posters/{uid}` and decides (see F11): adopt cloud, keep local and save, or open a conflict
4. Cloud data enters the store only via `applyCloudSnapshot` (replace, no `editVersion` bump)
5. `AppBootstrapGate` hides loading screen when all ready

---

## 5. Current data model

### 5.1 Core types (`src/types/index.ts`)

| Type | Purpose |
|------|---------|
| `Player` | `id`, `name`, `number`, photo fields (`photoSource`, `cutoutUrl`, `photoCrop`), optional `cutoutStoragePath` / `photoSourceStoragePath` |
| `TeamConfig` | `name`, `shortName`, `jersey`, `atmosphereColor`, `logo`, `playerIds[]`, `captainId?` |
| `TeamLogo` | `mode`: `preset` \| `generated` \| `upload`; shape/colors/icon fields; optional `imageUrl`, `storagePath` |
| `MatchInfo` | Title lines, subtitle, style/effect ids, font sliders, `venue`, `time`, `date` |
| `PitchPlayer` | `playerId`, `slotIndex`, `team`, optional drag `x`/`y` |
| `SquadSize` | `6` \| `7` \| `8` |

### 5.2 App store shape (`useAppStore`)

**Persisted poster fields** (via `partialize` → `buildPosterSnapshot` + `editVersion`):

- `mode`, `matchInfo`, `squadSize`, `homeTeam`, `awayTeam`
- `teamMode` (`single` | `versus`)
- `savedPlayers`, `benchPlayerIds`, `homeFormationId`, `awayFormationId`
- `pitchPlayers`, `playerCardSize`, `photoScalePercent`, `teamLogoDisplaySize`, `posterTheme`
- `localUpdatedAt`, `editVersion`

**Runtime-only** (not in snapshot):

- `players` — active registry rebuilt from lineup + bench
- `logoDesignerTeam`
- Drag preview state lives in a **separate** store `src/store/useDragStore.ts` (`dragIntent`). It must not live in `useAppStore`: every `useAppStore` set() makes the persist middleware serialize the whole poster (photos included) to IndexedDB + localStorage.

### 5.3 PosterSnapshot (`src/lib/posterSnapshot.ts`)

Canonical serialized poster document. Functions:

| Function | Role |
|----------|------|
| `buildPosterSnapshot(source)` | Store → snapshot; prunes `savedPlayers` to lineup+bench IDs only |
| `parsePosterSnapshot(raw)` | Validate/deserialize |
| `finalizePosterSnapshot(partial)` | Normalize teams, fill empty slots, rebuild `players` |
| `normalizeMatchInfo` | Always use when touching `matchInfo` |

### 5.4 Edit counter (`editVersion`)

A single monotonic counter in the store. The `set()` wrapper increments it (and `localUpdatedAt`) whenever a poster key changes; `applyCloudSnapshot` does **not**. The sync layer compares it with the last synced marker (`halisaha-synced:{uid}` → `{editVersion, revision}`) to know whether there are unsaved local edits. Replaces the old 4-domain `syncRevisions` (removed in persist v35).

---

## 6. Feature catalog

Each feature lists: **UI → store actions → lib → QA section**.

### F1 — Poster canvas & layout

| | |
|---|---|
| **UI** | `MatchPoster.tsx`, `StaticPosterBackground.tsx`, `PitchPlayerLayer.tsx`, `PlayerOnPitch.tsx` |
| **Store** | `setPosterTheme`, `setPlayerCardSize`, `setPhotoScalePercent`, `setSquadSize`, `setHomeFormation`, `setAwayFormation` |
| **Lib** | `posterThemes.ts`, `posterLayout.ts`, `formations.ts`, `formationEngine.ts`, `usePosterMetrics.ts` |
| **QA** | §4, §9 |

Themes: `derby-night`, `champions-night`, `dark-arena`, `summer-cup`. Background images from `getPosterThemeBackgroundSrc()`.

Formations (`src/lib/formations.ts`, `src/lib/formationEngine.ts`):
- Squad sizes: 6v6, 7v7, 8v8. `squadSize` is total players **including** the goalkeeper.
- Formation notation counts outfield lines from defense to attack; the goalkeeper is never shown in the name.
- No formation starts with 1 defender.
- 6v6 (5 outfield): `2-2-1`, `2-1-2`, `3-1-1`.
- 7v7 (6 outfield): `2-2-2`, `2-1-3`, `2-3-1`, `3-2-1`, `3-1-2`.
- 8v8 (7 outfield): `2-2-3`, `2-3-2`, `2-1-4`, `2-4-1`, `3-2-2`, `3-1-3`, `3-3-1`, `4-2-1`, `4-1-2`.
- Default formations: 6v6 → `3-1-1`, 7v7 → `3-2-1`, 8v8 → `3-3-1`.
- Versus mode uses a horizontal pitch: home attacks right, away attacks left, `computeFormationLayout` places slots by depth (`x`) and lateral spread (`y`).
- Single-team mode uses a vertical pitch inside the 4:5 poster. `computeSingleFormationLayout` places the goalkeeper at the bottom center and stacks defenders, midfielders and attackers upward, with card-aware spacing and clamping.

### F2 — Roster & lineup slots

| | |
|---|---|
| **UI** | `PlayerOnPitch`, `PosterEditableText` (inline name edit) |
| **Store** | `setSlotPlayer`, `clearSlot`, `setCaptain`, `applyFormations`, `swapPlayers`, `movePitchPlayer` |
| **Lib** | `defaultRoster.ts`, `playerPool.ts`, `teamJerseyNumbers.ts` |
| **QA** | §1, §9 |

`players` = active lineup+bench registry. `savedPlayers` = persisted superset (pruned on snapshot build).

### F3 — Player edit modal & photos

| | |
|---|---|
| **UI** | `PlayerEditModal.tsx` (dynamic, `ssr: false` in `AppShell`) |
| **Store** | `setSlotPlayer`, `updatePlayer`, `updateBenchPlayer` |
| **Lib** | `fileToDataUrl.ts`, `photoCrop.ts`, `playerPhotos.ts`, `imageCompress.ts` |
| **QA** | §1, §2 |

**Modal rules:** `useModalBackdrop` + `ModalShell`. File picker sets `pickingFileRef` so backdrop does not close modal. Long tasks set `busy`.

### F4 — Background removal

| | |
|---|---|
| **UI** | `PlayerEditModal` |
| **Lib** | `backgroundRemoval.ts` — **static import** of `@imgly/background-removal` (required; dynamic import breaks dev HMR) |
| **Persist** | Save cutout as **data URL** via `fileToDataUrl`; never blob URL |
| **QA** | §3 |
| **Model** | No preload; ~40MB model downloads on first "Arka plan kaldır" and is served from browser cache afterwards. `isModelReady()` flips after the first successful run. |

Config: model `isnet_quint8`, output `image/webp` Q90, CPU inference. Progress separates `fetch:` (model download) from `compute:` (inference). `isModelReady()` lets UI check preload status.

### F5 — Drag, drop & swap on pitch

| | |
|---|---|---|
| **UI** | `PlayerOnPitch.tsx`, `PlayerDropOverlay.tsx` |
| **Store** | `useDragStore` (`dragIntent`, runtime-only, not persisted), `swapPlayers`, `movePitchPlayer`, `clearPitchPlayerPosition` |
| **Logic** | `swapPlayers` swaps `playerIds` only, then `applyFormations()`; jersey conflicts via `resolveSameTeamJerseyConflicts`; movement policy and `SlotRules` from `pitchInteraction.ts`; geometry-based drop targets from `dropTargets.ts`; auto card sizing from `posterLayout.ts` |
| **Hook** | `usePlayerDrag.ts` — shared pointer capture, threshold, portal offset, and release handling |
| **Sizing** | `useAutoCardSize.ts` + `getAutoCardSize()` — responsive pitch/bench card size |
| **Preview** | `PlayerDragPreview.tsx` — shared pitch + bench drag ghost |
| **QA** | §1, §6, §9 |

A pitch player card can be dragged to reposition, to swap with another pitch player, or to drop onto the bench panel / a bench card. During drag a portal clone follows the cursor. Swap targets and bench drop targets are highlighted with `PlayerDropOverlay`.

Card size is **auto-responsive**: `PitchPlayerLayer` and `BenchPanel` both use `useAutoCardSize()`, which calls `getAutoCardSize(metrics, maxInRow, teamMode)`. Single-team mode keeps cards compact to avoid vertical overlap in the portrait layout, while versus mode uses a slightly larger default. The manual player-card-size slider was removed so the layout scales with the browser window/tab on 13"-27" screens.
- `swap` — green "DEĞİŞTİR" on both the dragged clone and the target card.
- `sub-out` — red "ÇIKAN" on the dragged clone when moving to bench.
- `sub-in` — green "GİREN" on the bench target card.

Goalkeepers can be dragged for swaps (including with bench players) but cannot be freely repositioned or sent to an empty bench area; these rules are enforced by `SlotRules` from `pitchInteraction.ts` rather than ad-hoc `isGoalkeeper` branches.

**Refactor status:** Phases 1–5 complete — transient drag states collapsed into `dragIntent`, drag interaction handled by `usePlayerDrag`, drop-target detection is geometry-based, goalkeeper restrictions are expressed through `SlotRules`, and drag preview rendering is centralized in `PlayerDragPreview`.

**Remaining refactor:** none currently planned for the drag-and-drop subsystem.

### F6 — Team branding (logo & jersey)

| | |
|---|---|
| **UI** | `LogoDesignerModal.tsx`, `LogoDesignerPresetPanel.tsx`, `LogoDesignerCustomPanel.tsx`, `TeamBrandingPreview.tsx`, `JerseyControls.tsx`, `TeamLogoBadge.tsx` |
| **Store** | `updateHomeTeam`, `updateAwayTeam`, `setTeamLogoDisplaySize`, `setLogoDesignerTeam` |
| **Lib** | `logoUtils.ts`, `logoPresets.ts`, `logoImagePresets.ts`, `logoRandomize.ts`, `jerseyOptions.ts`, `teamLogoCloud.ts`, `brandingSnapshot.ts` |
| **QA** | §7, §7b |

Logo modes: `preset` (PNG assets), `generated` (SVG-like params), `upload` (user image).

### F7 — Match title & footer

| | |
|---|---|
| **UI** | `PosterTitleDisplay.tsx`, `PosterTitleModal.tsx`, `PosterDateField.tsx`, `PosterEditableText.tsx` |
| **Store** | `setMatchInfo` |
| **Lib** | `posterTitleStyles.ts`, `matchDate.ts` |
| **QA** | §8 |

Title modal keeps preview fixed at top while scrolling effect/color controls.

### F8 — Bench / substitutes

| | |
|---|---|---|
| **UI** | `BenchPanel.tsx`, `PlayerOnPitch.tsx`, `PlayerDropOverlay.tsx` |
| **Store** | `addPlayerToBench`, `updateBenchPlayer`, `removeFromBench`, `assignBenchToSlot`, `moveSlotToBench` |
| **Lib** | `playerPool.ts` (`sanitizeBenchIds`, `rebuildActivePlayers`) |
| **Hook** | `usePlayerDrag.ts` shared between pitch and bench cards |
| **Preview** | `PlayerDragPreview.tsx` — shared drag ghost |
| **QA** | §5, §6 |

Substitutions are **drag-and-drop only**:
- Drag a bench player from `BenchPanel` onto a pitch player to swap them (`assignBenchToSlot`).
- Drag a pitch player onto the bench panel (or onto a bench card) to swap/send them to the bench (`moveSlotToBench` / `assignBenchToSlot`).
- Both directions use geometry-based target detection (`src/lib/dropTargets.ts`) over shared `data-*` attributes to locate the drop target.
- Dragged cards render a portal-based floating clone (`createPortal`) so they can leave the pitch container and reach the bench panel in both single-team and versus modes.
- Bench cards are rendered with `PlayerAvatar` to match the pitch player cards, with a `GripVertical` drag handle.
- Bench card size is measured from the panel itself via `ResizeObserver`, so it also responds to viewport / panel width changes.
- Overlay semantics mirror football substitution boards:
  - `sub-in` (green ↑ `GİREN`) on the incoming bench card or dragged bench clone.
  - `sub-out` (red ↓ `ÇIKAN`) on the outgoing pitch slot or dragged pitch clone.
  - `swap` (green `DEĞİŞTİR`) when two on-field players swap.
- `BenchPanel` captures the pointer on the bench card so release is handled by the bench card, preventing the underlying pitch slot from opening edit.
- Drag state is always cleared after a drop/swap/move to avoid stuck cards.

`AssignToLineupModal` and the "Yedekle değiştir" / "Yedeğe gönder" buttons in `PlayerEditModal` were removed.

**Refactor status:** Phases 1–5 complete — `dragIntent` model, shared `usePlayerDrag` hook, geometry-based `dropTargets.ts`, explicit `SlotRules` policy, and centralized `PlayerDragPreview` rendering.

**Remaining refactor:** none currently planned for the drag-and-drop subsystem.

### F9 — PNG export

| | |
|---|---|
| **UI** | `AppShell.handleExport` |
| **Lib** | `html-to-image` `toPng` on `#match-poster`, `pixelRatio: 2` |
| **QA** | §10 |

### F10 — Auth & account UI

| | |
|---|---|
| **UI** | `AuthModal.tsx`, `UserAuthButton.tsx` |
| **Context** | `AuthContext.tsx` |
| **Lib** | `firebase/client.ts`, `firebase/app.ts`, `cloud/errors.mapAuthError` |
| **Env** | `NEXT_PUBLIC_FIREBASE_*` in `.env.local` |
| **Rules** | `firebase/firestore.rules` — user can only RW `posters/{ownUid}` |

### F11 — Cloud sync

| | |
|---|---|
| **Decisions** | `src/lib/cloud/syncController.ts` — pure state machine, no React/Firebase imports; unit-tested with `src/test/fakeCloud.ts` |
| **Wiring** | `src/lib/cloud/syncRuntime.ts` — the one controller instance (repository + store adapter + `browserSyncMeta` + `reportError`) |
| **IO** | `src/lib/cloud/posterRepository.ts` — `fetchPoster`, `savePoster` (transaction, revision +1), `subscribePoster`, `deleteOrphanedMedia` |
| **Document** | `src/lib/cloud/cloudDocument.ts` — parse (incl. legacy `branding` field) / slim for cloud / Storage path diff |
| **Meta** | `src/lib/cloud/syncMeta.ts` — `halisaha-local-owner`, `halisaha-synced:{uid}` in localStorage |
| **Media** | `mediaSync.ts`, `firebase/storage.ts` |
| **UI** | `UserAuthButton` via `describeSyncIndicator` (`cloud/syncIndicator.ts`); `LoginConflictModal` (reason `guest-data` / `concurrent-edit`) |
| **QA** | §7b, §11, §36, §40 |

**States:** `idle` (no user) → `loading` (fetch, retry with backoff on network errors) → `conflict` (user must choose) or `ready` (saving/pending/error/notice flags) ; `error` = unreadable document.

**Initial decision (`decideInitial`):**
- Device owner is this user: no unsaved edits or local == cloud → adopt cloud. Unsaved edits and cloud revision unchanged since last sync → keep local and save. Otherwise → `concurrent-edit` conflict.
- Device not owned by this user (guest data): local untouched or equal → adopt cloud. Otherwise → `guest-data` conflict.
- No document → write local as revision 1. Legacy document → adopted and rewritten once (legacy fields deleted).
- Adopting a document flagged `photosOmitted`/`logosOmitted` keeps this device's copies of the omitted media (`policy.restoreOmittedMedia`); without the flag the cloud wins (a deliberate removal elsewhere is respected).

**Saving:** debounce 2.5s, max wait 15s, one write in flight; retry 3s→60s backoff; `resource-exhausted` → 30s cooldown. `failed-precondition` (revision mismatch) → refetch and decide again (may become `concurrent-edit`).

**Realtime:** `onSnapshot` on `posters/{uid}`. Changes with revision ≤ known are echoes and ignored; newer ones are applied when there are no unsaved edits, otherwise → `concurrent-edit` conflict. Nothing is overwritten silently.

**Lifecycle:** `visibilitychange(hidden)` / `pagehide` → `flushInBackground()`. Sign-out → `flushNow(20s)`; on failure the user must confirm "Yine de çık". Account deletion → `waitForIdle()` → `stop()` before deleting data.

**Media cleanup:** after a successful save, Storage paths referenced by the previous cloud snapshot but not the new one are deleted (`orphanedStoragePaths`).

## F12 — Image compression bootstrap

| | |
|---|---|
| **UI** | `AppBootstrapGate.tsx` |
| **Lib** | `imageCompress.compressAllSavedPlayers` on idle after app ready |

One-time migration-style compression of legacy large data URLs in localStorage. Uses `Player.didCompress` flag to track which players have been processed. Only re-compresses players where `didCompress` is falsy.

### F13 — Photo quality optimization (v29)

| | |
|---|---|
| **Lib** | `imageCompress.ts`, `mediaSync.ts` |

|| Parameter | Before | After |
||-----------|--------|-------|
|| `DEFAULT_PHOTO_MAX` | 200px | **400px** |
|| `DEFAULT_CUTOUT_MAX` | 200px | **400px** |
|| Default JPEG/WebP quality | 0.75 | **0.85** |
|| Cloud tier 1 max edge | 180px @ 0.75 | **300px @ 0.80** |
|| Cloud tier 2 max edge | 140px @ 0.70 | **200px @ 0.75** |
|| Cloud tier 3 max edge | 100px @ 0.65 | **140px @ 0.70** |

Store version 28 → 29 migration marks all `savedPlayers`/`players` with `didCompress: false`. `AppBootstrapGate` idle callback re-compresses at new quality. Firebase Storage upload uses new tier parameters. localStorage footprint ~1.5MB for 18 players (within 5-10MB limit).

### F14 — Single-team roster mode

`teamMode` is persisted as `single` or `versus` (store v32). `singlePitchPlayers` stores single-mode positions separately from versus `pitchPlayers`. Existing users migrate to `versus`; fresh state defaults to `single`. In `single` mode, `homeTeam` is the user's roster, the poster uses a 4:5 composition, and each theme uses a dedicated vertical asset: Derby Night maps to `derby_night_vertical.jpeg`, Champions League to `champions_league_vertical.jpeg`, Dark Arena to `dark_arena_vertical.jpeg`, and Summer Cup to `summer_cup_vertical.jpeg`. All vertical assets are `928x1152` (4:5 aspect ratio) and live in `public/posters/vertical/`. The team logo is placed upper-left, the default `DERBİ GECESİ` title is hidden, and away lineup/branding controls are hidden. The existing `awayTeam` data and versus positions are retained so switching back to `versus` is lossless. This is a presentation/editing mode, not a second team data model.

Pitch movement is centralized in `src/lib/pitchInteraction.ts`. The component receives a movement policy instead of branching on team mode. Single mode allows full-pitch movement for outfield players while keeping the goalkeeper locked; versus mode lets a card travel across the pitch for cross-team swap while allowing a final drop only in its own half. Position actions upsert missing positions so a fresh single-mode lineup can be dragged immediately.

`applyFormations()` writes to `singlePitchPlayers` in single mode and to `pitchPlayers` in versus mode, preserving custom drag positions unless a reset is requested. Formation changes reset only the affected team's positions.

The black side margins outside the 4:5 poster are filled with a very subtle radial gradient using the active team's `atmosphereColor` so the editing canvas does not look like a disabled area. In versus mode the gradient uses both home and away colors.

---

## 7. Store conventions

### 7.1 The `set()` wrapper

All poster mutations go through wrapped `set()`:

- Updates `localUpdatedAt` when poster keys change
- Increments `editVersion`

`applyCloudSnapshot` and internal normalizations (formation fixes, `applyCompressedPlayers` when only the `didCompress` flag changed) use `realSet` directly — they are not user edits and must not trigger a save. Compressed photos do go through `set()` so the smaller images reach the cloud.

### 7.2 Persist middleware (v35)

| Hook | Responsibility |
|------|----------------|
| `partialize` | `buildPosterSnapshot(s)` + `editVersion` |
| `merge` | `{...current, ...saved, editVersion}` (local persisted copy wins; cloud merging is the SyncController's job) |
| `onRehydrateStorage` | `finalizePosterSnapshot`, mark `hasAppStoreHydrated()` |
| `migrate` | Only forward migrations; agents adding fields must bump version and add `migrate` block |

**When changing persisted shape:**
1. Bump `version` in persist config
2. Add `if (version < N)` migrate block
3. Update `merge` / `onRehydrateStorage` if needed
4. Never remove `partialize` fields without migration

### 7.3 Normalization helpers (always use)

- `normalizeMatchInfo()` — match info fields
- `normalizePosterTheme()` — theme id + legacy mapping
- `normalizeTeamLogo()` / `normalizeJersey()` — team branding
- `finalizePosterSnapshot()` — after any load/merge

---

## 8. Modal pattern (required for new modals)

```tsx
// useModalBackdrop: pickingFileRef + busy guard
const { backdropProps, contentProps, openFilePicker } = useModalBackdrop({
  open,
  onClose,
  busy: isProcessing,
});

// ModalShell for consistent layout
<ModalShell open={open} title="..." onClose={onClose} {...backdropProps}>
  <div {...contentProps}>...</div>
</ModalShell>
```

Heavy client-only modals: `next/dynamic(..., { ssr: false })` from `AppShell`.

---

## 9. How to add a new feature

Follow this order:

```
1. types/index.ts          — new fields if needed
2. src/lib/                — pure logic, normalization
3. useAppStore.ts          — actions (poster keys bump editVersion automatically)
4. posterSnapshot.ts       — if field must persist / sync
5. brandingSnapshot.ts     — only if branding-domain
6. components/             — UI
7. lib/cloud/cloudDocument.ts — only if cloud shape changes
8. docs/QA-CHECKLIST.md    — new § with test steps
9. npm run build && npm run lint
```

**Cloud impact checklist:**

| Change type | Touch |
|-------------|-------|
| Anything persisted | goes into the single cloud document automatically (via `buildPosterSnapshot`) |
| Photos / uploaded logos | Storage path fields + `mediaSync` upload; `cloudDocument.storagePathsOf` for cleanup |
| New persisted field | persist version bump + migrate |

---

## 10. Known limitations & dead code

| Item | Notes |
|------|-------|
| `requestBrandingCloudFlush` | `posterSyncEvents.ts`; prefer store revision bump + sync manager |
| Firestore 1MB limit | Mitigated by slim data, branding split, Storage paths, compression tiers |
| BG removal | Requires internet on first use; large download |
| `AGENTS.md` / `CLAUDE.md` | Legacy; **this file replaces them** for agent guidance |

---

## 11. Directory index

### `src/components/`

| File | Role |
|------|------|
| `AppShell.tsx` | Main layout, export, modal orchestration |
| `AppProviders.tsx` | Auth + bootstrap wrapper |
| `AppBootstrapGate.tsx` | Loading gate + image compression |
| `MatchPoster.tsx` | Poster composition root |
| `PlayerOnPitch.tsx` | Draggable player card on pitch |
| `PitchPlayerLayer.tsx` | Positions all pitch players |
| `PosterToolbar.tsx` | Theme, format, formation, sliders, sync label |
| `BenchPanel.tsx` | Substitute pool UI |
| `PlayerEditModal.tsx` | Player name/number/photo/bg removal |
| `LogoDesignerModal.tsx` | Team logo & jersey designer |
| `PosterTitleModal.tsx` | Title style editor |
| `ModalShell.tsx` | Shared modal chrome |
| `StaticPosterBackground.tsx` | Theme background image |
| `TeamLogoBadge.tsx` | Renders team logo (preset/generated/upload) |
| `PlayerAvatar.tsx` | Player photo/cutout display |
| `PlayerDragPreview.tsx` | Shared drag ghost/preview (pitch + bench) |
| `AuthModal.tsx` | Login/register UI |
| `UserAuthButton.tsx` | Header auth control |

### `src/lib/` (domain & infrastructure)

| Area | Files |
|------|-------|
| Snapshot | `posterSnapshot.ts`, `brandingSnapshot.ts`, `loginConflict.ts` (customized/equivalent/merge policy) |
| Sync | `cloud/syncController.ts`, `cloud/syncRuntime.ts`, `cloud/posterRepository.ts`, `cloud/cloudDocument.ts`, `cloud/syncMeta.ts`, `cloud/syncIndicator.ts`, `cloud/errors.ts`, `mediaSync.ts` |
| Players | `playerPool.ts`, `playerPhotos.ts`, `defaultRoster.ts`, `teamJerseyNumbers.ts` |
| Formations | `formations.ts`, `formationEngine.ts` |
| Logo/jersey | `logoUtils.ts`, `logoPresets.ts`, `logoImagePresets.ts`, `logoRandomize.ts`, `jerseyOptions.ts`, `teamLogoCloud.ts` |
| Poster visual | `posterThemes.ts`, `posterTitleStyles.ts`, `posterLayout.ts` |
| Media | `backgroundRemoval.ts`, `imageCompress.ts`, `fileToDataUrl.ts`, `photoCrop.ts` |
| Firebase | `firebase/client.ts`, `firebase/app.ts`, `firebase/storage.ts` |
| Drag/drop | `dragIntent.ts`, `dropTargets.ts`, `pitchInteraction.ts` (`SlotRules`) |
| Utils | `defaults.ts`, `matchDate.ts` |

### `src/contexts/` / `src/hooks/` / `src/store/`

| File | Role |
|------|------|
| `AuthContext.tsx` | Auth state, starts/stops SyncController, sign-out, account deletion |
| `useModalBackdrop.ts` | Modal dismiss + file picker guards |
| `usePosterMetrics.ts` | Poster container dimensions for layout |
| `usePlayerDrag.ts` | Shared drag interaction hook for pitch/bench cards |
| `useAutoCardSize.ts` | Responsive pitch + bench card size derived from poster container |
| `useAppStore.ts` | Central Zustand store |

---

## 12. Verification commands

```bash
npm run build
npm run lint
```

Then run affected sections in `docs/QA-CHECKLIST.md`.

---

## 13. Documentation contract

This repository treats `docs/TODO.md`, `docs/IMPLEMENTATION.md`, and
`docs/QA-CHECKLIST.md` as durable project memory, not optional notes.

When a Firebase or persistence decision changes:

1. Update `TODO.md` with completed work and explicit future work.
2. Update `IMPLEMENTATION.md` with the current contract, schema, and boundaries.
3. Add or update the affected manual QA scenario in `QA-CHECKLIST.md`.
4. Do not mark an item complete until the implementation and verification exist.
5. Preserve known limitations and rejected alternatives so future agents do not rediscover them.

Current sync contract:

- Firestore stores one poster document per user under `posters/{uid}`.
- Product scope intentionally supports one poster per user; poster history and multi-poster collections are out of scope.
- Firestore stores poster metadata and Storage paths; binary media belongs in Storage.
- Local Zustand state is the editing source of truth and is persisted before cloud sync.
- Cloud writes are debounced/coalesced and use a transaction revision guard (+1); a mismatch is refetched and, if both sides changed, shown to the user as a conflict instead of silently overwriting.
- Unsaved-edit detection is `editVersion` vs the synced marker `{editVersion, revision}` per user; native clients must implement the same marker with platform storage.
- Storage and browser lifecycle failures must not prevent poster metadata from being saved.
- Initial retryable cloud read failures use bounded exponential retry; non-retryable errors remain visible to the user.
- This contract is shared-schema compatible with a future native mobile client; browser-only coordination is advisory.

## 14. Quick decision tree

```
Does the feature change what gets saved locally?
├─ No  → UI-only / runtime state (e.g. modal open, substituteTarget)
└─ Yes → Update store + posterSnapshot
         Does it sync to cloud?
         ├─ No  → local-only field in partialize (rare)
         └─ Yes → Nothing extra: the whole snapshot is one cloud document.
                  Binary media? → Storage path + mediaSync upload.
```

## 15. Launch hardening (2026-09-28)

| Area | Contract |
|------|----------|
| Mobile | `MobileGate` (`src/lib/deviceSupport.ts`) wraps the app in `src/app/page.tsx`. Phones/tablets (UA, iPadOS touch Mac, coarse-only pointer) see a coming-soon screen. `/gizlilik` is outside the gate. |
| Analytics / KVKK | GA4 Consent Mode default `denied`; `gtag.js` loads only after "Kabul et" (`ConsentBanner`, `setAnalyticsConsent`). `trackEvent` is a no-op without consent. |
| Legal | `/gizlilik` static page; controller name/e-mail in `src/lib/legal.ts` (must be filled before launch). |
| Site URL | `src/lib/siteUrl.ts` ← `NEXT_PUBLIC_SITE_URL`; drives metadataBase, `app/robots.ts`, `app/sitemap.ts`. |
| Photos | `buildPlayerPhotoPatch` in the store: clearing a photo also clears `cutoutStoragePath` / `photoSourceStoragePath`; a new `photoSource` replaces the whole photo set (old cutout removed). |
| Logos | `normalizeTeamLogo` keeps `storagePath` for `upload` logos; `hasUsableUploadLogo` accepts data URL, https download URL or storage path. Uploaded logos are WebP (transparency kept). |
| Login conflict | `SyncController.resolveConflict`: local → save local over cloud revision; cloud → `applyCloudSnapshot`; merge → cloud + `appendPlayersToBench(collectLocalPlayersForMerge())` then save. Modal stays open on error. |
| Sign out | `controller.flushNow()` before wiping local data; on failure the user must confirm "Yine de çık". |
| Single-team mode | Customized away players are listed in the bench panel ("{Takım B} kadrosu"); drag between them and home slots uses cross-team `swapPlayers` (`findHiddenAwaySlot`). |
| Bench jersey | `NEUTRAL_BENCH_JERSEY` for bench cards/preview/modal. |
| Match time | `PosterTimeField` (native time picker); `normalizeMatchTime` in `normalizeMatchInfo`. |
| Roster integrity | `src/lib/rosterIntegrity.ts`: `normalizeRoster` (used by `finalizePosterSnapshot`) enforces slot count, no duplicate players, valid bench, captain in lineup, valid `formatOverflow`. `resizeSquad` handles 6v6/7v7/8v8: customized overflow players go to bench and are pushed on the team's `formatOverflow` stack (persist v34); growing pops them back. Placeholders are dropped. |
| Persist write lock | `guardedStorage` in the store ignores writes until `onRehydrateStorage` finishes (initial load and tab-sync rehydrate). Migrated data is written once after unlock. |
| Export | Fixed output width: versus 2400px, single 1600px. |
| Error tracking | `src/lib/errorReporting.ts` is the only Sentry touchpoint: `initErrorReporting` (skips localhost, errors only, no PII, console breadcrumbs dropped), `reportError(err, area, {level})`, `setErrorReportingUser(uid)`. `AppErrorBoundary` wraps the page. DSN: `NEXT_PUBLIC_SENTRY_DSN`; release: `NEXT_PUBLIC_RELEASE` (next.config). Transient/retryable errors → warning; user mistakes (e.g. HEIC) are not reported. |
| IDs | `createId()` (`src/lib/id.ts`) instead of `crypto.randomUUID` (missing in insecure contexts / old Safari). |
| Deploy | `npm run deploy:hosting` (clean build + hosting). `firebase.json` ignores `dev/**` and source maps; `cleanUrls: true`. Rules: `npm run deploy:rules`. |

---

*Last aligned with persist v35 and the SyncController cloud layer (R4/R5).*
