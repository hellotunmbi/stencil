import * as d from '../../declarations';
import { getLogger } from './logger';
import { getStencilSys } from './stencil-sys';
import path from 'path';


export const getConfig = (userConfig: d.Config) => {
  const config = Object.assign(userConfig, {});

  config.logger = getLogger(config);

  config.sys_next = getStencilSys(config);

  if (config.flags.debug || config.flags.verbose) {
    config.logLevel = 'debug';
  } else if (config.flags.logLevel) {
    config.logLevel = config.flags.logLevel;
  } else if (typeof config.logLevel !== 'string') {
    config.logLevel = 'info';
  }
  config.logger.level = config.logLevel;

  // old way
  config.sys = config.sys || {};
  config.sys.path = path;

  return config;
};
