import * as d from '../../declarations';
import { taskBuild } from './task-build';
// import { taskDocs } from './task-docs';
import { taskHelp } from './task-help';
import { taskServe } from './task-serve';
// import { taskTest } from './task-test';
import { taskGenerate } from './task-generate';
import { taskCheckVersion, taskVersion } from './task-version';
import exit from 'exit';


export async function runTask(prcs: NodeJS.Process, config: d.Config) {
  const flags = config.flags;

  if (flags.help || flags.task === `help`) {
    taskHelp(prcs, config.logger);

  } else if (flags.version) {
    taskVersion(config);

  } else if (flags.checkVersion) {
    await taskCheckVersion(config);

  } else {
    switch (flags.task) {
      case 'build':
        await taskBuild(prcs, config, flags);
        break;

      case 'docs':
        // await taskDocs(config);
        break;

      case 'serve':
        await taskServe(prcs, config, flags);
        break;

      case 'test':
        // await taskTest(config);
        break;

      case 'g':
      case 'generate':
        await taskGenerate(config, flags);
        break;

      default:
        config.logger.error(`Invalid stencil command, please see the options below:`);
        taskHelp(prcs, config.logger);
        exit(1);
    }
  }
}
