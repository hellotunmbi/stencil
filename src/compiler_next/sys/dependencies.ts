
const tsVersion = '__VERSION:TYPESCRIPT__';

export const dependencies: CompilerDependency[] = [
  {
    name: 'typescript',
    version: tsVersion,
    url: `https://cdn.jsdelivr.net/npm/typescript@${tsVersion}/lib/typescript.js`
  }
];

export interface CompilerDependency {
  name: string;
  version: string;
  url: string;
}
