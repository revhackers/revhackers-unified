import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { parsePost, type PostMeta } from '../src/lib/blog/parse.ts';
import { authors } from '../src/data/authors.ts';

const VIRTUAL_ID = 'virtual:blog-index';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function readPosts(blogDir: string): PostMeta[] {
  const authorIds = Object.keys(authors);
  const posts = fs
    .readdirSync(blogDir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => parsePost(name.slice(0, -3), fs.readFileSync(path.join(blogDir, name), 'utf8'), authorIds));
  return posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

export default function blogIndexPlugin(): Plugin {
  let blogDir = '';
  let cache: PostMeta[] | null = null;
  const getPosts = () => (cache ??= readPosts(blogDir));

  return {
    name: 'blog-index',
    configResolved(config) {
      blogDir = path.resolve(config.root, 'src/content/blog');
    },
    buildStart() {
      cache = null;
      getPosts();
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      return id === RESOLVED_ID ? `export const posts = ${JSON.stringify(getPosts())};` : null;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'blog-index.json', source: JSON.stringify(getPosts()) });
    },
    handleHotUpdate({ file, server }) {
      if (!file.includes(`${path.sep}src${path.sep}content${path.sep}blog${path.sep}`)) return;
      cache = null;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
