import * as d from '../../declarations';
import { normalizePath } from '@utils';
import path from 'path';


export const preloadModules = async (_config: d.Config, _compilerCtx: d.CompilerCtx) => {
  //
};


export const getStencilInternalPath = (config: d.Config) => {
  return normalizePath(path.join(config.rootDir, 'node_modules', '@stencil', 'core', 'internal'));
};
