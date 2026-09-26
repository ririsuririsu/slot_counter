// 実ソースをメモリ上で変換して検証する。外部通信・実ユーザーの保存データには触れない。
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const storage = new Map();
const remoteCalls = [];
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
  get: (_, operation) => (...args) => {
    remoteCalls.push({ operation, args: structuredClone(args) });
    return Promise.resolve(null);
  },
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

const est = load('src/utils/kokakuEstimation.ts');
const defs = load('src/data/kokakuDefinitions.ts');
const { useMachineStore: store } = load('src/stores/machineStore.ts');

let seq = 0;
const ev = (body) => ({ ...body, id: `e${seq++}`, timestamp: 1000 + seq });
const zone = (game, overrides = {}) => ev({ type: 'zone', game, color: null, czWon: false, ...overrides });
const czFail = (endGame) => ev({
  type: 'cycle-end',
  cz: { czType: 'sam', success: false, visualHack: false },
  at: null,
  endGame,
});
const czWin = (endGame) => ev({
  type: 'cycle-end',
  cz: { czType: 'sam', success: true, visualHack: null },
  at: 'cz',
  endGame,
});

beforeEach(() => {
  seq = 0;
  storage.clear();
  store.setState(store.getInitialState(), true);
  remoteCalls.length = 0;
  cloudRows.clear();
});

// ========================================
// 出典データの検算
// ========================================

test('CZ後のモード移行率は全設定で合計100%になる', () => {
  for (let s = 0; s < 6; s++) {
    const total = ['normalA', 'normalB', 'normalC', 'normalD']
      .reduce((sum, m) => sum + defs.KOKAKU_CZ_TRANSITION[m][s], 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `設定${s + 1} の合計が ${total}`);
    assert.equal(defs.KOKAKU_CZ_TRANSITION.reset[s], 0, 'リセットは遷移先にならない');
  }
});

test('AT後の振り分けは合計100%で、リセットを含まない', () => {
  const total = defs.KOKAKU_MODES.reduce((sum, m) => sum + defs.KOKAKU_AT_TRANSITION[m], 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.equal(defs.KOKAKU_AT_TRANSITION.reset, 0);
});

test('期待度マップはCZ天井を超えるゲーム数を持たない', () => {
  for (const mode of defs.KOKAKU_MODES) {
    for (const key of Object.keys(defs.KOKAKU_ZONE_RATE[mode])) {
      assert.ok(Number(key) < defs.KOKAKU_CZ_CEILING[mode],
        `${mode} の ${key}G が天井 ${defs.KOKAKU_CZ_CEILING[mode]} 以上`);
    }
  }
});

// ========================================
// グリッドの組み立て
// ========================================

test('固定列のグリッドは未到達と非当選を区別する', () => {
  const events = [zone(50, { color: 'blue' })];
  const [row] = est.buildKokakuGrid(events, 120);

  const at50 = row.cells.find((c) => c.game === 50);
  const at100 = row.cells.find((c) => c.game === 100);
  const at150 = row.cells.find((c) => c.game === 150);

  assert.equal(at50.occurred, true);
  assert.equal(at50.color, 'blue');
  assert.equal(at100.occurred, false, '通過したが非当選');
  assert.equal(at100.unreached, false);
  assert.equal(at150.unreached, true, '未到達');
  assert.equal(row.reachedGame, 120);
});

test('到達Gは記録済みゾーンを下回らない（現在Gの更新忘れで入力が消えない）', () => {
  const [row] = est.buildKokakuGrid([zone(350)], 0);
  assert.equal(row.reachedGame, 350);
  assert.equal(row.cells.find((c) => c.game === 350).unreached, false);
});

test('cycle-end で行が締まり、次の行が始まる', () => {
  const events = [zone(50, { czWon: true }), czFail(50), zone(100)];
  const rows = est.buildKokakuGrid(events, 120);

  assert.equal(rows.length, 2, '締めた1行 + 進行中の1行');
  assert.equal(rows[0].end.cz.success, false);
  assert.equal(rows[0].reachedGame, 50);
  assert.equal(rows[1].active, true);
  assert.equal(rows[1].cells.find((c) => c.game === 100).occurred, true);
});

test('リセット回は既定で1行目のみ。cycle-start で切り替わる', () => {
  const rows = est.buildKokakuGrid([zone(50), czFail(100), zone(50)], 60);
  assert.equal(rows[0].isReset, true);
  assert.equal(rows[1].isReset, false);

  const withOverride = est.buildKokakuGrid(
    [zone(50), czFail(100), ev({ type: 'cycle-start', reset: true }), zone(50)],
    60
  );
  assert.equal(withOverride[1].isReset, true);
});

// ========================================
// 出力確率
// ========================================

test('50Gの非当選は通常Dを完全に否定する', () => {
  const [row] = est.buildKokakuGrid([], 60);
  assert.equal(est.cycleEmission('normalD', row), 0);
  assert.ok(est.cycleEmission('normalA', row) > 0);
});

test('50Gの当選確率はマップどおり', () => {
  const [row] = est.buildKokakuGrid([zone(50)], 50);
  assert.ok(Math.abs(est.cycleEmission('normalD', row) - 1.0) < 1e-9);
  assert.ok(Math.abs(est.cycleEmission('normalA', row) - 0.25) < 1e-9);
  assert.ok(Math.abs(est.cycleEmission('normalB', row) - 0.5) < 1e-9);
});

test('CZ天井を超えて未当選ならそのモードは尤度0', () => {
  const [row] = est.buildKokakuGrid([zone(50)], 300);
  assert.equal(est.cycleEmission('normalC', row), 0, '通常Cは250G天井');
  assert.equal(est.cycleEmission('normalD', row), 0, '通常Dは150G天井');
  assert.ok(est.cycleEmission('normalA', row) > 0);
  assert.ok(est.cycleEmission('reset', row) > 0, 'リセットは350G天井なのでまだ生きている');

  const [deep] = est.buildKokakuGrid([zone(50)], 500);
  assert.equal(est.cycleEmission('reset', deep), 0);
  assert.equal(est.cycleEmission('normalB', deep), 0, '通常Bは450G天井');
  assert.ok(est.cycleEmission('normalA', deep) > 0, '通常Aだけが残る');
});

test('殲滅ポイント契機のゾーンのG数が到達Gに効く', () => {
  // G数ゾーンには一度も行かず、220Gでpt契機だけ引いたサイクル。
  // pt契機がG数を持たないと到達Gが0のままになり、観測が丸ごと消えてモードが割れない。
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    ev({ type: 'zone-point', game: 220, color: 'red', czWon: true }),
  ];
  const [row] = est.buildKokakuGrid(events, 0);
  assert.equal(row.reachedGame, 220);

  // 50/100/150G は「行かなかった」として観測に入る
  assert.equal(row.cells.find((c) => c.game === 50).unreached, false);
  assert.equal(row.cells.find((c) => c.game === 150).unreached, false);
  assert.equal(row.cells.find((c) => c.game === 250).unreached, true);

  // 220G > 通常Dの天井150 なので通常Dは消え、50G素通りでさらに否定される
  assert.equal(est.cycleEmission('normalD', row), 0);
  const [posterior] = est.calculateKokakuModePosteriors(
    est.buildKokakuGrid(events, 0),
    new Array(6).fill(1 / 6)
  );
  assert.equal(posterior.prior, false, '観測ありとして扱われる');
  assert.equal(posterior.distribution.normalD, 0);
  // 通常Cの天井は250Gなので220Gではまだ生きている。
  // 通常AとCは250Gまで期待度が同一なので、この時点では同じ確率になる
  assert.ok(posterior.distribution.normalC > 0);
  assert.ok(
    Math.abs(posterior.distribution.normalA - posterior.distribution.normalC) < 1e-9,
    '通常AとCは250Gまで分離できない'
  );
});

test('G数未入力のpt契機は到達Gを動かさない（旧データ互換）', () => {
  const [row] = est.buildKokakuGrid(
    [ev({ type: 'zone-point', game: null, color: 'red', czWon: true })],
    0
  );
  assert.equal(row.reachedGame, 0);
  assert.equal(row.pointCells[0].game, null);

  // game を持たない旧形式もそのまま読める
  const restored = defs.normalizeKokakuEvents([
    { id: 'a', timestamp: 1, type: 'zone-point', color: 'red', czWon: true },
  ]);
  assert.equal(restored.length, 1);
  assert.equal(est.buildKokakuGrid(restored, 0)[0].pointCells[0].game, null);
});

test('セルのタップで「行かなかった」を記録すると手前もまとめて観測になる', () => {
  // 進行中の行は currentGame が到達Gの実体。250Gを「行かなかった」にする＝250Gまで到達
  const events = [ev({ type: 'cycle-start', reset: false })];
  const [row] = est.buildKokakuGrid(events, 250);

  for (const g of [50, 100, 150, 250]) {
    assert.equal(row.cells.find((c) => c.game === g).unreached, false, `${g}Gが観測に入る`);
  }
  assert.equal(row.cells.find((c) => c.game === 300).unreached, true);

  // 250Gまで未当選 → 通常C(250天井)・通常D(150天井) は残るが50G素通りでDは消える
  assert.equal(est.cycleEmission('normalD', row), 0, '50G素通りで通常Dは否定');
  assert.ok(est.cycleEmission('normalA', row) > 0);
});

test('タチコマSAMゾーンと殲滅ポイント契機はモード尤度に影響しない', () => {
  const base = est.buildKokakuGrid([zone(50)], 250)[0];
  const withExtras = est.buildKokakuGrid(
    [
      zone(50),
      ev({ type: 'tachikoma-zone', game: 200, czWon: true }),
      ev({ type: 'zone-point', color: 'gold', czWon: true }),
    ],
    250
  )[0];

  for (const mode of defs.KOKAKU_MODES) {
    assert.ok(
      Math.abs(est.cycleEmission(mode, base) - est.cycleEmission(mode, withExtras)) < 1e-12,
      `${mode} の尤度が変わっている`
    );
  }
});

test('抽選なしのゲーム数で殲滅ZONEが出たら、そのモードは説明できない', () => {
  // 300G は通常Bだけ 1.3%。リセット・通常Aは「抽選なし」
  const [row] = est.buildKokakuGrid([zone(300)], 300);
  assert.equal(est.cycleEmission('reset', row), 0);
  assert.equal(est.cycleEmission('normalA', row), 0);
  assert.ok(est.cycleEmission('normalB', row) > 0);
});

test('色はモード尤度に影響しない（色は撃破ptで決まるため）', () => {
  const plain = est.buildKokakuGrid([zone(50)], 100)[0];
  const colored = est.buildKokakuGrid([zone(50, { color: 'rainbow', czWon: true })], 100)[0];
  for (const mode of defs.KOKAKU_MODES) {
    assert.ok(Math.abs(est.cycleEmission(mode, plain) - est.cycleEmission(mode, colored)) < 1e-12);
  }
});

// ========================================
// 画面の「濃厚」制約
// ========================================

test('アオイ（金枠）はモードDに固定し、設定1〜3を除外する', () => {
  const [row] = est.buildKokakuGrid(
    [zone(50), ev({ type: 'screen', occasion: 'ura', screen: 'aoi' })],
    100
  );
  assert.deepEqual(est.allowedModesFromScreens(row), ['reset', 'normalD']);
  assert.equal(est.cycleEmission('normalA', row), 0);
  assert.ok(est.cycleEmission('normalD', row) > 0);

  const analysis = est.calculateKokakuAnalysis(
    [zone(50), ev({ type: 'screen', occasion: 'ura', screen: 'aoi' })],
    100
  );
  assert.deepEqual(analysis.excludedSettings, [1, 2, 3]);
  assert.equal(analysis.setting.setting1, 0);
  assert.equal(analysis.setting.setting2, 0);
  assert.equal(analysis.setting.setting3, 0);
  assert.ok(analysis.setting.setting6 > 0);
});

test('画面カタログは2系統に分かれ、同名キャラでもidが別', () => {
  const window = defs.KOKAKU_WINDOW_SCREENS.map((s) => s.id);
  const czEnd = defs.KOKAKU_CZ_END_SCREENS.map((s) => s.id);

  assert.ok(window.includes('togusa') && czEnd.includes('czTogusa'), 'トグサは系統ごとに別id');
  assert.equal(
    defs.findKokakuScreen('togusa').settingHint,
    '奇数設定示唆',
    'ウインドウのトグサは奇数示唆'
  );
  assert.equal(
    defs.findKokakuScreen('czTogusa').settingHint,
    '高設定示唆（弱）',
    'CZ終了のトグサは高設定示唆（弱）'
  );

  // idの重複が無いこと
  const all = defs.KOKAKU_SCREENS.map((s) => s.id);
  assert.equal(new Set(all).size, all.length);
  // context はカタログと一致していること
  for (const s of defs.KOKAKU_WINDOW_SCREENS) assert.equal(s.context, 'window');
  for (const s of defs.KOKAKU_CZ_END_SCREENS) assert.equal(s.context, 'cz-end');
  // CZ終了画面にモード示唆は無い
  for (const s of defs.KOKAKU_CZ_END_SCREENS) assert.equal(s.allowedModes, null);
});

test('CZ終了画面の設定示唆が制約として効く', () => {
  const screen = (id) => ev({ type: 'screen', occasion: 'cz-end', screen: id });

  // 全員集合＝設定6濃厚
  const only6 = est.calculateKokakuAnalysis([screen('czAllStars')], 0);
  assert.deepEqual(only6.excludedSettings, [1, 2, 3, 4, 5]);
  assert.ok(Math.abs(only6.setting.setting6 - 100) < 1e-9);

  // 素子＝設定1・4・5・6濃厚。飛び飛びの制約（設定2・3だけを否定）
  const motoko = est.calculateKokakuAnalysis([screen('czMotoko')], 0);
  assert.deepEqual(motoko.excludedSettings, [2, 3]);
  assert.equal(motoko.setting.setting2, 0);
  assert.equal(motoko.setting.setting3, 0);
  assert.ok(motoko.setting.setting1 > 0 && motoko.setting.setting4 > 0);

  // 青空＋公安9課（設定2以上）と 素子（1・4・5・6）の積集合は 4・5・6
  const both = est.calculateKokakuAnalysis([screen('czSkyKoan9'), screen('czMotoko')], 0);
  assert.deepEqual(both.excludedSettings, [1, 2, 3]);
  assert.equal(both.settingConflict, false);
});

test('設定示唆はすべて設定6を含む＝実データでは矛盾しない', () => {
  // どの画面も設定6を否定しないので、現在のカタログでは積集合が空にならない。
  // 将来この性質が崩れる画面を足したら settingConflict の経路が実際に届くようになる。
  const sets = defs.KOKAKU_SCREENS.filter((s) => s.allowedSettings).map((s) => s.allowedSettings);
  assert.ok(sets.length > 0);
  for (const set of sets) {
    assert.ok(set.includes(6), `設定6を含まない制約がある: ${JSON.stringify(set)}`);
  }

  // 全部重ねても {6} が残る
  const rows = est.buildKokakuGrid([], 0);
  rows[0].screens = sets.map((_, i) => ({
    screen: defs.KOKAKU_SCREENS.filter((s) => s.allowedSettings)[i].id,
    occasion: 'cz-end',
    eventIndex: i,
  }));
  const result = est.excludedSettingsFromScreens(rows);
  assert.equal(result.conflict, false);
  assert.deepEqual(result.excluded, [1, 2, 3, 4, 5]);
});

test('示唆のみの画面は設定制約にならない', () => {
  const screen = (id) => ev({ type: 'screen', occasion: 'cz-end', screen: id });
  const analysis = est.calculateKokakuAnalysis(
    [screen('czOpeko'), screen('czTachikoma'), screen('czIshikawa'), screen('czSkyLaughingMan')],
    0
  );
  assert.deepEqual(analysis.excludedSettings, [], '奇数/偶数/高設定示唆・復活示唆は制約にしない');
  Object.values(analysis.setting).forEach((v) => assert.ok(Math.abs(v - 100 / 6) < 1e-9));
});

test('cycle-endの直後に置いた画面は次のサイクルのモード示唆になる', () => {
  const screen = (id) => ev({ type: 'screen', occasion: 'ura', screen: id });

  // 終了時のアオイ（モードD濃厚）は、締めたサイクルではなく次のサイクルに効く
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    zone(50),
    czFail(100),
    screen('aoi'), // cycle-end の直後 → 2回目に属する
    zone(50, { czWon: true }),
  ];
  const rows = est.buildKokakuGrid(events, 50);

  assert.equal(rows[0].screens.length, 0, '1回目には付かない');
  assert.deepEqual(rows[1].screens.map((s) => s.screen), ['aoi'], '2回目に付く');
  assert.equal(est.allowedModesFromScreens(rows[0]), null);
  assert.deepEqual(est.allowedModesFromScreens(rows[1]), ['reset', 'normalD']);

  const posteriors = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  assert.ok(Math.abs(posteriors[1].distribution.normalD - 1) < 1e-9, '2回目が通常Dに固定される');
  assert.ok(posteriors[0].distribution.normalD < 1, '1回目は固定されない');
});

test('cycle-endの直前に置いた画面はそのサイクルのモード示唆になる', () => {
  // 裏コマンドをサイクル中に実行した場合は、そのサイクル自身の示唆
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    zone(50),
    ev({ type: 'screen', occasion: 'ura', screen: 'aoi' }),
    czFail(100),
    zone(50),
  ];
  const rows = est.buildKokakuGrid(events, 50);

  assert.deepEqual(rows[0].screens.map((s) => s.screen), ['aoi']);
  assert.equal(rows[1].screens.length, 0);
  assert.deepEqual(est.allowedModesFromScreens(rows[0]), ['reset', 'normalD']);
});

test('ゾーンを1つも記録していない行でも画面示唆は効く', () => {
  // 裏コマンドは77G以降なので、ゾーンより先に示唆だけが入る展開が普通にある。
  // 到達G0で早期リターンしていると、この制約が丸ごと無視される。
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    ev({ type: 'screen', occasion: 'ura', screen: 'aoi' }),
  ];
  const rows = est.buildKokakuGrid(events, 0);
  assert.equal(rows[0].reachedGame, 0);

  const [posterior] = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  assert.ok(Math.abs(posterior.distribution.normalD - 1) < 1e-9, 'モードDに固定される');
  assert.equal(posterior.prior, false, '事前分布のままではない');

  // モードD濃厚は移行率経由で設定にも効く（設定1は15%、設定6は30%）
  const analysis = est.calculateKokakuAnalysis(events, 0);
  assert.ok(
    analysis.setting.setting6 > analysis.setting.setting1,
    `設定1 ${analysis.setting.setting1} / 設定6 ${analysis.setting.setting6}`
  );
});

test('複数の画面示唆は積集合になる', () => {
  const [row] = est.buildKokakuGrid(
    [
      ev({ type: 'screen', occasion: 'at-end', screen: 'motokoBack' }),
      ev({ type: 'screen', occasion: 'ura', screen: 'koan9' }),
    ],
    10
  );
  assert.deepEqual(est.allowedModesFromScreens(row), ['reset', 'normalC', 'normalD']);
});

test('示唆（濃厚でない）は制約にならない', () => {
  const [row] = est.buildKokakuGrid(
    [ev({ type: 'screen', occasion: 'at-end', screen: 'togusa' })],
    10
  );
  assert.equal(est.allowedModesFromScreens(row), null);
});

test('制約と観測が矛盾する行を検出し、推定は壊さない', () => {
  // 300Gまで未当選＝通常D否定。そこへ「モードD濃厚」を入れると矛盾する。
  // 通常回にするのは、リセット回だとモードがリセット確定で制約と衝突しないため。
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    zone(50),
    ev({ type: 'screen', occasion: 'ura', screen: 'aoi' }),
  ];
  const rows = est.buildKokakuGrid(events, 300);
  assert.deepEqual(est.findKokakuConflicts(rows), [1]);

  const posteriors = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  const total = defs.KOKAKU_MODES.reduce((sum, m) => sum + posteriors[0].distribution[m], 0);
  assert.ok(Math.abs(total - 1) < 1e-9, '制約を外して分布を保つ');
  assert.ok(posteriors[0].distribution.normalA > 0);
});

// ========================================
// 事前分布と設定推測
// ========================================

test('リセット回のモードはリセット確定', () => {
  const rows = est.buildKokakuGrid([zone(50)], 100);
  const [posterior] = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  assert.ok(Math.abs(posterior.distribution.reset - 1) < 1e-9);
});

test('AT後のサイクルは全設定共通の事前分布になる（設定の情報が増えない）', () => {
  const events = [
    ev({ type: 'cycle-start', reset: false }),
    zone(50, { czWon: true }),
    czWin(50),
    zone(50),
  ];
  const analysis = est.calculateKokakuAnalysis(events, 100);
  const values = Object.values(analysis.setting);
  const spread = Math.max(...values) - Math.min(...values);
  assert.ok(spread < 1e-6, `AT後だけの観測で設定が動いている（幅 ${spread}）`);
});

test('CZ失敗後に通常A挙動が続くと低設定へ寄る', () => {
  // 通常A/通常Cは250Gまで同一。300Gまで引っ張ると通常Aが濃厚になる
  const events = [ev({ type: 'cycle-start', reset: false })];
  for (let i = 0; i < 8; i++) {
    events.push(zone(100), zone(250, { czWon: true }), czFail(250));
    events.push(ev({ type: 'cycle-start', reset: false }));
  }
  // 最後に通常Aしか説明できないサイクルを置く
  events.push(zone(450, { czWon: true }), czFail(450));

  const analysis = est.calculateKokakuAnalysis(events, 0);
  assert.ok(
    analysis.setting.setting1 > analysis.setting.setting6,
    `設定1 ${analysis.setting.setting1} / 設定6 ${analysis.setting.setting6}`
  );
  assert.ok(analysis.czFailCount >= 8);
});

test('CZ失敗後に通常Dが続くと高設定へ寄る', () => {
  const events = [ev({ type: 'cycle-start', reset: false })];
  for (let i = 0; i < 10; i++) {
    // 50Gで当選して即CZ＝通常Dが最も説明しやすい
    events.push(zone(50, { czWon: true }), czFail(50));
    events.push(ev({ type: 'cycle-start', reset: false }));
  }
  const analysis = est.calculateKokakuAnalysis(events, 0);
  assert.ok(
    analysis.setting.setting6 > analysis.setting.setting1,
    `設定1 ${analysis.setting.setting1} / 設定6 ${analysis.setting.setting6}`
  );
});

test('観測が無ければ設定は均等のまま', () => {
  const analysis = est.calculateKokakuAnalysis([], 0);
  Object.values(analysis.setting).forEach((v) => assert.ok(Math.abs(v - 100 / 6) < 1e-9));
  assert.equal(analysis.czFailCount, 0);
});

test('打ち切りサイクルは右側打ち切りとして効く', () => {
  const uniform = new Array(6).fill(1 / 6);
  const nonReset = (endGame) =>
    est.calculateKokakuModePosteriors(
      est.buildKokakuGrid(
        [
          ev({ type: 'cycle-start', reset: false }),
          zone(50),
          ev({ type: 'cycle-end', cz: null, at: null, endGame }),
        ],
        0
      ),
      uniform
    )[0].distribution;

  // 400Gまで未当選 → 通常C(250)・通常D(150) は消えるが通常B(450) は生き残る
  const at400 = nonReset(400);
  assert.equal(at400.normalC, 0);
  assert.equal(at400.normalD, 0);
  assert.equal(at400.reset, 0, '通常回でリセットモードは選ばれない');
  assert.ok(at400.normalA > 0 && at400.normalB > 0);

  // 500Gまで未当選 → 通常B も消えて通常Aだけ残る
  const at500 = nonReset(500);
  assert.ok(Math.abs(at500.normalA - 1) < 1e-9, '通常Aだけが残る');
});

test('リセット回は打ち切っても状態がリセット確定のまま', () => {
  const rows = est.buildKokakuGrid(
    [zone(50), ev({ type: 'cycle-end', cz: null, at: null, endGame: 300 })],
    0
  );
  const [first] = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  assert.ok(Math.abs(first.distribution.reset - 1) < 1e-9);
});

// ========================================
// 参考値の集計
// ========================================

test('視覚HACKの分母はCZ失敗回数だけ', () => {
  const events = [
    czFail(200),
    ev({ type: 'cycle-end', cz: { czType: 'sam', success: false, visualHack: true }, at: 'cz', endGame: 150 }),
    czWin(100),
  ];
  const analysis = est.calculateKokakuAnalysis(events, 0);
  const hack = analysis.observed.find((o) => o.id === 'visualHack');
  assert.equal(hack.total, 2, 'CZ成功は分母に入らない');
  assert.equal(hack.hit, 1);
  assert.equal(hack.setting1, 5.7);
  assert.equal(hack.setting6, 10.6);
});

test('色別CZ当選率は色ごとに分けて集計する（合算しない）', () => {
  const events = [
    zone(50, { color: 'blue', czWon: false }),
    zone(100, { color: 'blue', czWon: true }),
    zone(150, { color: 'red', czWon: true }),
    ev({ type: 'zone-point', color: 'red', czWon: true }),
  ];
  const analysis = est.calculateKokakuAnalysis(events, 200);
  const blue = analysis.observed.find((o) => o.id === 'color-blue');
  const red = analysis.observed.find((o) => o.id === 'color-red');

  assert.deepEqual([blue.hit, blue.total], [1, 2]);
  assert.deepEqual([red.hit, red.total], [2, 2], '殲滅ポイント契機も色の集計には数える');
  assert.equal(blue.setting1, 3.8);
  assert.equal(red.setting6, 61.7);
  assert.ok(!analysis.observed.some((o) => o.id === 'color-white'), '記録の無い色は出さない');
});

test('タチコマゾーンは専用の集計に入る', () => {
  const events = [
    ev({ type: 'tachikoma-zone', game: 200, czWon: true }),
    ev({ type: 'tachikoma-zone', game: 400, czWon: false }),
  ];
  const analysis = est.calculateKokakuAnalysis(events, 450);
  const tachi = analysis.observed.find((o) => o.id === 'tachikoma');
  assert.deepEqual([tachi.hit, tachi.total], [1, 2]);
});

// ========================================
// 次ゾーンの見通し
// ========================================

test('次ゾーン見通しはモード分布で重み付けされ、到達しえないG数を出さない', () => {
  const onlyD = { reset: 0, normalA: 0, normalB: 0, normalC: 0, normalD: 1 };
  const outlook = est.calculateZoneOutlook(onlyD, 0);
  assert.equal(outlook[0].game, 50);
  assert.ok(Math.abs(outlook[0].rate - 1) < 1e-9, '通常Dの50Gは100%');
  // 通常Dの天井は150G。それ以降は到達しえないので出てこない
  assert.ok(!outlook.some((o) => o.game > 150));
  assert.ok(Math.abs(outlook.find((o) => o.game === 150).ceilingShare - 1) < 1e-9);
  // タチコマの200Gは殲滅ZONEではないので見通しに出さない
  assert.ok(!outlook.some((o) => o.game === 200));
});

test('次ゾーン見通しはモードが混ざっているときも到達分だけで正規化する', () => {
  const mixed = { reset: 0, normalA: 0.5, normalC: 0.5, normalB: 0, normalD: 0 };
  const outlook = est.calculateZoneOutlook(mixed, 0);
  // 100G は通常A・通常Cとも50%
  assert.ok(Math.abs(outlook.find((o) => o.game === 100).rate - 0.5) < 1e-9);
  // 250G は通常Cの天井（確定）と通常Aの50%の平均
  const at250 = outlook.find((o) => o.game === 250);
  assert.ok(Math.abs(at250.rate - 0.75) < 1e-9);
  assert.ok(Math.abs(at250.ceilingShare - 0.5) < 1e-9);
  // 350G は通常Cが到達しえないので通常Aだけで正規化される
  assert.ok(Math.abs(outlook.find((o) => o.game === 350).rate - 0.25) < 1e-9);
});

// ========================================
// ストアと保存
// ========================================

test('攻殻機動隊の台を作ってイベントを記録できる', () => {
  const s = store.getState();
  s.addMachine('kokaku');
  const machine = store.getState().getCurrentMachine();
  assert.equal(machine.machineType, 'kokaku');
  assert.deepEqual(machine.events, []);
  assert.equal(machine.currentGame, 0);

  store.getState().updateKokakuCurrentGame(120);
  store.getState().addKokakuEvent({ type: 'zone', game: 50, color: 'green', czWon: false });
  const updated = store.getState().getCurrentMachine();
  assert.equal(updated.currentGame, 120);
  assert.equal(updated.events.length, 1);
  assert.equal(updated.events[0].game, 50);
  assert.ok(typeof updated.events[0].id === 'string');
});

test('イベントの挿入・訂正・削除が添字で効く', () => {
  store.getState().addMachine('kokaku');
  const add = store.getState().addKokakuEvent;
  add({ type: 'zone', game: 50, color: null, czWon: false });
  add({ type: 'zone', game: 150, color: null, czWon: false });

  store.getState().insertKokakuEventAt(1, { type: 'zone', game: 100, color: 'red', czWon: false });
  assert.deepEqual(
    store.getState().getCurrentMachine().events.map((e) => e.game),
    [50, 100, 150]
  );

  const before = store.getState().getCurrentMachine().events[1];
  store.getState().updateKokakuEventAt(1, { type: 'zone', game: 100, color: 'gold', czWon: true });
  const after = store.getState().getCurrentMachine().events[1];
  assert.equal(after.color, 'gold');
  assert.equal(after.czWon, true);
  assert.equal(after.id, before.id, 'idと時刻は保つ');

  store.getState().deleteKokakuEventAt(1);
  assert.deepEqual(
    store.getState().getCurrentMachine().events.map((e) => e.game),
    [50, 150]
  );
});

test('サイクルを締めると現在Gが0に戻る（次のサイクルは0Gから）', () => {
  store.getState().addMachine('kokaku');
  store.getState().updateKokakuCurrentGame(210);
  store.getState().addKokakuEvent({ type: 'zone', game: 50, color: 'blue', czWon: false });
  assert.equal(store.getState().getCurrentMachine().currentGame, 210, 'ゾーン記録では触らない');

  store.getState().addKokakuEvent({
    type: 'cycle-end',
    cz: { czType: 'sam', success: false, visualHack: false },
    at: null,
    endGame: 210,
  });
  const machine = store.getState().getCurrentMachine();
  assert.equal(machine.currentGame, 0);

  // 締めた行の到達Gは endGame に残るので観測は失われない
  const rows = est.buildKokakuGrid(machine.events, machine.currentGame);
  assert.equal(rows[0].reachedGame, 210);
  assert.equal(rows[1].reachedGame, 0, '次の行は0Gから');
});

test('途中の行の締めを訂正しても現在Gは動かない', () => {
  store.getState().addMachine('kokaku');
  const add = store.getState().addKokakuEvent;
  add({ type: 'cycle-end', cz: null, at: 'cz', endGame: 100 });
  store.getState().updateKokakuCurrentGame(180);
  store.getState().updateKokakuEventAt(0, {
    type: 'cycle-end',
    cz: null,
    at: 'direct',
    endGame: 120,
  });
  assert.equal(store.getState().getCurrentMachine().currentGame, 180);
});

test('リセットで記録と現在Gが消える', () => {
  store.getState().addMachine('kokaku');
  store.getState().updateKokakuCurrentGame(300);
  store.getState().addKokakuEvent({ type: 'zone', game: 50, color: null, czWon: false });
  store.getState().resetKokakuMachine();
  const machine = store.getState().getCurrentMachine();
  assert.deepEqual(machine.events, []);
  assert.equal(machine.currentGame, 0);
});

test('壊れたイベントは読み込み時に落とす', () => {
  const events = defs.normalizeKokakuEvents([
    { id: 'a', timestamp: 1, type: 'zone', game: 50, color: 'blue', czWon: false },
    { id: 'b', timestamp: 2, type: 'zone', game: 500, color: 'blue', czWon: false },
    { id: 'c', timestamp: 3, type: 'zone', game: 100, color: 'magenta', czWon: false },
    { id: 'd', timestamp: 4, type: 'cycle-end', cz: null, at: 'cz', endGame: 120 },
    { id: 'e', timestamp: 5, type: 'unknown' },
    { timestamp: 6, type: 'zone', game: 50, color: null, czWon: false },
    { id: 'g', timestamp: 7, type: 'screen', context: 'cz-end', screen: 'nonexistent' },
  ]);
  assert.deepEqual(events.map((e) => e.id), ['a', 'd']);
  assert.deepEqual(defs.normalizeKokakuEvents(null), []);
  assert.deepEqual(defs.normalizeKokakuEvents(undefined), []);
});

test('旧形式の画面contextはoccasionへ読み替える', () => {
  const events = defs.normalizeKokakuEvents([
    // 旧 'at-end' / 'ura-command' はそのまま対応する場面へ
    { id: 'a', timestamp: 1, type: 'screen', context: 'at-end', screen: 'aoi' },
    { id: 'b', timestamp: 2, type: 'screen', context: 'ura-command', screen: 'poker' },
    // 旧 'window' は裏コマンド扱いだが、CZ終了画面のカタログとは両立しないので
    // そのカタログの既定の場面へ寄せる
    { id: 'c', timestamp: 3, type: 'screen', context: 'window', screen: 'czAllStars' },
    // 場面とカタログが食い違う新形式も直す
    { id: 'd', timestamp: 4, type: 'screen', occasion: 'at-end', screen: 'czSky' },
  ]);
  assert.deepEqual(events.map((e) => e.occasion), ['at-end', 'ura', 'cz-end', 'cz-end']);
});

test('AT突入経路は cycle-end に残り、CZ経由と区別できる', () => {
  const direct = ev({ type: 'cycle-end', cz: null, at: 'direct', endGame: 120 });
  const ceiling = ev({ type: 'cycle-end', cz: null, at: 'ceiling', endGame: 300 });
  const rows = est.buildKokakuGrid([zone(50), direct, zone(50), ceiling], 0);

  assert.equal(rows[0].end.at, 'direct');
  assert.equal(rows[1].end.at, 'ceiling');

  // どちらも「ATに入った」のでCZ失敗の分母には入らない
  const analysis = est.calculateKokakuAnalysis([zone(50), direct, zone(50), ceiling], 0);
  assert.equal(analysis.observed.find((o) => o.id === 'visualHack').total, 0);
  assert.equal(analysis.czFailCount, 0, 'AT経由はCZ失敗のサンプルにならない');

  // AT後のサイクルは全設定共通の振り分けが事前分布になる
  const posteriors = est.calculateKokakuModePosteriors(rows, new Array(6).fill(1 / 6));
  const third = posteriors[2];
  assert.equal(third.prior, true, 'まだ観測が無い');
  assert.deepEqual(third.distribution, {
    reset: 0,
    normalA: 0.125,
    normalB: 0.25,
    normalC: 0.125,
    normalD: 0.5,
  });

  // 設定が動いていないこと（AT後の振り分けに設定差は無い）
  const values = Object.values(analysis.setting);
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-6);
});

test('getMachineTotalGames は攻殻機動隊のcurrentGameを返さない', () => {
  // updateTotalGames が攻殻を無視するので、読めて書けない非対称を作らない
  const { getMachineTotalGames } = load('src/stores/machineStore.ts');
  store.getState().addMachine('kokaku');
  store.getState().updateKokakuCurrentGame(250);
  assert.equal(getMachineTotalGames(store.getState().getCurrentMachine()), 0);
  assert.equal(store.getState().getCurrentMachine().currentGame, 250);
});

test('出現した画面をカタログ順に集計する', () => {
  const events = [
    ev({ type: 'screen', occasion: 'ura', screen: 'aoi' }),
    ev({ type: 'screen', occasion: 'ura', screen: 'motoko' }),
    czFail(200),
    // cycle-end の直後なので2回目に属する
    ev({ type: 'screen', occasion: 'cz-end', screen: 'czAllStars' }),
    ev({ type: 'screen', occasion: 'at-end', screen: 'motoko' }),
  ];
  const summary = est.summarizeKokakuScreens(est.buildKokakuGrid(events, 0));

  assert.equal(summary.total, 4);
  // デフォルト画面（素子）2件を除いた数
  assert.equal(summary.nonDefault, 2);

  // 並びはカタログ順（素子 → アオイ → 全員集合）。出現順ではない
  assert.deepEqual(
    summary.tallies.map((t) => [t.screen, t.count]),
    [['motoko', 2], ['aoi', 1], ['czAllStars', 1]]
  );

  // 素子は1回目（裏）と2回目（AT終了）に出ている
  assert.deepEqual(
    summary.tallies[0].appearances.map((a) => [a.cycle, a.occasion]),
    [[1, 'ura'], [2, 'at-end']]
  );
  // 終了時の画面は次のサイクルに属する
  assert.deepEqual(summary.tallies[2].appearances[0].cycle, 2);
});

test('画面が無ければ集計は空', () => {
  const summary = est.summarizeKokakuScreens(est.buildKokakuGrid([], 0));
  assert.deepEqual(summary, { tallies: [], total: 0, nonDefault: 0 });
});

test('デフォルト画面は素子と青空のみ', () => {
  const defaults = defs.KOKAKU_SCREENS.filter((s) => s.defaultPattern).map((s) => s.id);
  assert.deepEqual(defaults, ['motoko', 'czSky']);
});

test('場面はカタログと1対1で対応する', () => {
  assert.deepEqual(defs.kokakuOccasionsForScreen('czAllStars'), ['cz-end']);
  assert.deepEqual(defs.kokakuOccasionsForScreen('aoi'), ['cz-push', 'at-end', 'ura']);
  assert.equal(defs.kokakuScreensForOccasion('cz-end'), defs.KOKAKU_CZ_END_SCREENS);
  assert.equal(defs.kokakuScreensForOccasion('ura'), defs.KOKAKU_WINDOW_SCREENS);
  // セルに出す短いタグ
  assert.deepEqual(
    defs.KOKAKU_SCREEN_OCCASIONS.map((o) => o.short),
    ['CZ', 'PUSH', 'AT', '裏']
  );
});

test('グリッドの行は画面の場面も持つ', () => {
  const rows = est.buildKokakuGrid(
    [
      ev({ type: 'screen', occasion: 'ura', screen: 'poker' }),
      czFail(200),
      ev({ type: 'screen', occasion: 'cz-end', screen: 'czVacance' }),
    ],
    0
  );
  assert.deepEqual(rows[0].screens, [
    { screen: 'poker', occasion: 'ura', eventIndex: 0 },
  ]);
  assert.deepEqual(rows[1].screens, [
    { screen: 'czVacance', occasion: 'cz-end', eventIndex: 2 },
  ]);
});

test('クラウドへ往復しても記録が保たれる', async () => {
  const realSync = load('src/lib/supabaseSync.ts');
  const machine = {
    id: '11111111-1111-4111-8111-111111111111',
    machineType: 'kokaku',
    name: '台1',
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentGame: 240,
    events: [
      { id: 'a', timestamp: 1, type: 'zone', game: 50, color: 'blue', czWon: false },
      { id: 'b', timestamp: 2, type: 'cycle-end', cz: { czType: 'sam', success: false, visualHack: true }, at: 'cz', endGame: 210 },
    ],
  };
  await realSync.upsertMachine(machine);
  const loaded = await realSync.loadAllMachines();
  const restored = loaded.find((m) => m.id === machine.id);

  assert.equal(restored.machineType, 'kokaku');
  assert.equal(restored.currentGame, 240);
  assert.deepEqual(restored.events.map((e) => e.id), ['a', 'b']);
  assert.equal(restored.events[1].cz.visualHack, true);
});

test('旧DBに列が無くても読み込みは空で通る（履歴を壊さない）', async () => {
  const realSync = load('src/lib/supabaseSync.ts');
  cloudRows.set('machines', [{
    id: '22222222-2222-4222-8222-222222222222',
    machine_type: 'kokaku',
    name: '台2',
    number: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);
  const loaded = await realSync.loadAllMachines();
  const restored = loaded.find((m) => m.machineType === 'kokaku');
  assert.deepEqual(restored.events, []);
  assert.equal(restored.currentGame, 0);
});
