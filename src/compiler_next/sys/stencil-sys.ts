import * as d from '../../declarations';
import { normalizePath } from '@utils';
import path from 'path';


export const getStencilSys = (config: d.Config) => {
  if (config.sys_next) {
    return config.sys_next;
  }
  return createStencilSys(config.logger);
};


const createStencilSys = (logger: d.Logger) => {
  const items = new Map<string, FsItem>();

  const normalize = (p: string) => {
    if (p === '/') {
      return p;
    }
    const dir = path.dirname(p);
    const base = path.basename(p);
    if (dir.endsWith('/')) {
      return normalizePath(`${dir}${base}`);
    }
    return normalizePath(`${dir}/${base}`);
  };

  const accessSync = (p: string) => {
    return items.has(normalize(p));
  };

  const access = async (p: string) => {
    return accessSync(p);
  };

  const copyFile = async (src: string, dest: string) => {
    src = normalize(src);
    dest = normalize(dest);
    const data = readFileSync(src);
    writeFileSync(dest, data);
    return true;
  };

  const exit = (exitCode?: number) => {
    logger.info(`exit: ${exitCode}`);
  };

  const getCurrentDirectory = () => '/';

  const getExecutingFilePath = () => '/stencil.js';

  const mkdirSync = (p: string, _opts?: d.CompilerSystemMakeDirectoryOptions) => {
    p = normalize(p);
    items.set(p, {
      basename: path.basename(p),
      dirname: path.dirname(p),
      isDirectory: true,
      isFile: false,
      fileWatcher: null,
      data: null
    });
    return true;
  };

  const mkdir = async (p: string, opts?: d.CompilerSystemMakeDirectoryOptions) => {
    return mkdirSync(p, opts);
  };

  const readdirSync = (p: string) => {
    p = normalize(p);
    const dirItems: string[] = [];
    const dir = items.get(p);
    if (dir && dir.isDirectory) {
      items.forEach((item, itemPath) => {
        if (itemPath !== '/') {
          if (p.endsWith('/') && `${p}${item.basename}` === itemPath) {
            dirItems.push(itemPath);
          } else if (`${p}/${item.basename}` === itemPath) {
            dirItems.push(itemPath);
          }
        }
      });
    }
    return dirItems.sort();
  };

  const readdir = async (p: string) => {
    return readdirSync(p);
  };

  const readFileSync = (p: string) => {
    p = normalize(p);
    const file = items.get(p);
    if (file && file.isFile) {
      return file.data;
    }
    return null;
  };

  const readFile = async (p: string) => {
    return readFileSync(p);
  };

  const realpath = (p: string) => {
    return normalize(p);
  };

  const resolvePath = (p: string) => {
    p = normalize(p);
    return p;
  };

  const rmdirSync = (p: string) => {
    p = normalize(p);
    items.delete(p);
    return true;
  };

  const rmdir = async (p: string) => {
    return rmdirSync(p);
  };

  const statSync = (p: string) => {
    p = normalize(p);
    const item = items.get(p);
    if (!item) {
      throw new Error(`stat does not exist: ${p}`);
    }
    const s: d.CompilerFsStats = {
      isDirectory: () => item.isDirectory,
      isFile: () => item.isFile,
      isSymbolicLink: () => false,
      size: item.isFile ? item.data.length : 0
    };
    return s;
  };

  const stat = async (p: string) => {
    return statSync(p);
  };

  const unlinkSync = (p: string) => {
    p = normalize(p);
    const item = items.get(p);
    if (item) {
      if (item.fileWatcher) {
        item.fileWatcher(p, 'fileDelete');
      }
      items.delete(p);
    }
    return true;
  };

  const unlink = async (p: string) => {
    return unlinkSync(p);
  };

  const watchFile = (p: string, fileWatcherCallback: d.CompilerFileWatcherCallback) => {
    p = normalize(p);

    const item = items.get(p);
    if (item && item.isFile) {
      item.fileWatcher = fileWatcherCallback;
    }

    return {
      close() {
        const closeItem = items.get(p);
        if (closeItem) {
          closeItem.fileWatcher = null;
        }
      }
    };
  };

  const writeFileSync = (p: string, data: string) => {
    p = normalize(p);

    const item = items.get(p);
    if (item) {
      const hasChanged = item.data !== data;
      item.data = data;
      if (hasChanged && item.fileWatcher) {
        item.fileWatcher(p, 'fileUpdate');
      }

    } else {
      items.set(p, {
        basename: path.basename(p),
        dirname: path.dirname(p),
        isDirectory: false,
        isFile: true,
        fileWatcher: null,
        data
      });
    }
    return true;
  };

  const writeFile = async (p: string, data: string) => {
    return writeFileSync(p, data);
  };

  const fileWatchTimeout = 32;

  mkdirSync('/');

  const sys: d.CompilerSystem = {
    access,
    accessSync,
    copyFile,
    exit,
    fileWatchTimeout,
    getCurrentDirectory,
    getExecutingFilePath,
    mkdir,
    mkdirSync,
    readdir,
    readdirSync,
    readFile,
    readFileSync,
    realpath,
    resolvePath,
    rmdir,
    rmdirSync,
    stat,
    statSync,
    unlink,
    unlinkSync,
    watchFile,
    writeFile,
    writeFileSync,
  };

  return sys;
};

interface FsItem {
  data: string;
  basename: string;
  dirname: string;
  isFile: boolean;
  isDirectory: boolean;
  fileWatcher: d.CompilerFileWatcherCallback;
}
