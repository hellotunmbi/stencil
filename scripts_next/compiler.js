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
import { reorderCoreStatements } from './helpers/reorder-statements';
import { rollup } from 'rollup';
import ts from 'typescript';

const compilerIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-intro.js'), 'utf8');
const cjsIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-intro.js'), 'utf8');
const cjsOutro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-outro.js'), 'utf8');
const typescriptPkg = fs.readJSONSync(path.join(require.resolve('typescript'), '..', '..', 'package.json'));
const stencilPkg = require('../package.json');

const compilerFileName = 'stencil_next.js';
const browserFileName = 'stencil-browser.js';
const compilerDts = compilerFileName.replace('.js', '.d.ts');
const browserDts = browserFileName.replace('.js', '.d.ts');
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const inputTsDir = path.join(rootDir, 'dist-ts');
const outputDistDir = path.join(rootDir, 'dist');
const inputClientDir = path.join(inputTsDir, 'client');
const inputComilerDir = path.join(inputTsDir, 'compiler_next');
const outputCompilerDir = path.join(rootDir, 'compiler');
const outputInternalDir = path.join(rootDir, 'internal');
const outputClientDir = path.join(outputInternalDir, 'client_next');
const replaceData = {
  '0.0.0-stencil-dev': stencilPkg.version,
  '__VERSION:TYPESCRIPT__': typescriptPkg.version,
};

fs.emptyDirSync(outputCompilerDir);
fs.ensureDirSync(outputDistDir);
fs.ensureDirSync(outputInternalDir);


// core compiler build
const coreCompiler = {
  input: path.join(inputComilerDir, 'index-core.js'),
  output: {
    format: 'cjs',
    file: path.join(outputCompilerDir, compilerFileName),
    intro: cjsIntro + compilerIntro,
    outro: cjsOutro,
    strict: false,
    banner: getBanner('Stencil Compiler - ' + compilerFileName)
  },
  plugins: [
    {
      buildStart() {
        // bundle dts
        const entryDts = path.join(inputTsDir, 'internal.d.ts');
        let dtsContent = bundleDts(entryDts);

        // extension module dts (.svg/.css)
        const dstExtModuleOutput = path.join(outputInternalDir, 'ext-modules.d.ts');
        fs.writeFileSync(dstExtModuleOutput, EXTENSION_MODULE_DTS);
        dtsContent = `/// <reference path="./ext-modules.d.ts" />\n` + dtsContent;

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

        // write @stencil/core/compiler/package.json
        const pkgPath = path.join(outputCompilerDir, 'package.json');
        const pkgStr = JSON.stringify(COMPILER_PKG_JSON, null, 2);
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


// browser compiler build
const browserCompiler = {
  input: path.join(inputComilerDir, 'index-browser.js'),
  output: {
    format: 'es',
    file: path.join(outputCompilerDir, browserFileName),
    banner: getBanner('Stencil Browser Compiler - ' + browserFileName)
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


// internal client runtime build
const internalClientRuntime = {
  input: {
    'index': path.join(inputClientDir, 'index.js'),
    'build-conditionals': path.join(inputClientDir, 'build-conditionals.js'),
  },
  output: {
    format: 'es',
    dir: outputClientDir,
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name].[hash].mjs',
    banner: getBanner('Stencil')
  },
  plugins: [
    {
      buildStart() {
        fs.emptyDirSync(outputClientDir);
      },
      buildEnd() {
        // write @stencil/core/internal/client/package.json
        const pkgPath = path.join(outputClientDir, 'package.json');
        const pkgStr = JSON.stringify(INTERNAL_CLIENT_PKG_JSON, null, 2);
        fs.writeFileSync(pkgPath, pkgStr);
      }
    },
    {
      resolveId(importee) {
        if (importee === '@build-conditionals') {
          return {
            id: '@stencil/core/internal/client_next/build-conditionals.mjs',
            external: true
          }
        }
        if (importee === '@platform') {
          return path.join(inputTsDir, 'client', 'index.js');
        }
        if (importee === '@runtime') {
          return path.join(inputTsDir, 'runtime', 'index.js');
        }
        if (importee === '@utils') {
          return path.join(inputTsDir, 'utils', 'index.js');
        }
      },
      generateBundle(options, bundles) {
        reorderCoreStatements(options, bundles);
      }
    },
    {
      resolveId(importee) {
        if (importee === './polyfills/css-shim.js') {
          return importee;
        }
      },
      async load(id) {
        // bundle the css-shim into one file
        if (id === './polyfills/css-shim.js') {
          const rollupBuild = await rollup({
            input: path.join(inputClientDir, 'polyfills', 'css-shim', 'index.js'),
            onwarn: (message) => {
              if (/top level of an ES module/.test(message)) return;
              console.error(message);
            }
          });

          const { output } = await rollupBuild.generate({ format: 'es' });

          const transpileToEs5 = ts.transpileModule(output[0].code, {
            compilerOptions: {
              target: ts.ScriptTarget.ES5
            }
          });

          return transpileToEs5.outputText;
        }
      }
    },
    {
      resolveId(importee) {
        if (importee.startsWith('./polyfills')) {
          const fileName = path.basename(importee);
          return path.join(srcDir, 'client', 'polyfills', fileName);
        }
      }
    },
    replace(replaceData),
  ]
};


const COMPILER_PKG_JSON = {
  "name": "@stencil/core/compiler",
  "version": stencilPkg.version,
  "main": compilerFileName,
  "browser": browserFileName,
  "types": compilerDts,
  "private": true
};


const INTERNAL_CLIENT_PKG_JSON = {
  "name": "@stencil/core/internal/client_next",
  "version": stencilPkg.version,
  "main": 'index.mjs',
  "private": true
};


function getBanner(fileName) {
  return [
    `/**`,
    ` ${fileName} v${stencilPkg.version}`,
    ` MIT Licensed, https://stenciljs.com`,
    `*/`
  ].join('\n');
}


const EXTENSION_MODULE_DTS = `
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.css' {
  const src: string;
  export default src;
}
`;


export default [
  coreCompiler,
  browserCompiler,
  internalClientRuntime
];
