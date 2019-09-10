import { CompilerNext, CompilerWatcher, Config } from '../declarations';
import { CompilerContext } from '../compiler/build/compiler-ctx';
import { createFullBuild } from './build/full-build';
import { createWatchBuild } from './build/watch-build';
import { getConfig } from './sys/config';
import { inMemoryFileSystem } from './sys/in-memory-fs';
import { patchFs } from './sys/fs-patch';
import { patchTypescript } from './sys/typescript-patch';


export const createCompiler = async (config: Config) => {
  config = getConfig(config);
  const sys = config.sys_next;

  patchFs(sys);
  await patchTypescript(config);

  const compilerCtx = new CompilerContext(config);
  compilerCtx.fs = inMemoryFileSystem(sys);

  let watcher: CompilerWatcher = null;

  const compiler: CompilerNext = {
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
