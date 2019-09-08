import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';

const inputDir = path.join(__dirname, '..', 'dist-ts', 'dev-server_next');
const outputDir = path.join(__dirname, '..', 'dev-server');


export default {
  input: path.join(inputDir, 'index-worker.js'),
  output: {
    format: 'cjs',
    file: path.join(outputDir, 'server.js'),
  },
  external: [
    'buffer',
    'http',
    'https',
    'net',
    'path',
    'querystring',
    'url',
    'util',
    'zlib',
  ],
  plugins: [
    {
      resolveId(importee) {
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
  ]
};
