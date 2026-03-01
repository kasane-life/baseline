import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          kvNamespaces: ['CREDENTIALS', 'LOGS'],
          bindings: { JWT_SECRET: 'test-secret-for-vitest' },
        },
      },
    },
  },
});
