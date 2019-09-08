import fs from 'fs-extra';
import path from 'path';

const inputDir = path.join(__dirname, '..', 'dist-ts', 'dev-server_next', 'dev-client');
const outputDir = path.join(__dirname, '..', 'dev-server', 'dev-client');

const srcStaticDir = path.join(__dirname, '..', 'src', 'dev-server_next', 'static');
const dstStaticDir = path.join(outputDir, 'static');


const banner = `<!doctype html><html><head><meta charset="utf-8">
<title>Stencil Dev Server Connector &#9889;</title>
<script>`;

const intro = `(function(iframeWindow, appWindow, appDoc, config, exports) {
  "use strict";
`;

const outro = `
})(window, window.parent, window.parent.document, window.__DEV_CLIENT_CONFIG__, {});
`

const footer = `</script>
</head>
<body style="background:black;color:white;font:24px monospace;text-align:center;">
Stencil Dev Server Connector &#9889;
</body></html>`


export default {
  input: path.join(inputDir, 'index.js'),
  output: {
    format: 'cjs',
    file: path.join(outputDir, 'static', 'client-connector.html'),
    banner,
    intro,
    outro,
    footer,
    strict: false
  },
  plugins: [
    {
      writeBundle() {
        fs.copySync(srcStaticDir, dstStaticDir);
      }
    }
  ]
};
