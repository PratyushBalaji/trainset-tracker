import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const cache = new Map();
const toUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;

/** Compile pure data modules and their relative TS/JSON imports for Node's test runner. */
export function loadModule(path) {
  const file = path instanceof URL ? fileURLToPath(path) : path;
  if (cache.has(file)) return cache.get(file);
  let code;
  if (file.endsWith('.json')) {
    code = `export default ${readFileSync(file, 'utf8')};`;
  } else {
    code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g, (_, q, spec) => {
      const base = resolve(dirname(file), spec);
      const target = [base, `${base}.ts`, `${base}.svelte.ts`].find((p) => existsSync(p) && !p.endsWith('/'));
      if (!target) throw new Error(`Cannot resolve ${spec} from ${file}`);
      return `from ${JSON.stringify(loadModule(target))}`;
    });
  }
  const url = toUrl(code);
  cache.set(file, url);
  return url;
}
