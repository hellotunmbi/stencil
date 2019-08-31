import * as d from '../../declarations';
import { BuildContext } from '../../compiler/build/build-ctx';
import { build } from './build';
import { filesChanged, hasHtmlChanges, hasScriptChanges, hasStyleChanges, scriptsAdded, scriptsDeleted } from '../../compiler/fs-watch/fs-watch-rebuild';
import { hasServiceWorkerChanges } from '../../compiler/service-worker/generate-sw';
import { normalizePath } from '@utils';
import { TSCONFIG_NAME_FALLBACK, getTsConfigFallback, getTsOptionsToExtend } from '../transpile/ts-config';
import ts from 'typescript';


export const createWatcher = async (config: d.Config, compilerCtx: d.CompilerCtx): Promise<d.CompilerWatcher> => {
  let isRunning = false;
  let isRebuild = false;
  let tsWatchProgram: ts.WatchOfConfigFile<ts.EmitAndSemanticDiagnosticsBuilderProgram> = null;
  let closeResolver: Function;
  const watchWaiter = new Promise<d.WatcherCloseResults>(resolve => closeResolver = resolve);

  const filesAdded = new Set<string>();
  const filesUpdated = new Set<string>();
  const filesDeleted = new Set<string>();

  const tsWatchSys: ts.System = {
    ...ts.sys,
    watchFile(p, callback, pollingInterval) {
      return ts.sys.watchFile(p, (filePath, eventKind) => {
        filePath = normalizePath(filePath);

        if (eventKind === ts.FileWatcherEventKind.Created) {
          if (!filesAdded.has(filePath)) {
            compilerCtx.events.emit('fileAdd', filePath);
            filesAdded.add(filePath);
          }

        } else if (eventKind === ts.FileWatcherEventKind.Changed) {
          if (!filesUpdated.has(filePath)) {
            compilerCtx.events.emit('fileUpdate', filePath);
            filesUpdated.add(filePath);
          }

        } else if (eventKind === ts.FileWatcherEventKind.Deleted) {
          if (!filesDeleted.has(filePath)) {
            compilerCtx.events.emit('fileDelete', filePath);
            filesDeleted.add(filePath);
          }
        }

        callback(filePath, eventKind);
      }, pollingInterval);
    },

    fileExists(p) {
      return compilerCtx.fs.accessSync(p);
    },

    readFile(p) {
      try {
        return compilerCtx.fs.readFileSync(p, { useCache: false });
      } catch (e) {}
      return undefined;
    },

    setTimeout(callback, time) {
      const id = setInterval(() => {
        if (!isRunning) {
          callback();
          clearInterval(id);
        }
      }, config.sys_next.fileWatchTimeout || time);
      return id;
    },

    clearTimeout(id) {
      return clearInterval(id);
    }
  };

  if (config.tsconfig == null) {
    config.tsconfig = TSCONFIG_NAME_FALLBACK;
    const tsConfig = JSON.stringify(getTsConfigFallback(), null, 2);
    await compilerCtx.fs.writeFile(TSCONFIG_NAME_FALLBACK, tsConfig, { immediateWrite: true });
  }

  const close = async () => {
    if (tsWatchProgram) {
      tsWatchProgram.close();
    }
    const watcherCloseResults: d.WatcherCloseResults = {
      exitCode: 0
    };
    closeResolver(watcherCloseResults);
    return watcherCloseResults;
  };

  const optionsToExtend = getTsOptionsToExtend(config);

  const start = async () => {
    const tsWatchCompilerHost = ts.createWatchCompilerHost(
      config.tsconfig,
      optionsToExtend,
      tsWatchSys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      (reportDiagnostic) => {
        config.logger.debug('watch reportDiagnostic:' + reportDiagnostic.messageText);
      },
      (reportWatchStatus) => {
        config.logger.debug(reportWatchStatus.messageText);
      }
    );

    tsWatchCompilerHost.afterProgramCreate = async (tsBuilder) => {
      const buildCtx = new BuildContext(config, compilerCtx);
      buildCtx.filesAdded = Array.from(filesAdded.keys());
      buildCtx.filesUpdated = Array.from(filesUpdated.keys());
      buildCtx.filesDeleted = Array.from(filesDeleted.keys());
      buildCtx.filesChanged = filesChanged(buildCtx);
      buildCtx.scriptsAdded = scriptsAdded(config, buildCtx);
      buildCtx.scriptsDeleted = scriptsDeleted(config, buildCtx);
      buildCtx.hasScriptChanges = hasScriptChanges(buildCtx);
      buildCtx.hasStyleChanges = hasStyleChanges(buildCtx);
      buildCtx.hasHtmlChanges = hasHtmlChanges(config, buildCtx);
      buildCtx.hasServiceWorkerChanges = hasServiceWorkerChanges(config, buildCtx);

      buildCtx.isRebuild = isRebuild;
      buildCtx.requiresFullBuild = !isRebuild;
      buildCtx.start();

      isRunning = true;
      await build(config, compilerCtx, buildCtx, tsBuilder);
      isRebuild = true;
      isRunning = false;
    };

    tsWatchProgram = ts.createWatchProgram(tsWatchCompilerHost);

    return watchWaiter;
  };

  return {
    start,
    close,
    on: compilerCtx.events.on
  };
};
