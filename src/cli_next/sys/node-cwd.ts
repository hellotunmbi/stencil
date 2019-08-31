
export function getCwd(prcs: NodeJS.Process) {
  if (prcs) {
    if (prcs.env && typeof prcs.env.PWD === 'string') {
      return prcs.env.PWD;
    } else if (prcs.cwd) {
      return prcs.cwd();
    }
  }
  return '';
}
