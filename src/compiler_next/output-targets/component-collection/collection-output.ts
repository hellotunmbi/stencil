import * as d from '../../../declarations';
import { catchError, normalizePath } from '@utils';
import { convertDecoratorsToStatic } from '../../../compiler/transformers/decorators-to-static/convert-decorators';
import { convertStaticToMeta } from '../../../compiler/transformers/static-to-meta/visitor';
import { updateStencilCoreImports } from '../../../compiler/transformers/update-stencil-core-import';
import path from 'path';
import ts from 'typescript';


export const collectionOutput = async (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsBuilder: ts.BuilderProgram, outputTarget: d.OutputTargetCollectionNext) => {
  const timespan = buildCtx.createTimeSpan(`generate collection started`, true);

  try {
    const tsTypeChecker = tsBuilder.getProgram().getTypeChecker();

    tsBuilder.emit(
      undefined,
      (filePath, data, _w, _e, tsSourceFiles) => {
        tsSourceFiles.forEach(tsSourceFile => {
          const sourceFilePath = normalizePath(tsSourceFile.fileName);
          const outFilePath = sourceFilePath.replace(config.srcDir, '');
          const outFileDir = path.dirname(outFilePath);
          const outFileName = path.basename(filePath);
          const collectionFilePath = path.join(outputTarget.dir, outFileDir, outFileName);
          compilerCtx.fs.writeFile(collectionFilePath, data);
        });
      },
      undefined,
      false,
      getCollectionCustomTransformers(config, compilerCtx, buildCtx, tsTypeChecker)
    );

    const buildOutputTarget: d.BuildOutput = {
      type: outputTarget.type,
      files: (await compilerCtx.fs.readdir(outputTarget.dir, { recursive: true })).map(item => {
        return item.absPath;
      })
    };
    buildCtx.outputs.push(buildOutputTarget);

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timespan.finish(`generate collection finished`);
};


const getCollectionCustomTransformers = (config: d.Config, compilerCtx: d.CompilerCtx, buildCtx: d.BuildCtx, tsTypeChecker: ts.TypeChecker) => {
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
      convertStaticToMeta(config, compilerCtx, buildCtx, tsTypeChecker, null)
    ]
  };
  return customTransformers;
};
