import * as d from '../declarations';
import { serve404 } from './serve-404';
import { serve500 } from './serve-500';
import { serveFile } from './serve-file';
import * as http from 'http';
import path from 'path';
import * as url from 'url';
import { readFile, readdir, responseHeaders, sendMsg, stat } from './dev-server-utils';


export async function serveDirectoryIndex(devServerConfig: d.DevServerConfig, req: d.HttpRequest, res: http.ServerResponse) {
  try {
    const indexFilePath = path.join(req.filePath, 'index.html');

    req.stats = await stat(indexFilePath);
    if (req.stats.isFile()) {
      req.filePath = indexFilePath;
      return serveFile(devServerConfig, req, res);
    }

  } catch (e) {}

  if (!req.pathname.endsWith('/')) {
    if (devServerConfig.logRequests) {
      sendMsg(process, {
        requestLog: {
          method: req.method,
          url: req.url,
          status: 302
        }
      });
    }

    res.writeHead(302, {
      'location': req.pathname + '/'
    });
    return res.end();
  }

  try {
    const dirItemNames = await readdir(req.filePath);

    try {
      const dirTemplatePath = path.join(devServerConfig.devServerDir, 'templates', 'directory-index.html');
      const dirTemplate = await readFile(dirTemplatePath, 'utf8');
      const files = await getFiles(req.filePath, req.pathname, dirItemNames);

      const templateHtml = dirTemplate
        .replace('{{title}}', getTitle(req.pathname))
        .replace('{{nav}}', getName(req.pathname))
        .replace('{{files}}', files);

      res.writeHead(200, responseHeaders({
        'Content-Type': 'text/html',
        'X-Directory-Index': req.pathname
      }));

      res.write(templateHtml);
      res.end();

      if (devServerConfig.logRequests) {
        sendMsg(process, {
          requestLog: {
            method: req.method,
            url: req.url,
            status: 200
          }
        });
      }

    } catch (e) {
      serve500(devServerConfig, req, res, e);
    }

  } catch (e) {
    serve404(devServerConfig, req, res);
  }
}


async function getFiles(filePath: string, urlPathName: string, dirItemNames: string[]) {
  const items = await getDirectoryItems(filePath, urlPathName, dirItemNames);

  if (urlPathName !== '/') {
    items.unshift({
      isDirectory: true,
      pathname: '../',
      name: '..'
    });
  }

  return items
    .map(item => {
      return (`
        <li class="${item.isDirectory ? 'directory' : 'file'}">
          <a href="${item.pathname}">
            <span class="icon"></span>
            <span>${item.name}</span>
          </a>
        </li>`
      );
    })
    .join('');
}


async function getDirectoryItems(filePath: string, urlPathName: string, dirItemNames: string[]) {
  const items = await Promise.all(dirItemNames.map(async dirItemName => {
    const absPath = path.join(filePath, dirItemName);

    const stats = await stat(absPath);

    const item: DirectoryItem = {
      name: dirItemName,
      pathname: url.resolve(urlPathName, dirItemName),
      isDirectory: stats.isDirectory()
    };

    return item;
  }));
  return items;
}


function getTitle(pathName: string) {
  return pathName;
}


function getName(pathName: string) {
  const dirs = pathName.split('/');
  dirs.pop();

  let url = '';

  return dirs.map((dir, index) => {
    url += dir + '/';
    const text = (index === 0 ? `~` : dir);

    return `<a href="${url}">${text}</a>`;

  }).join('<span>/</span>') + '<span>/</span>';
}


interface DirectoryItem {
  name: string;
  pathname: string;
  isDirectory: boolean;
}
