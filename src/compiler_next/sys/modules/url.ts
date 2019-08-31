
export const URL = (gbl => {
  if (typeof global !== 'undefined' && typeof require === 'function') {
    gbl.URL = require('url').URL;
  }
  return gbl.URL;
})(globalThis) as any;

