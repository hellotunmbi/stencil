import * as d from '../../declarations';
import { buildError, catchError, loadTypeScriptDiagnostics, normalizePath } from '@utils';
import { compile } from '../compile-module';
import { CompilerWorkerMsg, CompilerWorkerMsgType } from './worker-interfaces';
import { createCompiler } from '../compiler';
import { createStencilSys } from '../sys/stencil-sys';
import { createLogger } from '../sys/logger';
import { getMinifyScriptOptions } from '../config/compile-module-options';
import { getTypescript } from '../sys/typescript-patch';
import { validateConfig } from '../config/validate-config';
import path from 'path';
import { TranspileOptions } from 'typescript';


export const initWebWorker = (self: Worker) => {
  let config: d.Config;
  let compiler: d.CompilerNext;
  let watcher: d.CompilerWatcher;
  let watcherCloseMsgId: number;
  let isQueued: boolean;
  let sys: d.CompilerSystem;
  let queuedMsgs: CompilerWorkerMsg[];
  let tick: Promise<void>;
  let logger: d.Logger;

  const initCompiler = async (msg: CompilerWorkerMsg) => {
    queuedMsgs = [];
    sys = createStencilSys();
    logger = createLogger();
    tick = Promise.resolve();
    post({ stencilMsgId: msg.stencilMsgId });
  };

  const getCompiler = async () => {
    if (!compiler) {
      config.logger = logger;
      config.sys_next = sys;
      compiler = await createCompiler(config);
    }
    return compiler;
  };

  const loadConfig = async (msg: CompilerWorkerMsg) => {
    const diagnostics: d.Diagnostic[] = [];
    let configPath = msg.path;

    try {
      if (typeof configPath !== 'string') {
        const diagnostic = buildError(diagnostics);
        diagnostic.header = `Stencil Config`;
        diagnostic.messageText = `Missing stencil config file path`;
        return post({ stencilMsgId: msg.stencilMsgId, data: diagnostics });
      }

      configPath = normalizePath(configPath);

      if (!path.isAbsolute(configPath)) {
        const diagnostic = buildError(diagnostics);
        diagnostic.header = `Stencil Config`;
        diagnostic.messageText = `Stencil config must be an absolute path`;
        return post({ stencilMsgId: msg.stencilMsgId, data: diagnostics });
      }

      const configContent = await sys.readFile(configPath);
      if (typeof configContent !== 'string') {
        const diagnostic = buildError(diagnostics);
        diagnostic.header = `Stencil Config`;
        diagnostic.messageText = `Stencil config file not found: ${configPath}`;
        diagnostic.absFilePath = configPath;
        return post({ stencilMsgId: msg.stencilMsgId, data: diagnostics });
      }

      const ts = getTypescript();
      const opts: TranspileOptions = {
        fileName: configPath,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES5
        },
        reportDiagnostics: false
      };

      const results = ts.transpileModule(configContent, opts);
      if (results.diagnostics.length > 0) {
        return post({
          stencilMsgId: msg.stencilMsgId,
          data: loadTypeScriptDiagnostics(results.diagnostics)
        });
      }

      const parseConfig = new Function(`const exports = {}; ${results.outputText}; return exports;`);
      const c = parseConfig();

      if (!c || !c.config) {
        const diagnostic = buildError(diagnostics);
        diagnostic.header = `Stencil Config`;
        diagnostic.messageText = `Invalid stencil config: ${configPath}`;
        diagnostic.absFilePath = configPath;
        return post({ stencilMsgId: msg.stencilMsgId, data: diagnostics });
      }

      config = c.config;
      config.configPath = configPath;
      config.rootDir = normalizePath(path.dirname(configPath));
      config.cwd = config.rootDir;

      if (msg.opts) {
        Object.assign(config, msg.opts);
      }

      const validated = validateConfig(config);
      diagnostics.push(...validated.diagnostics);

      config = validated.config;

    } catch (e) {
      catchError(diagnostics, e);
    }

    return post({ stencilMsgId: msg.stencilMsgId, data: diagnostics });
  };

  const destroy = async (msg: CompilerWorkerMsg) => {
    if (compiler) {
      await compiler.destroy();
      compiler = config = watcher = watcherCloseMsgId = null;
    }
    post({ stencilMsgId: msg.stencilMsgId });
  };

  const build = async (msg: CompilerWorkerMsg) => {
    const c = await getCompiler();
    post({
      stencilMsgId: msg.stencilMsgId,
      data: await c.build()
    });
  };

  const createWatcher = async (msg: CompilerWorkerMsg) => {
    const c = await getCompiler();
    watcher = await c.createWatcher();
    watcher.on((eventName, data) => {
      post({ onEventName: eventName, data });
    });
    post({ stencilMsgId: msg.stencilMsgId });
  };

  const watcherStart = (msg: CompilerWorkerMsg) => {
    watcherCloseMsgId = msg.stencilMsgId;
    watcher.start();
  };

  const watcherClose = async (msg: CompilerWorkerMsg) => {
    post({
      stencilMsgId: watcherCloseMsgId,
      data: await watcher.close()
    });
    watcher = watcherCloseMsgId = null;
    post({ stencilMsgId: msg.stencilMsgId });
  };

  const onMessage = async (msg: CompilerWorkerMsg) => {
    if (msg && typeof msg.stencilMsgId === 'number' && typeof msg.type === 'number') {
      switch (msg.type) {

        case CompilerWorkerMsgType.InitCompiler:
          initCompiler(msg);
          break;

        case CompilerWorkerMsgType.LoadConfig:
          loadConfig(msg);
          break;

        case CompilerWorkerMsgType.DestroyCompiler:
          destroy(msg);
          break;

        case CompilerWorkerMsgType.Build:
          build(msg);
          break;

        case CompilerWorkerMsgType.CreateWatcher:
          createWatcher(msg);
          break;

        case CompilerWorkerMsgType.WatchStart:
          watcherStart(msg);
          break;

        case CompilerWorkerMsgType.WatchClose:
          watcherClose(msg);
          break;

        case CompilerWorkerMsgType.CompileModule:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await compile(msg.code, msg.opts)
          });
          break;

        case CompilerWorkerMsgType.MinifyScriptOptions:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: getMinifyScriptOptions(msg.opts)
          });
          break;

        case CompilerWorkerMsgType.SysAccess:
          post({
            data: await sys.access(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysMkDir:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.mkdir(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysReadDir:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.readdir(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysReadFile:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.readFile(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysRmDir:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.rmdir(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysStat:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.stat(msg.path)
          });
          break;

        case CompilerWorkerMsgType.SysWriteFile:
          post({
            stencilMsgId: msg.stencilMsgId,
            data: await sys.writeFile(msg.path, msg.content)
          });
          break;

        default:
          throw new Error(`invalid worker message: ${msg}`);
      }
    }
  };

  const post = (msg: CompilerWorkerMsg) => {
    queuedMsgs.push(msg);
    if (!isQueued) {
      isQueued = true;
      tick.then(() => {
        isQueued = false;
        self.postMessage(JSON.stringify(queuedMsgs));
        queuedMsgs.length = 0;
      });
    }
  };

  self.onmessage = (ev) => {
    let msgs: CompilerWorkerMsg[];
    if (typeof ev.data === 'string') {
      try {
        msgs = JSON.parse(ev.data);
      } catch (e) {}
    }
    if (Array.isArray(msgs)) {
      msgs.forEach(onMessage);
    }
  };
};
