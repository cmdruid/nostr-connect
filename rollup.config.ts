import commonjs    from '@rollup/plugin-commonjs'
import json        from '@rollup/plugin-json'
import resolve     from '@rollup/plugin-node-resolve'
import terser      from '@rollup/plugin-terser'
import typescript  from '@rollup/plugin-typescript'

const treeshake = {
	moduleSideEffects       : false,
	propertyReadSideEffects : false,
	tryCatchDeoptimization  : false
}

const onwarn = (warning) => {
  if (
    warning.code === 'INVALID_ANNOTATION' && 
    warning.message.includes('@__PURE__')
  ) {
    return
  }
  console.log(warning)
  throw new Error(warning)
}

export default {
  input: 'src/index.ts',
  onwarn,
  output: [
    {
      file: 'dist/main.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/module.mjs',
      format: 'es',
      sourcemap: true,
      minifyInternalExports: false
    },
    {
      file: 'dist/script.js',
      format: 'iife',
      name: 'nostr_p2p',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [
    resolve({ extensions : [ '.js', '.ts' ]}),
    typescript(),
    commonjs(),
    json()
  ],
  strictDeprecations: true,
  treeshake
}
