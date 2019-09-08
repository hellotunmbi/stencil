import fs from 'fs-extra';
import path from 'path';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import json from 'rollup-plugin-json';
import aliasPlugin from './helpers/alias-plugin';
import { bundleDts, inlineDtsPlugin } from './helpers/bundle-dts-plugin';
import modulesPlugin from './helpers/modules-plugin';
import { buildCompilerPlugins } from './helpers/compiler-plugins';

const compilerIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-intro.js'), 'utf8');
const cjsIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-intro.js'), 'utf8');
const cjsOutro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-outro.js'), 'utf8');
const typescriptPkg = fs.readJSONSync(path.join(require.resolve('typescript'), '..', '..', 'package.json'));
const stencilPkg = require('../package.json');

const fileName = 'stencil_next';
const esmFileName = fileName + '.mjs';
const cjsFileName = fileName + '.js';
const dtsFileName = fileName + '.d.ts';
const inputDir = path.join(__dirname, '..', 'dist-ts', 'compiler_next');
const outputDir = path.join(__dirname, '..', 'compiler');

fs.emptyDirSync(outputDir);


export default {
  input: path.join(inputDir, 'index.js'),
  output: [
    {
      format: 'es',
      file: path.join(outputDir, esmFileName),
      intro: compilerIntro
    },
    {
      format: 'cjs',
      file: path.join(outputDir, cjsFileName),
      intro: cjsIntro + compilerIntro,
      outro: cjsOutro,
      strict: false
    }
  ],
  plugins: [
    {
      resolveId(id) {
        if (id === '@compiler-plugins') return id;
      },
      async load(id) {
        if (id === '@compiler-plugins') {
          return await buildCompilerPlugins();
        }
      }
    },
    {
      writeBundle(outputOpts) {
        if (outputOpts.format === 'es') {
          // copy public d.ts
          const src = path.join(inputDir, 'public.d.ts');
          const dst = path.join(outputDir, dtsFileName);
          fs.copyFileSync(src, dst);

          // write package.json
          const pkgPath = path.join(outputDir, 'package.json');
          const pkgStr = JSON.stringify(PKG_JSON, null, 2);
          fs.writeFileSync(pkgPath, pkgStr);
        }
      }
    },
    aliasPlugin,
    // inlineDtsPlugin('@internal-dts', dtsInputFile),
    modulesPlugin(),
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    replace({
      '0.0.0-stencil-dev': stencilPkg.version,
      '__VERSION:TYPESCRIPT__': typescriptPkg.version,
    }),
    json()
  ],
  treeshake: {
    moduleSideEffects: false
  }
};


const PKG_JSON = {
  "name": "@stencil/core/compiler",
  "version": stencilPkg.version,
  "main": cjsFileName,
  "module": esmFileName,
  "types": dtsFileName,
  "private": true
};
