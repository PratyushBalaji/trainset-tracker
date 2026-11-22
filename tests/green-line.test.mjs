import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { green } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
const byId = new Map(green.milestones.map((m) => [m.id, m]));

test('Green preserves five passenger-opening stages separately from ceremonies', () => {
  assert.equal(green.research_status, 'preliminary');
  const stages = [
    ['first-section', '2014-02-28', '2014-03-01'],
    ['nagasandra', '2015-05-01', '2015-05-01'],
    ['silk-institute', '2021-01-14', '2021-01-15']
  ];
  for (const [id, ceremony, passengers] of stages) {
    assert.equal(byId.get(`${id}-inauguration`).date, ceremony);
    assert.equal(byId.get(`${id}-passenger-opening`).date, passengers);
  }
  assert.equal(byId.get('phase1-completion-inauguration').date, '2017-06-17');
  assert.equal(byId.get('yelachenahalli-passenger-opening').date, '2017-06-18');
  assert.equal(byId.get('madavara-passenger-opening').date, '2024-11-07');
  assert.equal(byId.get('madavara-ministerial-inspection-ride').category, 'Inspection');
  assert.ok(!green.milestones.some((m) => m.id === 'madavara-inauguration'));
  assert.equal(green.milestones.filter((m) => m.id.endsWith('-passenger-opening')).length, 5);
});

test('Green keeps conflicting trial dates, inspection intervals and shared target scope', () => {
  for (const [id, period] of [
    ['train-hauled-through-tunnels', '2016-11'],
    ['underground-powered-trials', '2017-03'],
    ['madavara-trials-disputed', '2024-08']
  ]) {
    const m = byId.get(id);
    assert.equal(m.period, period);
    assert.equal(m.date, undefined);
    assert.equal(m.presentation.disputed, true);
  }
  assert.notEqual(byId.get('train-hauled-through-tunnels').category, 'Testing');
  assert.equal(byId.get('remaining-green-cmrs-inspection').end_date, '2017-06-01');
  assert.equal(byId.get('remaining-green-cmrs-authorisation').date, '2017-06-07');
  assert.equal(byId.get('silk-institute-cmrs-inspection').date, '2020-11-18');
  assert.equal(byId.get('silk-institute-cmrs-inspection').end_date, '2020-11-19');
  assert.equal(byId.get('silk-institute-cmrs-authorisation').date, '2020-11-23');
  assert.equal(byId.get('madavara-final-segment').date, '2023-04-30');
  assert.equal(byId.get('madavara-final-segment').end_date, '2023-05-01');
  assert.match(byId.get('phase1-march2015-budget-target').scope, /Shared Phase 1/);
  assert.match(byId.get('silk-institute-historical-schedules-recalled').scope, /civil/);
  assert.match(byId.get('madavara-unofficial-october-november-window').revised_target, /unofficial/);
});

test('Green records have unique identities, valid dates and cited evidence', () => {
  assert.equal(byId.size, green.milestones.length);
  for (const m of green.milestones) {
    assert.ok(m.scope && m.sources.length && (m.date || m.period), m.id);
    assert.ok(!/TS\d{3}/.test(m.title));
    for (const source of m.sources) assert.equal(new URL(source).protocol, 'https:');
    for (const field of ['date', 'end_date']) if (m[field]) {
      assert.equal(new Date(m[field]).toISOString().slice(0, 10), m[field]);
      assert.ok(m[field] <= '2026-11-22');
    }
    if (m.period) assert.match(m.period, /^\d{4}-(0[1-9]|1[0-2])$/);
    if (m.end_date) assert.ok(m.end_date >= m.date);
  }
});
