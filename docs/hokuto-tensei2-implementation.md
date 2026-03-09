# 北斗の拳 転生の章2 — 実装設計

## 方針: 既存アプリに統合

別アプリにせず、既存のモンキーターンVアプリに**機種タイプ選択**を追加する。

理由:
- PWA基盤（manifest、service worker）、共通コンポーネント（Modal、ConfirmDialog、DrumPicker）、CSSトークンを共有
- Zustandストアの永続化基盤を再利用
- Header に機種切り替えを追加するだけで済む

---

## 型設計

### Machine型を判別共用体に拡張

```typescript
// src/types/index.ts

type MachineType = 'monkey-turn-v' | 'hokuto-tensei2';

interface BaseMachine {
  id: string;
  machineType: MachineType;
  name: string;
  number?: string;
  createdAt: number;
  updatedAt: number;
}

// 既存のモンキーターンV（既存Machineと同じ構造 + machineType追加）
interface MonkeyTurnMachine extends BaseMachine {
  machineType: 'monkey-turn-v';
  counters: CounterState;
  history: HistoryEntry[];
  totalGames: number;
}

// 新規: 北斗転生2
interface HokutoMachine extends BaseMachine {
  machineType: 'hokuto-tensei2';
  session: HokutoSession;
  logs: HokutoLog[];
  totalGames: number;
  totalAbeshi: number;
}

type Machine = MonkeyTurnMachine | HokutoMachine;
```

### 北斗転生2 専用型

```typescript
// src/types/hokuto.ts

// --- セッション ---
type ResetStatus = 'reset' | 'suekae' | 'unknown';

interface HokutoSession {
  resetStatus: ResetStatus;
  startedAt: number;
}

// --- ログ（判別共用体） ---
type HokutoLog =
  | ATWinLog
  | TenhaLog
  | FakeZenchoLog
  | EffectHintLog
  | DenshoModeLog;

// 1. AT当選ログ
interface ATWinLog {
  type: 'at-win';
  id: string;
  timestamp: number;
  gameCount: number;
  abeshiCount: number;
  trigger: 'kitei-abeshi' | 'rare-chokugeki';
  triggerYaku?: ChokugekiYaku;
}

type ChokugekiYaku =
  | 'jaku-cherry' | 'kyou-cherry' | 'chance-me'
  | 'suika' | 'kakutei-cherry';

// 2. 天破の刻ログ
interface TenhaLog {
  type: 'tenha';
  id: string;
  timestamp: number;
  gameCount: number;
  trigger: TenhaTriggerYaku;
  estimatedState: InternalState;
  duration: 7 | 14 | 21 | 'infinite';
  tengekiGames: TengekiGameEntry[];  // 天撃チャレンジのゲームごと記録
}

type TenhaTriggerYaku =
  | 'jaku-cherry' | 'kyou-cherry' | 'suika'
  | 'chance-me' | 'shobu-zoroi' | 'kakutei-cherry';

type InternalState = 'low' | 'normal' | 'high' | 'densho';

// 天撃チャレンジ 1ゲーム分
interface TengekiGameEntry {
  gameNumber: number;
  yaku: TengekiYaku;
  result: 'success' | 'failure';
}

type TengekiYaku =
  | 'hazure' | 'replay' | 'bell'
  | 'jaku-cherry' | 'kyou-cherry' | 'suika'
  | 'chance-me' | 'shobu-zoroi' | 'kakutei-cherry';

// 3. 前兆ログ
interface FakeZenchoLog {
  type: 'fake-zencho';
  id: string;
  timestamp: number;
  abeshiCount: number;
  zenchoType: 'real' | 'fake';
  hasShutter: boolean;
  estimatedMode: HokutoMode | null;
}

type HokutoMode = 'mode-a' | 'mode-b' | 'mode-c' | 'tengoku';

// 4. 演出示唆ログ
interface EffectHintLog {
  type: 'effect-hint';
  id: string;
  timestamp: number;
  lampA?: LampState;   // A箇所: モード・あべし示唆
  lampB?: LampState;   // B箇所: 設定示唆
  lampC?: LampState;   // C箇所: 初当たり近さ示唆
  trophy?: TrophyColor;
  pedestalColor?: 'normal' | 'gold';
  ledColor?: 'normal' | 'white-fast' | 'rainbow';
}

interface LampState {
  color: string;   // 白 | 水色 | 金 | 紫 | 黄緑
  pattern: 'solid' | 'blink';
}

type TrophyColor = 'bronze' | 'silver' | 'gold' | 'kirin' | 'rainbow';

// 5. 伝承モードログ
interface DenshoModeLog {
  type: 'densho';
  id: string;
  timestamp: number;
  denshoType: 'short' | 'middle' | 'long';
  endState: 'low' | 'normal' | 'high';
}
```

---

## データ定義

### `src/data/hokutoDefinitions.ts`

機種固有の確率テーブル・ゾーン定義を定数として格納。

| 定数 | 内容 |
|------|------|
| `AT_HIT_RATES` | 設定別AT初当たり確率（1/366 ~ 1/273） |
| `TENHA_RATES` | 設定別天破出現率（1/100.2 ~ 1/81.3） |
| `TENGEKI_HAZURE_RATES` | 設定別天撃ハズレ時成功率（4.7% ~ 16.4%） |
| `TENGEKI_TOTAL_RATES` | 設定別天撃トータル成功率 |
| `DENSHO_END_TRANSITION` | 設定別伝承終了時状態移行率（低確/通常/高確） |
| `MODE_TRANSITION_RESET` | 設定変更時モード移行率 |
| `MODE_TRANSITION_AT_END` | AT終了時モード移行率 |
| `MODE_CEILINGS` | モード別規定あべし上限 |
| `MODE_CEILINGS_RESET` | リセット時の規定あべし上限（モードA: 1280） |
| `ABESHI_ZONES` | モード別規定あべし集中帯 |
| `SHUTTER_CHECKPOINTS` | シャッター判別ポイント（37~45, 166~173, 288~300, 421~429, 489~495） |
| `FAKE_ZENCHO_MODE_MAP` | フェイク前兆あべし帯 → モード判別マッピング |
| `LAMP_INTERPRETATIONS` | ランプ色/パターン → 示唆内容マッピング |
| `TROPHY_SETTING_FLOOR` | トロフィー色 → 設定下限 |

---

## 推定ロジック

### `src/utils/hokutoEstimation.ts`

#### 1. モード推定 (`estimateCurrentMode`)

入力: 現サイクルの前兆ログ + 演出示唆ログ
出力: `{ modeA: number, modeB: number, modeC: number, tengoku: number }` （確率分布）

ロジック:
1. シャッター判別ポイントでの結果を確認
   - シャッター閉 → 896あべし以内（モードB以上の可能性大幅アップ）
   - シャッター未発生 → モードAの深部濃厚
2. フェイク前兆のあべし帯でモードを絞り込み
3. ランプ示唆（A/C箇所）で補強
4. リセット/据え置きに応じたモード移行率を事前確率として使用

#### 2. 設定推定 (`calculateHokutoSettingProbabilities`)

入力: 全ログ + セッション情報
出力: `{ setting1~6: number }` （事後確率）

ベイズ推定で複数の証拠を統合:

| 証拠 | 尤度計算 | 重み（自然に反映） |
|------|---------|------------------|
| AT初当たり確率 | binomial(atCount, totalGames, settingRate) | 中 |
| 天破出現率 | binomial(tenhaCount, totalGames, settingRate) | 中 |
| 天撃ハズレ時成功率 | binomial(hazureSuccess, hazureTotal, settingRate) | **最大**（3.5倍差） |
| 伝承後状態移行 | multinomial(low/normal/high counts, settingRates) | 高 |
| 演出確定系 | トロフィー/ランプで不可能な設定を0に | 確定 |

重みは明示的に設定せず、確率のスプレッド差でベイズ推定が自然に反映する。

---

## ストア設計

### `src/stores/machineStore.ts` の変更

```typescript
// 既存アクションはそのまま維持（MonkeyTurnMachine用）

// 追加アクション
addHokutoMachine: () => void;
setSessionResetStatus: (status: ResetStatus) => void;
addHokutoLog: (log: HokutoLog) => void;
deleteHokutoLog: (logId: string) => void;
updateTotalGamesAndAbeshi: (games: number, abeshi: number) => void;

// 追加ゲッター
getHokutoLogs: () => HokutoLog[];
getATWinLogs: () => ATWinLog[];
getTenhaLogs: () => TenhaLog[];
getTengekiStats: () => {
  hazureTotal: number;
  hazureSuccess: number;
  overallTotal: number;
  overallSuccess: number;
};
getConfirmedSettingFloor: () => number;  // トロフィー/ランプから確定した設定下限
```

### localStorage マイグレーション

既存データに `machineType: 'monkey-turn-v'` を付与する。

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'slot-counter-storage',
    version: 2,
    migrate: (persisted, version) => {
      if (version < 2) {
        // 既存 Machine に machineType を追加
        persisted.machines = persisted.machines.map(m => ({
          ...m,
          machineType: 'monkey-turn-v',
        }));
      }
      return persisted;
    },
  }
)
```

---

## コンポーネント構成

### 変更するコンポーネント

| ファイル | 変更内容 |
|---------|---------|
| `App.tsx` | `machineType` で MonkeyTurn / Hokuto のメインビューを切り替え |
| `Header/Header.tsx` | 機種タイプ選択UI（台追加時にタイプ選択） |

### 新規コンポーネント（`src/components/Hokuto/`）

| コンポーネント | 役割 |
|--------------|------|
| `HokutoMain.tsx` | 北斗モードのトップレベルレイアウト |
| `SessionSetup.tsx` | リセット状態選択（リセット/据え置き/不明） |
| `LogTimeline.tsx` | ログの時系列リスト表示 |
| `LogEntryCard.tsx` | ログ1件のカード表示（type別フォーマット） |
| `AddLogModal.tsx` | ログ追加モーダル（ログタイプ選択 → 各フォーム） |
| `ATWinForm.tsx` | AT当選ログ入力フォーム |
| `TenhaForm.tsx` | 天破の刻ログ入力フォーム |
| `TengekiGameRow.tsx` | 天撃チャレンジ1G分の入力行 |
| `FakeZenchoForm.tsx` | 前兆ログ入力フォーム |
| `EffectHintForm.tsx` | 演出示唆ログ入力フォーム |
| `DenshoForm.tsx` | 伝承モードログ入力フォーム |
| `HokutoSettingAnalysis.tsx` | 設定推定結果の棒グラフ表示 |
| `ModeEstimation.tsx` | モード推定結果の表示 |
| `HokutoSummary.tsx` | 統計サマリー（AT回数、天破回数、天撃成功率等） |

### 再利用するコンポーネント（変更なし）

- `common/Modal.tsx`
- `common/ConfirmDialog.tsx`
- `GameInput/DrumPicker.tsx`（数値入力に使える）

---

## 実装フェーズ

### Phase 1: 型・データ・ロジック（UIなし）
1. `src/types/hokuto.ts` — 全型定義
2. `src/types/index.ts` — Machine判別共用体化
3. `src/data/hokutoDefinitions.ts` — 確率テーブル・ゾーン定義
4. `src/utils/hokutoEstimation.ts` — モード推定 + 設定推定

### Phase 2: ストアリファクタリング
5. `src/stores/machineStore.ts` — 北斗アクション追加 + マイグレーション

### Phase 3: UIシェル
6. `Header/Header.tsx` — 機種タイプ選択
7. `App.tsx` — 条件分岐レンダリング

### Phase 4: 北斗コンポーネント
8. `HokutoMain.tsx` + `SessionSetup.tsx`
9. `LogTimeline.tsx` + `LogEntryCard.tsx`
10. `AddLogModal.tsx` + 各フォーム
11. `HokutoSettingAnalysis.tsx` + `ModeEstimation.tsx` + `HokutoSummary.tsx`

### Phase 5: 仕上げ
12. PWA manifest を汎用名に更新
13. `package.json` の name/description 更新
