// Guards the Home story carousel: if a data edit (trainset dates, contract periods, line targets)
// makes a slide's reviewed reading stop matching, the slide would silently vanish from the site.
// This test fails instead, so the change has to be looked at before it ships.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
const toUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;

/** Compile a src module and its relative imports (TS and JSON) into importable data URLs. */
function load(file) {
  if (cache.has(file)) return cache.get(file);
  let url;
  if (file.endsWith('.json')) {
    url = toUrl(`export default ${readFileSync(file, 'utf8')};`);
  } else {
    let code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    code = code.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g, (_, q, spec) => {
      const base = resolve(dirname(file), spec);
      const target = [base, `${base}.ts`, `${base}.svelte.ts`].find((p) => existsSync(p) && !p.endsWith('/'));
      if (!target) throw new Error(`Cannot resolve ${spec} from ${file}`);
      return `from ${JSON.stringify(load(target))}`;
    });
    url = toUrl(code);
  }
  cache.set(file, url);
  return url;
}

const { buildStories } = await import(load(resolve(root, 'src/lib/data/stories.ts')));
const { todayIsoDate } = await import(load(resolve(root, 'src/lib/data/date.ts')));

// Every slide the Home carousel is expected to show. Adding a slide: add its id here.
const EXPECTED = [
  'yellow-deadlines',
  'pink-deadlines',
  'purple-parts',
  'bmrcl-4rs-dm-delivery',
  'delivery-to-passengers',
  'waiting-now'
];

test('every Home story slide still builds from the current data', () => {
  const stories = buildStories(todayIsoDate());
  const ids = stories.map((s) => s.id);
  const missing = EXPECTED.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, [], `Story slides no longer built: ${missing.join(', ')}. A data change probably stopped a reviewed reading from matching (see src/lib/data/stories.ts and reviewed-targets.ts).`);
  assert.deepEqual(ids, EXPECTED, 'Story order or set changed; update EXPECTED if intended.');
});

test('story slides contain no broken numbers or blank text', () => {
  for (const s of buildStories(todayIsoDate())) {
    const text = [s.kicker, s.headline, s.body, JSON.stringify(s.visual)].join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|Infinity/, `${s.id} has a missing value: ${text.slice(0, 200)}`);
    assert.ok(s.headline.trim() && s.body.trim(), `${s.id} has empty text`);
    if (s.visual.type === 'ladder') assert.ok(s.visual.rows.length > 1, `${s.id} ladder is empty`);
    if (s.visual.type === 'window') assert.ok(s.visual.marks.length > 0, `${s.id} has no deliveries`);
    if (s.visual.type === 'bars') assert.ok(s.visual.rows.every((r) => r.value >= 0 && r.value <= s.visual.max + 0.5), `${s.id} bar out of range`);
  }
});
