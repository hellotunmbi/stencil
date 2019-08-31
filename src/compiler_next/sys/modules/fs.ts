import * as d from '../../../declarations';


const fs: { __sys: d.CompilerSystem, [key: string]: any } = {
  __fs: 'patched',
  __sys: {} as any
};

export const lstatSync = fs.lstatSync = (p: string) => fs.__sys.stat(p);

export const mkdirSync = fs.mkdirSync = (p: string) => fs.__sys.mkdirSync(p);

export const readdirSync = fs.readdirSync = (p: string) => fs.__sys.readdirSync(p);

export const readFile = fs.readFile = async (p: string, opts: any, cb: (err: any, data: string) => void) => {
  try {
    const encoding = typeof opts === 'object' ? opts.encoding : typeof opts === 'string' ? opts : 'utf-8';
    const data = await fs.__sys.readFile(p, encoding);
    if (typeof opts === 'function') {
      opts(null, data);
    } else {
      cb(null, data);
    }
  } catch (e) {
    if (typeof opts === 'function') {
      opts(e, null);
    } else {
      cb(e, null);
    }
  }
};

export const realpathSync = fs.realpathSync = (p: string) => fs.__sys.realpath(p);

export const statSync = fs.statSync = (p: string) => fs.__sys.stat(p);

export const watch = fs.watch = () => {
  throw new Error(`fs.watch() not implemented`);
};

export const writeFile = fs.writeFile = (p: string, data: string, opts: any, cb: any) => {
  try {
    fs.__sys.writeFile(p, data);
    if (typeof opts === 'function') {
      opts(null);
    } else {
      cb(null);
    }
  } catch (e) {
    if (typeof opts === 'function') {
      opts(e);
    } else {
      cb(e);
    }
  }
};


export default fs;
