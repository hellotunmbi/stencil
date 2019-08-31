import * as d from '../../declarations';
import { normalizePath } from '@utils';
import { parseFlags } from './parse-flags';
import { validateConfig } from '@compiler';
import exit from 'exit';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';


export function getConfig(prcs: NodeJS.Process, sys: d.CompilerSystem, logger: d.Logger, cwd: string) {
  let config: d.Config = null;

  try {
    const flags = parseFlags(prcs);
    const configPath = getConfigFilePath(cwd, flags.config);

    // if --config is provided we need to check if it exists
    if (flags.config && !fs.existsSync(configPath)) {
      throw new Error(`Stencil configuration file cannot be found at: "${flags.config}"`);
    }
    config = loadConfigFile(fs as any, configPath, cwd);

    config.sys_next = (config.sys_next || sys);
    config.logger = (config.logger || logger);

    if (typeof config.logLevel === 'string') {
      config.logger.level = config.logLevel;
    }

    config.flags = flags;

    // tmp old way
    config.sys = {
      path
    };

    const validated = validateConfig(config);
    if (validated.diagnostics.length > 0) {
      logger.printDiagnostics(validated.diagnostics);
      exit(1);
    }

    config = validated.config;

    prcs.title = `Stencil: ${config.namespace}`;

  } catch (e) {
    logger.error(e);
    exit(1);
  }

  return config;
}


function getConfigFilePath(cwd: string, configArg: string) {
  if (configArg) {
    if (!path.isAbsolute(configArg)) {
      // passed in a custom stencil config location
      // but it's relative, so prefix the cwd
      return normalizePath(path.join(cwd, configArg));
    }

    // config path already an absolute path, we're good here
    return normalizePath(configArg);
  }

  // nothing was passed in, use the current working directory
  return normalizePath(cwd);
}


export function loadConfigFile(fs: d.FileSystem, configPath: string, cwd: string) {
  let config: d.Config;

  let hasConfigFile = false;

  if (typeof configPath === 'string') {
    if (!path.isAbsolute(configPath)) {
      throw new Error(`Stencil configuration file "${configPath}" must be an absolute path.`);
    }

    try {
      const stat = fs.statSync(configPath);
      if (stat.isFile()) {
        hasConfigFile = true;

      } else if (stat.isDirectory()) {
        configPath = getConfigPathFromDirectory(fs, configPath);
        hasConfigFile = (configPath != null);
      }
    } catch (e) {}
  }

  if (hasConfigFile) {
    // the passed in config was a string, so it's probably a path to the config we need to load
    // first clear the require cache so we don't get the same file
    const configFileData = requireConfigFile(fs, configPath);
    if (!configFileData.config) {
      throw new Error(`Invalid Stencil configuration file "${configPath}". Missing "config" property.`);
    }
    config = configFileData.config;
    config.configPath = configPath;

    if (configPath) {
      config.rootDir = normalizePath(path.dirname(configPath));
    }

  } else {
    // no stencil.config.ts or .js file, which is fine
    // #0CJS
    config = {
      rootDir: cwd
    };
  }

  config.cwd = normalizePath(cwd);

  return config;
}


function getConfigPathFromDirectory(fs: d.FileSystem, dir: string) {
  // this is only a directory, so let's make some assumptions

  for (let i = 0; i < CONFIG_FILENAMES.length; i++) {
    try {
      const configFilePath = path.join(dir, CONFIG_FILENAMES[i]);
      const stat = fs.statSync(configFilePath);
      if (stat.isFile()) {
        return configFilePath;
      }
    } catch (e) {}
  }

  return null;
}

const CONFIG_FILENAMES = [
  'stencil.config.ts',
  'stencil.config.js'
];


function requireConfigFile(fs: d.FileSystem, configFilePath: string) {
  // ensure we cleared out node's internal require() cache for this file
  delete require.cache[path.resolve(configFilePath)];

  // let's override node's require for a second
  // don't worry, we'll revert this when we're done
  require.extensions['.ts'] = (module: NodeModuleWithCompile, filename: string) => {
    let sourceText = fs.readFileSync(filename, 'utf8');
    sourceText = convertSourceConfig(sourceText, filename);
    module._compile(sourceText, filename);
  };

  // let's do this!
  const config = require(configFilePath);

  // all set, let's go ahead and reset the require back to the default
  require.extensions['.ts'] = undefined;

  // good work team
  return config;
}


export function convertSourceConfig(sourceText: string, configFilePath: string) {
  if (configFilePath.endsWith('.ts')) {
    // looks like we've got a typed config file
    // let's transpile it to .js quick
    sourceText = transpileTypedConfig(sourceText, configFilePath);

  } else {
    // quick hack to turn a modern es module
    // into and old school commonjs module
    sourceText = sourceText.replace(/export\s+\w+\s+(\w+)/gm, 'exports.$1');
  }

  return sourceText;
}


function transpileTypedConfig(sourceText: string, filePath: string) {
  // let's transpile an awesome stencil.config.ts file into
  // a boring stencil.config.js file

  const opts: ts.TranspileOptions = {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES5
    },
    reportDiagnostics: false
  };

  const output = ts.transpileModule(sourceText, opts);

  return output.outputText;
}


interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any;
}
