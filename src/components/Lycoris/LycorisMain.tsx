import { useState } from 'react';
import { useMachineStore, isLycorisMachine } from '../../stores/machineStore';
import { LycorisInput } from './LycorisInput';
import { LycorisSettingAnalysis } from './LycorisSettingAnalysis';
import styles from './LycorisMain.module.css';

type SubTab = 'input' | 'analysis';

const TABS: { id: SubTab; label: string }[] = [
  { id: 'input', label: '入力' },
  { id: 'analysis', label: '推測' },
];

export function LycorisMain() {
  const [subTab, setSubTab] = useState<SubTab>('input');

  const machine = useMachineStore((state) => state.getCurrentMachine());

  if (!machine || !isLycorisMachine(machine)) return null;

  return (
    <>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${subTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'input' && <LycorisInput machine={machine} />}
      {subTab === 'analysis' && <LycorisSettingAnalysis machine={machine} />}
    </>
  );
}
