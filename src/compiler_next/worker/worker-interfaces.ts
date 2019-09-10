
export interface CompilerWorkerMsg {
  stencilMsgId?: number;
  type?: CompilerWorkerMsgType;
  path?: string;
  code?: string;
  opts?: any;
  content?: string;
  data?: any;
  onEventName?: any;
}

export const enum CompilerWorkerMsgType {
  InitCompiler,
  Build,
  DestroyCompiler,
  LoadConfig,
  CreateWatcher,
  WatchStart,
  WatchClose,
  OnEvent,
  CompileModule,
  MinifyScriptOptions,
  SysAccess,
  SysMkDir,
  SysReadDir,
  SysReadFile,
  SysRmDir,
  SysStat,
  SysUnlink,
  SysWriteFile,
}
