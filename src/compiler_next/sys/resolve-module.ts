import * as d from '../../declarations';
import { IS_FETCH_ENV, IS_NODE_ENV } from '../sys/environment';
import { normalizePath } from '@utils';


export const createCustomResolver = (inMemoryFs: d.InMemoryFileSystem) => {

  return {

    extensions: ['.tsx', '.ts', '.mjs', '.js', '.json'],

    async isFile(p: string, cb: (err: any, isFile: boolean) => void) {
      p = normalizePath(p);

      const stat = await inMemoryFs.accessData(p);
      if (stat.exists) {
        return cb(null, stat.isFile);
      }

      if (shouldFetchModule(p)) {
        const pathParts = p.split('/');
        if (pathParts.length >= 3) {
          const pkgRootDir = `/${pathParts[1]}/${pathParts[2]}`;
          const pkgRootDirData = await inMemoryFs.accessData(pkgRootDir);

          if (p.endsWith('package.json') || (pkgRootDirData.exists && pkgRootDirData.isDirectory)) {
            const rsp = await fetchModule(p);
            if (rsp.ok) {
              await inMemoryFs.writeFile(p, rsp.text, { inMemoryOnly: true });
              return cb(null, true);
            }
            return cb(rsp.text, false);
          }
        }
      }

      return cb(null, false);
    },

    async isDirectory(p: string, cb: (err: any, isDirectory: boolean) => void) {
      p = normalizePath(p);

      const stat = await inMemoryFs.accessData(p);
      if (stat.exists) {
        return cb(null, stat.isDirectory);
      }

      if (shouldFetchModule(p)) {
        if (p === NODE_MODULES_FS_DIR) {
          return cb(null, true);
        }

        const rsp = await fetchModule(p);
        if (rsp.ok) {
          return cb(null, true);
        }
        return cb(rsp.text, false);
      }

      return cb(null, false);
    },

    async readFile(p: string, cb: (err: any, data: string) => void) {
      p = normalizePath(p);

      const data = await inMemoryFs.readFile(p);
      if (typeof data === 'string') {
        return cb(null, data);
      }

      return cb(`readFile not found: ${p}`, undefined);
    }
  };
};


const fetchCache = new Map<string, Promise<FetchCache>>();

const fetchModule = (filePath: string) => {
  const url = getPackageFetchUrl(filePath);
  let fetchPromise = fetchCache.get(url);

  if (!fetchPromise) {
    fetchPromise = fetch(url)
      .then(async rsp => {
        const data: FetchCache = {
          ok: rsp.ok,
          text: await rsp.text()
        };

        if (data.ok) {
          if (url.endsWith('package.json')) {
            cachePackageVersion(url, data.text);
          }

        } else {
          data.text = `${rsp.statusText} - ${url}`;
        }

        return data;
      })
      .catch(err => {
        const data: FetchCache = {
          ok: false,
          text: err
        };
        return data;
      });

    fetchCache.set(url, fetchPromise);
  }

  return fetchPromise;
};


const pkgVersions = new Map<string, string>();

const getPackageFetchUrl = (filePath: string) => {
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


const cachePackageVersion = (url: string, pkgStr: string) => {
  try {
    const pkgData = JSON.parse(pkgStr);
    if (pkgData.name && pkgData.version) {
      pkgVersions.set(pkgData.name, pkgData.version);
    }
  } catch (e) {
    console.error(`cachePackageVersion: ${url}, ${pkgStr}`, e);
  }
};


const shouldFetchModule = (p: string) => (IS_FETCH_ENV && !IS_NODE_ENV && p.startsWith(NODE_MODULES_FS_DIR));


const NODE_MODULES_FS_DIR = '/node_modules';
const NODE_MODULES_CDN_URL = 'https://cdn.jsdelivr.net/npm/';


interface FetchCache {
  ok: boolean;
  text: string;
}
