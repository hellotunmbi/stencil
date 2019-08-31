import * as d from '../declarations';
import { CompilerContext } from '../compiler/build/compiler-ctx';
import { createWatcher } from './build/watch-build';
import { fullBuild } from './build/full-build';
import { getConfig } from './sys/config';
import { initFs } from './sys/fs-patch';
import { initTypescript } from './sys/typescript-patch';
import { inMemoryFileSystem } from './sys/in-memory-fs';


export const createCompiler = async (config: d.Config) => {
  config = getConfig(config);
  config.enableCache = false;

  initFs(config.sys_next);
  await initTypescript(config, config.sys_next);

  const compilerCtx = new CompilerContext(config);
  compilerCtx.fs = inMemoryFileSystem(config.sys_next);

  const compiler: d.CompilerCore = {
    build: () => fullBuild(config, compilerCtx),
    config,
    sys: config.sys_next,
    createWatcher: () => createWatcher(config, compilerCtx)
  };

  return compiler;
};
