const fs = require('fs');
const { generateDtsBundle } = require("dts-bundle-generator/bundle-generator.js");


export function inlineDtsPlugin(importId, inputFile) {
  return {
    name: 'inlineDtsPlugin',

    resolveId(id) {
      if (id === importId) {
        return id;
      }
    },

    load(id) {
      if (id == importId) {
        const outputCode = bundleDts(inputFile);
        return `const dtsContent = ${JSON.stringify(outputCode)};\nexport default dtsContent;`;
      }
    }

  };
}


export function bundleDts(inputFile) {
  const cachedDtsOutput = inputFile + '-bundled.d.ts';

  try {
    return fs.readFileSync(cachedDtsOutput, 'utf8');

  } catch (e) {
    const entries = [{
      filePath: inputFile
    }];
    const outputCode = generateDtsBundle(entries);
    fs.writeFileSync(cachedDtsOutput, outputCode);
    return outputCode;
  }
}
