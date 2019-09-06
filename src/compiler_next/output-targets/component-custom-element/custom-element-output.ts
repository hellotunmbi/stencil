import * as d from '../../../declarations';
import { bundleOutput } from '../../bundle/bundle-output';
import { catchError } from '@utils';
import { convertDecoratorsToStatic } from '../../../compiler/transformers/decorators-to-static/convert-decorators';
import { convertStaticToMeta } from '../../../compiler/transformers/static-to-meta/visitor';
import { getBuildFeatures, updateBuildConditionals } from '@build-conditionals';
import { nativeComponentTransform } from '../../../compiler/transformers/component-native/tranform-to-native-component';
import { updateStencilCoreImports } from '../../../compiler/transformers/update-stencil-core-import';
import path from 'path';
import ts from 'typescript';


export const customElementOutput = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram, outputTargets: d.OutputTargetCustomElementNext[]) => {
  const timespan = buildCtx.createTimeSpan(`generate custom element started`, true);

  try {
    const bundleOpts: d.BundleOptions = {
      id: 'customElement',
      conditionals: getBuildConditionals(config, buildCtx.components),
      customTransformers: getCustomTransformers(config, compilerCtx, buildCtx, tsBuilder),
      inputs: getEntries(compilerCtx),
      outputOptions: {
        format: 'esm',
        sourcemap: true
      },
      outputTargets,
      tsBuilder,
    };

    await bundleOutput(config, compilerCtx, buildCtx, bundleOpts);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timespan.finish(`generate custom element finished`);
};


const getEntries = (compilerCtx: d.CompilerCtx) => {
  const inputs: any = {};

  compilerCtx.moduleMap.forEach(m => {
    if (m.cmps.length > 0) {
      const fileName = path.basename(m.sourceFilePath);
      const nameParts = fileName.split('.');
      nameParts.pop();
      const entryName = nameParts.join('.');
      inputs[entryName] = m.sourceFilePath;
    }
  });

  return inputs;
};

const getBuildConditionals = (config: d.Config, cmps: d.ComponentCompilerMeta[]) => {
  const build = getBuildFeatures(cmps) as d.Build;

  updateBuildConditionals(config, build);

  return build;
};

const getCustomTransformers = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram) => {
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
      updateStencilCoreImports(transformOpts.coreImportPath)
    ],
    after: [
      convertStaticToMeta(config, compilerCtx, buildCtx, tsTypeChecker, null),
      nativeComponentTransform(compilerCtx, transformOpts)
    ]
  };
  return customTransformers;
};
