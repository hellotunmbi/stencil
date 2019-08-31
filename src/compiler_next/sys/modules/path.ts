import pathBrowserify from 'path-browserify';

const path: any = {};

if (typeof global !== 'undefined' && typeof require === 'function') {
  Object.assign(path, require('path'));
  path.__path = 'node';

} else {
  Object.assign(path, pathBrowserify);
  path.__path = 'browserify';
}


export const basename = path.basename;
export const dirname = path.dirname;
export const extname = path.extname;
export const format = path.format;
export const isAbsolute = path.isAbsolute;
export const join = path.join;
export const normalize = path.normalize;
export const relative = path.relative;
export const resolve = path.resolve;
export const sep = path.sep;
export default path;
