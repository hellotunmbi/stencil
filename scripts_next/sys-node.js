const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const rollup = require('rollup');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const rollupJson = require('rollup-plugin-json');
const glob = require('glob');
const { relativeResolve } = require('./helpers/relative-resolve');

const ROOT_DIR = path.join(__dirname, '..');
const TRANSPILED_DIR = path.join(ROOT_DIR, 'dist-ts', 'sys', 'node_next');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'sys', 'node_next');


function bundleExternal(entryFileName) {
  return new Promise(resolve => {

    const alreadyExists = fs.existsSync(path.join(DIST_DIR, entryFileName));
    if (alreadyExists) {
      resolve();
      return;
    }

    const whitelist = [
      'child_process',
      'os',
      'typescript'
    ];

    webpack({
      entry: path.join(__dirname, '..', 'src', 'sys', 'node_next', 'bundles', entryFileName),
      output: {
        path: DIST_DIR,
        filename: entryFileName,
        libraryTarget: 'commonjs'
      },
      target: 'node',
      node: {
        __dirname: false,
        __filename: false,
        process: false,
        Buffer: false
      },
      externals: function(_context, request, callback) {
        if (request.match(/^(\.{0,2})\//)) {
          // absolute and relative paths are not externals
          return callback();
        }

        if (request === '@mock-doc') {
          return callback(null, '../../mock-doc');
        }

        if (request === '@utils') {
          return callback(null, '../../utils');
        }

        if (whitelist.indexOf(request) > -1) {
          // we specifically do not want to bundle these imports
          require.resolve(request);
          return callback(null, request);
        }

        // bundle this import
        callback();
      },
      resolve: {
        alias: {
          'postcss': path.resolve(__dirname, '..', 'node_modules', 'postcss'),
          'source-map': path.resolve(__dirname, '..', 'node_modules', 'source-map'),
          'chalk': path.resolve(__dirname, 'helpers', 'empty.js'),
          'cssnano-preset-default': path.resolve(__dirname, 'helpers', 'cssnano-preset-default'),
        }
      },
      optimization: {
        minimize: false
      },
      mode: 'production'

    }, (err, stats) => {
      if (err) {
        if (err.details) {
          throw err.details;
        }
      }

      const info = stats.toJson({ errors: true });
      if (stats.hasErrors()) {
        const webpackError = info.errors.join('\n');
        throw webpackError

      } else {
        resolve();
      }
    });
  });
}


async function bundleNodeSysMain() {
  const inputPath = path.join(TRANSPILED_DIR, 'index.js');
  const outputPath = path.join(DIST_DIR, 'index.js');

  const rollupBuild = await rollup.rollup({
    input: inputPath,
    external: [
      'assert',
      'child_process',
      'crypto',
      'events',
      'https',
      'module',
      'path',
      'net',
      'os',
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
              id: '../../../compiler/stencil_next.js',
              external: true
            }
          }
          if (importee === 'resolve') {
            return path.join(__dirname, 'helpers', 'resolve.js');
          }
          if (importee === '@mock-doc') {
            return relativeResolve('../../mock-doc');
          }
          if (importee === '@utils') {
            return relativeResolve('../../utils');
          }
          if (importee === 'fs') {
            return {
              id: './graceful-fs.js',
              external: true
            }
          }
        }
      },
      rollupResolve({
        preferBuiltins: true,
      }),
      rollupCommonjs({
        namedExports: {
          'micromatch': [ 'matcher' ]
        }
      }),
      rollupJson()
    ],
    onwarn: (message) => {
      if (message.code === 'CIRCULAR_DEPENDENCY') return;
      console.error(message);
    }
  });

  const { output } = await rollupBuild.generate({
    format: 'cjs',
    file: outputPath
  });

  const outputText = output[0].code; //updateBuildIds(output[0].code);

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, outputText);
}


async function copyXdgOpen() {
  // copy open's xdg-open file
  const xdgOpenSrcPath = glob.sync('xdg-open', {
    cwd: path.join(__dirname, '..', 'node_modules', 'open'),
    absolute: true
  });
  if (xdgOpenSrcPath.length !== 1) {
    throw new Error(`cannot find xdg-open`);
  }
  const xdgOpenDestPath = path.join(DIST_DIR, 'xdg-open');
  await fs.copy(xdgOpenSrcPath[0], xdgOpenDestPath);
}


async function copyOpenInEditor() {
  // open-in-editor's visualstudio.vbs file
  const visualstudioVbsSrc = path.join(__dirname, '..', 'node_modules', 'open-in-editor', 'lib', 'editors', 'visualstudio.vbs');
  const visualstudioVbsDesc = path.join(DIST_DIR, 'visualstudio.vbs');
  await fs.copy(visualstudioVbsSrc, visualstudioVbsDesc);
}


(async () => {
  await Promise.all([
    bundleExternal('graceful-fs.js'),
    bundleExternal('node-fetch.js'),
    bundleExternal('open-in-editor.js'),
    bundleExternal('rollup-plugins.js'),
    bundleExternal('websocket.js'),
    bundleNodeSysMain(),
    copyXdgOpen(),
    copyOpenInEditor()
  ]);
})();
