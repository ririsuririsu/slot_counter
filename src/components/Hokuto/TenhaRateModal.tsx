import { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  TENHA_RATE_LOW,
  TENHA_RATE_NORMAL,
  TENHA_RATE_HIGH,
  TENHA_RATE_DENSHO,
  DENSHO_END_TRANSITION,
  HOKUTO_SETTINGS,
  LOW_TRANSITION_JAKU_CHERRY,
  LOW_TRANSITION_SUIKA,
  LOW_TRANSITION_CHANCE_SHOBU,
  LOW_TRANSITION_KYOU_CHERRY,
  NORMAL_TO_HIGH_RATES,
} from '../../data/hokutoDefinitions';
import type { StateTransitionRow } from '../../data/hokutoDefinitions';
import styles from './TenhaRateModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  alignTop?: boolean;
}

type MainTab = 'tenha' | 'transition';
type TenhaSubTab = 'low' | 'normal' | 'high' | 'densho';
type TransitionSubTab = 'low' | 'normal' | 'densho';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'tenha', label: '天破当選率' },
  { key: 'transition', label: '状態移行率' },
];

const TENHA_SUB_TABS: { key: TenhaSubTab; label: string }[] = [
  { key: 'low', label: '低確' },
  { key: 'normal', label: '通常' },
  { key: 'high', label: '高確' },
  { key: 'densho', label: '伝承' },
];

const TRANSITION_SUB_TABS: { key: TransitionSubTab; label: string }[] = [
  { key: 'low', label: '低確時' },
  { key: 'normal', label: '通常時' },
  { key: 'densho', label: '伝承後' },
];

export function TenhaRateModal({ isOpen, onClose, alignTop }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('tenha');
  const [tenhaTab, setTenhaTab] = useState<TenhaSubTab>('low');
  const [transTab, setTransTab] = useState<TransitionSubTab>('low');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="天破の刻" alignTop={alignTop}>
      <div className={styles.container}>
        {/* Main toggle */}
        <div className={styles.mainTabs}>
          {MAIN_TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.mainTab} ${mainTab === t.key ? styles.mainTabActive : ''}`}
              onClick={() => setMainTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 天破当選率 */}
        {mainTab === 'tenha' && (
          <>
            <div className={styles.tabs}>
              {TENHA_SUB_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tab} ${tenhaTab === t.key ? styles.tabActive : ''}`}
                  onClick={() => setTenhaTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {(tenhaTab === 'low' || tenhaTab === 'normal') && (
              <TenhaSettingTable data={tenhaTab === 'low' ? TENHA_RATE_LOW : TENHA_RATE_NORMAL} />
            )}
            {tenhaTab === 'high' && <TenhaHighTable />}
            {tenhaTab === 'densho' && <TenhaDenshoTable />}
          </>
        )}

        {/* 状態移行率 */}
        {mainTab === 'transition' && (
          <>
            <div className={styles.tabs}>
              {TRANSITION_SUB_TABS.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tab} ${transTab === t.key ? styles.tabActive : ''}`}
                  onClick={() => setTransTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {transTab === 'low' && <LowTransitionSection />}
            {transTab === 'normal' && <NormalTransitionSection />}
            {transTab === 'densho' && <DenshoTransitionSection />}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ========== 天破当選率テーブル ========== */

function TenhaSettingTable({
  data,
}: {
  data: { setting: number; weakChSuika: number; chanceMeShobu: number; kyouCh: number }[];
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>設定</th>
          <th>弱チェ/スイカ</th>
          <th>チャンス目/勝舞</th>
          <th>強チェ</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.setting}>
            <td className={styles.settingCol}>設定{row.setting}</td>
            <td>{row.weakChSuika}%</td>
            <td>{row.chanceMeShobu}%</td>
            <td>{row.kyouCh}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TenhaHighTable() {
  return (
    <>
      <p className={styles.note}>全設定共通</p>
      <table className={styles.table}>
        <thead>
          <tr><th>契機</th><th>当選率</th></tr>
        </thead>
        <tbody>
          <tr><td>スイカ</td><td>{TENHA_RATE_HIGH.suika}%</td></tr>
          <tr><td>弱チェ/チャンス目/勝舞</td><td>{TENHA_RATE_HIGH.weakChChanceMeShobu}%</td></tr>
          <tr><td>強チェリー</td><td>{TENHA_RATE_HIGH.kyouCh}%</td></tr>
        </tbody>
      </table>
    </>
  );
}

function TenhaDenshoTable() {
  return (
    <>
      <p className={styles.note}>全設定共通</p>
      <table className={styles.table}>
        <thead>
          <tr><th>契機</th><th>当選率</th></tr>
        </thead>
        <tbody>
          {TENHA_RATE_DENSHO.map((row) => (
            <tr key={row.trigger}><td>{row.trigger}</td><td>{row.rate}%</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ========== 状態移行率テーブル ========== */

function TransitionTable({ data, label }: { data: StateTransitionRow[]; label: string }) {
  return (
    <>
      <p className={styles.subLabel}>{label}</p>
      <table className={styles.table}>
        <thead>
          <tr><th>設定</th><th>低確</th><th>通常</th><th>高確</th></tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.setting}>
              <td className={styles.settingCol}>設定{row.setting}</td>
              <td>{(row.toLow * 100).toFixed(1)}%</td>
              <td>{(row.toNormal * 100).toFixed(1)}%</td>
              <td className={styles.highCol}>{(row.toHigh * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function LowTransitionSection() {
  return (
    <div className={styles.transitionSection}>
      <TransitionTable data={LOW_TRANSITION_JAKU_CHERRY} label="弱チェリー" />
      <TransitionTable data={LOW_TRANSITION_SUIKA} label="スイカ" />
      <TransitionTable data={LOW_TRANSITION_CHANCE_SHOBU} label="チャンス目・勝舞揃い" />
      <div>
        <p className={styles.subLabel}>強チェリー（全設定共通）</p>
        <table className={styles.table}>
          <thead>
            <tr><th>低確</th><th>通常</th><th>高確</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>{(LOW_TRANSITION_KYOU_CHERRY.toNormal * 100).toFixed(1)}%</td>
              <td className={styles.highCol}>{(LOW_TRANSITION_KYOU_CHERRY.toHigh * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NormalTransitionSection() {
  return (
    <>
      <p className={styles.note}>全設定共通</p>
      <table className={styles.table}>
        <thead>
          <tr><th>契機</th><th>高確移行率</th></tr>
        </thead>
        <tbody>
          {NORMAL_TO_HIGH_RATES.map((row) => (
            <tr key={row.trigger}>
              <td>{row.trigger}</td>
              <td className={styles.highCol}>{row.rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DenshoTransitionSection() {
  return (
    <>
      <p className={styles.note}>伝承モード後の初期状態（設定差あり）</p>
      <table className={styles.table}>
        <thead>
          <tr><th>設定</th><th>低確</th><th>通常</th><th>高確</th></tr>
        </thead>
        <tbody>
          {HOKUTO_SETTINGS.map((s) => {
            const row = DENSHO_END_TRANSITION[s];
            return (
              <tr key={s}>
                <td className={styles.settingCol}>設定{s}</td>
                <td>{(row.low * 100).toFixed(1)}%</td>
                <td>{(row.normal * 100).toFixed(1)}%</td>
                <td className={styles.highCol}>{(row.high * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.note}>
        朝イチリセット時・AT終了後(非伝承)は全設定共通
      </p>
    </>
  );
}
