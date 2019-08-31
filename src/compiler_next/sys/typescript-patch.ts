import * as d from '../../declarations';
import { dependencies } from '../dependencies';
import { normalizePath } from '@utils';
import path from 'path';
import ts from 'typescript';


export const initTypescript = async (config: d.Config, sys: d.CompilerSystem) => {
  if (!ts.transform) {
    await getTs();
  }

  if (!ts.sys) {
    ts.sys = createTsSys(sys);
  }

  if (typeof globalThis.ts !== 'undefined' && !globalThis.ts.sys) {
    globalThis.ts.sys = ts.sys;
  }

  config.tsconfig = getTsConfigPath(config);
};


const getTs = async () => {
  if (globalThis.ts) {
    // "ts" already on global scope
    Object.assign(ts, globalThis.ts);
    (ts as any).__typescript = 'globalThis';

  } else if (typeof global !== 'undefined' && typeof require === 'function') {
    // NodeJS
    Object.assign(ts, require('typescript'));
    (ts as any).__typescript = 'node';

  } else {
    const dep = dependencies.find(dep => dep.name === 'typescript');

    if (typeof self !== 'undefined' && (self as any).importScripts) {
      // browser web worker
      (self as any).importScripts(dep.url);
      Object.assign(ts, globalThis.ts);
      (ts as any).__typescript = 'webworker';

    } else if (typeof document !== 'undefined') {
      // browser main thread
      await new Promise((resolve, reject) => {
        const tsScript = document.createElement('script');
        tsScript.src = dep.url;
        tsScript.onload = () => {
          Object.assign(ts, globalThis.ts);
          (ts as any).__typescript = 'document';
          resolve();
        };
        tsScript.onerror = reject;
        document.head.appendChild(tsScript);
      });

    } else {
      throw new Error(`typescript: missing global "ts" variable`);
    }
  }
};


const createTsSys = (stencilSys: d.CompilerSystem) => {
  const tsSys: ts.System = {
    args: [],
    newLine: '\n',
    useCaseSensitiveFileNames: false,
    createDirectory(p) {
      stencilSys.mkdirSync(p);
    },
    directoryExists(p) {
      try {
        const s = stencilSys.statSync(p);
        return s.isDirectory();
      } catch (e) {}
      return false;
    },
    exit(exitCode) {
      stencilSys.exit(exitCode);
    },
    fileExists(p) {
      try {
        const s = stencilSys.statSync(p);
        return s.isFile();
      } catch (e) {}
      return false;
    },
    getExecutingFilePath() {
      return stencilSys.getExecutingFilePath();
    },
    getCurrentDirectory() {
      return stencilSys.getCurrentDirectory();
    },
    getDirectories(p) {
      try {
        const items = stencilSys.readdirSync(p);
        return items.filter(item => {
          const itemPath = path.join(p, item);
          const s = stencilSys.statSync(itemPath);
          return s.isDirectory();
        }).map(item => {
          return path.join(p, item);
        });
      } catch (e) {}
      return [];
    },
    readDirectory(p, _extensions, _exclude, _include, _depth) {
      try {
        const items = stencilSys.readdirSync(p);
        return items.map(item => {
          return path.join(p, item);
        });
      } catch (e) {}
      return [];
    },
    readFile(p, encoding) {
      return stencilSys.readFileSync(p, encoding);
    },
    resolvePath(p) {
      return path.resolve(p);
    },
    watchFile(p, cb) {
      const fileWatcher = stencilSys.watchFile(p, (filePath, eventKind) => {
        if (eventKind === 'fileAdd') {
          cb(filePath, ts.FileWatcherEventKind.Created);
        } else if (eventKind === 'fileUpdate') {
          cb(filePath, ts.FileWatcherEventKind.Changed);
        } else if (eventKind === 'fileDelete') {
          cb(filePath, ts.FileWatcherEventKind.Deleted);
        }
      });
      return {
        close() {
          fileWatcher.close();
        }
      };
    },
    writeFile(p, data) {
      stencilSys.writeFileSync(p, data);
    },
    write(s) {
      console.log('ts.sys.write', s);
    }
  };
  return tsSys;
};


const getTsConfigPath = (config: d.Config) => {
  if (typeof config.tsconfig === 'string') {
    if (!path.isAbsolute(config.tsconfig)) {
      return normalizePath(path.join(config.rootDir, config.tsconfig));
    }
    return normalizePath(config.tsconfig);
  }

  if (typeof ts !== 'undefined' && ts.findConfigFile) {
    const tsconfig = ts.findConfigFile(config.rootDir, ts.sys.fileExists);
    if (typeof tsconfig === 'string') {
      return normalizePath(tsconfig);
    }
  }

  return null;
};

export default ts;

declare var globalThis: any;
