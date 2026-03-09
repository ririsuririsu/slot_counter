import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Machine,
  MonkeyTurnMachine,
  HokutoMachine,
  MachineType,
  HistoryEntry,
  SettingAnalysis,
  HokutoLog,
  ResetStatus,
} from '../types';
import { createInitialCounters, fiveCardIds } from '../data/koyakuDefinitions';
import { calculateSettingProbabilities } from '../utils/binomialDistribution';

// ========================================
// 型ガード
// ========================================

export function isMonkeyTurnMachine(m: Machine): m is MonkeyTurnMachine {
  return m.machineType === 'monkey-turn-v';
}

export function isHokutoMachine(m: Machine): m is HokutoMachine {
  return m.machineType === 'hokuto-tensei2';
}

// ========================================
// ストア型定義
// ========================================

interface MachineStore {
  machines: Machine[];
  currentMachineId: string | null;

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

  // Hokuto: Reset
  resetHokutoMachine: () => void;
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
  };
}

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
// ストア
// ========================================

export const useMachineStore = create<MachineStore>()(
  persist(
    (set, get) => ({
      machines: [],
      currentMachineId: null,

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
        const newMachine =
          type === 'hokuto-tensei2'
            ? createNewHokutoMachine(`台${machines.length + 1}`)
            : createNewMonkeyTurnMachine(`台${machines.length + 1}`);
        set({
          machines: [...machines, newMachine],
          currentMachineId: newMachine.id,
        });
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
      },

      updateMachineNumber: (id: string, number: string) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === id ? { ...m, number, updatedAt: Date.now() } : m
          ),
        }));
      },

      deleteMachine: (id: string) => {
        const { machines, currentMachineId } = get();
        const filteredMachines = machines.filter((m) => m.id !== id);
        const newCurrentId =
          currentMachineId === id
            ? filteredMachines[0]?.id || null
            : currentMachineId;
        set({
          machines: filteredMachines,
          currentMachineId: newCurrentId,
        });
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
      },

      // --- MonkeyTurn: Game Actions ---

      updateTotalGames: (games: number) => {
        set((state) =>
          updateCurrentMachine(state, (m) => {
            if (!isMonkeyTurnMachine(m)) return m;
            return { ...m, totalGames: games, updatedAt: Date.now() };
          })
        );
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
      },

      resetCurrentMachine: () => {
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
      },

      // --- Hokuto: Reset ---

      resetHokutoMachine: () => {
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
      },
    }),
    {
      name: 'slot-counter-storage',
      version: 2,
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
