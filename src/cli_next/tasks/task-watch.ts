import * as d from '../../declarations';
import { createCompiler } from '@compiler';
import { start } from '@dev-server';
import exit from 'exit';


export async function taskWatch(prcs: NodeJS.Process, config: d.Config, flags: d.ConfigFlags) {
  let devServer: d.DevServer = null;

  if (flags.serve) {
    devServer = await start(config);
    config.devServer.browserUrl = devServer.browserUrl;
  }

  const compiler = await createCompiler(config);
  const watcher = await compiler.createWatcher();

  if (devServer) {
    watcher.on(devServer.emit);
  }

  prcs.once('SIGINT', () => {
    watcher.close();
  });

  const closeResults = await watcher.start();

  if (devServer) {
    await devServer.close();
  }

  if (closeResults.exitCode > 0) {
    exit(closeResults.exitCode);
  }
}
