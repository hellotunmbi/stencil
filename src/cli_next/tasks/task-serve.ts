import * as d from '../../declarations';
import { normalizePath } from '@utils';
import { start } from '@dev-server';


export async function taskServe(process: NodeJS.Process, config: d.Config, flags: d.ConfigFlags) {
  config.suppressLogs = true;

  config.flags.serve = true;
  config.devServer.openBrowser = flags.open;
  config.devServer.reloadStrategy = null;
  config.devServer.initialLoadUrl = '/';
  config.devServer.websocket = false;
  config.maxConcurrentWorkers = 1;

  config.devServer.root = process.cwd();

  if (typeof flags.root === 'string') {
    if (!config.sys.path.isAbsolute(config.flags.root)) {
      config.devServer.root = config.sys.path.relative(process.cwd(), flags.root);
    }
  }
  config.devServer.root = normalizePath(config.devServer.root);

  const devServer = await start(config);
  if (devServer) {
    config.logger.info(`dev server: ${devServer.browserUrl}`);
  }

  process.once('SIGINT', () => {
    devServer && devServer.close();
  });
}
