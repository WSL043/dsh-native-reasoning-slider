import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'effort-slider-demo',
  entry: { demo: 'demo/main.jsx' },
  outDir: 'docs',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    alwaysBundle: [/^react(?:\/|$)/, /^react-dom(?:\/|$)/, /^scheduler(?:\/|$)/],
    onlyBundle: ['react', 'react-dom', 'scheduler'],
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  outputOptions: { entryFileNames: 'demo.js' },
})
