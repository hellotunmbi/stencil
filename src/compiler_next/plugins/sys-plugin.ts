import * as d from '../../declarations';
import { normalizePath } from '@utils';
import { Plugin } from 'rollup';
import path from 'path';


export const sysPlugin = (fs: d.InMemoryFileSystem): Plugin => {
  const plugin: Plugin = {
    name: 'sysPlugin',

    async resolveId(importee, importer) {
      if (importer) {
        const importerDir = path.dirname(importer);
        const resolvedPath = normalizePath(path.resolve(importerDir, importee));

        for (const ext of EXTS) {
          const p = resolvedPath + ext;
          const hasAccess = await fs.access(p);
          if (hasAccess) {
            return p;
          }
        }

        return null;
      }
      return normalizePath(importee);
    },

    load(id) {
      return fs.readFile(id);
    }
  };

  return plugin;
};

const EXTS = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.mjs'
];
