import type {
  KabaneriChanceInput, KabaneriChanceRole, KabaneriChanceType, KabaneriCounterState,
  KabaneriCzCharacter, KabaneriCzEvent,
} from '../types/kabaneri';

export const CZ_CHARACTERS: KabaneriCzCharacter[] = ['mumei', 'ikoma'];
export const CHANCE_ROLES: { id: KabaneriChanceRole; label: string; members: KabaneriChanceType[] }[] = [
  { id: 'mumei', label: '無名', members: ['mumei'] },
  { id: 'ikoma', label: '生駒', members: ['ikoma'] },
  { id: 'kabane', label: 'カバネ', members: ['kabane'] },
  { id: 'mumeiIkoma', label: '無名＋生駒', members: ['mumei', 'ikoma'] },
  { id: 'mumeiKabane', label: '無名＋カバネ', members: ['mumei', 'kabane'] },
  { id: 'ikomaKabane', label: '生駒＋カバネ', members: ['ikoma', 'kabane'] },
  { id: 'all', label: 'オールスター', members: ['mumei', 'ikoma', 'kabane'] },
];
export const CHARACTER_LABELS = { mumei: '無名', ikoma: '生駒', kabane: 'カバネ' };
export const NORMAL_CONDITIONS = { mumei: 'normal', ikoma: 'normal', kabane: 'normal' } as const;
export const EMPTY_CZ_EVENTS: KabaneriCzEvent[] = [];

/** 前作を参考にした暫定換算（docs/kabaneri-cz-points.md）。今作で数値を確定できない強制到達はnull。 */
export function chancePoints(event: KabaneriChanceInput, character: KabaneriCzCharacter): number | null {
  const role = CHANCE_ROLES.find((r) => r.id === event.role)!;
  if (!role.members.includes(character)) return 0;
  const condition = event.conditions[character];
  if (event.role === 'all' || condition === 'super') return null;
  if (role.members.length > 1) return condition === 'high' ? 30 : 15;
  if (condition === 'high' || event.flash === 'yes') return 15;
  return event.flash === 'unknown' ? null : 1;
}

/** 既存の発光率カウンターへ加える差分。複合・高確を混入させない。 */
export function flashCounterDelta(event: KabaneriChanceInput): KabaneriCounterState {
  const role = CHANCE_ROLES.find((r) => r.id === event.role)!;
  if (!event.flashEligible || role.members.length !== 1 ||
      event.conditions[role.members[0]] !== 'normal' || event.flash === 'unknown') return {};
  return { [event.role]: 1, ...(event.flash === 'yes' ? { [`${event.role}Flash`]: 1 } : {}) };
}

export function applyChanceCounterDelta(counters: KabaneriCounterState, event: KabaneriChanceInput, dir: 1 | -1) {
  const next = { ...counters };
  for (const [key, amount] of Object.entries(flashCounterDelta(event))) {
    next[key] = Math.max(0, (next[key] ?? 0) + dir * amount);
  }
  return next;
}

export interface KabaneriPointCycle {
  points: number;
  unknownCount: number;
  chanceCount: number;
  complete: boolean;
}
export interface KabaneriCzResult extends KabaneriPointCycle {
  id: string;
  character: KabaneriCzCharacter;
  doran: boolean;
}
const emptyCycle = (initial: number | null = null): KabaneriPointCycle => ({
  points: initial ?? 0, unknownCount: 0, chanceCount: 0, complete: initial !== null,
});

export function summarizeKabaneriCz(events: KabaneriCzEvent[]) {
  const current = { mumei: emptyCycle(), ikoma: emptyCycle() };
  const history: KabaneriCzResult[] = [];
  for (const event of events) {
    if (event.type === 'start') {
      for (const character of CZ_CHARACTERS) current[character] = emptyCycle(event.initialPoints[character]);
    } else if (event.type === 'cz') {
      history.push({ ...current[event.character], id: event.id, character: event.character, doran: event.doran });
      current[event.character] = emptyCycle(0);
    } else {
      const members = CHANCE_ROLES.find((r) => r.id === event.role)!.members;
      for (const character of CZ_CHARACTERS) {
        if (!members.includes(character)) continue;
        const points = chancePoints(event, character);
        current[character].chanceCount++;
        if (points === null) current[character].unknownCount++;
        else current[character].points += points;
      }
    }
  }
  return { current, history };
}

/** そのキャラの直近CZ／集計開始より後にある当選契機候補。 */
export function czTriggerCandidates(events: KabaneriCzEvent[], character: KabaneriCzCharacter) {
  let start = 0;
  events.forEach((event, index) => {
    if (event.type === 'start' || (event.type === 'cz' && event.character === character)) start = index + 1;
  });
  return events.slice(start).filter((event) => event.type === 'chance' &&
    CHANCE_ROLES.find((r) => r.id === event.role)!.members.includes(character));
}

export function describeCzEvent(event: KabaneriCzEvent): string {
  if (event.type === 'start') return event.initialPoints.mumei === null ? '途中から集計開始' : '0ptから集計開始';
  if (event.type === 'cz') return `${CHARACTER_LABELS[event.character]}CZ${event.doran ? '（銅藍へ昇格）' : ''}`;
  const role = CHANCE_ROLES.find((r) => r.id === event.role)!;
  const conditions = role.members.filter((c) => event.conditions[c] !== 'normal')
    .map((c) => `${CHARACTER_LABELS[c]}${event.conditions[c] === 'super' ? '超高確' : '高確'}`);
  const flash = role.members.length === 1 && conditions.length === 0
    ? `・${event.flash === 'yes' ? '発光' : event.flash === 'none' ? '非発光' : '発光不明'}` : '';
  return `${role.label}${conditions.length ? `（${conditions.join('・')}）` : flash}`;
}

/** 古いローカル／クラウド記録にイベントがなくても安全に表示する。 */
export function normalizeKabaneriCzEvents(value: unknown): KabaneriCzEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((event): event is KabaneriCzEvent => {
    if (!event || typeof event.id !== 'string' || !Number.isFinite(event.timestamp)) return false;
    if (event.type === 'cz') return CZ_CHARACTERS.includes(event.character) && typeof event.doran === 'boolean';
    if (event.type === 'start') return CZ_CHARACTERS.every((c) => event.initialPoints &&
      (event.initialPoints[c] === null || (Number.isSafeInteger(event.initialPoints[c]) && event.initialPoints[c] >= 0)));
    return event.type === 'chance' && CHANCE_ROLES.some((r) => r.id === event.role) &&
      typeof event.flashEligible === 'boolean' && ['none', 'yes', 'unknown'].includes(event.flash) &&
      (['mumei', 'ikoma', 'kabane'] as const).every((c) => event.conditions && ['normal', 'high', 'super'].includes(event.conditions[c]));
  });
}
