import * as d from '../declarations';
import { readFile, sendError } from './dev-server-utils';
import { startDevServerWorker } from './start-server-worker';
import path from 'path';


async function startServer(devServerConfig: d.DevServerConfig) {
  // received a message from main to start the server
  try {
    devServerConfig.contentTypes = await loadContentTypes();
    startDevServerWorker(process, devServerConfig);

  } catch (e) {
    sendError(process, e);
  }
}


async function loadContentTypes() {
  const contentTypePath = path.join(__dirname, 'content-type-db.json');
  const contentTypeJson = await readFile(contentTypePath, 'utf8');
  return JSON.parse(contentTypeJson);
}


process.on('message', (msg: d.DevServerMessage) => {
  if (msg.startServer) {
    startServer(msg.startServer);
  }
});


process.on('unhandledRejection', (e: any) => {
  console.log(e);
});
