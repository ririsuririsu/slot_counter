# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pachislot (パチスロ) multi-machine counter & setting estimation PWA. Currently supports:
- **モンキーターンV** — 小役カウンター + 5枚役ベイズ設定推測
- **北斗の拳 転生の章2** — ログ記録 + 設定推測 + モード推定

Mobile-first PWA with Supabase cloud sync. All UI text is in Japanese.

## Deployment

Vercel にデプロイ済み: https://vercel.com/filaments-projects-9502b3f7/slot-counter

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- `npm run preview` — Preview production build locally

No test framework is configured.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Zustand + Recharts, PWA via vite-plugin-pwa (Workbox).

**State management:** Single Zustand store with `persist` middleware ([src/stores/machineStore.ts](src/stores/machineStore.ts)). Persisted to localStorage under key `slot-counter-storage`. The store manages multiple "machines" (台), each with counters, game count, and history entries.

**Data model:** Types in [src/types/index.ts](src/types/index.ts) and [src/types/hokuto.ts](src/types/hokuto.ts). `Machine` is a discriminated union (`MonkeyTurnMachine | HokutoMachine`). Each machine type has its own data structure.

**MonkeyTurn definitions:** [src/data/koyakuDefinitions.ts](src/data/koyakuDefinitions.ts) defines tracked koyaku items across 5 categories. [src/data/settingProbabilities.ts](src/data/settingProbabilities.ts) + [src/utils/binomialDistribution.ts](src/utils/binomialDistribution.ts) for Bayesian setting estimation.

**Hokuto definitions:** [src/data/hokutoDefinitions.ts](src/data/hokutoDefinitions.ts) defines probability tables, lamp interpretations, mode/abeshi distributions. [src/utils/hokutoEstimation.ts](src/utils/hokutoEstimation.ts) for setting & mode estimation.

**Hokuto log types:** AT当選, 天破の刻, 天撃チャレンジ, フェイク前兆, 演出示唆(ランプ/トロフィー), 伝承モード — all as discriminated union `HokutoLog`.

**Hokuto lamp positions:** A=上部サイドランプ(入賞ランプ), B=上部中央ランプ, C=サブ液晶周辺ランプ.

**Supabase sync:** [src/lib/supabase.ts](src/lib/supabase.ts) + [src/lib/supabaseSync.ts](src/lib/supabaseSync.ts). Fire-and-forget upsert on each state change, with manual upload/download buttons on Home screen.

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
