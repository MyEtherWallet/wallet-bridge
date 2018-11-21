import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import commonjs from 'rollup-plugin-commonjs'
export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    commonjs(),
    json(),
    babel({
      exclude: 'node_modules/**',
      runtimeHelpers: true
    })
  ]
}
