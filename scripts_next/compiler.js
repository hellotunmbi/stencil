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

const scriptsDir = __dirname;
const rootDir = path.join(scriptsDir, '..');
const compilerIntro = fs.readFileSync(path.join(scriptsDir, 'helpers', 'compiler-intro.js'), 'utf8');
const cjsIntro = fs.readFileSync(path.join(scriptsDir, 'helpers', 'compiler-cjs-intro.js'), 'utf8');
const cjsOutro = fs.readFileSync(path.join(scriptsDir, 'helpers', 'compiler-cjs-outro.js'), 'utf8');
const typescriptPkg = fs.readJSONSync(path.join(require.resolve('typescript'), '..', '..', 'package.json'));
const stencilPkg = require('../package.json');

const compilerFileName = 'stencil_next.js';
const browserFileName = 'stencil-browser.js';
const compilerDtsName = compilerFileName.replace('.js', '.d.ts');
const browserDtsName = browserFileName.replace('.js', '.d.ts');
const srcDir = path.join(rootDir, 'src');
const inputTsDir = path.join(rootDir, 'dist-ts');
const outputDistDir = path.join(rootDir, 'dist');
const inputClientDir = path.join(inputTsDir, 'client');
const inputInternalDir = path.join(inputTsDir, 'internal');
const inputAppDataDir = path.join(inputTsDir, 'app-data');
const inputComilerDir = path.join(inputTsDir, 'compiler_next');
const outputCompilerDir = path.join(rootDir, 'compiler');
const outputInternalDir = path.join(rootDir, 'internal');
const outputInternalClientDir = path.join(outputInternalDir, 'client');
const outputInternalAppDataDir = path.join(outputInternalDir, 'app-data');

fs.emptyDirSync(outputCompilerDir);
fs.ensureDirSync(outputDistDir);
fs.ensureDirSync(outputInternalDir);
fs.emptyDirSync(outputInternalClientDir);
fs.emptyDirSync(outputInternalAppDataDir);

const replaceData = {
  '0.0.0-stencil-dev': stencilPkg.version,
  '__VERSION:TYPESCRIPT__': typescriptPkg.version,
};


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
        // bundle internal d.ts
        const entryDts = path.join(inputTsDir, 'internal.d.ts');
        let internalDtsContent = bundleDts(entryDts);

        // add extension module d.ts (.svg/.css) to bundled internal d.ts
        const dstExtModuleOutput = path.join(outputInternalDir, 'ext-modules.d.ts');
        fs.writeFileSync(dstExtModuleOutput, EXTENSION_MODULE_DTS);
        internalDtsContent = `/// <reference path="./ext-modules.d.ts" />\n` + internalDtsContent;

        // write the bundled internal d.ts file
        const internalDstOutput = path.join(outputInternalDir, 'index.d.ts');
        fs.writeFileSync(internalDstOutput, internalDtsContent);

        // copy @stencil/core/internal entry
        fs.copyFileSync(
          path.join(inputInternalDir, 'public.js'),
          path.join(outputInternalDir, 'index.mjs')
        );

        // copy @stencil/core public d.ts
        fs.copyFileSync(
          path.join(inputTsDir, 'public.d.ts'),
          path.join(outputDistDir, 'index.d.ts')
        );

        // copy @stencil/core/compiler(core) public d.ts
        fs.copyFileSync(
          path.join(inputComilerDir, 'public-core.d.ts'),
          path.join(outputCompilerDir, compilerDtsName)
        );

        // copy @stencil/core/compiler/(browser) public d.ts
        fs.copyFileSync(
          path.join(inputComilerDir, 'public-browser.d.ts'),
          path.join(outputCompilerDir, browserDtsName)
        );

        // copy @stencil/core/internal/app-data/index.mjs
        fs.copyFileSync(
          path.join(inputAppDataDir, 'public.js'),
          path.join(outputInternalAppDataDir, 'index.mjs')
        );

        // copy @stencil/core/internal/app-data/index.d.ts
        fs.copyFileSync(
          path.join(inputAppDataDir, 'public.d.ts'),
          path.join(outputInternalAppDataDir, 'index.d.ts')
        );

        // write @stencil/core/compiler/package.json
        writePkgJson(outputCompilerDir, COMPILER_PKG_JSON);

        // write @stencil/core/internal/package.json
        writePkgJson(outputInternalDir, INTERNAL_PKG_JSON);

        // write @stencil/core/internal/client/package.json
        writePkgJson(outputInternalClientDir, INTERNAL_CLIENT_PKG_JSON);

        // write @stencil/core/internal/app-data/package.json
        writePkgJson(outputInternalAppDataDir, APP_DATA_PKG_JSON);
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
    'index': path.join(inputClientDir, 'index.js')
  },
  output: {
    format: 'es',
    dir: outputInternalClientDir,
    entryFileNames: '[name].mjs',
    chunkFileNames: '[name].[hash].mjs',
    banner: getBanner('Stencil')
  },
  plugins: [
    {
      resolveId(importee) {
        if (importee === '@stencil/core/internal/app-data' || importee === '@build-conditionals') {
          return {
            id: '@stencil/core/internal/app-data',
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


function writePkgJson(pkgDir, pkgData) {
  const pkgPath = path.join(pkgDir, 'package.json');
  pkgData.version = stencilPkg.version;
  pkgData.private = true;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));
}


const COMPILER_PKG_JSON = {
  name: "@stencil/core/compiler",
  main: compilerFileName,
  browser: browserFileName,
  types: compilerDtsName
};


const INTERNAL_PKG_JSON = {
  name: "@stencil/core/internal",
  main: 'index.mjs',
  types: 'index.d.ts'
};


const INTERNAL_CLIENT_PKG_JSON = {
  name: "@stencil/core/internal/client",
  main: 'index.mjs'
};


const APP_DATA_PKG_JSON = {
  name: "@stencil/core/internal/app-data",
  main: 'index.mjs',
  types: 'index.d.ts'
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
declare module '*.css' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
`;


export default [
  coreCompiler,
  browserCompiler,
  internalClientRuntime
];
