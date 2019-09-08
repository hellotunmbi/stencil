const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const webpack = require('webpack');

const outputDir = path.join(__dirname, '..', 'sys', 'node');
const cachedDir = path.join(__dirname, '..', 'dist-ts', 'sys-node');


function bundleExternal(entryFileName) {
  return new Promise(resolve => {
    const outputFile = path.join(outputDir, entryFileName);
    const cachedFile = path.join(cachedDir, entryFileName);

    const cachedExists = fs.existsSync(cachedFile);
    if (cachedExists) {
      fs.copyFileSync(cachedFile, outputFile);
      resolve();
      return;
    }

    const whitelist = [
      'child_process',
      'os',
      'typescript'
    ];

    webpack({
      entry: path.join(__dirname, '..', 'src', 'sys', 'node', 'bundles', entryFileName),
      output: {
        path: outputDir,
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
      externals(_context, request, callback) {
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
        fs.copyFileSync(outputFile, cachedFile);
        resolve();
      }
    });
  });
}


(async () => {
  fs.ensureDirSync(cachedDir);
  fs.emptyDirSync(outputDir);

  await Promise.all([
    bundleExternal('graceful-fs.js'),
    bundleExternal('node-fetch.js'),
    bundleExternal('open-in-editor.js'),
    bundleExternal('websocket.js'),
  ]);

  // open-in-editor's visualstudio.vbs file
  const visualstudioVbsSrc = path.join(__dirname, '..', 'node_modules', 'open-in-editor', 'lib', 'editors', 'visualstudio.vbs');
  const visualstudioVbsDesc = path.join(outputDir, 'visualstudio.vbs');
  fs.copySync(visualstudioVbsSrc, visualstudioVbsDesc);

  // copy open's xdg-open file
  const xdgOpenSrcPath = glob.sync('xdg-open', {
    cwd: path.join(__dirname, '..', 'node_modules', 'open'),
    absolute: true
  });
  if (xdgOpenSrcPath.length !== 1) {
    throw new Error(`cannot find xdg-open`);
  }
  const xdgOpenDestPath = path.join(outputDir, 'xdg-open');
  fs.copySync(xdgOpenSrcPath[0], xdgOpenDestPath);
})();
