# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pachislot (パチスロ) multi-machine counter & setting estimation PWA. Currently supports:
- **モンキーターンV** — 小役カウンター + 5枚役ベイズ設定推測
- **北斗の拳 転生の章2** — ログ記録 + 設定推測 + モード推定

Mobile-first PWA with Supabase cloud sync. All UI text is in Japanese.

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

**State management:** Single Zustand store with `persist` middleware ([src/stores/machineStore.ts](src/stores/machineStore.ts)). Persisted to localStorage under key `slot-counter-storage`. The store manages multiple "machines" (台), each with counters, game count, and history entries.

Two non-obvious persistence rules:
- `partialize` strips `currentMachineId` → app **always boots to HomeScreen**, never restores last-viewed machine.
- `version: 2` migration backfills `machineType: 'monkey-turn-v'` on legacy data. Any breaking schema change must bump `version` and add a `migrate` branch.

**Data model:** Types in [src/types/index.ts](src/types/index.ts) and [src/types/hokuto.ts](src/types/hokuto.ts). `Machine` is a discriminated union (`MonkeyTurnMachine | HokutoMachine`). Type guards `isMonkeyTurnMachine` / `isHokutoMachine` are exported from [src/stores/machineStore.ts](src/stores/machineStore.ts) (not the types module) — all machine-type-specific logic must narrow via these guards.

**MonkeyTurn definitions:** [src/data/koyakuDefinitions.ts](src/data/koyakuDefinitions.ts) defines tracked koyaku items across 5 categories. [src/data/settingProbabilities.ts](src/data/settingProbabilities.ts) + [src/utils/binomialDistribution.ts](src/utils/binomialDistribution.ts) for Bayesian setting estimation.

**Hokuto definitions:** [src/data/hokutoDefinitions.ts](src/data/hokutoDefinitions.ts) defines probability tables, lamp interpretations, mode/abeshi distributions. [src/utils/hokutoEstimation.ts](src/utils/hokutoEstimation.ts) for setting & mode estimation.

**Hokuto log types:** AT当選, 天破の刻, 天撃チャレンジ, フェイク前兆, 演出示唆(ランプ/トロフィー), 伝承モード — all as discriminated union `HokutoLog`.

**Hokuto lamp positions:** A=上部サイドランプ(入賞ランプ), B=上部中央ランプ, C=サブ液晶周辺ランプ.

**Supabase sync:** [src/lib/supabase.ts](src/lib/supabase.ts) + [src/lib/supabaseSync.ts](src/lib/supabaseSync.ts). Schema in [supabase/migrations/](supabase/migrations/) — tables `machines`, `machine_counters`, `history_entries`, `hokuto_state`, `hokuto_logs` with RLS enabled but fully-open policies (no auth). Every store mutation does an optimistic local update + fire-and-forget upsert (`.catch(() => {})`); failures are silently swallowed and there is no retry queue or conflict resolution. Manual upload/download buttons on HomeScreen are the recovery path.

**Spec docs:** [docs/hokuto-tensei2-spec.md](docs/hokuto-tensei2-spec.md) and [docs/hokuto-tensei2-implementation.md](docs/hokuto-tensei2-implementation.md) are the source of truth for Hokuto probability tables, lamp interpretations, and mode logic.

**Styling:** CSS Modules (`.module.css` co-located with components) + global styles in [src/styles/](src/styles/). Design follows Apple dark mode aesthetic with design tokens in [src/styles/tokens.css](src/styles/tokens.css).

**Component layout:**
- `Home/` — machine selection, add/delete, Supabase sync buttons
- `Header` — machine selector, game input, history modal
- `Counter/` — counter rows grouped by koyaku category (MonkeyTurn)
- `Statistics/` — probability display and setting analysis bar chart (MonkeyTurn)
- `History/` — history list, chart (Recharts), modal (MonkeyTurn)
- `Hokuto/` — HokutoMain, StatusBar, LogTimeline, InlineLogEntry, AnalysisModal
- `common/` — Modal, ConfirmDialog
- `GameInput/` — drum picker for game count input
