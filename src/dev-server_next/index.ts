import { CompilerBuildResults, CompilerEventName, DevServer, DevServerConfig, DevServerMessage } from '../declarations';
import { ChildProcess, fork } from 'child_process';
import path from 'path';


export async function start(config: DevServerConfig) {
  // using the path stuff below because after the the bundles are created
  // then these files are no longer relative to how they are in the src directory
  config.devServerDir = __dirname;

  // get the path of the dev server module
  const program = require.resolve(path.join(config.devServerDir, 'server.js'));

  const args: string[] = [];

  const filteredExecArgs = process.execArgv.filter(
    v => !/^--(debug|inspect)/.test(v)
  );

  const options: any = {
    execArgv: filteredExecArgs,
    env: process.env,
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  };

  // start a new child process of the CLI process
  // for the http and web socket server
  const serverProcess = fork(program, args, options);

  const devServerContext: DevServerMainContext = {
    isActivelyBuilding: false,
    lastBuildResults: null
  };

  const devServerConfig = await startServer(config, serverProcess, devServerContext);

  const devServer: DevServer = {
    browserUrl: devServerConfig.browserUrl,
    close() {
      try {
        serverProcess.kill('SIGINT');
        config.logger.debug(`dev server closed`);
      } catch (e) {}
      return Promise.resolve();
    },
    emit(eventName: any, data: any) {
      emitMessageToClient(serverProcess, devServerContext, eventName, data);
    }
  };

  return devServer;
}


function startServer(config: DevServerConfig, serverProcess: ChildProcess, devServerContext: DevServerMainContext) {
  return new Promise<DevServerConfig>((resolve, reject) => {
    serverProcess.stdout.on('data', (data: any) => {
      // the child server process has console logged data
      config.logger.debug(`dev server: ${data}`);
    });

    serverProcess.stderr.on('data', (data: any) => {
      // the child server process has console logged an error
      reject(`dev server error: ${data}`);
    });

    serverProcess.on('message', (msg: DevServerMessage) => {
      // main process has received a message from the child server process
      mainReceivedMessageFromWorker(config, serverProcess, devServerContext, msg, resolve);
    });

    // have the main process send a message to the child server process
    // to start the http and web socket server
    serverProcess.send({
      startServer: config
    });

    return config;
  });
}


function emitMessageToClient(serverProcess: ChildProcess, devServerContext: DevServerMainContext, eventName: CompilerEventName, data: any) {
  if (eventName === 'buildFinish') {
    // a compiler build has finished
    // send the build results to the child server process
    devServerContext.isActivelyBuilding = false;
    const msg: DevServerMessage = {
      buildResults: Object.assign({}, data)
    };
    delete msg.buildResults.entries;
    delete msg.buildResults.components;

    serverProcess.send(msg);

  } else if (eventName === 'buildStart') {
    devServerContext.isActivelyBuilding = true;

  } else if (eventName === 'buildLog') {
    const msg: DevServerMessage = {
      buildLog: Object.assign({}, data)
    };

    serverProcess.send(msg);
  }
}


function mainReceivedMessageFromWorker(config: DevServerConfig, serverProcess: ChildProcess, devServerContext: DevServerMainContext, msg: DevServerMessage, resolve: (devServerConfig: any) => void) {
  if (msg.serverStated) {
    // received a message from the child process that the server has successfully started
    if (config.openBrowser && msg.serverStated.initialLoadUrl) {
      // config.sys.open(msg.serverStated.initialLoadUrl);
    }

    // resolve that everything is good to go
    resolve(msg.serverStated);
    return;
  }

  if (msg.requestBuildResults) {
    // we received a request to send up the latest build results
    if (devServerContext.lastBuildResults != null) {
      // we do have build results, so let's send them to the child process
      // but don't send any previous live reload data
      const msg: DevServerMessage = {
        buildResults: Object.assign({}, devServerContext.lastBuildResults) as any,
        isActivelyBuilding: devServerContext.isActivelyBuilding
      };
      delete msg.buildResults.hmr;
      delete msg.buildResults.entries;
      delete msg.buildResults.components;

      serverProcess.send(msg);

    } else {
      const msg: DevServerMessage = {
        isActivelyBuilding: true
      };
      serverProcess.send(msg);
    }
    return;
  }

  if (msg.error) {
    // received a message from the child process that is an error
    config.logger.error(msg.error.message);
    config.logger.debug(msg.error);
    return;
  }

  if (msg.requestLog) {
    const req = msg.requestLog;
    const logger = config.logger;

    let status: any;
    if (req.status >= 400) {
      status = logger.red(req.method);
    } else if (req.status >= 300) {
      status = logger.magenta(req.method);
    } else {
      status = logger.cyan(req.method);
    }

    logger.info(logger.dim(`${status} ${req.url}`));
    return;
  }
}

interface DevServerMainContext {
  isActivelyBuilding: boolean;
  lastBuildResults: CompilerBuildResults;
}
