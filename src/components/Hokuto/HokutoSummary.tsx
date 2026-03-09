import type { HokutoLog, TengekiStats } from '../../types';
import { filterLogsByType } from '../../utils/hokutoEstimation';
import type { ATWinLog, TenhaLog } from '../../types';
import styles from './HokutoSummary.module.css';

interface Props {
  logs: HokutoLog[];
  totalGames: number;
  totalAbeshi: number;
  tengekiStats: TengekiStats;
}

export function HokutoSummary({ logs, totalGames, tengekiStats }: Props) {
  const atWinCount = filterLogsByType<ATWinLog>(logs, 'at-win').length;
  const tenhaCount = filterLogsByType<TenhaLog>(logs, 'tenha').length;

  const atRate = totalGames > 0 && atWinCount > 0
    ? (totalGames / atWinCount).toFixed(1)
    : '---';
  const tenhaRate = totalGames > 0 && tenhaCount > 0
    ? (totalGames / tenhaCount).toFixed(1)
    : '---';
  const hazureRate = tengekiStats.hazureTotal > 0
    ? ((tengekiStats.hazureSuccess / tengekiStats.hazureTotal) * 100).toFixed(1)
    : '---';
  const totalRate = tengekiStats.overallTotal > 0
    ? ((tengekiStats.overallSuccess / tengekiStats.overallTotal) * 100).toFixed(1)
    : '---';

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>AT初当たり</span>
          <span className={styles.statValue}>
            {atRate === '---' ? atRate : `1/${atRate}`}
          </span>
          <span className={styles.statSub}>{atWinCount}回</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>天破の刻</span>
          <span className={styles.statValue}>
            {tenhaRate === '---' ? tenhaRate : `1/${tenhaRate}`}
          </span>
          <span className={styles.statSub}>{tenhaCount}回</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>天撃ハズレ時</span>
          <span className={styles.statValue}>
            {hazureRate === '---' ? hazureRate : `${hazureRate}%`}
          </span>
          <span className={styles.statSub}>
            {tengekiStats.hazureSuccess}/{tengekiStats.hazureTotal}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>天撃トータル</span>
          <span className={styles.statValue}>
            {totalRate === '---' ? totalRate : `${totalRate}%`}
          </span>
          <span className={styles.statSub}>
            {tengekiStats.overallSuccess}/{tengekiStats.overallTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
