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
│  All poster mutations; persist v32; syncRevisions           │
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
1. Zustand rehydrates from `localStorage` (`halisaha-kadro`, persist v32)
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
- `teamMode` (`single` | `versus`)
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
  revision?: number;               // transaction revision / stale-write guard
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
| **Preload** | `preloadBackgroundRemovalModel()` called on idle via `AppBootstrapGate`; uses `imglyPreload()` to download ~40MB model in background |

Config: model `isnet_quint8`, output `image/webp` Q90, CPU inference. Progress separates `fetch:` (model download) from `compute:` (inference). `isModelReady()` lets UI check preload status.

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

**Durability and realtime:** `cloudSyncOutbox.ts` localStorage’da kullanıcı/revision sync niyetini tutar; `onSnapshot` uzak revision değişikliklerini bildirir. `BroadcastChannel` yalnızca aynı browser sekmeleri için optimizasyondur.

**Server revision:** Data ve branding writes transaction içinde mevcut `revision` değerini kontrol edip bir artırır. Beklenen revision farklıysa stale write `failed-precondition` ile reddedilir ve istemci güncel cloud snapshot’ını yeniden okur.

**Outbox:** Outbox yalnızca `userId`, revision’lar ve enqueue zamanını tutar; snapshot local persist’te bulunduğu için medya/base64 verisi ikinci kez saklanmaz. Native istemci aynı sözleşmeyi platformun kalıcı storage’ı ile uygulamalıdır.

**Media cleanup:** Başarılı bir cloud write sonrasında önceki snapshot’ta olup yeni snapshot’ta referans edilmeyen Storage path’leri client-side silinir. Hesap silme ve client’in uzun süre çalışmadığı orphan senaryoları için ileride server-side cleanup gerekir.

**Sync baseline:** `applyCloudRow` always calls `markPosterSnapshotSynced` after cloud load to set `lastSyncedRevisions`. Pending repush detection uses `localSnapshot.localUpdatedAt > row.updatedAt` (not fingerprint comparison, which fails against split-branding slim `data` snapshots without logo/jersey).

**Regression guard:** `docs/SYNC-REFACTOR-CHECKLIST.md` — her sync refactor phase sonrası çalıştır.

### F12 — Image compression bootstrap

| | |
|---|---|
| **UI** | `AppBootstrapGate.tsx` |
| **Lib** | `imageCompress.compressAllSavedPlayers` on idle after app ready |

One-time migration-style compression of legacy large data URLs in localStorage. Uses `Player.didCompress` flag to track which players have been processed. Only re-compresses players where `didCompress` is falsy.

### F13 — Photo quality optimization (v29)

| | |
|---|---|
| **Lib** | `imageCompress.ts`, `cloudPoster.ts` |

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

---

## 7. Store conventions

### 7.1 The `set()` wrapper

All poster mutations go through wrapped `set()`:

- Updates `localUpdatedAt` when poster keys change
- Bumps `syncRevisions` via `bumpSyncRevisions()`

`hydrateFromSnapshot` uses `realSet` directly (no revision bump).

### 7.2 Persist middleware (v32)

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
- Cloud writes are debounced/coalesced and use a transaction revision guard; conflicts are rejected and reloaded instead of silently overwriting a newer revision.
- Failed/pending sync intent is kept in the browser outbox; native clients must implement the same intent contract with platform storage.
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
         └─ Yes → Which syncRevisions domain?
                  ├─ branding → brandingSnapshot + saveUserBranding path
                  ├─ media    → mediaSync if binary
                  └─ other    → saveUserPoster data path
```

---

*Last aligned with persist v32, Firebase data-flow hardening, single-team mode, and revised formations.*
