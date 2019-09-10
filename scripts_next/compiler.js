import fs from 'fs-extra';
import path from 'path';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import json from 'rollup-plugin-json';
import aliasPlugin from './helpers/alias-plugin';
import { bundleDts } from './helpers/bundle-dts-plugin';
import modulesPlugin from './helpers/modules-plugin';
import { buildCompilerPlugins } from './helpers/compiler-plugins';

const compilerIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-intro.js'), 'utf8');
const cjsIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-intro.js'), 'utf8');
const cjsOutro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-outro.js'), 'utf8');
const typescriptPkg = fs.readJSONSync(path.join(require.resolve('typescript'), '..', '..', 'package.json'));
const stencilPkg = require('../package.json');

const compilerFileName = 'stencil_next.js';
const browserFileName = 'stencil-browser.js';
const compilerDts = compilerFileName.replace('.js', '.d.ts');
const browserDts = browserFileName.replace('.js', '.d.ts');
const inputTsDir = path.join(__dirname, '..', 'dist-ts');
const outputDistDir = path.join(__dirname, '..', 'dist');
const inputComilerDir = path.join(inputTsDir, 'compiler_next');
const outputCompilerDir = path.join(__dirname, '..', 'compiler');
const outputInternalDir = path.join(__dirname, '..', 'internal');
const replaceData = {
  '0.0.0-stencil-dev': stencilPkg.version,
  '__VERSION:TYPESCRIPT__': typescriptPkg.version,
};

fs.emptyDirSync(outputCompilerDir);
fs.ensureDirSync(outputDistDir);
fs.ensureDirSync(outputInternalDir);


const stencilCoreCompiler = {
  input: path.join(inputComilerDir, 'index-core.js'),
  output: {
    format: 'cjs',
    file: path.join(outputCompilerDir, compilerFileName),
    intro: cjsIntro + compilerIntro,
    outro: cjsOutro,
    strict: false
  },
  plugins: [
    {
      buildStart() {
        // bundle dts
        const entryDts = path.join(inputTsDir, 'internal.d.ts');
        const dtsContent = bundleDts(entryDts);
        const dstOutput = path.join(outputInternalDir, 'index.d.ts');
        fs.writeFileSync(dstOutput, dtsContent);
      },
      buildEnd() {
        // copy @stencil/core public d.ts
        const srcCoreDtsPath = path.join(inputTsDir, 'public.d.ts');
        const dstCoreDtsPath = path.join(outputDistDir, 'index.d.ts');
        fs.copyFileSync(srcCoreDtsPath, dstCoreDtsPath);

        // copy @stencil/core/compiler(core compiler) public d.ts
        const srcCompilerDtsPath = path.join(inputComilerDir, 'public-core.d.ts');
        const dstCompilerDtsPath = path.join(outputCompilerDir, compilerDts);
        fs.copyFileSync(srcCompilerDtsPath, dstCompilerDtsPath);

        // copy @stencil/core/compiler/(browser compiler) public d.ts
        const srcBrowserDtsPath = path.join(inputComilerDir, 'public-browser.d.ts');
        const dstBrowserDtsPath = path.join(outputCompilerDir, browserDts);
        fs.copyFileSync(srcBrowserDtsPath, dstBrowserDtsPath);

        // write package.json
        const pkgPath = path.join(outputCompilerDir, 'package.json');
        const pkgStr = JSON.stringify(PKG_JSON, null, 2);
        fs.writeFileSync(pkgPath, pkgStr);
      }
    },
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
    aliasPlugin,
    modulesPlugin(),
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    replace(replaceData),
    json()
  ],
  treeshake: {
    moduleSideEffects: false
  }
};


const stencilBrowserCompiler = {
  input: path.join(inputComilerDir, 'index-browser.js'),
  output: {
    format: 'es',
    file: path.join(outputCompilerDir, browserFileName)
  },
  plugins: [
    aliasPlugin,
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    modulesPlugin(),
    replace(replaceData),
  ]
};


const PKG_JSON = {
  "name": "@stencil/core/compiler",
  "version": stencilPkg.version,
  "main": compilerFileName,
  "browser": browserFileName,
  "types": compilerDts,
  "private": true
};


export default [
  stencilCoreCompiler,
  stencilBrowserCompiler
];
