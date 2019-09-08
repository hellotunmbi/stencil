
export { compile } from './compile-module';
export { createCompiler } from './compiler';
export { dependencies } from './sys/dependencies';
export { getCompileOptions, getMinifyScriptOptions, getTransformOptions } from './config/compile-module-options';
export { default as path } from 'path';
export { validateConfig } from './config/validate-config';
export const version = '0.0.0-stencil-dev' as string;
