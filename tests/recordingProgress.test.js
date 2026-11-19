import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordingSetProgress } from '../src/stories.js';

const minute = 60_000;

test('set markers appear at five minutes of room', () => {
  assert.equal(recordingSetProgress(5 * minute + 1).show, false);
  assert.deepEqual(recordingSetProgress(5 * minute), { show: true, minimum: 3 * minute, maximum: 5 * minute });
  assert.equal(recordingSetProgress(5 * minute - 1).show, true);
});

test('the minimum marker is two minutes before the maximum, never below zero', () => {
  assert.deepEqual(recordingSetProgress(3 * minute), { show: true, minimum: minute, maximum: 3 * minute });
  assert.deepEqual(recordingSetProgress(90_000), { show: true, minimum: 0, maximum: 90_000 });
});
