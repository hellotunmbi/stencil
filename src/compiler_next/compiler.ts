import * as d from '../declarations';
import { CompilerContext } from '../compiler/build/compiler-ctx';
import { createFullBuild } from './build/full-build';
import { createWatchBuild } from './build/watch-build';
import { getConfig } from './sys/config';
import { inMemoryFileSystem } from './sys/in-memory-fs';
import { patchFs } from './sys/fs-patch';
import { patchTypescript } from './sys/typescript-patch';
import { preloadSourceModules } from './transpile/preload-modules';


export const createCompiler = async (config: d.Config) => {
  config = getConfig(config);
  const sys = config.sys_next;

  patchFs(sys);
  await patchTypescript(config, sys);

  const compilerCtx = new CompilerContext(config);
  compilerCtx.fs = inMemoryFileSystem(sys);

  await preloadSourceModules(config, compilerCtx);

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
    sys
  };

  return compiler;
};
