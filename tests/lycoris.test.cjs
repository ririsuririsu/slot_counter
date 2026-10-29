// 実ソースをメモリ上で変換して検証する。外部通信・実ユーザーの保存データには触れない。
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const storage = new Map();
const cloudRows = new Map();
const cloud = {
  from: (table) => ({
    upsert: async (row) => {
      const rows = cloudRows.get(table) ?? [];
      const id = row.id ?? row.machine_id;
      cloudRows.set(table, [...rows.filter((r) => (r.id ?? r.machine_id) !== id), structuredClone(row)]);
      return { error: null };
    },
    delete: () => ({ eq: async () => ({ error: null }) }),
    select: () => ({
      order: async () => ({ data: structuredClone(cloudRows.get(table) ?? []), error: null }),
      eq: (key, id) => ({
        single: async () => ({
          data: structuredClone((cloudRows.get(table) ?? []).find((r) => r[key] === id) ?? null),
          error: null,
        }),
      }),
    }),
  }),
};
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const sync = new Proxy({}, {
  get: () => () => Promise.resolve(null),
});
function load(source) {
  const file = path.resolve(__dirname, '..', source);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier === './supabase') return { supabase: cloud };
    if (specifier.includes('supabaseSync')) return sync;
    if (specifier === 'uuid') return { v4: require('node:crypto').randomUUID };
    if (specifier.startsWith('.')) {
      const dependency = path.resolve(path.dirname(file), specifier);
      return load(path.extname(dependency) ? dependency : `${dependency}.ts`);
    }
    return require(specifier);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const est = load('src/utils/lycorisEstimation.ts');
const defs = load('src/data/lycorisDefinitions.ts');
const { useMachineStore: store, getMachineTotalGames } = load('src/stores/machineStore.ts');

let seq = 0;
const ev = (body) => ({ ...body, id: `e${seq++}`, timestamp: 1000 + seq });
const at = (game, overrides = {}) => ev({
  type: 'at',
  game,
  route: 'cz',
  shortCeiling: null,
  prologue: null,
  rush: null,
  outcome: null,
  episodes: [],
  endScreen: null,
  trophy: null,
  ...overrides,
});
const zone = (game, result) => ev({ type: 'koukaku-zone', game, result });
const cz = (game, trigger = 'zone') => ev({ type: 'cz', game, trigger });
const notice = (game, ceiling) => ev({ type: 'short-notice', game, ceiling });
const analyze = (events, overrides = {}) =>
  est.calculateLycorisAnalysis({
    events, bell: 0, weakLycoris: 0, weakLycorisKoukaku: 0, startGame: 0, currentGame: 0, ...overrides,
  });
const axisOf = (analysis, id) => analysis.axes.find((a) => a.id === id);
const near = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} と ${expected} が一致しない`);
const binom = (hit, total, p) => hit * Math.log(p) + (total - hit) * Math.log(1 - p);

beforeEach(() => {
  seq = 0;
  storage.clear();
  store.setState(store.getInitialState(), true);
  cloudRows.clear();
});

// ========================================
// 出典データの検算
// ========================================

test('短縮天井の内訳の和は公表の合算と丸め誤差の範囲で一致する', () => {
  for (let s = 0; s < 6; s++) {
    const sum = defs.LYCORIS_SHORT_CEILINGS.reduce((acc, c) => acc + defs.LYCORIS_SHORT_CEILING_RATE[c][s], 0);
    // 設定5だけ内訳 20.2% / 合算 20.3% と丸めで0.1ポイントずれる
    assert.ok(Math.abs(sum - defs.LYCORIS_SHORT_CEILING_TOTAL[s]) <= 0.0011, `設定${s + 1}: ${sum}`);
    assert.equal(defs.LYCORIS_SHORT_CEILING_RATE[750][s], 0.074, '750Gは全設定共通');
  }
});

test('設定差の表は6設定ぶんあり、高設定ほど有利な向きに並ぶ', () => {
  const tables = {
    bell: defs.LYCORIS_BELL_DENOM.map((d) => 1 / d),
    direct: defs.LYCORIS_DIRECT_DENOM.map((d) => 1 / d),
    weak: defs.LYCORIS_WEAK_KOUKAKU_RATE,
    z150: defs.LYCORIS_150_KOUKAKU_RATE,
  };
  for (const [name, values] of Object.entries(tables)) {
    assert.equal(values.length, 6, name);
    for (let s = 1; s < 6; s++) assert.ok(values[s] >= values[s - 1], `${name} 設定${s + 1}`);
  }
  // 設定1〜3が同値の要素
  assert.equal(defs.LYCORIS_BELL_DENOM[0], defs.LYCORIS_BELL_DENOM[2]);
  assert.equal(defs.LYCORIS_150_KOUKAKU_RATE[0], defs.LYCORIS_150_KOUKAKU_RATE[2]);
  assert.equal(defs.LYCORIS_BAND_VISIBILITY, 0.9);
});

test('濃厚の制約はすべて設定6を含む（制約どうしの矛盾は実データで起きない）', () => {
  const lists = [
    ...defs.LYCORIS_END_SCREENS.map((s) => s.allowedSettings),
    ...defs.LYCORIS_TROPHIES.map((t) => t.allowedSettings),
    defs.resolveLycorisEndScreen('takinaCasual', 'chisato', 'rush50-end').allowedSettings,
    defs.resolveLycorisEndScreen('chisatoCasual', 'takina', 'upper-cz-fail').allowedSettings,
  ].filter(Boolean);
  assert.ok(lists.length > 0);
  for (const list of lists) assert.ok(list.includes(6), JSON.stringify(list));
});

// ========================================
// サイクルと通常G数
// ========================================

test('ATでサイクルが切れ、1行目だけ打ち始めGから数える', () => {
  const events = [cz(30, 'stamp'), at(120), zone(150, 'moved')];
  const cycles = est.buildLycorisCycles(events, 20, 180);

  assert.equal(cycles.length, 2);
  assert.equal(cycles[0].startGame, 20);
  assert.equal(cycles[0].reachedGame, 120);
  assert.equal(cycles[0].normalGames, 100, '打ち始め前の20Gは数えない');
  assert.equal(cycles[0].previousAt, null);
  assert.equal(cycles[0].insertIndex, 1, '過去の行への追記はATの直前');

  assert.equal(cycles[1].startGame, 0);
  assert.equal(cycles[1].reachedGame, 180);
  assert.equal(cycles[1].normalGames, 180);
  assert.equal(cycles[1].previousAt.game, 120);
  assert.equal(cycles[1].active, true);
  assert.equal(cycles[1].insertIndex, 3);

  assert.equal(analyze(events, { startGame: 20, currentGame: 180 }).normalGames, 280);
});

test('到達Gは記録済みのG数を下回らない（現在Gの更新忘れで通常G数が減らない）', () => {
  const cycles = est.buildLycorisCycles([cz(200, 'other')], 0, 0);
  assert.equal(cycles[0].reachedGame, 200);
  assert.equal(cycles[0].normalGames, 200);
});

test('記録はG数順に並ぶ（同じGは記録順）', () => {
  const events = [cz(150, 'other'), cz(40, 'stamp'), zone(150, 'moved')];
  const cycles = est.buildLycorisCycles(events, 0, 0);
  assert.deepEqual(cycles[0].entries.map((e) => e.eventIndex), [1, 0, 2]);
});

test('1行目は打ち始めGより手前の列と0G列（引き戻し）を見ていない扱いにする', () => {
  const cell = (row, game) => row.cells.find((c) => c.game === game);
  // 300Gから座った。0〜250Gは自分で見ていない
  const [mid] = est.buildLycorisCycles([], 300, 320);
  for (const game of [0, 50, 100, 150, 250]) assert.equal(cell(mid, game).unreached, true, `${game}G`);
  assert.equal(cell(mid, 400).unreached, true, '320Gなので400Gは未到達');
  // 朝一から打っても1行目の0Gは直前のATが無いので引き戻しが起きない
  const [morning] = est.buildLycorisCycles([], 0, 200);
  assert.equal(cell(morning, 0).unreached, true);
  assert.equal(cell(morning, 50).unreached, false);
  // 2行目以降の0Gは、回し始めたら通過済み
  assert.equal(cell(est.buildLycorisCycles([at(100)], 0, 0)[1], 0).unreached, true, 'AT直後はまだ');
  assert.equal(cell(est.buildLycorisCycles([at(100)], 0, 5)[1], 0).unreached, false);
});

test('グリッドは規定G数の固定列と「他」列に分かれる', () => {
  const events = [cz(100), zone(150, 'moved'), cz(180, 'convert'), notice(200, 400), cz(250)];
  const [row] = est.buildLycorisCycles(events, 0, 300);
  assert.deepEqual(row.cells.map((c) => c.game), defs.LYCORIS_GRID_COLUMNS.map((c) => c.game));

  const cell = (game) => row.cells.find((c) => c.game === game);
  assert.equal(cell(100).czWon, true);
  assert.equal(cell(100).eventIndex, 0);
  assert.equal(cell(250).czWon, true);
  assert.equal(cell(400).czWon, false, '未到達のCZ列は空');
  assert.equal(cell(150).koukaku, 'moved');
  assert.equal(cell(50).koukaku, null, '高確列の空は「未入力」');
  assert.equal(cell(400).unreached, true);
  // 規定G数以外のCZと短縮告知は「他」列へ。規定G数のCZ・高確抽選は入らない
  assert.deepEqual(row.others.map((o) => o.eventIndex), [2, 3]);
});

test('打ち始めGより手前で締めても通常G数は負にならない', () => {
  const cycles = est.buildLycorisCycles([at(100)], 300, 0);
  assert.equal(cycles[0].normalGames, 0);
});

// ========================================
// 共通ベル・直撃
// ========================================

test('共通ベルは通常G数あたりの二項で尤度を取る', () => {
  const analysis = analyze([], { bell: 30, currentGame: 3000 });
  const bell = axisOf(analysis, 'bell');
  assert.equal(bell.usable, true);
  for (let s = 0; s < 6; s++) {
    near(bell.logLikelihoods[s], binom(30, 3000, 1 / defs.LYCORIS_BELL_DENOM[s]));
  }
});

test('ベルが多ければ高設定に、設定1〜3は同じ確率になる', () => {
  // 1/79.1 ちょうどの頻度。ベルの軸だけを見る
  // （全体の事後には「直撃が0回だった」という直撃の軸も入るので、設定1〜3が揃わない）
  const { posterior } = axisOf(analyze([], { bell: 120, currentGame: 9492 }), 'bell');
  assert.ok(posterior.setting6 > posterior.setting5);
  assert.ok(posterior.setting5 > posterior.setting4);
  near(posterior.setting1, posterior.setting3, 1e-9);
});

test('直撃が0回でも、通常G数が伸びれば高設定がわずかに下がる', () => {
  const direct = axisOf(analyze([], { currentGame: 6000 }), 'direct');
  assert.equal(direct.usable, true);
  assert.ok(direct.posterior.setting1 > direct.posterior.setting6);
});

test('通常G数が0、またはベルが通常G数を超えるときはベルの軸を使わない', () => {
  const none = axisOf(analyze([], { bell: 5 }), 'bell');
  assert.equal(none.usable, false);
  assert.ok(none.warning);

  const over = axisOf(analyze([], { bell: 50, currentGame: 10 }), 'bell');
  assert.equal(over.usable, false);
  assert.ok(over.warning.includes('超えて'));
});

test('直撃は route=direct のATだけを数える', () => {
  const events = [at(300, { route: 'direct' }), at(200), at(500, { route: 'at-ceiling' })];
  const direct = axisOf(analyze(events), 'direct');
  assert.equal(direct.hit, 1);
  assert.equal(direct.total, 1000);
  near(direct.logLikelihoods[5], binom(1, 1000, 1 / defs.LYCORIS_DIRECT_DENOM[5]));
});

// ========================================
// 変換高確移行
// ========================================

test('弱リコリス目の高確移行は2つのカウンターから、帯が出る割合0.9を掛けた率で尤度を取る', () => {
  // 規定G数の高確抽選（50G）は別物なので混ざらない
  const axis = axisOf(analyze([zone(50, 'moved')], { weakLycoris: 3, weakLycorisKoukaku: 1 }), 'koukakuWeak');
  assert.equal(axis.hit, 1);
  assert.equal(axis.total, 3);
  for (let s = 0; s < 6; s++) {
    near(axis.logLikelihoods[s], binom(1, 3, 0.9 * defs.LYCORIS_WEAK_KOUKAKU_RATE[s]));
  }
});

test('「→高確」が「弱リコ目」を超えたら数え間違いとして軸を使わない', () => {
  const axis = axisOf(analyze([], { weakLycoris: 2, weakLycorisKoukaku: 3 }), 'koukakuWeak');
  assert.equal(axis.usable, false);
  assert.ok(axis.warning.includes('超えて'));
});

test('150Gの高確移行は1行目を使わない（朝一は表示G数と内部G数がずれる）', () => {
  const events = [zone(150, 'moved'), zone(50, 'moved'), at(200), zone(150, 'stay'), zone(450, 'moved')];
  const axis = axisOf(analyze(events), 'koukaku150');
  assert.equal(axis.hit, 0);
  assert.equal(axis.total, 1, '2行目の150Gだけ。50G・450Gは設定差なし');
  assert.ok(axis.warning.includes('1行目'));
  for (let s = 0; s < 6; s++) {
    near(axis.logLikelihoods[s], binom(0, 1, 0.9 * defs.LYCORIS_150_KOUKAKU_RATE[s]));
  }
});

test('高確列の未入力は推定に入れない（通過しても「帯なし」扱いにしない）', () => {
  // 2行目で150Gを通過したが、帯の結果を押していない
  const axis = axisOf(analyze([at(100)], { currentGame: 300 }), 'koukaku150');
  assert.equal(axis.usable, false);
  assert.equal(axis.total, 0);
});

test('150Gは1サイクル1回の抽選なので、同じ行の重複記録は最後の1件だけ数える', () => {
  const events = [at(100), zone(150, 'moved'), zone(150, 'stay')];
  const axis = axisOf(analyze(events), 'koukaku150');
  assert.equal(axis.total, 1);
  assert.equal(axis.hit, 0, '後から記録した方（訂正）を採る');
});

test('高確移行の観測が無ければ軸は使わない', () => {
  const analysis = analyze([zone(150, 'unknown'), at(200), zone(150, 'unknown')]);
  assert.equal(axisOf(analysis, 'koukaku150').usable, false);
  assert.equal(axisOf(analysis, 'koukakuWeak').usable, false);
});

// ========================================
// 天井短縮
// ========================================

const rush50 = (game = 100) => at(game, { outcome: 'rush50-end' });
const rate = (c, s) => defs.LYCORIS_SHORT_CEILING_RATE[c][s];

test('天井短縮はラッシュ50終了の次のサイクルだけが対象', () => {
  const events = [
    at(100, { outcome: 'rush20-end' }),
    at(600, { route: 'at-ceiling' }), // 直前が駆け抜け＝対象外
    at(100, { outcome: 'upper-cz-fail' }),
    at(250, { route: 'short-ceiling', shortCeiling: 250 }), // 直前が上位CZ失敗＝対象外
  ];
  assert.equal(axisOf(analyze(events), 'shortCeiling').usable, false);
});

test('短縮告知・短縮天井での当選は短縮天井が確定する', () => {
  const events = [
    rush50(),
    notice(80, 400), at(150), // 告知を見たあと先にCZで当たっても 400 確定
    rush50(),
    at(600, { route: 'short-ceiling', shortCeiling: 600 }),
  ];
  const axis = axisOf(analyze(events), 'shortCeiling');
  // 1行目（ラッシュ50の当選サイクル）は直前が分からないので対象外
  assert.equal(axis.total, 2);
  assert.equal(axis.hit, 2);
  for (let s = 0; s < 6; s++) {
    near(axis.logLikelihoods[s], Math.log(rate(400, s)) + Math.log(rate(600, s)));
  }
});

test('AT間天井まで行けば短縮なしが確定する', () => {
  const axis = axisOf(analyze([rush50(), at(850, { route: 'at-ceiling' })]), 'shortCeiling');
  assert.equal(axis.hit, 0);
  assert.equal(axis.total, 1);
  for (let s = 0; s < 6; s++) {
    const shortened = [250, 400, 600, 750].reduce((sum, c) => sum + rate(c, s), 0);
    near(axis.logLikelihoods[s], Math.log(1 - shortened));
  }
});

test('CZ成功は「そのCZに入ったG」より手前の短縮天井を否定する（右側打ち切り）', () => {
  // 変換から320GでCZ → 340GでAT。250Gの短縮天井だけが否定される
  const events = [rush50(), cz(320, 'convert'), at(340)];
  const axis = axisOf(analyze(events), 'shortCeiling');
  assert.equal(axis.total, 1);
  for (let s = 0; s < 6; s++) near(axis.logLikelihoods[s], Math.log(1 - rate(250, s)));

  // 250Gゾーンから入ったCZは、短縮250Gの成功濃厚CZだった可能性を残す＝情報なし
  const atZone = axisOf(analyze([rush50(), cz(250), at(270)]), 'shortCeiling');
  assert.equal(atZone.usable, false);
});

test('直撃はAT当選Gで打ち切る', () => {
  const game = 400 + defs.LYCORIS_SHORT_CEILING_MARGIN + 20;
  const axis = axisOf(analyze([rush50(), at(game, { route: 'direct' })]), 'shortCeiling');
  for (let s = 0; s < 6; s++) near(axis.logLikelihoods[s], Math.log(1 - rate(250, s) - rate(400, s)));
});

test('短縮天井の「+α」の範囲で入ったCZは、その短縮天井を否定しない', () => {
  const margin = defs.LYCORIS_SHORT_CEILING_MARGIN;
  assert.ok(margin > 0);
  // 短縮250Gの前兆を経て262Gに入ったCZは、短縮250Gそのものだった可能性がある
  assert.equal(axisOf(analyze([rush50(), cz(262, 'other'), at(275)]), 'shortCeiling').usable, false);
  // CZを記録せずAT当選Gだけの場合も同じ余裕を持たせる
  assert.equal(axisOf(analyze([rush50(), at(275)]), 'shortCeiling').usable, false);
  // CZ間天井600G+αのCZは短縮600Gと位置が重なるので、600Gは否定しない
  const czCeiling = axisOf(analyze([rush50(), cz(612, 'cz-ceiling'), at(640)]), 'shortCeiling');
  for (let s = 0; s < 6; s++) near(czCeiling.logLikelihoods[s], Math.log(1 - rate(250, s) - rate(400, s)));
  // 余裕を超えて手前なら否定する
  const far = axisOf(analyze([rush50(), cz(250 + margin + 1, 'other'), at(400)]), 'shortCeiling');
  for (let s = 0; s < 6; s++) near(far.logLikelihoods[s], Math.log(1 - rate(250, s)));
});

test('進行中の行は告知が無ければ天井短縮に使わない', () => {
  assert.equal(axisOf(analyze([rush50()], { currentGame: 500 }), 'shortCeiling').usable, false);
  const withNotice = axisOf(analyze([rush50(), notice(60, 250)], { currentGame: 100 }), 'shortCeiling');
  assert.equal(withNotice.total, 1);
  assert.equal(withNotice.hit, 1);
});

// ========================================
// 濃厚示唆による制約
// ========================================

test('トロフィーと終了画面の「濃厚」は設定を除外する', () => {
  const gold = analyze([at(100, { trophy: 'gold' })]);
  assert.deepEqual(gold.excludedSettings, [1, 2, 3]);
  assert.equal(gold.setting.setting1, 0);

  const hawaii = analyze([at(100, { endScreen: 'hawaii' }), at(100, { trophy: 'bronze' })]);
  assert.deepEqual(hawaii.excludedSettings, [1, 2, 3, 4, 5]);
  near(hawaii.setting.setting6, 100);
  assert.equal(hawaii.settingConflict, false);
});

test('私服は「キャラと終わったラッシュが逆」のときだけ設定4以上濃厚', () => {
  const excluded = (overrides) => analyze([at(100, overrides)]).excludedSettings;
  assert.deepEqual(excluded({ endScreen: 'takinaCasual', rush: 'chisato', outcome: 'rush50-end' }), [1, 2, 3]);
  assert.deepEqual(excluded({ endScreen: 'chisatoCasual', rush: 'takina', outcome: 'rush20-end' }), [1, 2, 3]);
  assert.deepEqual(excluded({ endScreen: 'takinaCasual', rush: 'takina', outcome: 'rush50-end' }), [], '同じキャラは弱示唆');
  assert.deepEqual(excluded({ endScreen: 'takinaCasual', rush: 'chisato', outcome: 'rush-w-end' }), [], 'ラッシュW終了は弱示唆');
  assert.deepEqual(excluded({ endScreen: 'takinaCasual', rush: null, outcome: 'rush50-end' }), [], 'ラッシュ種別が未入力なら判定しない');
  assert.deepEqual(excluded({ endScreen: 'chisatoCasual', rush: 'takina', outcome: null }), [], '終わり方が未入力なら判定しない');
});

test('ドレスコード・プロローグ・エピソードボーナスは事後確率に入れない', () => {
  const withHints = analyze([
    at(100, { endScreen: 'dressCode', prologue: 'ep4', episodes: ['rush-ep4', 'w-ep4'] }),
  ]);
  const without = analyze([at(100)]);
  assert.deepEqual(withHints.excludedSettings, []);
  assert.deepEqual(withHints.setting, without.setting);
});

// ========================================
// 示唆の集計
// ========================================

test('エピソードボーナスのEP3は同じラッシュ内の1回目だけ示唆として数える', () => {
  const hints = analyze([
    at(100, { episodes: ['rush-ep1', 'rush-ep3', 'w-ep3'] }),
    at(100, { episodes: ['rush-ep3'] }),
  ]).hints;
  const byKey = Object.fromEntries(hints.map((h) => [h.key, h]));
  assert.equal(byKey['episode:rush-ep3'].count, 1, '2行目の1回目は有効');
  assert.deepEqual(byKey['episode:rush-ep3'].cycles, [2]);
  assert.equal(byKey['episode:rush-ep3:late'].count, 1, '1行目は2回目の選択なので無効');
  assert.equal(byKey['episode:rush-ep3:late'].strength, 'none');
  assert.equal(byKey['episode:w-ep3'].count, 1, 'ラッシュWは別の数え方（W内の1回目）');
});

test('私服はラッシュW終了ならラッシュ種別が無くても弱示唆で、通常ラッシュ終了とは別の行になる', () => {
  const resolve = defs.resolveLycorisEndScreen;
  assert.equal(resolve('takinaCasual', null, 'rush-w-end').strength, 'weak');
  assert.notEqual(resolve('takinaCasual', null, 'rush-w-end').key, resolve('takinaCasual', null, 'rush50-end').key);
  assert.notEqual(
    resolve('takinaCasual', 'takina', 'rush50-end').key,
    resolve('takinaCasual', 'takina', 'rush-w-end').key
  );
  const hints = analyze([
    at(100, { endScreen: 'takinaCasual', rush: 'takina', outcome: 'rush50-end' }),
    at(100, { endScreen: 'takinaCasual', rush: 'takina', outcome: 'rush-w-end' }),
  ]).hints;
  assert.equal(hints.length, 2);
});

test('同じ示唆が大量にあっても集計は線形時間で終わる', () => {
  const episodes = new Array(40000).fill('rush-ep1');
  const started = Date.now();
  const hints = analyze([at(100, { episodes })]).hints;
  assert.equal(hints[0].count, 40000);
  assert.ok(Date.now() - started < 1000, `${Date.now() - started}ms`);
});

test('示唆はカタログ順に並び、私服はラッシュ種別で行が分かれる', () => {
  const hints = analyze([
    at(100, { trophy: 'silver' }),
    at(100, { prologue: 'ep3', endScreen: 'chisatoCasual', rush: 'takina', outcome: 'rush50-end' }),
    at(100, { endScreen: 'chisatoCasual', rush: 'chisato', outcome: 'rush50-end' }),
  ]).hints;
  assert.deepEqual(hints.map((h) => h.category), ['prologue', 'endScreen', 'endScreen', 'trophy']);
  const casual = hints.filter((h) => h.category === 'endScreen');
  assert.deepEqual(casual.map((h) => h.strength), ['weak', 'constraint']);
});

// ========================================
// 参考値
// ========================================

test('参考値はAT初当り・CZ・帯の出現率を数える', () => {
  const events = [
    cz(20, 'convert'),
    zone(50, 'stay'),
    zone(150, 'moved'), // 設定差のある150Gは帯の確認には使わない
    cz(250),
    at(270),
    zone(50, 'unknown'), // 判別不能は数えない
    zone(450, 'moved'),
  ];
  const reference = Object.fromEntries(analyze(events, { currentGame: 460 }).reference.map((r) => [r.id, r]));
  assert.equal(reference.at.hit, 1);
  assert.equal(reference.at.total, 730);
  assert.equal(reference.cz.hit, 2, '変換からのCZと規定G数のCZ');
  assert.equal(reference.band.hit, 1);
  assert.equal(reference.band.total, 2, '1行目の50Gと2行目の450G');
});

// ========================================
// ストアと保存
// ========================================

test('リコリスの台を作って3つのカウンターを独立に増減できる', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  const machine = s().getCurrentMachine();
  assert.equal(machine.machineType, 'lycoris-recoil');
  assert.deepEqual(machine.events, []);
  assert.deepEqual([machine.bell, machine.weakLycoris, machine.weakLycorisKoukaku], [0, 0, 0]);

  s().incrementLycorisCounter('bell');
  s().incrementLycorisCounter('bell');
  // 弱リコ目を2回引き、あとから帯が1回出た。弱リコ目と→高確は互いに触らない
  s().incrementLycorisCounter('weakLycoris');
  s().incrementLycorisCounter('weakLycoris');
  s().incrementLycorisCounter('weakLycorisKoukaku');
  s().decrementLycorisCounter('bell');
  const m = s().getCurrentMachine();
  assert.deepEqual([m.bell, m.weakLycoris, m.weakLycorisKoukaku], [1, 2, 1]);

  s().decrementLycorisCounter('weakLycorisKoukaku');
  s().decrementLycorisCounter('weakLycorisKoukaku');
  assert.equal(s().getCurrentMachine().weakLycorisKoukaku, 0, '0未満にならない');
  assert.equal(s().getCurrentMachine().weakLycoris, 2, '→高確を減らしても弱リコ目は動かない');

  const axis = axisOf(est.calculateLycorisAnalysis(s().getCurrentMachine()), 'koukakuWeak');
  assert.equal(axis.total, 2);
});

test('記録を足すと到達Gが伸び、AT当選で現在Gが0に戻る', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  const reached = () => est.calculateLycorisAnalysis(s().getCurrentMachine()).cycles.at(-1).reachedGame;
  s().updateLycorisCurrentGame(80);
  s().addLycorisEvent({ type: 'cz', game: 140, trigger: 'stamp' });
  assert.equal(reached(), 140, '到達Gは記録から導く');
  s().addLycorisEvent({ type: 'koukaku-zone', game: 50, result: 'stay' });
  assert.equal(reached(), 140, '手前のGの記録では戻らない');

  s().addLycorisEvent({
    type: 'at', game: 260, route: 'cz', shortCeiling: null, prologue: 'ep1',
    rush: null, outcome: null, episodes: [], endScreen: null, trophy: null,
  });
  const machine = s().getCurrentMachine();
  assert.equal(machine.currentGame, 0);
  assert.equal(machine.events.length, 3);
  assert.ok(typeof machine.events[0].id === 'string');
});

test('誤って記録したマスを消すと到達Gも元に戻る（ベル・直撃の分母を増やしたままにしない）', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  const cycle = () => est.calculateLycorisAnalysis(s().getCurrentMachine()).cycles.at(-1);
  s().updateLycorisCurrentGame(120);
  s().addLycorisEvent({ type: 'koukaku-zone', game: 450, result: 'stay' });
  assert.equal(cycle().reachedGame, 450);
  s().deleteLycorisEventAt(0);
  assert.equal(cycle().reachedGame, 120);
  assert.equal(cycle().normalGames, 120);
});

test('形の合わない入力は記録しない', () => {
  store.getState().addMachine('lycoris-recoil');
  store.getState().addLycorisEvent({ type: 'rare', game: 10, role: 'cherry', koukaku: 'stay' });
  store.getState().addLycorisEvent({ type: 'koukaku-zone', game: 200, result: 'stay' });
  store.getState().addLycorisEvent({ type: 'koukaku-zone', game: 650, result: 'stay' });
  store.getState().addLycorisEvent({ type: 'cz', game: 5000, trigger: 'zone' });
  assert.deepEqual(store.getState().getCurrentMachine().events, []);
});

test('過去のサイクルへの追記・訂正・削除は添字で効き、現在Gを動かさない', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  s().addLycorisEvent({
    type: 'at', game: 300, route: 'cz', shortCeiling: null, prologue: null,
    rush: null, outcome: null, episodes: [], endScreen: null, trophy: null,
  });
  s().updateLycorisCurrentGame(90);

  s().insertLycorisEventAt(0, { type: 'koukaku-zone', game: 150, result: 'moved' });
  assert.deepEqual(s().getCurrentMachine().events.map((e) => e.type), ['koukaku-zone', 'at']);
  assert.equal(s().getCurrentMachine().currentGame, 90);

  const before = s().getCurrentMachine().events[1];
  s().updateLycorisEventAt(1, { ...before, outcome: 'rush50-end', trophy: 'gold' });
  const after = s().getCurrentMachine().events[1];
  assert.equal(after.trophy, 'gold');
  assert.equal(after.id, before.id, 'idと時刻は保つ');
  assert.equal(s().getCurrentMachine().currentGame, 90);

  s().deleteLycorisEventAt(0);
  assert.deepEqual(s().getCurrentMachine().events.map((e) => e.type), ['at']);
});

test('打ち始めGは1行目が進行中のときだけ現在Gを引き上げる', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  s().updateLycorisStartGame(320);
  assert.equal(s().getCurrentMachine().startGame, 320);
  assert.equal(s().getCurrentMachine().currentGame, 320);

  s().addLycorisEvent({
    type: 'at', game: 400, route: 'cz', shortCeiling: null, prologue: null,
    rush: null, outcome: null, episodes: [], endScreen: null, trophy: null,
  });
  s().updateLycorisStartGame(350);
  assert.equal(s().getCurrentMachine().currentGame, 0, '2行目に入ったあとは触らない');
});

test('打ち始めGを下げる訂正では、まだ回していない現在Gも一緒に下がる', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  s().updateLycorisStartGame(320);
  s().updateLycorisStartGame(32);
  assert.equal(s().getCurrentMachine().currentGame, 32, '誤入力の288Gを通常G数に入れない');
  // 回し進めたあとの訂正では現在Gを動かさない
  s().updateLycorisCurrentGame(100);
  s().updateLycorisStartGame(20);
  assert.equal(s().getCurrentMachine().currentGame, 100);
});

test('最後のATを取り消すと、その行の到達Gが現在Gに戻る', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  s().updateLycorisCurrentGame(268);
  s().addLycorisEvent({
    type: 'at', game: 268, route: 'cz', shortCeiling: null, prologue: null,
    rush: null, outcome: null, episodes: [], endScreen: null, trophy: null,
  });
  assert.equal(s().getCurrentMachine().currentGame, 0);
  s().deleteLycorisEventAt(0);
  assert.equal(s().getCurrentMachine().currentGame, 268);
});

test('リセットで記録・カウンター・G数が消える', () => {
  store.getState().addMachine('lycoris-recoil');
  const s = () => store.getState();
  s().incrementLycorisCounter('bell');
  s().incrementLycorisCounter('weakLycoris');
  s().incrementLycorisCounter('weakLycorisKoukaku');
  s().updateLycorisStartGame(100);
  s().addLycorisEvent({ type: 'cz', game: 250, trigger: 'zone' });
  s().resetLycorisMachine();
  const m = s().getCurrentMachine();
  assert.deepEqual(
    [m.bell, m.weakLycoris, m.weakLycorisKoukaku, m.startGame, m.currentGame, m.events.length],
    [0, 0, 0, 0, 0, 0]
  );
});

test('getMachineTotalGames はリコリスの現在Gを返さない', () => {
  store.getState().addMachine('lycoris-recoil');
  store.getState().updateLycorisCurrentGame(250);
  assert.equal(getMachineTotalGames(store.getState().getCurrentMachine()), 0);
});

test('壊れたイベントは読み込み時に落とし、ATは任意項目だけ直して残す', () => {
  const events = defs.normalizeLycorisEvents([
    { id: 'a', timestamp: 1, type: 'koukaku-zone', game: 150, result: 'stay' },
    { id: 'b', timestamp: 2, type: 'koukaku-zone', game: 150, result: 'maybe' },
    { id: 'b2', timestamp: 2, type: 'koukaku-zone', game: 650, result: 'stay' }, // 列にしていないG数
    { id: 'b3', timestamp: 2, type: 'cz', game: 30, trigger: 'convert' },
    { id: 'b4', timestamp: 2, type: 'cz', game: 30, trigger: 'lever' },
    { id: 'c', timestamp: 3, type: 'koukaku-zone', game: 100, result: 'moved' },
    { id: 'd', timestamp: 4, type: 'cz', game: -1, trigger: 'zone' },
    { id: 'e', timestamp: 5, type: 'unknown', game: 1 },
    { timestamp: 6, type: 'cz', game: 100, trigger: 'zone' },
    {
      id: 'g', timestamp: 7, type: 'at', game: 300, route: 'cz',
      trophy: 'platinum', episodes: ['rush-ep1', 'bogus'], rush: 'kurumi',
    },
  ]);
  assert.deepEqual(events.map((e) => e.id), ['a', 'b3', 'g']);
  const atEvent = events[2];
  assert.equal(atEvent.trophy, null);
  assert.equal(atEvent.rush, null);
  assert.equal(atEvent.outcome, null);
  assert.deepEqual(atEvent.episodes, ['rush-ep1']);
  assert.deepEqual(defs.normalizeLycorisEvents(null), []);
});

test('G数は0〜上限の整数だけを受け付け、規定G数契機のCZは規定G数でなければ落とす', () => {
  const events = defs.normalizeLycorisEvents([
    { id: 'a', timestamp: 1, type: 'cz', game: 12.5, trigger: 'other' },
    { id: 'b', timestamp: 2, type: 'cz', game: 130, trigger: 'zone' },
    { id: 'c', timestamp: 3, type: 'cz', game: 250, trigger: 'zone' },
  ]);
  assert.deepEqual(events.map((e) => e.id), ['c']);
  assert.equal(defs.normalizeLycorisGame(2147483647), defs.LYCORIS_MAX_GAME);
  assert.equal(defs.normalizeLycorisGame(-5), 0);
  assert.equal(defs.normalizeLycorisGame('100'), 0);
});

test('localStorage の古い・壊れたリコリス台は読み込み時に直す', () => {
  const { STORE_VERSION } = load('src/stores/machineStore.ts');
  const persisted = {
    machines: [
      { id: 'm1', machineType: 'lycoris-recoil', name: '台1', createdAt: 1, updatedAt: 1,
        events: [{ id: 'x', timestamp: 1, type: 'at', game: 100, route: 'cz' }] },
      { id: 'm2', machineType: 'lycoris-recoil', name: '台2', createdAt: 1, updatedAt: 1, currentGame: 99999 },
    ],
  };
  const migrated = store.persist.getOptions().migrate(structuredClone(persisted), STORE_VERSION - 1);
  const [first, second] = migrated.machines;
  assert.deepEqual(first.events[0].episodes, [], '欠けた任意項目を補う');
  assert.deepEqual([first.bell, first.weakLycoris, first.weakLycorisKoukaku], [0, 0, 0]);
  assert.deepEqual(second.events, [], 'events が無ければ空配列');
  assert.equal(second.currentGame, defs.LYCORIS_MAX_GAME);
  // 補正後の台で推定が例外を出さない
  est.calculateLycorisAnalysis(first);
});

test('v14 で保存された古い形のリコリス台（弱リコ目カウンター無し）も読み込み時に直す', () => {
  const { STORE_VERSION } = load('src/stores/machineStore.ts');
  assert.ok(STORE_VERSION >= 15);
  const persisted = {
    machines: [{
      id: 'm1', machineType: 'lycoris-recoil', name: '台1', createdAt: 1, updatedAt: 1,
      bell: 9, startGame: 0, currentGame: 900,
      // 旧入力方式のレア役イベントと、廃止した650Gの高確記録
      events: [
        { id: 'r', timestamp: 1, type: 'rare', game: 10, role: 'cherry', convert: 'none', koukaku: 'stay' },
        { id: 'z', timestamp: 2, type: 'koukaku-zone', game: 650, result: 'stay' },
      ],
    }],
  };
  const [machine] = store.persist.getOptions().migrate(structuredClone(persisted), 14).machines;
  assert.deepEqual([machine.weakLycoris, machine.weakLycorisKoukaku], [0, 0]);
  assert.deepEqual(machine.events, []);
  // 欠けたカウンターで推定全体が NaN → 均等に化けないこと
  const { setting } = est.calculateLycorisAnalysis(machine);
  assert.ok(Object.values(setting).every(Number.isFinite));
  assert.ok(setting.setting1 > setting.setting6, 'ベル1/100は低設定寄り');
});

test('クラウドの状態行の取得に失敗したら、空の台で置き換えずに失敗させる', async () => {
  const realSync = load('src/lib/supabaseSync.ts');
  cloudRows.set('machines', [{
    id: '55555555-5555-4555-8555-555555555555',
    machine_type: 'lycoris-recoil',
    name: '台3',
    number: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);
  const original = cloud.from;
  cloud.from = (table) => table === 'lycoris_state'
    ? { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: '08006', message: 'network' } }) }) }) }
    : original(table);
  try {
    await assert.rejects(realSync.loadAllMachines());
  } finally {
    cloud.from = original;
  }
});

test('クラウドへ往復しても記録が保たれる', async () => {
  const realSync = load('src/lib/supabaseSync.ts');
  const machine = {
    id: '33333333-3333-4333-8333-333333333333',
    machineType: 'lycoris-recoil',
    name: '台1',
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bell: 42,
    weakLycoris: 9,
    weakLycorisKoukaku: 3,
    startGame: 120,
    currentGame: 210,
    events: [
      { id: 'a', timestamp: 1, type: 'koukaku-zone', game: 150, result: 'moved' },
      {
        id: 'b', timestamp: 2, type: 'at', game: 180, route: 'cz', shortCeiling: null, prologue: 'ep3',
        rush: 'takina', outcome: 'rush50-end', episodes: ['rush-ep3'], endScreen: 'robota', trophy: 'gold',
      },
    ],
  };
  await realSync.upsertMachine(machine);
  const loaded = await realSync.loadAllMachines();
  const restored = loaded.find((m) => m.id === machine.id);

  assert.equal(restored.machineType, 'lycoris-recoil');
  assert.equal(restored.bell, 42);
  assert.deepEqual([restored.weakLycoris, restored.weakLycorisKoukaku], [9, 3]);
  assert.equal(restored.startGame, 120);
  assert.equal(restored.currentGame, 210);
  assert.deepEqual(restored.events, machine.events);
});

test('状態行が無くても読み込みは既定値で通る', async () => {
  const realSync = load('src/lib/supabaseSync.ts');
  cloudRows.set('machines', [{
    id: '44444444-4444-4444-8444-444444444444',
    machine_type: 'lycoris-recoil',
    name: '台2',
    number: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);
  const loaded = await realSync.loadAllMachines();
  const restored = loaded.find((m) => m.machineType === 'lycoris-recoil');
  assert.deepEqual(
    [restored.bell, restored.weakLycoris, restored.weakLycorisKoukaku, restored.startGame, restored.currentGame, restored.events],
    [0, 0, 0, 0, 0, []]
  );
});
