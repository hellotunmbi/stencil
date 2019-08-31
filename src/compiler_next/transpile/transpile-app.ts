import * as d from '../../declarations';
import { hasError, loadTypeScriptDiagnostics } from '@utils';
import { convertDecoratorsToStatic } from '../../compiler/transformers/decorators-to-static/convert-decorators';
import { updateStencilCoreImports } from '../../compiler/transformers/update-stencil-core-import';
import { convertStaticToMeta } from '../../compiler/transformers/static-to-meta/visitor';
import { getComponentsFromModules } from '../../compiler/output-targets/output-utils';
import { updateComponentBuildConditionals } from '@build-conditionals';
import { resolveComponentDependencies } from '../../compiler/entries/resolve-component-dependencies';
import { generateAppTypes } from '../../compiler/types/generate-app-types';
import ts from 'typescript';


export const transpileApp = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, builder: ts.BuilderProgram) => {
  const syntactic = loadTypeScriptDiagnostics(builder.getSyntacticDiagnostics());
  buildCtx.diagnostics.push(...syntactic);

  if (hasError(buildCtx.diagnostics)) {
    return false;
  }

  const typeChecker = builder.getProgram().getTypeChecker();
  const transformOpts: d.TransformOptions = {
    coreImportPath: '@stencil/core',
    componentExport: null,
    componentMetadata: null,
    proxy: null,
    style: 'static'
  };

  const customTransforms = {
    before: [
      convertDecoratorsToStatic(config, [], typeChecker),
      updateStencilCoreImports(transformOpts.coreImportPath)
    ],
    after: [
      convertStaticToMeta(config, compilerCtx, buildCtx, typeChecker, null, transformOpts)
    ]
  };

  const writeTranspiledFile = (filePath: string, data: string) => {
    compilerCtx.fs.writeFile(filePath, data);
  };

  builder.emit(undefined, writeTranspiledFile, undefined, false, customTransforms);

  buildCtx.moduleFiles = Array.from(compilerCtx.moduleMap.values());
  buildCtx.components = getComponentsFromModules(buildCtx.moduleFiles);
  updateComponentBuildConditionals(compilerCtx.moduleMap, buildCtx.components);
  resolveComponentDependencies(buildCtx.components);

  if (buildCtx.hasError) {
    return false;
  }

  // write all the files that were queued in the emit
  await compilerCtx.fs.commit();

  // create the components.d.ts file and write to disk
  const hasTypesChanged = await generateAppTypes(config, compilerCtx, buildCtx, 'src');
  if (hasTypesChanged) {
    return true;
  }

  if (config.validateTypes) {
    const semantic = loadTypeScriptDiagnostics(builder.getSemanticDiagnostics());
    buildCtx.diagnostics.push(...semantic);
  }
  return false;
};
