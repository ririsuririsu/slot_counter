import { useState } from 'react';
import { useMachineStore, isMonhanRiseMachine } from '../../stores/machineStore';
import { MonhanRiseInput } from './MonhanRiseInput';
import { MonhanRiseSettingAnalysis } from './MonhanRiseSettingAnalysis';
import styles from './MonhanRiseMain.module.css';

type SubTab = 'input' | 'analysis';

const TABS: { id: SubTab; label: string }[] = [
  { id: 'input', label: '入力' },
  { id: 'analysis', label: '設定推測' },
];

export function MonhanRiseMain() {
  const [subTab, setSubTab] = useState<SubTab>('input');

  const machine = useMachineStore((state) => state.getCurrentMachine());

  if (!machine || !isMonhanRiseMachine(machine)) return null;

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

      {subTab === 'input' && <MonhanRiseInput machine={machine} />}
      {subTab === 'analysis' && <MonhanRiseSettingAnalysis machine={machine} />}
    </>
  );
}
