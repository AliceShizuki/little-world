import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * 单文件构建配置：把整个应用（JS / CSS / SVG）全部内联进一个 index.html，
 * 产物可以直接双击、用 file:// 打开，不需要 Node、不需要服务器。
 * 命令：npm run build:single
 */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'standalone',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
  },
});
