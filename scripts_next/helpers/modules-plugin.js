
const modules = new Set([
  'events', 'fs', 'module', 'path', 'typescript', 'url', 'util'
]);

export default {
  name: 'modules',
  resolveId(importee) {
    if (modules.has(importee)) {
      return `dist-ts/compiler_next/sys/modules/${importee}.js`;
    }
  }
}
