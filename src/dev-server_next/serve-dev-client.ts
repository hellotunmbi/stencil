import * as d from '../declarations';
import * as c from './dev-server-constants';
import * as util from './dev-server-utils';
import { serve404 } from './serve-404';
import { serve500 } from './serve-500';
import { serveFile } from './serve-file';
import { serveOpenInEditor } from './open-in-editor';
import * as http  from 'http';
import path from 'path';


export async function serveDevClient(devServerConfig: d.DevServerConfig, req: d.HttpRequest, res: http.ServerResponse) {
  try {
    if (util.isOpenInEditor(req.pathname)) {
      return serveOpenInEditor(devServerConfig, req, res);
    }

    if (util.isDevServerClient(req.pathname)) {
      return serveDevClientScript(devServerConfig, req, res);
    }

    if (util.isInitialDevServerLoad(req.pathname)) {
      req.filePath = path.join(devServerConfig.devServerDir, 'templates', 'initial-load.html');

    } else {
      const staticFile = req.pathname.replace(c.DEV_SERVER_URL + '/', '');
      req.filePath = path.join(devServerConfig.devServerDir, 'static', staticFile);
    }

    try {
      req.stats = await util.stat(req.filePath);
      return serveFile(devServerConfig, req, res);
    } catch (e) {
      return serve404(devServerConfig, req, res);
    }

  } catch (e) {
    return serve500(devServerConfig, req, res, e);
  }
}


async function serveDevClientScript(devServerConfig: d.DevServerConfig, req: d.HttpRequest, res: http.ServerResponse) {
  const filePath = path.join(devServerConfig.devServerDir, 'static', 'client-connector.html');

  let content = await util.readFile(filePath, 'utf8');

  const devClientConfig: d.DevClientConfig = {
    basePath: devServerConfig.basePath,
    editors: devServerConfig.editors,
    reloadStrategy: devServerConfig.reloadStrategy
  };

  content = content.replace('window.__DEV_CLIENT_CONFIG__', JSON.stringify(devClientConfig));

  res.writeHead(200, util.responseHeaders({
    'Content-Type': 'text/html'
  }));
  res.write(content);
  res.end();

  if (devServerConfig.logRequests) {
    util.sendMsg(process, {
      requestLog: {
        method: req.method,
        url: req.url,
        status: 200
      }
    });
  }
}
