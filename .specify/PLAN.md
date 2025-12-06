# Technical Plan: Slot Counter - Monkey Turn V Edition

**Created**: 2025-12-06
**Status**: Draft
**Based on**: SPEC.md

## Architecture Overview

### Technology Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **PWA**: vite-plugin-pwa (Workbox)
- **State Management**: Zustand
- **Styling**: CSS Modules + CSS Variables (Design Tokens)
- **Charts**: Recharts
- **Storage**: localStorage with JSON serialization
- **Testing**: Vitest + React Testing Library

### Project Structure

```
slot_counter/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Counter/
│   │   │   ├── CounterRow.tsx
│   │   │   ├── CounterRow.module.css
│   │   │   └── CounterList.tsx
│   │   ├── GameInput/
│   │   │   ├── DrumPicker.tsx
│   │   │   ├── DrumPicker.module.css
│   │   │   └── GameInputModal.tsx
│   │   ├── Statistics/
│   │   │   ├── ProbabilityDisplay.tsx
│   │   │   ├── SettingAnalysis.tsx
│   │   │   └── HistoryChart.tsx
│   │   ├── Machine/
│   │   │   ├── MachineSelector.tsx
│   │   │   └── MachineEditor.tsx
│   │   ├── Export/
│   │   │   └── ExportMenu.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── ConfirmDialog.tsx
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   └── useMachine.ts
│   ├── stores/
│   │   ├── counterStore.ts
│   │   └── machineStore.ts
│   ├── utils/
│   │   ├── probability.ts
│   │   ├── binomialDistribution.ts
│   │   ├── export.ts
│   │   └── storage.ts
│   ├── data/
│   │   ├── koyakuDefinitions.ts
│   │   └── settingProbabilities.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       ├── global.css
│       └── tokens.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Core Components Design

### 1. Data Types (types/index.ts)

```typescript
// 小役定義
interface KoyakuDefinition {
  id: string;
  name: string;
  category: KoyakuCategory;
  backgroundColor: string;
  order: number;
}

type KoyakuCategory =
  | '5枚役'
  | '激走演出'
  | '終了時演出'
  | '特殊'
  | '直撃';

// カウンター状態
interface CounterState {
  [koyakuId: string]: number;
}

// 履歴エントリ
interface HistoryEntry {
  id: string;
  timestamp: number;
  totalGames: number;
  fiveCardTotal: number;
  probability: number | null;
  settingAnalysis: SettingAnalysis;
}

// 設定判別結果
interface SettingAnalysis {
  setting1: number;
  setting2: number;
  setting4: number;
  setting5: number;
  setting6: number;
}

// 台データ
interface Machine {
  id: string;
  name: string;
  number?: string;
  createdAt: number;
  updatedAt: number;
  counters: CounterState;
  history: HistoryEntry[];
  totalGames: number;
}
```

### 2. State Management (stores/machineStore.ts)

Zustand storeで以下を管理:
- 現在選択中の台
- 全台リスト
- カウンター操作（increment/decrement）
- 履歴追加
- リセット機能

```typescript
interface MachineStore {
  machines: Machine[];
  currentMachineId: string | null;

  // Actions
  addMachine: () => void;
  selectMachine: (id: string) => void;
  updateMachineName: (id: string, name: string) => void;
  incrementCounter: (koyakuId: string) => void;
  decrementCounter: (koyakuId: string) => void;
  updateTotalGames: (games: number) => void;
  addHistoryEntry: () => void;
  resetCurrentMachine: () => void;
  deleteMachine: (id: string) => void;
}
```

### 3. Key Algorithm: Binomial Distribution (utils/binomialDistribution.ts)

```typescript
// 設定ごとの5枚役確率
const SETTING_PROBABILITIES = {
  1: 1/38,  // 2.63%
  2: 1/35,  // 2.86%
  4: 1/30,  // 3.33%
  5: 1/26,  // 3.85%
  6: 1/24,  // 4.17%
};

// 二項分布の確率質量関数
function binomialPMF(k: number, n: number, p: number): number {
  // nCk * p^k * (1-p)^(n-k)
  // 大きな数値のオーバーフローを避けるため対数を使用
}

// 各設定の事後確率を計算（ベイズ推定）
function calculateSettingProbabilities(
  fiveCardCount: number,
  totalGames: number
): SettingAnalysis {
  // 各設定の尤度を計算
  // 事前確率は均等（各設定20%）と仮定
  // 事後確率に正規化して返す
}
```

### 4. PWA Configuration (vite.config.ts)

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'モンキーターンV カウンター',
        short_name: 'MTVカウンター',
        description: 'パチスロ モンキーターンV 小役カウンター',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
```

## UI/UX Design

### Mobile-First Layout

```
┌─────────────────────────────┐
│  モンキーターンV カウンター    │ Header
│  台1 ▼  | 🔄 リセット        │
├─────────────────────────────┤
│ ゲーム数: [0000] 📝         │ Game Input
│ 5枚役確率: 1/25.0           │
├─────────────────────────────┤
│ 設定判別                     │ Setting Analysis
│ ■1: 5% ■2: 10% ■4: 20%     │
│ ■5: 30% ■6: 35%            │
├─────────────────────────────┤
│ ═══ 5枚役 ═══               │ Counter Section
│ ┌─────────────────────────┐ │
│ │ リリベ    [-1] 5 [+1]   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ リベべ    [-1] 3 [+1]   │ │
│ └─────────────────────────┘ │
│ ...                         │
├─────────────────────────────┤
│ ═══ 激走演出 ═══            │
│ ...                         │
├─────────────────────────────┤
│ [履歴] [グラフ] [エクスポート]│ Footer Actions
└─────────────────────────────┘
```

### Design Tokens (styles/tokens.css)

```css
:root {
  /* Colors - Category backgrounds */
  --color-5card: #F0F8FF;
  --color-gekiso: #FFFFE0;
  --color-end: #E6E6FA;
  --color-special: #FFC0CB;
  --color-direct: #FFEBCD;

  /* Colors - UI */
  --color-primary: #1a73e8;
  --color-danger: #dc3545;
  --color-success: #28a745;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Button sizes (touch-friendly) */
  --button-min-height: 48px;
  --counter-button-size: 56px;

  /* Typography */
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;
}
```

## Implementation Phases

### Phase 1: Core MVP (P1 Features)
1. Project setup (Vite + React + TypeScript)
2. Basic counter component with +1/-1
3. Koyaku definitions data
4. localStorage persistence
5. Game count input (drum picker)
6. 5-card probability calculation
7. Setting analysis (binomial distribution)
8. Reset functionality
9. PWA configuration

### Phase 2: Enhanced Features (P2 Features)
1. Multiple machine management
2. History recording
3. History list view
4. Statistics chart (Recharts)

### Phase 3: Export & Polish (P3 Features)
1. CSV export
2. JSON export
3. UI polish
4. Performance optimization
5. Lighthouse audit

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| localStorage容量制限 | 古い履歴の自動削除、容量監視 |
| オフライン時のSW更新 | 更新通知UI、手動リロード促進 |
| 大量データでのパフォーマンス | 仮想スクロール、メモ化 |
| 複数タブでのデータ競合 | storage eventリスナー、同期処理 |

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "recharts": "^2.10.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```
