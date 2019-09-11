import * as d from '../../declarations';
import { catchError, normalizePath } from '@utils';
import { dependencies } from './dependencies';
import { IS_NODE_ENV, IS_WEB_WORKER_ENV } from './environment';
import { resolveModuleIdSync, resolveRemotePackageJsonSync } from './resolve-module';
import { version } from '../../version';
import path from 'path';
import ts from 'typescript';


export const patchTypescript = async (config: d.Config, diagnostics: d.Diagnostic[], inMemoryFs: d.InMemoryFileSystem) => {
  const loadedTs = getTypescript(diagnostics);

  Object.assign(ts, loadedTs);

  if (!ts.sys) {
    ts.sys = createTsSys(config);
  }

  const compilerPath = config.sys_next.getExecutingPath();
  if (!IS_NODE_ENV && IS_WEB_WORKER_ENV && compilerPath.startsWith('http') && inMemoryFs) {
    const orgResolveModuleName = ts.resolveModuleName;

    ts.resolveModuleName = function (moduleName, containingFile, compilerOptions, host, cache, redirectedReference) {
      if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {

        if (moduleName.startsWith('@stencil/core')) {
          const stencilCoreRoot = new URL('../', compilerPath).href;

          if (moduleName === '@stencil/core') {
            return {
              resolvedModule: {
                extension: ts.Extension.Dts,
                resolvedFileName: new URL('./dist/index.d.ts', stencilCoreRoot).href,
                packageId: {
                  name: moduleName,
                  subModuleName: '',
                  version: version
                }
              }
            };
          }

          if (moduleName === '@stencil/core/internal') {
            return {
              resolvedModule: {
                extension: ts.Extension.Dts,
                resolvedFileName: new URL('./internal/index.d.ts', stencilCoreRoot).href,
                packageId: {
                  name: moduleName,
                  subModuleName: '',
                  version: version
                }
              }
            };
          }
        }

        const pkgJson = resolveRemotePackageJsonSync(config, inMemoryFs, moduleName);
        if (pkgJson) {
          const id = resolveModuleIdSync(config, inMemoryFs, moduleName, containingFile, ['.js', '.mjs']);
          return {
            resolvedModule: {
              extension: ts.Extension.Js,
              resolvedFileName: id,
              packageId: {
                name: moduleName,
                subModuleName: '',
                version: pkgJson.version
              }
            }
          };
        }
      }
      return orgResolveModuleName(moduleName, containingFile, compilerOptions, host, cache, redirectedReference);
    };

    loadedTs.resolveModuleName = ts.resolveModuleName;
  }

  config.tsconfig = getTsConfigPath(config);
};


export const getTypescript = (diagnostics: d.Diagnostic[]) => {
  const tsDep = dependencies.find(dep => dep.name === 'typescript');

  try {
    if (IS_NODE_ENV) {
      // NodeJS
      return require('typescript');
    }

    if (globalThis.ts && globalThis.ts.version === tsDep.version) {
      // "ts" already on global scope (and it's the correct version)
      return globalThis.ts;
    }

    if (IS_WEB_WORKER_ENV) {
      // browser web worker
      try {
        (self as any).importScripts(tsDep.url);
        return globalThis.ts;
      } catch (e) {
        throw new Error(`unable to load typescript: ${tsDep.url}`);
      }
    }

    throw new Error(`typescript: missing global "ts" variable`);

  } catch (e) {
    catchError(diagnostics, e);
  }
};


const createTsSys = (config: d.Config) => {
  const tsDep = dependencies.find(dep => dep.name === 'typescript');
  const stencilSys = config.sys_next;

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
      if (s.isDirectory()) {
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
      config.logger.error(`typescript exit: ${exitCode}`);
    },
    fileExists(p) {
      const s = stencilSys.statSync(p);
      if (s) {
        return s.isFile();
      }
      return false;
    },
    getExecutingFilePath() {
      return tsDep.url;
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
      let content = stencilSys.readFileSync(p, encoding);

      if (typeof content !== 'string' && (p.startsWith('https:') || p.startsWith('http:'))) {
        if (IS_WEB_WORKER_ENV) {
          content = fetchRemoteContent(p);
          if (typeof content === 'string') {
            stencilSys.writeFileSync(p, content);
          }

        } else {
          throw new Error(`stencil compiler must be ran from within a web worker to load: ${p}`);
        }
      }

      return content;
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


const fetchRemoteContent = (url: string) => {
  let content: string = undefined;
  const xhr = new XMLHttpRequest();

  xhr.open('GET', url, false); // synchronous request
  xhr.send(null);

  if (xhr.status >= 200 && xhr.status < 300) {
    content = xhr.responseText;
  }

  return content;
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
