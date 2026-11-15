import { SETS, setKey } from './stories.js';

export const SESSION_GOAL = 168;

// Count completed sessions, and distinct sets for each session's recorded local day.
export function playbackProgress(sessions, today) {
  const setsByDay = new Map();
  let total = 0;
  const validSets = new Set(SETS.map(({ affect, setNumber }) => setKey(affect, setNumber)));
  for (const session of sessions) {
    if (!session.endedAt) continue;
    total += 1;
    const key = setKey(session.affect, session.setNumber);
    if (!validSets.has(key)) continue;
    if (!setsByDay.has(session.day)) setsByDay.set(session.day, new Set());
    setsByDay.get(session.day).add(key);
  }
  return {
    today: setsByDay.get(today)?.size ?? 0,
    total,
    completedDays: [...setsByDay.values()].filter((sets) => sets.size === SETS.length).length,
  };
}
