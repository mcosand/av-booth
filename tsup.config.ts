import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/server.ts'],
  external: ['atem-connection'],
  outDir: 'dist',
  target: 'node18',
  format: ['cjs'],
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  publicDir: 'build',
  tsconfig: 'tsconfig.server.json',
});