import * as d from '../../declarations';
import { IS_FETCH_ENV, IS_NODE_ENV } from '../sys/environment';
import { normalizePath } from '@utils';
import path from 'path';
import resolve from 'resolve';
import { PackageJsonData } from '../../declarations';


export const resolveRemotePackageJsonSync = (config: d.Config, inMemoryFs: d.InMemoryFileSystem, moduleId: string) => {
  const filePath = path.join(config.rootDir, 'node_modules', moduleId, 'package.json');
  let pkgJson = inMemoryFs.readFileSync(filePath);
  if (!pkgJson) {
    const url = new URL(`./${moduleId}/package.json`, NODE_MODULES_CDN_URL).href;
    pkgJson = fetchModuleSync(inMemoryFs, url, filePath);
  }
  if (typeof pkgJson === 'string') {
    return JSON.parse(pkgJson) as d.PackageJsonData;
  }
  return null;
};


export const resolveRemotePackageJsonAsync = async (config: d.Config, inMemoryFs: d.InMemoryFileSystem, moduleId: string) => {
  const filePath = path.join(config.rootDir, 'node_modules', moduleId, 'package.json');
  let pkgJson = await inMemoryFs.readFile(filePath);
  if (!pkgJson) {
    const url = new URL(`./${moduleId}/package.json`, NODE_MODULES_CDN_URL).href;
    pkgJson = await fetchModuleAsync(inMemoryFs, url, filePath);
  }
  if (typeof pkgJson === 'string') {
    return JSON.parse(pkgJson) as d.PackageJsonData;
  }
  return null;
};


export const resolveModuleIdSync = (inMemoryFs: d.InMemoryFileSystem, moduleId: string, containingFile: string, exts: string[]) => {
  const opts = createCustomResolverSync(inMemoryFs, exts);
  opts.basedir = path.dirname(containingFile);
  return resolve.sync(moduleId, opts);
};


export const resolveModuleIdAync = (inMemoryFs: d.InMemoryFileSystem, moduleId: string, containingFile: string, exts: string[]) => {
  const opts = createCustomResolverAsync(inMemoryFs, exts);
  opts.basedir = path.dirname(containingFile);
  return new Promise(r => {
    resolve(moduleId, (_, resolved) => {
      r(resolved);
    });
  });
};


export const createCustomResolverSync = (inMemoryFs: d.InMemoryFileSystem, exts: string[]) => {
  return {

    isFile(filePath: string) {
      filePath = normalizePath(filePath);

      const stat = inMemoryFs.statSync(filePath);
      if (stat.isFile) {
        return true;
      }

      if (shouldFetchModule(filePath)) {
        const endsWithExt = exts.some(ext => filePath.endsWith(ext));
        if (!endsWithExt) {
          return false;
        }

        const url = getModuleFetchUrl(filePath);
        const content = fetchModuleSync(inMemoryFs, url, filePath);
        if (content) {
          return true;
        }
      }

      return false;
    },

    isDirectory(dirPath: string) {
      dirPath = normalizePath(dirPath);

      const stat = inMemoryFs.statSync(dirPath);
      if (stat.isDirectory) {
        return true;
      }

      if (shouldFetchModule(dirPath)) {
        if (dirPath === NODE_MODULES_FS_DIR) {
          inMemoryFs.sys.mkdirSync(NODE_MODULES_FS_DIR);
          inMemoryFs.clearFileCache(dirPath);
          return true;
        }

        const endsWithExt = COMMON_DIR_MODULE_EXTS.some(ext => dirPath.endsWith(ext));
        if (endsWithExt) {
          return false;
        }

        const checkFileExists = (fileName: string) => {
          const url = getModuleFetchUrl(dirPath) + '/' + fileName;
          const filePath = dirPath + '/' + fileName;
          const content = fetchModuleSync(inMemoryFs, url, filePath);
          return (!!content);
        };

        return ['package.json', 'index.js', 'index.mjs'].some(checkFileExists);
      }

      return false;
    },

    readFileSync(p: string) {
      const data = inMemoryFs.readFileSync(p);
      if (typeof data === 'string') {
        return data;
      }

      throw new Error(`file not found: ${p}`);
    },

    extensions: exts,

    basedir: undefined as string
  };
};


export const createCustomResolverAsync = (inMemoryFs: d.InMemoryFileSystem, exts: string[]) => {
  return {

    async isFile(filePath: string, cb: (err: any, isFile: boolean) => void) {
      filePath = normalizePath(filePath);

      const stat = await inMemoryFs.stat(filePath);
      if (stat) {
        cb(null, stat.isFile);
        return;
      }

      if (shouldFetchModule(filePath)) {
        const endsWithExt = exts.some(ext => filePath.endsWith(ext));
        if (endsWithExt) {
          const url = getModuleFetchUrl(filePath);
          const content = await fetchModuleAsync(inMemoryFs, url, filePath);
          const checkFileExists = (typeof content === 'string');
          cb(null, checkFileExists);
          return;
        }
      }

      cb(null, false);
    },

    async isDirectory(dirPath: string, cb: (err: any, isDirectory: boolean) => void) {
      dirPath = normalizePath(dirPath);

      const stat = await inMemoryFs.stat(dirPath);
      if (stat) {
        cb(null, stat.isDirectory);
        return;
      }

      if (shouldFetchModule(dirPath)) {
        if (dirPath === NODE_MODULES_FS_DIR) {
          inMemoryFs.sys.mkdirSync(NODE_MODULES_FS_DIR);
          inMemoryFs.clearFileCache(dirPath);
          cb(null, true);
          return;
        }

        const endsWithExt = COMMON_DIR_MODULE_EXTS.some(ext => dirPath.endsWith(ext));
        if (endsWithExt) {
          cb(null, false);
          return;
        }

        const checkFiles = ['package.json', 'index.js', 'index.mjs'];
        for (const fileName of checkFiles) {
          const url = getModuleFetchUrl(dirPath) + '/' + fileName;
          const filePath = dirPath + '/' + fileName;
          const content = await fetchModuleAsync(inMemoryFs, url, filePath);
          if (typeof content === 'string') {
            cb(null, true);
            return;
          }
        }
      }

      cb(null, false);
    },

    async readFile(p: string, cb: (err: any, data: string) => void) {
      p = normalizePath(p);

      const data = await inMemoryFs.readFile(p);
      if (typeof data === 'string') {
        return cb(null, data);
      }

      return cb(`readFile not found: ${p}`, undefined);
    },

    extensions: exts,

    basedir: undefined as string
  };
};


const COMMON_DIR_MODULE_EXTS = ['.tsx', '.ts', '.mjs', '.js', '.jsx', '.json', '.md'];

const failedFetchCache = new Set<string>();
const fetchCacheAsync = new Map<string, Promise<string>>();
const pkgVersions = new Map<string, string>();


const fetchModuleSync = (inMemoryFs: d.InMemoryFileSystem, url: string, filePath: string) => {
  if (failedFetchCache.has(url)) {
    return undefined;
  }

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);

    if (xhr.status >= 200 && xhr.status < 300) {
      writeFetchSuccess(inMemoryFs, url, filePath, xhr.responseText);
      return xhr.responseText;

    } else {
      failedFetchCache.add(url);
    }

  } catch (e) {
    failedFetchCache.add(url);
  }

  return undefined;
};


const fetchModuleAsync = (inMemoryFs: d.InMemoryFileSystem, url: string, filePath: string) => {
  if (failedFetchCache.has(url)) {
    return Promise.resolve(undefined);
  }

  let fetchPromise = fetchCacheAsync.get(url);

  if (!fetchPromise) {
    fetchPromise = new Promise(resolve => {
      fetch(url)
        .then(async rsp => {
          if (rsp.status >= 200 && rsp.status < 300) {
            const content = await rsp.text();
            writeFetchSuccess(inMemoryFs, url, filePath, content);
            resolve(content);

          } else {
            failedFetchCache.add(url);
            resolve(undefined);
          }
        })
        .catch(() => {
          failedFetchCache.add(url);
          resolve(undefined);
        });
    });
    fetchCacheAsync.set(url, fetchPromise);
  }

  return fetchPromise;
};

const writeFetchSuccess = (inMemoryFs: d.InMemoryFileSystem, url: string, filePath: string, content: string) => {
  if (url.endsWith('package.json')) {
    try {
      const pkgData = JSON.parse(content) as PackageJsonData;
      if (pkgData.name && pkgData.version) {
        pkgVersions.set(pkgData.name, pkgData.version);
      }
    } catch (e) {}
  }

  let dir = path.dirname(filePath);
  while (dir !== '/' && dir !== '') {
    inMemoryFs.clearFileCache(dir);
    inMemoryFs.sys.mkdirSync(dir);
    dir = path.dirname(dir);
  }

  inMemoryFs.clearFileCache(filePath);
  inMemoryFs.sys.writeFileSync(filePath, content);
};


const getModuleFetchUrl = (filePath: string) => {
  // /node_modules/lodash/package.json
  let urlPath = filePath.replace(NODE_MODULES_FS_DIR + '/', '');

  // lodash/package.json
  const pathParts = urlPath.split('/');

  const checkPathParts: string[] = [];
  for (const pathPart of pathParts) {
    checkPathParts.push(pathPart);
    const checkPathPart = checkPathParts.join('/');
    const checkVersion = pkgVersions.get(checkPathPart);
    if (checkVersion) {
      urlPath = urlPath.replace(checkPathPart + '/', checkPathPart + '@' + checkVersion + '/');
      break;
    }
  }

  return NODE_MODULES_CDN_URL + urlPath;
};


const shouldFetchModule = (p: string) => (IS_FETCH_ENV && !IS_NODE_ENV && p.startsWith(NODE_MODULES_FS_DIR));


const NODE_MODULES_FS_DIR = '/node_modules';
const NODE_MODULES_CDN_URL = 'https://cdn.jsdelivr.net/npm/';
