import { Plugin, TransformResult } from 'rollup';
import ts from 'typescript';


export const typescriptPlugin = (outputName: string, tsBuilder: ts.EmitAndSemanticDiagnosticsBuilderProgram, customTransformers: ts.CustomTransformers): Plugin => {
  const plugin: Plugin = {
    name: outputName + 'TypescriptPlugin',

    transform(code, id) {
      if (!id.endsWith('.tsx') && !id.endsWith('.ts')) {
        return null;
      }

      const transformResult: TransformResult = {
        code,
        map: null
      };

      const tsSourceFile = tsBuilder.getSourceFile(id);

      tsBuilder.emit(tsSourceFile,
        (filePath, data) => {
          if (filePath.endsWith('.js')) {
            transformResult.code = data;

          } else if (filePath.endsWith('.map')) {
            transformResult.map = data;
          }
        },
        undefined,
        undefined,
        customTransformers
      );

      return transformResult;
    }
  };

  return plugin;
};
