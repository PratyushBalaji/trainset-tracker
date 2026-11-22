import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText;
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const dateModule = moduleUrl(compile('../src/lib/data/date.ts'));
const evidenceModule = moduleUrl(compile('../src/lib/data/evidence.ts').replace("'./date'", JSON.stringify(dateModule)));
const { buildLineTimeline, historyDateLabel, trainMilestoneGroups } = await import(moduleUrl(
  compile('../src/lib/data/line-timeline.ts').replace("'./date'", JSON.stringify(dateModule)).replace("'./evidence'", JSON.stringify(evidenceModule))
));
const { todayIsoDate } = await import(dateModule);
const { milestoneDateLabel, referenceCount } = await import(evidenceModule);
const { createChartDrag } = await import(moduleUrl(compile('../src/lib/data/chart-drag.ts').replace("'./date'", JSON.stringify(dateModule))));
const { getCurrentStage, buildTimelineSegments, timelineStageDefinitions } = await import(moduleUrl(compile('../src/lib/data/lifecycle.ts').replace("'./date'", JSON.stringify(dateModule))));
const { reviewedQualification } = await import(moduleUrl(compile('../src/lib/data/reviewed-qualifications.ts')));
const { togglePinned, emphasizedStage } = await import(moduleUrl(compile('../src/lib/data/chart-interaction.ts')));
const { percentageBetween } = await import(dateModule);
const { buildServiceBands } = await import(moduleUrl(compile('../src/lib/data/service-chart.ts').replace("'./date'", JSON.stringify(dateModule))));

test('Gantt includes only dispatch, testing and service without changing historical statuses', () => {
  const milestones = [
    { key: 'factory_dispatch', date: '2026-01-10', sources: [] },
    { key: 'depot_arrival', date: '2026-01-20', sources: [] },
    { key: 'revenue_induction', date: '2026-02-01', sources: [] }
  ];
  const segments = buildTimelineSegments(milestones, '2026-03-01');
  assert.deepEqual(segments.map((segment) => segment.stageId), ['dispatch', 'testing', 'service']);
  assert.deepEqual(segments.map((segment) => [segment.start, segment.end]), [
    ['2026-01-10', '2026-01-20'], ['2026-01-20', '2026-02-01'], ['2026-02-01', '2026-03-01']
  ]);
  assert.deepEqual(timelineStageDefinitions.map((stage) => stage.id), ['dispatch', 'testing', 'service']);
  assert.deepEqual(buildTimelineSegments([], '2026-03-01'), []);
  assert.equal(getCurrentStage(milestones, '2026-01-01').stage.id, 'manufacturing');
});

test('single-pass service bands preserve every original SVG coordinate', () => {
  const data = JSON.parse(readFileSync(new URL('../trainsets.json', import.meta.url), 'utf8'));
  const trains = Object.values(data.trainsets);
  const order = ['purple', 'green', 'yellow', 'pink', 'blue'];
  const reference = (events, lines, count, bounds) => {
    const x = (date) => percentageBetween(date, bounds.start, bounds.end) * 10;
    const scale = 100 / Math.max(1, count);
    return lines.map((line, li) => {
      let top = `M ${x(bounds.start)} 100`, bottom = [], prevTop = 100, prevBottom = 100;
      for (const date of new Set(events.map((event) => event.date))) {
        const cumulative = (l) => events.filter((event) => event.line === l && event.date <= date).length;
        const yb = 100 - lines.slice(0, li).reduce((sum, l) => sum + cumulative(l), 0) * scale;
        const yt = yb - cumulative(line) * scale;
        const xd = x(date).toFixed(1);
        top += ` L ${xd} ${prevTop.toFixed(1)} L ${xd} ${yt.toFixed(1)}`;
        bottom.unshift(`L ${xd} ${yb.toFixed(1)} L ${xd} ${prevBottom.toFixed(1)}`);
        prevTop = yt; prevBottom = yb;
      }
      const end = x(bounds.end).toFixed(1);
      return { line, d: `${top} L ${end} ${prevTop.toFixed(1)} L ${end} ${prevBottom.toFixed(1)} ${bottom.join(' ')} Z` };
    });
  };
  for (const bounds of [{ start: '2023-11-05', end: '2026-11-22' }, { start: '2026-06-01', end: '2026-08-01' }]) {
    for (const fleet of [trains, [], ...order.map((line) => trains.filter((t) => (t.operational_line ?? t.intended_line) === line))]) {
      for (const key of ['depot_arrival', 'revenue_induction']) {
        const events = fleet.flatMap((t) => t.milestones[key]?.date <= bounds.end ? [{ date: t.milestones[key].date, line: t.operational_line ?? t.intended_line }] : [])
          .sort((a, b) => a.date.localeCompare(b.date));
        const lines = order.filter((line) => events.some((event) => event.line === line));
        assert.deepEqual(buildServiceBands(events, lines, fleet.length, bounds), reference(events, lines, fleet.length, bounds));
      }
    }
  }
  const bounds = { start: '2026-01-01', end: '2026-01-01' };
  const events = [{ date: bounds.start, line: 'yellow' }, { date: bounds.start, line: 'unknown' }];
  assert.deepEqual(buildServiceBands(events, ['yellow'], 2, bounds), reference(events, ['yellow'], 2, bounds));
});

test('pinned emphasis restores after previews, toggles off, and stays independent of inspection', () => {
  let stage = togglePinned(null, 'testing');
  let inspection = togglePinned(null, 'ts001:dispatch');
  assert.equal(emphasizedStage(stage, 'service'), 'service');
  assert.equal(emphasizedStage(stage, null), 'testing');
  stage = togglePinned(stage, 'service');
  assert.equal(stage, 'service');
  inspection = togglePinned(inspection, 'ts001:dispatch');
  assert.equal(inspection, null);
  assert.equal(stage, 'service');
  assert.equal(togglePinned(stage, 'service'), null);
});

test('drag sessions keep the captured date domain while filtered membership changes in either direction', () => {
  const domain = { start: '2026-01-01', end: '2026-11-16' };
  const drag = createChartDrag(domain, '2026-11-16');
  const expected = drag.dateAtRatio(0.8);
  domain.start = '2026-03-01';
  domain.end = '2026-05-18';
  assert.equal(drag.dateAtRatio(0.8), expected);
  assert.equal(drag.dateAtRatio(0), '2026-01-01');
  assert.equal(drag.dateAtRatio(1), '2026-11-16');
  assert.ok(drag.dateAtRatio(0.2) < drag.dateAtRatio(0.8));
  assert.equal(createChartDrag({ start: '2026-01-01', end: '2026-12-01' }, '2026-11-16').dateAtRatio(1), '2026-11-16');
});

test('evidence presentation preserves bounds, inference, provisional identity and occurrence counts', () => {
  assert.equal(milestoneDateLabel({ date: '2026-08-12', presentation: reviewedQualification('bmrcl-4rs-dm-ts019', 'factory_dispatch', '2026-08-12') }), 'By 12 Aug 2026');
  assert.match(milestoneDateLabel({ date: '2026-04-13', comments: 'Expected on or after 2026-04-13, arrived on 2026-05-10.' }), /unconfirmed date/);
  assert.match(milestoneDateLabel({ date: '2026-02-25', presentation: reviewedQualification('bmrcl-5rs-dm-ts003', 'factory_dispatch', '2026-02-25') }), /inferred/);
  assert.match(milestoneDateLabel({ date: '2026-10-02', presentation: reviewedQualification('bmrcl-4rs-dm-ts018', 'revenue_induction', '2026-10-02') }), /identity provisional/);
  assert.equal(referenceCount(1), '1 reference');
  const data = JSON.parse(readFileSync(new URL('../trainsets.json', import.meta.url), 'utf8'));
  const links = Object.values(data.trainsets['bmrcl-4rs-dm-ts001'].milestones).flatMap((m) => m.sources);
  assert.equal(referenceCount(links.length), '18 references');
  assert.equal(new Set(links).size, 17);
  const status = getCurrentStage([{ key: 'depot_arrival', date: '2026-06-26' }], '2026-01-01');
  assert.equal(status.stage.label, 'Pre-delivery (inferred)');
  assert.equal(getCurrentStage([{ key: 'depot_arrival', date: '2026-06-26' }], '2026-06-26').statusMilestone.key, 'depot_arrival');
});

test('readiness and other-event dates never become departure bounds through prose matching', () => {
  const data = JSON.parse(readFileSync(new URL('../trainsets.json', import.meta.url), 'utf8'));
  const raw = data.trainsets['bmrcl-4rs-dm-ts010'].milestones.factory_dispatch;
  const label = milestoneDateLabel({ ...raw, presentation: reviewedQualification('bmrcl-4rs-dm-ts010', 'factory_dispatch', raw.date) });
  assert.match(label, /14 Apr 2026.*unconfirmed/);
  assert.doesNotMatch(label, /^By |^On or after /);
  assert.doesNotMatch(milestoneDateLabel({date:'2026-04-14',comments:'Ready by 2026-04-14, departed before 2026-04-21.'}), /^By /);
  assert.equal(milestoneDateLabel({date:'2025-01-12',comments:'Arrived on 2025-01-12; unloaded by 2025-01-13.',presentation:reviewedQualification('bmrcl-4rs-dm-ts016','depot_arrival','2025-01-12')}), '12 Jan 2025');
  assert.equal(reviewedQualification('bmrcl-4rs-dm-ts019','factory_dispatch','2026-08-13'), undefined);
});

const train = {
  id: 'bmrcl-5rs-dm-ts008', trainsetNumber: 'TS008', displayLine: 'blue', intendedLine: 'blue',
  milestones: [
    { key: 'factory_dispatch', date: '2026-06-25', sources: [], comments: 'Inferred from arrival.' },
    { key: 'depot_arrival', date: '2026-06-26', sources: ['https://example.com/delivery'] },
    { key: 'mainline_testing', date: '2026-11-07', sources: ['https://example.com/testing'] },
    { key: 'revenue_induction', date: '2027-01-01', sources: ['https://example.com/future'] }
  ]
};
const opening = { id: 'line-trial', date: '2026-09-01', title: 'Line trials', category: 'Testing', description: '', sources: [] };

test('detailed view sorts real events, omits unsupported dispatch and future milestones', () => {
  const entries = buildLineTimeline([opening], [train], 'blue', '2026-11-15');
  assert.deepEqual(entries.map((e) => e.date), ['2026-06-26', '2026-09-01', '2026-11-07', '2026-11-15']);
  assert.equal(entries[2].title, 'TS008 - Mainline Testing Commenced');
  assert.equal(entries[0].groups[0].milestone.sources[0], 'https://example.com/delivery');
});

test('each train milestone stays separate and belongs to its assigned line', () => {
  const entries = buildLineTimeline([], [train], 'blue', '2026-11-15');
  assert.equal(entries[0].date, '2026-06-26');
  assert.deepEqual(entries.slice(0, -1).map((e) => e.groups[0].label), ['Delivery', 'Testing']);
  assert.equal(buildLineTimeline([], [train], 'yellow', '2026-11-15').length, 1);
  const sourced = { ...train, milestones: train.milestones.map((m) => m.key === 'factory_dispatch' ? { ...m, sources: ['https://example.com/dispatch'] } : m) };
  assert.equal(trainMilestoneGroups(sourced, '2026-11-15')[0].label, 'Dispatch');
});

test('date bounds, inferred dates and periods keep their qualifications', () => {
  assert.equal(historyDateLabel({ date: '2024-05-10', date_basis: 'reported_by' }), 'Reported by 10 May 2024');
  assert.equal(historyDateLabel({ period: '2017-08' }), 'August 2017');
  assert.equal(historyDateLabel({ date: '2025-07-22', end_date: '2025-07-25' }), '22 Jul 2025 to 25 Jul 2025');
  assert.equal(historyDateLabel({ date: '2025-07-17', date_basis: 'derived' }), '17 Jul 2025 (derived)');
  assert.equal(historyDateLabel({ date: '2025-07-17', date_basis: 'derived', presentation: { disputed: true } }), '17 Jul 2025 (reported dates differ) (derived)');
  const bounded = { ...train, milestones: [{ key: 'mainline_testing', date: '2025-12-27', sources: ['https://example.com'], presentation: { relation: 'before' }, comments: 'Testing was already underway on or before 2025-12-27.' }] };
  assert.match(trainMilestoneGroups(bounded, '2026-11-15')[0].sentence, /Testing underway by/);
  assert.equal(todayIsoDate(new Date('2026-11-13T18:30:00Z')), '2026-11-14');
});

test('line records have unique IDs, dates or periods, and usable citations', () => {
  const { lines } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8'));
  for (const line of Object.values(lines)) {
    assert.equal(new Set(line.milestones.map((m) => m.id)).size, line.milestones.length);
    for (const milestone of line.milestones) {
      assert.ok(Boolean(milestone.date) !== Boolean(milestone.period));
      if (milestone.date) assert.match(milestone.date, /^\d{4}-\d{2}-\d{2}$/);
      if (milestone.period) assert.match(milestone.period, /^\d{4}-\d{2}$/);
      if (milestone.end_date) assert.ok(milestone.end_date >= milestone.date);
      assert.ok(milestone.sources.length > 0);
      for (const source of milestone.sources) assert.equal(new URL(source).protocol, 'https:');
    }
  }
});

const reviewedTargetsModule = moduleUrl(compile('../src/lib/data/reviewed-targets.ts'));
const { buildDelayStory, monthsBetween, timelineGaps } = await import(moduleUrl(
  compile('../src/lib/data/delay-story.ts').replace("'./date'", JSON.stringify(dateModule)).replace("'./reviewed-targets'", JSON.stringify(reviewedTargetsModule))
));

test('delay story counts missed opening targets only while reviewed target text still matches', () => {
  const lines = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8'));
  const yellow = lines.lines.yellow.milestones;
  const story = buildDelayStory('yellow', yellow, '2026-11-22');
  assert.equal(story.opening.date, '2025-08-11');
  assert.equal(story.earliest.label, 'Dec 2022');
  assert.equal(story.targets.find((t) => t.milestoneId === 'inauguration-announcement').outcome, 'met');
  assert.equal(story.targets.find((t) => t.milestoneId === 'reduced-fleet-option').outcome, 'not-taken');
  assert.equal(story.targets.find((t) => t.milestoneId === 'feb2024-target').monthsLate, 18);
  assert.equal(story.missed, 7);
  const edited = yellow.map((m) => m.id === 'feb2024-target' ? { ...m, revised_target: 'March 2024' } : m);
  assert.equal(buildDelayStory('yellow', edited, '2026-11-22').targets.some((t) => t.milestoneId === 'feb2024-target'), false);
  assert.equal(buildDelayStory('blue', [], '2026-11-22'), null);
  assert.equal(monthsBetween('2022-12-31', '2025-08-11'), 32);
});

test('timeline gaps only mark long silences', () => {
  const gaps = timelineGaps([
    { id: 'a', sortDate: '2014-02-21', date: '2014-02-21' },
    { id: 'b', sortDate: '2017-06' },
    { id: 'c', sortDate: '2017-08' }
  ]);
  assert.deepEqual(Object.keys(gaps), ['a']);
});

test('Pink line research preserves event dates, bounds, intervals and separate openings', () => {
  const { pink } = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
  const byId = new Map(pink.milestones.map((milestone) => [milestone.id, milestone]));
  assert.equal(pink.research_status, 'preliminary');
  assert.equal(byId.get('inauguration').date, '2026-11-13');
  assert.equal(byId.get('passenger-opening').date, '2026-11-14');
  for (const [id, start, end] of [
    ['rdso-oscillation-trials', '2026-04-28', '2026-05-09'],
    ['rolling-stock-safety-inspection', '2026-08-12', '2026-08-14'],
    ['cmrs-inspection', '2026-10-06', '2026-10-08']
  ]) {
    assert.equal(byId.get(id).date, start);
    assert.equal(byId.get(id).end_date, end);
  }
  for (const id of ['underground-track-reported-complete', 'isa-certification-reported', 'cmrs-observations-reported']) {
    assert.equal(byId.get(id).date_basis, 'reported_by');
    assert.match(historyDateLabel(byId.get(id)), /^Reported by /);
  }
  assert.equal(byId.get('interim-speed-certificate').period, '2026-08');
  assert.equal(byId.get('interim-speed-certificate').date, undefined);
  assert.equal(byId.get('gr-replacement-agreement').period, '2021-08');
  assert.equal(byId.get('simplex-termination').presentation.disputed, true);
  assert.match(byId.get('underground-trial-access-request').description, /sought permission/);
  assert.ok(!pink.milestones.some((milestone) => /TS\d{3}/.test(milestone.title)));
  for (const milestone of pink.milestones) {
    for (const field of ['date', 'end_date']) {
      if (milestone[field]) assert.equal(new Date(milestone[field]).toISOString().slice(0, 10), milestone[field]);
    }
  }
});

test('Pink forecasts remain scoped reports, not future events or elevated-opening scorecard targets', () => {
  const pink = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines.pink;
  const byId = new Map(pink.milestones.map((milestone) => [milestone.id, milestone]));
  const march = byId.get('march2025-corridor-target');
  const december = byId.get('december2024-corridor-forecast');
  assert.ok(march.date < december.date);
  assert.equal(march.previous_target, undefined);
  assert.equal(december.previous_target, undefined);
  assert.match(byId.get('early-elevated-construction-deadlines').scope, /not passenger opening/);
  assert.match(byId.get('after-october15-opening-window').comments, /lower-bound window, not a precise deadline/);
  assert.match(byId.get('tentative-november15-inauguration').comments, /not a missed passenger-service deadline/);
  const target = byId.get('may2027-underground-target');
  const reaffirmed = byId.get('may2027-underground-target-reaffirmed');
  assert.equal(target.date, '2026-10-15');
  assert.equal(target.revised_target, 'May 2027');
  assert.equal(reaffirmed.previous_target, reaffirmed.revised_target);
  assert.equal(target.scope, 'Underground section');
  // Whole-line and underground forecasts are not scored against the elevated opening.
  const pinkStory = buildDelayStory('pink', pink.milestones, '2026-11-22');
  const elevatedIds = pinkStory.sections.find((x) => x.id === 'elevated').targets.map((t) => t.milestoneId);
  for (const id of ['march2025-corridor-target', 'december2024-corridor-forecast', 'may2027-underground-target']) assert.equal(elevatedIds.includes(id), false, id);
  const entries = buildLineTimeline(pink.milestones, [], 'pink', '2026-11-22');
  assert.equal(entries.filter((entry) => entry.kind === 'line').length, pink.milestones.length);
  assert.ok(entries.every((entry) => !entry.date || entry.date <= '2026-11-22'));
  assert.ok(entries.every((entry, i) => i === 0 || entries[i - 1].sortDate <= entry.sortDate));
});

test('pink delay story scores elevated and underground sections separately', () => {
  const lines = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8'));
  const story = buildDelayStory('pink', lines.lines.pink.milestones, '2026-11-22');
  const [elevated, underground] = story.sections;
  assert.equal(elevated.id, 'elevated');
  assert.equal(elevated.opening.date, '2026-11-14');
  assert.equal(elevated.targets.length, 12);
  assert.equal(elevated.missed, 8);
  assert.equal(elevated.earliest.label, 'Dec 2025');
  assert.equal(elevated.targets.find((t) => t.milestoneId === 'august15-internal-target').monthsLate, 3);
  assert.equal(elevated.targets.find((t) => t.milestoneId === 'after-october15-opening-window').outcome, 'held');
  assert.equal(elevated.targets.find((t) => t.milestoneId === 'november13-inauguration-reported').outcome, 'met');
  // Underground has not opened: passed dates are missed, replaced future dates are pushed back.
  assert.equal(underground.opening, undefined);
  assert.equal(underground.missed, 2);
  assert.equal(underground.current.label, 'May 2027');
  assert.equal(underground.targets.find((t) => t.milestoneId === 'ministerial-august15-and-march2027-forecast').outcome, 'superseded');
  // Restating reports are not counted again.
  for (const id of ['aiib-december2025-monitoring', 'may2027-underground-target-reaffirmed']) {
    assert.equal(story.targets.some((t) => t.milestoneId === id), false, id);
  }
  // Single-section lines are unchanged.
  const yellow = buildDelayStory('yellow', lines.lines.yellow.milestones, '2026-11-22');
  assert.equal(yellow.sections.length, 1);
  assert.equal(yellow.missed, 7);
});

test('opening targets have unique section/number keys for keyed rendering', () => {
  // The Timeline rail and feed key targets by `${section}-${number}`; a duplicate key crashes the page.
  const lines = JSON.parse(readFileSync(new URL('../lines.json', import.meta.url), 'utf8')).lines;
  for (const [id, line] of Object.entries(lines)) {
    const story = buildDelayStory(id, line.milestones, '2026-11-22');
    if (!story) continue;
    const keys = story.targets.map((t) => `${t.section}-${t.number}`);
    assert.equal(new Set(keys).size, keys.length, `${id} has duplicate target keys`);
  }
});
