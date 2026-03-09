# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pachislot (パチスロ) "Monkey Turn V" koyaku (小役) counter — a mobile-first PWA for tracking slot machine bonus patterns and estimating machine settings via Bayesian/binomial probability analysis. All UI text is in Japanese.

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

**Data model:** Types in [src/types/index.ts](src/types/index.ts). Core entity is `Machine` — holds counter state (koyaku counts), total games played, and history snapshots. `HistoryEntry` captures point-in-time snapshots with setting probability analysis.

**Koyaku definitions:** [src/data/koyakuDefinitions.ts](src/data/koyakuDefinitions.ts) defines all tracked koyaku items across 5 categories (5枚役, 激走演出, 終了時演出, 特殊, 直撃). The three 5枚役 items (`fiveCardIds`) are the ones used for setting analysis.

**Setting probability:** [src/data/settingProbabilities.ts](src/data/settingProbabilities.ts) has per-setting probability tables. [src/utils/binomialDistribution.ts](src/utils/binomialDistribution.ts) calculates Bayesian setting probabilities from observed counts.

**Styling:** CSS Modules (`.module.css` co-located with components) + global styles in [src/styles/](src/styles/). Design follows Apple dark mode aesthetic with design tokens in [src/styles/tokens.css](src/styles/tokens.css).

**Component layout:**
- `Header` — machine selector, game input, history modal
- `Counter/` — counter rows grouped by koyaku category
- `Statistics/` — probability display and setting analysis (bar chart)
- `History/` — history list, chart (Recharts), modal
- `common/` — Modal, ConfirmDialog
- `GameInput/` — drum picker for game count input
