# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pachislot (パチスロ) multi-machine counter & setting estimation PWA. Currently supports:
- **モンキーターンV** — 小役カウンター + 5枚役ベイズ設定推測
- **北斗の拳 転生の章2** — 詳細ログ記録 + 設定推測 + モード推定、および並列の「伝承推測補助」タブ
- **カバネリ海門決戦** — チャンス目発光カウンター + 下段ベルによるベイズ設定推測
- **モンハンライズ** — 4軸（ライズゾーン / だるま落とし規定リプレイ / ポイントモード / クエストテーブル）の設定推測

Mobile-first PWA with Supabase cloud sync. All UI text is in Japanese. `README.md` is the untouched Vite template — ignore it.

## Deployment

Vercel にデプロイ済み (dashboard: filaments-projects-9502b3f7/slot-counter).

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- `npm run preview` — Preview production build locally
- `npx supabase db push` — Apply migrations in [supabase/migrations/](supabase/migrations/) to the linked project
- `npx supabase start` — (optional) start local Supabase stack

No test framework is configured.

## Environment

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **optional**. When unset, [src/lib/supabase.ts](src/lib/supabase.ts) exports `supabase = null` and every sync call short-circuits — the app runs fully offline against localStorage.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Zustand + Recharts, PWA via vite-plugin-pwa (Workbox).

**State management:** Single Zustand store with `persist` middleware ([src/stores/machineStore.ts](src/stores/machineStore.ts), ~790 lines — the app's center of gravity). Persisted to localStorage under key `slot-counter-storage`. The store manages multiple "machines" (台), each with counters, game count, and history/log entries. Machine-specific actions all follow the same shape: `map` over `machines`, bail out via type guard (`if (!isXMachine(m)) return m;`), return a new object.

Non-obvious persistence rules:
- `partialize` strips `currentMachineId` → app **always boots to HomeScreen**, never restores last-viewed machine.
- `version: 6` with cumulative `if (version < N)` migration branches (v2 backfills `machineType`, v3 adds `denshoHelper`, v4 adds `pendingMisses`, v5 adds `denshoCurrentGame`, v6 backfills MonhanRise `counters`/`events`). Any breaking schema change must bump `version` and append a branch.
- `initializeStore()` (called once from `App.tsx`) auto-creates a monkey-turn-v machine when the list is empty.

**Data model:** [src/types/index.ts](src/types/index.ts) re-exports `hokuto.ts` / `densho.ts` / `kabaneri.ts` / `monhanRise.ts`. `Machine` is a discriminated union keyed on `machineType`. Type guards `isMonkeyTurnMachine` / `isHokutoMachine` / `isKabaneriMachine` / `isMonhanRiseMachine` are exported from [src/stores/machineStore.ts](src/stores/machineStore.ts) (**not** the types module) — all machine-type-specific logic must narrow via these guards.

Adding a machine type means touching: `MachineType` union, a new `*Machine` interface, a type guard, a factory registered in `MACHINE_FACTORIES`, an `App.tsx` render branch, `MACHINE_TYPES`/`TYPE_COLORS`/`getMachineSummary` in `HomeScreen.tsx`, `MACHINE_TYPE_LABELS` in `Header.tsx` (the last two are `Record<MachineType, …>` so tsc will catch them), `supabaseSync.ts` load/upsert branches, and a `machines_machine_type_check` migration. Because `types/index.ts` does `export *`, event/interface names collide across machine modules — prefix them (`MonhanRiseAtHitEvent`, not `AtHitEvent`, which densho already owns).

**MonkeyTurn:** [src/data/koyakuDefinitions.ts](src/data/koyakuDefinitions.ts) defines tracked koyaku across 5 categories. [src/data/settingProbabilities.ts](src/data/settingProbabilities.ts) + [src/utils/binomialDistribution.ts](src/utils/binomialDistribution.ts) for Bayesian setting estimation. Setting 3 is absent from this machine's `SettingAnalysis`.

**Hokuto — two independent tabs in one machine.** `HokutoMain` renders a `'log' | 'densho'` sub-tab. The two datasets never interact:
- **log tab** — `HokutoSession` + `HokutoLog[]` (discriminated union: AT当選, 天破の刻, 天撃チャレンジ, フェイク前兆, 演出示唆(ランプ/トロフィー), 伝承モード). Tables in [src/data/hokutoDefinitions.ts](src/data/hokutoDefinitions.ts), estimation in [src/utils/hokutoEstimation.ts](src/utils/hokutoEstimation.ts).
- **densho tab** — `denshoHelper: DenshoHelperState` + its own `denshoCurrentGame` game counter (deliberately separate from the log tab's). An event-sourced state machine: `DenshoEvent[]` is the source of truth and `rebuildHelperFromEvents()` replays it, so undo/delete are implemented as replay-from-scratch. Logic lives in [src/utils/denshoEstimation.ts](src/utils/denshoEstimation.ts) (~1200 lines, all pure & immutable) with tuning constants isolated in [src/data/denshoConstants.ts](src/data/denshoConstants.ts).

Hokuto lamp positions: A=上部サイドランプ(入賞ランプ), B=上部中央ランプ, C=サブ液晶周辺ランプ.

**Kabaneri:** counters keyed `mumei`/`mumeiFlash`/`ikoma`/`ikomaFlash`/`kabane`/`kabaneFlash`/`gedanBell`. Setting inference combines chance-me 発光率 and 下段ベル出現率 ([src/utils/kabaneriEstimation.ts](src/utils/kabaneriEstimation.ts)). **Counting rule that drives the UI:** only 単独チャンス目 outside カバネリ高確 and outside 発光中 carry a setting difference — see [docs/kabaneri-unato-spec.md](docs/kabaneri-unato-spec.md) before changing what gets counted.

**MonhanRise:** four independent setting-estimation axes combined by summing log-likelihoods ([src/utils/monhanRiseEstimation.ts](src/utils/monhanRiseEstimation.ts)). Axis 1 (ライズゾーン) is a plain binomial over `counters.weakRare`/`counters.rizeZone`; axes 2–4 read the ordered `events` array. Axis 2 (だるま落とし) is multinomial over 40/80/120/160/200 plus right-censored observations; axes 3 (ポイントモード) and 4 (クエストテーブル) are **hidden Markov models** solved with a shared scaled forward algorithm, using each setting's stationary distribution as the initial state.

Non-obvious rules — see [docs/monhan-rise-spec.md](docs/monhan-rise-spec.md) before touching any of this:
- The reset-cycle priors implement the 設定変更 優遇 (`モードB以上`, `75%以上で天国準備以上`). The **split of that 75% between 天国準備 and 天国 is not in any source** — it is set to an even 37.5/37.5 in `MORNING_HEAVEN_SPLIT`. Do not "fix" it by reusing the stationary distribution: that yields 天国 54.7%, i.e. a claim that over half of all resets hit AT on the very first quest. Stationary is the mid-play distribution, not the reset selection ratio.
- Axis 1 uses a **state-marginalized** hit rate (34.2%→39.3%) derived from the site's 実質出現率, *not* the published per-state table. It is only valid if every 通常時 weak-rare role is counted regardless of 内部状態; filtering by state breaks the derivation.
- The two axis-1 counters are **independent** — `weakRare` (denominator) and `rizeZone` (numerator) do not touch each other, so a win requires pressing both buttons. `rizeZone > weakRare` therefore means miscounting; the estimator returns a uniform posterior in that case and the UI warns.
- `QUEST_HIT_RATE` is the 本前兆/ガセ前兆 draw made at each 規定pt arrival — 本前兆 *is* the AT win, so the table is used directly as the per-quest hit probability. The separately published 「狩猟成功期待度 約36%」 is that table **marginalized**, not an extra gate: marginalizing it here yields 33.5% (設定1) to 39.1% (設定6). Multiplying by 36% on top would give ~13% and be wrong.
- Reset is a **per-AT-cycle boolean** (リセット回 / 通常回), toggled by tapping the grid's AT column. Default is row 1 = reset, rows 2+ = normal; a `cycle-start` event is stored only when a row deviates from that default and is deleted again when it returns to it. `resolveIsReset(rowIndex, override)` is the single source of that rule — segmentation and the grid both use it.
- After a reset cycle the first だるま落とし and first クエスト are recorded but excluded from the likelihood (内部リプレイ回数/カムラポイント get a random boost on 設定変更). The first AT win is *not* excluded — the random boost shifts points, not quest count.
- Event ids/timestamps are minted in the store, not components (`react-hooks/purity` rejects `Date.now()`/`uuidv4()` during render).
- Axes 3–4 are entered through a tap-editable grid (rows = AT cycles, fixed 7 columns = the AT間 quest ceiling). `buildQuestGrid()` derives it from the same `events` array the likelihood reads, and carries `eventIndex`/`routeEventIndex`/`appendIndex` so cell edits map back to array positions. Quest count is **derived, never stored** — don't reintroduce a `questCount` field. Deleting a cell sets `point: null` rather than removing the event, because removing it would shift later quests left and silently change which quest number the AT was won on; null cells render as an empty slot and are excluded from the axis-3 likelihood while still advancing the mode transition and counting toward axis 4. The `！` warning goes on the **value following** a gap (meaning "the one before it is missing"), not on the gap itself — the defect is the broken sequence, so it is flagged on the cell it invalidates. Quests chain **across rows**, so the gap check must too (`MonhanRiseQuestCell.precededByGap`); checking only within a row misses a row-leading cell and an entirely empty row. A リセット回 restarts the chain and never inherits a preceding gap. The cell modal offers only pt/CZ成功/直撃; a quest win is recorded implicitly by tapping into the dashed "next row", which appends `at-hit route:'quest'` first.
- `MonhanRiseMachine` has **no `totalGames`** — none of the four axes use game count. Because the other machine types do, read it through `getMachineTotalGames(machine)` rather than `machine.totalGames` on the union.
- Any code reading a persisted `at-hit` must go through `toAtWinRoute()`. Early data stored `questCount` with no `route`, and a store-version bump alone did not reliably repair it (see below).

The mode/table transition display (`MonhanRiseModePath`) uses **Viterbi** for the sequence, not per-step marginal argmax — marginals can render a transition with probability zero (e.g. モードB→A), and a displayed chain must be a sequence that could actually occur. Three further rules there, each of which looks like a bug if you "fix" it:
- **One chain, not one per setting.** The machine had a single real mode history; emissions are setting-independent and only transitions differ, so the transitions are averaged over the setting posterior to produce one chain. Per-setting chains genuinely differ (50/400 random cases for modes, 151/400 for tables) but showing two contradicts the fact that only one happened.
- "Current mode" is the forward posterior *after* the final transition, shown as the **full distribution** rather than the top state alone, because states can tie almost exactly (テーブルA and 天国準備 explain "won on quest 4" at 28.19% vs 28.01%, so the argmax flips on a 0.1% difference).
- `calculateQuestHitExpectancy` turns the estimated next-table distribution into a per-quest-count hit rate. It re-conditions the table posterior on *having reached* that quest count rather than just weighting the raw table — failing quest 1 eliminates 天国 entirely, so a plain weighted sum would overstate later counts. Unreachable counts return `null`. `calculateCumulativeQuestHit` is the separate "won by quest n" figure — unconditional from the start of the cycle, so the two must not be conflated (they agree only at quest 1).
- Each step carries a **forward-backward smoothed** confidence, not a forward-only one. A single observation rarely pins a mode, but a later certain mode identifies the earlier one retroactively (mode D at step 2 implies C at step 1, since C→D is 100%) — that only shows up if you use future observations too. Steps under 70% render faded.
- **Mode colors are derived from `POINT_COLOR`**, not chosen freely — a mode takes the color of the 規定pt it most often emits (A=600pt, B=500pt, C=200pt, D=100pt), so a colour means the same thing in the grid and in the chain. Quest tables have no pt counterpart and deliberately use a neutral→orange ramp that collides with nothing.

**Migration trap worth knowing:** bumping `version` and adding its `migrate` branch in two separate edits is unsafe while a dev server is running. Vite HMR rehydrates the store in between, stamps the new version with no branch to run, and that branch can then never fire — leaving permanently unmigrated data. Bump the version and write its branch in the same change, and prefer normalizing at the read boundary for fields whose absence would crash.

**Haptics:** [src/utils/haptic.ts](src/utils/haptic.ts) — `navigator.vibrate(10)` where supported; iOS Safari falls back to an unofficial trick (clicking a hidden `<input type="checkbox" switch>` during a user gesture). Must be called synchronously inside a tap handler. Kabaneri and MonhanRise counter buttons use pointer-event tap-detection (not `onClick`) so scrolling doesn't fire counters.

**Counter press feedback:** the pressing finger covers the button face, so visual confirmation must be drawn *outside* the button bounds (`overflow: visible` + an expanding ring and a "+1" that floats above the top edge). Keyframe the float so it reaches full opacity only once it has fully cleared the button — an effect that peaks while still overlapping the button is invisible in real use. Verify by sampling `document.getAnimations()` with `currentTime` set and comparing the float's `getBoundingClientRect().bottom` against the button's top; a screenshot alone will not catch this.

**Supabase sync:** [src/lib/supabase.ts](src/lib/supabase.ts) + [src/lib/supabaseSync.ts](src/lib/supabaseSync.ts). Tables `machines`, `machine_counters`, `history_entries`, `hokuto_state`, `hokuto_logs`, `monhan_rise_state` with RLS enabled but fully-open policies (no auth). MonkeyTurn and Kabaneri share `machine_counters`; MonhanRise keeps counters + the whole `events` array in one `monhan_rise_state` row. Every store mutation does an optimistic local update + fire-and-forget upsert (`.catch(() => {})`); failures are silently swallowed and there is no retry queue or conflict resolution. `denshoHelper` is **not** synced to Supabase — it is localStorage-only. Manual upload/download buttons on HomeScreen are the recovery path.

**Spec docs are the source of truth for all probability tables** — change the doc and the data file together:
- [docs/hokuto-tensei2-spec.md](docs/hokuto-tensei2-spec.md), [docs/hokuto-tensei2-implementation.md](docs/hokuto-tensei2-implementation.md)
- [docs/densho-helper-spec.md](docs/densho-helper-spec.md), [docs/densho-helper-research.md](docs/densho-helper-research.md)
- [docs/kabaneri-unato-spec.md](docs/kabaneri-unato-spec.md)
- [docs/monhan-rise-spec.md](docs/monhan-rise-spec.md)
- [docs/tokyo-ghoul-research.md](docs/tokyo-ghoul-research.md) — research only, not yet implemented

**Styling:** CSS Modules (`.module.css` co-located with components) + global styles in [src/styles/](src/styles/). Apple dark mode aesthetic with design tokens in [src/styles/tokens.css](src/styles/tokens.css). Kabaneri deviates deliberately: neon circular buttons with per-item glow colors defined in `kabaneriDefinitions.ts` rather than tokens.

**Component layout:**
- `Home/` — machine selection, add/delete, Supabase sync buttons
- `Header/` — machine selector, game input, history modal
- `Counter/`, `Statistics/`, `History/` — MonkeyTurn only
- `Hokuto/` — HokutoMain (tab shell), StatusBar, LogTimeline, InlineLogEntry, AnalysisModal, ShutterModal, TenhaRateModal, LogDetailModal, `Densho/DenshoHelperTab`
- `Kabaneri/` — KabaneriMain, KabaneriButton, KabaneriToolbar, KabaneriSettingAnalysis
- `MonhanRise/` — MonhanRiseMain (入力/設定推測 の2タブ), MonhanRiseInput, MonhanRiseCountButton, MonhanRiseQuestGrid, MonhanRiseModePath, MonhanRiseSettingAnalysis
- `GameInput/` — drum picker for game count input
- `common/` — Modal, ConfirmDialog
- `Export/`, `Machine/`, `src/hooks/` are empty placeholder directories
