
export default {
  name: 'aliasPlugin',
  resolveId(importee) {
    if (importee === '@build-conditionals') {
      return 'dist-ts/compiler/app-core/build-conditionals.js'
    }
    if (importee === '@mock-doc') {
      return 'dist-ts/mock-doc/index.js'
    }
    if (importee === '@runtime') {
      return 'dist-ts/runtime/index.js'
    }
    if (importee === '@testing') {
      return 'dist-ts/testing/index.js'
    }
    if (importee === '@utils') {
      return 'dist-ts/utils/index.js'
    }
  }
}
