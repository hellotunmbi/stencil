import * as d from '../../declarations';
import fs from 'fs';


export const initFs = (userSys: d.CompilerSystem) => {
  Object.assign((fs as any).__sys, userSys);
};
