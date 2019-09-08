import fs from 'fs-extra';
import path from 'path';
import { rollup } from 'rollup';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';


export async function buildCompilerPlugins() {
  const outputFile = path.join(__dirname, '..', 'dist-ts', 'compiler-plugins.js');

  try {
    return fs.readFileSync(outputFile, 'utf8');
  } catch (e) {}

  const build = await rollup({
    input: 'dist-ts/compiler_next/sys/modules/compiler-plugins.js',
    external: [
      'fs',
      'module',
      'path'
    ],
    plugins: [
      {
        resolveId(id) {
          if (id === 'util') {
            return '@node-util';
          }
          if (id === 'resolve') {
            return 'scripts_next/helpers/resolve.js';
          }
        },
        load(id) {
          if (id === '@node-util') {
            return util;
          }
        }
      },
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      json({
        preferConst: true
      })
    ],
    treeshake: {
      moduleSideEffects: false
    }
  });

  const output = await build.write({
    format: 'es',
    file: outputFile
  });

  return output.output[0].code;
}

const util = `
export const inspect = str => console.log(str);
export default { inspect };
`
