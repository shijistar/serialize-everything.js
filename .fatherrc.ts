import { defineConfig } from 'father';

export default defineConfig({
  esm: { input: 'src', output: 'es', transformer: 'babel' },
  umd: {
    entry: 'src',
    name: 'SerializeEverything',
    output: {
      path: 'umd',
      filename: 'serialize-everything.min',
    },
  },
  sourcemap: true,
  targets: /* ES2020 */ { chrome: 80 },
});
