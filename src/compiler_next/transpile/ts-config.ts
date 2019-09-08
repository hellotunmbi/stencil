import * as d from '../../declarations';
import ts from 'typescript';
import { getStencilCoreInternalPath, getStencilCorePath } from './preload-modules';


export const getTsOptionsToExtend = (config: d.Config) => {
  const tsOptions: ts.CompilerOptions = {
    baseUrl: '.',
    experimentalDecorators: true,
    declaration: true,
    incremental: config.enableCache,
    module: ts.ModuleKind.ESNext,
    noEmitOnError: true,
    outDir: config.cacheDir,
    paths: {
      '@stencil/core/internal': [
        getStencilCoreInternalPath(config)
      ],
      '@stencil/core': [
        getStencilCorePath(config)
      ]
    },
    rootDir: config.rootDir,
    target: ts.ScriptTarget.ES2017,
  };

  return tsOptions;
};


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
