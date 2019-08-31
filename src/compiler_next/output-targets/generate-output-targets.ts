import * as d from '../../declarations';
import { isOutputTargetDistModule } from '../../compiler/output-targets/output-utils';
import { moduleOutput } from './module';
import ts from 'typescript';


export const generateOutputTargets = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
  const outputPromises: Promise<any>[] = [];

  const moduleOutputTargets = config.outputTargets.filter(isOutputTargetDistModule);
  if (moduleOutputTargets.length > 0) {
    const moduleOutputPromise = moduleOutput(config, compilerCtx, buildCtx, tsBuilder, moduleOutputTargets);
    outputPromises.push(moduleOutputPromise);
  }

  return Promise.all(outputPromises);
};
