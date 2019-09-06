import fs from 'fs-extra';
import path from 'path';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import json from 'rollup-plugin-json';
import aliasPlugin from './helpers/alias-plugin';
import modulesPlugin from './helpers/modules-plugin';


const compilerIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-intro.js'), 'utf8');
const cjsIntro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-intro.js'), 'utf8');
const cjsOutro = fs.readFileSync(path.join(__dirname, 'helpers', 'compiler-cjs-outro.js'), 'utf8');
const typescriptPkg = fs.readJSONSync(path.join(require.resolve('typescript'), '..', '..', 'package.json'));

export default {
  input: 'dist-ts/compiler_next/index.js',
  external: [
  ],
  plugins: [
    aliasPlugin,
    modulesPlugin(),
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    replace({
      '0.0.0-stencil-dev': '0.0.0-stencil-next',
      '__VERSION:TYPESCRIPT__': typescriptPkg.version,
    }),
    json(),
    {
      generateBundle(outputOpts) {
        const dts = `export * from '../dist/compiler_next/index';`;

        if (outputOpts.format === 'cjs') {
          fs.writeFileSync(path.join(__dirname, '..', 'compiler', 'stencil_next.d.ts'), dts);
        } else {
          fs.writeFileSync(path.join(__dirname, '..', 'compiler', 'stencil_next.esm.d.ts'), dts);
        }
      }
    }
  ],
  treeshake: {
    moduleSideEffects: false
  },
  output: [
    {
      format: 'esm',
      file: 'compiler/stencil_next.esm.js',
      intro: compilerIntro
    },
    {
      format: 'cjs',
      file: 'compiler/stencil_next.js',
      intro: cjsIntro + compilerIntro,
      outro: cjsOutro,
      strict: false
    }
  ]
};
