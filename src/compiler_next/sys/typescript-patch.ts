import * as d from '../../declarations';
import { dependencies } from '../dependencies';
import { IS_DOM_ENV, IS_NODE_ENV, IS_WEB_WORKER_ENV } from './environment';
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

  if (globalThis.ts && !globalThis.ts.sys) {
    globalThis.ts.sys = ts.sys;
  }

  config.tsconfig = getTsConfigPath(config);
};


const getTs = async () => {
  if (globalThis.ts) {
    // "ts" already on global scope
    Object.assign(ts, globalThis.ts);
    (ts as any).__typescript = 'globalThis';

  } else if (IS_NODE_ENV) {
    // NodeJS
    Object.assign(ts, require('typescript'));
    (ts as any).__typescript = 'node';

  } else {
    const dep = dependencies.find(dep => dep.name === 'typescript');

    if (IS_WEB_WORKER_ENV) {
      // browser web worker
      (self as any).importScripts(dep.url);
      Object.assign(ts, globalThis.ts);
      (ts as any).__typescript = 'webworker';

    } else if (IS_DOM_ENV) {
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

  const visitDirectory = (matchingPaths: Set<string>, p: string, extensions: ReadonlyArray<string>) => {
    const dirItems = stencilSys.readdirSync(p);

    dirItems.forEach(dirItem => {
      if (Array.isArray(extensions) && extensions.length > 0) {
        if (extensions.some(ext => dirItem.endsWith(ext))) {
          matchingPaths.add(dirItem);
        }
      } else {
        matchingPaths.add(dirItem);
      }

      const s = stencilSys.statSync(dirItem);
      if (s.isDirectory) {
        visitDirectory(matchingPaths, dirItem, extensions);
      }
    });
  };

  const tsSys: ts.System = {
    args: [],
    newLine: '\n',
    useCaseSensitiveFileNames: false,
    createDirectory(p) {
      stencilSys.mkdirSync(p);
    },
    directoryExists(p) {
      const s = stencilSys.statSync(p);
      if (s) {
        return s.isDirectory();
      }
      return false;
    },
    exit(exitCode) {
      stencilSys.exit(exitCode);
    },
    fileExists(p) {
      const s = stencilSys.statSync(p);
      if (s) {
        return s.isFile();
      }
      return false;
    },
    getExecutingFilePath() {
      return stencilSys.getExecutingFilePath();
    },
    getCurrentDirectory() {
      return stencilSys.getCurrentDirectory();
    },
    getDirectories(p) {
      const items = stencilSys.readdirSync(p);
      return items.filter(itemPath => {
        const s = stencilSys.statSync(itemPath);
        return s.isDirectory();
      });
    },
    readDirectory(p, extensions, _exclude, _include, _depth) {
      const matchingPaths = new Set<string>();
      visitDirectory(matchingPaths, p, extensions);
      return Array.from(matchingPaths);
    },
    readFile(p, encoding) {
      return stencilSys.readFileSync(p, encoding);
    },
    resolvePath(p) {
      return path.resolve(p);
    },
    watchDirectory(p, cb) {
      const watcher = stencilSys.watchDirectory(p, (filePath) => {
        cb(filePath);
      });
      return {
        close() {
          watcher.close();
        }
      };
    },
    watchFile(p, cb) {
      const watcher = stencilSys.watchFile(p, (filePath, eventKind) => {
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
          watcher.close();
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

  return ts.findConfigFile(config.rootDir, ts.sys.fileExists);
};

declare var globalThis: any;
