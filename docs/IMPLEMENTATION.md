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
│  All poster mutations; persist v28; syncRevisions           │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌───────────────────┐
│ Domain lib/   │  │ Snapshot lib/  │  │ Cloud lib/        │
│ formations,   │  │ posterSnapshot │  │ cloudPoster,      │
│ logos, photos │  │ brandingSnap.  │  │ cloudSyncManager  │
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
4. **Cloud I/O** only through `cloudPoster.ts`, `mediaSync.ts`, `AuthContext.tsx`, `cloudSyncManager.ts`.
5. **Never** persist blob URLs; use **data URLs** locally, **Storage paths** in cloud.

---

## 4. Bootstrap & render flow

```
AppProviders
├── AuthProvider          → Firebase auth, cloud load/push, syncPhase
├── AppBootstrapGate      → waits: store hydrate + auth + !remoteHydrating
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
1. Zustand rehydrates from `localStorage` (`halisaha-kadro`, persist v28)
2. `onRehydrateStorage` runs `finalizePosterSnapshot`
3. If user signed in, `AuthContext.loadCloudPoster` fetches Firestore doc
4. `hydrateFromSnapshot` merges cloud into local (LWW via `localUpdatedAt`)
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

**Persisted poster fields** (via `partialize` → `buildPosterSnapshot` + `syncRevisions`):

- `mode`, `matchInfo`, `squadSize`, `homeTeam`, `awayTeam`
- `savedPlayers`, `benchPlayerIds`, `homeFormationId`, `awayFormationId`
- `pitchPlayers`, `playerCardSize`, `photoScalePercent`, `teamLogoDisplaySize`, `posterTheme`
- `localUpdatedAt`, `syncRevisions`

**Runtime-only** (not in snapshot):

- `players` — active registry rebuilt from lineup + bench
- `logoDesignerTeam`, `remoteHydrating`, `activeDrag`, `activeSwapTarget`

### 5.3 PosterSnapshot (`src/lib/posterSnapshot.ts`)

Canonical serialized poster document. Functions:

| Function | Role |
|----------|------|
| `buildPosterSnapshot(source)` | Store → snapshot; prunes `savedPlayers` to lineup+bench IDs only |
| `parsePosterSnapshot(raw)` | Validate/deserialize |
| `mergePosterSnapshot(current, saved, opts)` | LWW merge for cloud/local conflict |
| `finalizePosterSnapshot(partial)` | Normalize teams, fill empty slots, rebuild `players` |
| `normalizeMatchInfo` | Always use when touching `matchInfo` |

### 5.4 Sync revisions (`src/lib/syncRevisions.ts`)

```ts
type SyncRevisions = {
  branding: number;  // logo, jersey, teamLogoDisplaySize
  roster: number;    // players, bench, squad, playerIds
  layout: number;    // formations, pitch, theme, matchInfo, card sizes
  media: number;     // photo/cutout changes
};
```

Bumped in store `set()` wrapper via `syncRevisionBump.ts`. Cloud sync uses revisions (not full JSON diff) to decide what to flush.

### 5.5 Firestore document (`posters/{userId}`)

```ts
{
  data: PosterSnapshot;           // slim teams in cloud (no logo/jersey in data.homeTeam)
  branding?: TeamBrandingSnapshot; // logo + jersey + teamLogoDisplaySize
  updatedAt: string;              // ISO — data write time
  brandingUpdatedAt?: string;      // ISO — branding write time
  photosOmitted?: boolean;
  logosOmitted?: boolean;
}
```

**Branding snapshot** (`src/lib/brandingSnapshot.ts`):

```ts
type TeamBrandingSnapshot = {
  home: { logo, jersey, atmosphereColor };
  away: { logo, jersey, atmosphereColor };
  teamLogoDisplaySize: number;
  revision: number;
};
```

On load: `mergeCloudBrandingIntoSnapshot(data, branding, brandingUpdatedAt)` applies branding when newer than `data.localUpdatedAt`.

### 5.6 Firebase Storage paths (`src/lib/firebase/storage.ts`)

```
users/{uid}/players/{playerId}/cutout.webp
users/{uid}/players/{playerId}/source.jpg
users/{uid}/logos/{side}.webp   // home | away
```

`mediaSync.ts` uploads data URLs before cloud save and hydrates download URLs on fetch.

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

### F2 — Roster & lineup slots

| | |
|---|---|
| **UI** | `PlayerOnPitch`, `PosterEditableText` (inline name edit) |
| **Store** | `setSlotPlayer`, `clearSlot`, `setCaptain`, `applyFormations`, `swapPlayers`, `movePitchPlayer` |
| **Lib** | `defaultRoster.ts`, `playerPool.ts`, `lineupSlots.ts`, `teamJerseyNumbers.ts` |
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

First run downloads ~40MB ONNX model; needs network.

### F5 — Drag, drop & swap on pitch

| | |
|---|---|
| **UI** | `PlayerOnPitch.tsx` |
| **Store** | `setActiveDrag`, `setActiveSwapTarget`, `swapPlayers`, `movePitchPlayer`, `clearPitchPlayerPosition` |
| **Logic** | `swapPlayers` swaps `playerIds` only, then `applyFormations()`; jersey conflicts via `resolveSameTeamJerseyConflicts` |
| **QA** | §1, §9 (implicit) |

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
|---|---|
| **UI** | `BenchPanel.tsx`, `AssignToLineupModal.tsx` |
| **Store** | `addPlayerToBench`, `updateBenchPlayer`, `removeFromBench`, `assignBenchToSlot`, `moveSlotToBench` |
| **Lib** | `playerPool.ts` (`sanitizeBenchIds`, `rebuildActivePlayers`) |
| **QA** | §5, §6 |

`substituteTarget` mode lives in **AppShell React state** (not store) — resets on page refresh.

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
| **Lib** | `firebase/client.ts`, `firebase/app.ts`, `cloudPoster.mapAuthError` |
| **Env** | `NEXT_PUBLIC_FIREBASE_*` in `.env.local` |
| **Rules** | `firebase/firestore.rules` — user can only RW `posters/{ownUid}` |

### F11 — Cloud sync

| | |
|---|---|
| **Hook** | `useCloudSync.ts` |
| **Manager** | `cloudSyncManager.ts` — single flush, debounce 8s, max wait 45s, lifecycle flush 15s gap |
| **Queue** | `firestoreWriteQueue.ts` — 12s gap, 5s priority, max 4 writes/min, 120s exhausted cooldown |
| **IO** | `cloudPoster.ts` — `saveUserPoster` (data only), `saveUserBranding` (branding only) |
| **Media** | `mediaSync.ts`, `firebase/storage.ts` |
| **UI** | `PosterToolbar` shows sync phase; `AuthContext.syncPhase` |
| **QA** | §7b, §11 |

**Flush decision:**
- Branding-only dirty → `saveUserBranding` (~5KB, priority queue)
- Data dirty → `saveUserPoster`; if branding also dirty, branding save follows
- `resource-exhausted` → cooldown, coalesced retry

**Multi-tab:** `BroadcastChannel` `halisaha-poster-sync`; foreign tab triggers `softReloadFromCloud` when `updatedAt` or `brandingUpdatedAt` is newer.

### F12 — Image compression bootstrap

| | |
|---|---|
| **UI** | `AppBootstrapGate.tsx` |
| **Lib** | `imageCompress.compressAllSavedPlayers` on idle after app ready |

One-time migration-style compression of legacy large data URLs in localStorage.

---

## 7. Store conventions

### 7.1 The `set()` wrapper

All poster mutations go through wrapped `set()`:

- Updates `localUpdatedAt` when poster keys change
- Bumps `syncRevisions` via `bumpSyncRevisions()`

`hydrateFromSnapshot` uses `realSet` directly (no revision bump).

### 7.2 Persist middleware (v28)

| Hook | Responsibility |
|------|----------------|
| `partialize` | `buildPosterSnapshot(s)` + `syncRevisions` |
| `merge` | `mergePosterSnapshot` + restore `syncRevisions` |
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
3. useAppStore.ts          — actions; decide syncRevisions domain
4. posterSnapshot.ts       — if field must persist / sync
5. brandingSnapshot.ts     — only if branding-domain
6. components/             — UI
7. cloudPoster.ts          — only if cloud shape changes
8. docs/QA-CHECKLIST.md    — new § with test steps
9. npm run build && npm run lint
```

**Cloud impact checklist:**

| Change type | Touch |
|-------------|-------|
| Logo/jersey/size | `branding` revision → `saveUserBranding` |
| Roster/bench/player names | `roster` revision → `saveUserPoster` |
| Theme/formation/layout | `layout` revision |
| Photos | `media` revision + consider Storage upload in `mediaSync` |
| New persisted field | persist version bump + migrate |

---

## 10. Known limitations & dead code

| Item | Notes |
|------|-------|
| `substituteTarget` | React state in `AppShell`; lost on refresh |
| `PhotoEditorModal.tsx` | **Dead code** — do not use in new flows |
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
| `AssignToLineupModal.tsx` | Pick slot for bench player |
| `ModalShell.tsx` | Shared modal chrome |
| `StaticPosterBackground.tsx` | Theme background image |
| `TeamLogoBadge.tsx` | Renders team logo (preset/generated/upload) |
| `PlayerAvatar.tsx` | Player photo/cutout display |
| `AuthModal.tsx` | Login/register UI |
| `UserAuthButton.tsx` | Header auth control |

### `src/lib/` (domain & infrastructure)

| Area | Files |
|------|-------|
| Snapshot | `posterSnapshot.ts`, `brandingSnapshot.ts`, `snapshotFingerprint.ts` |
| Sync | `cloudSyncManager.ts`, `cloudPoster.ts`, `firestoreWriteQueue.ts`, `syncRevisions.ts`, `syncRevisionBump.ts`, `mediaSync.ts`, `posterSyncEvents.ts` |
| Players | `playerPool.ts`, `playerPhotos.ts`, `defaultRoster.ts`, `teamJerseyNumbers.ts` |
| Formations | `formations.ts`, `formationEngine.ts`, `lineupSlots.ts` |
| Logo/jersey | `logoUtils.ts`, `logoPresets.ts`, `logoImagePresets.ts`, `logoRandomize.ts`, `jerseyOptions.ts`, `teamLogoCloud.ts` |
| Poster visual | `posterThemes.ts`, `posterTitleStyles.ts`, `posterLayout.ts` |
| Media | `backgroundRemoval.ts`, `imageCompress.ts`, `fileToDataUrl.ts`, `photoCrop.ts` |
| Firebase | `firebase/client.ts`, `firebase/app.ts`, `firebase/storage.ts` |
| Utils | `defaults.ts`, `matchDate.ts` |

### `src/contexts/` / `src/hooks/` / `src/store/`

| File | Role |
|------|------|
| `AuthContext.tsx` | Auth state, cloud load/push, sync status |
| `useCloudSync.ts` | Wires cloudSyncManager to AuthContext |
| `useModalBackdrop.ts` | Modal dismiss + file picker guards |
| `usePosterMetrics.ts` | Poster container dimensions for layout |
| `useAppStore.ts` | Central Zustand store |

---

## 12. Verification commands

```bash
npm run build
npm run lint
```

Then run affected sections in `docs/QA-CHECKLIST.md`.

---

## 13. Quick decision tree

```
Does the feature change what gets saved locally?
├─ No  → UI-only / runtime state (e.g. modal open, substituteTarget)
└─ Yes → Update store + posterSnapshot
         Does it sync to cloud?
         ├─ No  → local-only field in partialize (rare)
         └─ Yes → Which syncRevisions domain?
                  ├─ branding → brandingSnapshot + saveUserBranding path
                  ├─ media    → mediaSync if binary
                  └─ other    → saveUserPoster data path
```

---

*Last aligned with persist v28 and cloud sync stabilization architecture.*
