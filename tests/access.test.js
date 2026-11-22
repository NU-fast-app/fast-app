import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canListen, canPlay, canRecord } from '../src/access.js';

test('players can play sets but cannot open Listen or record', () => {
  assert.equal(canPlay('player'), true);
  assert.equal(canListen('player'), false);
  assert.equal(canRecord('player'), false);
});

test('other care team roles retain Listen access', () => {
  for (const access of ['lead', 'administrator', 'clinician', 'stories']) {
    assert.equal(canListen(access), true, access);
  }
});
