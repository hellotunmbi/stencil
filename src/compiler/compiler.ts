import { validateConfig } from '../compiler/config/validate-config';
import { catchError, hasError, normalizePath } from '@utils';
import { CompilerContext } from './build/compiler-ctx';
import { COMPILER_BUILD } from './build/compiler-build-id';
import { docs } from './docs/docs';
import { startDevServerMain } from '../dev-server/start-server-main';
import * as d from '../declarations';
import { createFullBuildHost, createWatchHost } from './transpile/transpile-app';


export class Compiler implements d.Compiler {
  protected ctx: d.CompilerCtx;
  isValid: boolean;
  config: d.Config;
  queuedRebuild = false;

  constructor(compilerConfig: d.Config) {
    [ this.isValid, this.config ] = isValid(compilerConfig);

    if (this.isValid) {
      const config = this.config;
      const sys = config.sys;
      const logger = config.logger;
      const details = sys.details;
      const isDebug = (logger.level === 'debug');

      let startupMsg = `${sys.compiler.name} v${sys.compiler.version} `;
      if (details.platform !== 'win32') {
        startupMsg += `💎`;
      }

      if (config.suppressLogs !== true) {
        logger.info(logger.cyan(startupMsg));

        if (sys.semver && sys.semver.prerelease(sys.compiler.version)) {
          logger.warn(sys.color.yellow(`This is a prerelease build, undocumented changes might happen at any time. Technical support is not available for prereleases, but any assistance testing is appreciated.`));
        }
        if (config.devMode && config.buildEs5) {
          logger.warn(`Generating ES5 during development is a very task expensive, initial and incremental builds will be much slower. Drop the '--es5' flag and use a modern browser for development.
          If you need ESM output, use the '--esm' flag instead.`);
        }
        if (config.devMode && !config.enableCache) {
          logger.warn(`Disabling cache during development will slow down incremental builds.`);
        }

        const platformInfo = `${details.platform}, ${details.cpuModel}`;
        const statsInfo = `cpus: ${details.cpus}, freemem: ${Math.round(details.freemem() / 1000000)}MB, totalmem: ${Math.round(details.totalmem / 1000000)}MB`;
        if (isDebug) {
          logger.debug(platformInfo);
          logger.debug(statsInfo);
        } else if (config.flags && config.flags.ci) {
          logger.info(platformInfo);
          logger.info(statsInfo);
        }

        logger.debug(`${details.runtime} ${details.runtimeVersion}`);

        logger.debug(`compiler runtime: ${sys.compiler.runtime}`);
        logger.debug(`compiler build: ${COMPILER_BUILD.id}`);

        logger.debug(`minifyJs: ${config.minifyJs}, minifyCss: ${config.minifyCss}, buildEs5: ${config.buildEs5}`);
      }

      if (sys.initWorkers) {
        const workerOpts = sys.initWorkers(config.maxConcurrentWorkers, config.maxConcurrentTasksPerWorker, logger);
        const workerInfo = `compiler workers: ${workerOpts.maxConcurrentWorkers}, tasks per worker: ${workerOpts.maxConcurrentTasksPerWorker}`;
        if (isDebug) {
          logger.debug(workerInfo);
        } else if (config.flags && config.flags.ci) {
          logger.info(workerInfo);
        }
      }

      this.ctx = new CompilerContext(config);
    }
  }

  watch() {
    return createWatchHost(this.config, this.ctx);
  }

  build(): any {
    return createFullBuildHost(this.config, this.ctx);
  }

  async startDevServer() {
    // start up the dev server
    const devServer = await startDevServerMain(this.config, this.ctx);

    if (devServer != null) {
      // get the browser url to be logged out at the end of the build
      this.config.devServer.browserUrl = devServer.browserUrl;

      this.config.logger.debug(`dev server started: ${devServer.browserUrl}`);
    }

    return devServer;
  }

  on(eventName: 'fsChange', cb: (fsWatchResults?: d.FsWatchResults) => void): Function;
  on(eventName: 'buildNoChange', cb: (buildResults: d.BuildNoChangeResults) => void): Function;
  on(eventName: 'buildLog', cb: (buildResults: d.BuildLog) => void): Function;
  on(eventName: 'buildFinish', cb: (buildResults: d.BuildResults) => void): Function;
  on(eventName: d.CompilerEventName, cb: any) {
    return this.ctx.events.subscribe(eventName as any, cb);
  }

  once(eventName: 'buildFinish'): Promise<d.BuildResults>;
  once(eventName: 'buildNoChange'): Promise<d.BuildNoChangeResults>;
  once(eventName: d.CompilerEventName) {
    return new Promise<any>(resolve => {
      const off = this.ctx.events.subscribe(eventName as any, (...args: any[]) => {
        off();
        resolve.apply(this, args);
      });
    });
  }

  off(eventName: string, cb: Function) {
    this.ctx.events.unsubscribe(eventName, cb);
  }

  trigger(eventName: 'fileUpdate', path: string): void;
  trigger(eventName: 'fileAdd', path: string): void;
  trigger(eventName: 'fileDelete', path: string): void;
  trigger(eventName: 'dirAdd', path: string): void;
  trigger(eventName: 'dirDelete', path: string): void;
  trigger(eventName: d.CompilerEventName, ...args: any[]) {
    const fsWatchResults: d.FsWatchResults = {
      dirsAdded: [],
      dirsDeleted: [],
      filesAdded: [],
      filesDeleted: [],
      filesUpdated: []
    };

    switch (eventName) {
      case 'fileUpdate':
        fsWatchResults.filesUpdated.push(normalizePath(args[0]));
        break;
      case 'fileAdd':
        fsWatchResults.filesAdded.push(normalizePath(args[0]));
        break;
      case 'fileDelete':
        fsWatchResults.filesDeleted.push(normalizePath(args[0]));
        break;
      case 'dirAdd':
        fsWatchResults.dirsAdded.push(normalizePath(args[0]));
        break;
      case 'dirDelete':
        fsWatchResults.dirsDeleted.push(normalizePath(args[0]));
        break;
    }

    this.ctx.events.emit('fsChange', fsWatchResults);
    this.ctx.events.emit.apply(this.ctx.events, [eventName, ...args]);
  }

  docs() {
    return docs(this.config, this.ctx);
  }

  get fs(): d.InMemoryFileSystem {
    return this.ctx.fs;
  }

}


function isValid(config: d.Config): [ boolean, d.Config | null] {
  const diagnostics: d.Diagnostic[] = [];
  try {
    // validate the build config
    config = validateConfig(config, diagnostics, true);

  } catch (e) {
    catchError(diagnostics, e, e.message);
  }

  if (config.logger != null) {
    diagnostics.forEach(d => {
      d.type = 'config';
      d.header = 'configuration';
      d.absFilePath = config.configPath;
    });
    config.logger.printDiagnostics(diagnostics);

  } else {
    diagnostics.forEach(d => {
      if (d.level === 'error') {
        throw new Error(d.messageText);
      } else {
        console.info(d.messageText);
      }
    });
  }

  if (hasError(diagnostics)) {
    return [ false, null ];
  } else {
    return [ true, config ];
  }
}
