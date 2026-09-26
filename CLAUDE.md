# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pachislot (パチスロ) multi-machine counter & setting estimation PWA. Currently supports:
- **モンキーターンV** — 小役カウンター + 5枚役ベイズ設定推測
- **北斗の拳 転生の章2** — 詳細ログ記録 + 設定推測 + モード推定、および並列の「伝承推測補助」タブ
- **カバネリ海門決戦** — チャンス目発光カウンター + 下段ベル + 無名/生駒のCZポイント記録によるベイズ設定推測
- **モンハンライズ** — 4軸（ライズゾーン / だるま落とし規定リプレイ / ポイントモード / クエストテーブル）の設定推測
- **攻殻機動隊** — 殲滅ZONE履歴グリッドによる殲滅モード推測 ＋ CZ後モード移行率による設定推測

Mobile-first PWA with Supabase cloud sync. All UI text is in Japanese. `README.md` is the untouched Vite template — ignore it.

## Deployment

Vercel にデプロイ済み (dashboard: filaments-projects-9502b3f7/slot-counter).

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- `npm test` — both suites (75 tests)
- `npm run test:kabaneri` — 23 tests
- `npm run test:kokaku` — 52 tests
- `npm run preview` — Preview production build locally
- `npx supabase db push` — Apply migrations in [supabase/migrations/](supabase/migrations/) to the linked project
- `npx supabase start` — (optional) start local Supabase stack

**Tests:** Kabaneri and Kokaku have them, via the Node built-in runner (no Vitest/Jest, no config file). Each suite loads the real `src/` sources through an in-file `ts.transpileModule()` require-shim, stubs `global.localStorage` with a `Map`, and fakes the Supabase client, so it never touches real saved data or the network. Kabaneri covers point conversion, 複合の片側高確, CZ の遡及入力, 履歴削除, 旧保存データ移行 and the cloud round-trip including its failure path; Kokaku covers the source tables' arithmetic, grid derivation, emission/ceiling rules, screen constraints and the store. MonkeyTurn and Hokuto have no tests.

`npm test` lists both files explicitly rather than passing the `tests/` directory — this Node version resolves a bare directory as a module and fails. Add new suites to that list by name.

**`npm run lint` currently reports 4 pre-existing errors** in [src/components/common/Modal.tsx](src/components/common/Modal.tsx) (`react-hooks/set-state-in-effect`) and `Densho/DenshoHelperTab.tsx`. Neither file is touched by the Kabaneri or Kokaku work, so a lint failure in them is not something you just introduced — check the reported paths before chasing it.

## Environment

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **optional**. When unset, [src/lib/supabase.ts](src/lib/supabase.ts) exports `supabase = null` and every sync call short-circuits — the app runs fully offline against localStorage.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Zustand + Recharts, PWA via vite-plugin-pwa (Workbox).

**State management:** Single Zustand store with `persist` middleware ([src/stores/machineStore.ts](src/stores/machineStore.ts), ~1180 lines — the app's center of gravity). Persisted to localStorage under key `slot-counter-storage`. The store manages multiple "machines" (台), each with counters, game count, and history/log entries. Machine-specific actions all follow the same shape: `map` over `machines`, bail out via type guard (`if (!isXMachine(m)) return m;`), return a new object.

Non-obvious persistence rules:
- `partialize` strips `currentMachineId` → app **always boots to HomeScreen**, never restores last-viewed machine.
- `STORE_VERSION` (exported from the store, currently **13**) with cumulative `if (version < N)` migration branches: v2 backfills `machineType`, v3 adds `denshoHelper`, v4 adds `pendingMisses`, v5 adds `denshoCurrentGame`, v6 backfills MonhanRise `counters`/`events`, v8 converts MonhanRise `at-hit.questCount` → `route`, v9 converts `reset` events → per-cycle `cycle-start`, v10 migrates `kabaneriAnalysisTargets` from the single `flash` flag to the two axes, v11 normalizes `KabaneriMachine.czEvents`, v13 backfills Kokaku `events`/`currentGame` and rewrites screen `context` → `occasion` (v12 added the machine). Any breaking schema change must bump `STORE_VERSION` and append a branch. Tests assert against the exported constant, so a bump doesn't break them.
- **There is deliberately no `version < 7` branch.** v7 held the `at-hit` route conversion, but terminals that rehydrated mid-development got stamped `version: 7` with the branch not yet written, so it could never fire. v8 redoes the same (idempotent) conversion to guarantee it runs once. Don't "tidy up" the gap.
- `initializeStore()` (called once from `App.tsx`) auto-creates a monkey-turn-v machine when the list is empty.

**Data model:** [src/types/index.ts](src/types/index.ts) re-exports `hokuto.ts` / `densho.ts` / `kabaneri.ts` / `monhanRise.ts`. `Machine` is a discriminated union keyed on `machineType`. Type guards `isMonkeyTurnMachine` / `isHokutoMachine` / `isKabaneriMachine` / `isMonhanRiseMachine` are exported from [src/stores/machineStore.ts](src/stores/machineStore.ts) (**not** the types module) — all machine-type-specific logic must narrow via these guards.

Adding a machine type means touching: `MachineType` union, a new `*Machine` interface, a type guard, a factory registered in `MACHINE_FACTORIES`, an `App.tsx` render branch, `MACHINE_TYPES`/`TYPE_COLORS`/`getMachineSummary` in `HomeScreen.tsx`, `MACHINE_TYPE_LABELS` **and `handleReset`/`resetMessage`** in `Header.tsx`, `supabaseSync.ts` load/upsert branches, and a `machines_machine_type_check` migration.

Only the `Record<MachineType, …>` maps are type-checked; the `if/else` chains are not. `Header.handleReset` in particular falls through to `resetCurrentMachine()`, which is MonkeyTurn-specific — a missing branch there leaves the reset button silently doing nothing while still firing `deleteMachineRemote`. After adding a type, grep for an existing type guard (e.g. `isKabaneriMachine`) and confirm every hit has a counterpart. Because `types/index.ts` does `export *`, event/interface names collide across machine modules — prefix them (`MonhanRiseAtHitEvent`, not `AtHitEvent`, which densho already owns).

**MonkeyTurn:** [src/data/koyakuDefinitions.ts](src/data/koyakuDefinitions.ts) defines tracked koyaku across 5 categories. [src/data/settingProbabilities.ts](src/data/settingProbabilities.ts) + [src/utils/binomialDistribution.ts](src/utils/binomialDistribution.ts) for Bayesian setting estimation. Setting 3 is absent from this machine's `SettingAnalysis`.

**Hokuto — two independent tabs in one machine.** `HokutoMain` renders a `'log' | 'densho'` sub-tab. The two datasets never interact:
- **log tab** — `HokutoSession` + `HokutoLog[]` (discriminated union: AT当選, 天破の刻, 天撃チャレンジ, フェイク前兆, 演出示唆(ランプ/トロフィー), 伝承モード). Tables in [src/data/hokutoDefinitions.ts](src/data/hokutoDefinitions.ts), estimation in [src/utils/hokutoEstimation.ts](src/utils/hokutoEstimation.ts).
- **densho tab** — `denshoHelper: DenshoHelperState` + its own `denshoCurrentGame` game counter (deliberately separate from the log tab's). An event-sourced state machine: `DenshoEvent[]` is the source of truth and `rebuildHelperFromEvents()` replays it, so undo/delete are implemented as replay-from-scratch. Logic lives in [src/utils/denshoEstimation.ts](src/utils/denshoEstimation.ts) (~1200 lines, all pure & immutable) with tuning constants isolated in [src/data/denshoConstants.ts](src/data/denshoConstants.ts).

Hokuto lamp positions: A=上部サイドランプ(入賞ランプ), B=上部中央ランプ, C=サブ液晶周辺ランプ.

**Kabaneri:** counters keyed `mumei`/`mumeiFlash`/`ikoma`/`ikomaFlash`/`kabane`/`kabaneFlash`/`gedanBell`, plus an ordered `czEvents: KabaneriCzEvent[]`. Setting inference has **three independent axes** — 下段ベル, 無名＋生駒 の発光率, カバネ の発光率 — each opt-in per machine and combined by summing log-likelihoods ([src/utils/kabaneriEstimation.ts](src/utils/kabaneriEstimation.ts)). Read [docs/kabaneri-unato-spec.md](docs/kabaneri-unato-spec.md), [docs/kabaneri-flash-research.md](docs/kabaneri-flash-research.md) and [docs/kabaneri-cz-points.md](docs/kabaneri-cz-points.md) before touching any of this.

Non-obvious rules, each of which looks like a simplification opportunity but isn't:
- **Never pool the three roles into one binomial.** 無名/生駒 run a 1pt/15pt point system while カバネ runs a separate 1pt/2pt one for 周期抽選, so their flash rates differ in both level and setting spread. `kabaneriFlashAxes` in [src/data/kabaneriDefinitions.ts](src/data/kabaneriDefinitions.ts) is the single source of the axis→role mapping; the pre-#5 model averaged all three and diluted the signal by ~3.4x. `calculateSelectedKabaneriAnalyses` adds the selected axes' log-likelihoods and normalizes **once** — it does not multiply per-axis posteriors.
- **The rate tables are user-adopted provisional values, not 解析値.** 無名＋生駒 8%→20%, カバネ 23%→31.3%, with 設定2〜5 linearly interpolated and no observational basis whatsoever. 設定1 is a 推定低設定 実戦値 stood in as a placeholder. Don't present them as analysis data and don't use them to separate adjacent settings. Every published figure they came from — including the endpoints the model originally shipped with — is traced in the research doc; the old 10%/17% was 前作's.
- **`DEFAULT_KABANERI_ANALYSIS_TARGETS` is all-false on purpose.** An unmeasured 0 must not enter the likelihood, so adoption is an explicit user choice per machine, stored device-locally in `kabaneriAnalysisTargets[machineId]` (not synced). `normalizeKabaneriAnalysisTargets()` is the read boundary — always go through it, since old records carry the single `flash` boolean.
- **`czEvents` is event-sourced like the densho tab.** `summarizeKabaneriCz()` in [src/utils/kabaneriCz.ts](src/utils/kabaneriCz.ts) replays the whole array to derive current points and CZ history, so deleting any record recomputes everything. `recordKabaneriCz` **splices** the CZ in right after the chosen 当選契機 so rolls drawn during 本前兆 carry to the next cycle; candidates are restricted to same-character records after that character's last CZ.
- **Counter buttons are not raw counter writes.** `incrementKabaneriCounter`/`incrementKabaneriFlash` delegate to `recordKabaneriChance`, and the decrements delete the matching most-recent event instead of decrementing. `flashCounterDelta()` is what keeps the 発光率 numerator/denominator clean: it returns a delta **only** for a 単独 role, 非高確, with flash known. 高確 / 複合 / 発光中 / 詳細入力 are stored for CZ points but excluded from the flash axes.
- **`chancePoints()` returns `null` for anything unquantifiable** (オールスター, 超高確, 発光不明) and the UI renders it as `＋不明` rather than guessing a number. There is no 150pt ceiling, no auto-reset and no remaining-point gauge, because 今作's 規定ポイント is unconfirmed. Averages use only完了 cycles with a known start, at least one record, and zero unknowns.

**MonhanRise:** four independent setting-estimation axes combined by summing log-likelihoods ([src/utils/monhanRiseEstimation.ts](src/utils/monhanRiseEstimation.ts)). Axis 1 (ライズゾーン) is a plain binomial over `counters.weakRare`/`counters.rizeZone`; axes 2–4 read the ordered `events` array. Axis 2 (だるま落とし) is multinomial over 40/80/120/160/200 plus right-censored observations; axes 3 (ポイントモード) and 4 (クエストテーブル) are **hidden Markov models** solved with a shared scaled forward algorithm, using each setting's stationary distribution as the initial state.

Non-obvious rules — see [docs/monhan-rise-spec.md](docs/monhan-rise-spec.md) before touching any of this:
- The reset-cycle priors implement the 設定変更 優遇 (`モードB以上`, `75%以上で天国準備以上`). The **split of that 75% between 天国準備 and 天国 is not in any source** — it is set to an even 37.5/37.5 in `MORNING_HEAVEN_SPLIT`. Do not "fix" it by reusing the stationary distribution: that yields 天国 54.7%, i.e. a claim that over half of all resets hit AT on the very first quest. Stationary is the mid-play distribution, not the reset selection ratio.
- Axis 1 uses a **state-marginalized** hit rate (34.2%→39.3%) derived from the site's 実質出現率, *not* the published per-state table. It is only valid if every 通常時 weak-rare role is counted regardless of 内部状態; filtering by state breaks the derivation.
- The two axis-1 counters are **independent** — `weakRare` (denominator) and `rizeZone` (numerator) do not touch each other, so a win requires pressing both buttons. `rizeZone > weakRare` therefore means miscounting; the estimator returns a uniform posterior in that case and the UI warns.
- `QUEST_HIT_RATE` is the 本前兆/ガセ前兆 draw made at each 規定pt arrival — 本前兆 *is* the AT win, so the table is used directly as the per-quest hit probability. The separately published 「狩猟成功期待度 約36%」 is that table **marginalized**, not an extra gate: marginalizing it here yields 33.5% (設定1) to 39.1% (設定6). Multiplying by 36% on top would give ~13% and be wrong.
- Reset is a **per-AT-cycle boolean** (リセット回 / 通常回), toggled by tapping the grid's AT column. Default is row 1 = reset, rows 2+ = normal; a `cycle-start` event is stored only when a row deviates from that default and is deleted again when it returns to it. `resolveIsReset(rowIndex, override)` is the single source of that rule — segmentation and the grid both use it.
- After a reset cycle the first だるま落とし and first クエスト are recorded but excluded from the likelihood (内部リプレイ回数/カムラポイント get a random boost on 設定変更). The first AT win is *not* excluded — the random boost shifts points, not quest count.
- Event ids/timestamps are minted in the store, not components (`react-hooks/purity` rejects `Date.now()`/`uuidv4()` during render).
- Axes 3–4 are entered through a tap-editable grid (rows = AT cycles, fixed 7 columns = the AT間 quest ceiling). `buildQuestGrid()` derives it from the same `events` array the likelihood reads, and carries `eventIndex`/`routeEventIndex`/`appendIndex` so cell edits map back to array positions. Quest count is **derived, never stored** — don't reintroduce a `questCount` field. Deleting a cell sets `point: null` rather than removing the event, because removing it would shift later quests left and silently change which quest number the AT was won on; null cells render as an empty slot and are excluded from the axis-3 likelihood while still advancing the mode transition and counting toward axis 4. The `！` warning goes on the **value following** a gap (meaning "the one before it is missing"), not on the gap itself — the defect is the broken sequence, so it is flagged on the cell it invalidates. The check (`MonhanRiseQuestCell.precededByGap`) uses different criteria within a row (is the immediately preceding cell empty) versus across rows (was the entire preceding row empty) — a trailing delete leaves values in that row, so it must not warn on the next cycle. A リセット回 restarts the chain and never inherits a preceding gap. The cell modal offers only pt/CZ成功/直撃; a quest win is recorded implicitly by tapping into the dashed "next row", which appends `at-hit route:'quest'` first.
- `MonhanRiseMachine` has **no `totalGames`** — none of the four axes use game count. Because the other machine types do, read it through `getMachineTotalGames(machine)` rather than `machine.totalGames` on the union.
- Any code reading a persisted `at-hit` must go through `toAtWinRoute()`. Early data stored `questCount` with no `route`, and a store-version bump alone did not reliably repair it (see below).

The mode/table transition display (`MonhanRiseModePath`) uses **Viterbi** for the sequence, not per-step marginal argmax — marginals can render a transition with probability zero (e.g. モードB→A), and a displayed chain must be a sequence that could actually occur. Three further rules there, each of which looks like a bug if you "fix" it:
- **One chain, not one per setting.** The machine had a single real mode history; emissions are setting-independent and only transitions differ, so the transitions are averaged over the setting posterior to produce one chain. Per-setting chains genuinely differ (50/400 random cases for modes, 151/400 for tables) but showing two contradicts the fact that only one happened.
- "Current mode" is the forward posterior *after* the final transition, shown as the **full distribution** rather than the top state alone, because states can tie almost exactly (テーブルA and 天国準備 explain "won on quest 4" at 28.19% vs 28.01%, so the argmax flips on a 0.1% difference).
- `calculateQuestHitExpectancy` turns the estimated next-table distribution into a per-quest-count hit rate. It re-conditions the table posterior on *having reached* that quest count rather than just weighting the raw table — failing quest 1 eliminates 天国 entirely, so a plain weighted sum would overstate later counts. Unreachable counts return `null`. `calculateCumulativeQuestHit` is the separate "won by quest n" figure — unconditional from the start of the cycle, so the two must not be conflated (they agree only at quest 1).
- Each step carries a **forward-backward smoothed** confidence, not a forward-only one. A single observation rarely pins a mode, but a later certain mode identifies the earlier one retroactively (mode D at step 2 implies C at step 1, since C→D is 100%) — that only shows up if you use future observations too. Steps under 70% render faded.
- **Mode colors are derived from `POINT_COLOR`**, not chosen freely — a mode takes the color of the 規定pt it most often emits (A=600pt, B=500pt, C=200pt, D=100pt), so a colour means the same thing in the grid and in the chain. Quest tables have no pt counterpart and deliberately use a neutral→orange ramp that collides with nothing.

**Kokaku:** an ordered `events: KokakuEvent[]` plus `currentGame`. The grid is 縦＝CZサイクル / 横＝**規定ゲーム数の固定10列**（50/100/150/200/250/300/350/400/450/550、500Gは存在しない）. Read [docs/kokaku-spec.md](docs/kokaku-spec.md) before touching any of this.

- **Modes are memoryless — this is not an HMM.** The published 移行率 table has only a destination axis (the source mode never appears), so each cycle's mode is an independent draw. No forward/backward/Viterbi, and a later cycle never narrows an earlier one. Don't "upgrade" it to an HMM like MonhanRise axes 3–4.
- **Colour does not indicate mode.** Colour comes from 累積撃破pt (殲滅テーブル); mode comes from **which game numbers** the zone hits at. Colour is a *setting*-difference axis instead (青 3.8→9.6%, 緑 20.0→30.4%, 赤 55.0→61.7%), and the colours must never be pooled — 青 is a 2.5x spread but 赤 only 1.12x, so merging them buries 青's signal.
- **The fixed columns are what make non-hits free.** An empty cell that was passed *is* the observation "no zone at that game number", which is as informative as a hit (missing 50G rules out 通常D outright, since 通常D hits 50G at 100%). This is why the grid is keyed on game number and not on "n個目".
- **Input is tap-driven; there is no game counter to advance.** `reachedGame = max(recorded zone games, the cell tapped as 「ここまで通過」, the row's endGame)`. Tapping a cell writes `currentGame` (active row) or `cycle-end.endGame` (closed row) — deliberately no separate `reached` event type. Unreached cells are still tappable, and recording a zone auto-extends the reach. Closing a cycle resets `currentGame` to 0 since the next cycle restarts at 0G; the closed row keeps its reach in `endGame`.
- **CZ天井 is a hard constraint, not a probability.** Passing a mode's ceiling without a CZ zeroes it (リセット350 / A550 / B450 / C250 / D150), so a cycle can pin the mode with no table lookup at all. 通常A and 通常C are identical up to 250G and only separate that way.
- **Setting difference lives only in the CZ後 table.** AT後 is common to all settings, so AT-heavy sessions accumulate no setting information — the sample size that matters is CZ失敗 count, not cycle count. Even then it only splits 高設定/低設定: 設定1 and 2 have identical 通常C/D, and 設定5↔6 needs ~400 CZ失敗.
- **An unknown cycle start uses a uniform prior on purpose.** Using the CZ後 table (which is what the stationary distribution would be) would let a *guess* about how the session started move the setting posterior by the weight of 4–5 real observations.
- **「濃厚」screens are hard constraints, 「示唆」screens are display-only.** 濃厚 needs no numbers so it can be applied honestly; 示唆 has no published 振り分け, so inventing one would repeat the Kabaneri 発光率 mistake. `findKokakuConflicts` flags rows where the constraint contradicts the zones and the estimator silently drops the constraint for that row; `settingConflict` does the same for an empty intersection of setting constraints.
- **Two separate screen catalogues, and the same character means different things in each.** `KOKAKU_CZ_END_SCREENS` is what CZ終了 shows on its own (all 設定 hints, no mode hints); `KOKAKU_WINDOW_SCREENS` is the ウインドウ reached by pressing PUSH at CZ終了, at AT終了, or via 裏コマンド (77G+, 全リール停止後に左ボタン7回). ウインドウのトグサ＝奇数示唆 but CZ終了のトグサ＝高設定示唆（弱）, so the ids are prefixed (`togusa` vs `czTogusa`) and must never be merged.
- **Catalogue and occasion are different axes.** The catalogue (`KokakuScreenContext`) follows from the screen id; the *occasion* (`KokakuScreenOccasion`: `cz-end`/`cz-push`/`at-end`/`ura`) is what the user picks and is stored on the event, because the same ウインドウ can be reached three ways and the record needs to say which. The grid cell shows a thumbnail plus a short tag (`CZ`/`PUSH`/`AT`/`裏`). `normalizeKokakuEvents` coerces an occasion that doesn't match the screen's catalogue and also reads the older `context` field.
- **A row with no zones recorded still counts as observed if it carries a 濃厚 screen.** 裏コマンド needs 77G, so the hint routinely lands before any zone. `hasObservation` must not early-return on `reachedGame <= 0` — that silently dropped the constraint entirely. A mode 濃厚 also moves the *setting* posterior through the transition table (モードD is 15% at 設定1 vs 30% at 設定6).
- **Which cycle a screen describes depends on where its event sits, not on a field.** The mode is redrawn when a cycle ends, so a screen seen at 終了 hints the *next* cycle: a `screen` event **before** the `cycle-end` belongs to that row, **after** it belongs to the next. The end modal appends `cycle-end` then `screen` so they land correctly; the always-on 裏コマンド panel appends to the active row (mid-cycle = current cycle). Don't add a "which cycle" field — position already says it.
- The 推測 tab tallies every recorded screen (`summarizeKokakuScreens`) in catalogue order, with thumbnail, count, hint, the 枠色 as a left border (coloured = 濃厚 = actually constraining the estimate), and a chip per appearance. **The chip's cycle number is the cycle the hint constrains, not when it was seen** — an end screen belongs to the next cycle. Default screens are flagged by `defaultPattern`, not by string-matching '基本パターン'.
- The picker shows `public/kokaku-screens/<id>.webp` (all 20 present, 244KB total, precached via the `webp` glob in `vite.config.ts`) and falls back to a card tinted with the real 枠色 (緑/赤/紫/金) via `onError`. Captures are ©Sammy — personal reference only, don't redistribute.
- Zone hits within one cycle are **treated as independent, which is an approximation** — the machine pre-draws how many zones a cycle will contain. Only the marginals are published, so the product is the best available; don't present it as exact.

**Migration trap worth knowing:** bumping `version` and adding its `migrate` branch in two separate edits is unsafe while a dev server is running. Vite HMR rehydrates the store in between, stamps the new version with no branch to run, and that branch can then never fire — leaving permanently unmigrated data. Bump the version and write its branch in the same change, and prefer normalizing at the read boundary for fields whose absence would crash.

**Haptics:** [src/utils/haptic.ts](src/utils/haptic.ts) — `navigator.vibrate(10)` where supported; iOS Safari falls back to an unofficial trick (clicking a hidden `<input type="checkbox" switch>` during a user gesture). Must be called synchronously inside a tap handler. Kabaneri and MonhanRise counter buttons use pointer-event tap-detection (not `onClick`) so scrolling doesn't fire counters.

**Counter press feedback:** the pressing finger covers the button face, so visual confirmation must be drawn *outside* the button bounds (`overflow: visible` + an expanding ring and a "+1" that floats above the top edge). Keyframe the float so it reaches full opacity only once it has fully cleared the button — an effect that peaks while still overlapping the button is invisible in real use. Verify by sampling `document.getAnimations()` with `currentTime` set and comparing the float's `getBoundingClientRect().bottom` against the button's top; a screenshot alone will not catch this.

**Supabase sync:** [src/lib/supabase.ts](src/lib/supabase.ts) + [src/lib/supabaseSync.ts](src/lib/supabaseSync.ts). Tables `machines`, `machine_counters`, `history_entries`, `hokuto_state`, `hokuto_logs`, `monhan_rise_state` with RLS enabled but fully-open policies (no auth). MonkeyTurn and Kabaneri share `machine_counters`; MonhanRise keeps counters + the whole `events` array in one `monhan_rise_state` row. Every store mutation does an optimistic local update + fire-and-forget upsert (`.catch(() => {})`); failures are silently swallowed and there is no retry queue or conflict resolution. `denshoHelper` is **not** synced to Supabase — it is localStorage-only. Manual upload/download buttons on HomeScreen are the recovery path.

Kabaneri's `czEvents` ride along in `machine_counters.kabaneri_events` (JSONB, migration [20260919000000](supabase/migrations/20260919000000_add_kabaneri_cz_events.sql), applied to production 2026-09-19). Both directions **throw on purpose** when that column is missing — a restore that silently returned `[]` would wipe local CZ history, so a stale DB must fail loudly instead. This is the one place in the sync layer that deliberately surfaces an error rather than swallowing it; apply the migration before shipping a client that writes it.

**Spec docs are the source of truth for all probability tables** — change the doc and the data file together:
- [docs/hokuto-tensei2-spec.md](docs/hokuto-tensei2-spec.md), [docs/hokuto-tensei2-implementation.md](docs/hokuto-tensei2-implementation.md)
- [docs/densho-helper-spec.md](docs/densho-helper-spec.md), [docs/densho-helper-research.md](docs/densho-helper-research.md)
- [docs/kabaneri-unato-spec.md](docs/kabaneri-unato-spec.md), [docs/kabaneri-flash-research.md](docs/kabaneri-flash-research.md) (発光率の出所調査・採用仕様), [docs/kabaneri-cz-points.md](docs/kabaneri-cz-points.md) (CZポイント換算・入力仕様)
- [docs/monhan-rise-spec.md](docs/monhan-rise-spec.md)
- [docs/kokaku-spec.md](docs/kokaku-spec.md)
- [docs/tokyo-ghoul-research.md](docs/tokyo-ghoul-research.md) — research only, not yet implemented

**Styling:** CSS Modules (`.module.css` co-located with components) + global styles in [src/styles/](src/styles/). Apple dark mode aesthetic with design tokens in [src/styles/tokens.css](src/styles/tokens.css). Kabaneri deviates deliberately: neon circular buttons with per-item glow colors defined in `kabaneriDefinitions.ts` rather than tokens.

**Component layout:**
- `Home/` — machine selection, add/delete, Supabase sync buttons
- `Header/` — machine selector, game input, history modal
- `Counter/`, `Statistics/`, `History/` — MonkeyTurn only
- `Hokuto/` — HokutoMain (tab shell), StatusBar, LogTimeline, InlineLogEntry, AnalysisModal, ShutterModal, TenhaRateModal, LogDetailModal, `Densho/DenshoHelperTab`
- `Kabaneri/` — KabaneriMain (shell), KabaneriChanceInputPanel (役別4ボタン + 複合入力トグル + 詳細入力モーダル), KabaneriCzTracker (無名/生駒のCZポイント・履歴・集計開始位置), KabaneriButton, KabaneriToolbar, KabaneriSettingAnalysis
- `MonhanRise/` — MonhanRiseMain (入力/設定推測 の2タブ), MonhanRiseInput, MonhanRiseCountButton, MonhanRiseQuestGrid, MonhanRiseModePath, MonhanRiseSettingAnalysis
- `Kokaku/` — KokakuMain (入力/推測 の2タブ), KokakuInput (現在G・次ゾーン見通し・画面記録・セルモーダル), KokakuZoneGrid (固定列グリッド), KokakuSettingAnalysis
- `GameInput/` — drum picker for game count input
- `common/` — Modal, ConfirmDialog
- `Export/`, `Machine/`, `src/hooks/` are empty placeholder directories
