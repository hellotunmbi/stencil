
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
  input: 'dist-ts/dev-server_next/dev-client/index.js',
  output: {
    format: 'cjs',
    file: 'dist/dev-server_next/static/client-connector.html',
    banner,
    intro,
    outro,
    footer,
    strict: false
  }
};
