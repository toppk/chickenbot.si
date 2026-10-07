# Release and CI

How a commit of this repo becomes https://chickenbot.si. Three parties are involved:

- **This repo (the site maintainer):** the page, the Nix flake that builds it, and CI.
- **Branding (the release manager):** reviews a candidate commit and asks infra to pin it.
- **Infra:** DNS, TLS, the NixOS host, deployment, monitoring and rollback.

Agreed in branding's `docs/chickenbot-si-launch.md` and infra's
`sysadm/requests/2026-10-07-chickenbot-static-test-response.md`.

## The route

1. A change lands on `master` and **CI goes green** (below). CI builds and checks; it never deploys
   and holds no host credentials.
2. The maintainer sends branding the **full commit hash** and the **green CI run**.
3. Branding reviews them and sends infra a **pin request**.
4. Infra pins that commit of this flake, builds `packages.x86_64-linux.default` (the site's `dist/`)
   on its own machines, and serves it from **ne2**: haproxy terminates TLS, and a loopback nginx
   serves the Nix output read-only. `www.chickenbot.si` 301-redirects to the apex.
5. Infra verifies the deployed page from outside: headers, CSP, assets, the revision, and a
   Playwright browser smoke test from foundation. The owner does visual UAT before the test phase is
   called public.

**Rollback** is infra's: re-pin the previous commit and run `bin/ship`, or a NixOS rollback on ne2.
The site has no state to migrate.

CI artifacts (the uploaded `dist/`) are for inspection only. They expire and need a token, so the
deployed bits always come from `nix build` of the pinned commit.

## The Nix build

`flake.nix` (nixpkgs `nixos-26.05`, locked to the same commit infra's hosts use):

| Output | What it is |
|---|---|
| `packages.x86_64-linux.default` | the built `dist/`: what infra serves |
| `packages.x86_64-linux.nodeModules` | runtime dependencies (three.js, the fonts), a fixed-output derivation from the frozen `bun.lock` |
| `packages.x86_64-linux.bun` | Bun **1.4.2**, the release zip pinned by hash (matches Bun's published SHA-256), not nixpkgs' bun |
| `checks.x86_64-linux.site` | fails unless `dist/` has the fonts, favicon, licences and the revision stamp, and no Google Fonts |

- The dependency step runs `bun install --frozen-lockfile --production --ignore-scripts`. Only runtime
  dependencies are needed to build `dist/`, which also keeps the output identical on any machine.
  **When `bun.lock` changes, update its `outputHash`.** `nix build` fails and prints the new value,
  and CI's `nix` job catches a stale one.
- The flake sets `CHICKENBOT_REV` to the commit's short hash (`-dirty` for an uncommitted tree).
  The build stamps it into `index.html` as `<meta name="revision" content="…">`, and the page shows it
  as "Build:" in the stats window. Check a deployment with
  `curl -s https://chickenbot.si/ | grep -o '<meta name="revision"[^>]*>'`.
- Both derivations rebuild bit-for-bit (`nix build --rebuild`).

## What CI checks

`.github/workflows/ci.yml`, on every push and pull request. Actions are pinned to commit SHAs.

**`check` job**:

| Step | Fails when |
|---|---|
| `bun install --frozen-lockfile` | `bun.lock` doesn't match `package.json` |
| `bun run lint` | any Biome error or warning |
| `bun run typecheck` | any TypeScript error |
| smoke test, CDN build | the page breaks (served without CSP, since this build loads jsDelivr) |
| smoke test, bundled build | the page breaks under the **production CSP**: console errors, third-party requests, failed assets, the visitor defaults, the blocked-brain-link fallback (see `docs/architecture.md`) |
| visual regression | any of 9 fixed views differs from its committed reference image by more than 0.2% of pixels |

A green run uploads the bundled `dist/`. A visual failure uploads the diff images.

**`nix` job**: `nix build .#default` and `nix flake check` on a clean checkout.

## What gets served

```
index.html                    no-cache; carries <meta name="revision">
chunk-<hash>.js / .css        immutable, long cache (~165 KB gzipped JS)
chunk-<hash>.js.map           source map, kept for diagnosing rendering issues
*-<hash>.woff2                the fonts, 9 subsets; browsers fetch only the ones they need
favicon-<hash>.ico / .png     linked from index.html
favicon.ico                   unhashed copy for clients that ask for /favicon.ico
licenses/                     OFL notices for the fonts, MIT for three.js
```

- **Paths are relative**, so the site also works under a sub-path. Only `index.html`, `favicon.ico`
  and `licenses/*` have fixed names; everything else is content-hashed.
- **JavaScript** must be served as `text/javascript` (ES module). Compress text assets.
- **No third-party requests.** Fonts and icons are served by the site.
- **CSP**: the page works under a self-only policy. This is the one tested in CI (`PRODUCTION_CSP` in
  `scripts/preview.ts`; `bun run preview -- --csp` serves it locally):

  ```
  default-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  ```

  `data:` images are the drink icons drawn into speech bubbles. `connect-src 'self'` deliberately
  blocks remote brain links (below).

## The brain link

The page runs its own local brain. A remote brain is a later, separately reviewed service; its
address is reserved as `wss://chickenbot.si/brain`, and there is no backend, route or port for it now.
Under the production CSP, a `?ws=` URL or a saved URL for any other origin is tried once. The browser
refuses it, and the bar stops (no retry loop), forgets a saved URL, says so in the chat and the wire
debug window, and keeps the local brain running. Development without the CSP can still link to a
local brain server, and CI tests both cases.

## First release procedure

1. Finish the change set: fonts, favicon, hidden debug windows, brain-link fallback, flake, revision,
   visual defaults and their baselines.
2. Run `bun run check` and `nix build && nix flake check` locally. Commit and push to `master`.
3. Wait for both CI jobs to go green.
4. Send branding the full commit hash, the CI run URL and the revision it will show (the short hash).
5. Branding sends infra the pin request; infra deploys and verifies (the route above).
6. Owner UAT on https://chickenbot.si before the test phase is called public.

No tags or `VERSION` file per deploy; the pinned commit is the version. Revisit this if the site
adopts numbered releases.

## Still open

- **The CDN build** stays a checked alternative. Deploying it would need jsDelivr and an import-map
  hash in the CSP.
- **Dependency and action updates** are manual, under the 14-day cooldown. Dependabot with a 14-day
  cooldown is an option.
