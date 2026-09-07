# Halı Saha Kadro — Completed Development Log

Retrospective checklist of **everything built to date**, grouped by feature domain and implementation order. All items represent **done** work in the current codebase.

Use `docs/IMPLEMENTATION.md` for architecture reference when extending any of these areas.

---

## Phase 0 — Project foundation

- [x] Next.js 16 App Router scaffold (`src/app/layout.tsx`, `src/app/page.tsx`)
- [x] Tailwind CSS 4 setup (`globals.css`, `postcss.config.mjs`)
- [x] TypeScript strict config (`tsconfig.json`)
- [x] Core types (`src/types/index.ts`): `Player`, `TeamConfig`, `TeamLogo`, `MatchInfo`, `JerseyConfig`, `PitchPlayer`, `SquadSize`
- [x] Default teams and roster seeds (`src/lib/defaults.ts`, `src/lib/defaultRoster.ts`)
- [x] App provider shell (`AppProviders.tsx`) wrapping auth and bootstrap

---

## Phase 1 — Central state & local persistence

- [x] Zustand store (`src/store/useAppStore.ts`) as single source of poster truth
- [x] `localStorage` persist via `partialize` → `buildPosterSnapshot`
- [x] `merge` + `onRehydrateStorage` with `finalizePosterSnapshot`
- [x] `set()` wrapper: `localUpdatedAt` on poster field changes
- [x] `getPosterSnapshot()` / `hydrateFromSnapshot()` for serialize/deserialize
- [x] `hasAppStoreHydrated()` / `onAppStoreHydrated()` for bootstrap gating
- [x] Poster snapshot module (`src/lib/posterSnapshot.ts`): build, parse, merge, finalize, normalize
- [x] Player pool helpers (`src/lib/playerPool.ts`): lineup IDs, bench sanitize, active registry rebuild
- [x] Persist version **v31** with `syncRevisions`, `didCompress`, `teamMode` and mode-specific positions

---

## Phase 2 — Poster canvas & visual shell

- [x] Main layout (`AppShell.tsx`): toolbar, poster, bench, modals, export button
- [x] Poster composition (`MatchPoster.tsx`) with `id="match-poster"` for export
- [x] Static theme backgrounds (`StaticPosterBackground.tsx`, `posterThemes.ts`)
- [x] Four poster themes: `derby-night`, `champions-night`, `dark-arena`, `summer-cup`
- [x] `normalizePosterTheme()` with legacy ID mapping
- [x] Team logo blocks on poster (`TeamPosterBlock` in `MatchPoster.tsx`)
- [x] Team logo rendering (`TeamLogoBadge.tsx`, `logo/LogoIcon.tsx`)
- [x] Match footer: venue, time, date (`PosterDateField.tsx`, `matchDate.ts`)
- [x] Poster layout metrics (`posterLayout.ts`, `usePosterMetrics.ts`)

---

## Phase 3 — Toolbar, format & formations

- [x] `PosterToolbar.tsx`: theme picker, squad size, formation dropdowns
- [x] Formation definitions (`formations.ts`, `formationEngine.ts`)
- [x] `setSquadSize`, `setHomeFormation`, `setAwayFormation` store actions
- [x] `applyFormations()` — rebuild `pitchPlayers` from formation slots
- [x] Player card size slider (`setPlayerCardSize`, min/max constants)
- [x] Photo scale slider (`setPhotoScalePercent`)
- [x] Safe max card size calculation vs poster width (`computeSafeMaxCardSize`)

---

## Phase 4 — Pitch players & roster editing

- [x] Pitch player layer (`PitchPlayerLayer.tsx`, `PlayerOnPitch.tsx`)
- [x] Player avatar display (`PlayerAvatar.tsx`, `playerPhotos.ts`)
- [x] `setSlotPlayer` — create/update player in lineup slot
- [x] `clearSlot`, `setCaptain`
- [x] `updatePlayer` — shared player field updates
- [x] Inline editable text on poster (`PosterEditableText.tsx`)
- [x] Jersey number conflict resolution (`teamJerseyNumbers.ts`)
- [x] Fill empty roster slots on finalize (`fillEmptyRosterSlots`)

---

## Phase 5 — Player edit modal

- [x] `PlayerEditModal.tsx` with name, number, captain toggle
- [x] Dynamic import in `AppShell` with `ssr: false`
- [x] Shared modal infrastructure: `ModalShell.tsx`, `useModalBackdrop.ts`
- [x] Backdrop dismiss with `pickingFileRef` guard (file picker stays open)
- [x] `busy` guard during long operations (no accidental close)
- [x] `onPointerDown` / `onPointerUp` `stopPropagation` on modal content

---

## Phase 6 — Photo upload & local media

- [x] File picker flow in player modal (`openFilePicker` from `useModalBackdrop`)
- [x] `fileToDataUrl.ts` — read files as data URLs
- [x] Photo crop model (`photoCrop.ts`, `PhotoCrop` type)
- [x] `photoSource` retained locally for re-edit; `cutoutUrl` for display
- [x] `hasPlayerPhoto()`, `mergeSavedPlayersPreservingLocalPhotos()` for cloud merge
- [x] Image compression utilities (`imageCompress.ts`, `compressPlayerPhotos`)
- [x] Bootstrap idle compression of legacy photos (`AppBootstrapGate` + `compressAllSavedPlayers`)

---

## Phase 7 — Background removal

- [x] `backgroundRemoval.ts` with **static** `@imgly/background-removal` import
- [x] ONNX runtime dependency (`onnxruntime-web`)
- [x] BG removal UI in `PlayerEditModal` with progress state
- [x] Cutout saved as data URL (not blob URL) for persist safety
- [x] Modal stays open during processing (`busy` flag)

---

## Phase 8 — Drag, reposition & swap

- [x] `movePitchPlayer` — free-position override (`x`, `y` on `PitchPlayer`)
- [x] `clearPitchPlayerPosition`, `resetPitchPositions`
- [x] Drag state: `activeDrag`, `setActiveDrag`
- [x] Swap target highlighting: `activeSwapTarget`, `setActiveSwapTarget`
- [x] `swapPlayers` — swap `playerIds` between slots (same or cross-team)
- [x] Post-swap `applyFormations()` for consistent slot layout

---

## Phase 9 — Team branding (logo & jersey)

- [x] `LogoDesignerModal.tsx` opened from team logo click (`setLogoDesignerTeam`)
- [x] Preset logo panel (`LogoDesignerPresetPanel.tsx`, `logoImagePresets.ts`)
- [x] Custom/generated logo panel (`LogoDesignerCustomPanel.tsx`)
- [x] Logo parameter system: shape, border, background, icon, colors (`logoPresets.ts`, `logoUtils.ts`)
- [x] Logo upload mode (`mode: "upload"`, `imageUrl`)
- [x] Logo randomize (`logoRandomize.ts`)
- [x] Jersey style controls (`JerseyControls.tsx`, `JerseyIcon.tsx`, `jerseyOptions.ts`)
- [x] Team atmosphere color on `TeamConfig`
- [x] Branding preview (`TeamBrandingPreview.tsx`)
- [x] `updateHomeTeam` / `updateAwayTeam` with `normalizeTeamLogo`
- [x] Global logo display size (`teamLogoDisplaySize`, `setTeamLogoDisplaySize`)

---

## Phase 10 — Match title & typography

- [x] Title display on poster (`PosterTitleDisplay.tsx`)
- [x] Title edit modal (`PosterTitleModal.tsx`)
- [x] Title style/effect system (`posterTitleStyles.ts`)
- [x] Fixed preview at top while scrolling modal controls
- [x] Color palette aligned to poster themes
- [x] "Match poster theme" reset option when palette diverges
- [x] `setMatchInfo` with `normalizeMatchInfo`
- [x] Default title style per theme (`defaultTitleStyleForTheme`)

---

## Phase 11 — Bench & substitute system

- [x] `BenchPanel.tsx` — substitute pool UI
- [x] `addPlayerToBench`, `updateBenchPlayer`, `removeFromBench`
- [x] `assignBenchToSlot` with `AssignToLineupModal.tsx`
- [x] `moveSlotToBench` from lineup to bench
- [x] `sanitizeBenchIds` — bench cannot duplicate on-field players
- [x] "Send to bench" / "Replace with substitute" in `PlayerEditModal` + `AppShell`
- [x] Substitute-target mode (`substituteTarget` in `AppShell` local state)
- [x] `savedPlayers` pruned to lineup+bench IDs only in `buildPersistedPlayerRegistry`

---

## Phase 12 — PNG export

- [x] `html-to-image` integration in `AppShell.handleExport`
- [x] Export target: `#match-poster`, `pixelRatio: 2`, `cacheBust: true`
- [x] Download as `halisaha-kadro.png`
- [x] Export loading state (`exporting`)

---

## Phase 13 — Firebase authentication

- [x] Firebase client init (`firebase/client.ts`, `firebase/app.ts`)
- [x] `isFirebaseConfigured()` graceful degradation without env vars
- [x] `AuthContext.tsx`: auth state, sign out, modal control
- [x] `AuthModal.tsx`: email/password + Google sign-in
- [x] `UserAuthButton.tsx` in header
- [x] Firestore security rules (`firebase/firestore.rules`)
- [x] README Firebase setup instructions

---

## Phase 14 — Cloud persistence (Firestore)

- [x] `cloudPoster.ts`: `fetchUserPoster`, `saveUserPoster`, `mapFirestoreError`
- [x] Firestore collection `posters/{userId}`
- [x] `prepareSnapshotForCloud()` — compression tiers, size cap ~900KB
- [x] `describeCloudSaveResult()` user warnings for omitted media
- [x] Cloud load on sign-in (`AuthContext.loadCloudPoster`)
- [x] First-login upload when no cloud doc exists
- [x] `remoteHydrating` flag to pause sync during hydrate
- [x] `AppBootstrapGate` waits for auth + store + remote hydrate

---

## Phase 15 — Branding cloud split & logo persistence

- [x] `brandingSnapshot.ts`: build, parse, merge, apply to teams
- [x] Separate Firestore fields: `branding`, `brandingUpdatedAt`
- [x] `saveUserBranding()` — lightweight branding-only write (priority queue)
- [x] `mergeCloudBrandingIntoSnapshot()` on load (LWW vs `localUpdatedAt`)
- [x] `teamLogoCloud.ts`: slim logos for cloud, local preservation on merge
- [x] `markPosterSnapshotSynced` only when local fingerprint matches cloud
- [x] `pendingRepush` when local differs after hydrate
- [x] QA §7b logo persistence scenarios documented

---

## Phase 16 — Cloud sync engine

- [x] `cloudSyncManager.ts` — debounced flush, max wait, lifecycle flush
- [x] `firestoreWriteQueue.ts` — serialized writes, rate limiting
- [x] `useCloudSync.ts` hook wiring manager to `AuthContext`
- [x] `snapshotFingerprint.ts` — poster fingerprint helpers
- [x] Multi-tab `BroadcastChannel` sync notification
- [x] `navigator.locks` for single-writer coordination
- [x] Exponential backoff retry on failure
- [x] `posterSyncEvents.ts` branding flush listener (legacy bridge)

---

## Phase 17 — Cloud sync stabilization & revision model

- [x] Single flush lane: branding-only vs data write decision
- [x] `saveUserPoster` writes **data only** (no duplicate branding in same doc write)
- [x] Combined flush: data save then branding when both dirty
- [x] Write budget: 12s gap, 5s priority gap, max 4 writes/minute, 120s exhausted cooldown
- [x] Debounce tuning: 8s debounce, 45s max wait, 15s lifecycle flush gap
- [x] Removed follow-up flush after successful save
- [x] `syncRevisions` domains: `branding`, `roster`, `layout`, `media`
- [x] `syncRevisionBump.ts` — domain-aware revision increment in store `set()`
- [x] Sync manager subscribes to `syncRevisions` instead of full JSON diff
- [x] Partial `lastSyncedRevisions` update after branding-only vs data saves
- [x] Repush debounce 3s in `AuthContext` (v2: timestamp-based detection replaces fingerprint for pending repush)
- [x] Foreign-tab reload checks both `updatedAt` and `brandingUpdatedAt`
- [x] Slim cloud team config (`slimTeamConfigForCloud`) — logo/jersey only in `branding` field
- [x] Cloud single-photo rule: strip `photoSource` when `cutoutUrl` present
- [x] QA §11 cloud sync stability scenarios documented

---

## Phase 18 — Firebase Storage media pipeline

- [x] `firebase/storage.ts` — init, upload data URL, resolve download URL
- [x] Storage path helpers for player cutout, source, team logos
- [x] `mediaSync.ts` — upload before cloud save, hydrate on fetch
- [x] `Player.cutoutStoragePath` / `photoSourceStoragePath` types
- [x] `TeamLogo.storagePath` type
- [x] `uploadPlayerMediaForCloud` in `prepareSnapshotForCloud`
- [x] `uploadLogoMediaForCloud` in `saveUserBranding`
- [x] `hydratePlayerPhotosFromStorage` / `hydrateLogoFromStorage` in `fetchUserPoster`
- [x] `slimTeamLogoForCloud` strips `imageUrl` when `storagePath` set
- [x] `clearMediaUploadCache` on sync reset

---

## Phase 19 — Sync status UI

- [x] `CloudSyncPhase`: `idle` | `pending` | `syncing` | `paused` | `cooldown`
- [x] `AuthContext.syncPhase` exposed to UI
- [x] `subscribeCloudSyncStatus` in `useCloudSync.ts`
- [x] `PosterToolbar` label: "Kaydediliyor...", "Buluta kaydediliyor...", "Bulut dinleniyor"

---

## Phase 20 — Loading & guest mode

- [x] `AppLoadingScreen.tsx` during bootstrap
- [x] Guest vs saved `AppMode` in store
- [x] `resetGuestSession()` action
- [x] `resetCloudSyncState()` on user change / sign out

---

## Phase 21 — QA & verification infrastructure

- [x] `docs/QA-CHECKLIST.md` with sections §1–§11
- [x] Per-feature file references in checklist
- [x] Build/lint gates documented
- [x] Change log and smoke audit table in checklist
- [x] `docs/IMPLEMENTATION.md` (this architecture reference)

---

## Phase 22 — Sync baseline fix (no-op open)

- [x] `applyCloudRow` her zaman `markPosterSnapshotSynced()` çağırır; fingerprint uyuşmazlığı engellendi
- [x] `pendingRepush` tespiti fingerprint yerine `localUpdatedAt > cloudUpdatedAt` timestamp karşılaştırması
- [x] Split branding (data/branding) fingerprint mismatch kök nedeni giderildi
- [x] No-op açılışta sync UI idle kalır; gereksiz pending/syncing oluşmaz

---

## Phase 23 — Sync refactor: write callback extraction (Phase 2)

- [x] `src/lib/cloudActions.ts` — `createCloudSaveHandlers` factory (pushSnapshot + pushBranding)
- [x] AuthContext: pushSnapshot/pushBranding useCallback → useMemo + factory, 2 unused import kaldırıldı
- [x] Factory React/Zustand hook bağımlılığı yok, callback injection ile beslenir
- [x] Runtime davranış sıfır değişiklik; tüm status/error handling satır satır korundu

---

## Phase 24 — Sync refactor: read-path extraction (Phase 3)

- [x] `src/lib/cloudLoader.ts` — `createCloudLoadHandlers` factory (loadCloudPoster, softReloadFromCloud, applyCloudRow)
- [x] AuthContext: read-path useCallback'ler kaldırıldı, useMemo + factory wiring eklendi
- [x] AuthContext'ten ~8 import kaldırıldı (cloudPoster, brandingSnapshot, playerPhotos, teamLogoCloud, PosterSnapshot)
- [x] `pendingRepushRef` AuthContext'ten kaldırıldı — factory internal `_pendingRepush` ile yönetiliyor
- [x] AuthContext 421 → 253 satır; sadece auth + UI state + wiring

---

## Phase 25 — Fotoğraf kalitesi iyileştirmesi

- [x] `DEFAULT_PHOTO_MAX` 200 → 400px, `DEFAULT_CUTOUT_MAX` 200 → 400px
- [x] Varsayılan JPEG/WebP kalitesi 0.75 → 0.85
- [x] Cloud `COMPRESS_TIERS` 180/140/100 → 300/200/140, kalite 0.75/0.70/0.65 → 0.80/0.75/0.70
- [x] `Player.didCompress` alanı eklendi — sıkıştırma migrate takibi için
- [x] Store version 28 → 29, migration ile tüm `didCompress` → false
- [x] `compressAllSavedPlayers` sadece `didCompress: false` olanları işler, işlenenleri `true` yapar
- [x] `AppBootstrapGate` mevcut idle callback mekanizması üzerinden otomatik migrate

---

## Phase 26 — Arka plan kaldırma optimizasyonu

- [x] `preloadBackgroundRemovalModel()` — `@imgly/background-removal` `preload()` API ile modeli app açılışında indir
- [x] `AppBootstrapGate` idle callback'te `compressAllSavedPlayers` ile beraber preload çağrısı
- [x] `removeBackground()` data URL'yi direkt `ImageSource` olarak kabul eder — fetch+Blob+File dönüşümü kalktı
- [x] Çıktı formatı: PNG → `image/webp` Q90 (daha küçük boyut, daha az sıkıştırma)
- [x] CPU inference (GPU WebGPU/JSEP uyumsuzluğu nedeniyle devre dışı)
- [x] Progress: `fetch:` (model indirme) vs `compute:` (işleme) ayrı label, `isModelReady()` ile durum kontrolü
- [x] `getPreloadState()` / `isModelReady()` — UI model durumunu okuyabilir

---

## Phase 27 — Firebase veri akışı hardening

- [x] Storage bucket oluşturuldu ve production Storage rules deploy edildi
- [x] Firebase proje yapılandırması (`firebase.json`, `.firebaserc`) eklendi
- [x] Storage upload hatası medya bazında fail-soft; poster Firestore kaydını kilitlemez
- [x] Data save `updateDoc` ile bütün `data` map’ini değiştirir; deep-merge kaynaklı eski inline medya temizlenir
- [x] Cloud hydrate, Storage path yanında kalan inline medya için bir defalık repush planlar
- [x] Idle fotoğraf sıkıştırması store action üzerinden revision ve cloud sync akışına girer
- [x] Firebase MCP ile proje, rules, bucket ve poster dokümanı doğrulandı

### Gelecek mimari kararlar

- [x] Firestore transaction tabanlı server revision ve stale-write protection
- [x] Offline durable outbox; local sync niyeti sonraki açılışa taşınır
- [x] Firestore `onSnapshot` realtime listener; BroadcastChannel yalnızca optimizasyon
- [x] Storage path allowlist ve görsel/5MB kısıtı
- [x] Başarılı cloud write sonrası client-side orphan media cleanup
- [ ] Hesap silme sırasında tüm medya için server-side cleanup
- [x] Firestore üst-seviye schema/type doğrulaması
- [ ] App Check ve kullanıcı başına quota değerlendirmesi
- [x] İlk cloud hydrate hatasında sınırlı exponential read retry

### Kapsam kararı

- [x] Tek kullanıcı için tek poster modeli korunacak; çoklu poster ve poster geçmişi yapılmayacak

---

## Phase 28 — Sync durability refactor

- [x] Firestore transaction revision (`revision`) ile stale write reddetme
- [x] Revision conflict sonrası güncel cloud snapshot’ını yeniden yükleme
- [x] Durable browser outbox ile bekleyen sync niyetini sonraki açılışa taşıma
- [x] Firestore `onSnapshot` ile uzak revision değişikliklerini dinleme
- [x] Firestore üst-seviye field/type allowlist rules
- [x] Storage player/logo path allowlist ve 5MB görsel sınırı
- [x] Client-side orphan cleanup; server-side account cleanup hâlâ gerekli
- [ ] Native auth ve background task; mobil istemci aşamasında uygulanacak

---

## Phase 29 — Tek takım kadrosu

- [x] `teamMode`: `single` veya `versus` olarak persist edilir (store v31)
- [x] Mevcut kullanıcılar migration ile `versus` modunda korunur
- [x] Poster üzerinde tek takım kadrosu merkezlenir; rakip takım gizlenir
- [x] Tek takım modunda yalnızca home kadro/formasyon/yedek akışı gösterilir
- [x] İki takım modu ve mevcut away verisi korunur; geçişte veri silinmez
- [x] PosterToolbar’a tek takım/iki takım seçim kontrolü eklendi
- [x] Tek takım için bağımsız `singlePitchPlayers` pozisyon alanı ve dikey formasyon dönüşümü eklendi
- [x] Tek takım modunda oyuncuların tam saha serbest hareketi eklendi; kaleci kilidi korundu
- [x] İlk deneme olarak `derby-night` için `public/posters/vertical/derby_night_vertical.jpeg` bağlandı
- [x] Tek takım posterinde takım logosu sol üstte konumlandı
- [x] Tek takım posterinde varsayılan `DERBİ GECESİ` başlığı gizlendi
- [x] Dört tema için dikey tek takım görselleri bağlandı; Dark Arena `dark_arena_vertical.jpeg`, Summer Cup `summer_cup_vertical.jpeg` kullanıyor
- [x] Tüm dikey assetler `928x1152` (4:5) boyutunda; geçici `champions_league_vertical_1.jpeg` ve `champions_league_vertical_2.jpeg` dosyaları kaldırıldı

---

## Phase 31 — Diziliş ve dikey layout revizyonu

- [x] 6v6/7v7/8v8 dizilişleri kurallara uygun şekilde yeniden tanımlandı: kaleci hariç defanstan forvete sayım, 1 defansla başlayan diziliş yok
- [x] 6v6 dizilişleri: `2-2-1`, `2-1-2`, `3-1-1`
- [x] 7v7 dizilişleri: `2-2-2`, `2-1-3`, `2-3-1`, `3-2-1`, `3-1-2`
- [x] 8v8 dizilişleri: `2-2-3`, `2-3-2`, `2-1-4`, `2-4-1`, `3-2-2`, `3-1-3`, `3-3-1`, `4-2-1`, `4-1-2`
- [x] Eski/geçersiz diziliş ID'leri persist v32 migration ile mevcut `squadSize` için ilk geçerli dizilişe resetleniyor
- [x] Tek takım dikey posterde formasyon yerleşimi eksen takası yerine doğrudan dikey saha layout’uyla çiziliyor
- [x] Tek takım modunda kaleci altta ortada, defans/orta saha/forvet yukarı doğru sıralanıyor
- [x] `applyFormations` tek takım modunda `singlePitchPlayers`, iki takım modunda `pitchPlayers` güncelliyor
- [x] `AppState` tipine eksik kalan `teamMode`, `singlePitchPlayers` ve diğer persisted alanlar eklendi
- [x] Varsayılan dizilişler: 6v6 `3-1-1`, 7v7 `3-2-1`, 8v8 `3-3-1`

---

## Phase 32 — Yedek havuzu sürükle-bırak

- [x] Yedek oyuncu kartları pointer-events ile sürüklenebilir hale getirildi
- [x] Yedek oyuncu sahada bir oyuncunun üzerine bırakılınca `assignBenchToSlot` ile swap yapılıyor
- [x] Saha oyuncusu yedekler paneline veya bir yedek kartının üzerine bırakılınca `moveSlotToBench` / swap çalışıyor
- [x] `PlayerOnPitch` sahadan yedeğe drop hedefini `document.elementsFromPoint` ile tespit ediyor
- [x] `pitchInteraction.ts` drag sınırları yedekler paneline kadar genişletildi
- [x] `BenchPanel`de "Oyuna al" butonu ve `AssignToLineupModal` kaldırıldı
- [x] `PlayerEditModal` ve `AppShell` üzerindeki "Yedekle değiştir" / "Yedeğe gönder" butonları kaldırıldı
- [x] Yedek oyuncu düzenleme ve silme işlemleri korundu
- [x] Yedek kartları büyütüldü, sol üstte `GripVertical` sürükleme tutamacı eklendi
- [x] Sürüklenen saha ve yedek oyuncuları için `react-dom/createPortal` klonu eklendi; kartlar saha/poster sınırları dışına çıkabiliyor
- [x] Sürükleme sonrası `dragging` / `activeDrag` / `activeSwapTarget` durumları temizleniyor; art arda swap'lerde kilitlenme/kart kalması çözüldü
- [x] Tek takım modundaki siyah kenar boşlukları home takım atmosfer rengiyle çok hafif radial gradient ile dolduruldu
- [x] İki takım modundaki siyah kenar boşlukları home/away atmosfer renkleriyle çok hafif gradient ile dolduruldu
- [x] Yedek kartları `PlayerAvatar` ile sahada kullanılan kart görünümüne yakınlaştırıldı
- [x] Saha oyuncusu yedek kartının üzerine sürüklenince yedek kartında yeşil "DEĞİŞTİR" swap işareti yanmaya başladı

---

## Phase 33 — Sürükle-bırak görsel eşitliği ve kaleci swap'i

- [x] Swap anında hem hedef hem sürüklenen kart yeşil "DEĞİŞTİR" işaretiyle yanıyor
- [x] Yedekten sahaya oyuncu sokarken giren yeşil `GİREN` ↑, çıkan kırmızı `ÇIKAN` ↓ okuyla gösteriliyor
- [x] Sahadan yedeğe oyuncu gönderirken de aynı ok sembolojisi çalışıyor; sürüklenen klon kırmızı `ÇIKAN`, hedef yedek yeşil `GİREN`
- [x] `PlayerDropOverlay.tsx` eklendi; swap/sub-in/sub-out overlay’leri tek bileşende toplandı
- [x] `BenchPanel`’de yedek kartına `setPointerCapture` eklendi; bırakma anı yedek kart tarafından yönetiliyor, saha kartları yanlış edit açmıyor
- [x] Oyuncu kartına sadece tıklama (edit) yapıldığında kart titremesi giderildi; sürükleme eşik aşılınca başlıyor
- [x] Kaleci artık sürüklenip bir yedek kartıyla swap edilebiliyor; yedek oyuncu kaleci slotuna geçiyor
- [x] Kaleci hâlâ saha içinde serbest konum değiştiremiyor ve boş yedeğe atılamıyor
- [x] Store’a geçici drag state’leri için `activeSubTarget` ve `activeBenchDropSource` eklendi (runtime, persist edilmiyor)

---

## Phase 34 — Drag & drop refactor

### Faz 1: Tek `dragIntent` modeli ✅

- [x] `src/lib/dragIntent.ts` oluşturuldu; `DragSource`, `DropTarget`, `DragIntent` tipleri ve overlay kararları burada tanımlandı
- [x] Store’daki 5 ayrı geçici state (`activeDrag`, `activeSwapTarget`, `activeSubTarget`, `activeBenchDropSource`, `activeBenchSwapTarget`) kaldırıldı
- [x] Yerine tek `dragIntent: DragIntent` state ve `setDragIntent` aksiyonu eklendi (runtime-only, persist edilmiyor)
- [x] `PitchPlayerLayer` artık `dragIntent`’i okuyup her slot için `isDragging`, `isSwapTarget`, `isSubTarget` bayraklarını hesaplayıp `PlayerOnPitch`’e prop olarak iletiyor
- [x] `PlayerOnPitch` sürükleme sırasında `dragIntent`’i güncelliyor; bırakma/iptal sonrası `{ kind: "idle" }` yapıyor
- [x] `BenchPanel` sürükleme sırasında `dragIntent`’i güncelliyor; yedek klon ve hedef slot overlay’leri `dragIntent` üzerinden türetiliyor

### Faz 2: Ortak `usePlayerDrag` hook’u ✅

- [x] `src/hooks/usePlayerDrag.ts` oluşturuldu; pointer capture, eşik kontrolü, portal offset ve bırakma/iptal yönetimi tek yerde toplandı
- [x] `PlayerOnPitch` kendi içindeki `dragging`/`pointerDown`/`moved` state ve window listener mantığını kaldırıp `usePlayerDrag` kullanmaya başladı
- [x] `BenchPanel` benzer şekilde `usePlayerDrag` kullanmaya başladı; her yedek kart `onPointerDown`/`Move`/`Up`/`Cancel` handler’larını alıyor
- [x] `PlayerOnPitch` ~420 satırdan ~360 satıra, `BenchPanel` sürükleme kodu önemli ölçüde sadeleşti

### Faz 3: Hedef tespiti geometriye geçiş ✅

- [x] `src/lib/dropTargets.ts` oluşturuldu; `findPitchSlotTarget` ve `findBenchDropTarget` artık `getBoundingClientRect` ile çalışıyor
- [x] `document.elementsFromPoint` kullanımı `PlayerOnPitch.tsx` ve `BenchPanel.tsx`’den kaldırıldı
- [x] Hedef kartlar üst üste bindiğinde pointer’ın içinde olduğu ve merkezine en yakın olan seçiliyor
- [x] Portal/overlay elemanlarının `pointer-events` veya z-index’inin hedef tespitini bozması engellendi

### Faz 4–5 (planlanıyor)

- [ ] Kaleci özel durumları `isGoalkeeper` dallanması yerine açık `SlotRules` politikasına taşınacak

---


- [x] `pitchInteraction.ts` ile single/versus hareket policy’leri ayrıştırıldı
- [x] Tek takım pozisyonları için boş array’e güvenli position upsert eklendi
- [x] Tek takımda saha oyuncusu tam saha, kaleci kilidi policy üzerinden yönetiliyor
- [x] İki takım yarı saha ve kaleci kısıtları ortak PlayerOnPitch kodundan ayrıldı
- [x] Kaleci drag girişiminde edit click çakışması ve pointer capture hatası giderildi
- [x] Swap render kimliği güncel takım slotundan türetiliyor; eski `PitchPlayer.playerId` kullanılmıyor
- [x] İkili modda cross-team swap korunuyor; drag sınırı ile geçerli bırakma sınırı ayrıştırıldı
- [x] Rakip sahada boş alana bırakılan kart geri döner; rakip oyuncu üstünde bırakılan kart swap olur
- [x] Orphan cleanup eski/eksik logo snapshot’larına karşı null-safe yapıldı
- [x] Manuel doğrulama: ikili modda oyuncu taşıma, cross-team swap ve forma numarası çözümleme sorunsuz

---

## Cross-cutting constraints (applied across phases)

- [x] Never persist blob URLs — data URLs locally, Storage paths in cloud
- [x] Always normalize: `normalizeMatchInfo`, `normalizePosterTheme`, `normalizeTeamLogo`, `normalizeJersey`
- [x] Modal file-picker must not close modal (`pickingFileRef`)
- [x] Long async tasks use `busy` on modal backdrop
- [x] `PlayerEditModal` loaded with `next/dynamic` + `ssr: false`
- [x] `backgroundRemoval.ts` uses static import (HMR safety)
- [x] `PhotoEditorModal.tsx` abandoned — not part of active flow

---

## Current persist & cloud schema summary

| Layer | Schema |
|-------|--------|
| localStorage key | `halisaha-kadro` persist **v32** |
| Snapshot | `PosterSnapshot` (`teamMode`, `singlePitchPlayers`) + `syncRevisions` |
| Firestore doc | `data`, `branding`, `updatedAt`, `brandingUpdatedAt`, `revision`, optional omit flags |
| Storage | `users/{uid}/players/{id}/cutout.webp`, `users/{uid}/logos/{side}.webp` |

---

*This log documents completed work only. For how to extend the codebase, see `docs/IMPLEMENTATION.md`.*
