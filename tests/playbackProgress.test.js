import { test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { completedDaysPercent, playbackProgress } from '../src/playbackProgress.js';

const day = '2026-11-15';
const sets = [
  { affect: 'happy', setNumber: 1 }, { affect: 'happy', setNumber: 2 },
  { affect: 'challenging', setNumber: 1 }, { affect: 'challenging', setNumber: 2 },
];
const completed = (date) => sets.map((set) => ({ ...set, day: date, endedAt: 1 }));

test('empty and unfinished sessions do not count', () => {
  deepStrictEqual(playbackProgress([], day), { today: 0, total: 0, completedDays: 0 });
  deepStrictEqual(playbackProgress([{ ...sets[0], day }], day), { today: 0, total: 0, completedDays: 0 });
});

test('duplicates count toward total but not distinct sets or completed days', () => {
  const sessions = [...completed(day), { ...sets[0], day, endedAt: 1 }];
  deepStrictEqual(playbackProgress(sessions, day), { today: 4, total: 5, completedDays: 1 });
  deepStrictEqual(playbackProgress(sessions.slice(0, 3).concat(sessions[4]), day), { today: 3, total: 4, completedDays: 0 });
});

test('counts multiple completed days across members and separates today', () => {
  const sessions = [...completed('2026-11-13'), ...completed('2026-11-14'), { ...sets[1], day, endedAt: 1, playedBy: 'another' }];
  deepStrictEqual(playbackProgress(sessions, day), { today: 1, total: 9, completedDays: 2 });
});

test('completed days progress reaches the goal and caps the ring at 100%', () => {
  for (const [days, percent] of [[0, 0], [21, 50], [42, 100], [50, 100]]) {
    strictEqual(completedDaysPercent(days), percent);
    const sessions = Array.from({ length: days }, (_, i) => completed(`day-${i}`)).flat();
    strictEqual(playbackProgress(sessions, day).completedDays, days);
  }
});
