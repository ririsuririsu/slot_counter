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
let cloudWriteError = null;
const cloud = {
  from: (table) => ({
    upsert: async (row) => {
      if (cloudWriteError && table === 'machine_counters') return { error: cloudWriteError };
      const rows = cloudRows.get(table) ?? [];
      const id = row.id ?? row.machine_id;
      cloudRows.set(table, [...rows.filter((r) => (r.id ?? r.machine_id) !== id), structuredClone(row)]);
      return { error: null };
    },
    select: () => ({
      order: async () => ({ data: structuredClone(cloudRows.get(table) ?? []), error: null }),
      eq: (key, id) => ({ single: async () => ({ data: structuredClone((cloudRows.get(table) ?? []).find((r) => r[key] === id) ?? null), error: null }) }),
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
const { calculateSelectedKabaneriAnalyses, calculateBellAnalysis, calculateFlashAnalysis } = load('src/utils/kabaneriEstimation.ts');
const { DEFAULT_KABANERI_ANALYSIS_TARGETS: off, mumeiIkomaFlashRates, kabaneFlashRates } = load('src/data/kabaneriDefinitions.ts');
const { useMachineStore: store } = load('src/stores/machineStore.ts');
const bellOnly = { ...off, bell: true };
const flashOnly = { ...off, mumeiIkoma: true };
const bothFlashes = { ...off, mumeiIkoma: true, kabane: true };
const { summarizeKabaneriCz, chancePoints, flashCounterDelta, NORMAL_CONDITIONS, normalizeKabaneriCzEvents } = load('src/utils/kabaneriCz.ts');
const realSync = load('src/lib/supabaseSync.ts');
const chance = (role, overrides = {}) => ({ type: 'chance', role, conditions: { ...NORMAL_CONDITIONS }, flash: 'none', flashEligible: false, ...overrides });

function referencePosterior(observations) {
  const logs = Array.from({ length: 6 }, (_, i) => observations.reduce(
    (sum, [k, n, rates]) => sum + k * Math.log(rates[i]) + (n - k) * Math.log1p(-rates[i]), 0
  ));
  const max = Math.max(...logs);
  const weights = logs.map((log) => Math.exp(log - max));
  const total = weights.reduce((a, b) => a + b);
  return weights.map((value) => value / total * 100);
}

function assertPosterior(actual, expected) {
  assert.ok(actual);
  Object.values(actual).forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-8));
}

beforeEach(() => {
  storage.clear();
  store.setState(store.getInitialState(), true);
  remoteCalls.length = 0;
  cloudRows.clear();
  cloudWriteError = null;
});

test('未選択の0回は総合に入らず、ベル未計測でも発光率だけを使える', () => {
  const counters = { mumei: 100, mumeiFlash: 15 };
  assert.equal(calculateSelectedKabaneriAnalyses(counters, 5000, off).combined, null);
  const result = calculateSelectedKabaneriAnalyses(counters, 5000, flashOnly);
  assert.equal(result.bellAnalysis, null);
  assert.deepEqual(result.combined, calculateFlashAnalysis(15, 100, 'mumeiIkoma'));
});

test('明示選択したベル0回と発光0回は有効な観測', () => {
  const bell = calculateSelectedKabaneriAnalyses({}, 5000, bellOnly);
  assert.deepEqual(bell.combined, calculateBellAnalysis(0, 5000));
  assert.ok(bell.combined.setting1 > bell.combined.setting6);
  const flash = calculateSelectedKabaneriAnalyses({ ikoma: 100 }, 0, flashOnly);
  assert.deepEqual(flash.combined, calculateFlashAnalysis(0, 100, 'mumeiIkoma'));
});

test('分母未入力では確率を表示せず、不整合のある項目を除外する', () => {
  assert.equal(calculateSelectedKabaneriAnalyses({ gedanBell: 5 }, 0, bellOnly).combined, null);
  assert.equal(calculateSelectedKabaneriAnalyses({}, 5000, flashOnly).combined, null);
  const invalid = calculateSelectedKabaneriAnalyses({ gedanBell: 101 }, 100, bellOnly);
  assert.equal(invalid.bellError, true);
  assert.equal(invalid.combined, null);
  // 合算で隠れる役別の不整合も除外する。
  const flash = calculateSelectedKabaneriAnalyses({ mumei: 1, mumeiFlash: 2, ikoma: 100 }, 0, flashOnly);
  assert.equal(flash.flashes.mumeiIkoma.error, true);
  assert.equal(flash.combined, null);
});

test('暫定2テーブルが採用仕様どおりで、3軸の統合が独立計算に一致する', () => {
  const mumeiRates = [.08, .104, .128, .152, .176, .20];
  const kabaneRates = [.23, .2466, .2632, .2798, .2964, .313];
  assert.deepEqual(mumeiIkomaFlashRates.map((p) => p.rate), mumeiRates);
  assert.deepEqual(kabaneFlashRates.map((p) => p.rate), kabaneRates);
  const result = calculateSelectedKabaneriAnalyses({ gedanBell: 50, mumei: 60, mumeiFlash: 10, ikoma: 40, ikomaFlash: 5, kabane: 30, kabaneFlash: 9 }, 5000, { ...bothFlashes, bell: true });
  assert.equal(result.flashes.mumeiIkoma.chanceTotal, 100);
  assert.equal(result.flashes.kabane.chanceTotal, 30);
  assertPosterior(result.combined, referencePosterior([
    [50, 5000, [121.1, 114.4, 112.8, 106.2, 104.2, 99.1].map((n) => 1 / n)],
    [15, 100, mumeiRates], [9, 30, kabaneRates],
  ]));
});

test('カバネの入力は無名・生駒軸を変えず、各軸の単独採用ができる', () => {
  const counters = { mumei: 100, mumeiFlash: 20, kabane: 100, kabaneFlash: 31 };
  const first = calculateSelectedKabaneriAnalyses(counters, 0, bothFlashes);
  const changed = calculateSelectedKabaneriAnalyses({ ...counters, kabaneFlash: 1 }, 0, bothFlashes);
  assert.deepEqual(first.flashes.mumeiIkoma, changed.flashes.mumeiIkoma);
  assert.notDeepEqual(first.combined, changed.combined);
  assert.deepEqual(calculateSelectedKabaneriAnalyses(counters, 0, flashOnly).combined, first.flashes.mumeiIkoma.analysis);
  assert.deepEqual(calculateSelectedKabaneriAnalyses(counters, 0, { ...off, kabane: true }).combined, first.flashes.kabane.analysis);
  const invalid = calculateSelectedKabaneriAnalyses({ ...counters, kabaneFlash: 101 }, 0, bothFlashes);
  assert.equal(invalid.flashes.kabane.error, true);
  assert.deepEqual(invalid.combined, first.flashes.mumeiIkoma.analysis);
});

test('対立する大標本でも確率積のアンダーフローで均等へ戻らない', () => {
  const result = calculateSelectedKabaneriAnalyses({ mumei: 100000, mumeiFlash: 0, kabane: 100000, kabaneFlash: 100000 }, 0, bothFlashes);
  assertPosterior(result.combined, referencePosterior([
    [0, 100000, [.08, .104, .128, .152, .176, .20]],
    [100000, 100000, [.23, .2466, .2632, .2798, .2964, .313]],
  ]));
  assert.ok(Math.max(...Object.values(result.combined)) > 99);
});

test('項目選択は台別に永続化し、カウンターを変更・送信しない', async () => {
  store.getState().addMachine('kabaneri');
  const first = store.getState().currentMachineId;
  store.getState().incrementKabaneriCounter('gedanBell');
  const counters = structuredClone(store.getState().getCurrentMachine().counters);
  remoteCalls.length = 0;
  store.getState().setKabaneriAnalysisTarget('bell', true);
  store.getState().setKabaneriAnalysisTarget('bell', false);
  assert.deepEqual(store.getState().getCurrentMachine().counters, counters);
  assert.equal(remoteCalls.length, 0);
  store.getState().setKabaneriAnalysisTarget('mumeiIkoma', true);
  store.getState().addMachine('kabaneri');
  assert.equal(store.getState().kabaneriAnalysisTargets[store.getState().currentMachineId], undefined);
  const saved = storage.get('slot-counter-storage');
  assert.equal(JSON.parse(saved).state.currentMachineId, undefined);
  store.setState(store.getInitialState(), true);
  storage.set('slot-counter-storage', saved);
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().kabaneriAnalysisTargets[first], flashOnly);
});

test('選択項目のない旧version 9データはカウントを保ち、未選択で読み込む', async () => {
  store.getState().addMachine('kabaneri');
  store.getState().incrementKabaneriFlash('mumei');
  const machines = structuredClone(store.getState().machines);
  store.setState(store.getInitialState(), true);
  storage.set('slot-counter-storage', JSON.stringify({ version: 9, state: { machines } }));
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().machines, machines);
  assert.deepEqual(store.getState().kabaneriAnalysisTargets, {});
});

test('version 9の旧発光率選択は両軸へ移行し、明示オフも保存する', async () => {
  store.setState(store.getInitialState(), true);
  storage.set('slot-counter-storage', JSON.stringify({ version: 9, state: {
    machines: [], kabaneriAnalysisTargets: {
      on: { bell: true, flash: true }, off: { bell: false, flash: false },
    },
  } }));
  await store.persist.rehydrate();
  assert.deepEqual(store.getState().kabaneriAnalysisTargets.on, { bell: true, mumeiIkoma: true, kabane: true });
  assert.deepEqual(store.getState().kabaneriAnalysisTargets.off, off);
  assert.equal(JSON.parse(storage.get('slot-counter-storage')).version, 11);
});

test('新規記録は旧記録を保持し、画面移動に関係なく旧・新IDをクラウドに送る', async () => {
  store.getState().addMachine('kabaneri');
  const oldId = store.getState().currentMachineId;
  store.getState().updateMachineName(oldId, '海門テスト');
  store.getState().updateMachineNumber(oldId, '123');
  store.getState().incrementKabaneriFlash('mumei');
  store.getState().updateTotalGames(1234);
  store.getState().setKabaneriAnalysisTarget('bell', true);
  const previous = structuredClone(store.getState().getCurrentMachine());
  remoteCalls.length = 0;
  store.getState().resetKabaneriMachine();
  const next = store.getState().getCurrentMachine();
  store.getState().selectMachine('');
  await Promise.resolve();
  assert.notEqual(next.id, oldId);
  assert.equal(next.name, previous.name);
  assert.equal(next.number, previous.number);
  assert.equal(next.totalGames, 0);
  assert.deepEqual(next.czEvents, []);
  assert.ok(Object.values(next.counters).every((value) => value === 0));
  assert.deepEqual(store.getState().machines.find((m) => m.id === oldId), previous);
  assert.deepEqual(store.getState().kabaneriAnalysisTargets[next.id], bellOnly);
  assert.deepEqual(remoteCalls.map((call) => call.operation), ['upsertMachine', 'upsertMachine']);
  assert.deepEqual(remoteCalls.map((call) => call.args[0].id), [oldId, next.id]);
  assert.deepEqual(remoteCalls[0].args[0], previous);
});

test('複合の片側高確を別換算し、対象外役を発光率へ混ぜない', () => {
  store.getState().addMachine('kabaneri');
  store.getState().startKabaneriCzTracking(true);
  store.getState().incrementKabaneriCounter('mumei');
  store.getState().incrementKabaneriFlash('ikoma');
  store.getState().recordKabaneriChance(chance('mumeiIkoma', { conditions: { ...NORMAL_CONDITIONS, mumei: 'high' }, flashEligible: true }));
  store.getState().recordKabaneriChance(chance('mumei', { conditions: { ...NORMAL_CONDITIONS, mumei: 'high' }, flashEligible: true }));
  store.getState().recordKabaneriChance(chance('kabane', { conditions: { ...NORMAL_CONDITIONS, kabane: 'high' } }));
  const machine = store.getState().getCurrentMachine();
  const { current } = summarizeKabaneriCz(machine.czEvents);
  assert.equal(current.mumei.points, 46);
  assert.equal(current.ikoma.points, 30);
  assert.equal(machine.counters.mumei, 1);
  assert.equal(machine.counters.ikoma, 1);
  assert.equal(machine.counters.ikomaFlash, 1);
  assert.equal(machine.counters.kabane, 0);
});

test('CZを当選契機の直後に挿入し、前兆中の分と別キャラの蓄積を残す', () => {
  store.getState().addMachine('kabaneri');
  store.getState().startKabaneriCzTracking(true);
  store.getState().incrementKabaneriFlash('mumei');
  const trigger = store.getState().getCurrentMachine().czEvents.at(-1).id;
  store.getState().incrementKabaneriCounter('mumei');
  store.getState().incrementKabaneriFlash('ikoma');
  store.getState().recordKabaneriCz('mumei', trigger, true);
  const result = summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents);
  assert.equal(result.history[0].points, 15);
  assert.equal(result.history[0].doran, true);
  assert.equal(result.history[0].complete, true);
  assert.equal(result.current.mumei.points, 1);
  assert.equal(result.current.ikoma.points, 15);
  const before = store.getState().getCurrentMachine().czEvents;
  store.getState().recordKabaneriCz('mumei', trigger, false);
  assert.equal(store.getState().getCurrentMachine().czEvents, before);
  store.getState().recordKabaneriCz('ikoma', null, false);
  assert.equal(summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents).history[1].points, 15);
});

test('複合の同一契機を両キャラのCZに使っても双方の前兆分が残る', () => {
  store.getState().addMachine('kabaneri');
  store.getState().recordKabaneriChance(chance('mumeiIkoma'));
  const trigger = store.getState().getCurrentMachine().czEvents.at(-1).id;
  store.getState().incrementKabaneriCounter('mumei');
  store.getState().incrementKabaneriCounter('ikoma');
  store.getState().recordKabaneriCz('mumei', trigger, true);
  store.getState().recordKabaneriCz('ikoma', trigger, false);
  const result = summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents);
  assert.deepEqual(result.history.map((r) => r.points), [15, 15]);
  assert.equal(result.current.mumei.points, 1);
  assert.equal(result.current.ikoma.points, 1);
});

test('超高確・オールスター・発光不明は架空ptを加えず不明を保持する', () => {
  assert.equal(chancePoints(chance('all'), 'mumei'), null);
  assert.equal(chancePoints(chance('mumei', { conditions: { ...NORMAL_CONDITIONS, mumei: 'super' } }), 'mumei'), null);
  store.getState().addMachine('kabaneri');
  store.getState().recordKabaneriChance(chance('mumei', { flash: 'unknown' }));
  store.getState().recordKabaneriChance(chance('all'));
  store.getState().incrementKabaneriFlash('mumei');
  store.getState().recordKabaneriCz('mumei', null, false);
  const result = summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents);
  assert.equal(result.history[0].points, 15);
  assert.equal(result.history[0].unknownCount, 2);
  assert.equal(result.history[0].complete, false);
  assert.equal(result.current.ikoma.unknownCount, 1);
});

test('減算操作・履歴削除がCZ集計を再計算し、旧カウント分は捏造しない', () => {
  store.getState().addMachine('kabaneri');
  store.getState().incrementKabaneriFlash('mumei');
  store.getState().recordKabaneriCz('mumei', null, false);
  store.getState().decrementKabaneriFlash('mumei');
  const machine = store.getState().getCurrentMachine();
  assert.equal(machine.counters.mumei, 0);
  assert.equal(machine.counters.mumeiFlash, 0);
  assert.equal(summarizeKabaneriCz(machine.czEvents).history[0].points, 0);
  store.getState().deleteKabaneriCzEvent(machine.czEvents[0].id);
  assert.deepEqual(store.getState().getCurrentMachine().czEvents, []);
  store.setState({ machines: [{ ...machine, czEvents: [], counters: { mumei: 2, mumeiFlash: 1 } }] });
  store.getState().decrementKabaneriCounter('mumei');
  store.getState().decrementKabaneriCounter('mumei');
  assert.equal(store.getState().getCurrentMachine().counters.mumei, 1);
  assert.deepEqual(store.getState().getCurrentMachine().czEvents, []);
});

test('version 10の履歴なし台は旧カウントを保ち、追加記録だけ永続化する', async () => {
  store.getState().addMachine('kabaneri');
  const old = { ...store.getState().getCurrentMachine(), counters: { mumei: 100, mumeiFlash: 10 } };
  delete old.czEvents;
  store.setState(store.getInitialState(), true);
  storage.set('slot-counter-storage', JSON.stringify({ version: 10, state: { machines: [old] } }));
  await store.persist.rehydrate();
  store.getState().selectMachine(old.id);
  assert.deepEqual(store.getState().getCurrentMachine().czEvents, []);
  assert.deepEqual(store.getState().getCurrentMachine().counters, old.counters);
  store.getState().incrementKabaneriFlash('mumei');
  const saved = storage.get('slot-counter-storage');
  store.setState(store.getInitialState(), true);
  storage.set('slot-counter-storage', saved);
  await store.persist.rehydrate();
  assert.equal(summarizeKabaneriCz(store.getState().machines[0].czEvents).current.mumei.points, 15);
});

test('実クラウド同期コードが旧カウントと順序付きCZ履歴を往復できる', async () => {
  store.getState().addMachine('kabaneri');
  store.getState().incrementKabaneriFlash('ikoma');
  store.getState().recordKabaneriCz('ikoma', null, false);
  const machine = structuredClone(store.getState().getCurrentMachine());
  await realSync.upsertMachine(machine);
  const restored = (await realSync.loadAllMachines())[0];
  assert.deepEqual(restored.czEvents, machine.czEvents);
  assert.deepEqual(restored.counters, machine.counters);
  assert.deepEqual(summarizeKabaneriCz(restored.czEvents), summarizeKabaneriCz(machine.czEvents));
});

test('クラウド保存失敗・旧DBスキーマで成功扱いや空履歴復元をしない', async () => {
  store.getState().addMachine('kabaneri');
  const machine = store.getState().getCurrentMachine();
  cloudWriteError = { message: 'missing column', code: 'PGRST204' };
  await assert.rejects(realSync.syncAllMachines([machine]), (error) => error.code === 'PGRST204');
  cloudWriteError = null;
  cloudRows.set('machine_counters', [{ machine_id: machine.id, counters: {} }]);
  await assert.rejects(realSync.loadAllMachines(), /データベースの更新/);
  assert.deepEqual(normalizeKabaneriCzEvents(undefined), []);
});

test('他機種からカバネリの新規記録アクションを呼んでも変更しない', () => {
  store.getState().addMachine('monkey-turn-v');
  const machines = store.getState().machines;
  remoteCalls.length = 0;
  store.getState().resetKabaneriMachine();
  assert.equal(store.getState().machines, machines);
  assert.equal(remoteCalls.length, 0);
});

test('暫定換算表：単独・全複合組合せ・片側高確・超高確・オールスターを照合する', () => {
  // 期待値は採用済みの換算表から固定する。カバネは無名・生駒のCZへ加算しない。
  const cases = [
    ['mumei', 'normal', 'normal', 'normal', 'none', [1, 0]],
    ['mumei', 'normal', 'normal', 'normal', 'yes', [15, 0]],
    ['ikoma', 'normal', 'normal', 'normal', 'none', [0, 1]],
    ['ikoma', 'normal', 'normal', 'normal', 'yes', [0, 15]],
    ['mumei', 'normal', 'normal', 'normal', 'unknown', [null, 0]],
    ['ikoma', 'normal', 'normal', 'normal', 'unknown', [0, null]],
    ['mumei', 'high', 'normal', 'normal', 'unknown', [15, 0]],
    ['ikoma', 'normal', 'high', 'normal', 'unknown', [0, 15]],
    ['mumei', 'normal', 'high', 'high', 'none', [1, 0]],
    ['ikoma', 'high', 'normal', 'high', 'yes', [0, 15]],
    ['kabane', 'normal', 'normal', 'normal', 'yes', [0, 0]],
    ['kabane', 'normal', 'normal', 'high', 'yes', [0, 0]],
    ['kabane', 'normal', 'normal', 'super', 'unknown', [0, 0]],
    ['mumeiIkoma', 'normal', 'normal', 'normal', 'yes', [15, 15]],
    ['mumeiIkoma', 'high', 'normal', 'normal', 'yes', [30, 15]],
    ['mumeiIkoma', 'normal', 'high', 'normal', 'yes', [15, 30]],
    ['mumeiIkoma', 'high', 'high', 'normal', 'yes', [30, 30]],
    ['mumeiKabane', 'normal', 'normal', 'high', 'yes', [15, 0]],
    ['mumeiKabane', 'high', 'normal', 'normal', 'yes', [30, 0]],
    ['ikomaKabane', 'normal', 'normal', 'high', 'yes', [0, 15]],
    ['ikomaKabane', 'normal', 'high', 'normal', 'yes', [0, 30]],
    ['mumei', 'super', 'normal', 'normal', 'yes', [null, 0]],
    ['ikoma', 'normal', 'super', 'normal', 'yes', [0, null]],
    ['mumeiIkoma', 'super', 'normal', 'normal', 'yes', [null, 15]],
    ['mumeiIkoma', 'high', 'super', 'normal', 'yes', [30, null]],
    ['all', 'normal', 'normal', 'normal', 'yes', [null, null]],
    ['all', 'high', 'high', 'high', 'yes', [null, null]],
  ];
  for (const [role, mumei, ikoma, kabane, flash, expected] of cases) {
    const input = chance(role, { conditions: { mumei, ikoma, kabane }, flash });
    assert.deepEqual(['mumei', 'ikoma'].map((character) => chancePoints(input, character)), expected,
      JSON.stringify(input));
  }
});

test('発光率：対応キャラだけの高確判定と、対象外データの二重防御', () => {
  for (const role of ['mumei', 'ikoma', 'kabane']) {
    assert.deepEqual(flashCounterDelta(chance(role, { flash: 'none', flashEligible: true })), { [role]: 1 });
    assert.deepEqual(flashCounterDelta(chance(role, { flash: 'yes', flashEligible: true })), { [role]: 1, [`${role}Flash`]: 1 });
    assert.deepEqual(flashCounterDelta(chance(role, { flash: 'unknown', flashEligible: true })), {});
    assert.deepEqual(flashCounterDelta(chance(role, { flash: 'yes', flashEligible: false })), {});
    for (const condition of ['high', 'super']) {
      assert.deepEqual(flashCounterDelta(chance(role, {
        conditions: { ...NORMAL_CONDITIONS, [role]: condition }, flash: 'yes', flashEligible: true,
      })), {});
    }
  }
  for (const role of ['mumeiIkoma', 'mumeiKabane', 'ikomaKabane', 'all']) {
    assert.deepEqual(flashCounterDelta(chance(role, { flash: 'yes', flashEligible: true })), {});
  }
  assert.deepEqual(flashCounterDelta(chance('mumei', {
    conditions: { ...NORMAL_CONDITIONS, ikoma: 'high', kabane: 'high' }, flash: 'yes', flashEligible: true,
  })), { mumei: 1, mumeiFlash: 1 });
});

test('混在した入力の実例：発光率は2軸別、発光中は不明、取消で元に戻る', () => {
  store.getState().addMachine('kabaneri');
  store.getState().startKabaneriCzTracking(true);
  const initial = structuredClone(store.getState().getCurrentMachine());
  const inputs = [
    chance('mumei', { flash: 'none', flashEligible: true }), // 無名 1
    chance('mumei', { flash: 'yes', flashEligible: true }), // 無名 16
    chance('ikoma', { flash: 'none', flashEligible: true }), // 生駒 1
    chance('kabane', { flash: 'yes', flashEligible: true }),
    chance('mumei', { conditions: { ...NORMAL_CONDITIONS, mumei: 'high' }, flash: 'yes' }), // 無名 31
    chance('mumeiIkoma', { conditions: { ...NORMAL_CONDITIONS, ikoma: 'high' }, flash: 'yes' }), // 無名 46 / 生駒 31
    chance('mumei', { flash: 'unknown' }), // 無名 不明1件
    chance('ikomaKabane', { flash: 'yes' }), // 生駒 46
  ];
  const ids = [];
  for (const input of inputs) {
    store.getState().recordKabaneriChance(input);
    ids.push(store.getState().getCurrentMachine().czEvents.at(-1).id);
  }
  const machine = store.getState().getCurrentMachine();
  const result = summarizeKabaneriCz(machine.czEvents);
  assert.deepEqual(result.current.mumei, { points: 46, unknownCount: 1, chanceCount: 5, complete: true });
  assert.deepEqual(result.current.ikoma, { points: 46, unknownCount: 0, chanceCount: 3, complete: true });
  const analysis = calculateSelectedKabaneriAnalyses(machine.counters, 0, bothFlashes);
  assert.equal(analysis.flashes.mumeiIkoma.chanceTotal, 3);
  assert.equal(analysis.flashes.mumeiIkoma.flashTotal, 1);
  assert.equal(analysis.flashes.kabane.chanceTotal, 1);
  assert.equal(analysis.flashes.kabane.flashTotal, 1);
  assertPosterior(analysis.combined, referencePosterior([
    [1, 3, mumeiIkomaFlashRates.map((r) => r.rate)], [1, 1, kabaneFlashRates.map((r) => r.rate)],
  ]));
  // 順不同の取消でも分子・分母とポイントの両方が元へ戻る。
  for (const index of [2, 5, 0, 7, 4, 1, 6, 3]) store.getState().deleteKabaneriCzEvent(ids[index]);
  const restored = store.getState().getCurrentMachine();
  assert.deepEqual(restored.counters, initial.counters);
  assert.deepEqual(restored.czEvents, initial.czEvents);
});

test('CZの遡及入力・取消・再入力が両キャラの不明分と次区間を保つ', () => {
  store.getState().addMachine('kabaneri');
  store.getState().startKabaneriCzTracking(true);
  store.getState().recordKabaneriChance(chance('mumei', { flash: 'unknown' }));
  store.getState().recordKabaneriChance(chance('mumeiIkoma', { flash: 'yes' }));
  const trigger = store.getState().getCurrentMachine().czEvents.at(-1).id;
  store.getState().incrementKabaneriFlash('mumei');
  store.getState().incrementKabaneriCounter('ikoma');
  const before = structuredClone(store.getState().getCurrentMachine());
  store.getState().recordKabaneriCz('mumei', trigger, false);
  let result = summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents);
  assert.equal(result.history[0].points, 15);
  assert.equal(result.history[0].unknownCount, 1);
  assert.equal(result.current.mumei.points, 15);
  assert.equal(result.current.mumei.unknownCount, 0);
  assert.equal(result.current.ikoma.points, 16);
  store.getState().deleteKabaneriCzEvent(result.history[0].id);
  assert.deepEqual(store.getState().getCurrentMachine().czEvents, before.czEvents);
  assert.deepEqual(store.getState().getCurrentMachine().counters, before.counters);
  store.getState().recordKabaneriCz('mumei', trigger, false);
  store.getState().recordKabaneriCz('ikoma', trigger, false);
  result = summarizeKabaneriCz(store.getState().getCurrentMachine().czEvents);
  assert.equal(result.current.mumei.points, 15);
  assert.equal(result.current.ikoma.points, 1);
  const mumei = result.history.find((r) => r.character === 'mumei');
  const ikoma = result.history.find((r) => r.character === 'ikoma');
  assert.equal(mumei.unknownCount, 1);
  assert.equal(ikoma.unknownCount, 0);
  assert.equal(ikoma.points, 15);
});
