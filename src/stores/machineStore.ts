import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Machine, HistoryEntry, SettingAnalysis } from '../types';
import { createInitialCounters, fiveCardIds } from '../data/koyakuDefinitions';
import { calculateSettingProbabilities } from '../utils/binomialDistribution';

interface MachineStore {
  machines: Machine[];
  currentMachineId: string | null;

  // Getters
  getCurrentMachine: () => Machine | null;
  getFiveCardTotal: () => number;

  // Machine Actions
  addMachine: () => void;
  selectMachine: (id: string) => void;
  updateMachineName: (id: string, name: string) => void;
  updateMachineNumber: (id: string, number: string) => void;
  deleteMachine: (id: string) => void;

  // Counter Actions
  incrementCounter: (koyakuId: string) => void;
  decrementCounter: (koyakuId: string) => void;

  // Game Actions
  updateTotalGames: (games: number) => void;
  addHistoryEntry: () => void;

  // Reset
  resetCurrentMachine: () => void;
}

function createNewMachine(name: string = '台1'): Machine {
  return {
    id: uuidv4(),
    name,
    number: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    counters: createInitialCounters(),
    history: [],
    totalGames: 0,
  };
}

export const useMachineStore = create<MachineStore>()(
  persist(
    (set, get) => ({
      machines: [],
      currentMachineId: null,

      getCurrentMachine: () => {
        const { machines, currentMachineId } = get();
        if (!currentMachineId) return null;
        return machines.find((m) => m.id === currentMachineId) || null;
      },

      getFiveCardTotal: () => {
        const machine = get().getCurrentMachine();
        if (!machine) return 0;
        return fiveCardIds.reduce(
          (sum, id) => sum + (machine.counters[id] || 0),
          0
        );
      },

      addMachine: () => {
        const { machines } = get();
        const newMachine = createNewMachine(`台${machines.length + 1}`);
        set({
          machines: [...machines, newMachine],
          currentMachineId: newMachine.id,
        });
      },

      selectMachine: (id: string) => {
        set({ currentMachineId: id });
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

      incrementCounter: (koyakuId: string) => {
        set((state) => ({
          machines: state.machines.map((m) => {
            if (m.id !== state.currentMachineId) return m;
            return {
              ...m,
              counters: {
                ...m.counters,
                [koyakuId]: (m.counters[koyakuId] || 0) + 1,
              },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      decrementCounter: (koyakuId: string) => {
        set((state) => ({
          machines: state.machines.map((m) => {
            if (m.id !== state.currentMachineId) return m;
            const currentValue = m.counters[koyakuId] || 0;
            if (currentValue <= 0) return m; // 0未満にしない
            return {
              ...m,
              counters: {
                ...m.counters,
                [koyakuId]: currentValue - 1,
              },
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateTotalGames: (games: number) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === state.currentMachineId
              ? { ...m, totalGames: games, updatedAt: Date.now() }
              : m
          ),
        }));
      },

      addHistoryEntry: () => {
        const machine = get().getCurrentMachine();
        if (!machine) return;

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

        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === state.currentMachineId
              ? { ...m, history: [...m.history, entry], updatedAt: Date.now() }
              : m
          ),
        }));
      },

      resetCurrentMachine: () => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === state.currentMachineId
              ? {
                  ...m,
                  counters: createInitialCounters(),
                  history: [],
                  totalGames: 0,
                  updatedAt: Date.now(),
                }
              : m
          ),
        }));
      },
    }),
    {
      name: 'slot-counter-storage',
    }
  )
);

// 初回起動時に台がなければ作成
export function initializeStore() {
  const state = useMachineStore.getState();
  if (state.machines.length === 0) {
    state.addMachine();
  }
}
