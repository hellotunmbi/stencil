import * as d from '../../declarations';
import dtsContent from '@internal-dts';
import path from 'path';
import { IS_NODE_ENV } from '../sys/environment';
import ts from 'typescript';


export const preloadSourceModules = async (config: d.Config, tsHost: ts.ProgramHost<any>) => {
  if (IS_NODE_ENV) {
    return;
  }
  const sys = config.sys_next;

  const ensureDirs = ['node_modules', '@stencil', 'core', 'internal'];
  let internalDir = config.rootDir;
  ensureDirs.forEach(ensureDir => {
    internalDir = path.join(internalDir, ensureDir);
    sys.mkdirSync(internalDir);
  });

  const stencilCoreInternalPath = getStencilCoreInternalPath(config);
  const internalPkgPath = path.join(stencilCoreInternalPath, 'package.json');
  const internalJsPath = path.join(stencilCoreInternalPath, 'index.js');
  const internalDtsPath = path.join(stencilCoreInternalPath, 'index.d.ts');

  const hasInternalPkgJson = sys.accessSync(internalPkgPath);
  if (!hasInternalPkgJson) {
    sys.writeFileSync(internalPkgPath, JSON.stringify({
      name: '@stencil/core/internal',
      main: 'index.js',
      types: 'index.d.ts'
    }));
    sys.writeFileSync(internalJsPath, '');
    sys.writeFileSync(internalDtsPath, dtsContent);
  }

  const libDirs = ['node_modules', 'typescript-libs'];
  let libDirPath = config.rootDir;
  libDirs.forEach(libDir => {
    libDirPath = path.join(libDirPath, libDir);
    sys.mkdirSync(libDirPath);
  });

  tsHost.getDefaultLibLocation = () => libDirPath;


};


export const getStencilCoreInternalPath = (config: d.Config) => {
  return path.join(getStencilCorePath(config), 'internal');
};


export const getStencilCorePath = (config: d.Config) => {
  return path.join(config.rootDir, 'node_modules', '@stencil', 'core');
};
