import type { Options } from 'tsup'

export const tsup: Options = {
  entry: [
    'src/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: false,
  treeshake: true,
}
