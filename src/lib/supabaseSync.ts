import { supabase } from './supabase';
import type {
  Machine,
  MonkeyTurnMachine,
  HokutoMachine,
  KabaneriMachine,
  MonhanRiseMachine,
  MonhanRiseEvent,
  KokakuMachine,
  LycorisMachine,
  HistoryEntry,
  HokutoLog,
} from '../types';
import { normalizeKokakuEvents } from '../data/kokakuDefinitions';
import {
  normalizeLycorisCount,
  normalizeLycorisEvents,
  normalizeLycorisGame,
} from '../data/lycorisDefinitions';
import { createInitialDenshoHelperState } from '../utils/denshoEstimation';
import { createInitialKabaneriCounters } from '../data/kabaneriDefinitions';
import { normalizeKabaneriCzEvents } from '../utils/kabaneriCz';
import { createInitialMonhanRiseCounters } from '../data/monhanRiseDefinitions';

// ========================================
// 型ガード
// ========================================

function isMonkeyTurn(m: Machine): m is MonkeyTurnMachine {
  return m.machineType === 'monkey-turn-v';
}

function isHokuto(m: Machine): m is HokutoMachine {
  return m.machineType === 'hokuto-tensei2';
}

function isKabaneri(m: Machine): m is KabaneriMachine {
  return m.machineType === 'kabaneri';
}

function isMonhanRise(m: Machine): m is MonhanRiseMachine {
  return m.machineType === 'monhan-rise';
}

function isKokaku(m: Machine): m is KokakuMachine {
  return m.machineType === 'kokaku';
}

function isLycoris(m: Machine): m is LycorisMachine {
  return m.machineType === 'lycoris-recoil';
}

// ========================================
// Machines
// ========================================

export async function upsertMachine(machine: Machine) {
  if (!supabase) return;
  await supabase.from('machines').upsert({
    id: machine.id,
    machine_type: machine.machineType,
    name: machine.name,
    number: machine.number || '',
    created_at: new Date(machine.createdAt).toISOString(),
    updated_at: new Date(machine.updatedAt).toISOString(),
  });

  // 機種別の状態も同期
  if (isMonkeyTurn(machine)) {
    await upsertMonkeyTurnState(machine);
  } else if (isHokuto(machine)) {
    await upsertHokutoState(machine);
  } else if (isKabaneri(machine)) {
    await upsertKabaneriState(machine);
  } else if (isMonhanRise(machine)) {
    await upsertMonhanRiseState(machine);
  } else if (isKokaku(machine)) {
    await upsertKokakuState(machine);
  } else if (isLycoris(machine)) {
    await upsertLycorisState(machine);
  }
}

export async function deleteMachineRemote(machineId: string) {
  if (!supabase) return;
  // CASCADE で関連テーブルも削除される
  await supabase.from('machines').delete().eq('id', machineId);
}

// ========================================
// MonkeyTurn: Counters
// ========================================

async function upsertMonkeyTurnState(machine: MonkeyTurnMachine) {
  if (!supabase) return;
  await supabase.from('machine_counters').upsert({
    machine_id: machine.id,
    total_games: machine.totalGames,
    counters: machine.counters,
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
}

// ========================================
// Kabaneri: Counters（machine_counters テーブルを共用）
// ========================================

async function upsertKabaneriState(machine: KabaneriMachine) {
  if (!supabase) return;
  const { error } = await supabase.from('machine_counters').upsert({
    machine_id: machine.id,
    total_games: machine.totalGames,
    counters: machine.counters,
    kabaneri_events: machine.czEvents ?? [],
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
  if (error) throw error;
}

// ========================================
// MonhanRise: State（カウンター + イベント列）
// ========================================

async function upsertMonhanRiseState(machine: MonhanRiseMachine) {
  if (!supabase) return;
  // total_games はこの機種では使わない（DB側は DEFAULT 0 のまま）
  await supabase.from('monhan_rise_state').upsert({
    machine_id: machine.id,
    counters: machine.counters,
    events: machine.events,
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
}

// ========================================
// Kokaku: State（現在G + イベント列）
// ========================================

async function upsertKokakuState(machine: KokakuMachine) {
  if (!supabase) return;
  await supabase.from('kokaku_state').upsert({
    machine_id: machine.id,
    current_game: machine.currentGame,
    events: machine.events,
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
}

// ========================================
// Lycoris: State（共通ベル・G数 + イベント列）
// ========================================

// カバネリと同じく、失敗は握りつぶさずに投げる。手動アップロードで失敗が見えるようにする
// （ストア側の自動同期は従来どおり .catch で受け流す）
async function upsertLycorisState(machine: LycorisMachine) {
  if (!supabase) return;
  const { error } = await supabase.from('lycoris_state').upsert({
    machine_id: machine.id,
    bell: machine.bell,
    weak_lycoris: machine.weakLycoris,
    weak_lycoris_koukaku: machine.weakLycorisKoukaku,
    start_game: machine.startGame,
    current_game: machine.currentGame,
    events: machine.events,
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
  if (error) throw error;
}

// ========================================
// MonkeyTurn: History
// ========================================

export async function upsertHistoryEntry(machineId: string, entry: HistoryEntry) {
  if (!supabase) return;
  await supabase.from('history_entries').upsert({
    id: entry.id,
    machine_id: machineId,
    timestamp: new Date(entry.timestamp).toISOString(),
    total_games: entry.totalGames,
    five_card_total: entry.fiveCardTotal,
    probability: entry.probability,
    setting_analysis: entry.settingAnalysis,
  });
}

export async function deleteHistoryEntryRemote(entryId: string) {
  if (!supabase) return;
  await supabase.from('history_entries').delete().eq('id', entryId);
}

// ========================================
// Hokuto: State
// ========================================

async function upsertHokutoState(machine: HokutoMachine) {
  if (!supabase) return;
  await supabase.from('hokuto_state').upsert({
    machine_id: machine.id,
    total_games: machine.totalGames,
    total_abeshi: machine.totalAbeshi,
    extra_games: machine.extraGames ?? 0,
    reset_status: machine.session.resetStatus,
    session_started_at: new Date(machine.session.startedAt).toISOString(),
    updated_at: new Date(machine.updatedAt).toISOString(),
  });
}

// ========================================
// Hokuto: Logs
// ========================================

export async function upsertHokutoLog(machineId: string, log: HokutoLog) {
  if (!supabase) return;
  await supabase.from('hokuto_logs').upsert({
    id: log.id,
    machine_id: machineId,
    log_type: log.type,
    log_data: log,
    timestamp: new Date(log.timestamp).toISOString(),
  });
}

export async function deleteHokutoLogRemote(logId: string) {
  if (!supabase) return;
  await supabase.from('hokuto_logs').delete().eq('id', logId);
}

// ========================================
// フルシンク（全台を一括アップロード）
// ========================================

export async function syncAllMachines(machines: Machine[]) {
  if (!supabase) return;
  for (const machine of machines) {
    await upsertMachine(machine);

    if (isMonkeyTurn(machine)) {
      for (const entry of machine.history) {
        await upsertHistoryEntry(machine.id, entry);
      }
    } else if (isHokuto(machine)) {
      for (const log of machine.logs) {
        await upsertHokutoLog(machine.id, log);
      }
    }
  }
}

// ========================================
// データロード（Supabase → クライアント）
// ========================================

export async function loadAllMachines(): Promise<Machine[] | null> {
  if (!supabase) return null;

  const { data: machineRows, error } = await supabase
    .from('machines')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !machineRows) return null;

  const machines: Machine[] = [];

  for (const row of machineRows) {
    if (row.machine_type === 'monkey-turn-v') {
      const machine = await loadMonkeyTurnMachine(row);
      if (machine) machines.push(machine);
    } else if (row.machine_type === 'hokuto-tensei2') {
      const machine = await loadHokutoMachine(row);
      if (machine) machines.push(machine);
    } else if (row.machine_type === 'kabaneri') {
      const machine = await loadKabaneriMachine(row);
      if (machine) machines.push(machine);
    } else if (row.machine_type === 'monhan-rise') {
      const machine = await loadMonhanRiseMachine(row);
      if (machine) machines.push(machine);
    } else if (row.machine_type === 'kokaku') {
      const machine = await loadKokakuMachine(row);
      if (machine) machines.push(machine);
    } else if (row.machine_type === 'lycoris-recoil') {
      const machine = await loadLycorisMachine(row);
      if (machine) machines.push(machine);
    }
  }

  return machines;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadLycorisMachine(row: any): Promise<LycorisMachine | null> {
  if (!supabase) return null;

  const { data: stateRow, error } = await supabase
    .from('lycoris_state')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  // 行が無い（PGRST116）だけは空の台として読む。それ以外の失敗（通信エラー・テーブル未作成）で
  // 空の台を返すと、ダウンロードがローカルの記録を空で置き換え、次の自動同期でクラウドも消える。
  // カバネリと同じく、黙って [] を返さずに失敗させる。
  if (error && error.code !== 'PGRST116') throw error;

  return {
    id: row.id,
    machineType: 'lycoris-recoil',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    bell: normalizeLycorisCount(stateRow?.bell),
    weakLycoris: normalizeLycorisCount(stateRow?.weak_lycoris),
    weakLycorisKoukaku: normalizeLycorisCount(stateRow?.weak_lycoris_koukaku),
    startGame: normalizeLycorisGame(stateRow?.start_game),
    currentGame: normalizeLycorisGame(stateRow?.current_game),
    events: normalizeLycorisEvents(stateRow?.events),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadKokakuMachine(row: any): Promise<KokakuMachine | null> {
  if (!supabase) return null;

  const { data: stateRow } = await supabase
    .from('kokaku_state')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  return {
    id: row.id,
    machineType: 'kokaku',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    events: normalizeKokakuEvents(stateRow?.events),
    currentGame: stateRow?.current_game || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadMonkeyTurnMachine(row: any): Promise<MonkeyTurnMachine | null> {
  if (!supabase) return null;

  const { data: counterRow } = await supabase
    .from('machine_counters')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  const { data: historyRows } = await supabase
    .from('history_entries')
    .select('*')
    .eq('machine_id', row.id)
    .order('timestamp', { ascending: true });

  return {
    id: row.id,
    machineType: 'monkey-turn-v',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    counters: counterRow?.counters || {},
    totalGames: counterRow?.total_games || 0,
    history: (historyRows || []).map((h) => ({
      id: h.id,
      timestamp: new Date(h.timestamp).getTime(),
      totalGames: h.total_games,
      fiveCardTotal: h.five_card_total,
      probability: h.probability,
      settingAnalysis: h.setting_analysis,
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadKabaneriMachine(row: any): Promise<KabaneriMachine | null> {
  if (!supabase) return null;

  const { data: counterRow, error } = await supabase
    .from('machine_counters')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (counterRow && !Object.hasOwn(counterRow, 'kabaneri_events')) {
    throw new Error('CZ履歴のクラウド保存にはデータベースの更新が必要です。');
  }

  return {
    id: row.id,
    machineType: 'kabaneri',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    counters: counterRow?.counters || createInitialKabaneriCounters(),
    czEvents: normalizeKabaneriCzEvents(counterRow?.kabaneri_events),
    totalGames: counterRow?.total_games || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadMonhanRiseMachine(row: any): Promise<MonhanRiseMachine | null> {
  if (!supabase) return null;

  const { data: stateRow } = await supabase
    .from('monhan_rise_state')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  return {
    id: row.id,
    machineType: 'monhan-rise',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    counters: stateRow?.counters || createInitialMonhanRiseCounters(),
    events: (stateRow?.events as MonhanRiseEvent[] | undefined) || [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadHokutoMachine(row: any): Promise<HokutoMachine | null> {
  if (!supabase) return null;

  const { data: stateRow } = await supabase
    .from('hokuto_state')
    .select('*')
    .eq('machine_id', row.id)
    .single();

  const { data: logRows } = await supabase
    .from('hokuto_logs')
    .select('*')
    .eq('machine_id', row.id)
    .order('timestamp', { ascending: true });

  return {
    id: row.id,
    machineType: 'hokuto-tensei2',
    name: row.name,
    number: row.number || '',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    session: {
      resetStatus: stateRow?.reset_status || 'unknown',
      startedAt: stateRow ? new Date(stateRow.session_started_at).getTime() : Date.now(),
    },
    logs: (logRows || []).map((l) => l.log_data as HokutoLog),
    totalGames: stateRow?.total_games || 0,
    totalAbeshi: stateRow?.total_abeshi || 0,
    extraGames: stateRow?.extra_games || 0,
    denshoHelper: createInitialDenshoHelperState(),
    denshoCurrentGame: 0,
  };
}
