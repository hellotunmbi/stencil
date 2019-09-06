import * as d from '../../declarations';
import { collectionOutput } from '../output-targets/component-collection/collection-output';
import { generateAppTypes } from '../../compiler/types/generate-app-types';
import { getComponentsFromModules } from '../../compiler/output-targets/output-utils';
import { loadTypeScriptDiagnostics } from '@utils';
import { parseToModule } from './static-to-meta/parse-static';
import { resolveComponentDependencies } from '../../compiler/entries/resolve-component-dependencies';
import { updateComponentBuildConditionals } from '@build-conditionals';
import ts from 'typescript';


export const runTsProgram = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram) => {
  const tsSyntactic = loadTypeScriptDiagnostics(tsBuilder.getSyntacticDiagnostics());
  buildCtx.diagnostics.push(...tsSyntactic);
  if (buildCtx.hasError) {
    return false;
  }

  const tsProgram = tsBuilder.getProgram();
  const tsTypeChecker = tsProgram.getTypeChecker();

  const tsSourceFiles = tsProgram.getSourceFiles();
  tsSourceFiles.forEach(tsSourceFile => {
    const moduleFile = parseToModule(config, compilerCtx, buildCtx, tsSourceFile, tsTypeChecker, null);
    buildCtx.moduleFiles.push(moduleFile);
  });

  await collectionOutput(config, compilerCtx, buildCtx, tsBuilder);

  buildCtx.components = getComponentsFromModules(buildCtx.moduleFiles);
  updateComponentBuildConditionals(compilerCtx.moduleMap, buildCtx.components);
  resolveComponentDependencies(buildCtx.components);

  if (buildCtx.hasError) {
    return false;
  }

  // create the components.d.ts file and write to disk
  const hasTypesChanged = await generateAppTypes(config, compilerCtx, buildCtx, 'src');
  if (hasTypesChanged) {
    return true;
  }

  const tsSemantic = loadTypeScriptDiagnostics(tsBuilder.getSemanticDiagnostics());
  buildCtx.diagnostics.push(...tsSemantic);

  return false;
};
