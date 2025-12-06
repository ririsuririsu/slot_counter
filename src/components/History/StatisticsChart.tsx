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
import { useMachineStore } from '../../stores/machineStore';
import { settingProbabilities } from '../../data/settingProbabilities';
import styles from './StatisticsChart.module.css';

export function StatisticsChart() {
  const machine = useMachineStore((state) => state.getCurrentMachine());
  const history = machine?.history ?? [];

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

  // グラフ用データに変換
  const chartData = history.map((entry, index) => ({
    name: `#${index + 1}`,
    games: entry.totalGames,
    probability: entry.probability ? entry.probability : null,
    setting1: entry.settingAnalysis.setting1,
    setting2: entry.settingAnalysis.setting2,
    setting4: entry.settingAnalysis.setting4,
    setting5: entry.settingAnalysis.setting5,
    setting6: entry.settingAnalysis.setting6,
  }));

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
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis
                fontSize={12}
                domain={[20, 45]}
                tickFormatter={(v) => `1/${v}`}
              />
              <Tooltip
                formatter={(value: number) => [`1/${value.toFixed(1)}`, '確率']}
                labelFormatter={(label) => `記録${label}`}
              />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="#1a73e8"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis
                fontSize={12}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name,
                ]}
                labelFormatter={(label) => `記録${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="setting1"
                stroke="#EF5350"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="設定1"
              />
              <Line
                type="monotone"
                dataKey="setting2"
                stroke="#FFA726"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="設定2"
              />
              <Line
                type="monotone"
                dataKey="setting4"
                stroke="#FFEE58"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="設定4"
              />
              <Line
                type="monotone"
                dataKey="setting5"
                stroke="#66BB6A"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="設定5"
              />
              <Line
                type="monotone"
                dataKey="setting6"
                stroke="#42A5F5"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="設定6"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getSettingColor(setting: number): string {
  switch (setting) {
    case 1:
      return '#EF5350';
    case 2:
      return '#FFA726';
    case 4:
      return '#FFEE58';
    case 5:
      return '#66BB6A';
    case 6:
      return '#42A5F5';
    default:
      return '#999';
  }
}
