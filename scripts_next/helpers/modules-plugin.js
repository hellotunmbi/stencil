import path from 'path';


const modules = new Set([
  'events', 'fs', 'module', 'path', 'typescript', 'url', 'util'
]);

export default function() {
  return {
    name: 'modules',
    resolveId(importee) {
      if (modules.has(importee)) {
        return path.join(__dirname, '..', 'dist-ts', 'compiler_next', 'sys', 'modules', `${importee}.js`);
      }
    }
  }
}
