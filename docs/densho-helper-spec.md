# 北斗の拳 転生の章2 — 伝承モード推測補助ツール 仕様書

> 既存の北斗ログ実装(`Hokuto/`)と並列に動作するサブツール。
> 同一機種(`HokutoMachine`)内でタブ分離、データは完全独立。
> 数値の根拠は [docs/densho-helper-research.md](densho-helper-research.md) 参照。

---

## 1. ゴール

**「伝承モード」を中心に、入力負荷を最小化しつつ設定上下を統計的に補助判別する。**

最重要設定差: 伝承終了時の高確移行率 (設定1: 3.1% / 設定6: 10.9%)

---

## 2. データモデル

### 2.1 配置方針: タブ分離

`HokutoMachine` 内に独立した `denshoHelper` ブロックを追加。既存の `logs` (詳細ログ) とは独立して読み書きする。

```typescript
interface HokutoMachine extends BaseMachine {
  machineType: 'hokuto-tensei2';
  // 既存(変更なし)
  session: HokutoSession;
  logs: HokutoLog[];
  totalGames: number;
  totalAbeshi: number;
  // 新規
  denshoHelper: DenshoHelperState;
}
```

### 2.2 DenshoHelperState

```typescript
interface DenshoHelperState {
  // 現在のサイクル状態
  phase: 'in-densho' | 'after-densho' | 'idle';
  cycleStartGame: number;        // 現サイクル開始ゲーム
  lastEventGame: number;         // 最後の入力イベントのG数

  // 伝承推定(現サイクル)
  denProb: number;               // P(伝承滞在中)
  levelDist: {                   // P(short|middle|long)
    short: number;
    middle: number;
    long: number;
  };

  // 状態推定(現サイクル、伝承後の観測用)
  // 設定1仮定/設定6仮定での P(state | observations) を別々に保持
  stateUnderS1: { low: number; normal: number; high: number };
  stateUnderS6: { low: number; normal: number; high: number };

  // イベント履歴(設定推定の振り返り用)
  events: DenshoEvent[];

  // 蓄積サンプル(設定推定用)
  samples: StateSample[];        // 各サイクルの確定状態
  settingPosterior: number[];    // 設定1〜6の事後確率(長さ6)
}

type DenshoEvent =
  | YakuObservedEvent
  | TenhaStartEvent
  | TenhaEndEvent
  | HighConfirmEvent;

type ObservableYaku =
  | 'jaku-cherry'
  | 'kyou-cherry'
  | 'suika'
  | 'chance-me'
  | 'shobu-zoroi'
  | 'bell';

interface YakuObservedEvent {
  type: 'yaku';
  id: string;
  game: number;
  yaku: ObservableYaku;
}

interface TenhaStartEvent {
  type: 'tenha-start';
  id: string;
  game: number;
}

interface TenhaEndEvent {
  type: 'tenha-end';
  id: string;
  game: number;
}

interface HighConfirmEvent {
  type: 'high-confirm';
  id: string;
  game: number;
}

interface StateSample {
  cycleEndGame: number;
  // どちらの仮定でも記録しておき、設定推定時に逆方向にベイズ
  observedEvidence: 'high-confirmed' | 'rare-tenha-early' | 'no-reaction-30g' | 'tenha-rehit' | 'tenha-rehit-early';
  // 設定別の尤度を計算するための材料
}
```

---

## 3. 入力イベント(最終)

> 用語: **Tenha** (天破) で統一。

すべてワンタップ入力。Header の現在G数で記録。当否選択は **廃止**。

| イベント | UI表示条件 | フィールド |
|---|---|---|
| 弱チェリー | 常時 | G数のみ |
| 強チェリー | 常時 | G数のみ |
| スイカ | 常時 | G数のみ |
| チャンス目 | 常時 | G数のみ |
| 勝舞揃い | 常時 | G数のみ |
| ベル | 任意(気付いたら) | G数のみ |
| Tenha 突入 | 常時 | G数のみ |
| Tenha 終了 | `phase === 'in-densho'` のみ | G数のみ |
| 高確以上確定 | `phase === 'after-densho'` のみ | G数のみ |
| 直前取消 | 常時 | — (直近1件Undo) |

ステージ・ハズレ・リプレイ入力は **なし**。

### 当否の自動推定 — 16Gルックバック

Tenha 突入時、直近16Gのイベントから trigger 役を確率配分:

```typescript
function attributeTrigger(eventsInWindow, gT, lookback = 16): Attribution[] {
  const candidates: Attribution[] = [];

  // 観測されたレア役・ベル
  for (const event of eventsInWindow) {
    candidates.push({
      eventId: event.id,
      yaku: event.yaku,
      weight: TENHA_RATE_BY_YAKU_DENSHO[event.yaku],
    });
  }

  // 共通役(集約)
  const knownGames = eventsInWindow.length;
  const unknownGames = lookback - knownGames;
  // 共通役の合算 trigger 確率/G ≈ 6.5%
  const commonAvgPerGame = 0.065;
  candidates.push({
    eventId: 'common',
    weight: 1 - Math.pow(1 - commonAvgPerGame, unknownGames),
  });

  // 正規化 → attribution 確率
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  return candidates.map(c => ({ ...c, attribution: c.weight / total }));
}
```

### Tenha が来なかった rare yaku の扱い

レア役入力後、16G経過しても Tenha 突入なし → 確定で「非当選」として尤度比 < 1 で更新。途中で Tenha 突入が来た場合は attribution に応じて部分 hit 扱い。

---

## 4. 推定ロジック

### 4.1 ハズレ・リプレイ補完

イベント `N`(G=A) と次のイベント `N+1`(G=B) の間:

```
gap = B - A - 1
入力済イベント(ベル等)を gap から差し引く
unknown_games = gap - 入力済件数
推定ハズレ・リプレイ回数 ≈ unknown_games × 0.94
  (≈ 1/1.4 + 1/8.7 / (1 - rare_yaku_rate) の近似)
```

### 4.2 伝承確率 P(densho) の更新

#### 突入時(天破終了イベントで)
```
denProb = 1.0
levelDist = { short: 0.984, middle: 0.012, long: 0.004 }
```

#### 役入力ごとに尤度比でベイズ更新

```typescript
const LIKELIHOOD_RATIO = {
  // 役×当否 → P(E|densho) / P(E|¬densho)
  'rare-yaku.jaku-cherry.hit':     31.3,   // 0.250 / 0.008
  'rare-yaku.jaku-cherry.miss':     0.756, // 0.750 / 0.992
  'rare-yaku.suika.hit':           21.0,   // 0.336 / 0.016 (低確基準)
  'rare-yaku.suika.miss':           0.675, // 0.664 / 0.984
  'rare-yaku.chance-me.hit':        7.35,  // 0.750 / 0.102 (通常基準)
  'rare-yaku.chance-me.miss':       0.279, // 0.250 / 0.898
  'rare-yaku.shobu-zoroi.hit':      7.35,  // 同上
  'rare-yaku.shobu-zoroi.miss':     0.279, // 同上
  'rare-yaku.kyou-cherry.hit':      4.0,   // 1.0 / 0.25
  'rare-yaku.kyou-cherry.miss':     0,     // 強チェで非当選なら densho 確定除外
  'bell.hit':                       Infinity, // 通常時はほぼ0% → 強い証拠
  'bell.miss':                      0.85,   // 0.844 / ~1.0
};

denProb = bayesUpdate(denProb, LR);
```

#### ハズレ・リプレイ補完での転落更新

```typescript
const SURVIVAL = { short: 0.672, middle: 0.953, long: 0.988 };

for each estimated 転落抽選 trigger:
  // レベル別生存率を期待値で適用
  expectedSurvival = levelDist.short * SURVIVAL.short
                   + levelDist.middle * SURVIVAL.middle
                   + levelDist.long * SURVIVAL.long;
  denProb *= expectedSurvival;

  // levelDist もベイズ更新(生き残りにくいレベルが減る)
  levelDist = updateLevelByFallChallenge(levelDist);
```

#### 自動 phase 遷移

```typescript
if (denProb < 0.15) {
  phase = 'after-densho';
  cycleStartGame = currentGame;
}
```

### 4.3 伝承レベル分布の更新

- 天破当選イベント(=ループ成功): 各レベルが現在も生きてる確率は同じだが、ループ回数 `n` が増えるほど `long` の事後上昇
- ハズレ・リプレイ生存数 `k`: 各レベルの尤度 `(1 - fallRate)^k`
- → 観測ごとに `levelDist` を再正規化

実装:
```typescript
function updateLevelByFallChallenge(prior, kHazureReplay) {
  return normalize({
    short:  prior.short  * Math.pow(0.672, kHazureReplay),
    middle: prior.middle * Math.pow(0.953, kHazureReplay),
    long:   prior.long   * Math.pow(0.988, kHazureReplay),
  });
}
```

### 4.4 内部状態の推定(設定1/設定6 別々)

`phase === 'after-densho'` 期間中、設定別に状態事後確率を更新:

```typescript
// 事前分布
stateUnderS1 = DENSHO_END_TRANSITION[1];  // {low: 0.719, normal: 0.250, high: 0.031}
stateUnderS6 = DENSHO_END_TRANSITION[6];  // {low: 0.391, normal: 0.500, high: 0.109}

// 観測ごと(レア役の天破当否)に各仮定下でベイズ更新
function updateStateUnderSetting(prior, event, setting) {
  const yaku = event.yaku;
  const hit = event.tenhaHit;

  // 状態×役×設定 → 天破当選率
  const hitProbBy = {
    low:    TENHA_RATE_LOW[setting][yaku],
    normal: TENHA_RATE_NORMAL[setting][yaku],
    high:   TENHA_RATE_HIGH[setting][yaku],
  };

  return normalize({
    low:    prior.low    * (hit ? hitProbBy.low    : 1 - hitProbBy.low),
    normal: prior.normal * (hit ? hitProbBy.normal : 1 - hitProbBy.normal),
    high:   prior.high   * (hit ? hitProbBy.high   : 1 - hitProbBy.high),
  });
}
```

#### 高確以上ボタンの効果

```typescript
stateUnderS1 = stateUnderS6 = { low: 0, normal: 0, high: 1.0 };
// その瞬間にサンプル確定
recordSample({ observedEvidence: 'high-confirmed', game: currentGame });
```

### 4.5 サイクル境界とサンプル記録

#### サンプル発生条件

| イベント | サンプル種類 | 効果 |
|---|---|---|
| 高確以上ボタン | `high-confirmed` | state = high で確定 |
| 観測中の早期天破当選(≤10G) | `tenha-rehit-early` | state = high 強示唆 |
| 観測中の天破当選(11〜30G) | `tenha-rehit` | state = normal 寄り |
| 観測30G経過(無反応) | `no-reaction-30g` | state = low 寄り |

#### サンプルの設定推定への寄与

```typescript
// 設定別尤度
function settingLikelihoodFromSample(sample, setting) {
  const trans = DENSHO_END_TRANSITION[setting];
  switch (sample.observedEvidence) {
    case 'high-confirmed':       return trans.high;
    case 'tenha-rehit-early':    return trans.high * 0.8 + trans.normal * 0.2;
    case 'tenha-rehit':          return trans.normal * 0.6 + trans.high * 0.3 + trans.low * 0.1;
    case 'no-reaction-30g':      return trans.low * 0.7 + trans.normal * 0.3;
  }
}

// 全サンプルから設定事後を計算
settingPosterior[s] ∝ ∏ settingLikelihoodFromSample(sample, s+1)
```

#### サイクルリセット

新たな `tenha-start` イベント or `phase === 'idle'` への遷移で:
- 観測中なら現状をサンプル化(まだしてなければ)
- `denProb`, `levelDist`, `stateUnderS1/S6` を初期化
- 新サイクル開始

---

## 5. UI構成

### 5.1 タブ統合

`HokutoMain.tsx` の上部に既存の北斗UIと切り替えるタブを追加:

```
[ 詳細ログ ] [ 伝承推測補助 ]
```

各タブのデータ・ロジックは完全独立。

### 5.2 伝承推測補助タブの画面構成

```
┌─ 伝承モード ──────────────┐
│  滞在確率: 78%             │
│  ロング 12% / ミドル 31%   │
│  / ショート 35%            │
└──────────────────────────┘
┌─ 内部状態(仮定別)─────────┐
│         設定1基準  設定6基準│
│  低確   72%       39%      │
│  通常   25%       50%      │
│  高確    3%       11%      │
└──────────────────────────┘
┌─ 設定推定 ────────────────┐
│  1: ▓▓                     │
│  ...                       │
│  6: ▓▓▓▓▓                  │
│  サンプル: 8回 / 信頼: 中   │
└──────────────────────────┘
┌─ 入力ボタン ──────────────┐
│ [レア役+G数+天破当否]       │
│ [ベル+G数+天破]  ← 伝承中のみ│
│ [天破突入][天破終了]        │
│ [高確以上確定] ← 観測中のみ │
└──────────────────────────┘
```

### 5.3 信頼度バッジ

| サンプル数 | バッジ |
|---|---|
| 0〜4 | データ不足 |
| 5〜9 | 参考 |
| 10〜14 | 判断可 |
| 15+ | 高信頼 |

### 5.4 状態フェーズ表示

UI上部に小さく現在のフェーズを表示:
- `idle`: "サイクル待機中(天破突入で開始)"
- `in-densho`: "伝承モード推定中"
- `after-densho`: "観測中(残り XG)"

---

## 6. データ・定数追加

### 6.1 新規ファイル

```
src/data/denshoConstants.ts
  - LIKELIHOOD_RATIO      (役×天破当否 → 尤度比)
  - SURVIVAL              (レベル別生存率)
  - DENSHO_LEVEL_PRIOR    (突入時のレベル事前分布)
  - DENSHO_PROB_THRESHOLD (= 0.15)

src/utils/denshoEstimation.ts
  - bayesUpdateDenProb
  - updateLevelDist
  - updateStateUnderSetting
  - calcSettingPosterior
  - sampleObservation
```

### 6.2 既存資産の流用

- `DENSHO_END_TRANSITION` (既存 `hokutoDefinitions.ts`) → そのまま使用
- 役別天破当選率テーブル(低確/通常/高確 各設定) → 既存または新規追加

---

## 7. 実装フェーズ

### Phase 1: 型・定数・ロジック
1. `src/types/densho.ts` — `DenshoHelperState`, `DenshoEvent`, `StateSample`
2. `src/types/index.ts` — `HokutoMachine.denshoHelper` 追加
3. `src/data/denshoConstants.ts` — 尤度比・生存率・閾値
4. `src/utils/denshoEstimation.ts` — 全推定ロジック(純粋関数)
5. ユニットテスト(可能なら) — 主要ロジックの確認

### Phase 2: ストア統合
6. `machineStore.ts` —
   - 新規アクション: `addDenshoEvent`, `resetDenshoCycle`, `clearDenshoSamples`
   - selector: `getDenshoHelperState`
   - localStorage マイグレーション(version bump、既存 `HokutoMachine` に空 `denshoHelper` 付与)

### Phase 3: UIシェル
7. `Hokuto/HokutoMain.tsx` — 内部タブ追加
8. `Hokuto/Densho/DenshoHelperTab.tsx` — タブのトップレベル

### Phase 4: 表示コンポーネント
9. `DenshoStateCard.tsx` — 伝承滞在確率 + レベル分布
10. `InternalStateCard.tsx` — 設定1/設定6 並列表示
11. `SettingPosteriorCard.tsx` — 棒グラフ + サンプル数 + バッジ
12. `PhaseIndicator.tsx` — 現フェーズ表示

### Phase 5: 入力コンポーネント
13. `DenshoInputPanel.tsx` — 入力ボタン群
14. `RareYakuModal.tsx` — レア役+G数+当否の入力
15. `BellInputModal.tsx` — ベル+G数+当否
16. `TenhaButtons.tsx` — 突入/終了ボタン
17. `HighConfirmButton.tsx` — 高確以上ボタン

### Phase 6: Supabase同期(オプション)
18. `supabase/migrations/` — `densho_helper_state` テーブル
19. `supabaseSync.ts` — 同期ロジック

### Phase 7: 仕上げ
20. 実機検証(運用感のチェック)
21. 必要に応じて閾値調整

---

## 8. 仕様確定済み項目

- [x] データモデル: タブ分離 (B案)
- [x] 入力: レア役+ベル+天破+高確ボタン (ステージ・ハズレ・リプレイ入力なし)
- [x] 状態表示: 設定1/設定6 並列のみ(マージナライズ表示なし)
- [x] 設定表示: 棒グラフ + サンプル数 + 信頼度バッジ
- [x] 観測ウィンドウ: UIから不可視、内部処理のみ
- [x] AT本前兆との誤判定: ランプ非入力のため発生しない
- [x] レア役による伝承昇格: 入力データから推測のみ(明示的な数値抽選なし)
- [x] 朝一リセット/AT終了時の伝承移行: 対応しない

## 9. 未決事項(実装後に調整)

- [ ] レア役間の `unknown_games × 0.94` 補正係数の妥当性(ベルを除く正確値で再計算可)
- [ ] サンプル種別の尤度配分(`tenha-rehit-early` の 0.8/0.2 など)はヒューリスティック - 実機データで校正
- [ ] 信頼度バッジの閾値(5/10/15)は元設計書準拠だが、実用上の感覚に応じ調整
