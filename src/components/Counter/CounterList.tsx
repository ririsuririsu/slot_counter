import { useMemo } from 'react';
import { CounterRow } from './CounterRow';
import { getKoyakuByCategory, categoryOrder } from '../../data/koyakuDefinitions';

export function CounterList() {
  const groupedKoyaku = useMemo(() => getKoyakuByCategory(), []);

  const sortedCategories = useMemo(() => {
    return Array.from(groupedKoyaku.keys()).sort(
      (a, b) => (categoryOrder[a] ?? 99) - (categoryOrder[b] ?? 99)
    );
  }, [groupedKoyaku]);

  return (
    <div>
      {sortedCategories.map((category) => {
        const koyakuList = groupedKoyaku.get(category) || [];
        return (
          <div key={category}>
            <div className="section-header">{category}</div>
            {koyakuList.map((koyaku) => (
              <CounterRow key={koyaku.id} koyaku={koyaku} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
