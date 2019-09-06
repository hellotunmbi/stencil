import * as d from '../declarations';
import { getConfig, getCwd, getLogger, getSys } from '@sys-node';
import { shouldIgnoreError } from '@utils';
import { runTask } from './tasks';
import exit from 'exit';


export async function run(prcs: NodeJS.Process) {
  const logger = getLogger();

  try {
    setupProcess(prcs, logger);

    const cwd = getCwd(prcs);
    const sys = getSys(prcs);
    const config = getConfig(prcs, sys, logger, cwd);

    await runTask(prcs, config);

  } catch (e) {
    if (!shouldIgnoreError(e)) {
      logger.error(`uncaught cli error: ${e}${logger.level === 'debug' ? e.stack : ''}`);
      exit(1);
    }
  }
}


export function setupProcess(prcs: NodeJS.Process, logger: d.Logger) {
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

export { getConfig, getCwd, getLogger, getSys };
