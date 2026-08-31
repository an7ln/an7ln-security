import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

function normalizeEscapedAstroRequests() {
  return {
    name: 'normalize-escaped-astro-requests',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.includes('?astro&amp;')) {
          request.url = request.url.replaceAll('&amp;', '&');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://qqyln.cn',
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [normalizeEscapedAstroRequests()],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
});
