import { Config } from '../../dist';

// https://stenciljs.com/docs/config

export const config: Config = {
  globalStyle: 'src/global/app.css',
  globalScript: 'src/global/app.ts',
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null,
      baseUrl: 'https://myapp.local/',
      copy: [
        {
          src: '../../../internal/',
          dest: './@stencil/core/internal/',
          warn: true
        },
      ]
    }
  ],
  enableCache: false
};
