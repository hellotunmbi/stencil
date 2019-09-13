
export default {
  name: 'aliasPlugin',
  resolveId(id) {
    if (id === '@build-conditionals' || id === '@stencil/core/internal/app-data') {
      return 'dist-ts/app-data/internal.js'
    }
    if (id === '@mock-doc') {
      return 'dist-ts/mock-doc/index.js'
    }
    if (id === '@runtime') {
      return 'dist-ts/runtime/index.js'
    }
    if (id === '@testing') {
      return 'dist-ts/testing/index.js'
    }
    if (id === '@utils') {
      return 'dist-ts/utils/index.js'
    }
  }
}
