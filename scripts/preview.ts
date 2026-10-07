// usage: bun scripts/preview.ts [root] [--csp]   (serves dist/ by default; --csp sends PRODUCTION_CSP)
import { join, resolve, sep } from 'node:path';

/**
 * The self-only policy infra serves in production, for testing against locally. data: images are the
 * drink icons drawn into speech bubbles. connect-src 'self' deliberately blocks remote brain links.
 */
export const PRODUCTION_CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function startPreview({ root = 'dist', port = Number(process.env.PORT ?? 3000), csp = false } = {}) {
  const base = resolve(root);
  const headers: Record<string, string> = csp ? { 'Content-Security-Policy': PRODUCTION_CSP } : {};
  return Bun.serve({
    port,
    async fetch(req) {
      let pathname: string;
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
      return new Response(file, { headers });
    },
  });
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const csp = args.includes('--csp');
  const root = args.find((a) => !a.startsWith('--'));
  const server = startPreview({ root, csp });
  console.log(`serving ${resolve(root ?? 'dist')} at ${server.url}${csp ? ' with the production CSP' : ''}`);
}
