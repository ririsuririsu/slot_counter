import { useState } from 'react';
import type { ResetStatus } from '../../types';
import { RESET_STATUS_LABELS, AT_HIT_RATES, TENHA_RATES, HOKUTO_SETTINGS } from '../../data/hokutoDefinitions';
import styles from './StatusBar.module.css';

interface Props {
  totalGames: number;
  extraGames: number;
  totalAbeshi: number;
  atCount: number;
  tenhaCount: number;
  resetStatus: ResetStatus;
  onChangeResetStatus: (status: ResetStatus) => void;
  onUpdateGameState: (games: number, abeshi: number) => void;
  onUpdateExtraGames: (extra: number) => void;
  onOpenAnalysis: () => void;
}

const RESET_OPTIONS: ResetStatus[] = ['reset', 'suekae', 'unknown'];

const BADGE_CLASS: Record<ResetStatus, string> = {
  reset: styles.resetBadgeReset,
  suekae: styles.resetBadgeSuekae,
  unknown: styles.resetBadgeUnknown,
};

type PopupKind = 'games' | 'at' | 'tenha' | 'edit' | null;

function formatRate(count: number, games: number): string {
  if (games <= 0 || count <= 0) return '—';
  return `1/${(games / count).toFixed(0)}`;
}

function findClosestSetting(
  actualRate: number,
  rateTable: Record<number, number>,
): number | null {
  if (actualRate <= 0) return null;
  let closest = 1;
  let minDiff = Infinity;
  for (const s of HOKUTO_SETTINGS) {
    const diff = Math.abs(rateTable[s] - actualRate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

export function StatusBar({
  totalGames,
  extraGames,
  totalAbeshi,
  atCount,
  tenhaCount,
  resetStatus,
  onChangeResetStatus,
  onUpdateGameState,
  onUpdateExtraGames,
  onOpenAnalysis,
}: Props) {
  const [popup, setPopup] = useState<PopupKind>(null);
  const [addGames, setAddGames] = useState('');
  const [editGames, setEditGames] = useState(totalGames);
  const [editAbeshi, setEditAbeshi] = useState(totalAbeshi);

  const displayGames = totalGames + extraGames;

  const openGamesPopup = () => {
    setAddGames(extraGames > 0 ? String(extraGames) : '');
    setPopup('games');
  };

  const confirmAddGames = () => {
    const val = parseInt(addGames) || 0;
    onUpdateExtraGames(val);
    setPopup(null);
  };

  const openEdit = () => {
    setEditGames(totalGames);
    setEditAbeshi(totalAbeshi);
    setPopup('edit');
  };

  const closeEdit = () => {
    onUpdateGameState(editGames, editAbeshi);
    setPopup(null);
  };

  const actualATRate = atCount > 0 && displayGames > 0 ? atCount / displayGames : 0;
  const actualTenhaRate = tenhaCount > 0 && displayGames > 0 ? tenhaCount / displayGames : 0;
  const closestATSetting = findClosestSetting(actualATRate, AT_HIT_RATES);
  const closestTenhaSetting = findClosestSetting(actualTenhaRate, TENHA_RATES);

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.stat} onClick={openGamesPopup}>
          <span className={styles.statValue}>{displayGames}</span>
          <span className={styles.statUnit}>G</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.stat} onClick={() => setPopup('at')}>
          <span className={styles.statLabel}>AT</span>
          <span className={styles.statRate}>{atCount}/{formatRate(atCount, displayGames)}</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.stat} onClick={() => setPopup('tenha')}>
          <span className={styles.statLabel}>天破</span>
          <span className={styles.statRate}>{tenhaCount}/{formatRate(tenhaCount, displayGames)}</span>
        </div>
        <button
          className={`${styles.resetBadge} ${BADGE_CLASS[resetStatus]}`}
          onClick={(e) => { e.stopPropagation(); openEdit(); }}
        >
          {RESET_STATUS_LABELS[resetStatus]}
        </button>
        <button
          className={styles.analysisBtn}
          onClick={(e) => { e.stopPropagation(); onOpenAnalysis(); }}
        >
          分析
        </button>
      </div>

      {/* 加算G数入力ポップアップ */}
      {popup === 'games' && (
        <div className={styles.editOverlay} onClick={() => setPopup(null)}>
          <div className={styles.editCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.editTitle}>加算G数</span>
            <p className={styles.editHint}>
              ログ合計: {totalGames}G
              {extraGames > 0 && <><br />現在の加算: {extraGames}G（合計: {totalGames + extraGames}G）</>}
            </p>
            <div className={styles.editField}>
              <label>加算G数（上書き）</label>
              <input
                type="number"
                value={addGames}
                onChange={(e) => setAddGames(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className={styles.editActions}>
              {extraGames > 0 && (
                <button
                  className={styles.editCancel}
                  onClick={() => { onUpdateExtraGames(0); setPopup(null); }}
                >
                  リセット
                </button>
              )}
              <button className={styles.editDone} onClick={confirmAddGames}>加算</button>
            </div>
          </div>
        </div>
      )}

      {/* AT確率テーブル */}
      {popup === 'at' && (
        <div className={styles.editOverlay} onClick={() => setPopup(null)}>
          <div className={styles.editCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.editTitle}>AT初当たり確率</span>
            <p className={styles.editHint}>
              実績: {atCount}回 / {displayGames}G = {displayGames > 0 && atCount > 0 ? `1/${(displayGames / atCount).toFixed(1)}` : '—'}
            </p>
            <table className={styles.rateTable}>
              <thead>
                <tr><th>設定</th><th>確率</th></tr>
              </thead>
              <tbody>
                {HOKUTO_SETTINGS.map((s) => (
                  <tr key={s} className={closestATSetting === s ? styles.rateHighlight : ''}>
                    <td>設定{s}</td>
                    <td>1/{(1 / AT_HIT_RATES[s]).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={styles.editDone} onClick={() => setPopup(null)}>閉じる</button>
          </div>
        </div>
      )}

      {/* 天破確率テーブル */}
      {popup === 'tenha' && (
        <div className={styles.editOverlay} onClick={() => setPopup(null)}>
          <div className={styles.editCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.editTitle}>天破の刻 出現率</span>
            <p className={styles.editHint}>
              実績: {tenhaCount}回 / {displayGames}G = {displayGames > 0 && tenhaCount > 0 ? `1/${(displayGames / tenhaCount).toFixed(1)}` : '—'}
            </p>
            <table className={styles.rateTable}>
              <thead>
                <tr><th>設定</th><th>確率</th></tr>
              </thead>
              <tbody>
                {HOKUTO_SETTINGS.map((s) => (
                  <tr key={s} className={closestTenhaSetting === s ? styles.rateHighlight : ''}>
                    <td>設定{s}</td>
                    <td>1/{(1 / TENHA_RATES[s]).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={styles.editDone} onClick={() => setPopup(null)}>閉じる</button>
          </div>
        </div>
      )}

      {/* G数・あべし・リセット編集 */}
      {popup === 'edit' && (
        <div className={styles.editOverlay} onClick={closeEdit}>
          <div className={styles.editCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.editTitle}>G数・あべし編集</span>
            <div className={styles.editField}>
              <label>総G数</label>
              <input
                type="number"
                value={editGames || ''}
                onChange={(e) => setEditGames(parseInt(e.target.value) || 0)}
                inputMode="numeric"
                autoFocus
              />
            </div>
            <div className={styles.editField}>
              <label>総あべし</label>
              <input
                type="number"
                value={editAbeshi || ''}
                onChange={(e) => setEditAbeshi(parseInt(e.target.value) || 0)}
                inputMode="numeric"
              />
            </div>
            <div className={styles.editField}>
              <label>朝一判定</label>
              <div className={styles.editToggleGroup}>
                {RESET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`${styles.editToggle} ${resetStatus === opt ? styles.active : ''}`}
                    onClick={() => onChangeResetStatus(opt)}
                  >
                    {RESET_STATUS_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.editActions}>
              <button className={styles.editDone} onClick={closeEdit}>完了</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
