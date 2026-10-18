#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'if(Number(process.versions.node.split(".")[0])<24){console.error("Serve Node.js 24 o successivo");process.exit(1)}'
npm ci --cache "${TMPDIR:-/tmp}/ristolandia-npm-cache" --no-audit --no-fund
npm test
npm run build
printf '\nAmbiente pronto. Avvio: npm run dev (porta 5173).\n'
