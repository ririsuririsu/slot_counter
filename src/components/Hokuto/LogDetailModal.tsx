import type {
  HokutoLog, ATWinLog, TenhaLog, TengekiLog, FakeZenchoLog, EffectHintLog,
  ModeDistribution, ResetStatus,
} from '../../types';
import type { HokutoMode } from '../../types';
import {
  YAKU_LABELS, INTERNAL_STATE_LABELS, MODE_LABELS, TROPHY_LABELS,
  LAMP_COLOR_LABELS, LAMP_POSITION_LABELS,
  SHUTTER_CHECKPOINTS, TENMEI_ZONES,
  FAKE_ZENCHO_RATES, type ZenchoRateLabel,
  LAMP_A_INTERPRETATIONS, LAMP_B_INTERPRETATIONS, LAMP_C_INTERPRETATIONS,
  TROPHY_SETTING_FLOOR,
  TENGEKI_RARE_YAKU, TENGEKI_HAZURE_RATES, HOKUTO_SETTINGS,
  AT_HIT_RATES, TENHA_RATES, TENGEKI_TOTAL_RATES,
  type LampInterpretation,
} from '../../data/hokutoDefinitions';
import { estimateModesForAllATs, calculateTengekiExpectedRate } from '../../utils/hokutoEstimation';
import { Modal } from '../common/Modal';
import styles from './LogDetailModal.module.css';

interface Props {
  log: HokutoLog | null;
  logs: HokutoLog[];
  resetStatus: ResetStatus;
  onClose: () => void;
}

export function LogDetailModal({ log, logs, resetStatus, onClose }: Props) {
  if (!log) return null;

  const title = {
    'fake-zencho': '前兆詳細',
    'tenha': '天破の刻 詳細',
    'at-win': 'AT当選 詳細',
    'effect-hint': '演出示唆 詳細',
    'tengeki': '天撃チャレンジ 詳細',
    'densho': '伝承モード 詳細',
  }[log.type];

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className={styles.content}>
        {log.type === 'fake-zencho' && <ZenchoDetail log={log} />}
        {log.type === 'tenha' && <TenhaDetail log={log} />}
        {log.type === 'at-win' && <ATWinDetail log={log} logs={logs} resetStatus={resetStatus} />}
        {log.type === 'effect-hint' && <EffectHintDetail log={log} />}
        {log.type === 'tengeki' && <TengekiDetail log={log} />}
      </div>
    </Modal>
  );
}

// ========== 前兆 ==========

function ZenchoDetail({ log }: { log: FakeZenchoLog }) {
  const isShutter = log.zenchoCategory === 'shutter' || log.zenchoCategory === 'other';
  const isTenmei = log.zenchoCategory === 'tenmei';

  return (
    <>
      <div className={styles.summary}>
        <SummaryItem label="あべし" value={String(log.abeshiCount)} />
        <SummaryItem label="種類" value={
          log.zenchoCategory === 'shutter' ? 'シャッター' :
          log.zenchoCategory === 'tenmei' ? '天命の刻' : 'その他前兆'
        } />
      </div>

      {isShutter && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>シャッター判別ポイント</h4>
          <table className={styles.table}>
            <thead><tr><th>あべし帯</th><th>示唆</th></tr></thead>
            <tbody>
              {SHUTTER_CHECKPOINTS.map((cp, i) => {
                const hit = log.abeshiCount >= cp.min && log.abeshiCount <= cp.max;
                return (
                  <tr key={i} className={hit ? styles.rowHighlight : ''}>
                    <td>{cp.min}〜{cp.max}</td>
                    <td>{cp.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FakeZenchoRateTable abeshiCount={log.abeshiCount} />

      {isTenmei && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>天命の刻 ゾーン別モード示唆</h4>
          <table className={styles.table}>
            <thead><tr><th>あべし帯</th><th>示唆</th></tr></thead>
            <tbody>
              {TENMEI_ZONES.map((zone, i) => {
                const hit = log.abeshiCount >= zone.min && log.abeshiCount <= zone.max;
                return (
                  <tr key={i} className={hit ? styles.rowHighlight : ''}>
                    <td>{zone.min}〜{zone.max}</td>
                    <td>{zone.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FakeZenchoRateTable abeshiCount={log.abeshiCount} />
    </>
  );
}

// ========== 天破 ==========

function TenhaDetail({ log }: { log: TenhaLog }) {
  const durationText = log.duration === 'infinite' ? '無限' : `${log.duration}G`;
  return (
    <>
      <div className={styles.summary}>
        <SummaryItem label="G数" value={String(log.gameCount)} />
        <SummaryItem label="契機" value={YAKU_LABELS[log.trigger]} />
        <SummaryItem label="内部状態" value={INTERNAL_STATE_LABELS[log.estimatedState]} />
        <SummaryItem label="継続" value={durationText} />
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>天破出現率（設定別）</h4>
        <table className={styles.table}>
          <thead><tr><th>設定</th><th>出現率</th></tr></thead>
          <tbody>
            {HOKUTO_SETTINGS.map((s) => (
              <tr key={s}>
                <td>設定{s}</td>
                <td>1/{(1 / TENHA_RATES[s]).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {log.duration === 'infinite' && (
        <p className={styles.note}>無限天破 = 伝承モード濃厚</p>
      )}
    </>
  );
}

// ========== AT当選 ==========

function ATWinDetail({ log, logs, resetStatus }: { log: ATWinLog; logs: HokutoLog[]; resetStatus: ResetStatus }) {
  const triggerText = log.trigger === 'kitei-abeshi'
    ? '規定あべし'
    : `直撃（${YAKU_LABELS[log.triggerYaku || '']}）`;

  const estimates = estimateModesForAllATs(logs, resetStatus);
  const modeEst = estimates[log.id];

  return (
    <>
      <div className={styles.summary}>
        <SummaryItem label="G数" value={String(log.gameCount)} />
        <SummaryItem label="あべし" value={String(log.abeshiCount)} />
        <SummaryItem label="契機" value={triggerText} />
      </div>

      {modeEst && <ModeEstimateSection dist={modeEst} />}

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>AT初当たり確率（設定別）</h4>
        <table className={styles.table}>
          <thead><tr><th>設定</th><th>初当たり</th></tr></thead>
          <tbody>
            {HOKUTO_SETTINGS.map((s) => (
              <tr key={s}>
                <td>設定{s}</td>
                <td>1/{(1 / AT_HIT_RATES[s]).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ModeEstimateSection({ dist }: { dist: ModeDistribution }) {
  const entries: [HokutoMode, number][] = [
    ['tengoku', dist.tengoku], ['mode-c', dist.modeC], ['mode-b', dist.modeB], ['mode-a', dist.modeA],
  ];
  const maxVal = Math.max(...entries.map(([, v]) => v));

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>モード推定</h4>
      {entries.map(([mode, prob]) => {
        const pct = Math.round(prob * 100);
        const isTop = prob === maxVal && prob > 0;
        return (
          <div key={mode} className={styles.modeBar}>
            <span className={styles.modeBarLabel}>{MODE_LABELS[mode]}</span>
            <div className={styles.modeBarTrack}>
              <div
                className={`${styles.modeBarFill} ${isTop ? styles.modeBarFillTop : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={styles.modeBarValue}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ========== 演出示唆 ==========

function EffectHintDetail({ log }: { log: EffectHintLog }) {
  const lampEntries: [string, typeof log.lampA, LampInterpretation[]][] = [
    ['A', log.lampA, LAMP_A_INTERPRETATIONS],
    ['B', log.lampB, LAMP_B_INTERPRETATIONS],
    ['C', log.lampC, LAMP_C_INTERPRETATIONS],
  ];

  return (
    <>
      {log.trophy && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>トロフィー</h4>
          <div className={styles.summary}>
            <SummaryItem label="色" value={TROPHY_LABELS[log.trophy]} />
            <SummaryItem label="示唆" value={
              TROPHY_SETTING_FLOOR[log.trophy] === 6 ? '設定6確定' :
              `設定${TROPHY_SETTING_FLOOR[log.trophy]}以上確定`
            } />
          </div>
        </div>
      )}

      {lampEntries.map(([pos, lamp, interpretations]) => {
        if (!lamp) return null;
        return (
          <div key={pos} className={styles.section}>
            <h4 className={styles.sectionTitle}>{LAMP_POSITION_LABELS[pos]}ランプ</h4>
            <table className={styles.table}>
              <thead><tr><th>色</th><th>パターン</th><th>示唆</th></tr></thead>
              <tbody>
                {interpretations.map((interp, i) => {
                  const hit = interp.color === lamp.color
                    && interp.pattern === lamp.pattern
                    && !!interp.upperWhiteFlow === !!lamp.upperWhiteFlow;
                  const patternText = interp.pattern === 'blink' ? '点滅' : '点灯';
                  const flowText = interp.upperWhiteFlow ? '+上白流れ' : '';
                  return (
                    <tr key={i} className={hit ? styles.rowHighlight : ''}>
                      <td>{LAMP_COLOR_LABELS[interp.color]}{flowText}</td>
                      <td>{patternText}</td>
                      <td>{interp.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

// ========== 天撃 ==========

function TengekiDetail({ log }: { log: TengekiLog }) {
  const [pLow, pHigh] = calculateTengekiExpectedRate(log.games, log.prepRareHit);
  const pctLow = Math.round(pLow * 100);
  const pctHigh = Math.round(pHigh * 100);
  const pctText = pctLow === pctHigh ? `${pctLow}%` : `${pctLow}%〜${pctHigh}%`;

  const gameLabels = ['0G(突入)', '1G', '2G', '3G'];

  function getGameRate(idx: number, yaku: string): string {
    if (TENGEKI_RARE_YAKU.has(yaku)) return '100%';
    if (yaku === 'replay' || yaku === 'bell') {
      const rates = [18, 18, 18, 100];
      return `${rates[idx]}%`;
    }
    if (yaku === 'hazure') {
      if (idx === 1 || idx === 2) return '0%';
      return `${(TENGEKI_HAZURE_RATES[1] * 100).toFixed(1)}%〜${(TENGEKI_HAZURE_RATES[6] * 100).toFixed(1)}%`;
    }
    return '-';
  }

  return (
    <>
      <div className={styles.summary}>
        <SummaryItem label="結果">
          <span className={`${styles.resultBadge} ${log.result === 'success' ? styles.resultSuccess : styles.resultFailure}`}>
            {log.result === 'success' ? '成功' : '失敗'}
          </span>
        </SummaryItem>
        <SummaryItem label="成功期待度" value={pctText} />
        {log.prepRareHit && <SummaryItem label="準備中" value="レア役あり" />}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>ゲーム別成立役</h4>
        {log.games.map((yaku, i) => (
          <div key={i} className={styles.tengekiGame}>
            <span className={styles.tengekiGameLabel}>{gameLabels[i]}</span>
            <span className={styles.tengekiGameYaku}>{YAKU_LABELS[yaku] || yaku}</span>
            <span className={styles.tengekiGameRate}>{getGameRate(i, yaku)}</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>天撃トータル成功率（設定別）</h4>
        <table className={styles.table}>
          <thead><tr><th>設定</th><th>成功率</th><th>ハズレ時</th></tr></thead>
          <tbody>
            {HOKUTO_SETTINGS.map((s) => (
              <tr key={s}>
                <td>設定{s}</td>
                <td>{(TENGEKI_TOTAL_RATES[s] * 100).toFixed(1)}%</td>
                <td>{(TENGEKI_HAZURE_RATES[s] * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ========== フェイク前兆発生率テーブル ==========

const RATE_STYLE: Record<ZenchoRateLabel, string> = {
  '—': '',
  '10%以下': styles.ratelow,
  '50%': styles.rateMid,
  '濃厚': styles.rateHigh,
  '天井': styles.rateCeiling,
};

function FakeZenchoRateTable({ abeshiCount }: { abeshiCount: number }) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>ゾーン毎のフェイク前兆発生率</h4>
      <table className={styles.rateTable}>
        <thead>
          <tr>
            <th>あべし</th>
            <th>A</th>
            <th>B</th>
            <th>C</th>
            <th>天国</th>
          </tr>
        </thead>
        <tbody>
          {FAKE_ZENCHO_RATES.map((entry, i) => {
            const hit = abeshiCount >= entry.min && abeshiCount <= entry.max;
            return (
              <tr key={i} className={hit ? styles.rowHighlight : ''}>
                <td>{entry.min}〜{entry.max}</td>
                <td className={RATE_STYLE[entry.modeA]}>{entry.modeA}</td>
                <td className={RATE_STYLE[entry.modeB]}>{entry.modeB}</td>
                <td className={RATE_STYLE[entry.modeC]}>{entry.modeC}</td>
                <td className={RATE_STYLE[entry.tengoku]}>{entry.tengoku}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ========== 共通 ==========

function SummaryItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      {children ?? <span className={styles.summaryValue}>{value}</span>}
    </div>
  );
}
