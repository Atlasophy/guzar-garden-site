import { cloudflare } from '@cloudflare/vite-plugin';
import { cdnAdapter } from '@vinext/cloudflare/cache/cdn-adapter';
import path from 'node:path';
import { defineConfig } from 'vite';
import vinext from 'vinext';

export default defineConfig({
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
  resolve: {
    alias: {
      sharp: path.resolve(import.meta.dirname, 'empty-stub.js'),
    },
  },
});
