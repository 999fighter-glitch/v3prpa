import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {transformSync} from 'esbuild';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {build, defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

function convertToAppsScriptHtml(rawHtml: string): string {
  let html = rawHtml.replace(/<style\b[^>]*>/gi, '<style>');
  const scriptOpenMatch = /<script\b[^>]*type=["']module["'][^>]*>/i.exec(html);
  if (scriptOpenMatch && typeof scriptOpenMatch.index === 'number') {
    const startIdx = scriptOpenMatch.index;
    const contentStart = startIdx + scriptOpenMatch[0].length;
    const closeIdx = html.indexOf('</script>', contentStart);
    if (closeIdx !== -1) {
      let jsCode = html.slice(contentStart, closeIdx);
      try {
        const minified = transformSync(jsCode, {
          loader: 'js',
          minify: true,
          target: 'es2020',
          format: 'iife',
        });
        if (minified.code) {
          jsCode = minified.code;
        }
      } catch {
        jsCode = `(function(){\n${jsCode}\n})();`;
      }
      jsCode = jsCode.replace(/<\/script/gi, '<\\/script');
      const beforeScript = html.slice(0, startIdx);
      const afterScript = html.slice(closeIdx + '</script>'.length);
      html = `${beforeScript}${afterScript}`;
      const bodyCloseIdx = html.lastIndexOf('</body>');
      const classicScriptTag = `<script>\n${jsCode}\n</script>\n`;
      if (bodyCloseIdx !== -1) {
        html = `${html.slice(0, bodyCloseIdx)}${classicScriptTag}${html.slice(bodyCloseIdx)}`;
      } else {
        html = `${html}\n${classicScriptTag}`;
      }
    }
  }
  return html;
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ and emits GAS-compatible single-file appsscript-index.html separately
      // so dist/index.html stays a clean standard Vite HTML entry point for AI Studio sharing.
      {
        name: 'copy-unbundled-src-assets-and-gas-html',
        apply: 'build',
        async closeBundle(error?: Error): Promise<void> {
          if (error || process.env.GAS_SINGLEFILE_BUILD === 'true') {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const gasTmpDir = path.resolve(rootDir, '.dist-gas-tmp');
          process.env.GAS_SINGLEFILE_BUILD = 'true';
          try {
            await build({
              configFile: false,
              root: rootDir,
              plugins: [react(), tailwindcss(), viteSingleFile()],
              resolve: {
                alias: {
                  '@': path.resolve(rootDir, '.'),
                },
              },
              build: {
                outDir: gasTmpDir,
                emptyOutDir: true,
              },
              logLevel: 'silent',
            });
            const builtGasIndex = path.resolve(gasTmpDir, 'index.html');
            const gasHtml = path.resolve(distDir, 'appsscript-index.html');
            if (fs.existsSync(builtGasIndex)) {
              const rawHtml = fs.readFileSync(builtGasIndex, 'utf-8');
              fs.writeFileSync(gasHtml, convertToAppsScriptHtml(rawHtml), 'utf-8');
            }
          } finally {
            delete process.env.GAS_SINGLEFILE_BUILD;
            fs.rmSync(gasTmpDir, {recursive: true, force: true});
          }
        },
      },
      {
        name: 'serve-gas-singlefile-in-dev',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/appsscript-index.html', async (_req, res, next) => {
            try {
              const gasHtml = path.resolve(rootDir, 'dist/appsscript-index.html');
              if (!fs.existsSync(gasHtml)) {
                await build({logLevel: 'silent'});
              }
              if (fs.existsSync(gasHtml)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(fs.readFileSync(gasHtml, 'utf-8'));
                return;
              }
            } catch (err) {
              console.error('Failed to serve appsscript-index.html:', err);
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
