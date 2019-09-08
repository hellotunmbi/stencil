import fs from 'fs-extra';
import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';

const stencilPkg = require('../package.json');
const inputDir = path.join(__dirname, '..', 'dist-ts', 'dev-server_next');
const outputDir = path.join(__dirname, '..', 'dev-server');

fs.emptyDirSync(outputDir);


export default {
  input: path.join(inputDir, 'index.js'),
  output: {
    format: 'cjs',
    file: path.join(outputDir, 'index.js'),
  },
  external: [
    'child_process',
    'path',
  ],
  plugins: [
    {
      writeBundle() {
        // copy public d.ts
        const src = path.join(inputDir, 'public.d.ts');
        const dst = path.join(outputDir, 'index.d.ts');
        fs.copyFileSync(src, dst);

        // write package.json
        const pkgPath = path.join(outputDir, 'package.json');
        const pkgStr = JSON.stringify(PKG_JSON, null, 2);
        fs.writeFileSync(pkgPath, pkgStr);
      }
    },
    aliasPlugin,
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
  ]
};


const PKG_JSON = {
  "name": "@stencil/core/dev-server",
  "version": stencilPkg.version,
  "main": 'index.js',
  "types": 'index.d.ts',
  "private": true
};
