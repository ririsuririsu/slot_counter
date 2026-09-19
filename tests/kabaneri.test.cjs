// 実ソースをメモリ上で変換して検証する。外部通信・実ユーザーの保存データには触れない。
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const storage = new Map();
const remoteCalls = [];
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
  assert.equal(JSON.parse(storage.get('slot-counter-storage')).version, 10);
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
  assert.ok(Object.values(next.counters).every((value) => value === 0));
  assert.deepEqual(store.getState().machines.find((m) => m.id === oldId), previous);
  assert.deepEqual(store.getState().kabaneriAnalysisTargets[next.id], bellOnly);
  assert.deepEqual(remoteCalls.map((call) => call.operation), ['upsertMachine', 'upsertMachine']);
  assert.deepEqual(remoteCalls.map((call) => call.args[0].id), [oldId, next.id]);
  assert.deepEqual(remoteCalls[0].args[0], previous);
});

test('他機種からカバネリの新規記録アクションを呼んでも変更しない', () => {
  store.getState().addMachine('monkey-turn-v');
  const machines = store.getState().machines;
  remoteCalls.length = 0;
  store.getState().resetKabaneriMachine();
  assert.equal(store.getState().machines, machines);
  assert.equal(remoteCalls.length, 0);
});
