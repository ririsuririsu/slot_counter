import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMachineStore, isHokutoMachine } from '../../stores/machineStore';
import {
  calculateHokutoSettingProbabilities,
  calculateTengekiStats,
} from '../../utils/hokutoEstimation';
import type { ResetStatus, HokutoLog } from '../../types';
import { StatusBar } from './StatusBar';
import { LogTimeline } from './LogTimeline';
import { InlineLogEntry } from './InlineLogEntry';
import { AnalysisModal } from './AnalysisModal';
import { LogDetailModal } from './LogDetailModal';
import { Modal } from '../common/Modal';
import styles from './HokutoMain.module.css';

export function HokutoMain() {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<HokutoLog | null>(null);
  const [infoLog, setInfoLog] = useState<HokutoLog | null>(null);
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const setSessionResetStatus = useMachineStore((state) => state.setSessionResetStatus);
  const addHokutoLog = useMachineStore((state) => state.addHokutoLog);
  const updateHokutoLog = useMachineStore((state) => state.updateHokutoLog);
  const deleteHokutoLog = useMachineStore((state) => state.deleteHokutoLog);
  const updateHokutoGameState = useMachineStore((state) => state.updateHokutoGameState);
  const updateExtraGames = useMachineStore((state) => state.updateExtraGames);
  const showLogEntry = useMachineStore((state) => state.showLogEntry);
  const setShowLogEntry = useMachineStore((state) => state.setShowLogEntry);

  // ヘッダーのログ追加ボタンで開いたモーダルを閉じるときにリセット
  useEffect(() => {
    return () => setShowLogEntry(false);
  }, [setShowLogEntry]);

  if (!machine || !isHokutoMachine(machine)) return null;

  const { session, logs, totalAbeshi } = machine;

  // ログから総ゲーム数を算出
  // gameCountはAT間のG数（AT当選でリセット）なので、
  // 全ATのgameCountを合算 + 最終AT以降の最大gameCountを加算
  let sumATGames = 0;
  let currentCycleMax = 0;
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].type === 'at-win') {
      sumATGames += (logs[i] as { gameCount: number }).gameCount;
      currentCycleMax = 0;
    } else if (logs[i].type === 'tenha') {
      const g = (logs[i] as { gameCount: number }).gameCount;
      if (g > currentCycleMax) currentCycleMax = g;
    }
  }
  const effectiveGames = sumATGames + currentCycleMax;
  const extraGames = machine.extraGames ?? 0;

  const displayGames = effectiveGames + extraGames;
  const settingAnalysis = calculateHokutoSettingProbabilities(logs, displayGames);
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
        extraGames={extraGames}
        totalAbeshi={totalAbeshi}
        atCount={atCount}
        tenhaCount={tenhaCount}
        resetStatus={session.resetStatus}
        onChangeResetStatus={(s: ResetStatus) => setSessionResetStatus(s)}
        onUpdateGameState={updateHokutoGameState}
        onUpdateExtraGames={updateExtraGames}
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
          onInfoLog={setInfoLog}
        />
      </div>

      {!editingLog && <InlineLogEntry onAddLog={handleAddLog} />}

      <LogDetailModal
        log={infoLog}
        logs={logs}
        resetStatus={session.resetStatus}
        onClose={() => setInfoLog(null)}
      />

      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        logs={logs}
        totalGames={displayGames}
        totalAbeshi={totalAbeshi}
        resetStatus={session.resetStatus}
        settingAnalysis={settingAnalysis}
        tengekiStats={tengekiStats}
      />

      <Modal isOpen={showLogEntry} onClose={() => setShowLogEntry(false)} title="ログ追加">
        <InlineLogEntry onAddLog={(log) => {
          handleAddLog(log);
          setShowLogEntry(false);
        }} />
      </Modal>
    </div>
  );
}
