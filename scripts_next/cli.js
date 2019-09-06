import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';


export default {
  input: 'dist-ts/cli_next/index.js',
  external: [
    'assert',
    'buffer',
    'child_process',
    'constants',
    'crypto',
    'events',
    'os',
    'path',
    'readline',
    'stream',
    'string_decoder',
    'tty',
    'typescript',
    'url',
    'util',
  ],
  plugins: [
    {
      resolveId(importee) {
        if (importee === '@compiler') {
          return {
            id: '../../compiler/stencil_next.js',
            external: true
          }
        }
        if (importee === '@dev-server') {
          return {
            id: '../dev-server/index.js',
            external: true
          }
        }
        if (importee === '@sys-node') {
          return {
            id: '../sys/node_next/index.js',
            external: true
          }
        }
        if (importee === 'fs') {
          return {
            id: '../sys/node/graceful-fs.js',
            external: true
          }
        }
      }
    },
    aliasPlugin,
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
  ],
  output: {
    format: 'cjs',
    file: 'dist/cli_next/index.js'
  }
};
