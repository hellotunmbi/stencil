import * as d from '../../declarations';
import { STENCIL_APP_DATA_ID, STENCIL_INTERNAL_ID } from './entry-alias-ids';
import { normalizePath } from '@utils';
import { Plugin } from 'rollup';


export const appDataPlugin = (config: d.Config, compilerCtx: d.CompilerCtx, build: d.Build): Plugin => {
  const globalPaths: string[] = [];

  if (typeof config.globalScript === 'string') {
    const mod = compilerCtx.moduleMap.get(config.globalScript);
    if (mod != null && mod.jsFilePath) {
      globalPaths.push(normalizePath(mod.jsFilePath));
    }
  }

  compilerCtx.collections.forEach(collection => {
    if (collection.global != null && typeof collection.global.jsFilePath === 'string') {
      globalPaths.push(normalizePath(collection.global.jsFilePath));
    }
  });

  return {
    name: 'appDataPlugin',

    resolveId(id) {
      if (id === STENCIL_APP_DATA_ID) {
        return id;
      }
      return null;
    },

    load(id) {
      if (id === STENCIL_APP_DATA_ID) {
        return [
          getGlobalScripts(globalPaths),
          getBuildConditionals(config, build),
          getNamespace(config),
        ].join('\n');
      }
      return null;
    },

    transform(code, id) {
      id = normalizePath(id);
      if (globalPaths.includes(id)) {
        const program = this.parse(code, {});
        const needsDefault = !program.body.some(s => s.type === 'ExportDefaultDeclaration');
        const defaultExport = needsDefault
          ? '\nexport const globalFn = () => {};\nexport default globalFn;'
          : '';
        return INJECT_CONTEXT + code + defaultExport;
      }
      return null;
    }
  };
};


const getBuildConditionals = (config: d.Config, build: d.Build) => {
  const builData = Object.keys(build).map(key => {
    return key + ': ' + ((build as any)[key] ? 'true' : 'false');
  });

  return `export const BUILD = /* ${config.namespace} custom */ { ${builData.join(', ')} };`;
};


const getNamespace = (config: d.Config) => {
  return `export const NAMESPACE = '${config.namespace}';`;
};


const getGlobalScripts = (globalPaths: string[]) => {
  const output = globalPaths.map((appGlobalScriptPath, index) => (
    `import appGlobalScript${index} from '${appGlobalScriptPath}';`
  ));

  output.push(
    `export const GLOBAL_SCRIPTS = () => {`,
    ...globalPaths.map((_, index) => `  appGlobalScript${index}();`),
    `};`
  );

  return output.join('\n');
};


const INJECT_CONTEXT = `import { Context } from '${STENCIL_INTERNAL_ID}';\n`;
