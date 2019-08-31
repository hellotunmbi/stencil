import * as d from '.';


export interface BuildOnEvents {
  on(cb: (eventName: CompilerEventName, data: any) => void): BuildOnEventRemove;

  on(eventName: CompilerEventFileAdd, cb: (path: string) => void): BuildOnEventRemove;
  on(eventName: CompilerEventFileDelete, cb: (path: string) => void): BuildOnEventRemove;
  on(eventName: CompilerEventFileUpdate, cb: (path: string) => void): BuildOnEventRemove;

  on(eventName: CompilerEventDirAdd, cb: (path: string) => void): BuildOnEventRemove;
  on(eventName: CompilerEventDirDelete, cb: (path: string) => void): BuildOnEventRemove;

  on(eventName: CompilerEventBuildStart, cb: (buildStart: d.CompilerBuildStart) => void): BuildOnEventRemove;
  on(eventName: CompilerEventBuildFinish, cb: (buildResults: d.CompilerBuildResults) => void): BuildOnEventRemove;
  on(eventName: CompilerEventBuildLog, cb: (buildLog: d.BuildLog) => void): BuildOnEventRemove;
  on(eventName: CompilerEventBuildNoChange, cb: () => void): BuildOnEventRemove;
}

export interface BuildEmitEvents {
  emit(eventName: CompilerEventFileAdd, path: string): void;
  emit(eventName: CompilerEventFileDelete, path: string): void;
  emit(eventName: CompilerEventFileUpdate, path: string): void;

  emit(eventName: CompilerEventDirAdd, path: string): void;
  emit(eventName: CompilerEventDirDelete, path: string): void;

  emit(eventName: CompilerEventBuildStart, buildStart: d.CompilerBuildStart): void;
  emit(eventName: CompilerEventBuildFinish, buildResults: d.CompilerBuildResults): void;
  emit(eventName: CompilerEventBuildNoChange, buildNoChange: d.BuildNoChangeResults): void;
  emit(eventName: CompilerEventBuildLog, buildLog: d.BuildLog): void;

  emit(eventName: CompilerEventFsChange, fsWatchResults: d.FsWatchResults): void;
}

export type BuildOnEventRemove = () => boolean;

export interface BuildEvents extends BuildOnEvents, BuildEmitEvents {
}

export type CompilerEventFsChange = 'fsChange';
export type CompilerEventFileUpdate = 'fileUpdate';
export type CompilerEventFileAdd = 'fileAdd';
export type CompilerEventFileDelete = 'fileDelete';
export type CompilerEventDirAdd = 'dirAdd';
export type CompilerEventDirDelete = 'dirDelete';
export type CompilerEventBuildStart = 'buildStart';
export type CompilerEventBuildFinish = 'buildFinish';
export type CompilerEventBuildLog = 'buildLog';
export type CompilerEventBuildNoChange = 'buildNoChange';

export type CompilerEventName =
  CompilerEventFsChange |
  CompilerEventFileUpdate |
  CompilerEventFileAdd |
  CompilerEventFileDelete |
  CompilerEventDirAdd |
  CompilerEventDirDelete |
  CompilerEventBuildStart |
  CompilerEventBuildFinish |
  CompilerEventBuildNoChange |
  CompilerEventBuildLog;
