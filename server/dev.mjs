import { spawn } from 'node:child_process';
const processes = [
  spawn(process.execPath, ['--watch', 'server/index.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, RISTOLANDIA_DEV_MODE: '1' },
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
    stdio: 'inherit',
  }),
];
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    for (const child of processes) child.kill(signal);
    process.exit();
  });
