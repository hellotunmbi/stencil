import * as d from '../../../declarations';
import { GLOBAL_BUNDLE_ID } from '../../../compiler/rollup-plugins/global-scripts';
import { Plugin } from 'rollup';


export const lazyCorePlugin = (_buildCtx: d.BuildCtx) => {
  const plugin: Plugin = {
    name: 'lazyCorePlugin',

    resolveId(importee) {
      if (importee === LAZY_BROWSER_ENTRY_ID || importee === LAZY_EXTERNAL_ENTRY_ID) {
        return importee;
      }
      return null;
    },

    load(id) {
      if (id === LAZY_BROWSER_ENTRY_ID) {
        return BROWSER_ENTRY;
      }
      if (id === LAZY_EXTERNAL_ENTRY_ID) {
        return EXTERNAL_ENTRY;
      }
      return null;
    }
  };

  return plugin;
};


// This is for webpack
const EXTERNAL_ENTRY = `
import globals from '${GLOBAL_BUNDLE_ID}';
import { bootstrapLazy, patchEsm } from '@stencil/core/internal/client_next/index.mjs';

export const defineCustomElements = (win, options) => {
  return patchEsm().then(() => {
    globals();
    bootstrapLazy([/*!__STENCIL_LAZY_DATA__*/], options);
  });
};
`;


const BROWSER_ENTRY = `
import globals from '${GLOBAL_BUNDLE_ID}';
import { bootstrapLazy, patchBrowser } from '@stencil/core/internal/client_next/index.mjs';
patchBrowser().then(options => {
  globals();
  return bootstrapLazy([/*!__STENCIL_LAZY_DATA__*/], options);
});
`;


export const LAZY_BROWSER_ENTRY_ID = '@lazy-browser-entrypoint';
export const LAZY_EXTERNAL_ENTRY_ID = '@lazy-external-entrypoint';
