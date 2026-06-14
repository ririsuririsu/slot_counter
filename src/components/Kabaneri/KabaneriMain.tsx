import { useState, Fragment } from 'react';
import { useMachineStore, isKabaneriMachine } from '../../stores/machineStore';
import { GameInputModal } from '../GameInput/GameInputModal';
import { KabaneriButton } from './KabaneriButton';
import { KabaneriToolbar, type CountMode } from './KabaneriToolbar';
import { KabaneriSettingAnalysis } from './KabaneriSettingAnalysis';
import {
  chanceDefinitions,
  GEDAN_BELL_KEY,
  BELL_COLOR,
  BELL_COLOR_SOFT,
} from '../../data/kabaneriDefinitions';
import styles from './KabaneriMain.module.css';

export function KabaneriMain() {
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [mode, setMode] = useState<CountMode>('add');
  const [orient, setOrient] = useState(0);
  const [haptic, setHaptic] = useState(true);

  const machine = useMachineStore((state) => state.getCurrentMachine());
  const incrementCounter = useMachineStore((state) => state.incrementKabaneriCounter);
  const decrementCounter = useMachineStore((state) => state.decrementKabaneriCounter);
  const incrementFlash = useMachineStore((state) => state.incrementKabaneriFlash);
  const decrementFlash = useMachineStore((state) => state.decrementKabaneriFlash);

  if (!machine || !isKabaneriMachine(machine)) return null;

  const { counters, totalGames } = machine;

  // 出現率（1/x.x）
  const fmtInverse = (count: number): string =>
    count > 0 && totalGames > 0 ? `1/${(totalGames / count).toFixed(1)}` : '—';
  // 発光率（%）
  const fmtRate = (flash: number, base: number): string =>
    base > 0 ? `${((flash / base) * 100).toFixed(1)}%` : '—';

  const handleRotate = () => setOrient((o) => (o + 90) % 360);

  // チャンス目の合算発光率（全チャンス目の発光合算 / 成立合算）
  const totalSeiritsu = chanceDefinitions.reduce(
    (sum, d) => sum + (counters[d.countKey] ?? 0),
    0
  );
  const totalHakkou = chanceDefinitions.reduce(
    (sum, d) => sum + (counters[d.flashKey] ?? 0),
    0
  );

  return (
    <>
      {mode === 'sub' && <div className={styles.subFrame} aria-hidden="true" />}

      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.gameInput}
          onClick={() => setIsGameModalOpen(true)}
        >
          <span className={styles.gameLabel}>ゲーム数</span>
          <span className={styles.gameValue}>
            {String(totalGames).padStart(4, '0')}
            <span className={styles.editIcon}>✏️</span>
          </span>
        </button>
        <KabaneriToolbar
          mode={mode}
          orient={orient}
          haptic={haptic}
          onModeChange={setMode}
          onRotate={handleRotate}
          onHapticToggle={() => setHaptic((h) => !h)}
        />
      </div>

      <div className={`section-header ${styles.sectionHead}`}>
        <span>チャンス目</span>
        <span className={styles.totalProb}>
          発光率 {fmtRate(totalHakkou, totalSeiritsu)}
        </span>
      </div>
      <div className={styles.chanceGrid}>
        {chanceDefinitions.map((def) => {
          const seiritsu = counters[def.countKey] ?? 0;
          const hakkou = counters[def.flashKey] ?? 0;
          return (
            <Fragment key={def.id}>
              <KabaneriButton
                label={`${def.shortName} 発光`}
                count={hakkou}
                sub={fmtRate(hakkou, seiritsu)}
                color={def.nameColor}
                softColor={def.nameColorSoft}
                mode={mode}
                orient={orient}
                haptic={haptic}
                onCount={(dir) =>
                  dir > 0 ? incrementFlash(def.id) : decrementFlash(def.id)
                }
              />
              <KabaneriButton
                label={`${def.shortName} 成立`}
                count={seiritsu}
                sub=""
                color={def.nameColor}
                softColor={def.nameColorSoft}
                mode={mode}
                orient={orient}
                haptic={haptic}
                onCount={(dir) =>
                  dir > 0
                    ? incrementCounter(def.countKey)
                    : decrementCounter(def.countKey)
                }
              />
            </Fragment>
          );
        })}
      </div>

      <div className={`section-header ${styles.sectionHead}`}>
        <span>下段ベル</span>
        <span className={styles.totalProb}>
          確率 {fmtInverse(counters[GEDAN_BELL_KEY] ?? 0)}
        </span>
      </div>
      <div className={styles.bellWrap}>
        <KabaneriButton
          label="下段ベル"
          count={counters[GEDAN_BELL_KEY] ?? 0}
          sub={fmtInverse(counters[GEDAN_BELL_KEY] ?? 0)}
          color={BELL_COLOR}
          softColor={BELL_COLOR_SOFT}
          mode={mode}
          orient={orient}
          haptic={haptic}
          onCount={(dir) =>
            dir > 0
              ? incrementCounter(GEDAN_BELL_KEY)
              : decrementCounter(GEDAN_BELL_KEY)
          }
        />
      </div>

      <div className="section-header">設定推測</div>
      <KabaneriSettingAnalysis />

      <GameInputModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </>
  );
}
