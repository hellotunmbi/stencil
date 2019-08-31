import * as d from '../../declarations';
import { normalizePath } from '@utils';
import { OutputChunk, RollupOutput } from 'rollup';
import path from 'path';


export const writeBuildOutputs = (sys: d.CompilerSystem, outputTargets: d.OutputTargetDist[], rollupOutput: RollupOutput) => {
  const buildOutputTargets: d.BuildOutput[] = [];

  outputTargets.forEach(outputTarget => {
    buildOutputTargets.push(
      writeBuildOutputTarget(sys, outputTarget, rollupOutput)
    );
  });

  return buildOutputTargets;
};


const writeBuildOutputTarget = (sys: d.CompilerSystem, outputTarget: d.OutputTargetDist, rollupOutput: RollupOutput) => {
  const buildOutputTarget: d.BuildOutput = {
    type: outputTarget.type,
    files: []
  };

  rollupOutput.output.forEach(output => {
    const outputFilePath = normalizePath(path.join(outputTarget.dir, output.fileName));
    sys.writeFile(outputFilePath, output.code);
    buildOutputTarget.files.push(outputFilePath);

    const map = (output as OutputChunk).map;
    if (map) {
      const outputMapFilePath = outputFilePath + '.map';
      const mapCode = map.toString();
      sys.writeFile(outputMapFilePath, mapCode);
      buildOutputTarget.files.push(outputMapFilePath);
    }
  });

  return buildOutputTarget;
};
