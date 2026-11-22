import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { purple } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
const byId = new Map(purple.milestones.map((m) => [m.id, m]));

test('Purple separates passenger openings from earlier and later ceremonies', () => {
  for (const [id, ceremony, service] of [
    ['reach1', '2011-10-20', '2011-10-20'],
    ['reach2', '2015-11-16', '2015-11-18'],
    ['kengeri', '2021-08-29', '2021-08-30'],
    ['whitefield', '2023-03-25', '2023-03-26']
  ]) {
    assert.equal(byId.get(`${id}-inauguration`).date, ceremony);
    assert.equal(byId.get(`${id}-passenger-opening`).date, service);
  }
  assert.equal(byId.get('reach2-passenger-opening').presentation.disputed, true);
  assert.equal(byId.get('underground-inauguration').date, '2016-04-29');
  assert.equal(byId.get('original-corridor-passenger-opening').date, '2016-04-30');
  assert.equal(byId.get('connecting-passenger-opening').date, '2023-10-09');
  assert.equal(byId.get('challaghatta-passenger-opening').date, '2023-10-09');
  assert.equal(byId.get('final-links-inauguration').date, '2023-10-20');
});

test('Purple keeps evidence bounds, month precision and corrected testing dates', () => {
  assert.equal(byId.get('phase1-dpr-prepared').period, '2003-03');
  assert.equal(byId.get('phase1-dpr-submitted').period, '2003-05');
  assert.equal(byId.get('reach1-first-mainline-testing').period, '2010-12');
  assert.equal(byId.get('reach1-first-mainline-testing').date, undefined);
  assert.equal(byId.get('first-underground-movement').date, '2015-03-12');
  assert.equal(byId.get('reach2-safety-authorisation').period, '2015-09');
  assert.equal(byId.get('reach2-safety-authorisation').presentation.disputed, true);
  for (const [id, date] of [
    ['reach1-rdso-speed-clearance', '2011-08-14'],
    ['underground-track-reported-complete', '2015-10-06'],
    ['underground-both-track-dynamic-testing', '2015-11-11'],
    ['underground-clearance-received', '2016-04-08']
  ]) {
    assert.equal(byId.get(id).date, date);
    assert.equal(byId.get(id).date_basis, 'reported_by');
  }
  assert.equal(byId.get('underground-cmrs-inspection').end_date, '2016-04-06');
  assert.equal(byId.get('kengeri-cmrs-inspection').date, '2021-08-11');
  assert.equal(byId.get('kengeri-cmrs-inspection').end_date, '2021-08-12');
  assert.equal(byId.get('kengeri-cmrs-authorisation').date, '2021-08-16');
  assert.equal(byId.get('whitefield-first-trial').date, '2022-10-21');
  assert.equal(byId.get('extension-isa-engagement').category, 'Approval');
  assert.ok(!purple.milestones.some((m) => m.id === 'phase2-state-approval'));
});

test('Purple retrospective deadlines retain report dates and distinct target scopes', () => {
  for (const m of purple.milestones.filter((m) => m.id.startsWith('kengeri-') && m.id.includes('target-recalled'))) {
    assert.equal(m.date, '2021-06-23');
    assert.equal(m.date_basis, 'reported_on');
  }
  assert.match(byId.get('partial-underground-may2015-proposal').scope, /only/);
  assert.match(byId.get('reach2-december2014-civil-target').scope, /not passenger/);
  assert.match(byId.get('eastern-march2023-source-forecast').revised_target, /rather than confirmed official/);
  assert.match(byId.get('eastern-march2023-source-forecast').scope, /Entire/);
  assert.match(byId.get('kengeri-august20-ceremony-recalled').scope, /inauguration only/);
  assert.equal(byId.get('kengeri-june2021-target-reported').date, '2021-06-23');
});

test('Purple records have unique identities, valid dates and evidence', () => {
  assert.equal(purple.research_status, 'preliminary');
  assert.equal(byId.size, purple.milestones.length);
  for (const m of purple.milestones) {
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
