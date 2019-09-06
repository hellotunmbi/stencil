import * as d from '../declarations';
import { CompilerContext } from '../compiler/build/compiler-ctx';
import { createFullBuild } from './build/full-build';
import { createWatchBuild } from './build/watch-build';
import { getConfig } from './sys/config';
import { initFs } from './sys/fs-patch';
import { initTypescript } from './sys/typescript-patch';
import { inMemoryFileSystem } from './sys/in-memory-fs';


export const createCompiler = async (config: d.Config) => {
  config = getConfig(config);

  initFs(config.sys_next);
  await initTypescript(config, config.sys_next);

  const compilerCtx = new CompilerContext(config);
  compilerCtx.fs = inMemoryFileSystem(config.sys_next);

  let watcher: d.CompilerWatcher = null;

  const compiler: d.CompilerNext = {
    build: () => createFullBuild(config, compilerCtx),
    createWatcher: async () => {
      watcher = await createWatchBuild(config, compilerCtx);
      return watcher;
    },
    destroy: async () => {
      compilerCtx.reset();
      compilerCtx.events.unsubscribeAll();

      if (watcher) {
        await watcher.close();
        watcher = null;
      }
    },
    sys: config.sys_next
  };

  return compiler;
};
