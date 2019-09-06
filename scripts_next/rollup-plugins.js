import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';

export default {
  input: 'dist-ts/compiler_next/sys/modules/rollup-plugins.js',
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
  },
  output: {
    format: 'esm',
    file: 'dist-ts/rollup-plugins.js'
  }
};

const util = `
export const inspect = str => console.log(str);
export default { inspect };
`
