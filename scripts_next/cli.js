import fs from 'fs-extra';
import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import aliasPlugin from './helpers/alias-plugin';

const stencilPkg = require('../package.json');
const inputDir = path.join(__dirname, '..', 'dist-ts', 'cli_next');
const outputDir = path.join(__dirname, '..', 'cli');

fs.emptyDirSync(outputDir);


export default {
  input: path.join(inputDir, 'index.js'),
  output: {
    format: 'cjs',
    file: path.join(outputDir, 'index.js'),
  },
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
    {
      resolveId(importee) {
        if (importee === '@compiler') {
          return {
            id: '../compiler/stencil_next.js',
            external: true
          }
        }
        if (importee === '@dev-server') {
          return {
            id: '../dev-server/index.js',
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
  ]
};


const PKG_JSON = {
  "name": "@stencil/core/cli",
  "version": stencilPkg.version,
  "main": 'index.js',
  "types": 'index.d.ts',
  "private": true
};
