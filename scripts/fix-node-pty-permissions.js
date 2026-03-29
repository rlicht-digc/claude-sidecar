const fs = require('fs');
const path = require('path');

function ensureExecutable(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return false;
  } catch {
    fs.chmodSync(filePath, 0o755);
    return true;
  }
}

function main() {
  if (process.platform === 'win32') {
    return;
  }

  const nodePtyRoot = path.dirname(require.resolve('node-pty/package.json'));
  const helperPath = path.join(nodePtyRoot, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper');

  if (!fs.existsSync(helperPath)) {
    console.log(`[node-pty] No spawn-helper for ${process.platform}-${process.arch}, skipping.`);
    return;
  }

  const changed = ensureExecutable(helperPath);
  console.log(`[node-pty] ${changed ? 'Fixed execute bit on' : 'Spawn-helper already executable:'} ${helperPath}`);
}

try {
  main();
} catch (error) {
  console.error('[node-pty] Failed to verify spawn-helper permissions.');
  console.error(error);
  process.exit(1);
}
