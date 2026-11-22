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
const { orderedTrainsets, contractScopes, pendingOn } = await import(coverageModule);
const source = ts.transpileModule(readFileSync(new URL('../src/lib/data/contracts.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext }
}).outputText
  .replace("'./date'", JSON.stringify(url(`export const todayIsoDate = () => '2026-11-22';`)))
  .replace("'./coverage'", JSON.stringify(coverageModule))
  .replace("'./presentation'", JSON.stringify(url(`export const lineOrder = ['purple','green','yellow','pink','blue']; export const rollingStockDesign = {};`)))
  .replace("'./resolve'", JSON.stringify(resolveModule));
const { contractSummaries } = await import(url(source));

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
