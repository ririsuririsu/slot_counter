import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMachineStore, isHokutoMachine } from '../../stores/machineStore';
import {
  calculateHokutoSettingProbabilities,
  estimateCurrentMode,
  calculateTengekiStats,
} from '../../utils/hokutoEstimation';
import type { ResetStatus, HokutoLog } from '../../types';
import { StatusBar } from './StatusBar';
import { LogTimeline } from './LogTimeline';
import { InlineLogEntry } from './InlineLogEntry';
import { AnalysisModal } from './AnalysisModal';
import styles from './HokutoMain.module.css';

export function HokutoMain() {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<HokutoLog | null>(null);
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const setSessionResetStatus = useMachineStore((state) => state.setSessionResetStatus);
  const addHokutoLog = useMachineStore((state) => state.addHokutoLog);
  const updateHokutoLog = useMachineStore((state) => state.updateHokutoLog);
  const deleteHokutoLog = useMachineStore((state) => state.deleteHokutoLog);
  const updateHokutoGameState = useMachineStore((state) => state.updateHokutoGameState);

  if (!machine || !isHokutoMachine(machine)) return null;

  const { session, logs, totalGames, totalAbeshi } = machine;

  // ログから総ゲーム数を算出
  // gameCountはAT間のG数（AT当選でリセット）なので、
  // 全ATのgameCountを合算 + 最終AT以降の最大gameCountを加算
  let sumATGames = 0;
  let currentCycleMax = 0;
  let lastATIndex = -1;
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].type === 'at-win') {
      sumATGames += (logs[i] as { gameCount: number }).gameCount;
      lastATIndex = i;
      currentCycleMax = 0;
    } else if (logs[i].type === 'tenha') {
      const g = (logs[i] as { gameCount: number }).gameCount;
      if (g > currentCycleMax) currentCycleMax = g;
    }
  }
  const effectiveGames = sumATGames + currentCycleMax;

  const settingAnalysis = calculateHokutoSettingProbabilities(logs, effectiveGames);
  const modeDistribution = estimateCurrentMode(logs, session.resetStatus);
  const tengekiStats = calculateTengekiStats(logs);
  const atCount = logs.filter((l) => l.type === 'at-win').length;
  const tenhaCount = logs.filter((l) => l.type === 'tenha').length;

  const handleAddLog = (log: HokutoLog) => {
    addHokutoLog({ ...log, id: uuidv4(), timestamp: Date.now() });
  };

  const handleUpdateLog = (log: HokutoLog) => {
    updateHokutoLog(log);
    setEditingLog(null);
  };

  return (
    <div className={styles.container}>
      <StatusBar
        totalGames={effectiveGames}
        totalAbeshi={totalAbeshi}
        atCount={atCount}
        tenhaCount={tenhaCount}
        resetStatus={session.resetStatus}
        onChangeResetStatus={(s: ResetStatus) => setSessionResetStatus(s)}
        onUpdateGameState={updateHokutoGameState}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
      />

      <div className={styles.timelineArea}>
        <LogTimeline
          logs={logs}
          resetStatus={session.resetStatus}
          onDeleteLog={deleteHokutoLog}
          editingLog={editingLog}
          onEditLog={setEditingLog}
          onUpdateLog={handleUpdateLog}
          onCancelEdit={() => setEditingLog(null)}
          onInfoLog={() => {/* TODO: next implementation */}}
        />
      </div>

      {!editingLog && <InlineLogEntry onAddLog={handleAddLog} />}

      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        logs={logs}
        totalGames={effectiveGames}
        totalAbeshi={totalAbeshi}
        resetStatus={session.resetStatus}
        settingAnalysis={settingAnalysis}
        modeDistribution={modeDistribution}
        tengekiStats={tengekiStats}
      />
    </div>
  );
}
