import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';


export default {
  input: 'dist-ts/dev-server_next/index-worker.js',
  external: [
    'buffer',
    'fs',
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
    aliasPlugin,
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
  ],
  output: [
    {
      format: 'cjs',
      file: 'dist/dev-server_next/server.js'
    }
  ]
};
