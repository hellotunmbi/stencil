import { Build, OutputTargetBaseNext } from '../../declarations';
import { BuilderProgram, CustomTransformers } from 'typescript';
import { OutputOptions } from 'rollup';


export interface BundleOptions {
  conditionals: Build;
  id: string;
  customTransformers: CustomTransformers;
  inputs: {[entryKey: string]: string};
  outputOptions: OutputOptions;
  outputTargets: OutputTargetBaseNext[];
  tsBuilder: BuilderProgram;
}
