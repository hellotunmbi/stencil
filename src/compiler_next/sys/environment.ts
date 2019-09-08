
export const IS_NODE_ENV = (typeof global !== 'undefined' && typeof require === 'function');

export const IS_WEB_WORKER_ENV = (typeof self !== 'undefined' && typeof (self as any).importScripts === 'function' && typeof XMLHttpRequest !== 'undefined');

export const IS_DOM_ENV = (typeof document !== 'undefined');

export const IS_FETCH_ENV = (typeof fetch === 'function');
