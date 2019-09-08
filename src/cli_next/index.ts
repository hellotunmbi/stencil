import * as d from '../declarations';
import { getNodeConfig } from './sys/node-config';
import { getNodeCwd } from './sys/node-cwd';
import { getNodeLogger } from './sys/node-logger';
import { getNodeSys } from './sys/node-sys';
import { runTask } from './tasks';
import { shouldIgnoreError } from '@utils';
import exit from 'exit';


export async function run(prcs: NodeJS.Process) {
  const logger = getNodeLogger();

  try {
    setupNodeProcess(prcs, logger);

    const cwd = getNodeCwd(prcs);
    const sys = getNodeSys(prcs);
    const config = getNodeConfig(prcs, sys, logger, cwd);

    await runTask(prcs, config);

  } catch (e) {
    if (!shouldIgnoreError(e)) {
      logger.error(`uncaught cli error: ${e}${logger.level === 'debug' ? e.stack : ''}`);
      exit(1);
    }
  }
}


export function setupNodeProcess(prcs: NodeJS.Process, logger: d.Logger) {
  try {
    const v = prcs.version.substring(1).split('.');
    const major = parseInt(v[0], 10);
    const minor = parseInt(v[1], 10);
    if (major < 8 || (major === 8 && minor < 9)) {
      console.error('\nYour current version of Node is ' + prcs.version + ' but Stencil needs v8.9 at least. It\'s recommended to install latest Node (https://github.com/nodejs/Release).\n');
      exit(1);
    }
    if (major < 10 || (major === 10 && minor < 13)) {
      console.log('\nYour current version of Node is ' + prcs.version + ', however the recommendation is a minimum of Node LTS (https://github.com/nodejs/Release). Note that future versions of Stencil will eventually remove support for non-LTS Node versions.\n');
    }
  } catch (e) {}

  prcs.on(`unhandledRejection`, (e: any) => {
    if (!shouldIgnoreError(e)) {
      let msg = 'unhandledRejection';
      if (e != null) {
        if (e.stack) {
          msg += ': ' + e.stack;
        } else if (e.message) {
          msg += ': ' + e.message;
        } else {
          msg += ': ' + e;
        }
      }
      logger.error(msg);
    }
  });

  prcs.title = `Stencil`;
}

export { getNodeConfig, getNodeCwd, getNodeLogger, getNodeSys };
