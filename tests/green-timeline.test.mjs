import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const dateModule = moduleUrl(compile('../src/lib/data/date.ts'));
const targetsModule = moduleUrl(compile('../src/lib/data/reviewed-targets.ts'));
const { buildDelayStory } = await import(moduleUrl(
  compile('../src/lib/data/delay-story.ts').replace("'./date'", JSON.stringify(dateModule)).replace("'./reviewed-targets'", JSON.stringify(targetsModule))
));
const { hiddenMilestones, visibleMilestones } = await import(moduleUrl(compile('../src/lib/data/timeline-curation.ts')));
const { lines } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8'));

test('curated-off timeline entries still exist in lines.json', () => {
  for (const [lineId, ids] of Object.entries(hiddenMilestones)) {
    const known = new Set(lines[lineId].milestones.map((m) => m.id));
    for (const id of ids) assert.ok(known.has(id), `${lineId}: hidden milestone ${id} no longer exists`);
  }
});

test('curation never hides deadlines or the passenger openings targets are scored against', () => {
  for (const [lineId, ids] of Object.entries(hiddenMilestones)) {
    const byId = new Map(lines[lineId].milestones.map((m) => [m.id, m]));
    const openings = new Set((buildDelayStory(lineId, lines[lineId].milestones, '2026-11-22')?.sections ?? []).map((s) => s.opening?.milestoneId));
    for (const id of ids) {
      assert.notEqual(byId.get(id).category, 'Deadline', `${lineId}: ${id} is a deadline`);
      assert.ok(!openings.has(id), `${lineId}: ${id} is a scored passenger opening`);
    }
  }
  assert.equal(visibleMilestones('green', lines.green.milestones).length, lines.green.milestones.length - hiddenMilestones.green.length);
});

test('green targets are scored per opening stage', () => {
  const story = buildDelayStory('green', lines.green.milestones, '2026-11-22');
  const byId = Object.fromEntries(story.sections.map((s) => [s.id, s]));
  assert.deepEqual(story.sections.map((s) => s.id), ['stage1', 'stage3', 'stage4', 'stage5']);
  assert.equal(story.targets.length, 24);
  assert.equal(byId.stage1.opening.date, '2014-03-01');
  assert.equal(byId.stage3.opening.date, '2017-06-18');
  assert.equal(byId.stage4.opening.date, '2021-01-15');
  assert.equal(byId.stage5.opening.date, '2024-11-07');
  assert.deepEqual(story.sections.map((s) => s.missed), [2, 6, 4, 8]);
  assert.equal(byId.stage3.earliest.label, 'Dec 2013 baseline');
  assert.equal(byId.stage5.targets.find((t) => t.milestoneId === 'madavara-january2022-target-report').monthsLate, 34);
  // Disputed, unofficial and retrospective reports stay unscored.
  for (const id of ['silk-institute-november1-forecast', 'madavara-unofficial-october-november-window', 'phase1-historical-targets-recalled', 'silk-institute-historical-schedules-recalled']) {
    assert.equal(story.targets.some((t) => t.milestoneId === id && t.announced), false, id);
  }
});
