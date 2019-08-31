import * as d from '.';


export interface CompilerCore {
  build(): Promise<d.CompilerBuildResults>;
  config: d.Config;
  sys: d.CompilerSystem;
  watch(): Promise<d.CompilerWatcher>;
}

export interface CompilerSystem {
  /**
   * Always returns a boolean, does not throw.
   */
  access(p: string): Promise<boolean>;
  /**
   * Always returns a boolean, does not throw.
   */
  accessSync(p: string): boolean;
  /**
   * Always returns a boolean if the files were copied or not. Does not throw.
   */
  copyFile(src: string, dst: string): Promise<boolean>;
  exit(exitCode: number): void;
  getCurrentDirectory(): string;
  getExecutingFilePath(): string;
  /**
   * Always returns a boolean if the directory was created or not. Does not throw.
   */
  mkdir(p: string, opts?: CompilerSystemMakeDirectoryOptions): Promise<boolean>;
  /**
   * Always returns a boolean if the directory was created or not. Does not throw.
   */
  mkdirSync(p: string, opts?: CompilerSystemMakeDirectoryOptions): boolean;
  /**
   * All return paths are full normalized paths, not just the file names. Always returns an array, does not throw.
   */
  readdir(p: string): Promise<string[]>;
  /**
   * All return paths are full normalized paths, not just the file names. Always returns an array, does not throw.
   */
  readdirSync(p: string): string[];
  /**
   * Returns undefined if file is not found. Does not throw.
   */
  readFile(p: string, format?: string): Promise<string>;
  /**
   * Returns undefined if file is not found. Does not throw.
   */
  readFileSync(p: string, format?: string): string;
  realpath(p: string): string;
  resolvePath(p: string): string;
  /**
   * Always returns a boolean if the directory was removed or not. Does not throw.
   */
  rmdir(p: string): Promise<boolean>;
  /**
   * Always returns a boolean if the directory was removed or not. Does not throw.
   */
  rmdirSync(p: string): boolean;
  /**
   * Returns undefined if stat not found. Does not throw.
   */
  stat(p: string): Promise<CompilerFsStats>;
  /**
   * Returns undefined if stat not found. Does not throw.
   */
  statSync(p: string): CompilerFsStats;
  /**
   * Always returns a boolean if the file was removed or not. Does not throw.
   */
  unlink(p: string): Promise<boolean>;
  /**
   * Always returns a boolean if the file was removed or not. Does not throw.
   */
  unlinkSync(p: string): boolean;
  /**
   * Always returns a boolean if the file was written or not. Does not throw.
   */
  writeFile(p: string, content: string): Promise<boolean>;
  /**
   * Always returns a boolean if the file was written or not. Does not throw.
   */
  writeFileSync(p: string, content: string): boolean;
}


export interface CompilerSystemMakeDirectoryOptions {
  /**
   * Indicates whether parent folders should be created.
   * @default false
   */
  recursive?: boolean;
  /**
   * A file mode. If a string is passed, it is parsed as an octal integer. If not specified
   * @default 0o777.
   */
  mode?: number;
}


export interface CompilerFsStats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  size: number;
}


export interface CompilerWatcher {
  build(): Promise<void>;
  close(): Promise<WatchExitCode>;
  fileAdd(p: string): void;
  fileUpdate(p: string): void;
  fileDelete(p: string): void;
  onBuildStart(callback: OnBuildStartCallback): RemoveCallback;
  onBuildFinish(callback: OnBuildFinishCallback): RemoveCallback;
}

export interface CompilerBuildResults {
  buildId: number;
  diagnostics: d.Diagnostic[];
  filesAdded: string[];
  filesUpdated: string[];
  filesDeleted: string[];
  outputs: BuildOutput[];
}

export interface BuildOutput {
  type: string;
  files: string[];
}

export interface BuildOutputFile {
  name: string;
  content: string;
}

export type OnBuildStartCallback = () => void;
export type OnBuildFinishCallback = (results: d.CompilerBuildResults) => void;

export type RemoveCallback = () => boolean;

export type WatchExitCode = 0 | 1;
