import * as d from '../../declarations';
import { createCustomResolver } from '../sys/resolve-module';
import { rollupNodeResolvePlugin } from '@compiler-plugins';
import path from 'path';


export const preloadSourceModules = async (_config: d.Config, compilerCtx: d.CompilerCtx) => {
  // const corePkgPath = path.join(getStencilCorePath(config), 'package.json');
  // const internalPkgPath = path.join(getStencilCoreInternalPath(config), 'package.json');

  // const hasCorePkg = await compilerCtx.fs.access(corePkgPath);
  // if (!hasCorePkg) {
  //   await compilerCtx.fs.writeFile(corePkgPath, '');
  // }

  // const hasInternalPkg = await compilerCtx.fs.access(internalPkgPath);
  // if (!hasInternalPkg) {
  //   await compilerCtx.fs.writeFile(internalPkgPath, '');
  // }

  const nodeResolve = rollupNodeResolvePlugin({
    mainFields: ['collection:main', 'jsnext:main', 'es2017', 'es2015', 'module', 'main'],
    browser: true,
    customResolveOptions: createCustomResolver(compilerCtx.fs)
  });

  const internalPkg = await nodeResolve.resolveId('@stencil/core/internal');
  if (internalPkg) {
    const resolvedInternalId = internalPkg.id;
    if (resolvedInternalId) {

      console.log(internalPkg);
      const a = await compilerCtx.fs.readFile(resolvedInternalId);
      console.log(a);
    }
  }
};


export const getStencilCoreInternalPath = (config: d.Config) => {
  return path.join(getStencilCorePath(config), 'internal');
};


export const getStencilCorePath = (config: d.Config) => {
  return path.join(config.rootDir, 'node_modules', '@stencil', 'core');
};
