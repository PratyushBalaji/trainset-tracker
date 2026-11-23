import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = readJson('../trainsets.json');
const url = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const resolveModule = url(`export const dataset = ${JSON.stringify(data)}; export const resolvedTrainsets = []; export const decorateTrainsetForDate = t => t;`);
const coverageModule = url(ts.transpileModule(readFileSync(new URL('../src/lib/data/coverage.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText.replace("'./resolve'", JSON.stringify(resolveModule)));
const { orderedTrainsets, orderForFilters, contractScopes, pendingOn } = await import(coverageModule);
const source = ts.transpileModule(readFileSync(new URL('../src/lib/data/contracts.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText
  .replace("'./date'", JSON.stringify(url(`export const todayIsoDate = () => '2026-11-22';`)))
  .replace("'./coverage'", JSON.stringify(coverageModule))
  .replace("'./presentation'", JSON.stringify(url(`export const lineOrder = ['purple','green','yellow','pink','blue']; export const rollingStockDesign = {};`)))
  .replace("'./resolve'", JSON.stringify(resolveModule));
const { contractSummaries } = await import(url(source));

const allLines = ['yellow', 'green', 'purple', 'pink', 'blue'];
const allMakers = ['BEML', 'CRRC Nanjing Puzhen', 'Titagarh Rail Systems'];
const order = (lines = allLines, makers = allMakers) => orderForFilters(new Set(lines), new Set(makers));

test('filtered totals use procurement line and maker allocations even without delivered records', () => {
  assert.equal(order().ordered, 102);
  assert.deepEqual(orderForFilters(undefined, new Set(allMakers)), { ordered: 102, sharedPools: [] });
  assert.equal(order(allLines, ['BEML']).ordered, 66);
  assert.equal(order(allLines, ['CRRC Nanjing Puzhen']).ordered, 2);
  assert.equal(order(allLines, ['Titagarh Rail Systems']).ordered, 34);
  assert.equal(order(['yellow']).ordered, 21);
  assert.equal(order(['yellow'], ['BEML']).ordered, 6);
  assert.equal(order(['yellow'], ['CRRC Nanjing Puzhen']).ordered, 1);
  assert.equal(order(['yellow'], ['Titagarh Rail Systems']).ordered, 14);
  assert.equal(order(['pink']).ordered, 23);
  assert.equal(order(['blue']).ordered, 37);
  assert.equal(order(['pink', 'blue']).ordered, 60);
  assert.equal(order(['green'], ['BEML']).ordered, 0);
  assert.equal(order([]).ordered, 0);
  assert.equal(order(allLines, []).ordered, 0);
});

test('Purple/Green remains one shared procurement pool, not two exclusive allocations', () => {
  assert.deepEqual(order(['green']), { ordered: 21, sharedPools: ['purple/green'] });
  assert.deepEqual(order(['purple']), { ordered: 21, sharedPools: ['purple/green'] });
  assert.deepEqual(order(['purple', 'green']), { ordered: 21, sharedPools: [] });
  assert.deepEqual(order(['green'], ['Titagarh Rail Systems']), { ordered: 20, sharedPools: ['purple/green'] });
  assert.equal(order(['yellow', 'green']).ordered, 42);
});

test('allocation rows reconcile with each base order and variation without changing train records', () => {
  for (const scope of contractScopes) {
    const contract = data.contracts[scope.id];
    const sum = (allocations) => allocations.reduce((n, a) => {
      assert.ok(Number.isInteger(a.trainsets) && a.trainsets > 0);
      assert.ok(a.lines.length > 0 && new Set(a.lines).size === a.lines.length);
      assert.ok(allMakers.includes(a.manufacturer));
      assert.ok(a.lines.every((line) => allLines.includes(line)));
      return n + a.trainsets;
    }, 0);
    const base = contract.base_trainsets ?? contract.base_cars / data.rolling_stock[contract.rolling_stock[0]].cars_per_trainset;
    assert.equal(sum(contract.base_allocations), base);
    assert.ok(contract.allocation_sources.length);
    let total = base;
    for (const variation of contract.variations ?? []) {
      assert.equal(sum(variation.allocations), variation.additional_trainsets);
      assert.ok(variation.sources.length);
      total += variation.additional_trainsets;
    }
    assert.equal(total, scope.ordered);
    assert.equal(contract.allocation_changes, undefined);
  }
});

test('catalogue renders legacy augmentation separately without inflating tracked orders', () => {
  const contracts = contractSummaries('2026-11-22');
  assert.equal(contracts.length, 4);
  const legacy = contracts.find((c) => c.code === '3RS-DM');
  assert.equal(legacy.tracked, false);
  assert.equal(legacy.baseTrainsets, undefined);
  assert.equal(legacy.baseCars, 150);
  assert.equal(legacy.variations[0].trainsets, 7);
  assert.equal(legacy.dates[0].date, '2017-03-25');
  assert.equal(contracts.filter((c) => c.tracked).reduce((sum, c) => sum + c.ordered, 0), 102);
  assert.equal(orderedTrainsets, 102);
  assert.equal(pendingOn('2026-11-22'), 102); // No trainsets in this reader fixture.
  assert.deepEqual(contractScopes.map((c) => c.id), ['bmrcl-4rs-dm', 'bmrcl-5rs-dm']);
  for (const contract of contracts) {
    assert.ok(contract.description);
    assert.ok(contract.contractPeriod);
    assert.ok(contract.sources.length);
    for (const source of contract.sources) assert.equal(new URL(source).protocol, 'https:');
  }
});
