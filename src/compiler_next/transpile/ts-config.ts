import * as d from '../../declarations';
import path from 'path';
import ts from 'typescript';


export const getTsOptionsToExtend = (config: d.Config) => {
  const outDir = path.join(config.cacheDir, 'dist');

  const tsOptions: ts.CompilerOptions = {
    declaration: true,
    incremental: true,
    module: ts.ModuleKind.ESNext,
    noEmitOnError: false,
    outDir,
    rootDir: config.rootDir,
    target: ts.ScriptTarget.ES2017,
  };

  return tsOptions;
};


export const getTsConfigFallback = () => {
  const tsCompilerOptions: ts.CompilerOptions = {

  };
  const tsConfig: any = {
    compilerOptions: tsCompilerOptions,
  };
  return tsConfig;
};

export const TSCONFIG_NAME_FALLBACK = `/tsconfig.fallback.json`;

