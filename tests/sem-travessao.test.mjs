import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../src');
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

describe('texto do site', () => {
  it('não usa travessão (U+2014) nem meia-risca (U+2013) em src', () => {
    const ocorrencias = [];
    for (const file of walk(root)) {
      if (!/\.(ts|tsx|css|md)$/.test(file)) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/[\u2013\u2014]/.test(line)) {
            ocorrencias.push(`${path.relative(root, file)}:${i + 1}`);
          }
        });
    }
    expect(ocorrencias).toEqual([]);
  });
});
