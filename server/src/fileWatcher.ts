import chokidar from 'chokidar';
import path from 'path';

const watchers = new Map<string, chokidar.FSWatcher>();

export function setupFileWatcher(
  watchPath: string,
  broadcast: (event: any) => void
) {
  if (watchers.has(watchPath)) {
    return;
  }

  console.log(`Watching: ${watchPath}`);

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])(\.|node_modules|\.git|dist|__pycache__|\.next)/,
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  const emit = (type: string, filePath: string) => {
    broadcast({
      type,
      timestamp: Date.now(),
      data: {
        path: filePath,
        relativePath: path.relative(watchPath, filePath),
        name: path.basename(filePath),
        extension: path.extname(filePath),
        directory: path.dirname(filePath),
      },
    });
  };

  watcher
    .on('add', (p) => emit('fs:create', p))
    .on('change', (p) => emit('fs:change', p))
    .on('unlink', (p) => emit('fs:delete', p))
    .on('addDir', (p) => emit('fs:mkdir', p))
    .on('unlinkDir', (p) => emit('fs:rmdir', p));

  watchers.set(watchPath, watcher);
}
