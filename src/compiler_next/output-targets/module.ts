import * as d from '../../declarations';
import { convertDecoratorsToStatic } from '../../compiler/transformers/decorators-to-static/convert-decorators';
import { convertStaticToMeta } from '../../compiler/transformers/static-to-meta/visitor';
import { createOnWarnFn } from '@utils';
import { InputOption, OutputOptions, RollupOptions, rollup } from 'rollup';
import { nativeComponentTransform } from '../../compiler/transformers/component-native/tranform-to-native-component';
import { sysPlugin } from '../plugins/sys-plugin';
import { typescriptPlugin } from '../plugins/typescript-plugin';
import { writeBuildOutputs } from './write-build-outputs';
import path from 'path';
import ts from 'typescript';


export const moduleOutput = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram, outputTargets: d.OutputTargetDistModule[]) => {
  const input = getModuleEntries([]);

  const customTransformers = getCustomTransformers(config, compilerCtx, buildCtx, tsBuilder);

  const rollupBuildOptions: RollupOptions = {
    input,
    plugins: [
      typescriptPlugin('module', tsBuilder, customTransformers),
      sysPlugin(compilerCtx.fs)
    ],
    onwarn: createOnWarnFn(buildCtx.diagnostics)
  };

  const rollupBuild = await rollup(rollupBuildOptions);

  const rollupOutputOptions: OutputOptions = {
    format: 'esm',
    sourcemap: true
  };

  const rollupOutput = await rollupBuild.generate(rollupOutputOptions);

  const buildOutputs = writeBuildOutputs(config.sys_next, outputTargets as any, rollupOutput);
  buildCtx.outputs.push(...buildOutputs);
};


const getModuleEntries = (tsFilePaths: string[]) => {
  const input: InputOption = {};

  tsFilePaths.forEach(tsFilePath => {
    if (tsFilePath.endsWith('.tsx')) {
      const nameParts = path.basename(tsFilePath).split('.');
      nameParts.pop();
      const entryName = nameParts.join('.');
      input[entryName] = tsFilePath;
    }
  });

  return input;
};


const getCustomTransformers = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
  const tsTypeChecker = tsBuilder.getProgram().getTypeChecker();

  const transformOpts: d.TransformOptions = {
    coreImportPath: '@stencil/core',
    componentExport: null,
    componentMetadata: null,
    proxy: null,
    style: 'static'
  };

  const customTransformers: ts.CustomTransformers = {
    before: [
      convertDecoratorsToStatic(config, buildCtx.diagnostics, tsTypeChecker),
    ],
    after: [
      convertStaticToMeta(config, compilerCtx, buildCtx, tsTypeChecker, null, transformOpts),
      nativeComponentTransform(compilerCtx, transformOpts)
    ]
  };
  return customTransformers;
};
