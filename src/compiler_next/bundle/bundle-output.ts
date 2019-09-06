import * as d from '../../declarations';
import { createCustomResolver } from '../sys/resolve-module';
import { createOnWarnFn, loadRollupDiagnostics } from '@utils';
import { cssTransformer } from '../../compiler/rollup-plugins/css-transformer';
import { globalScriptsPlugin } from '../../compiler/rollup-plugins/global-scripts';
import { imagePlugin } from '../../compiler/rollup-plugins/image-plugin';
import { lazyComponentPlugin } from '../output-targets/component-lazy/lazy-component-plugin';
import { lazyCorePlugin } from '../output-targets/component-lazy/lazy-core-plugin';
import { pluginHelper } from '../../compiler/rollup-plugins/plugin-helper';
import { rollupCommonjsPlugin, rollupJsonPlugin, rollupNodeResolvePlugin, rollupReplacePlugin } from '@rollup-plugins';
import { RollupOptions, TreeshakingOptions, rollup } from 'rollup';
import { stencilBuildConditionalsPlugin } from '../../compiler/rollup-plugins/stencil-build-conditionals';
import { sysPlugin } from './sys-plugin';
import { typescriptPlugin } from './typescript-plugin';
import { userIndexPlugin } from './user-index-plugin';
import { writeBuildOutputs } from './write-outputs';


export const bundleOutput = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, bundleOpts: d.BundleOptions) => {
  try {
    const rollupOptions = getRollupOptions(config, compilerCtx, buildCtx, bundleOpts);

    const rollupBuild = await rollup(rollupOptions);

    const rollupOutput = await rollupBuild.generate(bundleOpts.outputOptions);

    compilerCtx.rollupCache.set(
      bundleOpts.id,
      rollupBuild.cache
    );

    await writeBuildOutputs(compilerCtx, buildCtx, bundleOpts.outputTargets, rollupOutput);

  } catch (e) {
    if (!buildCtx.hasError) {
      loadRollupDiagnostics(compilerCtx, buildCtx, e);
    }
  }
};


const getRollupOptions = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, bundleOpts: d.BundleOptions) => {

  const rollupOptions: RollupOptions = {

    input: bundleOpts.inputs,

    plugins: [
      // stencilExternalRuntimePlugin(bundleAppOptions.externalRuntime),
      stencilBuildConditionalsPlugin(bundleOpts.conditionals, config.fsNamespace),
      globalScriptsPlugin(config, compilerCtx),
      lazyComponentPlugin(buildCtx),
      lazyCorePlugin(buildCtx),
      userIndexPlugin(config, compilerCtx),
      rollupCommonjsPlugin({
        include: /node_modules/,
        sourceMap: false,
        ...config.commonjs
      }),
      ...config.rollupPlugins,
      pluginHelper(config, buildCtx),
      rollupNodeResolvePlugin({
        mainFields: ['collection:main', 'jsnext:main', 'es2017', 'es2015', 'module', 'main'],
        browser: true,
        customResolveOptions: createCustomResolver(compilerCtx.fs),
        ...config.nodeResolve as any
      }),
      rollupJsonPlugin(),
      imagePlugin(config, buildCtx),
      cssTransformer(config, compilerCtx, buildCtx),
      rollupReplacePlugin({
        'process.env.NODE_ENV': config.devMode ? '"development"' : '"production"'
      }),
      typescriptPlugin(bundleOpts),
      sysPlugin(compilerCtx.fs)
    ],

    treeshake: getTreeshakeOption(config),

    onwarn: createOnWarnFn(buildCtx.diagnostics),

    cache: compilerCtx.rollupCache.get(bundleOpts.id)
  };

  return rollupOptions;
};


const getTreeshakeOption = (config: d.Config) => {
  const treeshake: TreeshakingOptions | boolean = !config.devMode && config.rollupConfig.inputOptions.treeshake !== false
    ? {
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    }
    : false;
  return treeshake;
};
