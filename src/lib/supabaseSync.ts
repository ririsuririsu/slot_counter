import { supabase } from './supabase';
import type {
  Machine,
  MonkeyTurnMachine,
  HokutoMachine,
  HistoryEntry,
  HokutoLog,
} from '../types';

// ========================================
// 型ガード
// ========================================

function isMonkeyTurn(m: Machine): m is MonkeyTurnMachine {
  return m.machineType === 'monkey-turn-v';
}

function isHokuto(m: Machine): m is HokutoMachine {
  return m.machineType === 'hokuto-tensei2';
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
    }
  }

  return machines;
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
  };
}
