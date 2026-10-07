import { join, sep } from "node:path";

const root = join(import.meta.dir, "public");

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const path = join(root, pathname);
    if (!path.startsWith(root + sep)) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});

console.log(`chickenbot.si serving ${root} at ${server.url}`);
