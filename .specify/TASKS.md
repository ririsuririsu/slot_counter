# Tasks: Slot Counter - Monkey Turn V Edition

**Created**: 2025-12-06
**Based on**: PLAN.md

## Phase 1: Core MVP (P1 Features)

### Task 1.1: Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure tsconfig.json for strict mode
- [ ] Install dependencies (zustand, uuid)
- [ ] Set up project folder structure
- [ ] Create CSS tokens file

**Acceptance**: `npm run dev` starts development server

### Task 1.2: Type Definitions
- [ ] Create types/index.ts with all interfaces
- [ ] Define KoyakuDefinition, CounterState, HistoryEntry, Machine types
- [ ] Define SettingAnalysis type

**Acceptance**: TypeScript compiles without errors

### Task 1.3: Koyaku Data
- [ ] Create data/koyakuDefinitions.ts
- [ ] Define all 21 koyaku items with categories and colors
- [ ] Create data/settingProbabilities.ts with setting probability values

**Acceptance**: All koyaku data exported and typed correctly

### Task 1.4: State Management
- [ ] Create stores/machineStore.ts with Zustand
- [ ] Implement machine CRUD operations
- [ ] Implement counter increment/decrement
- [ ] Implement localStorage persistence (subscribe + load)

**Acceptance**: State persists across page reloads

### Task 1.5: Counter Components
- [ ] Create components/Counter/CounterRow.tsx
- [ ] Create components/Counter/CounterList.tsx
- [ ] Style with touch-friendly buttons (56px min)
- [ ] Group by category with headers

**Acceptance**: Counters display, +1/-1 buttons work, values persist

### Task 1.6: Game Input Component
- [ ] Create components/GameInput/DrumPicker.tsx
- [ ] Create components/GameInput/GameInputModal.tsx
- [ ] Implement 4-digit drum-style picker UI
- [ ] Connect to store's totalGames

**Acceptance**: Can input game count via drum picker

### Task 1.7: Probability Calculation
- [ ] Create utils/probability.ts
- [ ] Calculate 5-card total from counters
- [ ] Calculate probability as 1/X.X format
- [ ] Handle edge cases (0 games, 0 hits)

**Acceptance**: Probability displays correctly for test cases

### Task 1.8: Binomial Distribution
- [ ] Create utils/binomialDistribution.ts
- [ ] Implement binomial PMF with log-space calculation
- [ ] Implement Bayesian posterior calculation
- [ ] Create SettingAnalysis component

**Acceptance**: Setting probabilities sum to 100%

### Task 1.9: Reset Functionality
- [ ] Create components/common/ConfirmDialog.tsx
- [ ] Add reset button to header
- [ ] Clear counters and history on confirm
- [ ] Keep machine record

**Acceptance**: Reset clears data after confirmation

### Task 1.10: PWA Setup
- [ ] Install vite-plugin-pwa
- [ ] Configure manifest.json
- [ ] Create app icons (192px, 512px)
- [ ] Configure service worker
- [ ] Test offline functionality

**Acceptance**: App installable, works offline

---

## Phase 2: Enhanced Features (P2 Features)

### Task 2.1: Multiple Machine Management
- [ ] Create components/Machine/MachineSelector.tsx
- [ ] Create components/Machine/MachineEditor.tsx
- [ ] Add machine switcher to header
- [ ] Implement add/delete machine

**Acceptance**: Can manage multiple machines independently

### Task 2.2: History Recording
- [ ] Add history entry on game count update
- [ ] Store timestamp, games, 5-card total, probability, settings
- [ ] Create hooks/useMachine.ts for computed values

**Acceptance**: History entries created automatically

### Task 2.3: History List View
- [ ] Create components/Statistics/HistoryList.tsx
- [ ] Display entries in chronological order
- [ ] Show timestamp, games, probability
- [ ] Add swipe-to-delete (optional)

**Acceptance**: History viewable in list format

### Task 2.4: Statistics Chart
- [ ] Install recharts
- [ ] Create components/Statistics/HistoryChart.tsx
- [ ] Plot probability trend over time/games
- [ ] Add reference lines for setting probabilities

**Acceptance**: Chart displays probability trend

---

## Phase 3: Export & Polish (P3 Features)

### Task 3.1: CSV Export
- [ ] Create utils/export.ts
- [ ] Implement CSV generation
- [ ] Trigger download with proper filename
- [ ] Include all counter and history data

**Acceptance**: CSV file downloads with correct data

### Task 3.2: JSON Export
- [ ] Add JSON export to utils/export.ts
- [ ] Export complete machine data
- [ ] Format for readability

**Acceptance**: JSON file downloads with correct data

### Task 3.3: UI Polish
- [ ] Improve visual hierarchy
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Improve accessibility

**Acceptance**: UI feels polished and professional

### Task 3.4: Performance Optimization
- [ ] Add React.memo to counter rows
- [ ] Implement virtual scrolling if needed
- [ ] Profile and fix bottlenecks

**Acceptance**: Smooth performance with 1000+ history entries

### Task 3.5: Final Testing & Audit
- [ ] Run Lighthouse audit
- [ ] Achieve Performance score 90+
- [ ] Test on various mobile devices
- [ ] Fix any remaining issues

**Acceptance**: Lighthouse score 90+, no critical issues

---

## Task Dependencies

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
                    ↓
               1.7 → 1.8
                    ↓
                   1.9
                    ↓
                  1.10
                    ↓
              ┌─────┴─────┐
             2.1        2.2 → 2.3 → 2.4
                              ↓
                        3.1 → 3.2
                              ↓
                        3.3 → 3.4 → 3.5
```

## Estimated Effort

| Phase | Tasks | Est. Effort |
|-------|-------|-------------|
| Phase 1 | 10 tasks | Core functionality |
| Phase 2 | 4 tasks | Enhanced features |
| Phase 3 | 5 tasks | Polish & export |
| **Total** | **19 tasks** | - |
