import * as d from '../../declarations';
import { buildAbort, buildFinish } from './build-finish';
import { catchError } from '@utils';
import { generateOutputTargets } from '../output-targets/generate-output-targets';
import { transpileApp } from '../transpile/transpile-app';
import ts from 'typescript';


export const build = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram) => {
  try {
    // transpile
    const timeSpan = buildCtx.createTimeSpan('transpile started');
    const componentDtsChanged = await transpileApp(config, compilerCtx, buildCtx, tsBuilder);
    timeSpan.finish('transpile finished');
    if (buildCtx.hasError) return buildAbort(buildCtx);
    if (componentDtsChanged) {
      // return false;
    }

    await generateOutputTargets(config, compilerCtx, buildCtx, tsBuilder);


  } catch (e) {
    // ¯\_(ツ)_/¯
    catchError(buildCtx.diagnostics, e);
  }

  // return what we've learned today
  return buildFinish(buildCtx);
};
