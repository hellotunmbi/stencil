const fs = require('fs');
const { generateDtsBundle } = require("dts-bundle-generator/bundle-generator.js");


export function bundleDts(inputFile) {
  const cachedDtsOutput = inputFile + '-bundled.d.ts';

  try {
    return fs.readFileSync(cachedDtsOutput, 'utf8');
  } catch (e) {}

  const entries = [{
    filePath: inputFile
  }];

  let outputCode = generateDtsBundle(entries).join('\n');

  outputCode = outputCode.replace(/\/\/\/ <reference types="node" \/>/g, '');
  outputCode = outputCode.replace(/NodeJS.Process/g, 'any');

  fs.writeFileSync(cachedDtsOutput, outputCode);
  return outputCode;
}
