import * as d from '../../../declarations';
import { GLOBAL_BUNDLE_ID, LAZY_BROWSER_ENTRY_ID, LAZY_EXTERNAL_ENTRY_ID, RUNTIME_CLIENT_ID } from '../../bundle/entry-alias-ids';
import { Plugin } from 'rollup';


export const lazyCorePlugin = (_config: d.Config, _buildCtx: d.BuildCtx) => {
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
        return getLazyBundleData(BROWSER_ENTRY);
      }

      if (id === LAZY_EXTERNAL_ENTRY_ID) {
        return getLazyBundleData(EXTERNAL_ENTRY);
      }

      return null;
    }
  };

  return plugin;
};


const getLazyBundleData = (code: string) => {
  return code.replace(DATA_PLACEHOLDER, DATA_PLACEHOLDER + '/** TODO!! **/');
};


const DATA_PLACEHOLDER = `[/*!__STENCIL_LAZY_DATA__*/]`;

// This is for webpack
const EXTERNAL_ENTRY = `
import globals from '${GLOBAL_BUNDLE_ID}';
import { bootstrapLazy, patchEsm } from '${RUNTIME_CLIENT_ID}';

export const defineCustomElements = (win, options) => {
  return patchEsm().then(() => {
    globals();
    bootstrapLazy(${DATA_PLACEHOLDER}, options);
  });
};
`;


const BROWSER_ENTRY = `
import globals from '${GLOBAL_BUNDLE_ID}';
import { bootstrapLazy, patchBrowser } from '${RUNTIME_CLIENT_ID}';

patchBrowser().then(options => {
  globals();
  return bootstrapLazy(${DATA_PLACEHOLDER}, options);
});
`;
