{
  description = "Chickenbot's Bar (chickenbot.si): the static site, built to dist/";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      inherit (pkgs) lib;

      # The site's own toolchain (.bun-version), not nixpkgs' bun: the release zip pinned by hash
      # (sha256 36368fae...a913 in Bun's published SHASUMS256.txt), patched the way nixpkgs patches bun.
      bun = pkgs.bun.overrideAttrs (_: {
        version = "1.4.2";
        src = pkgs.fetchurl {
          url = "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-linux-x64.zip";
          hash = "sha256-NjaPrvdSeHXV/6UuU81IAhdB8qg+tiCKjdZAaNQiqRM=";
        };
      });

      revision = self.shortRev or self.dirtyShortRev or "unknown";

      # Runtime dependencies only (three.js and the fonts); dev tooling isn't needed to build dist/.
      # Fixed-output, so it may fetch: update outputHash whenever bun.lock changes (the build error
      # prints the new one).
      nodeModules = pkgs.stdenvNoCC.mkDerivation {
        pname = "chickenbot-si-node-modules";
        version = "0";
        src = lib.fileset.toSource {
          root = ./.;
          fileset = lib.fileset.unions [
            ./package.json
            ./bun.lock
            ./bunfig.toml
          ];
        };
        nativeBuildInputs = [ bun ];
        dontConfigure = true;
        buildPhase = ''
          runHook preBuild
          export HOME=$TMPDIR
          bun install --frozen-lockfile --production --ignore-scripts --no-progress
          runHook postBuild
        '';
        installPhase = ''
          runHook preInstall
          cp -R node_modules $out
          runHook postInstall
        '';
        # a fixed-output path may not refer to the store, so no shebang patching
        dontFixup = true;
        outputHashMode = "recursive";
        outputHashAlgo = "sha256";
        outputHash = "sha256-ZsHVsu9i47zdxjw/m/RFkzqgftpET3d5tEAn7QnNzVg=";
      };

      site = pkgs.stdenvNoCC.mkDerivation {
        pname = "chickenbot-si";
        version = revision;
        src = lib.fileset.toSource {
          root = ./.;
          fileset = lib.fileset.unions [
            ./package.json
            ./bunfig.toml
            ./scripts
            ./shared
            ./web
          ];
        };
        nativeBuildInputs = [ bun ];
        # stamped into index.html as <meta name="revision">
        CHICKENBOT_REV = revision;
        dontConfigure = true;
        buildPhase = ''
          runHook preBuild
          export HOME=$TMPDIR
          cp -R ${nodeModules} node_modules
          chmod -R u+w node_modules
          bun scripts/build.ts --outdir=dist
          runHook postBuild
        '';
        installPhase = ''
          runHook preInstall
          cp -R dist $out
          runHook postInstall
        '';
        dontFixup = true;
      };
    in
    {
      # the built dist/, served as-is
      packages.${system} = {
        default = site;
        inherit bun nodeModules;
      };

      checks.${system}.site = pkgs.runCommand "chickenbot-si-check" { } ''
        for f in index.html favicon.ico licenses/VT323-OFL.txt licenses/Press-Start-2P-OFL.txt \
                 licenses/Share-Tech-Mono-OFL.txt licenses/three.js-MIT.txt; do
          test -s ${site}/$f || { echo "missing $f"; exit 1; }
        done
        ls ${site} | grep -q '^vt323-latin-400-normal-.*\.woff2$' || { echo "fonts missing"; exit 1; }
        grep -q '<meta name="revision" content="${revision}">' ${site}/index.html || { echo "revision not stamped"; exit 1; }
        ! grep -q 'fonts.googleapis.com' ${site}/index.html || { echo "Google Fonts still referenced"; exit 1; }
        touch $out
      '';

      formatter.${system} = pkgs.nixfmt;
    };
}
