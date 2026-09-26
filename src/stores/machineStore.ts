import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Machine,
  MonkeyTurnMachine,
  HokutoMachine,
  KabaneriMachine,
  KabaneriChanceType,
  KabaneriAnalysisTargets,
  KabaneriChanceInput,
  KabaneriCzCharacter,
  KabaneriCzEvent,
  MonhanRiseMachine,
  MonhanRiseEvent,
  MonhanRiseEventInput,
  KokakuMachine,
  KokakuEvent,
  KokakuEventInput,
  MachineType,
  HistoryEntry,
  SettingAnalysis,
  HokutoLog,
  ResetStatus,
  DenshoEvent,
} from '../types';
import { createInitialCounters, fiveCardIds } from '../data/koyakuDefinitions';
import { applyChanceCounterDelta, czTriggerCandidates, flashCounterDelta, normalizeKabaneriCzEvents, NORMAL_CONDITIONS } from '../utils/kabaneriCz';
import {
  createInitialKabaneriCounters,
  chanceDefinitions,
  normalizeKabaneriAnalysisTargets,
} from '../data/kabaneriDefinitions';
import {
  createInitialMonhanRiseCounters,
  WEAK_RARE_KEY,
  RIZE_ZONE_KEY,
} from '../data/monhanRiseDefinitions';
import { normalizeKokakuEvents } from '../data/kokakuDefinitions';
import { calculateSettingProbabilities } from '../utils/binomialDistribution';
import {
  createInitialDenshoHelperState,
  applyEvent as applyDenshoEvent,
  undoLastEvent as undoLastDenshoEventFn,
  deleteEventAt as deleteDenshoEventAtFn,
  rebuildHelperFromEvents,
} from '../utils/denshoEstimation';
import {
  upsertMachine,
  deleteMachineRemote,
  upsertHistoryEntry,
  deleteHistoryEntryRemote,
  upsertHokutoLog,
  deleteHokutoLogRemote,
  syncAllMachines,
  loadAllMachines,
} from '../lib/supabaseSync';

/**
 * localStorage のスキーマ版。**バージョンを上げるときは migrate の分岐を同じ変更で書くこと。**
 * 2回に分けると、dev サーバー稼働中の HMR が分岐の無い新バージョンを先に刻んでしまい、
 * その端末では二度と移行が走らなくなる（v7 で実際に起きた。v8 の分岐コメント参照）。
 */
export const STORE_VERSION = 13;

// ========================================
// 型ガード
// ========================================

export function isMonkeyTurnMachine(m: Machine): m is MonkeyTurnMachine {
  return m.machineType === 'monkey-turn-v';
}

export function isHokutoMachine(m: Machine): m is HokutoMachine {
  return m.machineType === 'hokuto-tensei2';
}

export function isKabaneriMachine(m: Machine): m is KabaneriMachine {
  return m.machineType === 'kabaneri';
}

export function isMonhanRiseMachine(m: Machine): m is MonhanRiseMachine {
  return m.machineType === 'monhan-rise';
}

export function isKokakuMachine(m: Machine): m is KokakuMachine {
  return m.machineType === 'kokaku';
}

/**
 * セッション通算のゲーム数を返す。`updateTotalGames` と対になる getter。
 *
 * モンハンライズは4軸のいずれもゲーム数を使わないため totalGames を持たない。
 * **攻殻機動隊もここには含めない。** あちらの `currentGame` はサイクル内の
 * 液晶G数で通算ではなく、専用の `updateKokakuCurrentGame` で書く。
 * ここで読めるようにすると setter と非対称になり、
 * GameInputModal から読めて書けない状態になる。
 */
export function getMachineTotalGames(m: Machine | null): number {
  if (!m) return 0;
  return isMonkeyTurnMachine(m) || isKabaneriMachine(m) ? m.totalGames : 0;
}

// ========================================
// ストア型定義
// ========================================

interface MachineStore {
  machines: Machine[];
  currentMachineId: string | null;
  /** 台ごとの推測表示設定。この端末のみで保存し、クラウドの遊技記録とは分離。 */
  kabaneriAnalysisTargets: Record<string, KabaneriAnalysisTargets>;
  setKabaneriAnalysisTarget: (target: keyof KabaneriAnalysisTargets, enabled: boolean) => void;
  showLogEntry: boolean;
  setShowLogEntry: (show: boolean) => void;
  showShutterModal: boolean;
  setShowShutterModal: (show: boolean) => void;
  showTenhaModal: boolean;
  setShowTenhaModal: (show: boolean) => void;

  // Getters
  getCurrentMachine: () => Machine | null;
  getFiveCardTotal: () => number;

  // Machine Actions（共通）
  addMachine: (type?: MachineType) => void;
  selectMachine: (id: string) => void;
  updateMachineName: (id: string, name: string) => void;
  updateMachineNumber: (id: string, number: string) => void;
  deleteMachine: (id: string) => void;

  // MonkeyTurn: Counter Actions
  incrementCounter: (koyakuId: string) => void;
  decrementCounter: (koyakuId: string) => void;

  // MonkeyTurn: Game Actions
  updateTotalGames: (games: number) => void;
  addHistoryEntry: () => void;
  deleteHistoryEntry: (entryId: string) => void;

  // MonkeyTurn: Reset
  resetCurrentMachine: () => void;

  // Hokuto: Session
  setSessionResetStatus: (status: ResetStatus) => void;

  // Hokuto: Logs
  addHokutoLog: (log: HokutoLog) => void;
  updateHokutoLog: (log: HokutoLog) => void;
  deleteHokutoLog: (logId: string) => void;

  // Hokuto: Game state
  updateHokutoGameState: (games: number, abeshi: number) => void;
  updateExtraGames: (extra: number) => void;
  updateDenshoCurrentGame: (game: number) => void;

  // Hokuto: Reset
  resetHokutoMachine: () => void;

  // Hokuto: Densho Helper
  addDenshoEvent: (event: DenshoEvent) => void;
  undoLastDenshoEvent: () => void;
  resetDenshoHelper: () => void;
  deleteDenshoEventAt: (index: number) => void;

  // Kabaneri: Counter Actions
  incrementKabaneriCounter: (counterId: string) => void;
  decrementKabaneriCounter: (counterId: string) => void;
  incrementKabaneriFlash: (chanceId: KabaneriChanceType) => void;
  decrementKabaneriFlash: (chanceId: KabaneriChanceType) => void;
  recordKabaneriChance: (input: KabaneriChanceInput) => void;
  recordKabaneriCz: (character: KabaneriCzCharacter, triggerId: string | null, doran: boolean) => void;
  startKabaneriCzTracking: (fromZero: boolean) => void;
  deleteKabaneriCzEvent: (id: string) => void;

  // Kabaneri: Reset
  resetKabaneriMachine: () => void;

  // MonhanRise: 軸1 カウンター
  incrementMonhanRiseWeakRare: () => void;
  decrementMonhanRiseWeakRare: () => void;
  incrementMonhanRiseRize: () => void;
  decrementMonhanRiseRize: () => void;

  // MonhanRise: 軸2〜4 イベント
  addMonhanRiseEvent: (input: MonhanRiseEventInput) => void;
  insertMonhanRiseEventAt: (index: number, input: MonhanRiseEventInput) => void;
  updateMonhanRiseEventAt: (index: number, input: MonhanRiseEventInput) => void;
  undoLastMonhanRiseEvent: () => void;
  deleteMonhanRiseEventAt: (index: number) => void;

  // MonhanRise: Reset
  resetMonhanRiseMachine: () => void;

  // Kokaku: 現在ゲーム数・イベント列
  updateKokakuCurrentGame: (game: number) => void;
  addKokakuEvent: (input: KokakuEventInput) => void;
  insertKokakuEventAt: (index: number, input: KokakuEventInput) => void;
  updateKokakuEventAt: (index: number, input: KokakuEventInput) => void;
  deleteKokakuEventAt: (index: number) => void;
  resetKokakuMachine: () => void;

  // Supabase同期
  syncToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<boolean>;
}

// ========================================
// ファクトリ
// ========================================

function createNewMonkeyTurnMachine(name: string): MonkeyTurnMachine {
  return {
    id: uuidv4(),
    machineType: 'monkey-turn-v',
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    counters: createInitialCounters(),
    history: [],
    totalGames: 0,
  };
}

function createNewHokutoMachine(name: string): HokutoMachine {
  return {
    id: uuidv4(),
    machineType: 'hokuto-tensei2',
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    session: {
      resetStatus: 'unknown',
      startedAt: Date.now(),
    },
    logs: [],
    totalGames: 0,
    totalAbeshi: 0,
    extraGames: 0,
    denshoHelper: createInitialDenshoHelperState(),
    denshoCurrentGame: 0,
  };
}

function createNewKabaneriMachine(name: string): KabaneriMachine {
  return {
    id: uuidv4(),
    machineType: 'kabaneri',
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    counters: createInitialKabaneriCounters(),
    czEvents: [],
    totalGames: 0,
  };
}

function createNewMonhanRiseMachine(name: string): MonhanRiseMachine {
  return {
    id: uuidv4(),
    machineType: 'monhan-rise',
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    counters: createInitialMonhanRiseCounters(),
    events: [],
  };
}

function createNewKokakuMachine(name: string): KokakuMachine {
  return {
    id: uuidv4(),
    machineType: 'kokaku',
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    events: [],
    currentGame: 0,
  };
}

const MACHINE_FACTORIES: Record<MachineType, (name: string) => Machine> = {
  'monkey-turn-v': createNewMonkeyTurnMachine,
  'hokuto-tensei2': createNewHokutoMachine,
  kabaneri: createNewKabaneriMachine,
  'monhan-rise': createNewMonhanRiseMachine,
  kokaku: createNewKokakuMachine,
};

// ========================================
// ヘルパー: 現在の台を更新
// ========================================

type MachineUpdater = (m: Machine) => Machine;

function updateCurrentMachine(
  state: { machines: Machine[]; currentMachineId: string | null },
  updater: MachineUpdater
) {
  return {
    machines: state.machines.map((m) =>
      m.id === state.currentMachineId ? updater(m) : m
    ),
  };
}

// ========================================
// ヘルパー: バックグラウンド同期（fire-and-forget）
// ========================================

function syncCurrentMachine(get: () => MachineStore) {
  const machine = get().getCurrentMachine();
  if (machine) upsertMachine(machine).catch(() => {});
}

// ========================================
// ストア
// ========================================

export const useMachineStore = create<MachineStore>()(
  persist(
    (set, get) => ({
      machines: [],
      currentMachineId: null,
      kabaneriAnalysisTargets: {},
      setKabaneriAnalysisTarget: (target, enabled) => {
        const machine = get().getCurrentMachine();
        if (!machine || !isKabaneriMachine(machine)) return;
        set((state) => ({
          kabaneriAnalysisTargets: {
            ...state.kabaneriAnalysisTargets,
            [machine.id]: {
              ...normalizeKabaneriAnalysisTargets(state.kabaneriAnalysisTargets[machine.id]),
              [target]: enabled,
            },
          },
        }));
      },
      showLogEntry: false,
      setShowLogEntry: (show: boolean) => set({ showLogEntry: show }),
      showShutterModal: false,
      setShowShutterModal: (show: boolean) => set({ showShutterModal: show }),
      showTenhaModal: false,
      setShowTenhaModal: (show: boolean) => set({ showTenhaModal: show }),

      // --- Getters ---

      getCurrentMachine: () => {
        const { machines, currentMachineId } = get();
        if (!currentMachineId) return null;
        return machines.find((m) => m.id === currentMachineId) || null;
      },

      getFiveCardTotal: () => {
        const machine = get().getCurrentMachine();
        if (!machine || !isMonkeyTurnMachine(machine)) return 0;
        return fiveCardIds.reduce(
          (sum, id) => sum + (machine.counters[id] || 0),
          0
        );
      },

      // --- Machine Actions（共通） ---

      addMachine: (type: MachineType = 'monkey-turn-v') => {
        const { machines } = get();
        const name = `台${machines.length + 1}`;
        const newMachine = MACHINE_FACTORIES[type](name);
        set({
          machines: [...machines, newMachine],
          currentMachineId: newMachine.id,
        });
        upsertMachine(newMachine).catch(() => {});
      },

      selectMachine: (id: string) => {
        set({ currentMachineId: id || null });
      },

      updateMachineName: (id: string, name: string) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === id ? { ...m, name, updatedAt: Date.now() } : m
          ),
        }));
        const machine = get().machines.find((m) => m.id === id);
        if (machine) upsertMachine(machine).catch(() => {});
      },

      updateMachineNumber: (id: string, number: string) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === id ? { ...m, number, updatedAt: Date.now() } : m
          ),
        }));
        const machine = get().machines.find((m) => m.id === id);
        if (machine) upsertMachine(machine).catch(() => {});
      },

      deleteMachine: (id: string) => {
        const { machines, currentMachineId } = get();
        const kabaneriAnalysisTargets = { ...get().kabaneriAnalysisTargets };
        delete kabaneriAnalysisTargets[id];
        const filteredMachines = machines.filter((m) => m.id !== id);
        const newCurrentId =
          currentMachineId === id
            ? filteredMachines[0]?.id || null
            : currentMachineId;
        set({
          machines: filteredMachines,
          currentMachineId: newCurrentId,
          kabaneriAnalysisTargets,
        });
        deleteMachineRemote(id).catch(() => {});
      },

      // --- MonkeyTurn: Counter Actions ---

      incrementCounter: (koyakuId: string) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [koyakuId]: (m.counters[koyakuId] || 0) + 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      decrementCounter: (koyakuId: string) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            const currentValue = m.counters[koyakuId] || 0;
            if (currentValue <= 0) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [koyakuId]: currentValue - 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // --- MonkeyTurn: Game Actions ---

      updateTotalGames: (games: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m) && !isKabaneriMachine(m)) return m;
            return { ...m, totalGames: games, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      addHistoryEntry: () => {
        const machine = get().getCurrentMachine();
        if (!machine || !isMonkeyTurnMachine(machine)) return;

        const fiveCardTotal = get().getFiveCardTotal();
        const probability =
          machine.totalGames > 0 ? machine.totalGames / fiveCardTotal : null;
        const settingAnalysis: SettingAnalysis =
          machine.totalGames > 0 && fiveCardTotal > 0
            ? calculateSettingProbabilities(fiveCardTotal, machine.totalGames)
            : {
                setting1: 0,
                setting2: 0,
                setting4: 0,
                setting5: 0,
                setting6: 0,
              };

        const entry: HistoryEntry = {
          id: uuidv4(),
          timestamp: Date.now(),
          totalGames: machine.totalGames,
          fiveCardTotal,
          probability,
          settingAnalysis,
        };

        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            return {
              ...m,
              history: [...m.history, entry],
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        const machineId = get().currentMachineId;
        if (machineId) upsertHistoryEntry(machineId, entry).catch(() => {});
      },

      deleteHistoryEntry: (entryId: string) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            return {
              ...m,
              history: m.history.filter((h) => h.id !== entryId),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        deleteHistoryEntryRemote(entryId).catch(() => {});
      },

      resetCurrentMachine: () => {
        const machineId = get().currentMachineId;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            return {
              ...m,
              counters: createInitialCounters(),
              history: [],
              totalGames: 0,
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        // リセット時はSupabase側の履歴も削除（machineを再upsertで対応）
        if (machineId) deleteMachineRemote(machineId).then(() => {
          const machine = get().getCurrentMachine();
          if (machine) upsertMachine(machine).catch(() => {});
        }).catch(() => {});
      },

      // --- Hokuto: Session ---

      setSessionResetStatus: (status: ResetStatus) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              session: { ...m.session, resetStatus: status },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // --- Hokuto: Logs ---

      addHokutoLog: (log: HokutoLog) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              logs: [...m.logs, log],
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        const machineId = get().currentMachineId;
        if (machineId) upsertHokutoLog(machineId, log).catch(() => {});
      },

      updateHokutoLog: (log: HokutoLog) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              logs: m.logs.map((l) => (l.id === log.id ? log : l)),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        const machineId = get().currentMachineId;
        if (machineId) upsertHokutoLog(machineId, log).catch(() => {});
      },

      deleteHokutoLog: (logId: string) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              logs: m.logs.filter((l) => l.id !== logId),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        deleteHokutoLogRemote(logId).catch(() => {});
      },

      // --- Hokuto: Game state ---

      updateHokutoGameState: (games: number, abeshi: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              totalGames: games,
              totalAbeshi: abeshi,
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      updateExtraGames: (extra: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return { ...m, extraGames: extra, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      updateDenshoCurrentGame: (game: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return { ...m, denshoCurrentGame: Math.max(0, game), updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      // --- Hokuto: Reset ---

      resetHokutoMachine: () => {
        const machineId = get().currentMachineId;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              session: { resetStatus: 'unknown', startedAt: Date.now() },
              logs: [],
              totalGames: 0,
              totalAbeshi: 0,
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
        if (machineId) deleteMachineRemote(machineId).then(() => {
          const machine = get().getCurrentMachine();
          if (machine) upsertMachine(machine).catch(() => {});
        }).catch(() => {});
      },

      // --- Hokuto: Densho Helper ---

      addDenshoEvent: (event: DenshoEvent) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            // 古いロジックで書き込まれた state が localStorage に残っている可能性があるため、
            // events から再構築した fresh state を起点に新イベントを適用する(drift 防止)。
            const fresh = rebuildHelperFromEvents(m.denshoHelper.events);
            const next = applyDenshoEvent(fresh, event);
            return { ...m, denshoHelper: next, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      undoLastDenshoEvent: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            const next = undoLastDenshoEventFn(m.denshoHelper);
            return { ...m, denshoHelper: next, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      resetDenshoHelper: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            return {
              ...m,
              denshoHelper: createInitialDenshoHelperState(),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      deleteDenshoEventAt: (index: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isHokutoMachine(m)) return m;
            const next = deleteDenshoEventAtFn(m.denshoHelper, index);
            return { ...m, denshoHelper: next, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      // --- Kabaneri: Counter Actions ---

      incrementKabaneriCounter: (counterId: string) => {
        const chance = chanceDefinitions.find((d) => d.countKey === counterId);
        if (chance) {
          get().recordKabaneriChance({ type: 'chance', role: chance.id, conditions: { ...NORMAL_CONDITIONS }, flash: 'none', flashEligible: true });
          return;
        }
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKabaneriMachine(m)) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [counterId]: (m.counters[counterId] || 0) + 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      decrementKabaneriCounter: (counterId: string) => {
        const currentMachine = get().getCurrentMachine();
        if (currentMachine && isKabaneriMachine(currentMachine)) {
          const event = [...(currentMachine.czEvents ?? [])].reverse().find((e) => e.type === 'chance' &&
            e.role === counterId && e.flash === 'none' && flashCounterDelta(e)[counterId] === 1);
          if (event) { get().deleteKabaneriCzEvent(event.id); return; }
        }
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKabaneriMachine(m)) return m;
            const current = m.counters[counterId] || 0;
            if (current <= 0) return m;
            // チャンス目の成立数は発光数を下回らないようにする
            const def = chanceDefinitions.find((d) => d.countKey === counterId);
            const floor = def ? m.counters[def.flashKey] || 0 : 0;
            if (current <= floor) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [counterId]: current - 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // 発光カウント: 発光したチャンス目は成立も同時に+1する
      incrementKabaneriFlash: (chanceId: KabaneriChanceType) => {
        get().recordKabaneriChance({ type: 'chance', role: chanceId, conditions: { ...NORMAL_CONDITIONS }, flash: 'yes', flashEligible: true });
      },

      decrementKabaneriFlash: (chanceId: KabaneriChanceType) => {
        const def = chanceDefinitions.find((d) => d.id === chanceId);
        if (!def) return;
        const currentMachine = get().getCurrentMachine();
        if (currentMachine && isKabaneriMachine(currentMachine)) {
          const event = [...(currentMachine.czEvents ?? [])].reverse().find((e) => e.type === 'chance' &&
            e.role === chanceId && e.flash === 'yes' && flashCounterDelta(e)[def.flashKey] === 1);
          if (event) { get().deleteKabaneriCzEvent(event.id); return; }
        }
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKabaneriMachine(m)) return m;
            const flashCount = m.counters[def.flashKey] || 0;
            if (flashCount <= 0) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [def.countKey]: Math.max(0, (m.counters[def.countKey] || 0) - 1),
                [def.flashKey]: flashCount - 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      recordKabaneriChance: (input) => {
        const machine = get().getCurrentMachine();
        if (!machine || !isKabaneriMachine(machine)) return;
        const event: KabaneriCzEvent = { ...input, id: uuidv4(), timestamp: Date.now() };
        if (!normalizeKabaneriCzEvents([event]).length) return;
        set((state) => updateCurrentMachine(state, (m) => !isKabaneriMachine(m) ? m : ({
          ...m, counters: applyChanceCounterDelta(m.counters, input, 1),
          czEvents: [...(m.czEvents ?? []), event], updatedAt: event.timestamp,
        })));
        syncCurrentMachine(get);
      },

      recordKabaneriCz: (character, triggerId, doran) => {
        const machine = get().getCurrentMachine();
        if (!machine || !isKabaneriMachine(machine) || !['mumei', 'ikoma'].includes(character)) return;
        const events = machine.czEvents ?? [];
        if (triggerId !== null && !czTriggerCandidates(events, character).some((e) => e.id === triggerId)) return;
        const index = triggerId === null ? events.length : events.findIndex((e) => e.id === triggerId) + 1;
        const event: KabaneriCzEvent = { type: 'cz', character, doran, id: uuidv4(), timestamp: Date.now() };
        const next = [...events];
        next.splice(index, 0, event);
        set((state) => updateCurrentMachine(state, (m) => !isKabaneriMachine(m) ? m : ({
          ...m, czEvents: next, updatedAt: event.timestamp,
        })));
        syncCurrentMachine(get);
      },

      startKabaneriCzTracking: (fromZero) => {
        const machine = get().getCurrentMachine();
        if (!machine || !isKabaneriMachine(machine)) return;
        const event: KabaneriCzEvent = { type: 'start', initialPoints: { mumei: fromZero ? 0 : null, ikoma: fromZero ? 0 : null }, id: uuidv4(), timestamp: Date.now() };
        set((state) => updateCurrentMachine(state, (m) => !isKabaneriMachine(m) ? m : ({
          ...m, czEvents: [...(m.czEvents ?? []), event], updatedAt: event.timestamp,
        })));
        syncCurrentMachine(get);
      },

      deleteKabaneriCzEvent: (id) => {
        const machine = get().getCurrentMachine();
        if (!machine || !isKabaneriMachine(machine)) return;
        const event = (machine.czEvents ?? []).find((e) => e.id === id);
        if (!event) return;
        set((state) => updateCurrentMachine(state, (m) => !isKabaneriMachine(m) ? m : ({
          ...m, counters: event.type === 'chance' ? applyChanceCounterDelta(m.counters, event, -1) : m.counters,
          czEvents: (m.czEvents ?? []).filter((e) => e.id !== id), updatedAt: Date.now(),
        })));
        syncCurrentMachine(get);
      },

      // --- Kabaneri: Reset ---

      resetKabaneriMachine: () => {
        const previous = get().getCurrentMachine();
        if (!previous || !isKabaneriMachine(previous)) return;
        const next = { ...createNewKabaneriMachine(previous.name), number: previous.number };
        set((state) => ({
          machines: [...state.machines, next],
          currentMachineId: next.id,
          kabaneriAnalysisTargets: {
            ...state.kabaneriAnalysisTargets,
            [next.id]: normalizeKabaneriAnalysisTargets(state.kabaneriAnalysisTargets[previous.id]),
          },
        }));
        // 過去の記録を削除・上書きしない。画面移動後も固定した2つのIDへ保存する。
        // 通信に失敗しても両記録がローカルに残り、手動一括同期で再送できる。
        upsertMachine(previous).catch(() => {});
        upsertMachine(next).catch(() => {});
      },

      // --- MonhanRise: 軸1 カウンター ---
      // weakRare が分母、rizeZone が分子。ただし2つのボタンは完全に独立しており、
      // 当選時は「弱レア役」と「ライズゾーン」の両方を押す運用。

      incrementMonhanRiseWeakRare: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [WEAK_RARE_KEY]: (m.counters[WEAK_RARE_KEY] || 0) + 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      decrementMonhanRiseWeakRare: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            const current = m.counters[WEAK_RARE_KEY] || 0;
            if (current <= 0) return m;
            return {
              ...m,
              counters: { ...m.counters, [WEAK_RARE_KEY]: current - 1 },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      incrementMonhanRiseRize: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [RIZE_ZONE_KEY]: (m.counters[RIZE_ZONE_KEY] || 0) + 1,
              },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      decrementMonhanRiseRize: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            const rize = m.counters[RIZE_ZONE_KEY] || 0;
            if (rize <= 0) return m;
            return {
              ...m,
              counters: { ...m.counters, [RIZE_ZONE_KEY]: rize - 1 },
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // --- MonhanRise: 軸2〜4 イベント ---
      // 順序が推定に影響する(軸3/軸4 は隠れマルコフ)ため、末尾追加と添字削除のみを許す。

      addMonhanRiseEvent: (input: MonhanRiseEventInput) => {
        const event = {
          ...input,
          id: uuidv4(),
          timestamp: Date.now(),
        } as MonhanRiseEvent;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            return {
              ...m,
              events: [...m.events, event],
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // グリッドの空きセルをタップして途中に差し込む
      insertMonhanRiseEventAt: (index: number, input: MonhanRiseEventInput) => {
        const event = {
          ...input,
          id: uuidv4(),
          timestamp: Date.now(),
        } as MonhanRiseEvent;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            const at = Math.max(0, Math.min(index, m.events.length));
            return {
              ...m,
              events: [
                ...m.events.slice(0, at),
                event,
                ...m.events.slice(at),
              ],
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // グリッドの入力済みセルをタップして値を訂正する（id と時刻は元のまま）
      updateMonhanRiseEventAt: (index: number, input: MonhanRiseEventInput) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            const current = m.events[index];
            if (!current) return m;
            const next = {
              ...input,
              id: current.id,
              timestamp: current.timestamp,
            } as MonhanRiseEvent;
            return {
              ...m,
              events: m.events.map((e, i) => (i === index ? next : e)),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      undoLastMonhanRiseEvent: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m) || m.events.length === 0) return m;
            return {
              ...m,
              events: m.events.slice(0, -1),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      deleteMonhanRiseEventAt: (index: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            if (index < 0 || index >= m.events.length) return m;
            return {
              ...m,
              events: m.events.filter((_, i) => i !== index),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // --- MonhanRise: Reset ---

      resetMonhanRiseMachine: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonhanRiseMachine(m)) return m;
            return {
              ...m,
              counters: createInitialMonhanRiseCounters(),
              events: [],
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      // --- Kokaku: 現在G・イベント列 ---
      // 順序がモード抽選テーブルの切り替えを決めるため、
      // 追加は末尾または明示した添字、削除は添字指定のみを許す。

      updateKokakuCurrentGame: (game: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            return { ...m, currentGame: Math.max(0, Math.floor(game)), updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      addKokakuEvent: (input: KokakuEventInput) => {
        const event = { ...input, id: uuidv4(), timestamp: Date.now() } as KokakuEvent;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            return {
              ...m,
              events: [...m.events, event],
              // サイクルを締めると通常時のゲーム数は0に戻る。
              // 締めた行の到達Gは cycle-end.endGame に残るので観測は失われない。
              // 途中の行を訂正する updateKokakuEventAt では現在Gを触らない。
              currentGame: event.type === 'cycle-end' ? 0 : m.currentGame,
              updatedAt: event.timestamp,
            };
          })
        );
        syncCurrentMachine(get);
      },

      insertKokakuEventAt: (index: number, input: KokakuEventInput) => {
        const event = { ...input, id: uuidv4(), timestamp: Date.now() } as KokakuEvent;
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            const at = Math.max(0, Math.min(index, m.events.length));
            return {
              ...m,
              events: [...m.events.slice(0, at), event, ...m.events.slice(at)],
              updatedAt: event.timestamp,
            };
          })
        );
        syncCurrentMachine(get);
      },

      // 値の訂正。id と時刻は元のまま残す
      updateKokakuEventAt: (index: number, input: KokakuEventInput) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            const current = m.events[index];
            if (!current) return m;
            const next = { ...input, id: current.id, timestamp: current.timestamp } as KokakuEvent;
            return {
              ...m,
              events: m.events.map((e, i) => (i === index ? next : e)),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      deleteKokakuEventAt: (index: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            if (index < 0 || index >= m.events.length) return m;
            return {
              ...m,
              events: m.events.filter((_, i) => i !== index),
              updatedAt: Date.now(),
            };
          })
        );
        syncCurrentMachine(get);
      },

      resetKokakuMachine: () => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isKokakuMachine(m)) return m;
            return { ...m, events: [], currentGame: 0, updatedAt: Date.now() };
          })
        );
        syncCurrentMachine(get);
      },

      // --- Supabase同期 ---

      syncToSupabase: async () => {
        const { machines } = get();
        await syncAllMachines(machines);
      },

      loadFromSupabase: async () => {
        const machines = await loadAllMachines();
        if (!machines) return false;
        set({
          machines,
          currentMachineId: null,
        });
        return true;
      },
    }),
    {
      name: 'slot-counter-storage',
      version: STORE_VERSION,
      partialize: (state) => {
        // currentMachineId を永続化しない → 常にTOP画面から開始
        return { ...state, currentMachineId: undefined };
      },
      migrate: (persisted: unknown, version: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persisted as any;
        if (version < 2 && state.machines) {
          // 既存データに machineType を付与
          state.machines = state.machines.map((m: Record<string, unknown>) => ({
            ...m,
            machineType: m.machineType || 'monkey-turn-v',
          }));
        }
        if (version < 3 && state.machines) {
          // Hokuto 台に denshoHelper を初期化
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType === 'hokuto-tensei2' && !m.denshoHelper) {
              return { ...m, denshoHelper: createInitialDenshoHelperState() };
            }
            return m;
          });
        }
        if (version < 4 && state.machines) {
          // denshoHelper に pendingMisses を追加(16G 遅延 miss 用)
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType === 'hokuto-tensei2' && m.denshoHelper) {
              const dh = m.denshoHelper as Record<string, unknown>;
              if (!dh.pendingMisses) {
                return { ...m, denshoHelper: { ...dh, pendingMisses: [] } };
              }
            }
            return m;
          });
        }
        if (version < 5 && state.machines) {
          // 伝承推測補助タブ専用の denshoCurrentGame を追加(2タブ G 管理独立化)
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType === 'hokuto-tensei2' && m.denshoCurrentGame === undefined) {
              return { ...m, denshoCurrentGame: 0 };
            }
            return m;
          });
        }
        if (version < 6 && state.machines) {
          // モンハンライズ追加。既存台は影響を受けないが、
          // 万一 events / counters を欠く monhan-rise 台があれば補完する。
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType !== 'monhan-rise') return m;
            return {
              ...m,
              counters: m.counters ?? createInitialMonhanRiseCounters(),
              events: m.events ?? [],
            };
          });
        }
        if (version < 8 && state.machines) {
          // at-hit の questCount を廃止し、当選契機(route)へ移行。
          // クエスト回数は quest イベントの件数から導出するようになったため、
          // 旧データは「クエストで当選」とみなして route を補う。
          //
          // v7 で同じ変換を入れたが、開発中に route 補完の無い v7 でリハイドレートが
          // 走った端末は version=7 のまま questCount が残り、二度と変換されなくなった。
          // v8 で必ず1回は流れるようにやり直す。冪等なので重複実行しても害はない。
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType !== 'monhan-rise' || !Array.isArray(m.events)) {
              return m;
            }
            const events = (m.events as Record<string, unknown>[]).map((e) => {
              if (e.type !== 'at-hit') return e;
              if (e.route === 'quest' || e.route === 'cz' || e.route === 'direct') {
                return e;
              }
              // questCount は捨て、必要なフィールドだけを詰め直す
              return {
                type: e.type,
                id: e.id,
                timestamp: e.timestamp,
                route: 'quest',
              };
            });
            return { ...m, events };
          });
        }
        if (version < 9 && state.machines) {
          // リセットを「朝一 / 有利区間切断」の2種類から、
          // ATサイクルごとの二値（リセット回 / 通常回）へ変更。
          // 旧 'reset' イベントは、その行の開始種別を示す 'cycle-start' に読み替える。
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType !== 'monhan-rise' || !Array.isArray(m.events)) {
              return m;
            }
            const events = (m.events as Record<string, unknown>[]).map((e) =>
              e.type === 'reset'
                ? {
                    type: 'cycle-start',
                    id: e.id,
                    timestamp: e.timestamp,
                    reset: e.kind === 'morning',
                  }
                : e
            );
            return { ...m, events };
          });
        }
        if (version < 10) {
          // カウンターはそのまま、端末内の推測項目選択だけを2軸へ移行。
          state.kabaneriAnalysisTargets = Object.fromEntries(
            Object.entries(state.kabaneriAnalysisTargets ?? {}).map(([id, value]) =>
              [id, normalizeKabaneriAnalysisTargets(value)]
            )
          );
        }
        if (version < 11 && state.machines) {
          state.machines = state.machines.map((m: Record<string, unknown>) => m.machineType !== 'kabaneri' ? m : ({
            ...m, czEvents: normalizeKabaneriCzEvents(m.czEvents),
          }));
        }
        if (version < 13 && state.machines) {
          // v12 で攻殻機動隊を追加。v13 では画面イベントの `context`（カタログ）を
          // `occasion`（どの場面で見たか）へ読み替える。
          // normalizeKokakuEvents が両方を面倒見るので、まとめて1回流せばよい。
          state.machines = state.machines.map((m: Record<string, unknown>) => {
            if (m.machineType !== 'kokaku') return m;
            return {
              ...m,
              events: normalizeKokakuEvents(m.events),
              currentGame: typeof m.currentGame === 'number' ? m.currentGame : 0,
            };
          });
        }
        return state;
      },
    }
  )
);

// 初回起動時に台がなければ作成
export function initializeStore() {
  const state = useMachineStore.getState();
  if (state.machines.length === 0) {
    state.addMachine('monkey-turn-v');
  }
}
