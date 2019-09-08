import { CompilerSystem } from '../../declarations';
import { normalizePath } from '@utils';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';


export function getNodeSys(prcs: NodeJS.Process) {
  const sys: CompilerSystem = {
    access(p) {
      return new Promise(resolve => {
        fs.access(p, err => {
          const hasAccess = !err;
          resolve(hasAccess);
        });
      });
    },
    accessSync(p) {
      let hasAccess = false;
      try {
        fs.accessSync(p);
        hasAccess = true;
      } catch (e) {}
      return hasAccess;
    },
    copyFile(src, dst) {
      return new Promise(resolve => {
        fs.copyFile(src, dst, err => {
          resolve(!err);
        });
      });
    },
    exit(exitCode) {
      prcs.exit(exitCode);
    },
    getCurrentDirectory() {
      return prcs.cwd();
    },
    mkdir(p, opts) {
      return new Promise(resolve => {
        fs.mkdir(p, opts, err => {
          resolve(!err);
        });
      });
    },
    mkdirSync(p, opts) {
      try {
        fs.mkdirSync(p, opts);
        return true;
      } catch (e) {}
      return false;
    },
    readdir(p) {
      return new Promise(resolve => {
        fs.readdir(p, (err, files) => {
          if (err) {
            resolve([]);
          } else {
            resolve(files.map(f => {
              return normalizePath(path.join(p, f));
            }));
          }
        });
      });
    },
    readdirSync(p) {
      try {
        return fs.readdirSync(p);
      } catch (e) {}
      return undefined;
    },
    readFile(p) {
      return new Promise(resolve => {
        fs.readFile(p, 'utf8', (_, data) => {
          resolve(data);
        });
      });
    },
    readFileSync(p) {
      try {
        return fs.readFileSync(p, 'utf8');
      } catch (e) {}
      return undefined;
    },
    realpath(p) {
      return new Promise(resolve => {
        fs.realpath(p, 'utf8', (_, data) => {
          resolve(data);
        });
      });
    },
    realpathSync(p) {
      try {
        return fs.realpathSync(p, 'utf8');
      } catch (e) {}
      return undefined;
    },
    resolvePath(p) {
      return normalizePath(p);
    },
    rmdir(p) {
      return new Promise(resolve => {
        fs.rmdir(p, err => {
          resolve(!err);
        });
      });
    },
    rmdirSync(p) {
      try {
        fs.rmdirSync(p);
        return true;
      } catch (e) {}
      return false;
    },
    stat(p) {
      return new Promise(resolve => {
        fs.lstat(p, (err, s) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(s);
          }
        });
      });
    },
    statSync(p) {
      try {
        return fs.lstatSync(p);
      } catch (e) {}
      return undefined;
    },
    unlink(p) {
      return new Promise(resolve => {
        fs.unlink(p, err => {
          resolve(!err);
        });
      });
    },
    unlinkSync(p) {
      try {
        fs.unlinkSync(p);
        return true;
      } catch (e) {}
      return false;
    },
    fileWatchTimeout: 80,
    watchDirectory(p, callback) {
      const tsFileWatcher = ts.sys.watchDirectory(p, (fileName) => {
        fileName = normalizePath(fileName);
        callback(fileName, null);
      }, true);
      return {
        close() {
          tsFileWatcher.close();
        }
      };
    },
    watchFile(p, callback) {
      const tsFileWatcher = ts.sys.watchFile(p, (fileName, tsEventKind) => {
        fileName = normalizePath(fileName);
        if (tsEventKind === ts.FileWatcherEventKind.Created) {
          callback(fileName, 'fileAdd');
        } else if (tsEventKind === ts.FileWatcherEventKind.Changed) {
          callback(fileName, 'fileUpdate');
        } else if (tsEventKind === ts.FileWatcherEventKind.Deleted) {
          callback(fileName, 'fileDelete');
        }
      });
      return {
        close() {
          tsFileWatcher.close();
        }
      };
    },
    writeFile(p, content) {
      return new Promise(resolve => {
        fs.writeFile(p, content, err => {
          resolve(!err);
        });
      });
    },
    writeFileSync(p, content) {
      try {
        fs.writeFileSync(p, content);
        return true;
      } catch (e) {}
      return false;
    },
  };

  return sys;
}
