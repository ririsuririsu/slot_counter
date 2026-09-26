import { useState } from 'react';
import { useMachineStore, isKokakuMachine } from '../../stores/machineStore';
import { KokakuInput } from './KokakuInput';
import { KokakuSettingAnalysis } from './KokakuSettingAnalysis';
import styles from './KokakuMain.module.css';

type SubTab = 'input' | 'analysis';

const TABS: { id: SubTab; label: string }[] = [
  { id: 'input', label: '入力' },
  { id: 'analysis', label: '推測' },
];

export function KokakuMain() {
  const [subTab, setSubTab] = useState<SubTab>('input');

  const machine = useMachineStore((state) => state.getCurrentMachine());

  if (!machine || !isKokakuMachine(machine)) return null;

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

      {subTab === 'input' && <KokakuInput machine={machine} />}
      {subTab === 'analysis' && <KokakuSettingAnalysis machine={machine} />}
    </>
  );
}
