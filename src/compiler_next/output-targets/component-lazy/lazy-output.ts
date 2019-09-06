import * as d from '../../../declarations';
import { bundleOutput } from '../../bundle/bundle-output';
import { catchError } from '@utils';
import { convertDecoratorsToStatic } from '../../../compiler/transformers/decorators-to-static/convert-decorators';
import { convertStaticToMeta } from '../../../compiler/transformers/static-to-meta/visitor';
import { getBuildFeatures, updateBuildConditionals } from '@build-conditionals';
import { generateEntryModules } from '../../..//compiler/entries/entry-modules';
import { isOutputTargetHydrate } from '../../../compiler/output-targets/output-utils';
import { lazyComponentTransform } from '../../../compiler/transformers/component-lazy/transform-lazy-component';
import { LAZY_BROWSER_ENTRY_ID, LAZY_EXTERNAL_ENTRY_ID } from './lazy-core-plugin';
import { updateStencilCoreImports } from '../../../compiler/transformers/update-stencil-core-import';
import { USER_INDEX_ENTRY_ID } from '../../../compiler_next/bundle/user-index-plugin';
import ts from 'typescript';


export const lazyOutput = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram, outputTargets: d.OutputTargetLazyNext[]) => {
  const timespan = buildCtx.createTimeSpan(`generate lazy started`, true);

  try {

    // const criticalBundles = getCriticalPath(buildCtx);

    const bundleOpts: d.BundleOptions = {
      id: 'lazy',
      conditionals: getBuildConditionals(config, buildCtx.components),
      customTransformers: getCustomTransformers(config, compilerCtx, buildCtx, tsBuilder),
      inputs: {
        [config.fsNamespace]: LAZY_BROWSER_ENTRY_ID,
        'loader': LAZY_EXTERNAL_ENTRY_ID,
        'index': USER_INDEX_ENTRY_ID
      },
      outputOptions: {
        format: 'esm',
        sourcemap: true
      },
      outputTargets,
      tsBuilder,
    };

    // we've got the compiler context filled with app modules and collection dependency modules
    // figure out how all these components should be connected
    generateEntryModules(config, buildCtx);
    buildCtx.entryModules.forEach(entryModule => {
      bundleOpts.inputs[entryModule.entryKey] = entryModule.entryKey;
    });

    await bundleOutput(config, compilerCtx, buildCtx, bundleOpts);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timespan.finish(`generate lazy finished`);
};


const getBuildConditionals = (config: d.Config, cmps: d.ComponentCompilerMeta[]) => {
  const build = getBuildFeatures(cmps) as d.Build;

  build.lazyLoad = true;
  build.hydrateServerSide = false;
  build.cssVarShim = true;

  const hasHydrateOutputTargets = config.outputTargets.some(isOutputTargetHydrate);
  build.hydrateClientSide = hasHydrateOutputTargets;

  updateBuildConditionals(config, build);

  return build;
};

// function getCriticalPath(buildCtx: d.BuildCtx) {
//   const componentGraph = buildCtx.componentGraph;
//   if (!buildCtx.indexDoc || !componentGraph) {
//     return [];
//   }
//   return unique(
//     flatOne(
//       getUsedComponents(buildCtx.indexDoc, buildCtx.components)
//         .map(tagName => getScopeId(tagName))
//         .map(scopeId => buildCtx.componentGraph.get(scopeId) || [])
//     )
//   ).sort();
// }


const getCustomTransformers = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram) => {
  const tsTypeChecker = tsBuilder.getProgram().getTypeChecker();

  const transformOpts: d.TransformOptions = {
    coreImportPath: '@stencil/core/internal/client',
    componentExport: 'lazy',
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
      lazyComponentTransform(compilerCtx, transformOpts)
    ]
  };
  return customTransformers;
};
