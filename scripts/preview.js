import { join, resolve, sep } from 'node:path';

export function startPreview({ root = 'dist', port = Number(process.env.PORT ?? 3000) } = {}) {
  const base = resolve(root);
  return Bun.serve({
    port,
    async fetch(req) {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url).pathname);
      } catch {
        return new Response('Bad request', { status: 400 });
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const path = join(base, pathname);
      if (!path.startsWith(base + sep)) return new Response('Forbidden', { status: 403 });
      const file = Bun.file(path);
      if (!(await file.exists())) return new Response('Not found', { status: 404 });
      return new Response(file);
    },
  });
}

if (import.meta.main) {
  const server = startPreview({ root: process.argv[2] });
  console.log(`serving ${resolve(process.argv[2] ?? 'dist')} at ${server.url}`);
}
