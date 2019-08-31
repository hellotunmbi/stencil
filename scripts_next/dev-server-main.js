import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';


export default {
  input: 'dist-ts/dev-server_next/index-main.js',
  external: [
    'child_process',
    'path',
  ],
  plugins: [
    {

    },
    aliasPlugin,
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
  ],
  output: {
    format: 'cjs',
    file: 'dist/dev-server_next/index.js'
  }
};
