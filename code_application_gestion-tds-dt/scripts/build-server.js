import { build } from 'esbuild';

async function runBuild() {
  try {
    console.log('[BUILD] Starting server build with esbuild...');
    await build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: 'dist/server.js',
      minify: false, // On ne minifie pas le serveur pour faciliter le débug
      // We define this to allow tree-shaking of dev-only code
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      // We don't want to bundle these because they are native or we want to keep them external
      external: [
        'sqlite3',
        'vite',
        'fsevents'
      ],
      // On force esbuild à ne pas tenter de résoudre les packages node_modules
      // pour qu'ils soient chargés dynamiquement sur le serveur
      packages: 'external',
      banner: {
        js: `
import { createRequire as __createRequire } from 'module';
const require = __createRequire(import.meta.url);
`,
      },
    });
    console.log('[BUILD] Server build successful: dist/server.js created.');
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

runBuild();
