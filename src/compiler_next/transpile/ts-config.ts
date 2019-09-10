import * as d from '../../declarations';
// import path from 'path';
import { IS_NODE_ENV, IS_WEB_WORKER_ENV } from '../sys/environment';
// import path from 'path';
import ts from 'typescript';


export const getTsOptionsToExtend = (config: d.Config) => {
  const tsOptions: ts.CompilerOptions = {
    experimentalDecorators: true,
    declaration: true,
    incremental: config.enableCache,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noEmitOnError: true,
    outDir: config.cacheDir,
    rootDir: config.srcDir,
    target: ts.ScriptTarget.ES2017,
  };

  if (!IS_NODE_ENV && IS_WEB_WORKER_ENV) {
    // tsOptions.baseUrl = '.';
    // tsOptions.paths = {
    //   '@stencil/core/internal': [
    //     'http://localhost/@stencil/core/internal/'
    //   ],
    //   '@stencil/core': [
    //     'http://localhost/@stencil/core/'
    //   ]
    // };

  }

  return tsOptions;
};

// const getStencilCoreInternalPath = (config: d.Config) => {
//   return path.join(getStencilCorePath(config), 'internal');
// };


// const getStencilCorePath = (config: d.Config) => {
//   const exePath = config.sys_next.getExecutingPath();

//   return path.join(config.rootDir, 'node_modules', '@stencil', 'core');
// };


export const TSCONFIG_NAME_FALLBACK = `tsconfig.fallback.json`;


export const getTsConfigFallback = (config: d.Config) => {
  const tsCompilerOptions: ts.CompilerOptions = {};

  const tsConfig: any = {
    compilerOptions: tsCompilerOptions,
    include: [
      config.srcDir + '/**/*'
    ]
  };
  return tsConfig;
};
