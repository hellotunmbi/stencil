import * as d from '../../declarations';
import path from 'path';
import ts from 'typescript';


export const getTsOptionsToExtend = (config: d.Config) => {
  const outDir = path.join(config.cacheDir, 'dist');

  const tsOptions: ts.CompilerOptions = {
    experimentalDecorators: true,
    declaration: true,
    incremental: config.enableCache,
    module: ts.ModuleKind.ESNext,
    noEmitOnError: false,
    outDir,
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
