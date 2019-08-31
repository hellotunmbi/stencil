import * as d from '../../declarations';
import { getLogger } from './logger';
import { getStencilSys } from './stencil-sys';
import { validateConfig as validateConfigInternal } from '../../compiler/config/validate-config';
import path from 'path';


export const getConfig = (config: d.Config) => {
  config.logger = getLogger(config);

  config.sys_next = getStencilSys(config);

  if (config.flags) {
    if (config.flags.debug || config.flags.verbose) {
      config.logLevel = 'debug';
    } else if (config.flags.logLevel) {
      config.logLevel = config.flags.logLevel;
    } else if (typeof config.logLevel !== 'string') {
      config.logLevel = 'info';
    }
    config.logger.level = config.logLevel;
  }

  return config;
};


export const validateConfig = (config: d.Config) => {
  // TODO: remove path from config.sys.path
  config.sys = config.sys || {};
  if (!config.sys.path) {
    config.sys.path = path;
  }
  return validateConfigInternal(config);
};
