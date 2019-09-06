import * as d from '../../../declarations';
import { normalizePath } from '@utils';
import path from 'path';


export function validateCollection(config: d.Config, userOutputs: d.OutputTargetCollectionNext[], _diagnostics: d.Diagnostic[]) {
  return userOutputs.map(o => {
    const output = Object.assign({}, o);
    if (typeof output.dir !== 'string') {
      output.dir = path.join('dist', 'collection');
    }
    if (!path.isAbsolute(output.dir)) {
      output.dir = path.join(config.rootDir, output.dir);
    }
    output.dir = normalizePath(output.dir);
    return output;
  });
}
