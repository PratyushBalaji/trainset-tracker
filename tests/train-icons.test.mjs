import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModule } from './helpers/load-module.mjs';

const { trainDesignLabels } = await import(loadModule(new URL('../src/lib/data/presentation.ts', import.meta.url)));

test('every train design and variant exposes the reusable SVG target', () => {
  for (const design of Object.keys(trainDesignLabels)) {
    for (const variant of ['small', 'solid', 'outline']) {
      const svg = readFileSync(new URL(`../static/icons/trains/${design}-${variant}.svg`, import.meta.url), 'utf8');
      assert.match(svg, /^<svg\b[^>]*\bid="train"/);
      assert.match(svg, /\bviewBox="[^"]+"/);
      assert.ok(svg.includes('currentColor'));
    }
  }
});
