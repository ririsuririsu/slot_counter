import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMachineStore, isMonkeyTurnMachine } from '../../stores/machineStore';
import { settingProbabilities } from '../../data/settingProbabilities';
import styles from './StatisticsChart.module.css';

export function StatisticsChart() {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const history = (machine && isMonkeyTurnMachine(machine)) ? machine.history : [];

  if (history.length < 2) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>確率推移グラフ</h3>
        <p className={styles.empty}>
          グラフを表示するには2件以上の履歴が必要です
        </p>
      </div>
    );
  }

  // グラフ用データに変換（ゲーム数でソート）
  const chartData = [...history]
    .sort((a, b) => a.totalGames - b.totalGames)
    .map((entry) => ({
      games: entry.totalGames,
      probability: entry.probability ? entry.probability : null,
      setting1: entry.settingAnalysis.setting1,
      setting2: entry.settingAnalysis.setting2,
      setting4: entry.settingAnalysis.setting4,
      setting5: entry.settingAnalysis.setting5,
      setting6: entry.settingAnalysis.setting6,
    }));

  // X軸の範囲を計算
  const minGames = Math.min(...chartData.map((d) => d.games));
  const maxGames = Math.max(...chartData.map((d) => d.games));

  // 設定確率のY軸範囲を動的に計算
  const allSettingValues = chartData.flatMap((d) => [
    d.setting1,
    d.setting2,
    d.setting4,
    d.setting5,
    d.setting6,
  ]);
  const minSettingValue = Math.min(...allSettingValues);
  const maxSettingValue = Math.max(...allSettingValues);
  // 余白を持たせて見やすくする（5%刻みで丸める）
  const settingYMin = Math.max(0, Math.floor((minSettingValue - 5) / 5) * 5);
  const settingYMax = Math.min(100, Math.ceil((maxSettingValue + 5) / 5) * 5);

  // 設定の理論値ライン
  const settingLines = settingProbabilities.map((sp) => ({
    setting: sp.setting,
    value: sp.denominator,
  }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>確率推移グラフ</h3>

      <div className={styles.chartSection}>
        <h4 className={styles.subtitle}>5枚役確率（1/X）</h4>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(84, 84, 88, 0.4)" />
              <XAxis
                dataKey="games"
                type="number"
                domain={[minGames, maxGames]}
                fontSize={12}
                tickFormatter={(v) => `${v}G`}
              />
              <YAxis
                fontSize={12}
                domain={[20, 45]}
                tickFormatter={(v) => `1/${v}`}
              />
              <Tooltip
                formatter={(value: number) => [`1/${value.toFixed(1)}`, '確率']}
                labelFormatter={(games) => `${games}G`}
              />
              <Line
                type="linear"
                dataKey="probability"
                stroke="#0A84FF"
                strokeWidth={2}
                dot={{ r: 4, fill: '#0A84FF' }}
                activeDot={{ r: 6, fill: '#0A84FF' }}
                name="実測値"
              />
              {/* 設定の理論値ライン */}
              {settingLines.map((line) => (
                <Line
                  key={line.setting}
                  type="monotone"
                  dataKey={() => line.value}
                  stroke={getSettingColor(line.setting)}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name={`設定${line.setting}`}
                  legendType="none"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legendWrapper}>
          {settingLines.map((line) => (
            <span
              key={line.setting}
              className={styles.legendItem}
              style={{ color: getSettingColor(line.setting) }}
            >
              設定{line.setting}: 1/{line.value}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.chartSection}>
        <h4 className={styles.subtitle}>設定確率推移</h4>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(84, 84, 88, 0.4)" />
              <XAxis
                dataKey="games"
                type="number"
                domain={[minGames, maxGames]}
                fontSize={12}
                tickFormatter={(v) => `${v}G`}
              />
              <YAxis
                fontSize={12}
                domain={[settingYMin, settingYMax]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name,
                ]}
                labelFormatter={(games) => `${games}G`}
              />
              <Legend />
              <Line
                type="linear"
                dataKey="setting1"
                stroke="#FF453A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FF453A' }}
                name="設定1"
              />
              <Line
                type="linear"
                dataKey="setting2"
                stroke="#FF9F0A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FF9F0A' }}
                name="設定2"
              />
              <Line
                type="linear"
                dataKey="setting4"
                stroke="#BF5AF2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#BF5AF2' }}
                name="設定4"
              />
              <Line
                type="linear"
                dataKey="setting5"
                stroke="#30D158"
                strokeWidth={2}
                dot={{ r: 3, fill: '#30D158' }}
                name="設定5"
              />
              <Line
                type="linear"
                dataKey="setting6"
                stroke="#0A84FF"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0A84FF' }}
                name="設定6"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Apple System Colors for dark mode
function getSettingColor(setting: number): string {
  switch (setting) {
    case 1:
      return '#FF453A'; // Apple Red
    case 2:
      return '#FF9F0A'; // Apple Orange
    case 4:
      return '#BF5AF2'; // Apple Purple
    case 5:
      return '#30D158'; // Apple Green
    case 6:
      return '#0A84FF'; // Apple Blue
    default:
      return '#8E8E93'; // Apple Gray
  }
}
