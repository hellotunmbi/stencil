import { IS_NODE_ENV } from '../environment';


export const URL = (gbl => {
  if (IS_NODE_ENV) {
    gbl.URL = require('url').URL;
  }
  return gbl.URL;
})(globalThis) as any;
